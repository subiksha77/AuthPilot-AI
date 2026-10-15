/**
 * AuthPilot AI — Review Case Repository
 *
 * Provides storage and audit logging for reviewer workflow cases.
 *
 * ARCHITECTURAL CONTRACT FOR MEMBER 4 (Database Integration):
 * This in-memory repository is isolated behind this clean interface.
 * Member 4 can replace this implementation with SQLite / PostgreSQL
 * without affecting the controller routes or state machine logic.
 */

import type { ReviewCase, AuditEvent, TransitionRequest } from "../types/reviewer.js";
import { applyTransition } from "./stateMachine.js";
import { evaluateClaim } from "../rules/engine.js";
import { estimateCoverage } from "../estimator/coverageCalculator.js";
import { getClaimById } from "../data/syntheticClaims.js";
import { getPolicyById } from "../data/syntheticPolicies.js";

export interface IReviewRepository {
  createCase(
    claimId: string,
    policyId: string,
    reviewerNotes?: string,
    assignedReviewerId?: string
  ): ReviewCase;
  getCase(caseId: string): ReviewCase | undefined;
  listCases(): ReviewCase[];
  transitionCase(caseId: string, transition: TransitionRequest): ReviewCase;
  getAuditHistory(caseId: string): AuditEvent[];
  reset(): void; // Useful for tests
}

export class InMemoryReviewRepository implements IReviewRepository {
  private cases: Map<string, ReviewCase> = new Map();

  constructor() {
    this.seedDemoCases();
  }

  private seedDemoCases(): void {
    // Seed initial demo review case based on DEMO-CLM-002 and DEMO-POL-001 (ICU sublimit review)
    const claim = getClaimById("DEMO-CLM-002");
    const policy = getPolicyById("DEMO-POL-001");

    if (claim && policy) {
      const caseId = "REV-DEMO-001";
      const timestamp = "2025-03-11T09:00:00.000Z";
      const evaluation = evaluateClaim(claim, policy);
      const estimation = estimateCoverage(claim, policy);

      const initialAudit: AuditEvent = {
        eventId: "EVT-SEED-001",
        caseId,
        priorState: "PENDING_REVIEWER",
        newState: "PENDING_REVIEWER",
        action: "START_REVIEW" as any, // initial creation marker
        timestamp,
        reviewerId: "SYSTEM_ROUTER",
        reason: "Initial routing to human reviewer due to sublimit flag.",
        details: { initial: true },
      };

      const seedCase: ReviewCase = {
        caseId,
        claimId: claim.claimId,
        policyId: policy.policyId,
        currentStatus: "PENDING_REVIEWER",
        createdAt: timestamp,
        updatedAt: timestamp,
        assignedReviewerId: null,
        reviewerNotes: "ICU claim requires clinical substantiation for length of stay.",
        preliminaryEvaluation: evaluation,
        coverageEstimation: estimation,
        informationRequests: [],
        recommendation: null,
        auditHistory: [initialAudit],
        notice:
          "PRELIMINARY assessment package for authorized human reviewer. " +
          "No automated approval or denial has been issued.",
      };

      this.cases.set(caseId, seedCase);
    }
  }

  public createCase(
    claimId: string,
    policyId: string,
    reviewerNotes?: string,
    assignedReviewerId?: string
  ): ReviewCase {
    const claim = getClaimById(claimId);
    const policy = getPolicyById(policyId);

    if (!claim) {
      throw new Error(`Cannot create review case: Claim "${claimId}" not found.`);
    }
    if (!policy) {
      throw new Error(`Cannot create review case: Policy "${policyId}" not found.`);
    }

    const caseId = `REV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const timestamp = new Date().toISOString();

    const evaluation = evaluateClaim(claim, policy);
    const estimation = estimateCoverage(claim, policy);

    const initialAudit: AuditEvent = {
      eventId: `EVT-${Date.now()}-INIT`,
      caseId,
      priorState: "PENDING_REVIEWER",
      newState: "PENDING_REVIEWER",
      action: "START_REVIEW" as any,
      timestamp,
      reviewerId: assignedReviewerId ?? null,
      reason: "Case submitted for reviewer assessment.",
      details: { reviewerNotes: reviewerNotes ?? null },
    };

    const newCase: ReviewCase = {
      caseId,
      claimId,
      policyId,
      currentStatus: "PENDING_REVIEWER",
      createdAt: timestamp,
      updatedAt: timestamp,
      assignedReviewerId: assignedReviewerId ?? null,
      reviewerNotes: reviewerNotes ?? null,
      preliminaryEvaluation: evaluation,
      coverageEstimation: estimation,
      informationRequests: [],
      recommendation: null,
      auditHistory: [initialAudit],
      notice:
        "PRELIMINARY assessment package for authorized human reviewer. " +
        "No automated approval or denial has been issued.",
    };

    this.cases.set(caseId, newCase);
    return newCase;
  }

  public getCase(caseId: string): ReviewCase | undefined {
    const found = this.cases.get(caseId);
    return found ? structuredClone(found) : undefined;
  }

  public listCases(): ReviewCase[] {
    return Array.from(this.cases.values()).map((c) => structuredClone(c));
  }

  public transitionCase(caseId: string, transition: TransitionRequest): ReviewCase {
    const existing = this.cases.get(caseId);
    if (!existing) {
      throw new Error(`Review case "${caseId}" not found.`);
    }

    const updated = applyTransition(existing, transition);
    this.cases.set(caseId, updated);
    return structuredClone(updated);
  }

  public getAuditHistory(caseId: string): AuditEvent[] {
    const existing = this.cases.get(caseId);
    if (!existing) {
      throw new Error(`Review case "${caseId}" not found.`);
    }
    return structuredClone(existing.auditHistory);
  }

  public reset(): void {
    this.cases.clear();
    this.seedDemoCases();
  }
}

export const defaultReviewRepository = new InMemoryReviewRepository();
