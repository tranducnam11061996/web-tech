'use client';

import dynamic from 'next/dynamic';

const Sidebar = dynamic(() =>
  import('@/components/layout/Sidebar').then(mod => ({ default: mod.Sidebar })),
  { ssr: false },
);

export function SidebarLoader() {
  return <Sidebar className="hidden lg:flex" />;
}
