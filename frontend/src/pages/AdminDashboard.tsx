import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock3,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Building2,
  Lock,
  ChevronRight,
  Search,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import AppLayout from '../components/layout/AppLayout';
import StatCard from '../components/common/StatCard';
import StatusBadge from '../components/common/StatusBadge';
import { getStoredClaims, DEMO_COMPANIES } from '../services/demoData';
import type { User, Claim } from '../types';

interface Props {
  user: User;
  onLogout: () => void;
}

const chartData = [
  { month: 'Jun', approved: 22, rejected: 4, pending: 11 },
  { month: 'Jul', approved: 31, rejected: 6, pending: 14 },
  { month: 'Aug', approved: 28, rejected: 3, pending: 9 },
  { month: 'Sep', approved: 35, rejected: 5, pending: 18 },
  { month: 'Oct', approved: 14, rejected: 2, pending: 8 },
];

const AdminDashboard: React.FC<Props> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [claims, setClaims] = useState<Claim[]>([]);

  useEffect(() => {
    setClaims(getStoredClaims());
  }, []);

  const stats = useMemo(
    () => ({
      total: claims.length,
      pending: claims.filter((c) => c.status === 'in-review' || c.status === 'submitted').length,
      approved: claims.filter((c) => c.status === 'approved').length,
      attention: claims.filter((c) => c.status === 'needs-info' || c.status === 'rejected').length,
    }),
    [claims]
  );

  return (
    <AppLayout user={user} onLogout={onLogout} pageTitle="Hospital Administration Dashboard">
      {/* Read-Only Indicator Banner */}
      <div className="mb-6 px-4 py-3 bg-slate-100 border border-slate-300 rounded-xl text-xs text-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-slate-600 shrink-0" />
          <span>
            <strong>Hospital Administrator (Read-Only Mode):</strong> You have oversight of all
            partner policies, claim statistics, and audit trails. Document upload and claim decisions
            are restricted to Coordinators and Reviewers.
          </span>
        </div>
        <button
          onClick={() => navigate('/companies')}
          className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-200 border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 transition-colors"
        >
          <Search className="w-3.5 h-3.5" /> Browse Policies
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total Claims"
          value={stats.total}
          icon={FileText}
          color="blue"
          subtitle="Hospital prior-auth volume"
        />
        <StatCard
          title="Pending Review"
          value={stats.pending}
          icon={Clock3}
          color="yellow"
          subtitle="Awaiting insurer adjudication"
        />
        <StatCard
          title="Approved"
          value={stats.approved}
          icon={CheckCircle2}
          color="green"
          trend="+3 this week"
        />
        <StatCard
          title="Needs Attention"
          value={stats.attention}
          icon={AlertTriangle}
          color="red"
          subtitle="Needs info or rejected"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="xl:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            <h2 className="font-semibold text-gray-800">Prior-Authorisation Volume (Demo Figures)</h2>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ left: -20 }}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="approved" fill="#22c55e" name="Approved" radius={[3, 3, 0, 0]} />
              <Bar dataKey="pending" fill="#f59e0b" name="Pending" radius={[3, 3, 0, 0]} />
              <Bar dataKey="rejected" fill="#ef4444" name="Rejected" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Insurance Partners Card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-gray-800">Insurance Partners</h2>
            </div>
            <button
              onClick={() => navigate('/companies')}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              Search
            </button>
          </div>
          <div className="space-y-3">
            {DEMO_COMPANIES.map((c) => (
              <div
                key={c.id}
                onClick={() => navigate('/companies')}
                className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 hover:bg-slate-50 cursor-pointer rounded px-1 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800">{c.name}</p>
                  <p className="text-xs text-gray-400">{c.activePolices} active policies</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent claims */}
      <div className="mt-6 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Hospital Claims Registry</h2>
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
                <th className="pb-3 font-medium">Procedure</th>
                <th className="pb-3 font-medium">Amount (Est.)</th>
                <th className="pb-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {claims.slice(0, 5).map((claim) => (
                <tr
                  key={claim.id}
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/claims/${claim.id}`)}
                >
                  <td className="py-3 font-mono text-xs text-blue-600">{claim.claimNumber}</td>
                  <td className="py-3 text-gray-700">{claim.patientName}</td>
                  <td className="py-3 text-gray-600">{claim.procedure}</td>
                  <td className="py-3 text-gray-700">
                    ${claim.estimatedAmount.toLocaleString()}{' '}
                    <span className="text-xs text-gray-400">(demo)</span>
                  </td>
                  <td className="py-3">
                    <StatusBadge status={claim.status} />
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

export default AdminDashboard;
