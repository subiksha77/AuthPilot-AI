import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  ShieldCheck,
  History,
  Clock,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import StatusBadge from '../components/common/StatusBadge';
import { getStoredClaims, getAuditForClaim, getStoredPolicyholders } from '../services/demoData';
import type { User, Claim, AuditEvent, Policyholder } from '../types';

interface Props {
  user: User;
  onLogout: () => void;
}

const ClaimDetails: React.FC<Props> = ({ user, onLogout }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [claim, setClaim] = useState<Claim | null>(null);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [policyholder, setPolicyholder] = useState<Policyholder | null>(null);

  useEffect(() => {
    const allClaims = getStoredClaims();
    const found = allClaims.find((c) => c.id === id || c.claimNumber === id);
    if (found) {
      setClaim(found);
      setAudit(getAuditForClaim(found.id));

      const allPh = getStoredPolicyholders();
      const ph = allPh.find(
        (p) =>
          p.policyId === found.policyId ||
          p.policyNumber === found.policyNumber ||
          p.name === found.patientName
      );
      if (ph) setPolicyholder(ph);
    }
  }, [id]);

  if (!claim) {
    return (
      <AppLayout user={user} onLogout={onLogout} pageTitle="Claim Not Found">
        <div className="text-center py-20 text-gray-400">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Claim record not found.</p>
          <button
            onClick={() => navigate('/claims')}
            className="mt-4 text-blue-600 text-sm hover:underline"
          >
            ← Back to Claims
          </button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout user={user} onLogout={onLogout} pageTitle={`Claim — ${claim.claimNumber}`}>
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/claims')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Claims
        </button>
        {policyholder && (
          <button
            onClick={() =>
              navigate(`/companies/${policyholder.companyId}/policyholder/${policyholder.policyId}`)
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold transition-colors"
          >
            <span>View Verified Policy Profile</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
        ⚠️ <strong>Synthetic Demo Claim:</strong> Adjudication figures and status updates are
        demonstration records under SYNAPSE 2026 PS-011.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main 2 columns: Details, Policy Criteria, Documents */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Claim Information */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-start justify-between mb-4 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{claim.procedure}</h2>
                <p className="text-sm text-gray-500 mt-0.5 font-mono">{claim.claimNumber}</p>
              </div>
              <StatusBadge status={claim.status} />
            </div>

            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4 text-xs">
              <div>
                <dt className="text-gray-400 mb-1">Patient</dt>
                <dd className="font-semibold text-gray-800 text-sm">{claim.patientName}</dd>
              </div>
              <div>
                <dt className="text-gray-400 mb-1">Diagnosis Code</dt>
                <dd className="font-mono font-semibold text-gray-800">{claim.diagnosisCode}</dd>
              </div>
              <div>
                <dt className="text-gray-400 mb-1">Insurance Company</dt>
                <dd className="font-semibold text-gray-800">{claim.companyName}</dd>
              </div>
              <div>
                <dt className="text-gray-400 mb-1">Policy Number</dt>
                <dd className="font-mono text-gray-700">{claim.policyNumber}</dd>
              </div>
              <div>
                <dt className="text-gray-400 mb-1">Submitted Date</dt>
                <dd className="font-medium text-gray-700">{claim.submittedDate}</dd>
              </div>
              <div>
                <dt className="text-gray-400 mb-1">Last Updated</dt>
                <dd className="font-medium text-gray-700">{claim.updatedDate}</dd>
              </div>
              <div>
                <dt className="text-gray-400 mb-1">Assigned Reviewer</dt>
                <dd className="font-medium text-gray-700">
                  {claim.assignedReviewer || 'Pending Assignment'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-400 mb-1">Estimated / Billed Amount</dt>
                <dd className="font-bold text-base text-blue-700">
                  ${(claim.billedAmount || claim.estimatedAmount).toLocaleString()}{' '}
                  <span className="text-[10px] text-gray-400 font-normal">(demo est.)</span>
                </dd>
              </div>
              <div>
                <dt className="text-gray-400 mb-1">Eligible Coverage Amount</dt>
                <dd className="font-bold text-base text-emerald-700">
                  {claim.eligibleAmount ? `$${claim.eligibleAmount.toLocaleString()}` : 'Under Review'}
                </dd>
              </div>
            </dl>
          </div>

          {/* Notes or Reviewer Requests */}
          {claim.notes && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900">
              <strong>Coordinator Dossier Notes:</strong> {claim.notes}
            </div>
          )}

          {claim.reviewerComment && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-900">
              <strong>Reviewer Adjudication Notice:</strong> {claim.reviewerComment}
            </div>
          )}

          {/* Explainable Policy Criteria Results */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-gray-900 text-sm">Policy Criteria Engine Results</h3>
            </div>

            {claim.criteriaResults && claim.criteriaResults.length > 0 ? (
              <div className="space-y-3">
                {claim.criteriaResults.map((cr) => (
                  <div
                    key={cr.id}
                    className={`p-3.5 rounded-xl border text-xs ${
                      cr.status === 'supported'
                        ? 'bg-emerald-50/60 border-emerald-200'
                        : cr.status === 'missing'
                        ? 'bg-red-50/60 border-red-200'
                        : 'bg-amber-50/60 border-amber-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <p className="font-bold text-gray-900">{cr.requirement}</p>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                          cr.status === 'supported'
                            ? 'bg-emerald-100 text-emerald-800'
                            : cr.status === 'missing'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {cr.status}
                      </span>
                    </div>

                    {cr.evidenceExcerpt && (
                      <div className="mt-2 p-2 bg-white rounded border border-gray-200/60 font-mono text-[11px] text-gray-800">
                        <span className="font-sans font-semibold text-gray-500 text-[10px] block mb-0.5">
                          Supporting Excerpt ({cr.sourceDocument || 'Document'}, Page {cr.sourcePage || 1}):
                        </span>
                        "{cr.evidenceExcerpt}"
                      </div>
                    )}

                    <p className="text-gray-600 mt-2 text-[11px]">
                      <strong>Explanation:</strong> {cr.explanation}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 py-3">
                Policy criteria evaluation in progress or pending initial document processing.
              </p>
            )}
          </div>

          {/* Attached Documents */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
              <FileText className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-gray-900 text-sm">
                Clinical Documents Attached ({claim.documents?.length || 0})
              </h3>
            </div>

            {claim.documents && claim.documents.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {claim.documents.map((doc) => (
                  <div key={doc.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-gray-800">{doc.name}</p>
                        <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                          <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                            {doc.category}
                          </span>
                          <span>{(doc.size / (1024 * 1024)).toFixed(2)} MB</span>
                          <span className="text-emerald-700 font-medium">Verified by Engine</span>
                        </div>
                        {doc.extractedSnippet && (
                          <p className="text-[11px] text-gray-600 mt-1 italic bg-slate-50 p-1.5 rounded">
                            "{doc.extractedSnippet}"
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 py-4 text-center">
                No documents uploaded for this claim.
              </p>
            )}
          </div>
        </div>

        {/* Right 1 column: Audit Trail & Payer Guidelines */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
              <History className="w-5 h-5 text-gray-600" />
              <h3 className="font-bold text-gray-900 text-sm">Audit Trail</h3>
            </div>

            {audit.length > 0 ? (
              <div className="space-y-3.5">
                {audit.map((item) => (
                  <div key={item.id} className="flex items-start gap-2.5 text-xs">
                    <div className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                    <div>
                      <p className="font-semibold text-gray-800 leading-tight">
                        {item.action}{' '}
                        <span className="font-normal text-gray-400 block text-[10px]">
                          by {item.actor} ({item.role})
                        </span>
                      </p>
                      <p className="text-gray-500 mt-1 text-[11px]">{item.details}</p>
                      <span className="text-[10px] text-gray-400 block mt-0.5">
                        {item.timestamp}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">No audit events recorded.</p>
            )}
          </div>

          <div className="bg-slate-900 text-white rounded-xl p-5 text-xs space-y-2">
            <div className="flex items-center gap-2 text-blue-300 font-semibold">
              <Info className="w-4 h-4" />
              <span>SYNAPSE 2026 HealthTech Note</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              AuthPilot AI assists prior-authorization coordination through explainable policy checks,
              structured document extraction, and audit retention while keeping decision authority in
              qualified hands.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default ClaimDetails;
