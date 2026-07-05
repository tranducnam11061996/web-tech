'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { menuGroups } from '@/lib/menu-data';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Record<number, boolean>>({
    1: true, // Default open Quản lý sản phẩm
  });

  const toggleGroup = (index: number) => {
    setOpenGroups(prev => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <aside className={clsx("w-64 glass-panel border-r border-gray-800/50 flex flex-col h-full overflow-y-auto custom-scrollbar relative z-20", className)}>
      <div className="p-4 sticky top-0 bg-[#0a0a0f]/90 backdrop-blur-md z-10 border-b border-gray-800/50">
        <div className="relative group">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500 group-focus-within:text-red-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Tìm kiếm chức năng..." 
            className="w-full pl-9 pr-3 py-2 bg-gray-900/50 border border-gray-700/50 rounded-md text-sm text-gray-200 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all shadow-inner"
          />
        </div>
      </div>
      
      <div className="flex-1 py-4 px-2 space-y-1">
        {menuGroups.map((group, idx) => {
          const isOpen = openGroups[idx];
          const Icon = group.icon;
          const hasActiveChild = group.items.some(item => pathname === item.path || (item.path !== '#' && pathname?.startsWith(item.path)));
          
          return (
            <div key={idx} className="mb-1">
              <button 
                onClick={() => toggleGroup(idx)}
                className={clsx(
                  "w-full flex items-center justify-between px-3 py-2.5 text-sm rounded-md transition-all duration-200",
                  isOpen || hasActiveChild ? "text-gray-100" : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/30",
                  hasActiveChild && !isOpen && "bg-red-500/5 border border-red-500/10"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={clsx(
                    "h-4 w-4 transition-colors", 
                    (isOpen || hasActiveChild) ? "text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]" : "text-gray-500"
                  )} />
                  <span className={clsx("font-medium tracking-wide", hasActiveChild && "text-white")}>{group.title}</span>
                </div>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-600" />
                )}
              </button>
              
              <div className={clsx(
                "overflow-hidden transition-all duration-300 ease-in-out",
                isOpen ? "max-h-[500px] opacity-100 mt-1" : "max-h-0 opacity-0"
              )}>
                <div className="pl-9 pr-2 py-1 flex flex-col gap-1 border-l border-gray-800/50 ml-5 relative">
                  {group.items.map((item, itemIdx) => {
                    const isActive = pathname === item.path || (item.path !== '#' && pathname?.startsWith(item.path));
                    return (
                      <Link 
                        key={itemIdx}
                        href={item.path}
                        className={clsx(
                          "relative py-2 px-3 text-sm rounded-md transition-all duration-200 flex items-center group",
                          isActive 
                            ? "bg-gradient-to-r from-red-500/10 to-transparent text-red-400 font-medium border-l border-red-500" 
                            : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/40 border-l border-transparent"
                        )}
                      >
                        {/* Custom bullet point */}
                        <div className={clsx(
                          "absolute -left-[18px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full transition-all duration-300",
                          isActive ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,1)] scale-100" : "bg-gray-600 scale-0 group-hover:scale-100"
                        )} />
                        {item.name}
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
