export type Role = 'admin' | 'coordinator' | 'reviewer' | 'patient';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  organization: string;
}

export interface Company {
  id: string;
  name: string;
  tagline?: string;
  contactEmail: string;
  contactPhone: string;
  activePolices: number;
  catalogType: 'demo' | 'verified';
  logoBadge?: string;
}

export type PolicyStatus = 'active' | 'expired' | 'pending' | 'suspended';
export type VerificationStatus = 'verified' | 'unverified' | 'pending_verification';

export interface Policy {
  id: string;
  companyId: string;
  companyName: string;
  policyNumber: string;
  policyName?: string;
  type: string;
  coverageLimit: number;
  deductible: number;
  effectiveDate: string;
  expirationDate: string;
  status: PolicyStatus;
}

export type ClaimStatus = 'submitted' | 'in-review' | 'approved' | 'rejected' | 'needs-info';

export interface Claim {
  id: string;
  claimNumber: string;
  patientName: string;
  patientId: string;
  policyId: string;
  policyNumber: string;
  companyName: string;
  procedure: string;
  diagnosisCode: string;
  estimatedAmount: number;
  billedAmount?: number;
  eligibleAmount?: number;
  status: ClaimStatus;
  submittedDate: string;
  updatedDate: string;
  assignedReviewer?: string;
  notes?: string;
  reviewerComment?: string;
  decisionReason?: string;
  missingDocumentDetails?: string[];
  documents?: UploadedDocument[];
  criteriaResults?: CriteriaEvaluation[];
}

export interface Policyholder {
  id: string;
  name: string;
  policyId: string;
  policyNumber: string;
  maskedPolicyNumber: string;
  companyId: string;
  companyName: string;
  policyName: string;
  status: PolicyStatus;
  verificationStatus: VerificationStatus;
  startDate: string;
  expiryDate: string;
  totalPremium: number;
  verifiedPremiumPaid: number;
  outstandingPremium: number;
  nextPremiumDueDate: string | null;
  sumInsured: number;
  utilisedCoverage: number;
  coPaymentPercent: number;
  waitingPeriods: string;
  sublimitsAndExclusions: string;
  patientUserId?: string;
}

export type DocumentCategory =
  | 'Insurance card or policy copy'
  | 'Hospital admission record'
  | "Doctor's prescription"
  | 'Diagnosis and clinical notes'
  | 'Investigation reports'
  | 'Hospital estimate or final bill'
  | 'Discharge summary'
  | 'Other supporting documents';

export type DocStatus =
  | 'pending-upload'
  | 'uploaded'
  | 'processing'
  | 'verified'
  | 'missing'
  | 'needs-review';

export interface UploadedDocument {
  id: string;
  name: string;
  size: number;
  category: DocumentCategory;
  uploadDate: string;
  status: DocStatus;
  fileType: string;
  pageCount?: number;
  notes?: string;
  extractedSnippet?: string;
  sourcePage?: number;
}

export interface ChecklistItem {
  id: string;
  category: DocumentCategory;
  description: string;
  status: DocStatus;
  isMandatory: boolean;
}

export type CriteriaStatus = 'supported' | 'missing' | 'uncertain';

export interface CriteriaEvaluation {
  id: string;
  requirement: string;
  status: CriteriaStatus;
  evidenceExcerpt?: string;
  sourceDocument?: string;
  sourcePage?: number;
  explanation: string;
}

export interface AuditEvent {
  id: string;
  claimId: string;
  timestamp: string;
  actor: string;
  role: Role;
  action: string;
  details: string;
}

export interface DemoAccount {
  id: string;
  name: string;
  email: string;
  role: Role;
  organization: string;
  description: string;
}
