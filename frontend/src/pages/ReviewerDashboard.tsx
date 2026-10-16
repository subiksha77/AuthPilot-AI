import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  MessageSquare,
  Clock3,
  AlertCircle,
  FileText,
  ShieldCheck,
  AlertTriangle,
  History,
  Info,
  ExternalLink,
  ChevronRight,
  Check,
  X,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import {
  getStoredClaims,
  getStoredAudit,
  addAuditEvent,
  saveClaims,
} from '../services/demoData';
import { api } from '../services/api';
import type { User, Claim, AuditEvent } from '../types';

interface Props {
  user: User;
  onLogout: () => void;
}

type ActionModalType = 'approve' | 'reject' | 'request-info' | null;

const ReviewerDashboard: React.FC<Props> = ({ user, onLogout }) => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([]);

  // Decision Modal State
  const [modalType, setModalType] = useState<ActionModalType>(null);
  const [decisionReason, setDecisionReason] = useState('');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);
  const [reasonError, setReasonError] = useState<string | null>(null);

  // Load claims on mount
  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    const allClaims = getStoredClaims();
    setClaims(allClaims);

    // Default select first pending claim if none selected
    if (!selectedClaim && allClaims.length > 0) {
      const pending = allClaims.find(
        (c) => c.status === 'submitted' || c.status === 'in-review' || c.status === 'needs-info'
      );
      setSelectedClaim(pending || allClaims[0]);
    } else if (selectedClaim) {
      const updated = allClaims.find((c) => c.id === selectedClaim.id);
      if (updated) setSelectedClaim(updated);
    }

    setAuditEvents(getStoredAudit());
  };

  const queueClaims = claims.filter(
    (c) => c.status === 'submitted' || c.status === 'in-review' || c.status === 'needs-info'
  );

  const handleOpenModal = (type: ActionModalType) => {
    setModalType(type);
    setReasonError(null);
    setDecisionReason('');
  };

  const handleCloseModal = () => {
    setModalType(null);
    setDecisionReason('');
    setReasonError(null);
  };

  const handleConfirmDecision = async () => {
    if (!selectedClaim || !modalType) return;

    if (!decisionReason.trim()) {
      setReasonError('A detailed clinical reason / justification is required for this decision.');
      return;
    }

    setIsSubmittingDecision(true);
    setReasonError(null);

    const statusMap = {
      approve: 'approved' as const,
      reject: 'rejected' as const,
      'request-info': 'needs-info' as const,
    };

    try {
      await api.recordReviewDecision(
        selectedClaim.id,
        statusMap[modalType],
        decisionReason.trim(),
        user.name
      );

      setNotificationMsg(
        `Decision "${statusMap[modalType].toUpperCase()}" successfully recorded for claim ${selectedClaim.claimNumber}.`
      );
      handleCloseModal();
      refreshData();

      setTimeout(() => {
        setNotificationMsg(null);
      }, 5000);
    } catch (err) {
      setReasonError('Failed to record decision. Please retry.');
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  // Filter audit history for current claim
  const claimAudit = selectedClaim
    ? auditEvents.filter((a) => a.claimId === selectedClaim.id)
    : [];

  return (
    <AppLayout user={user} onLogout={onLogout} pageTitle="Insurance Review Queue">
      {/* Synthetic Demo Banner */}
      <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            <strong>Demo Insurance Reviewer Workspace:</strong> Decisions recorded here update the
            synthetic audit trail and patient status in real time.
          </span>
        </div>
      </div>

      {notificationMsg && (
        <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-300 rounded-xl text-sm text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Review Queue"
          value={queueClaims.length}
          icon={Clock3}
          color="blue"
          subtitle="Pending medical adjudication"
        />
        <StatCard
          title="Needs Information"
          value={claims.filter((c) => c.status === 'needs-info').length}
          icon={AlertCircle}
          color="yellow"
          subtitle="Clarification requested"
        />
        <StatCard
          title="Decisions Completed"
          value={claims.filter((c) => c.status === 'approved' || c.status === 'rejected').length}
          icon={CheckCircle2}
          color="green"
          subtitle="Approved or adjudicated"
        />
      </div>

      {/* Main Two-Column Layout: Queue on Left, Full Review Dossier on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Review Queue (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Claims Awaiting Action ({queueClaims.length})
            </h2>
            <span className="text-xs text-gray-400">Select to review</span>
          </div>

          <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
            {queueClaims.map((claim) => {
              const isSelected = selectedClaim?.id === claim.id;
              return (
                <div
                  key={claim.id}
                  onClick={() => setSelectedClaim(claim)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/60 shadow-sm ring-1 ring-blue-500'
                      : 'border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-mono font-semibold text-blue-600">
                      {claim.claimNumber}
                    </span>
                    <StatusBadge status={claim.status} />
                  </div>
                  <p className="font-bold text-sm text-gray-900">{claim.patientName}</p>
                  <p className="text-xs text-gray-600 mt-0.5 truncate">{claim.procedure}</p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 text-[11px] text-gray-400">
                    <span>{claim.companyName}</span>
                    <span className="font-semibold text-gray-700">
                      ${claim.estimatedAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}

            {queueClaims.length === 0 && (
              <div className="p-8 text-center bg-white rounded-xl border border-gray-100 text-gray-400 text-xs">
                All claims in your assigned queue have been adjudicated!
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Detailed Adjudication Workspace (8 cols) */}
        <div className="lg:col-span-8">
          {selectedClaim ? (
            <div className="space-y-6">
              {/* Claim Header Card */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-gray-100 pb-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs bg-slate-100 px-2.5 py-0.5 rounded text-slate-700 font-semibold">
                        {selectedClaim.claimNumber}
                      </span>
                      <StatusBadge status={selectedClaim.status} />
                    </div>
                    <h1 className="text-xl font-bold text-gray-900 mt-1.5">
                      {selectedClaim.procedure}
                    </h1>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Patient: <strong className="text-gray-800">{selectedClaim.patientName}</strong> ·{' '}
                      Payer: <span className="font-medium">{selectedClaim.companyName}</span>
                    </p>
                  </div>

                  <div className="text-right sm:self-center">
                    <p className="text-xs text-gray-400">Estimated Eligible Amount</p>
                    <p className="text-xl font-bold text-blue-700">
                      $
                      {(
                        selectedClaim.eligibleAmount || selectedClaim.estimatedAmount
                      ).toLocaleString()}{' '}
                      <span className="text-xs text-gray-400 font-normal">(demo est.)</span>
                    </p>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <p className="text-gray-400">Diagnosis Code</p>
                    <p className="font-semibold text-gray-800 mt-0.5 font-mono">
                      {selectedClaim.diagnosisCode}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Policy Reference</p>
                    <p className="font-semibold text-gray-800 mt-0.5 font-mono">
                      {selectedClaim.policyNumber}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Submitted On</p>
                    <p className="font-semibold text-gray-800 mt-0.5">
                      {selectedClaim.submittedDate}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Assigned Reviewer</p>
                    <p className="font-semibold text-gray-800 mt-0.5">
                      {selectedClaim.assignedReviewer || user.name}
                    </p>
                  </div>
                </div>

                {selectedClaim.reviewerComment && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900">
                    <strong>Logged Reviewer Note:</strong> {selectedClaim.reviewerComment}
                  </div>
                )}
              </div>

              {/* AI Advisory Disclaimer */}
              <div className="p-4 bg-slate-900 text-white rounded-xl text-xs flex items-start gap-3 shadow-sm">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Explainable AI Decision Support:</strong> The criteria evaluation and evidence
                  extractions below are advisory insights prepared to accelerate review. The qualified
                  human medical reviewer retains sole authority for the final authorization decision.
                </div>
              </div>

              {/* Policy Criteria Engine & Evidence Traceability */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-gray-900 text-sm">
                      Policy Criteria Evaluation & Traceable Evidence
                    </h3>
                  </div>
                  <span className="text-[11px] text-gray-400">Verified Payer Policy Schedule</span>
                </div>

                {selectedClaim.criteriaResults && selectedClaim.criteriaResults.length > 0 ? (
                  <div className="space-y-3">
                    {selectedClaim.criteriaResults.map((crit) => (
                      <div
                        key={crit.id}
                        className={`p-3.5 rounded-xl border text-xs ${
                          crit.status === 'supported'
                            ? 'bg-emerald-50/50 border-emerald-200'
                            : crit.status === 'missing'
                            ? 'bg-red-50/50 border-red-200'
                            : 'bg-amber-50/50 border-amber-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-1.5">
                          <p className="font-bold text-gray-900 text-xs flex-1">
                            {crit.requirement}
                          </p>
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase shrink-0 ${
                              crit.status === 'supported'
                                ? 'bg-emerald-100 text-emerald-800'
                                : crit.status === 'missing'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {crit.status}
                          </span>
                        </div>

                        {crit.evidenceExcerpt && (
                          <div className="mt-2 p-2 bg-white/80 rounded border border-gray-200/60 font-mono text-[11px] text-slate-800">
                            <span className="font-sans font-bold text-slate-600 text-[10px] block mb-0.5">
                              Extracted Clinical Excerpt{' '}
                              {crit.sourceDocument && `(${crit.sourceDocument}, Page ${crit.sourcePage || 1})`}:
                            </span>
                            "{crit.evidenceExcerpt}"
                          </div>
                        )}

                        <p className="text-gray-600 mt-2 text-[11px] leading-relaxed">
                          <strong>Advisory Rationale:</strong> {crit.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 py-3">
                    No automated criteria results generated. Adjudicate manually using attached documents.
                  </p>
                )}
              </div>

              {/* Uploaded Clinical Documents */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-gray-900 text-sm">
                      Attached Clinical Documents ({selectedClaim.documents?.length || 0})
                    </h3>
                  </div>
                  <span className="text-[11px] text-gray-400">PDF, JPG, PNG Support</span>
                </div>

                {selectedClaim.documents && selectedClaim.documents.length > 0 ? (
                  <div className="divide-y divide-gray-100">
                    {selectedClaim.documents.map((doc) => (
                      <div key={doc.id} className="py-3 flex items-start justify-between gap-4">
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
                                "{doc.extractedSnippet}" (Page {doc.sourcePage || 1})
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 py-4 text-center">
                    No documents uploaded with this claim yet.
                  </p>
                )}
              </div>

              {/* Decision Action Buttons */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <h3 className="font-bold text-gray-900 text-sm mb-3">Record Authorization Determination</h3>
                <p className="text-xs text-gray-500 mb-4">
                  Reviewers must provide a clinical reason for all approvals, rejections, or document requests.
                </p>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => handleOpenModal('approve')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve Prior-Authorisation
                  </button>

                  <button
                    onClick={() => handleOpenModal('request-info')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                  >
                    <MessageSquare className="w-4 h-4" /> Request Additional Documents
                  </button>

                  <button
                    onClick={() => handleOpenModal('reject')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                  >
                    <XCircle className="w-4 h-4" /> Reject Claim
                  </button>
                </div>
              </div>

              {/* Audit Timeline */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-100">
                  <History className="w-5 h-5 text-gray-600" />
                  <h3 className="font-bold text-gray-900 text-sm">Case Audit History</h3>
                </div>

                {claimAudit.length > 0 ? (
                  <div className="space-y-3">
                    {claimAudit.map((item) => (
                      <div key={item.id} className="flex items-start gap-3 text-xs">
                        <div className="w-2 h-2 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                        <div>
                          <p className="font-semibold text-gray-800">
                            {item.action}{' '}
                            <span className="font-normal text-gray-400">by {item.actor} ({item.role})</span>
                          </p>
                          <p className="text-gray-500 mt-0.5">{item.details}</p>
                          <span className="text-[10px] text-gray-400">{item.timestamp}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">No previous audit entries logged for this claim.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400 text-sm">
              Select a claim from the queue to start review.
            </div>
          )}
        </div>
      </div>

      {/* Decision Modal Requiring Mandatory Clinical Reason */}
      {modalType && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h3 className="font-bold text-gray-900 text-base">
                {modalType === 'approve'
                  ? 'Approve Prior-Authorisation'
                  : modalType === 'reject'
                  ? 'Reject Prior-Authorisation'
                  : 'Request Additional Documentation'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-gray-600">
                You are recording a determination for claim{' '}
                <strong className="text-gray-800 font-mono">{selectedClaim?.claimNumber}</strong> (
                {selectedClaim?.patientName} — {selectedClaim?.procedure}).
              </p>

              <div>
                <label className="block font-bold text-gray-700 mb-1.5">
                  Clinical Reason / Adjudication Justification *
                </label>
                <textarea
                  rows={4}
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  placeholder={
                    modalType === 'approve'
                      ? 'State the supporting evidence, policy schedule compliance, and authorized cashless amount...'
                      : modalType === 'reject'
                      ? 'State the specific policy exclusion clause or waiting period rationale...'
                      : 'Specify the exact missing diagnostic test, consultant note, or operative report required from the hospital...'
                  }
                  className="w-full text-xs border border-gray-200 rounded-lg p-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {reasonError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs">
                  {reasonError}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDecision}
                  disabled={isSubmittingDecision}
                  className={`px-5 py-2 rounded-lg text-xs font-bold text-white transition-all ${
                    modalType === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : modalType === 'reject'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-amber-500 hover:bg-amber-600'
                  }`}
                >
                  {isSubmittingDecision ? 'Recording...' : 'Confirm & Save Decision'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};

export default ReviewerDashboard;
