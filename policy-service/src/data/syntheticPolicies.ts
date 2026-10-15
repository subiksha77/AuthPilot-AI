/**
 * AuthPilot AI — Synthetic Demo Policies
 *
 * ALL POLICIES BELOW ARE SYNTHETIC DATA CREATED FOR DEMO PURPOSES ONLY.
 * These do NOT represent actual products, terms, or guidelines from any insurer.
 * _syntheticDemo: true is required on every entry.
 */

import type { Policy } from "../types/policy.js";

export const SYNTHETIC_POLICIES: Policy[] = [
  {
    policyId: "DEMO-POL-001",
    version: "1.0",
    policyName: "DemoShield Comprehensive Plan",
    insurerName: "DemoShield Insurance Co. (Synthetic)",
    effectiveDate: "2025-01-01",
    expiryDate: "2025-12-31",
    waitingPeriodDays: 30,
    coverageLimit: 500_000,
    sublimits: [
      { category: "ICU", limitAmount: 150_000 },
      { category: "Maternity", limitAmount: 75_000 },
    ],
    deductible: 5_000,
    coPaymentPercent: 10,
    exclusions: ["Cosmetic Surgery", "Dental", "Eyeglasses"],
    requiredDocuments: [
      "Hospital Discharge Summary",
      "Doctor Prescription",
      "Itemized Medical Bill",
    ],
    createdAt: "2025-01-01T00:00:00.000Z",
    _syntheticDemo: true,
  },
  {
    policyId: "DEMO-POL-002",
    version: "1.0",
    policyName: "DemoShield Basic Plan",
    insurerName: "DemoShield Insurance Co. (Synthetic)",
    effectiveDate: "2025-04-01",
    expiryDate: "2026-03-31",
    waitingPeriodDays: 90,
    coverageLimit: 200_000,
    sublimits: [
      { category: "Outpatient", limitAmount: 20_000 },
    ],
    deductible: 10_000,
    coPaymentPercent: 20,
    exclusions: ["Pre-existing Conditions", "Dental", "Cosmetic Surgery"],
    requiredDocuments: [
      "Hospital Discharge Summary",
      "Itemized Medical Bill",
      "Policy ID Card",
    ],
    createdAt: "2025-04-01T00:00:00.000Z",
    _syntheticDemo: true,
  },
  {
    policyId: "DEMO-POL-003",
    version: "2.0",
    policyName: "DemoShield Premium Plus",
    insurerName: "DemoShield Insurance Co. (Synthetic)",
    effectiveDate: "2024-06-01",
    expiryDate: "2025-05-31",
    waitingPeriodDays: 0,
    coverageLimit: 1_000_000,
    sublimits: [
      { category: "ICU", limitAmount: 400_000 },
      { category: "Maternity", limitAmount: 150_000 },
      { category: "Outpatient", limitAmount: 50_000 },
    ],
    deductible: 0,
    coPaymentPercent: 5,
    exclusions: ["Cosmetic Surgery"],
    requiredDocuments: [
      "Hospital Discharge Summary",
      "Doctor Prescription",
      "Itemized Medical Bill",
      "Lab Reports",
    ],
    createdAt: "2024-06-01T00:00:00.000Z",
    _syntheticDemo: true,
  },
];

/** Retrieve a demo policy by ID. Returns undefined if not found. */
export function getPolicyById(policyId: string): Policy | undefined {
  return SYNTHETIC_POLICIES.find((p) => p.policyId === policyId);
}
