/**
 * AuthPilot AI — Policy Rules Engine
 *
 * Orchestrates all rule evaluators and computes the aggregate evaluation report.
 * IMPORTANT: This engine provides PRELIMINARY_ASSESSMENT_ONLY.
 * No automated approval or rejection of real insurance claims.
 */

import type { Policy } from "../types/policy.js";
import type { Claim } from "../types/claim.js";
import type { EvaluationReport, RuleStatus } from "../types/evaluation.js";
import {
  evaluatePolicyEffectiveDate,
  evaluatePolicyExpiryDate,
  evaluateWaitingPeriod,
  evaluateCoverageLimit,
  evaluateSublimit,
  evaluateExclusions,
  evaluateRequiredDocuments,
  evaluateDeductibleAndCoPayment,
} from "./evaluators.js";

/** Priority order for overall status (most severe wins). */
const STATUS_SEVERITY: Record<RuleStatus, number> = {
  PASS: 0,
  INSUFFICIENT_DATA: 1,
  REVIEW_REQUIRED: 2,
  FAIL: 3,
};

function computeOverallStatus(statuses: RuleStatus[]): RuleStatus {
  let worst: RuleStatus = "PASS";
  for (const s of statuses) {
    if (STATUS_SEVERITY[s] > STATUS_SEVERITY[worst]) worst = s;
  }
  return worst;
}

/**
 * Evaluates a claim against a policy using all configured deterministic rules.
 * Returns a structured EvaluationReport — never a final claim decision.
 */
export function evaluateClaim(claim: Claim, policy: Policy): EvaluationReport {
  const ruleResults = [
    evaluatePolicyEffectiveDate(claim, policy),
    evaluatePolicyExpiryDate(claim, policy),
    evaluateWaitingPeriod(claim, policy),
    evaluateCoverageLimit(claim, policy),
    evaluateSublimit(claim, policy),
    evaluateExclusions(claim, policy),
    evaluateRequiredDocuments(claim, policy),
    evaluateDeductibleAndCoPayment(claim, policy),
  ];

  const overallStatus = computeOverallStatus(ruleResults.map((r) => r.status));
  const requiresHumanReview =
    overallStatus === "REVIEW_REQUIRED" ||
    overallStatus === "INSUFFICIENT_DATA" ||
    overallStatus === "FAIL";

  return {
    claimId: claim.claimId,
    policyId: policy.policyId,
    policyVersion: policy.version,
    evaluatedAt: new Date().toISOString(),
    ruleResults,
    overallStatus,
    requiresHumanReview,
    disclaimer: "PRELIMINARY_ASSESSMENT_ONLY",
  };
}
