/**
 * Coverage estimation types for AuthPilot AI policy-service.
 *
 * All results are ESTIMATES ONLY — not guaranteed payouts.
 * Final amounts depend on verified claim data and authorized reviewer decisions.
 */

export interface CoverageBreakdown {
  /** Original hospital bill supplied (INR). null = not provided. */
  hospitalBillAmount: number | null;

  /** Covered expense amount used in calculation (INR). null = not provided. */
  coveredExpenseAmount: number | null;

  /** Coverage cap applied — either policy limit or applicable sublimit (INR). */
  appliedCoverageCap: number | null;

  /** Fixed deductible subtracted from eligible amount (INR). */
  deductible: number;

  /** Co-payment percentage borne by member. */
  coPaymentPercent: number;

  /**
   * Amount eligible for coverage after cap (INR).
   * = min(coveredExpenseAmount, appliedCoverageCap)
   */
  eligibleAmount: number | null;

  /**
   * Amount after deductible (INR).
   * = max(0, eligibleAmount - deductible)
   */
  amountAfterDeductible: number | null;

  /**
   * Estimated insurer portion (INR).
   * = amountAfterDeductible * (1 - coPaymentPercent / 100)
   */
  estimatedInsurerPortion: number | null;

  /**
   * Estimated patient portion (INR).
   * = deductible + (amountAfterDeductible * coPaymentPercent / 100)
   */
  estimatedPatientPortion: number | null;

  /**
   * Remaining sum insured — reported as null if prior utilization data is unavailable.
   * Never invent this value.
   */
  remainingSumInsured: number | null;

  /** Fields that prevent a full reliable calculation. */
  missingDataFields: string[];

  /** Assumptions embedded in this estimate. */
  calculationAssumptions: string[];

  /** Mandated label — all estimates must carry this indicator. */
  label: "ESTIMATE_ONLY";
}

export interface EstimationResult {
  claimId: string;
  policyId: string;
  policyVersion: string;
  estimatedAt: string;
  isComplete: boolean;   // false when missingDataFields is non-empty
  breakdown: CoverageBreakdown;
  disclaimer: "ALL_FIGURES_ARE_ESTIMATES_NOT_GUARANTEED_PAYOUTS";
}
