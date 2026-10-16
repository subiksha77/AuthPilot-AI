import React from 'react';
import { Bell, Search } from 'lucide-react';
import type { User } from '../../types';

interface Props { user: User; pageTitle: string; }

const Topbar: React.FC<Props> = ({ user, pageTitle }) => (
  <header className="h-16 bg-white border-b border-gray-100 flex items-center px-6 gap-4 sticky top-0 z-10">
    <h1 className="text-lg font-semibold text-gray-800 flex-1">{pageTitle}</h1>

    <div className="relative hidden md:block">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
      <input
        type="text"
        placeholder="Quick search..."
        className="pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg w-56 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>

    <button className="relative p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
      <Bell className="w-5 h-5" />
      <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
    </button>

    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
      {user.name.charAt(0)}
    </div>
  </header>
);

export default Topbar;
