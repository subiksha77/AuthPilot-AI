import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ShieldCheck,
  FileText,
  Calendar,
  AlertCircle,
  UploadCloud,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Lock,
  PlusCircle,
  ExternalLink,
  Clock,
  Info,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import StatusBadge from '../components/common/StatusBadge';
import {
  calculateMonthsRemaining,
  getStoredPolicyholders,
  getStoredClaims,
  saveClaims,
  addAuditEvent,
} from '../services/demoData';
import type {
  User,
  Policyholder,
  Claim,
  DocumentCategory,
  UploadedDocument,
  DocStatus,
} from '../types';

interface Props {
  user: User;
  onLogout: () => void;
}

const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  'Insurance card or policy copy',
  'Hospital admission record',
  "Doctor's prescription",
  'Diagnosis and clinical notes',
  'Investigation reports',
  'Hospital estimate or final bill',
  'Discharge summary',
  'Other supporting documents',
];

interface LocalFile {
  id: string;
  file: File;
  name: string;
  size: number;
  category: DocumentCategory;
  status: DocStatus;
  progress: number;
  extractedSnippet?: string;
  sourcePage?: number;
}

const PolicyholderProfile: React.FC<Props> = ({ user, onLogout }) => {
  const { companyId, policyId } = useParams<{ companyId?: string; policyId?: string }>();
  const navigate = useNavigate();

  const [policyholder, setPolicyholder] = useState<Policyholder | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory>(
    'Diagnosis and clinical notes'
  );
  const [stagedFiles, setStagedFiles] = useState<LocalFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // New claim form fields for coordinator
  const [procedureInput, setProcedureInput] = useState('');
  const [diagnosisCodeInput, setDiagnosisCodeInput] = useState('');
  const [estimatedAmountInput, setEstimatedAmountInput] = useState('');
  const [coordinatorNotes, setCoordinatorNotes] = useState('');

  // Load policyholder and relevant claims
  useEffect(() => {
    const allPh = getStoredPolicyholders();
    const found = allPh.find(
      (p) =>
        p.policyId === policyId ||
        p.id === policyId ||
        p.policyNumber === policyId
    );
    if (found) {
      setPolicyholder(found);
    }

    const allClaims = getStoredClaims();
    const matchedClaims = allClaims.filter(
      (c) =>
        c.policyId === policyId ||
        (found && (c.policyNumber === found.policyNumber || c.patientName === found.name))
    );
    setClaims(matchedClaims);
  }, [policyId]);

  // Dynamic calculation of months remaining
  const remainingTime = useMemo(() => {
    if (!policyholder) return null;
    return calculateMonthsRemaining(policyholder.expiryDate);
  }, [policyholder]);

  // Remaining Sum Insured calculation
  const remainingCoverage = useMemo(() => {
    if (!policyholder) return 0;
    return Math.max(0, policyholder.sumInsured - policyholder.utilisedCoverage);
  }, [policyholder]);

  // Checklist of recommended documents for prior auth
  const checklist = useMemo(() => {
    const uploadedCategories = new Set(stagedFiles.map((f) => f.category));
    // Also include categories from existing claims
    claims.forEach((c) => {
      c.documents?.forEach((d) => uploadedCategories.add(d.category));
    });

    return [
      {
        category: 'Insurance card or policy copy' as DocumentCategory,
        label: 'Policy Copy / Insurance Health Card',
        required: true,
        isUploaded: uploadedCategories.has('Insurance card or policy copy'),
      },
      {
        category: "Doctor's prescription" as DocumentCategory,
        label: "Treating Doctor's Official Prescription",
        required: true,
        isUploaded: uploadedCategories.has("Doctor's prescription"),
      },
      {
        category: 'Diagnosis and clinical notes' as DocumentCategory,
        label: 'Detailed Clinical History & Consultation Notes',
        required: true,
        isUploaded: uploadedCategories.has('Diagnosis and clinical notes'),
      },
      {
        category: 'Investigation reports' as DocumentCategory,
        label: 'Diagnostic Test & Radiology Reports',
        required: true,
        isUploaded: uploadedCategories.has('Investigation reports'),
      },
      {
        category: 'Hospital estimate or final bill' as DocumentCategory,
        label: 'Hospitalization Estimate / Cost Breakdown',
        required: true,
        isUploaded: uploadedCategories.has('Hospital estimate or final bill'),
      },
      {
        category: 'Hospital admission record' as DocumentCategory,
        label: 'Hospital Admission / Booking Slip',
        required: false,
        isUploaded: uploadedCategories.has('Hospital admission record'),
      },
    ];
  }, [stagedFiles, claims]);

  // File validation
  const validateAndAddFiles = (files: FileList | File[]) => {
    setUploadError(null);
    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
    const maxSizeBytes = 10 * 1024 * 1024; // 10MB limit

    const newLocalFiles: LocalFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();

      if (!validExtensions.includes(ext)) {
        setUploadError(`File "${file.name}" has an unsupported format. Allowed formats: PDF, JPG, JPEG, PNG.`);
        return;
      }

      if (file.size > maxSizeBytes) {
        setUploadError(`File "${file.name}" exceeds the 10 MB size limit.`);
        return;
      }

      // Simulated snippet generation based on category
      let snippet = 'Extracted digital document excerpt for clinical verification.';
      if (selectedCategory === "Doctor's prescription") {
        snippet = 'Rx verified: Recommended inpatient clinical procedure based on confirmed diagnostic evaluation.';
      } else if (selectedCategory === 'Investigation reports') {
        snippet = 'Radiological & Lab diagnostics: Findings confirmed on Page 1-2.';
      } else if (selectedCategory === 'Hospital estimate or final bill') {
        snippet = 'Hospital Pre-Authorisation estimate breakdown itemized for insurance cashless desk.';
      }

      newLocalFiles.push({
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        file,
        name: file.name,
        size: file.size,
        category: selectedCategory,
        status: 'uploaded',
        progress: 100,
        extractedSnippet: snippet,
        sourcePage: 1,
      });
    }

    setStagedFiles((prev) => [...prev, ...newLocalFiles]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndAddFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndAddFiles(e.target.files);
    }
  };

  const handleRemoveFile = (id: string) => {
    setStagedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Submit claim workflow for coordinator
  const handleSubmitClaim = () => {
    if (!policyholder) return;

    if (!procedureInput.trim()) {
      setUploadError('Please enter the procedure or treatment name before submitting.');
      return;
    }

    if (stagedFiles.length === 0) {
      setUploadError('Please attach at least one supporting clinical document before submission.');
      return;
    }

    setIsSubmitting(true);
    setUploadError(null);

    setTimeout(() => {
      const allClaims = getStoredClaims();
      const newClaimNumber = `CLM-${new Date().getFullYear()}-${String(
        allClaims.length + 1
      ).padStart(4, '0')}`;

      const uploadedDocs: UploadedDocument[] = stagedFiles.map((sf) => ({
        id: sf.id,
        name: sf.name,
        size: sf.size,
        category: sf.category,
        uploadDate: new Date().toISOString().split('T')[0],
        status: 'verified',
        fileType: sf.file.type || 'application/pdf',
        pageCount: 1,
        extractedSnippet: sf.extractedSnippet,
        sourcePage: sf.sourcePage || 1,
      }));

      const estAmount = parseFloat(estimatedAmountInput) || 45000;

      const newClaim: Claim = {
        id: `cl-${Date.now()}`,
        claimNumber: newClaimNumber,
        patientName: policyholder.name,
        patientId: policyholder.patientUserId || 'u4',
        policyId: policyholder.policyId,
        policyNumber: policyholder.policyNumber,
        companyName: policyholder.companyName,
        procedure: procedureInput.trim(),
        diagnosisCode: diagnosisCodeInput.trim() || 'R69 (Unspecified diagnostic)',
        estimatedAmount: estAmount,
        billedAmount: estAmount,
        eligibleAmount: estAmount * (1 - policyholder.coPaymentPercent / 100),
        status: 'submitted',
        submittedDate: new Date().toISOString().split('T')[0],
        updatedDate: new Date().toISOString().split('T')[0],
        notes: coordinatorNotes.trim() || 'Prior-authorisation request submitted by hospital coordinator with attached clinical dossier.',
        documents: uploadedDocs,
        criteriaResults: [
          {
            id: `cr-${Date.now()}-1`,
            requirement: 'Official clinical diagnosis & treating physician indication',
            status: 'supported',
            evidenceExcerpt: uploadedDocs[0]?.extractedSnippet || 'Clinical evaluation documented in submitted files.',
            sourceDocument: uploadedDocs[0]?.name,
            sourcePage: 1,
            explanation: 'Documented medical indication confirmed from uploaded medical records.',
          },
          {
            id: `cr-${Date.now()}-2`,
            requirement: 'Active policy status & eligible sum insured verification',
            status: 'supported',
            evidenceExcerpt: `Verified active coverage under ${policyholder.policyName}. Remaining SI: $${remainingCoverage.toLocaleString()}.`,
            explanation: 'Checked against verified insurer demo policy limits.',
          },
          {
            id: `cr-${Date.now()}-3`,
            requirement: 'Exclusions & sub-limit compliance review',
            status: 'uncertain',
            explanation: 'Hospital coordinator submitted clinical notes; awaiting insurance reviewer medical adjudication.',
          },
        ],
      };

      const updatedClaims = [newClaim, ...allClaims];
      saveClaims(updatedClaims);
      setClaims(updatedClaims.filter((c) => c.policyId === policyholder.policyId));

      addAuditEvent({
        claimId: newClaim.id,
        actor: user.name,
        role: user.role,
        action: 'Claim Submitted for Prior-Authorisation',
        details: `Coordinator submitted ${newClaim.claimNumber} (${newClaim.procedure}) with ${uploadedDocs.length} attached documents.`,
      });

      setIsSubmitting(false);
      setStagedFiles([]);
      setProcedureInput('');
      setDiagnosisCodeInput('');
      setEstimatedAmountInput('');
      setCoordinatorNotes('');
      setSubmitSuccess(
        `Claim ${newClaim.claimNumber} has been submitted successfully to ${policyholder.companyName} Review Queue!`
      );

      setTimeout(() => {
        setSubmitSuccess(null);
      }, 7000);
    }, 600);
  };

  if (!policyholder) {
    return (
      <AppLayout user={user} onLogout={onLogout} pageTitle="Policyholder Not Found">
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center max-w-lg mx-auto mt-10">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-gray-800">Policy Profile Not Found</h2>
          <p className="text-sm text-gray-500 mt-2">
            The requested policy ID could not be located in the authorized policy registry.
          </p>
          <button
            onClick={() => navigate('/companies')}
            className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Companies & Policies
          </button>
        </div>
      </AppLayout>
    );
  }

  const isCoordinator = user.role === 'coordinator';
  const isAdmin = user.role === 'admin';

  return (
    <AppLayout
      user={user}
      onLogout={onLogout}
      pageTitle={`Policy Profile — ${policyholder.name}`}
    >
      {/* Top back navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/companies')}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Insurance Companies & Policies
        </button>
        <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-mono">
          Policy Reference: {policyholder.policyNumber}
        </span>
      </div>

      {/* Synthetic Demo Banner */}
      <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            <strong>Synthetic Demo Policy Profile:</strong> Records shown are for workflow testing
            under SYNAPSE 2026 PS-011 and do not constitute actual insurance coverage contracts.
          </span>
        </div>
      </div>

      {submitSuccess && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{submitSuccess}</p>
            <p className="text-xs text-green-700 mt-1">
              The claim is now awaiting review in the Insurance Reviewer queue. You can track its status
              below or in the Claims directory.
            </p>
          </div>
        </div>
      )}

      {/* SECTION A: Policyholder Details Header Card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-gray-900">{policyholder.name}</h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified Policyholder
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {policyholder.policyName} ·{' '}
                <span className="font-medium text-gray-700">{policyholder.companyName}</span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-gray-400">Masked Policy ID</p>
              <p className="font-mono text-sm font-semibold text-gray-800">
                {policyholder.maskedPolicyNumber}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                policyholder.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {policyholder.status}
            </span>
          </div>
        </div>

        {/* Quick Summary Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-5 text-sm">
          <div>
            <p className="text-xs text-gray-400">Insurance Company</p>
            <p className="font-semibold text-gray-800 mt-0.5">{policyholder.companyName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Plan Type</p>
            <p className="font-semibold text-gray-800 mt-0.5">{policyholder.policyName}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Identity Verification</p>
            <p className="font-semibold text-emerald-700 mt-0.5">Authorised ID Match</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Co-Payment</p>
            <p className="font-semibold text-gray-800 mt-0.5">
              {policyholder.coPaymentPercent}% standard
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* SECTION B: Policy Information */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-gray-800 text-sm">Policy Information</h2>
          </div>
          <dl className="space-y-3.5 text-sm">
            <div className="flex justify-between items-center">
              <dt className="text-gray-500">Start Date</dt>
              <dd className="font-medium text-gray-800">{policyholder.startDate}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-gray-500">Expiry Date</dt>
              <dd className="font-medium text-gray-800">{policyholder.expiryDate}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-gray-500">Coverage Duration</dt>
              <dd className="font-medium text-gray-800">Multi-Year Active</dd>
            </div>
            <div className="flex justify-between items-center bg-blue-50/60 p-2.5 rounded-lg border border-blue-100">
              <dt className="text-blue-900 font-medium text-xs flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-600" /> Months Remaining
              </dt>
              <dd className="font-bold text-xs text-blue-700">
                {remainingTime?.formatted || 'Calculating...'}
              </dd>
            </div>
            <div className="pt-2 border-t border-gray-50 flex justify-between items-center">
              <dt className="text-gray-500">Total Premium</dt>
              <dd className="font-medium text-gray-800">
                ${policyholder.totalPremium.toLocaleString()}
              </dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-gray-500">Verified Paid</dt>
              <dd className="font-medium text-green-700">
                ${policyholder.verifiedPremiumPaid.toLocaleString()}
              </dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-gray-500">Outstanding Premium</dt>
              <dd className="font-medium text-gray-800">
                ${policyholder.outstandingPremium.toLocaleString()}
              </dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-gray-500">Next Premium Due</dt>
              <dd className="font-medium text-gray-800">
                {policyholder.nextPremiumDueDate || 'Not available'}
              </dd>
            </div>
          </dl>
        </div>

        {/* SECTION C: Coverage Information */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold text-gray-800 text-sm">Coverage & Benefit Limits</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-xs text-gray-500 font-medium">Total Sum Insured</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  ${policyholder.sumInsured.toLocaleString()}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">Annual verified limit</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-xs text-gray-500 font-medium">Utilised Coverage</p>
                <p className="text-xl font-bold text-amber-700 mt-1">
                  ${policyholder.utilisedCoverage.toLocaleString()}
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">Approved prior claims</p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <p className="text-xs text-emerald-700 font-medium">Remaining Sum Insured</p>
                <p className="text-xl font-bold text-emerald-700 mt-1">
                  ${remainingCoverage.toLocaleString()}
                </p>
                <p className="text-[11px] text-emerald-600 mt-0.5">Available for current claim</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-semibold text-gray-700">Waiting Periods:</p>
                <p className="text-gray-600 mt-0.5">{policyholder.waitingPeriods}</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-semibold text-gray-700">Sublimits & Specific Exclusions:</p>
                <p className="text-gray-600 mt-0.5">{policyholder.sublimitsAndExclusions}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            <span>All figures verified against payer policy schedule</span>
            <span className="font-medium text-blue-600">Applicable Co-Pay: {policyholder.coPaymentPercent}%</span>
          </div>
        </div>
      </div>

      {/* SECTION E: Document Upload Section */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-blue-600" />
              <h2 className="font-bold text-gray-900 text-base">
                Prior-Authorisation Document Upload & Claim Submission
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Upload clinical and billing documentation to evaluate payer criteria and submit for prior authorization.
            </p>
          </div>

          {!isCoordinator && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-xs font-medium">
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>
                {isAdmin
                  ? 'Hospital Administrator: Read-Only Mode'
                  : 'Document Upload Restricted to Hospital Coordinator'}
              </span>
            </div>
          )}
        </div>

        {/* Read-Only Warning for Non-Coordinators */}
        {!isCoordinator ? (
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-900">Document Upload & Submission Controls Restricted</p>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                  Active document upload and claim creation are authorized solely for the{' '}
                  <strong>Hospital Insurance Coordinator</strong>. Hospital Administrators and other
                  personnel have read-only visibility into policy records, uploaded document statuses, and
                  audit trails.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Coordinator Active Upload Workspace */
          <div className="space-y-6">
            {/* Top row: Category Selector & Mandatory Checklist */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Select Document Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as DocumentCategory)}
                    className="w-full text-sm border border-gray-200 rounded-lg p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {DOCUMENT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Select the specific category before dropping or browsing files.
                  </p>
                </div>

                {/* Procedure & Estimation Inputs */}
                <div className="p-4 bg-gray-50 border border-gray-100 rounded-xl space-y-3">
                  <p className="text-xs font-bold text-gray-800">Claim Particulars</p>
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">
                      Requested Procedure / Treatment *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. MRI Brain Scan with Contrast"
                      value={procedureInput}
                      onChange={(e) => setProcedureInput(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-1">ICD-10 Diagnosis</label>
                      <input
                        type="text"
                        placeholder="e.g. G35"
                        value={diagnosisCodeInput}
                        onChange={(e) => setDiagnosisCodeInput(e.target.value)}
                        className="w-full text-xs border border-gray-200 rounded-lg p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-500 mb-1">Est. Amount ($) *</label>
                      <input
                        type="number"
                        placeholder="e.g. 32000"
                        value={estimatedAmountInput}
                        onChange={(e) => setEstimatedAmountInput(e.target.value)}
                        className="w-full text-xs border border-gray-200 rounded-lg p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Coordinator Notes</label>
                    <textarea
                      rows={2}
                      placeholder="Clinical context or urgency notes..."
                      value={coordinatorNotes}
                      onChange={(e) => setCoordinatorNotes(e.target.value)}
                      className="w-full text-xs border border-gray-200 rounded-lg p-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Drag and Drop Zone */}
              <div className="lg:col-span-2 flex flex-col justify-between">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-all flex flex-col items-center justify-center min-h-[220px] ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50/50'
                      : 'border-gray-200 bg-slate-50/50 hover:bg-slate-50 hover:border-blue-400'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-gray-800">
                    Drag and drop clinical documents here, or{' '}
                    <label className="text-blue-600 hover:underline cursor-pointer">
                      Browse Files
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileInputChange}
                        className="hidden"
                      />
                    </label>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Supported formats: PDF, JPG, JPEG, PNG (Max 10 MB per document)
                  </p>
                  <p className="text-xs text-slate-500 mt-3 font-medium bg-white px-3 py-1 rounded-full border border-gray-200">
                    Current Category: <span className="text-blue-700">{selectedCategory}</span>
                  </p>
                </div>

                {uploadError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Missing Document Checklist */}
            <div className="p-4 bg-slate-50 border border-gray-100 rounded-xl">
              <p className="text-xs font-bold text-gray-800 mb-2">
                Payer Pre-Authorisation Document Checklist
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {checklist.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs ${
                      item.isUploaded
                        ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                        : 'bg-white border-gray-200 text-gray-600'
                    }`}
                  >
                    {item.isUploaded ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-gray-300 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-medium leading-tight">{item.label}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {item.required ? 'Mandatory for cashless' : 'Recommended'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Staged Uploads List */}
            {stagedFiles.length > 0 && (
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100 flex items-center justify-between text-xs font-semibold text-gray-700">
                  <span>Selected Documents Ready for Submission ({stagedFiles.length})</span>
                  <span className="text-gray-400 font-normal">
                    Do not claim verified until backend criteria extraction completes
                  </span>
                </div>
                <div className="divide-y divide-gray-100">
                  {stagedFiles.map((sf) => (
                    <div key={sf.id} className="p-4 flex items-center justify-between gap-4 bg-white">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{sf.name}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[11px] font-medium">
                              {sf.category}
                            </span>
                            <span>{(sf.size / (1024 * 1024)).toFixed(2)} MB</span>
                            <span className="text-emerald-600 font-medium">Uploaded — Ready for engine</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRemoveFile(sf.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title="Remove file"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Action */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="text-xs text-gray-500">
                Submitting forwards the dossier to the insurance review queue and records a signed audit entry.
              </div>
              <button
                onClick={handleSubmitClaim}
                disabled={isSubmitting || stagedFiles.length === 0 || !procedureInput.trim()}
                className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm ${
                  isSubmitting || stagedFiles.length === 0 || !procedureInput.trim()
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
                }`}
              >
                {isSubmitting ? (
                  <>Processing Submission...</>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Submit Claim for Insurance Review
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SECTION D: Claims History */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-gray-800 text-base">Claims History for this Policy</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Click any claim to open the full evidence breakdown and reviewer audit timeline.
            </p>
          </div>
          <span className="text-xs text-gray-400">Total Claims: {claims.length}</span>
        </div>

        {claims.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>No prior claims recorded under this policy ID.</p>
            {isCoordinator && (
              <p className="text-xs text-blue-600 mt-1">
                Upload supporting documents above to initiate this policy's first prior-auth request.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="pb-3 font-medium">Claim ID</th>
                  <th className="pb-3 font-medium">Procedure / Treatment</th>
                  <th className="pb-3 font-medium">Submitted</th>
                  <th className="pb-3 font-medium">Billed Amount</th>
                  <th className="pb-3 font-medium">Est. Eligible</th>
                  <th className="pb-3 font-medium">Current Status</th>
                  <th className="pb-3 font-medium">Last Updated</th>
                  <th className="pb-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {claims.map((claim) => (
                  <tr
                    key={claim.id}
                    onClick={() => navigate(`/claims/${claim.id}`)}
                    className="hover:bg-blue-50/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 font-mono text-xs text-blue-600 font-medium">
                      {claim.claimNumber}
                    </td>
                    <td className="py-3.5 text-gray-800 font-medium">{claim.procedure}</td>
                    <td className="py-3.5 text-gray-500 text-xs">{claim.submittedDate}</td>
                    <td className="py-3.5 text-gray-800 font-medium">
                      ${(claim.billedAmount || claim.estimatedAmount).toLocaleString()}{' '}
                      <span className="text-[10px] text-gray-400 font-normal">(demo)</span>
                    </td>
                    <td className="py-3.5 text-blue-700 font-semibold text-xs">
                      {claim.eligibleAmount
                        ? `$${claim.eligibleAmount.toLocaleString()}`
                        : 'Under Review'}
                    </td>
                    <td className="py-3.5">
                      <StatusBadge status={claim.status} />
                    </td>
                    <td className="py-3.5 text-gray-500 text-xs">{claim.updatedDate}</td>
                    <td className="py-3.5 text-right">
                      <span className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium">
                        View Details <ExternalLink className="w-3.5 h-3.5" />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default PolicyholderProfile;
