/**
 * Policy Radar types for AuthPilot AI policy-service.
 *
 * Separates factual field differences from estimated financial impact.
 * All results are strictly informational and do NOT constitute a guarantee of coverage.
 */

export type FieldChangeType =
  | "increased"
  | "decreased"
  | "added"
  | "removed"
  | "changed"
  | "unchanged"
  | "not_specified";

export type FinancialImpactDirection =
  | "favorable_to_member"
  | "unfavorable_to_member"
  | "neutral"
  | "unknown";

export interface FieldDifference {
  field: string;
  fieldLabel: string;
  baselineValue: unknown;
  targetValue: unknown;
  changeType: FieldChangeType;
  factualDifference: string;
  financialImpact: FinancialImpactDirection;
  financialImpactExplanation: string;
}

export interface SublimitDifference {
  category: string;
  baselineLimit: number | null;
  targetLimit: number | null;
  changeType: "added" | "removed" | "increased" | "decreased" | "unchanged";
  factualDifference: string;
  financialImpact: FinancialImpactDirection;
}

export interface ListDifference {
  field: "exclusions" | "requiredDocuments";
  fieldLabel: string;
  added: string[];
  removed: string[];
  retained: string[];
  factualDifference: string;
  financialImpact: FinancialImpactDirection;
}

export interface PolicyVersionSummary {
  policyId: string;
  version: string;
  policyName: string;
  insurerName: string;
  effectiveDate: string | null;
  expiryDate: string | null;
  isDateKnown: boolean;
}

export interface PolicyComparisonResult {
  comparisonId: string;
  comparedAt: string;
  baselinePolicy: PolicyVersionSummary;
  targetPolicy: PolicyVersionSummary;
  isComparable: boolean;
  insufficientDataReasons: string[];
  fieldDifferences: FieldDifference[];
  sublimitDifferences: SublimitDifference[];
  exclusionDifferences: ListDifference;
  requiredDocumentDifferences: ListDifference;
  applicabilityNotice: string;
  disclaimer: "INFORMATIONAL_ONLY_NOT_A_GUARANTEE_OF_COVERAGE";
}
