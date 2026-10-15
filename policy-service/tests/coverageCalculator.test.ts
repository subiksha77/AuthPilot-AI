/**
 * AuthPilot AI — Coverage Calculator Tests
 *
 * Verifies the 4-step estimation: cap → deductible → co-payment → patient portion.
 * All inputs are synthetic demo data only.
 */

import { describe, it, expect } from "vitest";
import { estimateCoverage } from "../src/estimator/coverageCalculator.js";
import { SYNTHETIC_POLICIES } from "../src/data/syntheticPolicies.js";
import { SYNTHETIC_CLAIMS } from "../src/data/syntheticClaims.js";
import type { Claim } from "../src/types/claim.js";

const POLICY_001 = SYNTHETIC_POLICIES[0]!;  // 500k limit, 5k deductible, 10% copay, 30-day wait
const POLICY_002 = SYNTHETIC_POLICIES[1]!;  // 200k limit, 10k deductible, 20% copay
const POLICY_003 = SYNTHETIC_POLICIES[2]!;  // 1M limit, 0 deductible, 5% copay, no wait

const CLAIM_HAPPY   = SYNTHETIC_CLAIMS[0]!;   // 75k covered, 50k prior, Inpatient, POLICY_001
const CLAIM_MISSING = SYNTHETIC_CLAIMS[2]!;   // null covered expense
const CLAIM_PREMIUM = SYNTHETIC_CLAIMS[5]!;   // 340k covered, ICU, POLICY_003

// ─────────────────────────────────────────────────────────────────────────────
// Result structure
// ─────────────────────────────────────────────────────────────────────────────

describe("estimateCoverage — result structure", () => {
  it("returns all required top-level fields", () => {
    const result = estimateCoverage(CLAIM_HAPPY, POLICY_001);
    expect(result).toHaveProperty("claimId", CLAIM_HAPPY.claimId);
    expect(result).toHaveProperty("policyId", POLICY_001.policyId);
    expect(result).toHaveProperty("policyVersion", POLICY_001.version);
    expect(result).toHaveProperty("estimatedAt");
    expect(result).toHaveProperty("isComplete");
    expect(result).toHaveProperty("breakdown");
    expect(result.disclaimer).toBe("ALL_FIGURES_ARE_ESTIMATES_NOT_GUARANTEED_PAYOUTS");
  });

  it("breakdown carries the ESTIMATE_ONLY label", () => {
    const result = estimateCoverage(CLAIM_HAPPY, POLICY_001);
    expect(result.breakdown.label).toBe("ESTIMATE_ONLY");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Happy path calculation (DEMO-CLM-001 + DEMO-POL-001)
// covered = 75_000, cap = 500_000 (no sublimit for Inpatient)
// eligible = min(75_000, 500_000) = 75_000
// after deductible = max(0, 75_000 - 5_000) = 70_000
// insurer = 70_000 * 0.90 = 63_000
// patient = 5_000 + 70_000 * 0.10 = 5_000 + 7_000 = 12_000
// remaining = 500_000 - 50_000 = 450_000
// ─────────────────────────────────────────────────────────────────────────────

describe("estimateCoverage — happy path (DEMO-CLM-001 / DEMO-POL-001)", () => {
  it("sets isComplete to true", () => {
    const result = estimateCoverage(CLAIM_HAPPY, POLICY_001);
    expect(result.isComplete).toBe(true);
  });

  it("calculates eligibleAmount correctly", () => {
    const result = estimateCoverage(CLAIM_HAPPY, POLICY_001);
    expect(result.breakdown.eligibleAmount).toBe(75_000);
  });

  it("calculates amountAfterDeductible correctly", () => {
    const result = estimateCoverage(CLAIM_HAPPY, POLICY_001);
    expect(result.breakdown.amountAfterDeductible).toBe(70_000);
  });

  it("calculates estimatedInsurerPortion correctly", () => {
    const result = estimateCoverage(CLAIM_HAPPY, POLICY_001);
    expect(result.breakdown.estimatedInsurerPortion).toBe(63_000);
  });

  it("calculates estimatedPatientPortion correctly", () => {
    const result = estimateCoverage(CLAIM_HAPPY, POLICY_001);
    expect(result.breakdown.estimatedPatientPortion).toBe(12_000);
  });

  it("calculates remainingSumInsured correctly", () => {
    const result = estimateCoverage(CLAIM_HAPPY, POLICY_001);
    expect(result.breakdown.remainingSumInsured).toBe(450_000);
  });

  it("insurer + patient portions add up to amountAfterDeductible + deductible", () => {
    const bd = estimateCoverage(CLAIM_HAPPY, POLICY_001).breakdown;
    const total = (bd.estimatedInsurerPortion ?? 0) + (bd.estimatedPatientPortion ?? 0);
    expect(total).toBeCloseTo((bd.amountAfterDeductible ?? 0) + bd.deductible, 2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ICU sublimit (DEMO-CLM-002 + DEMO-POL-001)
// covered = 180_000, ICU sublimit = 150_000
// cap = min(150_000, 500_000) = 150_000
// eligible = min(180_000, 150_000) = 150_000
// after deductible = max(0, 150_000 - 5_000) = 145_000
// insurer = 145_000 * 0.90 = 130_500
// patient = 5_000 + 145_000 * 0.10 = 5_000 + 14_500 = 19_500
// ─────────────────────────────────────────────────────────────────────────────

describe("estimateCoverage — ICU sublimit (DEMO-CLM-002 / DEMO-POL-001)", () => {
  const CLAIM_ICU = SYNTHETIC_CLAIMS[1]!;

  it("applies the ICU sublimit cap", () => {
    const result = estimateCoverage(CLAIM_ICU, POLICY_001);
    expect(result.breakdown.appliedCoverageCap).toBe(150_000);
  });

  it("eligibleAmount is capped at sublimit", () => {
    const result = estimateCoverage(CLAIM_ICU, POLICY_001);
    expect(result.breakdown.eligibleAmount).toBe(150_000);
  });

  it("calculates insurer portion correctly", () => {
    const result = estimateCoverage(CLAIM_ICU, POLICY_001);
    expect(result.breakdown.estimatedInsurerPortion).toBeCloseTo(130_500, 2);
  });

  it("calculates patient portion correctly", () => {
    const result = estimateCoverage(CLAIM_ICU, POLICY_001);
    expect(result.breakdown.estimatedPatientPortion).toBeCloseTo(19_500, 2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Missing data (DEMO-CLM-003)
// ─────────────────────────────────────────────────────────────────────────────

describe("estimateCoverage — missing data (DEMO-CLM-003 / DEMO-POL-002)", () => {
  it("sets isComplete to false when covered expense is null", () => {
    const result = estimateCoverage(CLAIM_MISSING, POLICY_002);
    expect(result.isComplete).toBe(false);
  });

  it("lists missing fields", () => {
    const result = estimateCoverage(CLAIM_MISSING, POLICY_002);
    expect(result.breakdown.missingDataFields).toContain("coveredExpenseAmount");
  });

  it("does NOT invent values — all calculation fields are null", () => {
    const bd = estimateCoverage(CLAIM_MISSING, POLICY_002).breakdown;
    expect(bd.eligibleAmount).toBeNull();
    expect(bd.amountAfterDeductible).toBeNull();
    expect(bd.estimatedInsurerPortion).toBeNull();
    expect(bd.estimatedPatientPortion).toBeNull();
  });

  it("does NOT fabricate remainingSumInsured when prior utilization is null", () => {
    const result = estimateCoverage(CLAIM_MISSING, POLICY_002);
    expect(result.breakdown.remainingSumInsured).toBeNull();
    expect(result.breakdown.missingDataFields).toContain("priorUtilizationAmount");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Premium Plus — zero deductible, 5% co-pay (DEMO-CLM-006 / DEMO-POL-003)
// covered = 340_000, ICU sublimit = 400_000
// cap = min(400_000, 1_000_000) = 400_000
// eligible = min(340_000, 400_000) = 340_000
// after deductible = max(0, 340_000 - 0) = 340_000
// insurer = 340_000 * 0.95 = 323_000
// patient = 0 + 340_000 * 0.05 = 17_000
// remaining = 1_000_000 - 200_000 = 800_000
// ─────────────────────────────────────────────────────────────────────────────

describe("estimateCoverage — premium plan (DEMO-CLM-006 / DEMO-POL-003)", () => {
  it("zero deductible is applied correctly", () => {
    const result = estimateCoverage(CLAIM_PREMIUM, POLICY_003);
    expect(result.breakdown.deductible).toBe(0);
    expect(result.breakdown.amountAfterDeductible).toBe(340_000);
  });

  it("calculates insurer portion at 95%", () => {
    const result = estimateCoverage(CLAIM_PREMIUM, POLICY_003);
    expect(result.breakdown.estimatedInsurerPortion).toBeCloseTo(323_000, 2);
  });

  it("calculates patient portion at 5%", () => {
    const result = estimateCoverage(CLAIM_PREMIUM, POLICY_003);
    expect(result.breakdown.estimatedPatientPortion).toBeCloseTo(17_000, 2);
  });

  it("remaining sum insured is 800k", () => {
    const result = estimateCoverage(CLAIM_PREMIUM, POLICY_003);
    expect(result.breakdown.remainingSumInsured).toBe(800_000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Edge cases
// ─────────────────────────────────────────────────────────────────────────────

describe("estimateCoverage — edge cases", () => {
  it("expense less than deductible — insurer portion is 0, patient pays expense only", () => {
    const claim: Claim = {
      ...CLAIM_HAPPY,
      claimId: "DEMO-EDGE-001",
      coveredExpenseAmount: 3_000,   // Less than 5_000 deductible
      priorUtilizationAmount: 0,
      _syntheticDemo: true,
    };
    const result = estimateCoverage(claim, POLICY_001);
    expect(result.breakdown.amountAfterDeductible).toBe(0);
    expect(result.breakdown.estimatedInsurerPortion).toBe(0);
    // Patient pays the deductible up to the eligible amount (≤ deductible)
    expect(result.breakdown.estimatedPatientPortion).toBeGreaterThanOrEqual(0);
  });

  it("throws for invalid negative covered expense", () => {
    const claim: Claim = {
      ...CLAIM_HAPPY,
      coveredExpenseAmount: -1,
      _syntheticDemo: true,
    };
    expect(() => estimateCoverage(claim, POLICY_001)).toThrow();
  });

  it("throws for invalid co-payment percent > 100", () => {
    const policy = { ...POLICY_001, coPaymentPercent: 150 };
    expect(() => estimateCoverage(CLAIM_HAPPY, policy)).toThrow();
  });

  it("calculates correctly with 100% co-payment (patient bears all)", () => {
    const policy = { ...POLICY_001, coPaymentPercent: 100, deductible: 0 };
    const result = estimateCoverage(CLAIM_HAPPY, policy);
    expect(result.breakdown.estimatedInsurerPortion).toBe(0);
    expect(result.breakdown.estimatedPatientPortion).toBeCloseTo(75_000, 2);
  });

  it("calculates correctly with 0% co-payment (insurer bears all after deductible)", () => {
    const policy = { ...POLICY_001, coPaymentPercent: 0 };
    const result = estimateCoverage(CLAIM_HAPPY, policy);
    expect(result.breakdown.estimatedInsurerPortion).toBeCloseTo(70_000, 2);
    expect(result.breakdown.estimatedPatientPortion).toBeCloseTo(5_000, 2); // Just deductible
  });

  it("includes assumptions in the breakdown", () => {
    const result = estimateCoverage(CLAIM_HAPPY, POLICY_001);
    expect(result.breakdown.calculationAssumptions.length).toBeGreaterThan(0);
  });
});
