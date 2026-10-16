import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ChevronRight, AlertCircle } from 'lucide-react';
import { DEMO_ACCOUNTS } from '../services/demoData';
import type { User } from '../types';

interface Props { onLogin: (user: User) => void; }

const ROLE_COLORS: Record<string, string> = {
  admin:       'border-blue-200 hover:border-blue-400 hover:bg-blue-50',
  coordinator: 'border-purple-200 hover:border-purple-400 hover:bg-purple-50',
  reviewer:    'border-amber-200 hover:border-amber-400 hover:bg-amber-50',
  patient:     'border-green-200 hover:border-green-400 hover:bg-green-50',
};

const ROLE_BADGE: Record<string, string> = {
  admin:       'bg-blue-100 text-blue-700',
  coordinator: 'bg-purple-100 text-purple-700',
  reviewer:    'bg-amber-100 text-amber-700',
  patient:     'bg-green-100 text-green-700',
};

const Login: React.FC<Props> = ({ onLogin }) => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (account: typeof DEMO_ACCOUNTS[0]) => {
    onLogin(account as User);
    const dest: Record<string, string> = {
      admin: '/admin', coordinator: '/coordinator', reviewer: '/reviewer', patient: '/patient',
    };
    navigate(dest[account.role] ?? '/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500 mb-4 shadow-lg shadow-blue-500/30">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">AuthPilot AI</h1>
          <p className="text-blue-200 mt-2 text-sm">Explainable Prior Authorisation Assistant</p>
        </div>

        {/* Demo notice */}
        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-200">
            <strong>Demo Mode.</strong> Select a role below to explore the interface. All data shown is synthetic and does not represent real patients, insurance companies, or coverage decisions.
          </div>
        </div>

        {/* Role cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.id}
              onClick={() => setSelected(account.id)}
              className={`text-left p-5 rounded-xl border-2 bg-white transition-all ${ROLE_COLORS[account.role]} ${selected === account.id ? 'ring-2 ring-offset-2 ring-blue-400 ring-offset-transparent' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${ROLE_BADGE[account.role]}`}>
                  {account.role === 'admin' ? 'Hospital Admin' : account.role === 'coordinator' ? 'Coordinator' : account.role === 'reviewer' ? 'Ins. Reviewer' : 'Patient'}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
              <p className="font-semibold text-gray-800 text-sm">{account.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{account.organization}</p>
              <p className="text-xs text-gray-400 mt-2 leading-relaxed">{account.description}</p>
            </button>
          ))}
        </div>

        {selected && (
          <button
            onClick={() => {
              const acc = DEMO_ACCOUNTS.find(a => a.id === selected);
              if (acc) handleSelect(acc);
            }}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors shadow-lg shadow-blue-600/30"
          >
            Enter as {DEMO_ACCOUNTS.find(a => a.id === selected)?.name} →
          </button>
        )}
      </div>
    </div>
  );
};

export default Login;
