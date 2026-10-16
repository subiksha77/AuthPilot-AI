import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Building2,
  ShieldCheck,
  LogOut,
  ChevronRight,
  UploadCloud,
} from 'lucide-react';
import type { User } from '../../types';

interface Props {
  user: User;
  onLogout: () => void;
}

const NAV_ITEMS = {
  admin: [
    { to: '/admin', label: 'Hospital Dashboard', icon: LayoutDashboard },
    { to: '/companies', label: 'Companies & Policies', icon: Building2 },
    { to: '/claims', label: 'Claims Registry', icon: FileText },
  ],
  coordinator: [
    { to: '/coordinator', label: 'Coordinator Dashboard', icon: LayoutDashboard },
    { to: '/companies', label: 'Companies & Policies', icon: Building2 },
    { to: '/claims', label: 'Claims Pipeline', icon: FileText },
  ],
  reviewer: [
    { to: '/reviewer', label: 'Insurance Review Queue', icon: LayoutDashboard },
    { to: '/claims', label: 'All Claims', icon: FileText },
  ],
  patient: [
    { to: '/patient', label: 'My Health Coverage', icon: LayoutDashboard },
    { to: '/claims', label: 'My Claims & History', icon: FileText },
  ],
};

const Sidebar: React.FC<Props> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const items = NAV_ITEMS[user.role] ?? [];

  const handleLogout = () => {
    onLogout();
    navigate('/');
  };

  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-white flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center shadow-md shadow-blue-500/20">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-none text-white">AuthPilot AI</p>
            <p className="text-[11px] text-slate-400 mt-1">Prior Auth Assistant</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="px-4 py-4 border-b border-slate-800">
        <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700/60">
          <p className="text-xs font-bold text-white truncate">{user.name}</p>
          <p className="text-[11px] text-slate-400 truncate mt-0.5">{user.organization}</p>
          <span className="mt-2 inline-block text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-semibold uppercase tracking-wider">
            {user.role}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1 truncate">{label}</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-40" />
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
