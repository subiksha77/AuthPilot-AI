import type {
  DemoAccount,
  Company,
  Policy,
  Claim,
  Policyholder,
  UploadedDocument,
  ChecklistItem,
  AuditEvent,
  CriteriaEvaluation,
} from '../types';

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: 'u1',
    name: 'Dr. Sarah Chen',
    email: 'admin@generalmed.demo',
    role: 'admin',
    organization: 'General Medical Center (Hospital Admin - Read-Only)',
    description: 'Read-only hospital dashboard, partner policies, claims overview, and analytics.',
  },
  {
    id: 'u2',
    name: 'James Okafor',
    email: 'coordinator@generalmed.demo',
    role: 'coordinator',
    organization: 'General Medical Center (Hospital Prior-Auth Coordinator)',
    description: 'Find policies by company, upload verified clinical documents, and submit prior-authorisation claims.',
  },
  {
    id: 'u3',
    name: 'Maria Santos',
    email: 'reviewer@starhealth.demo',
    role: 'reviewer',
    organization: 'Star Health Demo Insurance (Medical Claims Reviewer)',
    description: 'Review queue, extracted document evidence, policy rule checks, and approve/reject actions with reasons.',
  },
  {
    id: 'u4',
    name: 'Alex Johnson',
    email: 'patient@demo.com',
    role: 'patient',
    organization: 'Patient (Self-Service Portal)',
    description: 'Your own demo policy coverage, claim status, missing-document requests, and next steps.',
  },
];

export const DEMO_COMPANIES: Company[] = [
  {
    id: 'c-star',
    name: 'Star Health Allied Insurance',
    tagline: 'Demo Catalog — Retail & Group Health',
    contactEmail: 'claims-support@starhealth.demo',
    contactPhone: '+91 44 2828 8800',
    activePolices: 412,
    catalogType: 'demo',
    logoBadge: 'SH',
  },
  {
    id: 'c-hdfc',
    name: 'HDFC ERGO Health',
    tagline: 'Demo Catalog — Optima & Comprehensive Health',
    contactEmail: 'priorauth@hdfcergo.demo',
    contactPhone: '+91 22 6234 6234',
    activePolices: 328,
    catalogType: 'demo',
    logoBadge: 'HE',
  },
  {
    id: 'c-lic',
    name: 'LIC Health Shield',
    tagline: 'Demo Catalog — Arogya Plus & Health Plans',
    contactEmail: 'healthclaims@licindia.demo',
    contactPhone: '+91 22 6827 6827',
    activePolices: 512,
    catalogType: 'demo',
    logoBadge: 'LIC',
  },
  {
    id: 'c-bluecross',
    name: 'BlueCross Demo Insurance',
    tagline: 'Demo Catalog — Preferred Provider Network',
    contactEmail: 'contact@bluecross.demo',
    contactPhone: '555-0101',
    activePolices: 245,
    catalogType: 'demo',
    logoBadge: 'BC',
  },
  {
    id: 'c-care',
    name: 'Care Health Insurance',
    tagline: 'Demo Catalog — Specialized Care & Critical Illness',
    contactEmail: 'priorauth@careinsurance.demo',
    contactPhone: '+91 11 4455 6677',
    activePolices: 198,
    catalogType: 'demo',
    logoBadge: 'CH',
  },
];

// Helper to mask policy number
export function maskPolicyNumber(num: string): string {
  if (num.length <= 6) return num;
  const prefix = num.slice(0, 4);
  const suffix = num.slice(-4);
  return `${prefix}-****-${suffix}`;
}

export const INITIAL_POLICYHOLDERS: Policyholder[] = [
  {
    id: 'ph-1',
    name: 'Alex Johnson',
    policyId: 'p-star-01',
    policyNumber: 'POL-STAR-2024-8841',
    maskedPolicyNumber: 'POL-STAR-****-8841',
    companyId: 'c-star',
    companyName: 'Star Health Allied Insurance',
    policyName: 'Star Comprehensive Health Demo Plan',
    status: 'active',
    verificationStatus: 'verified',
    startDate: '2024-01-01',
    expiryDate: '2027-12-31', // Active multi-year coverage
    totalPremium: 28500,
    verifiedPremiumPaid: 28500,
    outstandingPremium: 0,
    nextPremiumDueDate: '2027-12-01',
    sumInsured: 1000000,
    utilisedCoverage: 180000,
    coPaymentPercent: 0,
    waitingPeriods: '30-day initial waiting period completed. Pre-existing disease waiting period: 24 months (Active coverage verified).',
    sublimitsAndExclusions: 'Room rent: Up to 1% of Sum Insured/day. Cataract sub-limit: ₹40,000 per eye. Robotic surgery capped at 50% SI.',
    patientUserId: 'u4',
  },
  {
    id: 'ph-2',
    name: 'Priya Sharma',
    policyId: 'p-hdfc-01',
    policyNumber: 'POL-HDFC-2024-4029',
    maskedPolicyNumber: 'POL-HDFC-****-4029',
    companyId: 'c-hdfc',
    companyName: 'HDFC ERGO Health',
    policyName: 'Optima Secure Demo Health Shield',
    status: 'active',
    verificationStatus: 'verified',
    startDate: '2024-03-15',
    expiryDate: '2027-03-14',
    totalPremium: 32000,
    verifiedPremiumPaid: 32000,
    outstandingPremium: 0,
    nextPremiumDueDate: '2027-02-15',
    sumInsured: 1500000,
    utilisedCoverage: 0,
    coPaymentPercent: 0,
    waitingPeriods: 'Initial 30 days served. Specific conditions 24 months completed. Maternity waiting period: 36 months.',
    sublimitsAndExclusions: 'No room rent capping on single private A/C room. Modern treatments covered up to full Sum Insured.',
  },
  {
    id: 'ph-3',
    name: 'Rajesh Kumar',
    policyId: 'p-lic-01',
    policyNumber: 'POL-LIC-2023-9112',
    maskedPolicyNumber: 'POL-LIC-****-9112',
    companyId: 'c-lic',
    companyName: 'LIC Health Shield',
    policyName: 'Arogya Plus Demo Policy',
    status: 'active',
    verificationStatus: 'verified',
    startDate: '2023-06-01',
    expiryDate: '2028-05-31',
    totalPremium: 45000,
    verifiedPremiumPaid: 30000,
    outstandingPremium: 15000,
    nextPremiumDueDate: '2026-11-15',
    sumInsured: 800000,
    utilisedCoverage: 120000,
    coPaymentPercent: 10,
    waitingPeriods: '30-day initial served. Critical illness 90-day waiting period completed.',
    sublimitsAndExclusions: 'Deductible: ₹10,000 per claim. Ambulance charges up to ₹2,500. Domiciliary hospitalization excluded.',
  },
  {
    id: 'ph-4',
    name: 'Robert Mills',
    policyId: 'p-bc-01',
    policyNumber: 'POL-BC-2024-1044',
    maskedPolicyNumber: 'POL-BC-****-1044',
    companyId: 'c-bluecross',
    companyName: 'BlueCross Demo Insurance',
    policyName: 'Blue Shield Preferred PPO Demo',
    status: 'active',
    verificationStatus: 'verified',
    startDate: '2024-01-01',
    expiryDate: '2026-12-31',
    totalPremium: 4200,
    verifiedPremiumPaid: 4200,
    outstandingPremium: 0,
    nextPremiumDueDate: '2026-12-01',
    sumInsured: 500000,
    utilisedCoverage: 45000,
    coPaymentPercent: 15,
    waitingPeriods: 'Standard in-network rules apply. Prior auth mandatory for elective inpatient admissions.',
    sublimitsAndExclusions: 'In-network hospitalisation 90% covered; out-of-network subject to 30% co-insurance.',
    patientUserId: 'u5',
  },
  {
    id: 'ph-5',
    name: 'Linda Torres',
    policyId: 'p-star-02',
    policyNumber: 'POL-STAR-2024-5519',
    maskedPolicyNumber: 'POL-STAR-****-5519',
    companyId: 'c-star',
    companyName: 'Star Health Allied Insurance',
    policyName: 'Star Senior Citizens Red Carpet Demo',
    status: 'active',
    verificationStatus: 'verified',
    startDate: '2024-02-01',
    expiryDate: '2027-01-31',
    totalPremium: 38000,
    verifiedPremiumPaid: 38000,
    outstandingPremium: 0,
    nextPremiumDueDate: '2027-01-01',
    sumInsured: 750000,
    utilisedCoverage: 280000,
    coPaymentPercent: 20,
    waitingPeriods: 'Pre-existing diseases covered after 12 months (completed).',
    sublimitsAndExclusions: 'Cardiac procedures capped at ₹2,50,000 per hospitalization.',
    patientUserId: 'u6',
  },
  {
    id: 'ph-6',
    name: 'David Kim',
    policyId: 'p-care-01',
    policyNumber: 'POL-CARE-2024-3310',
    maskedPolicyNumber: 'POL-CARE-****-3310',
    companyId: 'c-care',
    companyName: 'Care Health Insurance',
    policyName: 'Care Supreme Comprehensive Demo',
    status: 'pending',
    verificationStatus: 'pending_verification',
    startDate: '2024-09-01',
    expiryDate: '2027-08-31',
    totalPremium: 26000,
    verifiedPremiumPaid: 13000,
    outstandingPremium: 13000,
    nextPremiumDueDate: '2026-11-01',
    sumInsured: 1000000,
    utilisedCoverage: 0,
    coPaymentPercent: 0,
    waitingPeriods: 'Policy underwriting under final audit verification.',
    sublimitsAndExclusions: 'Full benefits activate once verification is finalized.',
    patientUserId: 'u7',
  },
];

export const DEMO_POLICIES: Policy[] = [
  {
    id: 'p-star-01',
    companyId: 'c-star',
    companyName: 'Star Health Allied Insurance',
    policyNumber: 'POL-STAR-2024-8841',
    policyName: 'Star Comprehensive Health Demo Plan',
    type: 'Comprehensive Inpatient & Daycare',
    coverageLimit: 1000000,
    deductible: 0,
    effectiveDate: '2024-01-01',
    expirationDate: '2027-12-31',
    status: 'active',
  },
  {
    id: 'p-hdfc-01',
    companyId: 'c-hdfc',
    companyName: 'HDFC ERGO Health',
    policyNumber: 'POL-HDFC-2024-4029',
    policyName: 'Optima Secure Demo Health Shield',
    type: 'Individual High Sum Insured',
    coverageLimit: 1500000,
    deductible: 0,
    effectiveDate: '2024-03-15',
    expirationDate: '2027-03-14',
    status: 'active',
  },
  {
    id: 'p-lic-01',
    companyId: 'c-lic',
    companyName: 'LIC Health Shield',
    policyNumber: 'POL-LIC-2023-9112',
    policyName: 'Arogya Plus Demo Policy',
    type: 'Family Floater Hospital Cash & Care',
    coverageLimit: 800000,
    deductible: 10000,
    effectiveDate: '2023-06-01',
    expirationDate: '2028-05-31',
    status: 'active',
  },
  {
    id: 'p-bc-01',
    companyId: 'c-bluecross',
    companyName: 'BlueCross Demo Insurance',
    policyNumber: 'POL-BC-2024-1044',
    policyName: 'Blue Shield Preferred PPO Demo',
    type: 'Commercial PPO Network Plan',
    coverageLimit: 500000,
    deductible: 1500,
    effectiveDate: '2024-01-01',
    expirationDate: '2026-12-31',
    status: 'active',
  },
];

export const INITIAL_CLAIMS: Claim[] = [
  {
    id: 'cl1',
    claimNumber: 'CLM-2024-0001',
    patientName: 'Alex Johnson',
    patientId: 'u4',
    policyId: 'p-star-01',
    policyNumber: 'POL-STAR-2024-8841',
    companyName: 'Star Health Allied Insurance',
    procedure: 'MRI Brain Scan with Contrast',
    diagnosisCode: 'G35 (Multiple Sclerosis evaluation)',
    estimatedAmount: 32000,
    billedAmount: 32000,
    eligibleAmount: 30000,
    status: 'in-review',
    submittedDate: '2024-10-01',
    updatedDate: '2024-10-12',
    assignedReviewer: 'Maria Santos',
    notes: 'Awaiting neurologist clinical notes or prior MRI comparison report.',
    reviewerComment: 'Please upload previous 6-month neurological consult note to verify progression.',
    missingDocumentDetails: ["Neurologist's recent consultation note", 'Previous MRI imaging report'],
    documents: [
      {
        id: 'doc-1',
        name: 'Prescription_Neuro_DrSharma.pdf',
        size: 1420000,
        category: "Doctor's prescription",
        uploadDate: '2024-10-01',
        status: 'verified',
        fileType: 'application/pdf',
        pageCount: 1,
        extractedSnippet: 'Rx: Contrast-enhanced MRI brain requested for severe episodic hemi-cranial paresthesia.',
        sourcePage: 1,
      },
      {
        id: 'doc-2',
        name: 'Hospital_Admission_Booking.pdf',
        size: 980000,
        category: 'Hospital admission record',
        uploadDate: '2024-10-01',
        status: 'verified',
        fileType: 'application/pdf',
        pageCount: 2,
        extractedSnippet: 'Daycare Neuro-Radiology slot scheduled for outpatient diagnostic assessment.',
        sourcePage: 1,
      },
    ],
    criteriaResults: [
      {
        id: 'cr-1',
        requirement: 'Documented neurological indication for advanced neuro-imaging',
        status: 'supported',
        evidenceExcerpt: 'Severe episodic hemi-cranial paresthesia with sensory deficits on physical exam.',
        sourceDocument: 'Prescription_Neuro_DrSharma.pdf',
        sourcePage: 1,
        explanation: 'Clinical symptoms and physical exam findings documented by board-certified neurologist.',
      },
      {
        id: 'cr-2',
        requirement: 'Prior treatment or baseline imaging report comparison',
        status: 'missing',
        evidenceExcerpt: undefined,
        explanation: 'No prior imaging or 6-month neurological progress note attached in current dossier.',
      },
      {
        id: 'cr-3',
        requirement: 'Conservative therapy trial or urgent red-flag clinical criteria',
        status: 'uncertain',
        evidenceExcerpt: 'Paresthesia persistent for 4 weeks; no lumbar puncture or evoked potentials recorded.',
        sourceDocument: 'Prescription_Neuro_DrSharma.pdf',
        sourcePage: 1,
        explanation: 'Duration is documented, but objective diagnostic severity scores require human reviewer verification.',
      },
    ],
  },
  {
    id: 'cl2',
    claimNumber: 'CLM-2024-0002',
    patientName: 'Robert Mills',
    patientId: 'u5',
    policyId: 'p-bc-01',
    policyNumber: 'POL-BC-2024-1044',
    companyName: 'BlueCross Demo Insurance',
    procedure: 'Left Knee Diagnostic & Therapeutic Arthroscopy',
    diagnosisCode: 'M23.4 (Loose body in knee joint)',
    estimatedAmount: 125000,
    billedAmount: 135000,
    eligibleAmount: 115000,
    status: 'needs-info',
    submittedDate: '2024-09-15',
    updatedDate: '2024-10-08',
    assignedReviewer: 'Maria Santos',
    notes: 'Missing certified operative notes and recent weight-bearing X-ray reports.',
    reviewerComment: 'Upload certified pre-op weight bearing X-ray and conservative physical therapy log.',
    missingDocumentDetails: ['Weight-bearing AP/Lateral X-ray report', 'Physical therapy 6-week completion record'],
    documents: [
      {
        id: 'doc-3',
        name: 'Orthopedic_Consultation_Notes.pdf',
        size: 2100000,
        category: 'Diagnosis and clinical notes',
        uploadDate: '2024-09-15',
        status: 'verified',
        fileType: 'application/pdf',
        pageCount: 3,
        extractedSnippet: 'Patient reports persistent mechanical locking and pain in left knee unresponsive to NSAIDs.',
        sourcePage: 2,
      },
    ],
    criteriaResults: [
      {
        id: 'cr-4',
        requirement: 'Radiographic confirmation of joint pathology or mechanical locking',
        status: 'uncertain',
        evidenceExcerpt: 'Mechanical locking noted on exam; plain radiographs pending review.',
        sourceDocument: 'Orthopedic_Consultation_Notes.pdf',
        sourcePage: 2,
        explanation: 'Clinical exam shows locking, but standalone radiographic evidence report is not attached.',
      },
      {
        id: 'cr-5',
        requirement: 'Documented 6-week failure of supervised conservative physical therapy',
        status: 'missing',
        explanation: 'No physiotherapy log or formal rehabilitation discharge sheet submitted.',
      },
    ],
  },
  {
    id: 'cl3',
    claimNumber: 'CLM-2024-0003',
    patientName: 'Linda Torres',
    patientId: 'u6',
    policyId: 'p-star-02',
    policyNumber: 'POL-STAR-2024-5519',
    companyName: 'Star Health Allied Insurance',
    procedure: 'Coronary Angiography and Stent Evaluation',
    diagnosisCode: 'I25.1 (Atherosclerotic heart disease)',
    estimatedAmount: 240000,
    billedAmount: 240000,
    eligibleAmount: 235000,
    status: 'approved',
    submittedDate: '2024-08-20',
    updatedDate: '2024-09-02',
    assignedReviewer: 'Maria Santos',
    notes: 'Emergency prior-auth verified. TMT strongly positive and ECG shows ischemic ST depression.',
    reviewerComment: 'All criteria satisfied with clear cardiologist recommendation. Authorisation granted.',
    documents: [
      {
        id: 'doc-4',
        name: 'Cardiology_TMT_Report.pdf',
        size: 3200000,
        category: 'Investigation reports',
        uploadDate: '2024-08-20',
        status: 'verified',
        fileType: 'application/pdf',
        pageCount: 4,
        extractedSnippet: 'Treadmill stress test positive at stage 2 for inducible myocardial ischemia.',
        sourcePage: 3,
      },
      {
        id: 'doc-5',
        name: 'Hospital_Estimate_Cardio.pdf',
        size: 850000,
        category: 'Hospital estimate or final bill',
        uploadDate: '2024-08-20',
        status: 'verified',
        fileType: 'application/pdf',
        pageCount: 1,
        extractedSnippet: 'Package estimate: ₹2,40,000 including angiography and drug-eluting stent.',
        sourcePage: 1,
      },
    ],
    criteriaResults: [
      {
        id: 'cr-6',
        requirement: 'Objective evidence of coronary artery disease via stress test or ischemic ECG',
        status: 'supported',
        evidenceExcerpt: 'Treadmill stress test positive at stage 2 for inducible myocardial ischemia.',
        sourceDocument: 'Cardiology_TMT_Report.pdf',
        sourcePage: 3,
        explanation: 'Confirmed inducible myocardial ischemia meets policy pre-authorisation threshold.',
      },
    ],
  },
  {
    id: 'cl4',
    claimNumber: 'CLM-2024-0004',
    patientName: 'David Kim',
    patientId: 'u7',
    policyId: 'p-care-01',
    policyNumber: 'POL-CARE-2024-3310',
    companyName: 'Care Health Insurance',
    procedure: 'Spinal Fusion L4-L5 with Decompression',
    diagnosisCode: 'M47.816 (Spondylosis with radiculopathy)',
    estimatedAmount: 380000,
    billedAmount: 380000,
    eligibleAmount: 350000,
    status: 'submitted',
    submittedDate: '2024-10-10',
    updatedDate: '2024-10-10',
    notes: 'Fresh submission by Hospital Coordinator. Pending initial document verification.',
  },
  {
    id: 'cl5',
    claimNumber: 'CLM-2024-0005',
    patientName: 'Sarah Park',
    patientId: 'u8',
    policyId: 'p-hdfc-01',
    policyNumber: 'POL-HDFC-2024-4029',
    companyName: 'HDFC ERGO Health',
    procedure: 'Unilateral Total Hip Replacement',
    diagnosisCode: 'M16.1 (Primary osteoarthritis of hip)',
    estimatedAmount: 340000,
    billedAmount: 340000,
    eligibleAmount: 0,
    status: 'rejected',
    submittedDate: '2024-09-05',
    updatedDate: '2024-09-20',
    assignedReviewer: 'Maria Santos',
    notes: 'Claim rejected due to pre-existing waiting period exclusion on Joint Replacement.',
    reviewerComment: 'Joint replacement surgeries have an explicit 24-month waiting period on this policy tier. Duration elapsed is only 6 months.',
  },
];

export const INITIAL_AUDIT_EVENTS: AuditEvent[] = [
  {
    id: 'aud-1',
    claimId: 'cl1',
    timestamp: '2024-10-01 10:15 AM',
    actor: 'James Okafor',
    role: 'coordinator',
    action: 'Dossier Uploaded & Claim Submitted',
    details: 'Coordinator uploaded Prescription_Neuro_DrSharma.pdf and submitted prior-auth request.',
  },
  {
    id: 'aud-2',
    claimId: 'cl1',
    timestamp: '2024-10-05 02:40 PM',
    actor: 'Maria Santos',
    role: 'reviewer',
    action: 'Criteria Evaluated & Clarification Requested',
    details: 'Reviewed evidence; flagged missing prior neurological imaging; requested additional documents.',
  },
  {
    id: 'aud-3',
    claimId: 'cl3',
    timestamp: '2024-08-20 09:30 AM',
    actor: 'James Okafor',
    role: 'coordinator',
    action: 'Claim Submitted',
    details: 'Submitted with positive TMT report and hospital estimate.',
  },
  {
    id: 'aud-4',
    claimId: 'cl3',
    timestamp: '2024-09-02 11:20 AM',
    actor: 'Maria Santos',
    role: 'reviewer',
    action: 'Prior-Authorisation Approved',
    details: 'Authorisation granted for ₹2,35,000 eligible amount under cashless policy schedule.',
  },
];

// Calculation helper for months remaining
export function calculateMonthsRemaining(expiryDateStr: string): {
  months: number;
  days: number;
  isExpired: boolean;
  formatted: string;
} {
  const now = new Date();
  const expiry = new Date(expiryDateStr);
  if (isNaN(expiry.getTime())) {
    return { months: 0, days: 0, isExpired: false, formatted: 'Not available' };
  }
  const diffTime = expiry.getTime() - now.getTime();
  if (diffTime <= 0) {
    return { months: 0, days: 0, isExpired: true, formatted: 'Policy Expired' };
  }
  const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const months = Math.floor(totalDays / 30.4375);
  const days = Math.floor(totalDays % 30.4375);
  return {
    months,
    days,
    isExpired: false,
    formatted: months > 0 ? `${months} months, ${days} days` : `${days} days remaining`,
  };
}

// LocalStorage Reactive State Management
const STORAGE_KEYS = {
  CLAIMS: 'authpilot_demo_claims',
  POLICYHOLDERS: 'authpilot_demo_policyholders',
  AUDIT: 'authpilot_demo_audit',
};

export function getStoredClaims(): Claim[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CLAIMS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CLAIMS, JSON.stringify(INITIAL_CLAIMS));
      return INITIAL_CLAIMS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_CLAIMS;
  }
}

export function saveClaims(claims: Claim[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.CLAIMS, JSON.stringify(claims));
  } catch (e) {
    console.warn('Failed saving claims to localStorage:', e);
  }
}

export function getStoredPolicyholders(): Policyholder[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.POLICYHOLDERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.POLICYHOLDERS, JSON.stringify(INITIAL_POLICYHOLDERS));
      return INITIAL_POLICYHOLDERS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_POLICYHOLDERS;
  }
}

export function savePolicyholders(policyholders: Policyholder[]) {
  try {
    localStorage.setItem(STORAGE_KEYS.POLICYHOLDERS, JSON.stringify(policyholders));
  } catch (e) {
    console.warn('Failed saving policyholders:', e);
  }
}

export function getStoredAudit(): AuditEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(INITIAL_AUDIT_EVENTS));
      return INITIAL_AUDIT_EVENTS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_AUDIT_EVENTS;
  }
}

export function addAuditEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>) {
  const all = getStoredAudit();
  const newEv: AuditEvent = {
    ...event,
    id: `aud-${Date.now()}`,
    timestamp: new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
  const updated = [newEv, ...all];
  try {
    localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(updated));
  } catch {}
  return newEv;
}

export function getAuditForClaim(claimId: string): AuditEvent[] {
  return getStoredAudit().filter((a) => a.claimId === claimId);
}

// Re-export constants for easy access
export const DEMO_CLAIMS = INITIAL_CLAIMS;
