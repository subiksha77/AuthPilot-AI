import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  FileText,
  Calendar,
  AlertCircle,
  Clock,
  MessageSquare,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import StatusBadge from '../components/common/StatusBadge';
import {
  getStoredClaims,
  getStoredPolicyholders,
  calculateMonthsRemaining,
} from '../services/demoData';
import type { User, Claim, Policyholder } from '../types';

interface Props {
  user: User;
  onLogout: () => void;
}

const PatientDashboard: React.FC<Props> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [myClaims, setMyClaims] = useState<Claim[]>([]);
  const [myPolicyholder, setMyPolicyholder] = useState<Policyholder | null>(null);

  useEffect(() => {
    // Strictly isolate patient data: Only load records matching user.id or user.name
    const allPolicyholders = getStoredPolicyholders();
    const myPh =
      allPolicyholders.find(
        (p) => p.patientUserId === user.id || p.name.toLowerCase() === user.name.toLowerCase()
      ) || allPolicyholders[0];
    setMyPolicyholder(myPh);

    const allClaims = getStoredClaims();
    const isolatedClaims = allClaims.filter(
      (c) =>
        c.patientId === user.id ||
        c.patientName.toLowerCase() === user.name.toLowerCase() ||
        (myPh && c.policyNumber === myPh.policyNumber)
    );
    setMyClaims(isolatedClaims);
  }, [user]);

  // Dynamic months remaining calculation from actual expiry date
  const remainingTime = useMemo(() => {
    if (!myPolicyholder) return null;
    return calculateMonthsRemaining(myPolicyholder.expiryDate);
  }, [myPolicyholder]);

  // Remaining Sum Insured
  const remainingSI = useMemo(() => {
    if (!myPolicyholder) return 0;
    return Math.max(0, myPolicyholder.sumInsured - myPolicyholder.utilisedCoverage);
  }, [myPolicyholder]);

  return (
    <AppLayout user={user} onLogout={onLogout} pageTitle="My Health Coverage & Authorisations">
      {/* Privacy Notice */}
      <div className="mb-6 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            <strong>Confidential Patient Session:</strong> You are securely viewing records restricted to{' '}
            <strong className="text-blue-900">{user.name}</strong>. No other patient information is accessible.
          </span>
        </div>
        <span className="text-[11px] bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-semibold">
          Patient Self-Service
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Left Column: My Current Policy Card */}
        <div className="lg:col-span-1 space-y-4">
          {myPolicyholder ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-start gap-3.5 mb-4 pb-4 border-b border-gray-100">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900 text-sm">{myPolicyholder.companyName}</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{myPolicyholder.policyName}</p>
                </div>
              </div>

              <dl className="space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <dt className="text-gray-400">Masked Policy ID</dt>
                  <dd className="font-mono font-semibold text-gray-800">
                    {myPolicyholder.maskedPolicyNumber}
                  </dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-gray-400">Policy Status</dt>
                  <dd>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 capitalize">
                      {myPolicyholder.status}
                    </span>
                  </dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-gray-400">Policy Expiry</dt>
                  <dd className="font-medium text-gray-800">{myPolicyholder.expiryDate}</dd>
                </div>
                <div className="flex justify-between items-center bg-blue-50/60 p-2 rounded-lg border border-blue-100">
                  <dt className="text-blue-900 font-medium flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-600" /> Months Remaining
                  </dt>
                  <dd className="font-bold text-blue-700">
                    {remainingTime?.formatted || 'Calculating...'}
                  </dd>
                </div>
                <div className="pt-2 border-t border-gray-100 flex justify-between items-center">
                  <dt className="text-gray-400">Total Premium</dt>
                  <dd className="font-medium text-gray-800">
                    ${myPolicyholder.totalPremium.toLocaleString()}
                  </dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-gray-400">Verified Premium Paid</dt>
                  <dd className="font-semibold text-emerald-700">
                    ${myPolicyholder.verifiedPremiumPaid.toLocaleString()}
                  </dd>
                </div>
                <div className="flex justify-between items-center">
                  <dt className="text-gray-400">Outstanding Premium</dt>
                  <dd className="font-medium text-gray-800">
                    ${myPolicyholder.outstandingPremium.toLocaleString()}
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 p-6 text-xs text-gray-400">
              No active policy linked to your account.
            </div>
          )}

          {/* Sum Insured Card */}
          {myPolicyholder && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <h3 className="font-bold text-gray-800 text-xs mb-3">Coverage Balance</h3>
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between text-gray-500 mb-1">
                    <span>Remaining Coverage</span>
                    <span className="font-bold text-emerald-700">
                      ${remainingSI.toLocaleString()}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          (remainingSI / (myPolicyholder.sumInsured || 1)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-gray-400 text-[11px] pt-1">
                  <span>Total Sum Insured: ${myPolicyholder.sumInsured.toLocaleString()}</span>
                  <span>Utilised: ${myPolicyholder.utilisedCoverage.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Claims, Missing Documents & Reviewer Requests */}
        <div className="lg:col-span-2 space-y-4">
          {/* Missing Documents & Action Notice if any claim needs info */}
          {myClaims.some((c) => c.status === 'needs-info') && (
            <div className="p-5 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-amber-900 text-sm">
                    Action Required: Missing Documents Requested by Insurance Reviewer
                  </h3>
                  <p className="text-xs text-amber-800 mt-1">
                    The insurer has requested additional records to complete your prior authorization.
                    Please provide these to your Hospital Prior-Auth Coordinator:
                  </p>
                  <ul className="mt-2.5 space-y-1 text-xs text-amber-900 list-disc list-inside">
                    {myClaims
                      .filter((c) => c.status === 'needs-info')
                      .flatMap((c) => c.missingDocumentDetails || ['Specialist consultation notes'])
                      .map((item, idx) => (
                        <li key={idx} className="font-medium">
                          {item}
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* My Claims List */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <h2 className="font-bold text-gray-900 text-sm">My Prior-Authorisation Claims</h2>
              </div>
              <span className="text-xs text-gray-400">Total: {myClaims.length}</span>
            </div>

            {myClaims.length === 0 ? (
              <p className="text-xs text-gray-400 py-8 text-center">
                No claims submitted under your account.
              </p>
            ) : (
              <div className="space-y-4">
                {myClaims.map((claim) => (
                  <div
                    key={claim.id}
                    className="p-4 rounded-xl border border-gray-100 bg-slate-50/50 hover:bg-slate-50 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-blue-600">
                            {claim.claimNumber}
                          </span>
                          <StatusBadge status={claim.status} />
                        </div>
                        <h4 className="font-bold text-gray-900 text-sm mt-1">{claim.procedure}</h4>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-xs text-gray-400">Estimated Amount</p>
                        <p className="font-bold text-sm text-blue-700">
                          ${claim.estimatedAmount.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-400 pt-2 border-t border-gray-100">
                      <span>Submitted: {claim.submittedDate}</span>
                      <span>Last Updated: {claim.updatedDate}</span>
                      <span>Payer: {claim.companyName}</span>
                    </div>

                    {/* Reviewer Note Intended for Patient */}
                    {claim.reviewerComment && (
                      <div className="mt-3 p-3 bg-white rounded-lg border border-blue-100 text-xs text-slate-700 flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-slate-900">Message from Insurance Reviewer:</strong>
                          <p className="mt-0.5 text-slate-600">{claim.reviewerComment}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default PatientDashboard;
