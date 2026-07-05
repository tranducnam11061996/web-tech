'use client';

import { Search, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';

export function ArticleCategoryFilter() {
  return (
    <div className="flex flex-wrap justify-between items-center gap-4 mb-2 bg-[#0a0a0f]/90 backdrop-blur-md p-3 rounded-lg border border-gray-800/50 shadow-sm z-20">
      {/* Search Input */}
      <div className="relative w-full sm:w-[350px]">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="w-4 h-4 text-gray-500" />
        </div>
        <input 
          type="text" 
          placeholder="Nhập tìm kiếm" 
          className="w-full bg-gray-900 border border-gray-700 rounded-md pl-9 pr-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner"
        />
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-3">
        <Link href="/news/news-category/edit">
          <button className="flex items-center gap-2 px-4 py-2 bg-transparent text-blue-400 border border-blue-500/50 hover:bg-blue-500/10 rounded-md transition-all text-sm font-medium shadow-[0_0_10px_rgba(59,130,246,0.1)]">
            <Plus className="w-4 h-4" /> Thêm mới
          </button>
        </Link>
        <button className="flex items-center gap-2 px-4 py-2 bg-transparent text-red-400 border border-red-500/50 hover:bg-red-500/10 rounded-md transition-all text-sm font-medium shadow-[0_0_10px_rgba(239,68,68,0.1)]">
          <Trash2 className="w-4 h-4" /> Xóa (Đã chọn)
        </button>
      </div>
    </div>
  );
}
