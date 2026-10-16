import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import CoordinatorDashboard from './pages/CoordinatorDashboard';
import ReviewerDashboard from './pages/ReviewerDashboard';
import PatientDashboard from './pages/PatientDashboard';
import Companies from './pages/Companies';
import PolicyholderProfile from './pages/PolicyholderProfile';
import Claims from './pages/Claims';
import ClaimDetails from './pages/ClaimDetails';
import type { User } from './types';

const ROLE_HOME: Record<string, string> = {
  admin: '/admin',
  coordinator: '/coordinator',
  reviewer: '/reviewer',
  patient: '/patient',
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);

  const handleLogout = () => setUser(null);

  if (!user) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/*" element={<Login onLogin={setUser} />} />
        </Routes>
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={ROLE_HOME[user.role] ?? '/'} replace />} />
        <Route path="/admin" element={<AdminDashboard user={user} onLogout={handleLogout} />} />
        <Route
          path="/coordinator"
          element={<CoordinatorDashboard user={user} onLogout={handleLogout} />}
        />
        <Route
          path="/reviewer"
          element={<ReviewerDashboard user={user} onLogout={handleLogout} />}
        />
        <Route
          path="/patient"
          element={<PatientDashboard user={user} onLogout={handleLogout} />}
        />
        <Route
          path="/companies"
          element={<Companies user={user} onLogout={handleLogout} />}
        />
        <Route
          path="/companies/:companyId/policyholder/:policyId"
          element={<PolicyholderProfile user={user} onLogout={handleLogout} />}
        />
        <Route
          path="/companies/policyholder/:policyId"
          element={<PolicyholderProfile user={user} onLogout={handleLogout} />}
        />
        <Route path="/claims" element={<Claims user={user} onLogout={handleLogout} />} />
        <Route path="/claims/:id" element={<ClaimDetails user={user} onLogout={handleLogout} />} />
        <Route path="*" element={<Navigate to={ROLE_HOME[user.role] ?? '/'} replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
