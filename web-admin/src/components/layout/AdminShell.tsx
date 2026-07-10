'use client';

import { usePathname } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { SidebarLoader } from '@/app/SidebarLoader';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/login') return <>{children}</>;
  return (
    <div className="flex flex-col h-screen relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-[#0a0a0f] to-[#0a0a0f]">
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none" aria-hidden="true" />
      <Header />
      <div className="flex flex-1 overflow-hidden z-10">
        <SidebarLoader />
        <main className="flex-1 overflow-auto p-4 lg:p-6 custom-scrollbar">{children}</main>
      </div>
    </div>
  );
}
