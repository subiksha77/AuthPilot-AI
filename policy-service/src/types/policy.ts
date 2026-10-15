/**
 * Policy type definitions for AuthPilot AI policy-service.
 * All demo policies are synthetic and clearly labeled — not real insurer policy terms.
 */

export interface Sublimit {
  category: string;       // e.g. "ICU", "Maternity", "Outpatient"
  limitAmount: number;
}

export interface Policy {
  policyId: string;
  version: string;
  policyName: string;
  insurerName: string;            // Fictional demo insurer
  effectiveDate: string;          // ISO YYYY-MM-DD
  expiryDate: string;             // ISO YYYY-MM-DD
  waitingPeriodDays: number;      // Days from policy start before first claim is eligible
  coverageLimit: number;          // Maximum coverage per year in INR
  sublimits: Sublimit[];          // Category-specific sublimits
  deductible: number;             // Fixed amount member pays first
  coPaymentPercent: number;       // % of eligible amount borne by member (0–100)
  exclusions: string[];           // List of excluded conditions or services
  requiredDocuments: string[];    // Documents required to process any claim
  createdAt: string;              // ISO timestamp of policy record creation
  _syntheticDemo: true;           // Required marker — all policies here are demo data only
}
