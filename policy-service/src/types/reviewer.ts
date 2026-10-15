/**
 * Reviewer Workflow & Audit History types for AuthPilot AI policy-service.
 *
 * Defines the finite state machine for human review of prior-auth claims:
 *   PENDING_REVIEWER -> IN_REVIEW -> NEEDS_INFORMATION / RECOMMENDATION_RECORDED -> CLOSED
 *
 * CRITICAL HEALTHCARE COMPLIANCE RULE:
 * Reviewer recommendations are clinical/administrative opinions and do NOT
 * constitute an insurer's final legal or coverage decision.
 */

import type { EvaluationReport } from "./evaluation.js";
import type { EstimationResult } from "./estimation.js";

export type ReviewStatus =
  | "PENDING_REVIEWER"
  | "NEEDS_INFORMATION"
  | "IN_REVIEW"
  | "RECOMMENDATION_RECORDED"
  | "CLOSED";

export type ReviewAction =
  | "START_REVIEW"
  | "REQUEST_INFORMATION"
  | "RESUME_REVIEW"
  | "RECORD_RECOMMENDATION"
  | "CLOSE_REVIEW"
  | "REOPEN_REVIEW";

export type ReviewerRecommendationDecision =
  | "APPROVE_AS_PREPARED"
  | "DENY_WITH_REASON"
  | "FORWARD_TO_MEDICAL_DIRECTOR";

export interface InformationRequest {
  requestId: string;
  requestedAt: string;
  reviewerId: string | null;
  reason: string;
  requiredDocuments: string[];
  resolved: boolean;
  resolvedAt?: string;
}

export interface ReviewerRecommendation {
  recordedAt: string;
  reviewerId: string;
  reviewerRole?: string;
  recommendation: ReviewerRecommendationDecision;
  reason: string;
  supportingEvidenceRefs: string[];
  recommendedInsurerPortion?: number | null;
  recommendedPatientPortion?: number | null;
  clinicalNotes?: string;
  notice: string;
}

export interface AuditEvent {
  eventId: string;
  caseId: string;
  priorState: ReviewStatus;
  newState: ReviewStatus;
  action: ReviewAction;
  timestamp: string;
  reviewerId: string | null;
  reason: string | null;
  details: Record<string, unknown>;
}

export interface TransitionRequest {
  action: ReviewAction;
  reviewerId?: string;
  reason?: string;
  // Specific to REQUEST_INFORMATION
  requiredDocuments?: string[];
  // Specific to RECORD_RECOMMENDATION
  recommendation?: ReviewerRecommendationDecision;
  supportingEvidenceRefs?: string[];
  recommendedInsurerPortion?: number | null;
  recommendedPatientPortion?: number | null;
  reviewerRole?: string;
  clinicalNotes?: string;
  // General notes
  notes?: string;
}

export interface ReviewCase {
  caseId: string;
  claimId: string;
  policyId: string;
  currentStatus: ReviewStatus;
  createdAt: string;
  updatedAt: string;
  assignedReviewerId: string | null;
  reviewerNotes: string | null;
  preliminaryEvaluation: EvaluationReport;
  coverageEstimation: EstimationResult;
  informationRequests: InformationRequest[];
  recommendation: ReviewerRecommendation | null;
  auditHistory: AuditEvent[];
  notice: string;
}
