import type { Metadata } from 'next';
import './globals.css';
import { AdminShell } from '@/components/layout/AdminShell';

export const metadata: Metadata = {
  title: 'TrucTiepGAME Admin | Tech & Gaming',
 icons: { icon: '/icon.svg' },
  description: 'Hệ thống quản lý chuyên nghiệp cho TrucTiepGAME',
};

export default async function RootLayout({
 children,
}: {
 children: React.ReactNode;
}) {
 return (
 <html lang="vi" className="dark">
 <body className="bg-[#0a0a0f] text-gray-300 overflow-hidden selection:bg-red-500/30 selection:text-red-200" style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
 <AdminShell>{children}</AdminShell>
 </body>
 </html>
 );
}
