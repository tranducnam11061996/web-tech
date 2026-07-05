'use client';

import { useState } from 'react';
import { TabBasic } from './TabBasic';
import { TabCategories } from './TabCategories';
import clsx from 'clsx';
import { Save, X } from 'lucide-react';
import Link from 'next/link';

export function AttributeEditTabs() {
  const [activeTab, setActiveTab] = useState<'basic' | 'categories'>('basic');

  return (
    <div className="flex flex-col h-full">
      {/* Header Tabs */}
      <div className="flex items-end px-4 pt-2 border-b border-gray-800/80 bg-gray-950/50 backdrop-blur-md sticky top-0 z-20">
        <button
          onClick={() => setActiveTab('basic')}
          className={clsx(
            "px-6 py-3 text-sm font-bold tracking-wide uppercase transition-all border-b-2 relative",
            activeTab === 'basic' 
              ? "text-blue-400 border-blue-500 bg-blue-500/10" 
              : "text-gray-500 border-transparent hover:text-gray-300 hover:bg-gray-800/50"
          )}
        >
          Cơ bản
          {activeTab === 'basic' && (
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-400/50 to-transparent"></div>
          )}
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={clsx(
            "px-6 py-3 text-sm font-bold tracking-wide uppercase transition-all border-b-2 relative",
            activeTab === 'categories' 
              ? "text-blue-400 border-blue-500 bg-blue-500/10" 
              : "text-gray-500 border-transparent hover:text-gray-300 hover:bg-gray-800/50"
          )}
        >
          Danh mục
          {activeTab === 'categories' && (
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-400/50 to-transparent"></div>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        <div className={clsx("transition-opacity duration-300", activeTab === 'basic' ? "block opacity-100" : "hidden opacity-0")}>
          <TabBasic />
        </div>
        <div className={clsx("transition-opacity duration-300", activeTab === 'categories' ? "block opacity-100" : "hidden opacity-0")}>
          <TabCategories />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-center gap-4 p-4 border-t border-gray-800/80 bg-gray-950/80 backdrop-blur-md sticky bottom-0 z-20">
        <button className="flex items-center gap-2 px-6 py-2 bg-green-500/10 text-green-400 border border-green-500/50 rounded hover:bg-green-500/20 hover:shadow-[0_0_15px_rgba(34,197,94,0.2)] transition-all font-bold uppercase tracking-wider text-sm">
          <Save className="w-4 h-4" />
          Lưu
        </button>
        <Link href="/product/attribute-list">
          <button className="flex items-center gap-2 px-6 py-2 bg-red-500/10 text-red-400 border border-red-500/50 rounded hover:bg-red-500/20 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)] transition-all font-bold uppercase tracking-wider text-sm">
            <X className="w-4 h-4" />
            Đóng
          </button>
        </Link>
      </div>
    </div>
  );
}
