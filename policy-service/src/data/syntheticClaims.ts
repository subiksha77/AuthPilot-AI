/**
 * AuthPilot AI — Synthetic Demo Claims
 *
 * ALL CLAIMS BELOW ARE SYNTHETIC DATA CREATED FOR DEMO/TESTING PURPOSES ONLY.
 * No real patient data is included. _syntheticDemo: true is required.
 */

import type { Claim } from "../types/claim.js";

export const SYNTHETIC_CLAIMS: Claim[] = [
  {
    // Happy path — all data present, well within limits
    claimId: "DEMO-CLM-001",
    policyId: "DEMO-POL-001",
    policyVersion: "1.0",
    serviceDate: "2025-06-15",
    hospitalBillAmount: 80_000,
    coveredExpenseAmount: 75_000,
    claimCategory: "Inpatient",
    suppliedDocuments: [
      "Hospital Discharge Summary",
      "Doctor Prescription",
      "Itemized Medical Bill",
    ],
    priorUtilizationAmount: 50_000,
    clinicalNotes: "Patient admitted for appendectomy. Recovery uneventful.",
    _syntheticDemo: true,
  },
  {
    // ICU sublimit scenario — covered expense exceeds sublimit
    claimId: "DEMO-CLM-002",
    policyId: "DEMO-POL-001",
    policyVersion: "1.0",
    serviceDate: "2025-03-10",
    hospitalBillAmount: 200_000,
    coveredExpenseAmount: 180_000,
    claimCategory: "ICU",
    suppliedDocuments: [
      "Hospital Discharge Summary",
      "Itemized Medical Bill",
    ],
    priorUtilizationAmount: 0,
    clinicalNotes: "ICU admission following cardiac event.",
    _syntheticDemo: true,
  },
  {
    // Missing data scenario — no service date, no prior utilization
    claimId: "DEMO-CLM-003",
    policyId: "DEMO-POL-002",
    policyVersion: "1.0",
    serviceDate: null,
    hospitalBillAmount: 45_000,
    coveredExpenseAmount: null,
    claimCategory: "Inpatient",
    suppliedDocuments: [
      "Itemized Medical Bill",
    ],
    priorUtilizationAmount: null,
    _syntheticDemo: true,
  },
  {
    // Exclusion match — Cosmetic Surgery
    claimId: "DEMO-CLM-004",
    policyId: "DEMO-POL-001",
    policyVersion: "1.0",
    serviceDate: "2025-08-20",
    hospitalBillAmount: 30_000,
    coveredExpenseAmount: 30_000,
    claimCategory: "Cosmetic Surgery",
    suppliedDocuments: [
      "Hospital Discharge Summary",
      "Doctor Prescription",
      "Itemized Medical Bill",
    ],
    priorUtilizationAmount: 10_000,
    clinicalNotes: "Elective rhinoplasty procedure.",
    _syntheticDemo: true,
  },
  {
    // Waiting period not yet elapsed (policy started 2025-04-01, service 2025-04-20 = 19 days < 90)
    claimId: "DEMO-CLM-005",
    policyId: "DEMO-POL-002",
    policyVersion: "1.0",
    serviceDate: "2025-04-20",
    hospitalBillAmount: 15_000,
    coveredExpenseAmount: 14_000,
    claimCategory: "Outpatient",
    suppliedDocuments: [
      "Hospital Discharge Summary",
      "Itemized Medical Bill",
      "Policy ID Card",
    ],
    priorUtilizationAmount: 0,
    clinicalNotes: "Outpatient consultation and lab tests.",
    _syntheticDemo: true,
  },
  {
    // Premium Plus — large claim, no deductible, all docs
    claimId: "DEMO-CLM-006",
    policyId: "DEMO-POL-003",
    policyVersion: "2.0",
    serviceDate: "2025-02-01",
    hospitalBillAmount: 350_000,
    coveredExpenseAmount: 340_000,
    claimCategory: "ICU",
    suppliedDocuments: [
      "Hospital Discharge Summary",
      "Doctor Prescription",
      "Itemized Medical Bill",
      "Lab Reports",
    ],
    priorUtilizationAmount: 200_000,
    clinicalNotes: "Extended ICU stay. Multiple specialist consultations.",
    _syntheticDemo: true,
  },
];

export function getClaimById(claimId: string): Claim | undefined {
  return SYNTHETIC_CLAIMS.find((c) => c.claimId === claimId);
}
