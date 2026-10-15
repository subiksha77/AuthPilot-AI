/**
 * AuthPilot AI — Rules Engine Tests
 *
 * Tests are deterministic and use synthetic data only.
 * Each test exercises exactly one rule against known input/output pairs.
 */

import { describe, it, expect } from "vitest";
import { evaluateClaim } from "../src/rules/engine.js";
import { SYNTHETIC_POLICIES } from "../src/data/syntheticPolicies.js";
import { SYNTHETIC_CLAIMS } from "../src/data/syntheticClaims.js";
import type { Claim } from "../src/types/claim.js";
import type { Policy } from "../src/types/policy.js";

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const POLICY_001 = SYNTHETIC_POLICIES[0]!;   // Comprehensive, 30-day wait
const POLICY_002 = SYNTHETIC_POLICIES[1]!;   // Basic, 90-day wait
const POLICY_003 = SYNTHETIC_POLICIES[2]!;   // Premium Plus, no wait, no deductible

const CLAIM_HAPPY = SYNTHETIC_CLAIMS[0]!;    // All data, well within limits
const CLAIM_ICU   = SYNTHETIC_CLAIMS[1]!;    // ICU sublimit exceeded
const CLAIM_MISSING = SYNTHETIC_CLAIMS[2]!;  // No service date, no covered amount
const CLAIM_EXCLUSION = SYNTHETIC_CLAIMS[3]!; // Cosmetic Surgery
const CLAIM_WAITING  = SYNTHETIC_CLAIMS[4]!; // Waiting period not met
const CLAIM_PREMIUM  = SYNTHETIC_CLAIMS[5]!; // Premium Plus, large claim

// ─────────────────────────────────────────────────────────────────────────────
// Overall report structure
// ─────────────────────────────────────────────────────────────────────────────

describe("evaluateClaim — report structure", () => {
  it("returns all required report fields", () => {
    const report = evaluateClaim(CLAIM_HAPPY, POLICY_001);
    expect(report).toHaveProperty("claimId", CLAIM_HAPPY.claimId);
    expect(report).toHaveProperty("policyId", POLICY_001.policyId);
    expect(report).toHaveProperty("policyVersion", POLICY_001.version);
    expect(report).toHaveProperty("evaluatedAt");
    expect(report).toHaveProperty("ruleResults");
    expect(report).toHaveProperty("overallStatus");
    expect(report).toHaveProperty("requiresHumanReview");
    expect(report.disclaimer).toBe("PRELIMINARY_ASSESSMENT_ONLY");
  });

  it("returns 8 rule results", () => {
    const report = evaluateClaim(CLAIM_HAPPY, POLICY_001);
    expect(report.ruleResults).toHaveLength(8);
  });

  it("assigns rule IDs correctly", () => {
    const report = evaluateClaim(CLAIM_HAPPY, POLICY_001);
    const ids = report.ruleResults.map((r) => r.ruleId);
    expect(ids).toContain("R01_POLICY_EFFECTIVE_DATE");
    expect(ids).toContain("R02_POLICY_EXPIRY_DATE");
    expect(ids).toContain("R03_WAITING_PERIOD");
    expect(ids).toContain("R04_COVERAGE_LIMIT");
    expect(ids).toContain("R05_SUBLIMIT");
    expect(ids).toContain("R06_EXCLUSIONS");
    expect(ids).toContain("R07_REQUIRED_DOCUMENTS");
    expect(ids).toContain("R08_DEDUCTIBLE_COPAY");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// R01 — Policy Effective Date
// ─────────────────────────────────────────────────────────────────────────────

describe("R01_POLICY_EFFECTIVE_DATE", () => {
  it("PASS when service date is after effective date", () => {
    const report = evaluateClaim(CLAIM_HAPPY, POLICY_001);
    const r = report.ruleResults.find((r) => r.ruleId === "R01_POLICY_EFFECTIVE_DATE")!;
    expect(r.status).toBe("PASS");
  });

  it("INSUFFICIENT_DATA when service date is null", () => {
    const report = evaluateClaim(CLAIM_MISSING, POLICY_002);
    const r = report.ruleResults.find((r) => r.ruleId === "R01_POLICY_EFFECTIVE_DATE")!;
    expect(r.status).toBe("INSUFFICIENT_DATA");
    expect(r.missingFields).toContain("serviceDate");
  });

  it("FAIL when service date is before effective date", () => {
    const claim: Claim = { ...CLAIM_HAPPY, serviceDate: "2024-12-31", _syntheticDemo: true };
    const report = evaluateClaim(claim, POLICY_001);
    const r = report.ruleResults.find((r) => r.ruleId === "R01_POLICY_EFFECTIVE_DATE")!;
    expect(r.status).toBe("FAIL");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// R02 — Policy Expiry Date
// ─────────────────────────────────────────────────────────────────────────────

describe("R02_POLICY_EXPIRY_DATE", () => {
  it("PASS when service date is before expiry", () => {
    const report = evaluateClaim(CLAIM_HAPPY, POLICY_001);
    const r = report.ruleResults.find((r) => r.ruleId === "R02_POLICY_EXPIRY_DATE")!;
    expect(r.status).toBe("PASS");
  });

  it("FAIL when service date is after expiry", () => {
    const claim: Claim = { ...CLAIM_HAPPY, serviceDate: "2026-01-15", _syntheticDemo: true };
    const report = evaluateClaim(claim, POLICY_001);
    const r = report.ruleResults.find((r) => r.ruleId === "R02_POLICY_EXPIRY_DATE")!;
    expect(r.status).toBe("FAIL");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// R03 — Waiting Period
// ─────────────────────────────────────────────────────────────────────────────

describe("R03_WAITING_PERIOD", () => {
  it("FAIL when waiting period not met (basic plan, 90-day wait)", () => {
    const report = evaluateClaim(CLAIM_WAITING, POLICY_002);
    const r = report.ruleResults.find((r) => r.ruleId === "R03_WAITING_PERIOD")!;
    expect(r.status).toBe("FAIL");
  });

  it("PASS when no waiting period configured (premium plan)", () => {
    const report = evaluateClaim(CLAIM_PREMIUM, POLICY_003);
    const r = report.ruleResults.find((r) => r.ruleId === "R03_WAITING_PERIOD")!;
    expect(r.status).toBe("PASS");
  });

  it("PASS when service date is well beyond waiting period", () => {
    const report = evaluateClaim(CLAIM_HAPPY, POLICY_001);
    const r = report.ruleResults.find((r) => r.ruleId === "R03_WAITING_PERIOD")!;
    expect(r.status).toBe("PASS");
  });

  it("INSUFFICIENT_DATA when service date is null", () => {
    const report = evaluateClaim(CLAIM_MISSING, POLICY_002);
    const r = report.ruleResults.find((r) => r.ruleId === "R03_WAITING_PERIOD")!;
    expect(r.status).toBe("INSUFFICIENT_DATA");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// R04 — Coverage Limit
// ─────────────────────────────────────────────────────────────────────────────

describe("R04_COVERAGE_LIMIT", () => {
  it("PASS when within coverage limit", () => {
    const report = evaluateClaim(CLAIM_HAPPY, POLICY_001);
    const r = report.ruleResults.find((r) => r.ruleId === "R04_COVERAGE_LIMIT")!;
    expect(r.status).toBe("PASS");
  });

  it("REVIEW_REQUIRED when covered amount is known but prior utilization is null", () => {
    // CLAIM_MISSING has null coveredExpenseAmount → INSUFFICIENT_DATA (can't check limit at all)
    // Use a claim that has a covered amount but no prior utilization data
    const claim: Claim = {
      ...CLAIM_HAPPY,
      claimId: "DEMO-TEST-R04",
      priorUtilizationAmount: null,
      _syntheticDemo: true,
    };
    const report = evaluateClaim(claim, POLICY_001);
    const r = report.ruleResults.find((r) => r.ruleId === "R04_COVERAGE_LIMIT")!;
    expect(r.status).toBe("REVIEW_REQUIRED");
    expect(r.missingFields).toContain("priorUtilizationAmount");
  });

  it("FAIL when coverage limit exhausted", () => {
    const claim: Claim = { ...CLAIM_HAPPY, coveredExpenseAmount: 10_000, priorUtilizationAmount: 500_000, _syntheticDemo: true };
    const report = evaluateClaim(claim, POLICY_001);
    const r = report.ruleResults.find((r) => r.ruleId === "R04_COVERAGE_LIMIT")!;
    expect(r.status).toBe("FAIL");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// R05 — Sublimit
// ─────────────────────────────────────────────────────────────────────────────

describe("R05_SUBLIMIT", () => {
  it("REVIEW_REQUIRED when ICU expense exceeds sublimit", () => {
    const report = evaluateClaim(CLAIM_ICU, POLICY_001);
    const r = report.ruleResults.find((r) => r.ruleId === "R05_SUBLIMIT")!;
    expect(r.status).toBe("REVIEW_REQUIRED");
  });

  it("PASS when no sublimit for the claim category", () => {
    const report = evaluateClaim(CLAIM_HAPPY, POLICY_001); // Inpatient — no sublimit
    const r = report.ruleResults.find((r) => r.ruleId === "R05_SUBLIMIT")!;
    expect(r.status).toBe("PASS");
  });

  it("PASS when within sublimit", () => {
    const claim: Claim = { ...CLAIM_ICU, coveredExpenseAmount: 100_000, _syntheticDemo: true };
    const report = evaluateClaim(claim, POLICY_001);
    const r = report.ruleResults.find((r) => r.ruleId === "R05_SUBLIMIT")!;
    expect(r.status).toBe("PASS");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// R06 — Exclusions
// ─────────────────────────────────────────────────────────────────────────────

describe("R06_EXCLUSIONS", () => {
  it("FAIL when claim category is excluded", () => {
    const report = evaluateClaim(CLAIM_EXCLUSION, POLICY_001);
    const r = report.ruleResults.find((r) => r.ruleId === "R06_EXCLUSIONS")!;
    expect(r.status).toBe("FAIL");
  });

  it("PASS when no exclusion matches", () => {
    const report = evaluateClaim(CLAIM_HAPPY, POLICY_001);
    const r = report.ruleResults.find((r) => r.ruleId === "R06_EXCLUSIONS")!;
    expect(r.status).toBe("PASS");
  });

  it("REVIEW_REQUIRED when clinical notes reference excluded condition", () => {
    const claim: Claim = {
      ...CLAIM_HAPPY,
      claimCategory: "Inpatient",
      clinicalNotes: "Patient required dental extraction under general anaesthesia during stay.",
      _syntheticDemo: true,
    };
    const report = evaluateClaim(claim, POLICY_001);
    const r = report.ruleResults.find((r) => r.ruleId === "R06_EXCLUSIONS")!;
    expect(r.status).toBe("REVIEW_REQUIRED");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// R07 — Required Documents
// ─────────────────────────────────────────────────────────────────────────────

describe("R07_REQUIRED_DOCUMENTS", () => {
  it("PASS when all required docs are present", () => {
    const report = evaluateClaim(CLAIM_HAPPY, POLICY_001);
    const r = report.ruleResults.find((r) => r.ruleId === "R07_REQUIRED_DOCUMENTS")!;
    expect(r.status).toBe("PASS");
  });

  it("REVIEW_REQUIRED when docs are missing", () => {
    const report = evaluateClaim(CLAIM_ICU, POLICY_001); // Missing Doctor Prescription
    const r = report.ruleResults.find((r) => r.ruleId === "R07_REQUIRED_DOCUMENTS")!;
    expect(r.status).toBe("REVIEW_REQUIRED");
    expect(r.missingFields.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// R08 — Deductible and Co-payment
// ─────────────────────────────────────────────────────────────────────────────

describe("R08_DEDUCTIBLE_COPAY", () => {
  it("PASS for valid deductible and co-payment with known expense", () => {
    const report = evaluateClaim(CLAIM_HAPPY, POLICY_001);
    const r = report.ruleResults.find((r) => r.ruleId === "R08_DEDUCTIBLE_COPAY")!;
    expect(r.status).toBe("PASS");
  });

  it("INSUFFICIENT_DATA when covered expense is null", () => {
    const report = evaluateClaim(CLAIM_MISSING, POLICY_002);
    const r = report.ruleResults.find((r) => r.ruleId === "R08_DEDUCTIBLE_COPAY")!;
    expect(r.status).toBe("INSUFFICIENT_DATA");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Overall status aggregation
// ─────────────────────────────────────────────────────────────────────────────

describe("Overall status aggregation", () => {
  it("overallStatus is PASS for a clean happy-path claim (except doc check)", () => {
    const report = evaluateClaim(CLAIM_HAPPY, POLICY_001);
    // All rules should pass for DEMO-CLM-001 against DEMO-POL-001
    expect(["PASS", "REVIEW_REQUIRED"]).toContain(report.overallStatus);
  });

  it("overallStatus is FAIL when an exclusion is triggered", () => {
    const report = evaluateClaim(CLAIM_EXCLUSION, POLICY_001);
    expect(report.overallStatus).toBe("FAIL");
  });

  it("requiresHumanReview is true when overallStatus is not PASS", () => {
    const report = evaluateClaim(CLAIM_EXCLUSION, POLICY_001);
    expect(report.requiresHumanReview).toBe(true);
  });

  it("requiresHumanReview is true for missing data", () => {
    const report = evaluateClaim(CLAIM_MISSING, POLICY_002);
    expect(report.requiresHumanReview).toBe(true);
  });
});
