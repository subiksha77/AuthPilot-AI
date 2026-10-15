/**
 * AuthPilot AI — Transparent Coverage Estimator
 *
 * Documented calculation order (applied once, in this sequence):
 *   1. Start with coveredExpenseAmount (not the full hospital bill)
 *   2. Apply the relevant coverage/sublimit cap:
 *      eligibleAmount = min(coveredExpenseAmount, appliedCoverageCap)
 *   3. Subtract the deductible:
 *      amountAfterDeductible = max(0, eligibleAmount - deductible)
 *   4. Apply co-payment to the remaining amount:
 *      insurerPortion = amountAfterDeductible * (1 - coPayPercent / 100)
 *      patientCoPay  = amountAfterDeductible * (coPayPercent / 100)
 *   5. Patient total = deductible + patientCoPay (never negative)
 *
 * ALL RESULTS ARE ESTIMATES ONLY — NOT GUARANTEED PAYOUTS.
 */

import type { Policy } from "../types/policy.js";
import type { Claim } from "../types/claim.js";
import type { EstimationResult, CoverageBreakdown } from "../types/estimation.js";

export function estimateCoverage(claim: Claim, policy: Policy): EstimationResult {
  const missingDataFields: string[] = [];
  const assumptions: string[] = [];
  let isComplete = true;

  // ── Validation ──────────────────────────────────────────────────────────────

  if (policy.coPaymentPercent < 0 || policy.coPaymentPercent > 100) {
    throw new Error(`Invalid coPaymentPercent: ${policy.coPaymentPercent}. Must be 0–100.`);
  }
  if (policy.deductible < 0) {
    throw new Error(`Invalid deductible: ${policy.deductible}. Must be >= 0.`);
  }

  // ── Step 1: Covered expense amount ─────────────────────────────────────────

  if (claim.coveredExpenseAmount === null) {
    missingDataFields.push("coveredExpenseAmount");
    isComplete = false;
    assumptions.push("Covered expense amount unknown — full estimate cannot be produced.");
  } else if (claim.coveredExpenseAmount < 0) {
    throw new Error(`Invalid coveredExpenseAmount: ${claim.coveredExpenseAmount}. Must be >= 0.`);
  }

  // ── Step 2: Determine applicable coverage cap ───────────────────────────────

  let appliedCoverageCap: number | null = null;

  if (claim.coveredExpenseAmount !== null) {
    const sub = policy.sublimits.find(
      (s) => s.category.toLowerCase() === claim.claimCategory.toLowerCase()
    );
    if (sub) {
      appliedCoverageCap = Math.min(sub.limitAmount, policy.coverageLimit);
      assumptions.push(`Sublimit of INR ${sub.limitAmount.toLocaleString()} applied for category "${claim.claimCategory}".`);
    } else {
      appliedCoverageCap = policy.coverageLimit;
      assumptions.push(`No category sublimit found for "${claim.claimCategory}"; policy coverage limit of INR ${policy.coverageLimit.toLocaleString()} applied.`);
    }
  }

  // ── Step 3–5: Core calculation ──────────────────────────────────────────────

  let eligibleAmount: number | null = null;
  let amountAfterDeductible: number | null = null;
  let estimatedInsurerPortion: number | null = null;
  let estimatedPatientPortion: number | null = null;

  if (claim.coveredExpenseAmount !== null && appliedCoverageCap !== null) {
    eligibleAmount = Math.min(claim.coveredExpenseAmount, appliedCoverageCap);
    amountAfterDeductible = Math.max(0, eligibleAmount - policy.deductible);
    const coPayFraction = policy.coPaymentPercent / 100;
    estimatedInsurerPortion = parseFloat((amountAfterDeductible * (1 - coPayFraction)).toFixed(2));
    const patientCoPay = parseFloat((amountAfterDeductible * coPayFraction).toFixed(2));
    estimatedPatientPortion = parseFloat((policy.deductible + patientCoPay).toFixed(2));

    // Guard: never negative
    estimatedInsurerPortion = Math.max(0, estimatedInsurerPortion);
    estimatedPatientPortion = Math.max(0, estimatedPatientPortion);
  }

  // ── Remaining sum insured ────────────────────────────────────────────────────

  let remainingSumInsured: number | null = null;
  if (claim.priorUtilizationAmount !== null) {
    remainingSumInsured = Math.max(0, policy.coverageLimit - claim.priorUtilizationAmount);
    assumptions.push(`Prior utilization of INR ${claim.priorUtilizationAmount.toLocaleString()} verified — remaining sum insured calculated.`);
  } else {
    missingDataFields.push("priorUtilizationAmount");
    isComplete = false;
    assumptions.push("Prior utilization data unavailable — remaining sum insured not shown (not fabricated).");
  }

  const breakdown: CoverageBreakdown = {
    hospitalBillAmount: claim.hospitalBillAmount,
    coveredExpenseAmount: claim.coveredExpenseAmount,
    appliedCoverageCap,
    deductible: policy.deductible,
    coPaymentPercent: policy.coPaymentPercent,
    eligibleAmount,
    amountAfterDeductible,
    estimatedInsurerPortion,
    estimatedPatientPortion,
    remainingSumInsured,
    missingDataFields,
    calculationAssumptions: assumptions,
    label: "ESTIMATE_ONLY",
  };

  return {
    claimId: claim.claimId,
    policyId: policy.policyId,
    policyVersion: policy.version,
    estimatedAt: new Date().toISOString(),
    isComplete,
    breakdown,
    disclaimer: "ALL_FIGURES_ARE_ESTIMATES_NOT_GUARANTEED_PAYOUTS",
  };
}
