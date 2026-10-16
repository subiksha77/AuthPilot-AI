import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock3,
  AlertCircle,
  CheckCircle2,
  Search,
  ArrowRight,
  ShieldCheck,
  PlusCircle,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import { getStoredClaims } from '../services/demoData';
import type { User, Claim } from '../types';

interface Props {
  user: User;
  onLogout: () => void;
}

const CoordinatorDashboard: React.FC<Props> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [claims, setClaims] = useState<Claim[]>([]);

  useEffect(() => {
    setClaims(getStoredClaims());
  }, []);

  const assignedCasesCount = claims.length;
  const missingDocsCount = claims.filter((c) => c.status === 'needs-info').length;
  const readyToSubmitCount = claims.filter(
    (c) => c.status === 'needs-info' && c.documents && c.documents.length > 0
  ).length || 1;
  const awaitingReviewCount = claims.filter(
    (c) => c.status === 'submitted' || c.status === 'in-review'
  ).length;

  return (
    <AppLayout user={user} onLogout={onLogout} pageTitle="Coordinator Dashboard">
      {/* Synthetic Demo Banner */}
      <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span>
            <strong>Prior-Authorisation Coordination Workspace:</strong> Search policy records by
            insurance company to attach clinical documents and submit requests.
          </span>
        </div>
      </div>

      {/* Prominent Action Banner to navigate to Companies & Policies */}
      <div className="mb-8 p-6 bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 text-xs font-semibold">
              New Workflow Active
            </span>
          </div>
          <h2 className="text-xl font-bold">Initiate Prior-Authorisation Request</h2>
          <p className="text-blue-200 text-sm max-w-xl">
            Select an insurance partner, search the patient's verified policyholder profile, attach
            supporting clinical evidence, and submit for payer review.
          </p>
        </div>

        <button
          onClick={() => navigate('/companies')}
          className="inline-flex items-center gap-2.5 px-5 py-3 bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-blue-500/25 shrink-0 self-start md:self-center cursor-pointer"
        >
          <Search className="w-4 h-4" />
          <span>Find Policy & Upload Documents</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* 4 Required Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Assigned Cases"
          value={assignedCasesCount}
          icon={FileText}
          color="blue"
          subtitle="Hospital prior-auth caseload"
        />
        <StatCard
          title="Missing Documents"
          value={missingDocsCount}
          icon={AlertCircle}
          color="red"
          subtitle="Awaiting clinical notes or reports"
        />
        <StatCard
          title="Ready to Submit"
          value={readyToSubmitCount}
          icon={CheckCircle2}
          color="green"
          subtitle="Dossier compiled with docs"
        />
        <StatCard
          title="Claims Awaiting Review"
          value={awaitingReviewCount}
          icon={Clock3}
          color="yellow"
          subtitle="Under insurer medical review"
        />
      </div>

      {/* Claims Requiring Action Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-800">Claims Requiring Coordinator Action</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Click any claim to open the details view or inspect reviewer requests.
            </p>
          </div>
          <button
            onClick={() => navigate('/claims')}
            className="text-sm text-blue-600 hover:underline font-medium"
          >
            View all ({claims.length})
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                <th className="pb-3 font-medium">Claim #</th>
                <th className="pb-3 font-medium">Patient</th>
                <th className="pb-3 font-medium">Insurance Company</th>
                <th className="pb-3 font-medium">Procedure</th>
                <th className="pb-3 font-medium">Submitted</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {claims.map((claim) => (
                <tr
                  key={claim.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/claims/${claim.id}`)}
                >
                  <td className="py-3.5 font-mono text-xs text-blue-600 font-semibold">
                    {claim.claimNumber}
                  </td>
                  <td className="py-3.5 font-medium text-gray-800">{claim.patientName}</td>
                  <td className="py-3.5 text-xs text-gray-500">{claim.companyName}</td>
                  <td className="py-3.5 text-gray-700">{claim.procedure}</td>
                  <td className="py-3.5 text-gray-500 text-xs">{claim.submittedDate}</td>
                  <td className="py-3.5">
                    <StatusBadge status={claim.status} />
                  </td>
                  <td className="py-3.5 text-right">
                    <span className="text-xs text-blue-600 font-semibold hover:underline">
                      Review Case →
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
};

export default CoordinatorDashboard;
