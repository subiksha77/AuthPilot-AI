/**
 * AuthPilot AI — Policy Radar Tests
 *
 * Verifies factual field comparison, semantic labeling (increased, decreased, added, removed),
 * separation of factual diffs from financial impact, and insufficient-data handling.
 */

import { describe, it, expect } from "vitest";
import { comparePolicies } from "../src/radar/comparator.js";
import { SYNTHETIC_POLICIES } from "../src/data/syntheticPolicies.js";
import type { Policy } from "../src/types/policy.js";

const POLICY_001 = SYNTHETIC_POLICIES[0]!; // Comprehensive
const POLICY_002 = SYNTHETIC_POLICIES[1]!; // Basic
const POLICY_003 = SYNTHETIC_POLICIES[2]!; // Premium Plus

describe("Policy Radar — comparePolicies", () => {
  it("successfully compares two valid synthetic policies", () => {
    const result = comparePolicies(POLICY_001, POLICY_002);

    expect(result.isComparable).toBe(true);
    expect(result.insufficientDataReasons).toHaveLength(0);
    expect(result.baselinePolicy.policyId).toBe("DEMO-POL-001");
    expect(result.targetPolicy.policyId).toBe("DEMO-POL-002");
    expect(result.disclaimer).toBe("INFORMATIONAL_ONLY_NOT_A_GUARANTEE_OF_COVERAGE");
    expect(result.applicabilityNotice).toContain("DEMO-POL-001");
    expect(result.applicabilityNotice).toContain("DEMO-POL-002");
  });

  it("detects deductible increase as unfavorable to member", () => {
    // Policy 1 has 5,000; Policy 2 has 10,000
    const result = comparePolicies(POLICY_001, POLICY_002);
    const deductibleDiff = result.fieldDifferences.find((f) => f.field === "deductible");

    expect(deductibleDiff).toBeDefined();
    expect(deductibleDiff?.changeType).toBe("increased");
    expect(deductibleDiff?.financialImpact).toBe("unfavorable_to_member");
    expect(deductibleDiff?.factualDifference).toContain("from INR 5,000 to INR 10,000");
  });

  it("detects deductible decrease as favorable to member", () => {
    // Policy 2 has 10,000; Policy 3 has 0
    const result = comparePolicies(POLICY_002, POLICY_003);
    const deductibleDiff = result.fieldDifferences.find((f) => f.field === "deductible");

    expect(deductibleDiff).toBeDefined();
    expect(deductibleDiff?.changeType).toBe("decreased");
    expect(deductibleDiff?.financialImpact).toBe("favorable_to_member");
    expect(deductibleDiff?.targetValue).toBe(0);
  });

  it("detects co-payment changes accurately", () => {
    // Policy 1 (10%) to Policy 2 (20%): increased
    const result1 = comparePolicies(POLICY_001, POLICY_002);
    const copay1 = result1.fieldDifferences.find((f) => f.field === "coPaymentPercent");
    expect(copay1?.changeType).toBe("increased");
    expect(copay1?.financialImpact).toBe("unfavorable_to_member");

    // Policy 2 (20%) to Policy 3 (5%): decreased
    const result2 = comparePolicies(POLICY_002, POLICY_003);
    const copay2 = result2.fieldDifferences.find((f) => f.field === "coPaymentPercent");
    expect(copay2?.changeType).toBe("decreased");
    expect(copay2?.financialImpact).toBe("favorable_to_member");
  });

  it("detects waiting period differences", () => {
    // Policy 1 (30 days) to Policy 2 (90 days): increased
    const result = comparePolicies(POLICY_001, POLICY_002);
    const waitDiff = result.fieldDifferences.find((f) => f.field === "waitingPeriodDays");
    expect(waitDiff?.changeType).toBe("increased");
    expect(waitDiff?.financialImpact).toBe("unfavorable_to_member");
  });

  it("detects coverage limit increase as favorable to member", () => {
    // Policy 1 (500,000) to Policy 3 (1,000,000): increased
    const result = comparePolicies(POLICY_001, POLICY_003);
    const limitDiff = result.fieldDifferences.find((f) => f.field === "coverageLimit");
    expect(limitDiff?.changeType).toBe("increased");
    expect(limitDiff?.financialImpact).toBe("favorable_to_member");
  });

  it("handles sublimit additions, removals, and modifications", () => {
    // Policy 1 has ICU (150,000) and Maternity (75,000). Policy 2 has Outpatient (20,000).
    const result = comparePolicies(POLICY_001, POLICY_002);

    const icu = result.sublimitDifferences.find((s) => s.category.toLowerCase() === "icu");
    expect(icu).toBeDefined();
    expect(icu?.changeType).toBe("removed");
    expect(icu?.financialImpact).toBe("favorable_to_member");

    const outpatient = result.sublimitDifferences.find((s) => s.category.toLowerCase() === "outpatient");
    expect(outpatient).toBeDefined();
    expect(outpatient?.changeType).toBe("added");
    expect(outpatient?.financialImpact).toBe("unfavorable_to_member");

    // Compare Policy 1 to Policy 3 (ICU 150,000 -> 400,000)
    const result1to3 = comparePolicies(POLICY_001, POLICY_003);
    const icu1to3 = result1to3.sublimitDifferences.find((s) => s.category.toLowerCase() === "icu");
    expect(icu1to3?.changeType).toBe("increased");
    expect(icu1to3?.financialImpact).toBe("favorable_to_member");
  });

  it("tracks added and removed exclusions", () => {
    // Policy 1 has ["Cosmetic Surgery", "Dental", "Eyeglasses"]
    // Policy 2 has ["Pre-existing Conditions", "Dental", "Cosmetic Surgery"]
    const result = comparePolicies(POLICY_001, POLICY_002);
    expect(result.exclusionDifferences.added).toContain("Pre-existing Conditions");
    expect(result.exclusionDifferences.removed).toContain("Eyeglasses");
    expect(result.exclusionDifferences.retained).toContain("Dental");
  });

  it("tracks added and removed required documents", () => {
    // Policy 1: ["Hospital Discharge Summary", "Doctor Prescription", "Itemized Medical Bill"]
    // Policy 2: ["Hospital Discharge Summary", "Itemized Medical Bill", "Policy ID Card"]
    const result = comparePolicies(POLICY_001, POLICY_002);
    expect(result.requiredDocumentDifferences.added).toContain("Policy ID Card");
    expect(result.requiredDocumentDifferences.removed).toContain("Doctor Prescription");
  });

  it("reports not_specified when premium is not present", () => {
    const result = comparePolicies(POLICY_001, POLICY_002);
    const premiumDiff = result.fieldDifferences.find((f) => f.field === "premium");
    expect(premiumDiff?.changeType).toBe("not_specified");
    expect(premiumDiff?.financialImpact).toBe("unknown");
  });

  it("compares premium when explicitly provided on custom policies", () => {
    const customBaseline: Policy = {
      ...POLICY_001,
      premium: 15_000,
    };
    const customTarget: Policy = {
      ...POLICY_001,
      version: "1.1",
      premium: 18_000,
    };

    const result = comparePolicies(customBaseline, customTarget);
    const premiumDiff = result.fieldDifferences.find((f) => f.field === "premium");
    expect(premiumDiff?.changeType).toBe("increased");
    expect(premiumDiff?.financialImpact).toBe("unfavorable_to_member");
  });

  it("marks isComparable=false and lists reasons when policy is missing or lacks effective date", () => {
    const incompletePolicy: Partial<Policy> = {
      policyId: "INC-001",
      // missing effectiveDate
    };

    const result = comparePolicies(incompletePolicy, POLICY_001);
    expect(result.isComparable).toBe(false);
    expect(result.insufficientDataReasons.length).toBeGreaterThan(0);
    expect(result.insufficientDataReasons[0]).toContain("effectiveDate");
  });

  it("returns insufficient-data result when policies are undefined", () => {
    const result = comparePolicies(undefined, undefined);
    expect(result.isComparable).toBe(false);
    expect(result.insufficientDataReasons).toContain("Baseline policy was not provided.");
    expect(result.insufficientDataReasons).toContain("Target policy was not provided.");
  });
});
