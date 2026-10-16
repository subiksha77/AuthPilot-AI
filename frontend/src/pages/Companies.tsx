import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  ChevronRight,
  Search,
  RotateCcw,
  ShieldCheck,
  FileText,
  UserCheck,
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import {
  DEMO_COMPANIES,
  getStoredPolicyholders,
} from '../services/demoData';
import type { User, Company, Policyholder } from '../types';

interface Props {
  user: User;
  onLogout: () => void;
}

const Companies: React.FC<Props> = ({ user, onLogout }) => {
  const navigate = useNavigate();

  const [companies] = useState<Company[]>(DEMO_COMPANIES);
  const [selectedCompany, setSelectedCompany] = useState<Company>(DEMO_COMPANIES[0]);

  // Search fields
  const [policyIdInput, setPolicyIdInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<Policyholder[]>([]);

  // Initial load: show all policyholders for the selected company
  useEffect(() => {
    loadCompanyPolicyholders(selectedCompany.id);
  }, [selectedCompany]);

  const loadCompanyPolicyholders = (compId: string) => {
    setIsLoading(true);
    setHasSearched(false);
    setTimeout(() => {
      const all = getStoredPolicyholders();
      const filtered = all.filter((ph) => ph.companyId === compId);
      setSearchResults(filtered);
      setIsLoading(false);
    }, 200);
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setHasSearched(true);

    setTimeout(() => {
      const all = getStoredPolicyholders();
      const results = all.filter((ph) => {
        if (ph.companyId !== selectedCompany.id) return false;
        const matchesPolicyId =
          !policyIdInput.trim() ||
          ph.policyNumber.toLowerCase().includes(policyIdInput.trim().toLowerCase()) ||
          ph.policyId.toLowerCase().includes(policyIdInput.trim().toLowerCase());
        const matchesName =
          !nameInput.trim() ||
          ph.name.toLowerCase().includes(nameInput.trim().toLowerCase());
        return matchesPolicyId && matchesName;
      });
      setSearchResults(results);
      setIsLoading(false);
    }, 250);
  };

  const handleClear = () => {
    setPolicyIdInput('');
    setNameInput('');
    loadCompanyPolicyholders(selectedCompany.id);
  };

  return (
    <AppLayout user={user} onLogout={onLogout} pageTitle="Insurance Companies & Policies">
      {/* Synthetic Demo Banner */}
      <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong>Synthetic Demo Insurance Catalogs:</strong> Payer entities and policies are mock
          datasets created for SYNAPSE 2026 PS-011. Do not use real policy numbers, patient names, or
          proprietary health plans.
        </div>
      </div>

      {/* Main Grid: Companies list on Left, Search Workspace on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Companies Selection Cards */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">
              Insurance Companies ({companies.length})
            </h2>
            <span className="text-xs text-gray-400">Select to browse</span>
          </div>

          <div className="space-y-2.5">
            {companies.map((c) => {
              const isSelected = selectedCompany.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedCompany(c);
                    setPolicyIdInput('');
                    setNameInput('');
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/60 shadow-sm ring-1 ring-blue-500'
                      : 'border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {c.logoBadge || c.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-sm text-gray-900 truncate">{c.name}</p>
                        <ChevronRight
                          className={`w-4 h-4 shrink-0 transition-transform ${
                            isSelected ? 'text-blue-600 translate-x-0.5' : 'text-gray-300'
                          }`}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{c.tagline}</p>
                      <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-400">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                          {c.activePolices} Active Policies
                        </span>
                        <span>{c.contactPhone}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Company's Policyholder Search Workspace */}
        <div className="lg:col-span-8 space-y-5">
          {/* Company Workspace Header */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{selectedCompany.name}</h2>
                  <p className="text-xs text-gray-500">
                    Policyholder Directory & Pre-Authorisation Gateway
                  </p>
                </div>
              </div>
              <span className="text-xs bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200 font-semibold self-start sm:self-auto">
                Authorized Payer Endpoint
              </span>
            </div>

            {/* Privacy & Identity Note */}
            <div className="mb-5 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-start gap-2.5">
              <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <strong>Privacy & Security Boundary:</strong> Searching by Policy ID and Name does not
                constitute formal proof of identity. Detailed clinical coverage, sum insured limits, and
                document upload features are accessible only within the verified policyholder profile.
              </div>
            </div>

            {/* Prominent Policyholder Search Bar */}
            <form onSubmit={handleSearch} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Policy ID / Reference Number
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="e.g. POL-STAR-2024-8841"
                      value={policyIdInput}
                      onChange={(e) => setPolicyIdInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Policyholder Full Name
                  </label>
                  <div className="relative">
                    <UserCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="e.g. Alex Johnson or Priya Sharma"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-gray-400">
                  Search by Policy ID, Name, or both combined.
                </p>
                <div className="flex items-center gap-2">
                  {(policyIdInput || nameInput || hasSearched) && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg text-xs font-medium transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Clear
                    </button>
                  )}
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm shadow-blue-600/20"
                  >
                    <Search className="w-3.5 h-3.5" /> Search Policyholder
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Search Results Table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-gray-900 text-sm">
                  Matching Policy Records ({searchResults.length})
                </h3>
                <p className="text-xs text-gray-400">
                  Select "View Profile" to inspect verified policy coverage and upload claim documents.
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="py-12 text-center text-gray-400 text-sm">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Querying authorized policy records...
              </div>
            ) : searchResults.length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-sm">
                <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="font-semibold text-gray-600">No policyholder records found</p>
                <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                  No matching policy was found under {selectedCompany.name} matching your search
                  criteria. Try clearing your filters or testing with a demo policy name.
                </p>
                <button
                  onClick={handleClear}
                  className="mt-4 px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium"
                >
                  Show All Policyholders
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                      <th className="pb-3 font-medium">Policy ID</th>
                      <th className="pb-3 font-medium">Policyholder Name</th>
                      <th className="pb-3 font-medium">Insurance Company</th>
                      <th className="pb-3 font-medium">Policy Name</th>
                      <th className="pb-3 font-medium">Policy Status</th>
                      <th className="pb-3 font-medium">Verification Status</th>
                      <th className="pb-3 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {searchResults.map((record) => (
                      <tr
                        key={record.id}
                        className="hover:bg-blue-50/30 transition-colors cursor-pointer"
                        onClick={() =>
                          navigate(`/companies/${selectedCompany.id}/policyholder/${record.policyId}`)
                        }
                      >
                        <td className="py-3.5 font-mono text-xs text-blue-600 font-semibold">
                          {record.policyNumber}
                        </td>
                        <td className="py-3.5 font-medium text-gray-800">{record.name}</td>
                        <td className="py-3.5 text-xs text-gray-500">{record.companyName}</td>
                        <td className="py-3.5 text-xs text-gray-700 font-medium">
                          {record.policyName}
                        </td>
                        <td className="py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                              record.status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {record.status}
                          </span>
                        </td>
                        <td className="py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              record.verificationStatus === 'verified'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {record.verificationStatus === 'verified' ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified
                              </>
                            ) : (
                              'Pending Verification'
                            )}
                          </span>
                        </td>
                        <td className="py-3.5 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(
                                `/companies/${selectedCompany.id}/policyholder/${record.policyId}`
                              );
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
                          >
                            <span>View Profile</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default Companies;
