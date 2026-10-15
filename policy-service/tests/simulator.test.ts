/**
 * AuthPilot AI — What-If Simulator Tests
 *
 * Verifies simulation scenarios (date shifting, document updates, policy swaps, bill amount variations),
 * non-mutation of baseline objects, delta calculations, and robust input validation.
 */

import { describe, it, expect } from "vitest";
import { simulateScenario, SimulationValidationError } from "../src/simulator/simulator.js";
import { SYNTHETIC_POLICIES } from "../src/data/syntheticPolicies.js";
import { SYNTHETIC_CLAIMS } from "../src/data/syntheticClaims.js";
import type { Claim } from "../src/types/claim.js";
import type { Policy } from "../src/types/policy.js";

const POLICY_001 = SYNTHETIC_POLICIES[0]!; // Comprehensive, 30-day wait, 500k limit
const POLICY_002 = SYNTHETIC_POLICIES[1]!; // Basic, 90-day wait, 200k limit
const POLICY_003 = SYNTHETIC_POLICIES[2]!; // Premium Plus, 0 wait, 1M limit

const CLAIM_HAPPY = SYNTHETIC_CLAIMS[0]!;   // DEMO-CLM-001 (Happy path)
const CLAIM_WAITING = SYNTHETIC_CLAIMS[4]!; // DEMO-CLM-005 (Waiting period issue)
const CLAIM_MISSING = SYNTHETIC_CLAIMS[2]!; // DEMO-CLM-003 (Missing service date & covered amount)

describe("What-If Simulator — simulateScenario", () => {
  it("simulates shifting service date to satisfy waiting period", () => {
    // CLAIM_WAITING has serviceDate 2025-04-20 with POLICY_002 effective 2025-04-01 (19 days < 90 days wait)
    // Shift serviceDate to 2025-07-15 (105 days > 90 days wait)
    const result = simulateScenario(CLAIM_WAITING, POLICY_002, {
      hypotheticalServiceDate: "2025-07-15",
    });

    expect(result.disclaimer).toBe("ESTIMATE_ONLY");
    expect(result.baseline.claim.serviceDate).toBe("2025-04-20");
    expect(result.scenario.claim.serviceDate).toBe("2025-07-15");

    // Baseline R03 waiting period should be FAIL/REVIEW_REQUIRED, scenario should be PASS
    const bWaiting = result.baseline.evaluationReport.ruleResults.find(
      (r) => r.ruleId === "R03_WAITING_PERIOD"
    );
    const sWaiting = result.scenario.evaluationReport.ruleResults.find(
      (r) => r.ruleId === "R03_WAITING_PERIOD"
    );

    expect(bWaiting?.status).toBe("FAIL");
    expect(sWaiting?.status).toBe("PASS");

    const diffWaiting = result.differenceSummary.ruleStatusChanges.find(
      (r) => r.ruleId === "R03_WAITING_PERIOD"
    );
    expect(diffWaiting?.changed).toBe(true);
    expect(diffWaiting?.baselineStatus).toBe("FAIL");
    expect(diffWaiting?.scenarioStatus).toBe("PASS");
  });

  it("simulates adding a missing required document", () => {
    // CLAIM_WAITING has ["Hospital Discharge Summary", "Itemized Medical Bill", "Policy ID Card"]
    // Let's take CLAIM_HAPPY which is evaluated against POLICY_002.
    // POLICY_002 requires ["Hospital Discharge Summary", "Itemized Medical Bill", "Policy ID Card"].
    // CLAIM_HAPPY has ["Hospital Discharge Summary", "Doctor Prescription", "Itemized Medical Bill"] (lacks Policy ID Card).
    const result = simulateScenario(CLAIM_HAPPY, POLICY_002, {
      addDocuments: ["Policy ID Card"],
    });

    expect(result.baseline.claim.suppliedDocuments).not.toContain("Policy ID Card");
    expect(result.scenario.claim.suppliedDocuments).toContain("Policy ID Card");

    const bDocs = result.baseline.evaluationReport.ruleResults.find(
      (r) => r.ruleId === "R07_REQUIRED_DOCUMENTS"
    );
    const sDocs = result.scenario.evaluationReport.ruleResults.find(
      (r) => r.ruleId === "R07_REQUIRED_DOCUMENTS"
    );

    expect(bDocs?.status).toBe("REVIEW_REQUIRED");
    expect(sDocs?.status).toBe("PASS");
    expect(result.differenceSummary.documentChanges.newlySatisfiedRequirements.length).toBeGreaterThan(0);
  });

  it("simulates removing documents and observes document requirement change", () => {
    const result = simulateScenario(CLAIM_HAPPY, POLICY_001, {
      removeDocuments: ["Doctor Prescription"],
    });

    expect(result.baseline.claim.suppliedDocuments).toContain("Doctor Prescription");
    expect(result.scenario.claim.suppliedDocuments).not.toContain("Doctor Prescription");

    const sDocs = result.scenario.evaluationReport.ruleResults.find(
      (r) => r.ruleId === "R07_REQUIRED_DOCUMENTS"
    );
    expect(sDocs?.status).toBe("REVIEW_REQUIRED");
    expect(result.differenceSummary.documentChanges.newlyUnsatisfiedRequirements.length).toBeGreaterThan(0);
  });

  it("simulates varying bill amounts and calculates financial deltas", () => {
    // Baseline: hospitalBillAmount = 80,000, coveredExpenseAmount = 75,000
    // Hypothetical: bill = 120,000, covered = 110,000
    const result = simulateScenario(CLAIM_HAPPY, POLICY_001, {
      hypotheticalHospitalBillAmount: 120_000,
      hypotheticalCoveredExpenseAmount: 110_000,
    });

    expect(result.differenceSummary.financialDelta.baselineInsurerPortion).not.toBeNull();
    expect(result.differenceSummary.financialDelta.scenarioInsurerPortion).not.toBeNull();
    expect(result.differenceSummary.financialDelta.insurerPortionDelta).toBeGreaterThan(0);
    expect(result.differenceSummary.financialDelta.financialSummaryExplanation).toContain("Insurer portion increased");
  });

  it("simulates alternate policy switch", () => {
    // Simulate CLAIM_HAPPY under POLICY_003 instead of POLICY_001
    const result = simulateScenario(
      CLAIM_HAPPY,
      POLICY_001,
      { alternatePolicyId: "DEMO-POL-003" },
      POLICY_003
    );

    expect(result.baseline.policy.policyId).toBe("DEMO-POL-001");
    expect(result.scenario.policy.policyId).toBe("DEMO-POL-003");
    // Under POLICY_003, deductible is 0 (vs 5000 in POL-001) and copay is 5% (vs 10% in POL-001)
    // Patient portion should be lower in scenario
    expect(result.differenceSummary.financialDelta.scenarioPatientPortion!).toBeLessThan(
      result.differenceSummary.financialDelta.baselinePatientPortion!
    );
  });

  it("STRICT IMMUTABILITY: never mutates original claim or policy inputs", () => {
    const originalClaim: Claim = JSON.parse(JSON.stringify(CLAIM_HAPPY));
    const originalPolicy: Policy = JSON.parse(JSON.stringify(POLICY_001));

    simulateScenario(originalClaim, originalPolicy, {
      hypotheticalServiceDate: "2030-01-01",
      addDocuments: ["New Unknown Document"],
      removeDocuments: ["Hospital Discharge Summary"],
      hypotheticalHospitalBillAmount: 999_999,
      hypotheticalCoveredExpenseAmount: 888_888,
    });

    // Verify originalClaim is untouched
    expect(originalClaim.serviceDate).toBe(CLAIM_HAPPY.serviceDate);
    expect(originalClaim.suppliedDocuments).toEqual(CLAIM_HAPPY.suppliedDocuments);
    expect(originalClaim.hospitalBillAmount).toBe(CLAIM_HAPPY.hospitalBillAmount);
    expect(originalClaim.coveredExpenseAmount).toBe(CLAIM_HAPPY.coveredExpenseAmount);

    // Verify originalPolicy is untouched
    expect(originalPolicy.deductible).toBe(POLICY_001.deductible);
    expect(originalPolicy.coverageLimit).toBe(POLICY_001.coverageLimit);
  });

  it("rejects invalid date format with SimulationValidationError", () => {
    expect(() =>
      simulateScenario(CLAIM_HAPPY, POLICY_001, {
        hypotheticalServiceDate: "not-a-date",
      })
    ).toThrow(SimulationValidationError);

    expect(() =>
      simulateScenario(CLAIM_HAPPY, POLICY_001, {
        hypotheticalServiceDate: "2025-13-45",
      })
    ).toThrow(SimulationValidationError);
  });

  it("rejects negative bill amounts with SimulationValidationError", () => {
    expect(() =>
      simulateScenario(CLAIM_HAPPY, POLICY_001, {
        hypotheticalHospitalBillAmount: -500,
      })
    ).toThrow(SimulationValidationError);

    expect(() =>
      simulateScenario(CLAIM_HAPPY, POLICY_001, {
        hypotheticalCoveredExpenseAmount: -100,
      })
    ).toThrow(SimulationValidationError);
  });

  it("rejects when covered expense exceeds total bill", () => {
    expect(() =>
      simulateScenario(CLAIM_HAPPY, POLICY_001, {
        hypotheticalHospitalBillAmount: 50_000,
        hypotheticalCoveredExpenseAmount: 80_000,
      })
    ).toThrow(SimulationValidationError);
  });
});
