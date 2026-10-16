import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter } from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import StatusBadge from '../components/common/StatusBadge';
import { getStoredClaims } from '../services/demoData';
import type { User, ClaimStatus, Claim } from '../types';

interface Props {
  user: User;
  onLogout: () => void;
}

const ALL_STATUSES: ClaimStatus[] = ['submitted', 'in-review', 'approved', 'rejected', 'needs-info'];

const Claims: React.FC<Props> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ClaimStatus | 'all'>('all');

  useEffect(() => {
    setClaims(getStoredClaims());
  }, []);

  const visible = claims.filter((c) => {
    const matchesQuery =
      c.claimNumber.toLowerCase().includes(query.toLowerCase()) ||
      c.patientName.toLowerCase().includes(query.toLowerCase()) ||
      c.procedure.toLowerCase().includes(query.toLowerCase()) ||
      c.companyName.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  return (
    <AppLayout user={user} onLogout={onLogout} pageTitle="Claims">
      <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
        ⚠️ <strong>Demo data.</strong> Claims shown are synthetic examples. No real insurance decisions are made here.
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search claim, patient, procedure, company..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ClaimStatus | 'all')}
            className="py-2 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="all">All Statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace('-', ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Claims ({visible.length})</h2>
        </div>
        {visible.length === 0 ? (
          <p className="text-gray-400 text-sm py-8 text-center">No claims match your search.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="pb-3 font-medium">Claim #</th>
                  <th className="pb-3 font-medium">Patient</th>
                  <th className="pb-3 font-medium">Procedure</th>
                  <th className="pb-3 font-medium">Company</th>
                  <th className="pb-3 font-medium">Est. Amount</th>
                  <th className="pb-3 font-medium">Submitted</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((claim) => (
                  <tr
                    key={claim.id}
                    onClick={() => navigate(`/claims/${claim.id}`)}
                    className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="py-3 font-mono text-xs text-blue-600">{claim.claimNumber}</td>
                    <td className="py-3 text-gray-700">{claim.patientName}</td>
                    <td className="py-3 text-gray-600">{claim.procedure}</td>
                    <td className="py-3 text-gray-500 text-xs">{claim.companyName}</td>
                    <td className="py-3 text-gray-700 font-medium">
                      ${claim.estimatedAmount.toLocaleString()}{' '}
                      <span className="text-xs text-gray-400 font-normal">(demo)</span>
                    </td>
                    <td className="py-3 text-gray-500">{claim.submittedDate}</td>
                    <td className="py-3">
                      <StatusBadge status={claim.status} />
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

export default Claims;
