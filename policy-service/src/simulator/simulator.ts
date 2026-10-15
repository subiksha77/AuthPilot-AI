/**
 * AuthPilot AI — What-If Simulator Module
 *
 * Runs hypothetical scenarios (admission date shift, document checklist changes,
 * alternative policies, bill amount variations) using the existing deterministic
 * rules engine and coverage estimator.
 *
 * All simulations run on deep-copied objects and NEVER mutate baseline data.
 * All results are ESTIMATE_ONLY.
 */

import type { Claim } from "../types/claim.js";
import type { Policy } from "../types/policy.js";
import type {
  SimulationModifications,
  SimulationResult,
  SimulationDifferenceSummary,
  RuleStatusDifference,
  FinancialDifferenceSummary,
  DocumentDifferenceSummary,
} from "../types/simulator.js";
import { evaluateClaim } from "../rules/engine.js";
import { estimateCoverage } from "../estimator/coverageCalculator.js";

export class SimulationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SimulationValidationError";
  }
}

function isValidIsoDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = parseInt(yearStr!, 10);
  const month = parseInt(monthStr!, 10);
  const day = parseInt(dayStr!, 10);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  const parsed = new Date(`${dateStr}T00:00:00.000Z`);
  return (
    !isNaN(parsed.getTime()) &&
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day
  );
}

export function validateSimulationModifications(modifications: SimulationModifications): void {
  if (!modifications || typeof modifications !== "object") {
    throw new SimulationValidationError("Simulation modifications object must be provided.");
  }

  // Validate hypotheticalServiceDate
  if (modifications.hypotheticalServiceDate !== undefined && modifications.hypotheticalServiceDate !== null) {
    if (typeof modifications.hypotheticalServiceDate !== "string" || !isValidIsoDate(modifications.hypotheticalServiceDate)) {
      throw new SimulationValidationError(
        `Invalid hypotheticalServiceDate: "${modifications.hypotheticalServiceDate}". Must be a valid ISO YYYY-MM-DD date.`
      );
    }
  }

  // Validate bill amounts
  if (modifications.hypotheticalHospitalBillAmount !== undefined) {
    if (
      typeof modifications.hypotheticalHospitalBillAmount !== "number" ||
      isNaN(modifications.hypotheticalHospitalBillAmount) ||
      modifications.hypotheticalHospitalBillAmount < 0
    ) {
      throw new SimulationValidationError(
        `Invalid hypotheticalHospitalBillAmount: ${modifications.hypotheticalHospitalBillAmount}. Amount must be a non-negative number.`
      );
    }
  }

  if (modifications.hypotheticalCoveredExpenseAmount !== undefined) {
    if (
      typeof modifications.hypotheticalCoveredExpenseAmount !== "number" ||
      isNaN(modifications.hypotheticalCoveredExpenseAmount) ||
      modifications.hypotheticalCoveredExpenseAmount < 0
    ) {
      throw new SimulationValidationError(
        `Invalid hypotheticalCoveredExpenseAmount: ${modifications.hypotheticalCoveredExpenseAmount}. Amount must be a non-negative number.`
      );
    }
  }

  // Logical consistency between bill and covered expense
  if (
    modifications.hypotheticalHospitalBillAmount !== undefined &&
    modifications.hypotheticalCoveredExpenseAmount !== undefined &&
    modifications.hypotheticalCoveredExpenseAmount > modifications.hypotheticalHospitalBillAmount
  ) {
    throw new SimulationValidationError(
      `Covered expense amount (INR ${modifications.hypotheticalCoveredExpenseAmount}) cannot exceed total hospital bill amount (INR ${modifications.hypotheticalHospitalBillAmount}).`
    );
  }

  // Validate alternatePolicy if supplied directly
  if (modifications.alternatePolicy) {
    const p = modifications.alternatePolicy;
    if (p.coPaymentPercent !== undefined && (p.coPaymentPercent < 0 || p.coPaymentPercent > 100)) {
      throw new SimulationValidationError(
        `Invalid alternate policy coPaymentPercent: ${p.coPaymentPercent}. Must be 0–100.`
      );
    }
    if (p.deductible !== undefined && p.deductible < 0) {
      throw new SimulationValidationError(
        `Invalid alternate policy deductible: ${p.deductible}. Must be >= 0.`
      );
    }
  }
}

export function simulateScenario(
  baselineClaimInput: Claim,
  baselinePolicyInput: Policy,
  modifications: SimulationModifications,
  alternatePolicyResolved?: Policy
): SimulationResult {
  // 1. Validation
  if (!baselineClaimInput) {
    throw new SimulationValidationError("Baseline claim is required for simulation.");
  }
  if (!baselinePolicyInput) {
    throw new SimulationValidationError("Baseline policy is required for simulation.");
  }
  validateSimulationModifications(modifications);

  // 2. Deep copy baseline inputs — guarantees NO MUTATION of original records
  const baselineClaim: Claim = structuredClone(baselineClaimInput);
  const baselinePolicy: Policy = structuredClone(baselinePolicyInput);

  const scenarioClaim: Claim = structuredClone(baselineClaimInput);
  let scenarioPolicy: Policy = structuredClone(
    alternatePolicyResolved ?? modifications.alternatePolicy ?? baselinePolicyInput
  );

  const scenariosApplied: string[] = [];

  // 3. Apply hypothetical modifications to scenarioClaim and scenarioPolicy
  if (modifications.hypotheticalServiceDate !== undefined) {
    scenarioClaim.serviceDate = modifications.hypotheticalServiceDate;
    scenariosApplied.push(
      `Service/Admission date shifted to ${modifications.hypotheticalServiceDate ?? "null"}.`
    );
  }

  if (modifications.overrideSuppliedDocuments) {
    scenarioClaim.suppliedDocuments = [...modifications.overrideSuppliedDocuments];
    scenariosApplied.push(
      `Document checklist overridden with ${modifications.overrideSuppliedDocuments.length} document(s).`
    );
  } else {
    let docs = [...scenarioClaim.suppliedDocuments];
    if (modifications.addDocuments && modifications.addDocuments.length > 0) {
      for (const d of modifications.addDocuments) {
        if (!docs.some((existing) => existing.toLowerCase() === d.toLowerCase())) {
          docs.push(d);
        }
      }
      scenariosApplied.push(`Added documents: [${modifications.addDocuments.join(", ")}].`);
    }

    if (modifications.removeDocuments && modifications.removeDocuments.length > 0) {
      const toRemoveLower = modifications.removeDocuments.map((d) => d.toLowerCase());
      docs = docs.filter((d) => !toRemoveLower.includes(d.toLowerCase()));
      scenariosApplied.push(`Removed documents: [${modifications.removeDocuments.join(", ")}].`);
    }
    scenarioClaim.suppliedDocuments = docs;
  }

  if (modifications.hypotheticalHospitalBillAmount !== undefined) {
    scenarioClaim.hospitalBillAmount = modifications.hypotheticalHospitalBillAmount;
    scenariosApplied.push(
      `Hypothetical hospital bill set to INR ${modifications.hypotheticalHospitalBillAmount.toLocaleString()}.`
    );
  }

  if (modifications.hypotheticalCoveredExpenseAmount !== undefined) {
    scenarioClaim.coveredExpenseAmount = modifications.hypotheticalCoveredExpenseAmount;
    scenariosApplied.push(
      `Hypothetical covered expense set to INR ${modifications.hypotheticalCoveredExpenseAmount.toLocaleString()}.`
    );
  }

  if (modifications.alternatePolicy || alternatePolicyResolved) {
    scenariosApplied.push(
      `Simulated against alternate policy "${scenarioPolicy.policyId}" (v${scenarioPolicy.version}).`
    );
  }

  // 4. Run rules evaluation and coverage estimation for both baseline and scenario
  const baselineEval = evaluateClaim(baselineClaim, baselinePolicy);
  const baselineEst = estimateCoverage(baselineClaim, baselinePolicy);

  const scenarioEval = evaluateClaim(scenarioClaim, scenarioPolicy);
  const scenarioEst = estimateCoverage(scenarioClaim, scenarioPolicy);

  // 5. Compute differences
  const ruleStatusChanges: RuleStatusDifference[] = baselineEval.ruleResults.map((bRule) => {
    const sRule = scenarioEval.ruleResults.find((r) => r.ruleId === bRule.ruleId);
    const sStatus = sRule?.status ?? "INSUFFICIENT_DATA";
    const changed = bRule.status !== sStatus;
    let explanation = `Status unchanged (${bRule.status}).`;

    if (changed) {
      explanation = `Status changed from ${bRule.status} to ${sStatus}. ${sRule?.explanation ?? ""}`;
    }

    return {
      ruleId: bRule.ruleId,
      ruleDescription: bRule.description,
      baselineStatus: bRule.status,
      scenarioStatus: sStatus,
      changed,
      explanation,
    };
  });

  const overallStatusChanged = baselineEval.overallStatus !== scenarioEval.overallStatus;
  const overallStatusTransition = overallStatusChanged
    ? `Overall assessment status changed from ${baselineEval.overallStatus} to ${scenarioEval.overallStatus}.`
    : `Overall assessment status remained ${baselineEval.overallStatus}.`;

  // Financial deltas
  const bInsurer = baselineEst.breakdown.estimatedInsurerPortion;
  const sInsurer = scenarioEst.breakdown.estimatedInsurerPortion;
  const insurerDelta =
    bInsurer !== null && sInsurer !== null ? parseFloat((sInsurer - bInsurer).toFixed(2)) : null;

  const bPatient = baselineEst.breakdown.estimatedPatientPortion;
  const sPatient = scenarioEst.breakdown.estimatedPatientPortion;
  const patientDelta =
    bPatient !== null && sPatient !== null ? parseFloat((sPatient - bPatient).toFixed(2)) : null;

  const bEligible = baselineEst.breakdown.eligibleAmount;
  const sEligible = scenarioEst.breakdown.eligibleAmount;
  const eligibleDelta =
    bEligible !== null && sEligible !== null ? parseFloat((sEligible - bEligible).toFixed(2)) : null;

  let financialExplanation = "No financial changes observed between baseline and scenario.";
  if (insurerDelta !== null || patientDelta !== null) {
    const parts: string[] = [];
    if (insurerDelta !== null && insurerDelta !== 0) {
      parts.push(`Insurer portion ${insurerDelta > 0 ? "increased" : "decreased"} by INR ${Math.abs(insurerDelta).toLocaleString()}`);
    }
    if (patientDelta !== null && patientDelta !== 0) {
      parts.push(`Patient out-of-pocket ${patientDelta > 0 ? "increased" : "decreased"} by INR ${Math.abs(patientDelta).toLocaleString()}`);
    }
    financialExplanation = parts.length > 0 ? parts.join("; ") + "." : "Financial figures remained identical.";
  }

  const financialDelta: FinancialDifferenceSummary = {
    baselineInsurerPortion: bInsurer,
    scenarioInsurerPortion: sInsurer,
    insurerPortionDelta: insurerDelta,
    baselinePatientPortion: bPatient,
    scenarioPatientPortion: sPatient,
    patientPortionDelta: patientDelta,
    baselineEligibleAmount: bEligible,
    scenarioEligibleAmount: sEligible,
    eligibleAmountDelta: eligibleDelta,
    financialSummaryExplanation: financialExplanation,
  };

  // Document changes
  const bDocs = baselineClaim.suppliedDocuments;
  const sDocs = scenarioClaim.suppliedDocuments;
  const addedDocs = sDocs.filter((d) => !bDocs.some((b) => b.toLowerCase() === d.toLowerCase()));
  const removedDocs = bDocs.filter((d) => !sDocs.some((s) => s.toLowerCase() === d.toLowerCase()));

  const newlySatisfied: string[] = [];
  const newlyUnsatisfied: string[] = [];

  const bDocRule = baselineEval.ruleResults.find((r) => r.ruleId === "R07_REQUIRED_DOCUMENTS");
  const sDocRule = scenarioEval.ruleResults.find((r) => r.ruleId === "R07_REQUIRED_DOCUMENTS");

  if (bDocRule && sDocRule) {
    if (bDocRule.status !== "PASS" && sDocRule.status === "PASS") {
      newlySatisfied.push("R07_REQUIRED_DOCUMENTS (All mandatory policy documents now supplied)");
    } else if (bDocRule.status === "PASS" && sDocRule.status !== "PASS") {
      newlyUnsatisfied.push("R07_REQUIRED_DOCUMENTS (Mandatory document checklist is no longer satisfied)");
    }
  }

  const documentChanges: DocumentDifferenceSummary = {
    baselineDocuments: bDocs,
    scenarioDocuments: sDocs,
    addedDocuments: addedDocs,
    removedDocuments: removedDocs,
    newlySatisfiedRequirements: newlySatisfied,
    newlyUnsatisfiedRequirements: newlyUnsatisfied,
  };

  const differenceSummary: SimulationDifferenceSummary = {
    overallStatusChange: {
      baseline: baselineEval.overallStatus,
      scenario: scenarioEval.overallStatus,
      changed: overallStatusChanged,
      transitionDescription: overallStatusTransition,
    },
    ruleStatusChanges,
    financialDelta,
    documentChanges,
  };

  const assumptions = [
    ...scenarioEst.breakdown.calculationAssumptions,
    "Simulations are hypothetical analytical projections and assume verified validity of supplied inputs.",
  ];

  const missingInformation = [...scenarioEst.breakdown.missingDataFields];
  if (!scenarioClaim.serviceDate) {
    missingInformation.push("serviceDate");
  }

  const notice =
    "What-If simulator results are strictly hypothetical and provide ESTIMATE_ONLY projections. " +
    "They do NOT constitute pre-authorization, approval, or coverage guarantee. " +
    "Clinical facts and dates must never be misrepresented to alter coverage outcomes.";

  return {
    simulationId: `SIM-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    simulatedAt: new Date().toISOString(),
    scenariosApplied,
    baseline: {
      claim: baselineClaim,
      policy: baselinePolicy,
      evaluationReport: baselineEval,
      coverageEstimation: baselineEst,
    },
    scenario: {
      claim: scenarioClaim,
      policy: scenarioPolicy,
      evaluationReport: scenarioEval,
      coverageEstimation: scenarioEst,
    },
    differenceSummary,
    assumptions,
    missingInformation,
    notice,
    disclaimer: "ESTIMATE_ONLY",
  };
}
