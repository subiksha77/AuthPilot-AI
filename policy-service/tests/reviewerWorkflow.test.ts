/**
 * AuthPilot AI — Reviewer Workflow & Audit History Tests
 *
 * Verifies state machine transitions, validation preconditions, reviewer identification,
 * information request tracking, and audit event preservation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  applyTransition,
  getNextState,
  WorkflowValidationError,
} from "../src/reviewer/stateMachine.js";
import {
  InMemoryReviewRepository,
} from "../src/reviewer/repository.js";
import type { ReviewCase } from "../src/types/reviewer.js";

describe("Reviewer Workflow State Machine — Transitions & Rules", () => {
  let repo: InMemoryReviewRepository;
  let testCase: ReviewCase;

  beforeEach(() => {
    repo = new InMemoryReviewRepository();
    testCase = repo.createCase("DEMO-CLM-001", "DEMO-POL-001", "Initial test case");
  });

  it("initializes a case in PENDING_REVIEWER state with audit event", () => {
    expect(testCase.currentStatus).toBe("PENDING_REVIEWER");
    expect(testCase.auditHistory.length).toBeGreaterThanOrEqual(1);
    expect(testCase.auditHistory[0]?.priorState).toBe("PENDING_REVIEWER");
  });

  it("transitions PENDING_REVIEWER -> IN_REVIEW via START_REVIEW", () => {
    const updated = repo.transitionCase(testCase.caseId, {
      action: "START_REVIEW",
      reviewerId: "REV-DR-SARAH-101",
      notes: "Starting clinical evaluation",
    });

    expect(updated.currentStatus).toBe("IN_REVIEW");
    expect(updated.assignedReviewerId).toBe("REV-DR-SARAH-101");
    expect(updated.auditHistory).toHaveLength(2);

    const latestAudit = updated.auditHistory[updated.auditHistory.length - 1]!;
    expect(latestAudit.action).toBe("START_REVIEW");
    expect(latestAudit.priorState).toBe("PENDING_REVIEWER");
    expect(latestAudit.newState).toBe("IN_REVIEW");
    expect(latestAudit.reviewerId).toBe("REV-DR-SARAH-101");
  });

  it("transitions IN_REVIEW -> NEEDS_INFORMATION via REQUEST_INFORMATION", () => {
    repo.transitionCase(testCase.caseId, {
      action: "START_REVIEW",
      reviewerId: "REV-DR-SARAH-101",
    });

    const updated = repo.transitionCase(testCase.caseId, {
      action: "REQUEST_INFORMATION",
      reviewerId: "REV-DR-SARAH-101",
      reason: "Missing post-op pathology report to justify prolonged admission.",
      requiredDocuments: ["Pathology Report", "Operative Notes"],
    });

    expect(updated.currentStatus).toBe("NEEDS_INFORMATION");
    expect(updated.informationRequests).toHaveLength(1);
    expect(updated.informationRequests[0]?.requiredDocuments).toContain("Pathology Report");
    expect(updated.informationRequests[0]?.resolved).toBe(false);
  });

  it("transitions NEEDS_INFORMATION -> IN_REVIEW via RESUME_REVIEW and resolves info request", () => {
    repo.transitionCase(testCase.caseId, { action: "START_REVIEW", reviewerId: "REV-1" });
    repo.transitionCase(testCase.caseId, {
      action: "REQUEST_INFORMATION",
      reviewerId: "REV-1",
      reason: "Need lab report",
      requiredDocuments: ["Lab Report"],
    });

    const resumed = repo.transitionCase(testCase.caseId, {
      action: "RESUME_REVIEW",
      reviewerId: "REV-1",
      notes: "Lab report received and verified.",
    });

    expect(resumed.currentStatus).toBe("IN_REVIEW");
    expect(resumed.informationRequests[0]?.resolved).toBe(true);
  });

  it("transitions IN_REVIEW -> RECOMMENDATION_RECORDED with reviewer identity & evidence refs", () => {
    repo.transitionCase(testCase.caseId, { action: "START_REVIEW", reviewerId: "REV-DR-SARAH-101" });

    const recCase = repo.transitionCase(testCase.caseId, {
      action: "RECORD_RECOMMENDATION",
      reviewerId: "REV-DR-SARAH-101",
      reviewerRole: "Senior Clinical Reviewer",
      recommendation: "APPROVE_AS_PREPARED",
      reason: "Clinical documentation fully supports medical necessity. Exclusions checked and clear.",
      supportingEvidenceRefs: ["DOC-001:p2", "R01_POLICY_EFFECTIVE_DATE", "R07_REQUIRED_DOCUMENTS"],
      recommendedInsurerPortion: 63000,
      recommendedPatientPortion: 12000,
    });

    expect(recCase.currentStatus).toBe("RECOMMENDATION_RECORDED");
    expect(recCase.recommendation).not.toBeNull();
    expect(recCase.recommendation?.reviewerId).toBe("REV-DR-SARAH-101");
    expect(recCase.recommendation?.recommendation).toBe("APPROVE_AS_PREPARED");
    expect(recCase.recommendation?.supportingEvidenceRefs).toContain("DOC-001:p2");
    expect(recCase.recommendation?.notice).toContain("internal REVIEWER RECOMMENDATION");
  });

  it("transitions RECOMMENDATION_RECORDED -> CLOSED via CLOSE_REVIEW", () => {
    repo.transitionCase(testCase.caseId, { action: "START_REVIEW", reviewerId: "REV-1" });
    repo.transitionCase(testCase.caseId, {
      action: "RECORD_RECOMMENDATION",
      reviewerId: "REV-1",
      recommendation: "APPROVE_AS_PREPARED",
      reason: "All criteria met.",
      supportingEvidenceRefs: ["EVID-1"],
    });

    const closed = repo.transitionCase(testCase.caseId, {
      action: "CLOSE_REVIEW",
      reviewerId: "ADMIN-01",
      reason: "Review package forwarded to insurer claims adjudication system.",
    });

    expect(closed.currentStatus).toBe("CLOSED");
  });

  it("reopens a closed case back to IN_REVIEW via REOPEN_REVIEW", () => {
    repo.transitionCase(testCase.caseId, { action: "START_REVIEW", reviewerId: "REV-1" });
    repo.transitionCase(testCase.caseId, {
      action: "RECORD_RECOMMENDATION",
      reviewerId: "REV-1",
      recommendation: "APPROVE_AS_PREPARED",
      reason: "All criteria met.",
      supportingEvidenceRefs: ["EVID-1"],
    });
    repo.transitionCase(testCase.caseId, { action: "CLOSE_REVIEW" });

    const reopened = repo.transitionCase(testCase.caseId, {
      action: "REOPEN_REVIEW",
      reviewerId: "SUPERVISOR-99",
      reason: "New hospital itemized invoice submitted by provider.",
    });

    expect(reopened.currentStatus).toBe("IN_REVIEW");
  });

  it("REJECTS invalid transition: PENDING_REVIEWER -> CLOSED directly", () => {
    expect(() =>
      repo.transitionCase(testCase.caseId, { action: "CLOSE_REVIEW" })
    ).toThrow(WorkflowValidationError);
  });

  it("REJECTS invalid transition: PENDING_REVIEWER -> RECORD_RECOMMENDATION directly", () => {
    expect(() =>
      repo.transitionCase(testCase.caseId, {
        action: "RECORD_RECOMMENDATION",
        reviewerId: "REV-1",
        recommendation: "APPROVE_AS_PREPARED",
        reason: "Looks good",
        supportingEvidenceRefs: ["DOC-1"],
      })
    ).toThrow(WorkflowValidationError);
  });

  it("REJECTS REQUEST_INFORMATION if reason or requiredDocuments is missing", () => {
    repo.transitionCase(testCase.caseId, { action: "START_REVIEW", reviewerId: "REV-1" });

    // Missing reason
    expect(() =>
      repo.transitionCase(testCase.caseId, {
        action: "REQUEST_INFORMATION",
        requiredDocuments: ["Lab Report"],
      })
    ).toThrow(WorkflowValidationError);

    // Missing documents
    expect(() =>
      repo.transitionCase(testCase.caseId, {
        action: "REQUEST_INFORMATION",
        reason: "Need something",
        requiredDocuments: [],
      })
    ).toThrow(WorkflowValidationError);
  });

  it("REJECTS RECORD_RECOMMENDATION if reviewerId, reason, or evidenceRefs is missing", () => {
    repo.transitionCase(testCase.caseId, { action: "START_REVIEW", reviewerId: "REV-1" });

    // Missing reviewerId
    expect(() =>
      repo.transitionCase(testCase.caseId, {
        action: "RECORD_RECOMMENDATION",
        recommendation: "APPROVE_AS_PREPARED",
        reason: "Clear case",
        supportingEvidenceRefs: ["DOC-1"],
      })
    ).toThrow(WorkflowValidationError);

    // Missing reason
    expect(() =>
      repo.transitionCase(testCase.caseId, {
        action: "RECORD_RECOMMENDATION",
        reviewerId: "REV-1",
        recommendation: "APPROVE_AS_PREPARED",
        reason: "",
        supportingEvidenceRefs: ["DOC-1"],
      })
    ).toThrow(WorkflowValidationError);

    // Missing evidence refs
    expect(() =>
      repo.transitionCase(testCase.caseId, {
        action: "RECORD_RECOMMENDATION",
        reviewerId: "REV-1",
        recommendation: "APPROVE_AS_PREPARED",
        reason: "Clear case",
        supportingEvidenceRefs: [],
      })
    ).toThrow(WorkflowValidationError);
  });

  it("preserves audit event history with complete audit trail", () => {
    repo.transitionCase(testCase.caseId, { action: "START_REVIEW", reviewerId: "REV-1" });
    repo.transitionCase(testCase.caseId, {
      action: "REQUEST_INFORMATION",
      reviewerId: "REV-1",
      reason: "Need MRI report",
      requiredDocuments: ["MRI Report"],
    });

    const auditHistory = repo.getAuditHistory(testCase.caseId);
    expect(auditHistory.length).toBe(3); // INIT + START_REVIEW + REQUEST_INFORMATION
    expect(auditHistory[1]?.action).toBe("START_REVIEW");
    expect(auditHistory[2]?.action).toBe("REQUEST_INFORMATION");
    expect(auditHistory[2]?.reason).toBe("Need MRI report");
  });
});
