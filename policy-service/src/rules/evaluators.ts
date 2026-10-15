/**
 * AuthPilot AI — Deterministic Policy Rules Evaluators
 *
 * Each evaluator checks a single rule condition and returns a RuleResult.
 * Rules use only supplied data — they never invent or assume values.
 * Missing data returns INSUFFICIENT_DATA, not a silent pass or fail.
 */

import type { Policy } from "../types/policy.js";
import type { Claim } from "../types/claim.js";
import type { RuleResult, RuleStatus } from "../types/evaluation.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function daysBetween(isoA: string, isoB: string): number {
  const a = new Date(isoA).getTime();
  const b = new Date(isoB).getTime();
  return Math.floor((b - a) / 86_400_000);
}

function result(
  ruleId: string,
  description: string,
  status: RuleStatus,
  explanation: string,
  inputValues: Record<string, unknown>,
  policyId: string,
  policyVersion: string,
  opts: {
    missingFields?: string[];
    uncertaintyWarnings?: string[];
    evidenceRef?: string | null;
  } = {}
): RuleResult {
  return {
    ruleId,
    description,
    status,
    explanation,
    inputValues,
    policyId,
    policyVersion,
    missingFields: opts.missingFields ?? [],
    uncertaintyWarnings: opts.uncertaintyWarnings ?? [],
    evidenceRef: opts.evidenceRef ?? null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule 1: Policy Effective Date
// ─────────────────────────────────────────────────────────────────────────────

export function evaluatePolicyEffectiveDate(
  claim: Claim,
  policy: Policy
): RuleResult {
  const id = "R01_POLICY_EFFECTIVE_DATE";
  const desc = "Service date must be on or after the policy effective date.";
  const inputs = {
    serviceDate: claim.serviceDate,
    effectiveDate: policy.effectiveDate,
  };

  if (!claim.serviceDate) {
    return result(id, desc, "INSUFFICIENT_DATA",
      "Service date is not available in the supplied documents.",
      inputs, policy.policyId, policy.version,
      { missingFields: ["serviceDate"] });
  }

  const ok = claim.serviceDate >= policy.effectiveDate;
  return result(id, desc, ok ? "PASS" : "FAIL",
    ok
      ? `Service date ${claim.serviceDate} is within the policy effective period (from ${policy.effectiveDate}).`
      : `Service date ${claim.serviceDate} is BEFORE the policy effective date of ${policy.effectiveDate}.`,
    inputs, policy.policyId, policy.version);
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule 2: Policy Expiry Date
// ─────────────────────────────────────────────────────────────────────────────

export function evaluatePolicyExpiryDate(
  claim: Claim,
  policy: Policy
): RuleResult {
  const id = "R02_POLICY_EXPIRY_DATE";
  const desc = "Service date must be on or before the policy expiry date.";
  const inputs = {
    serviceDate: claim.serviceDate,
    expiryDate: policy.expiryDate,
  };

  if (!claim.serviceDate) {
    return result(id, desc, "INSUFFICIENT_DATA",
      "Service date is not available in the supplied documents.",
      inputs, policy.policyId, policy.version,
      { missingFields: ["serviceDate"] });
  }

  const ok = claim.serviceDate <= policy.expiryDate;
  return result(id, desc, ok ? "PASS" : "FAIL",
    ok
      ? `Service date ${claim.serviceDate} is within the policy coverage period (expires ${policy.expiryDate}).`
      : `Policy expired on ${policy.expiryDate}. Service date ${claim.serviceDate} is after expiry.`,
    inputs, policy.policyId, policy.version);
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule 3: Waiting Period
// ─────────────────────────────────────────────────────────────────────────────

export function evaluateWaitingPeriod(
  claim: Claim,
  policy: Policy
): RuleResult {
  const id = "R03_WAITING_PERIOD";
  const desc = `Service must occur at least ${policy.waitingPeriodDays} days after the policy effective date.`;
  const inputs = {
    serviceDate: claim.serviceDate,
    effectiveDate: policy.effectiveDate,
    waitingPeriodDays: policy.waitingPeriodDays,
  };

  if (!claim.serviceDate) {
    return result(id, desc, "INSUFFICIENT_DATA",
      "Service date is missing; cannot determine if waiting period has elapsed.",
      inputs, policy.policyId, policy.version,
      { missingFields: ["serviceDate"] });
  }

  const elapsed = daysBetween(policy.effectiveDate, claim.serviceDate);

  if (policy.waitingPeriodDays === 0) {
    return result(id, desc, "PASS",
      "No waiting period is configured for this demo policy.",
      inputs, policy.policyId, policy.version);
  }

  if (elapsed < 0) {
    return result(id, desc, "FAIL",
      `Service date ${claim.serviceDate} is before the policy start. Waiting period cannot be satisfied.`,
      inputs, policy.policyId, policy.version);
  }

  if (elapsed < policy.waitingPeriodDays) {
    return result(id, desc, "FAIL",
      `Only ${elapsed} days elapsed since policy start. Waiting period of ${policy.waitingPeriodDays} days not yet complete.`,
      inputs, policy.policyId, policy.version);
  }

  // Within 10% of waiting period boundary — flag for review
  const marginDays = Math.ceil(policy.waitingPeriodDays * 0.1);
  if (elapsed < policy.waitingPeriodDays + marginDays) {
    return result(id, desc, "REVIEW_REQUIRED",
      `Waiting period satisfied by only ${elapsed - policy.waitingPeriodDays} day(s). Verify the exact service date.`,
      inputs, policy.policyId, policy.version,
      { uncertaintyWarnings: ["Service date is very close to waiting period boundary — please verify."] });
  }

  return result(id, desc, "PASS",
    `Waiting period of ${policy.waitingPeriodDays} days satisfied. ${elapsed} days elapsed.`,
    inputs, policy.policyId, policy.version);
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule 4: Coverage Limit
// ─────────────────────────────────────────────────────────────────────────────

export function evaluateCoverageLimit(
  claim: Claim,
  policy: Policy
): RuleResult {
  const id = "R04_COVERAGE_LIMIT";
  const desc = "Covered expense must not exceed the policy coverage limit.";
  const inputs = {
    coveredExpenseAmount: claim.coveredExpenseAmount,
    coverageLimit: policy.coverageLimit,
    priorUtilization: claim.priorUtilizationAmount,
  };

  if (claim.coveredExpenseAmount === null) {
    return result(id, desc, "INSUFFICIENT_DATA",
      "Covered expense amount is not available. Cannot check against coverage limit.",
      inputs, policy.policyId, policy.version,
      { missingFields: ["coveredExpenseAmount"] });
  }

  if (claim.priorUtilizationAmount === null) {
    return result(id, desc, "REVIEW_REQUIRED",
      "Prior utilization data is not available. Remaining balance cannot be reliably determined. Human review required.",
      inputs, policy.policyId, policy.version,
      {
        uncertaintyWarnings: ["Prior utilization is unknown — remaining sum insured cannot be calculated."],
        missingFields: ["priorUtilizationAmount"],
      });
  }

  const remaining = policy.coverageLimit - claim.priorUtilizationAmount;

  if (remaining <= 0) {
    return result(id, desc, "FAIL",
      `Policy coverage limit of INR ${policy.coverageLimit.toLocaleString()} has been exhausted. Prior utilization: INR ${claim.priorUtilizationAmount.toLocaleString()}.`,
      inputs, policy.policyId, policy.version);
  }

  if (claim.coveredExpenseAmount > remaining) {
    return result(id, desc, "REVIEW_REQUIRED",
      `Covered expense of INR ${claim.coveredExpenseAmount.toLocaleString()} exceeds remaining balance of INR ${remaining.toLocaleString()}. Partial coverage may apply.`,
      inputs, policy.policyId, policy.version,
      { uncertaintyWarnings: ["Claim exceeds remaining sum insured; partial coverage only."] });
  }

  return result(id, desc, "PASS",
    `Covered expense of INR ${claim.coveredExpenseAmount.toLocaleString()} is within the remaining balance of INR ${remaining.toLocaleString()}.`,
    inputs, policy.policyId, policy.version);
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule 5: Sublimit Check
// ─────────────────────────────────────────────────────────────────────────────

export function evaluateSublimit(
  claim: Claim,
  policy: Policy
): RuleResult {
  const id = "R05_SUBLIMIT";
  const desc = "Covered expense must not exceed the applicable category sublimit.";
  const inputs = {
    claimCategory: claim.claimCategory,
    coveredExpenseAmount: claim.coveredExpenseAmount,
    sublimits: policy.sublimits,
  };

  const sub = policy.sublimits.find(
    (s) => s.category.toLowerCase() === claim.claimCategory.toLowerCase()
  );

  if (!sub) {
    return result(id, desc, "PASS",
      `No sublimit configured for category "${claim.claimCategory}". Standard coverage limit applies.`,
      inputs, policy.policyId, policy.version);
  }

  if (claim.coveredExpenseAmount === null) {
    return result(id, desc, "INSUFFICIENT_DATA",
      `Sublimit of INR ${sub.limitAmount.toLocaleString()} exists for "${claim.claimCategory}" but covered expense amount is unknown.`,
      inputs, policy.policyId, policy.version,
      { missingFields: ["coveredExpenseAmount"] });
  }

  if (claim.coveredExpenseAmount > sub.limitAmount) {
    return result(id, desc, "REVIEW_REQUIRED",
      `Covered expense of INR ${claim.coveredExpenseAmount.toLocaleString()} exceeds the "${claim.claimCategory}" sublimit of INR ${sub.limitAmount.toLocaleString()}. Amount above sublimit is not covered.`,
      inputs, policy.policyId, policy.version,
      { uncertaintyWarnings: ["Amount exceeding sublimit will not be covered under this category."] });
  }

  return result(id, desc, "PASS",
    `Covered expense of INR ${claim.coveredExpenseAmount.toLocaleString()} is within the "${claim.claimCategory}" sublimit of INR ${sub.limitAmount.toLocaleString()}.`,
    inputs, policy.policyId, policy.version);
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule 6: Exclusions
// ─────────────────────────────────────────────────────────────────────────────

export function evaluateExclusions(
  claim: Claim,
  policy: Policy
): RuleResult {
  const id = "R06_EXCLUSIONS";
  const desc = "Claim category or clinical notes must not match a policy exclusion.";
  const inputs = {
    claimCategory: claim.claimCategory,
    clinicalNotes: claim.clinicalNotes ?? null,
    exclusions: policy.exclusions,
  };

  if (policy.exclusions.length === 0) {
    return result(id, desc, "PASS",
      "No exclusions are defined for this demo policy.",
      inputs, policy.policyId, policy.version);
  }

  const lowerCategory = claim.claimCategory.toLowerCase();
  const lowerNotes = (claim.clinicalNotes ?? "").toLowerCase();

  const matched: string[] = [];
  const nearMatched: string[] = [];

  for (const excl of policy.exclusions) {
    const lowerExcl = excl.toLowerCase();
    if (lowerCategory.includes(lowerExcl) || lowerExcl.includes(lowerCategory)) {
      matched.push(excl);
    } else if (lowerNotes.includes(lowerExcl)) {
      nearMatched.push(excl);
    }
  }

  if (matched.length > 0) {
    return result(id, desc, "FAIL",
      `Claim category "${claim.claimCategory}" matches policy exclusion(s): ${matched.join(", ")}.`,
      inputs, policy.policyId, policy.version);
  }

  if (nearMatched.length > 0) {
    return result(id, desc, "REVIEW_REQUIRED",
      `Clinical notes may reference excluded conditions: ${nearMatched.join(", ")}. Human review required.`,
      inputs, policy.policyId, policy.version,
      { uncertaintyWarnings: ["Possible exclusion match found in clinical notes — verify with reviewer."] });
  }

  return result(id, desc, "PASS",
    `No exclusion matches found for claim category "${claim.claimCategory}".`,
    inputs, policy.policyId, policy.version);
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule 7: Required Documents
// ─────────────────────────────────────────────────────────────────────────────

export function evaluateRequiredDocuments(
  claim: Claim,
  policy: Policy
): RuleResult {
  const id = "R07_REQUIRED_DOCUMENTS";
  const desc = "All documents required by the policy must be present.";
  const inputs = {
    requiredDocuments: policy.requiredDocuments,
    suppliedDocuments: claim.suppliedDocuments,
  };

  const supplied = claim.suppliedDocuments.map((d) => d.toLowerCase().trim());
  const missing: string[] = [];

  for (const req of policy.requiredDocuments) {
    const found = supplied.some(
      (s) => s.includes(req.toLowerCase()) || req.toLowerCase().includes(s)
    );
    if (!found) missing.push(req);
  }

  if (missing.length === 0) {
    return result(id, desc, "PASS",
      "All required documents are present.",
      inputs, policy.policyId, policy.version);
  }

  return result(id, desc, "REVIEW_REQUIRED",
    `The following required documents are missing: ${missing.join(", ")}. Missing documents are flagged for follow-up — they do not automatically disqualify the claim.`,
    inputs, policy.policyId, policy.version,
    { missingFields: missing,
      uncertaintyWarnings: ["Missing documents do not automatically disqualify a claim — requires reviewer decision."] });
}

// ─────────────────────────────────────────────────────────────────────────────
// Rule 8: Deductible and Co-payment Validity
// ─────────────────────────────────────────────────────────────────────────────

export function evaluateDeductibleAndCoPayment(
  claim: Claim,
  policy: Policy
): RuleResult {
  const id = "R08_DEDUCTIBLE_COPAY";
  const desc = "Deductible and co-payment values must be valid for estimation.";
  const inputs = {
    deductible: policy.deductible,
    coPaymentPercent: policy.coPaymentPercent,
    coveredExpenseAmount: claim.coveredExpenseAmount,
  };

  const warnings: string[] = [];
  const missing: string[] = [];

  if (policy.coPaymentPercent < 0 || policy.coPaymentPercent > 100) {
    return result(id, desc, "FAIL",
      `Co-payment percentage of ${policy.coPaymentPercent}% is invalid (must be 0–100).`,
      inputs, policy.policyId, policy.version);
  }

  if (policy.deductible < 0) {
    return result(id, desc, "FAIL",
      `Deductible of INR ${policy.deductible} is negative — this is not a valid policy configuration.`,
      inputs, policy.policyId, policy.version);
  }

  if (claim.coveredExpenseAmount === null) {
    missing.push("coveredExpenseAmount");
    warnings.push("Covered expense amount is unknown — estimate will be incomplete.");
  } else if (claim.coveredExpenseAmount < 0) {
    return result(id, desc, "FAIL",
      `Covered expense amount of INR ${claim.coveredExpenseAmount} is negative — invalid input.`,
      inputs, policy.policyId, policy.version);
  }

  if (missing.length > 0) {
    return result(id, desc, "INSUFFICIENT_DATA",
      "Some values needed for deductible/co-pay calculation are missing.",
      inputs, policy.policyId, policy.version,
      { missingFields: missing, uncertaintyWarnings: warnings });
  }

  return result(id, desc, "PASS",
    `Deductible of INR ${policy.deductible.toLocaleString()} and co-payment of ${policy.coPaymentPercent}% are valid for estimation.`,
    inputs, policy.policyId, policy.version,
    { uncertaintyWarnings: warnings });
}
