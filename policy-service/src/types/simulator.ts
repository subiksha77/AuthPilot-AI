/**
 * What-If Simulator types for AuthPilot AI policy-service.
 *
 * Transparent simulations for what-if scenarios (admission date shift,
 * document additions/removals, policy comparison, bill amount changes).
 * ALL RESULTS ARE STRICT ESTIMATES ONLY.
 */

import type { Claim } from "./claim.js";
import type { Policy } from "./policy.js";
import type { EvaluationReport, RuleStatus } from "./evaluation.js";
import type { EstimationResult } from "./estimation.js";

export interface SimulationModifications {
  /** Hypothetical date of admission or medical service (ISO YYYY-MM-DD). */
  hypotheticalServiceDate?: string | null;

  /** Additional documents physically supplied in this scenario. */
  addDocuments?: string[];

  /** Documents removed from the supplied checklist in this scenario. */
  removeDocuments?: string[];

  /** Full override of supplied documents checklist. */
  overrideSuppliedDocuments?: string[];

  /** Alternate policy ID to simulate coverage against. */
  alternatePolicyId?: string;

  /** Alternate policy full object to simulate coverage against. */
  alternatePolicy?: Policy;

  /** Hypothetical total hospital bill amount in INR. */
  hypotheticalHospitalBillAmount?: number;

  /** Hypothetical covered expense portion in INR. */
  hypotheticalCoveredExpenseAmount?: number;
}

export interface SimulationRequest {
  claimId?: string;
  policyId?: string;
  claim?: Claim;
  policy?: Policy;
  modifications: SimulationModifications;
}

export interface RuleStatusDifference {
  ruleId: string;
  ruleDescription: string;
  baselineStatus: RuleStatus;
  scenarioStatus: RuleStatus;
  changed: boolean;
  explanation: string;
}

export interface FinancialDifferenceSummary {
  baselineInsurerPortion: number | null;
  scenarioInsurerPortion: number | null;
  insurerPortionDelta: number | null;

  baselinePatientPortion: number | null;
  scenarioPatientPortion: number | null;
  patientPortionDelta: number | null;

  baselineEligibleAmount: number | null;
  scenarioEligibleAmount: number | null;
  eligibleAmountDelta: number | null;

  financialSummaryExplanation: string;
}

export interface DocumentDifferenceSummary {
  baselineDocuments: string[];
  scenarioDocuments: string[];
  addedDocuments: string[];
  removedDocuments: string[];
  newlySatisfiedRequirements: string[];
  newlyUnsatisfiedRequirements: string[];
}

export interface SimulationDifferenceSummary {
  overallStatusChange: {
    baseline: RuleStatus;
    scenario: RuleStatus;
    changed: boolean;
    transitionDescription: string;
  };
  ruleStatusChanges: RuleStatusDifference[];
  financialDelta: FinancialDifferenceSummary;
  documentChanges: DocumentDifferenceSummary;
}

export interface SimulationResult {
  simulationId: string;
  simulatedAt: string;
  scenariosApplied: string[];
  baseline: {
    claim: Claim;
    policy: Policy;
    evaluationReport: EvaluationReport;
    coverageEstimation: EstimationResult;
  };
  scenario: {
    claim: Claim;
    policy: Policy;
    evaluationReport: EvaluationReport;
    coverageEstimation: EstimationResult;
  };
  differenceSummary: SimulationDifferenceSummary;
  assumptions: string[];
  missingInformation: string[];
  notice: string;
  disclaimer: "ESTIMATE_ONLY";
}
