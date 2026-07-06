import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

const inter = Inter({ subsets: ['latin', 'vietnamese'] });

export const metadata: Metadata = {
  title: 'HACOM Admin | Tech & Gaming',
  description: 'Hệ thống quản lý chuyên nghiệp cho HACOM',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="dark">
      <body className={`${inter.className} bg-[#0a0a0f] text-gray-300 overflow-hidden selection:bg-red-500/30 selection:text-red-200`}>
        <div className="flex flex-col h-screen relative bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/10 via-[#0a0a0f] to-[#0a0a0f]">
          {/* Subtle background glow effect */}
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none"></div>
          
          <Header />
          <div className="flex flex-1 overflow-hidden z-10">
            <Sidebar className="hidden lg:flex" />
            <main className="flex-1 overflow-auto p-4 lg:p-6 custom-scrollbar">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
