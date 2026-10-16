import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import type { User } from '../../types';

interface Props {
  user: User;
  onLogout: () => void;
  pageTitle: string;
  children: React.ReactNode;
}

const AppLayout: React.FC<Props> = ({ user, onLogout, pageTitle, children }) => (
  <div className="flex min-h-screen bg-gray-50">
    <Sidebar user={user} onLogout={onLogout} />
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar user={user} pageTitle={pageTitle} />
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  </div>
);

export default AppLayout;
