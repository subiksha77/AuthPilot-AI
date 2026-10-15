/**
 * Evaluation result types for the AuthPilot AI policy rules engine.
 *
 * IMPORTANT: No status here constitutes a final insurance decision.
 * Final decisions require an authorized human reviewer.
 */

export type RuleStatus =
  | "PASS"               // Rule condition is met based on supplied data
  | "FAIL"               // Rule condition is clearly not met
  | "REVIEW_REQUIRED"    // Ambiguous, contradictory, or borderline — human review needed
  | "INSUFFICIENT_DATA"; // Essential input values are missing; cannot determine outcome

export interface RuleResult {
  ruleId: string;
  description: string;
  status: RuleStatus;
  explanation: string;
  inputValues: Record<string, unknown>;
  policyId: string;
  policyVersion: string;
  missingFields: string[];
  uncertaintyWarnings: string[];
  evidenceRef: string | null;
}

export interface EvaluationReport {
  claimId: string;
  policyId: string;
  policyVersion: string;
  evaluatedAt: string;        // ISO timestamp
  ruleResults: RuleResult[];
  overallStatus: RuleStatus;  // Most severe across all rules
  requiresHumanReview: boolean;
  /** NEVER an automated approval or rejection — for human review reference only. */
  disclaimer: "PRELIMINARY_ASSESSMENT_ONLY";
}
