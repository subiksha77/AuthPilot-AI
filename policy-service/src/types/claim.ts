/**
 * Claim type definitions for AuthPilot AI policy-service.
 * Uses synthetic identifiers only.
 */

/** Evidence reference from the document-processing service (Member 2). */
export interface EvidenceRef {
  documentId: string;
  sourcePage: number | null;
  fieldName: string;
  excerpt: string | null;
  confidence: number | null;
}

/** Represents a single extracted field that may or may not be known. */
export interface ExtractedField {
  value: string | number | null;    // null = not found in supplied documents
  sourceRef: EvidenceRef | null;
  status: "extracted" | "missing" | "uncertain";
}

export interface Claim {
  claimId: string;
  policyId: string;
  policyVersion: string;

  /** Date of hospital admission or service rendered — ISO YYYY-MM-DD. */
  serviceDate: string | null;

  /** Total amount on the hospital bill (INR). null = unknown. */
  hospitalBillAmount: number | null;

  /** Amount the policy may cover, derived from extraction. null = unknown. */
  coveredExpenseAmount: number | null;

  /** Claim category — e.g., "Inpatient", "Outpatient", "ICU", "Maternity". */
  claimCategory: string;

  /** Documents physically supplied by the claimant at submission. */
  suppliedDocuments: string[];

  /**
   * Verified prior utilization of the policy limit this year.
   * null = data unavailable; never substitute 0 for an unknown amount.
   */
  priorUtilizationAmount: number | null;

  /** Structured extracted fields from Member 2 document service, if integrated. */
  extractedFields?: Record<string, ExtractedField>;

  /** Free-form clinical notes from admitting documents, if available. */
  clinicalNotes?: string;

  _syntheticDemo: true;
}
