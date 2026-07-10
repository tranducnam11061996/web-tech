'use client';

import { BellRing, LogOut, Menu, Monitor } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type AdminUser = { name: string; email: string; role: string };

export function Header() {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    fetch('/api/admin/auth/me')
      .then(async (response) => response.ok ? (await response.json()).data as AdminUser : null)
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  const logout = async () => {
    await fetch('/api/admin/auth/logout', { method: 'POST', headers: { Origin: window.location.origin } });
    router.replace('/login');
    router.refresh();
  };

  return (
    <header className="h-16 glass-panel border-b border-gray-800/50 flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="w-56 flex items-center gap-3">
        <Menu className="h-5 w-5 text-gray-400 cursor-pointer hover:text-white transition-colors lg:hidden" />
        <Link href="/" className="text-red-500 font-black text-2xl flex items-baseline tracking-tighter glow-text-red">
          HA<span className="text-white">COM</span>
          <span className="text-[10px] text-red-500/70 ml-1 font-mono tracking-widest uppercase">Admin</span>
        </Link>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-900/50 border border-gray-800">
          <Monitor className="h-3.5 w-3.5 text-blue-400" />
          <span className="text-xs font-mono text-gray-400">SESSION_SECURED</span>
        </div>
        <button type="button" className="relative p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-800/50" aria-label="Thong bao">
          <BellRing className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-3 border-l border-gray-800 pl-6">
          <div className="h-9 w-9 rounded-md bg-gradient-to-br from-red-600 to-red-900 p-[1px] shadow-[0_0_10px_rgba(220,38,38,0.3)]">
            <div className="w-full h-full bg-gray-950 rounded-[5px] flex items-center justify-center text-red-500 font-bold text-sm">
              {(user?.name || 'A').slice(0, 1).toUpperCase()}
            </div>
          </div>
          <div className="hidden md:block text-sm">
            <div className="font-bold text-gray-200 uppercase tracking-wide text-xs">{user?.name || 'Dang tai...'}</div>
            <div className="text-[10px] text-red-400/80 font-mono">{user?.role || 'ADMIN'}</div>
          </div>
          <button type="button" onClick={logout} className="p-1 text-gray-500 hover:text-red-400 transition-colors" title="Dang xuat" aria-label="Dang xuat">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
