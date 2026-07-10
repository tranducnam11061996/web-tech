'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { menuGroups } from '@/lib/menu-data';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';
import { getPagePermission, hasPermission, type AdminPermission } from '@/lib/admin/permissions';

type Session = { permissions: AdminPermission[] };

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<number, boolean>>({ 1: true });

  useEffect(() => {
    fetch('/api/admin/auth/me').then(async (response) => {
      if (response.status === 401) {
        router.replace('/login');
        return null;
      }
      return response.ok ? (await response.json()).data as Session : null;
    }).then(setSession).catch(() => setSession(null));
  }, [router]);

  const visibleGroups = menuGroups.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (item.path === '#') return false;
      const permission = getPagePermission(item.path);
      return !permission || Boolean(session && hasPermission(session.permissions, permission));
    }),
  })).filter((group) => group.items.length > 0);

  return (
    <aside className={clsx('w-64 glass-panel border-r border-gray-800/50 flex flex-col h-full overflow-y-auto custom-scrollbar relative z-20', className)}>
      <div className="p-4 sticky top-0 bg-[#0a0a0f]/90 backdrop-blur-md z-10 border-b border-gray-800/50">
        <div className="relative group"><Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" /><input type="text" placeholder="Tim kiem chuc nang..." className="w-full pl-9 pr-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-md text-sm text-gray-200 focus:outline-none focus:border-red-500/50" /></div>
      </div>
      <div className="flex-1 py-4 px-2 space-y-1">
        {visibleGroups.map((group, index) => {
          const isOpen = openGroups[index] ?? group.items.some((item) => pathname === item.path || pathname?.startsWith(`${item.path}/`));
          const Icon = group.icon;
          const active = group.items.some((item) => pathname === item.path || pathname?.startsWith(`${item.path}/`));
          return <div key={group.title} className="mb-1">
            <button type="button" onClick={() => setOpenGroups((current) => ({ ...current, [index]: !isOpen }))} className={clsx('w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-md transition-all', isOpen || active ? 'text-gray-100' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/30')}>
              <span className="flex items-center gap-3"><Icon className={clsx('h-4 w-4', isOpen || active ? 'text-red-500' : 'text-gray-500')} /><span className="font-medium tracking-wide">{group.title}</span></span>{isOpen ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-600" />}
            </button>
            <div className={clsx('overflow-hidden transition-all duration-300', isOpen ? 'max-h-[500px] opacity-100 mt-1' : 'max-h-0 opacity-0')}>
              <div className="pl-9 pr-2 py-1 flex flex-col gap-1 border-l border-gray-800/50 ml-5">
                {group.items.map((item) => {
                  const isActive = pathname === item.path || pathname?.startsWith(`${item.path}/`);
                  return <Link key={item.path} href={item.path} className={clsx('py-2 px-3 text-sm rounded-md transition-all', isActive ? 'bg-red-500/10 text-red-400 font-medium border-l border-red-500' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40 border-l border-transparent')}>{item.name}</Link>;
                })}
              </div>
            </div>
          </div>;
        })}
      </div>
    </aside>
  );
}
