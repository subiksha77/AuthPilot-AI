/**
 * AuthPilot AI — Reviewer Workflow State Machine
 *
 * Implements transitions and validation for the review case lifecycle:
 *   PENDING_REVIEWER -> IN_REVIEW -> NEEDS_INFORMATION / RECOMMENDATION_RECORDED -> CLOSED
 */

import type {
  ReviewStatus,
  ReviewAction,
  TransitionRequest,
  AuditEvent,
  InformationRequest,
  ReviewerRecommendation,
  ReviewCase,
} from "../types/reviewer.js";

export class WorkflowValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkflowValidationError";
  }
}

/** Allowed transitions by state and action. */
export const VALID_TRANSITIONS: Record<ReviewStatus, Partial<Record<ReviewAction, ReviewStatus>>> = {
  PENDING_REVIEWER: {
    START_REVIEW: "IN_REVIEW",
    REQUEST_INFORMATION: "NEEDS_INFORMATION",
  },
  IN_REVIEW: {
    REQUEST_INFORMATION: "NEEDS_INFORMATION",
    RECORD_RECOMMENDATION: "RECOMMENDATION_RECORDED",
  },
  NEEDS_INFORMATION: {
    RESUME_REVIEW: "IN_REVIEW",
  },
  RECOMMENDATION_RECORDED: {
    CLOSE_REVIEW: "CLOSED",
    REOPEN_REVIEW: "IN_REVIEW",
  },
  CLOSED: {
    REOPEN_REVIEW: "IN_REVIEW",
  },
};

export function getNextState(currentStatus: ReviewStatus, action: ReviewAction): ReviewStatus {
  const allowed = VALID_TRANSITIONS[currentStatus];
  if (!allowed || !allowed[action]) {
    const validActions = allowed ? Object.keys(allowed).join(", ") : "none";
    throw new WorkflowValidationError(
      `Invalid transition: Action "${action}" is not permitted from current status "${currentStatus}". Allowed actions: [${validActions}].`
    );
  }
  return allowed[action]!;
}

export function validateTransitionPreconditions(
  currentStatus: ReviewStatus,
  transition: TransitionRequest
): void {
  const { action, reason, reviewerId, requiredDocuments, recommendation, supportingEvidenceRefs } = transition;

  // Validate action exists
  if (!action) {
    throw new WorkflowValidationError("An action must be specified for the state transition.");
  }

  // Preconditions for REQUEST_INFORMATION
  if (action === "REQUEST_INFORMATION") {
    if (!reason || reason.trim().length === 0) {
      throw new WorkflowValidationError("A reason is strictly required when requesting additional information.");
    }
    if (!requiredDocuments || !Array.isArray(requiredDocuments) || requiredDocuments.length === 0) {
      throw new WorkflowValidationError(
        "At least one required document must be specified in the checklist when requesting information."
      );
    }
  }

  // Preconditions for RECORD_RECOMMENDATION
  if (action === "RECORD_RECOMMENDATION") {
    if (!reviewerId || reviewerId.trim().length === 0) {
      throw new WorkflowValidationError(
        "Reviewer identifier (reviewerId) is strictly required to record a formal recommendation."
      );
    }
    const validDecisions = ["APPROVE_AS_PREPARED", "DENY_WITH_REASON", "FORWARD_TO_MEDICAL_DIRECTOR"];
    if (!recommendation || !validDecisions.includes(recommendation)) {
      throw new WorkflowValidationError(
        `Recommendation must be one of: [${validDecisions.join(", ")}]. Received: "${recommendation}".`
      );
    }
    if (!reason || reason.trim().length === 0) {
      throw new WorkflowValidationError(
        "A detailed clinical or policy reason is required when recording a recommendation."
      );
    }
    if (!supportingEvidenceRefs || !Array.isArray(supportingEvidenceRefs) || supportingEvidenceRefs.length === 0) {
      throw new WorkflowValidationError(
        "Supporting evidence references (e.g. document excerpt ID, rule ID) are strictly required."
      );
    }
  }

  // Preconditions for START_REVIEW
  if (action === "START_REVIEW" && reviewerId) {
    if (reviewerId.trim().length === 0) {
      throw new WorkflowValidationError("Reviewer ID cannot be an empty string.");
    }
  }
}

export function applyTransition(
  reviewCase: ReviewCase,
  transition: TransitionRequest
): ReviewCase {
  validateTransitionPreconditions(reviewCase.currentStatus, transition);
  const nextStatus = getNextState(reviewCase.currentStatus, transition.action);
  const timestamp = new Date().toISOString();

  // Create audit event
  const auditEvent: AuditEvent = {
    eventId: `EVT-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    caseId: reviewCase.caseId,
    priorState: reviewCase.currentStatus,
    newState: nextStatus,
    action: transition.action,
    timestamp,
    reviewerId: transition.reviewerId ?? reviewCase.assignedReviewerId ?? null,
    reason: transition.reason ?? null,
    details: {
      notes: transition.notes ?? null,
      recommendation: transition.recommendation ?? null,
      requiredDocuments: transition.requiredDocuments ?? null,
      supportingEvidenceRefs: transition.supportingEvidenceRefs ?? null,
    },
  };

  // Clone case for immutability
  const updatedCase: ReviewCase = structuredClone(reviewCase);
  updatedCase.currentStatus = nextStatus;
  updatedCase.updatedAt = timestamp;
  if (transition.reviewerId) {
    updatedCase.assignedReviewerId = transition.reviewerId;
  }
  if (transition.notes) {
    updatedCase.reviewerNotes = transition.notes;
  }

  // Handle specific actions
  if (transition.action === "REQUEST_INFORMATION") {
    const infoRequest: InformationRequest = {
      requestId: `REQ-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      requestedAt: timestamp,
      reviewerId: transition.reviewerId ?? reviewCase.assignedReviewerId ?? null,
      reason: transition.reason!,
      requiredDocuments: [...transition.requiredDocuments!],
      resolved: false,
    };
    updatedCase.informationRequests.push(infoRequest);
  }

  if (transition.action === "RESUME_REVIEW") {
    // Mark previous requests resolved
    updatedCase.informationRequests = updatedCase.informationRequests.map((req) => ({
      ...req,
      resolved: true,
      resolvedAt: req.resolved ? req.resolvedAt : timestamp,
    }));
  }

  if (transition.action === "RECORD_RECOMMENDATION") {
    const rec: ReviewerRecommendation = {
      recordedAt: timestamp,
      reviewerId: transition.reviewerId!,
      reviewerRole: transition.reviewerRole ?? "Clinical Reviewer",
      recommendation: transition.recommendation!,
      reason: transition.reason!,
      supportingEvidenceRefs: [...transition.supportingEvidenceRefs!],
      recommendedInsurerPortion: transition.recommendedInsurerPortion ?? null,
      recommendedPatientPortion: transition.recommendedPatientPortion ?? null,
      clinicalNotes: transition.clinicalNotes,
      notice:
        "This is an internal REVIEWER RECOMMENDATION for pre-authorization coordination. " +
        "It does NOT constitute an insurer's legally authorized final decision.",
    };
    updatedCase.recommendation = rec;
  }

  updatedCase.auditHistory.push(auditEvent);
  return updatedCase;
}
