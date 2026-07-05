import { Search, Menu, ChevronDown, Monitor, BellRing } from 'lucide-react';
import Link from 'next/link';

export function Header() {
  return (
    <header className="h-16 glass-panel border-b border-gray-800/50 flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-6">
        {/* Logo Area */}
        <div className="w-56 flex items-center gap-3">
          <Menu className="h-5 w-5 text-gray-400 cursor-pointer hover:text-white transition-colors lg:hidden" />
          <Link href="/" className="text-red-500 font-black text-2xl flex items-baseline tracking-tighter glow-text-red">
            HA<span className="text-white">COM</span>
            <span className="text-[10px] text-red-500/70 ml-1 font-mono tracking-widest uppercase">Admin</span>
          </Link>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        {/* Neon Toggle Switch */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-900/50 border border-gray-800">
          <Monitor className="h-3.5 w-3.5 text-blue-400" />
          <span className="text-xs font-mono text-gray-400">SYS_STATUS</span>
          <div className="w-8 h-4 bg-blue-900/40 rounded-full flex items-center px-1 cursor-pointer glow-border-blue ml-2 relative">
            <div className="w-2.5 h-2.5 bg-blue-400 rounded-full flex items-center justify-center translate-x-3.5 shadow-[0_0_8px_rgba(96,165,250,0.8)]"></div>
          </div>
        </div>

        {/* Notifications */}
        <button className="relative p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-800/50">
          <BellRing className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 border-l border-gray-800 pl-6 cursor-pointer group">
          <div className="h-9 w-9 rounded-md bg-gradient-to-br from-red-600 to-red-900 p-[1px] shadow-[0_0_10px_rgba(220,38,38,0.3)]">
            <div className="w-full h-full bg-gray-950 rounded-[5px] flex items-center justify-center text-red-500 font-bold text-sm group-hover:bg-red-950/40 transition-colors">
              N
            </div>
          </div>
          <div className="hidden md:block text-sm">
            <div className="font-bold text-gray-200 uppercase tracking-wide text-xs">Nguyễn Tiến Dinh</div>
            <div className="text-[10px] text-red-400/80 font-mono">SYS_ADMIN // MKT</div>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-500 group-hover:text-red-400 transition-colors" />
        </div>
      </div>
    </header>
  );
}
