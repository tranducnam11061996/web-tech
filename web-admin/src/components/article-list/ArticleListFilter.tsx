'use client';

import { Search, Plus, Trash2, RefreshCcw, Download, Upload, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export function ArticleListFilter() {
  return (
    <div className="flex flex-col gap-4 mb-4">
      {/* Top Actions */}
      <div className="flex justify-between items-center bg-[#0a0a0f]/90 backdrop-blur-md p-3 rounded-lg border border-gray-800/50 shadow-sm z-20">
        <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-blue-500 flex items-center gap-3">
          <span className="w-1.5 h-6 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span>
          Danh sách bài viết
        </h1>
        
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-1.5 bg-cyan-950/30 text-cyan-400 border border-cyan-900/50 hover:bg-cyan-900/50 rounded transition-all text-sm font-medium">
            <RefreshCcw className="w-4 h-4" /> Đồng bộ tìm kiếm bài viết
          </button>
          <Link href="/article/edit">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded transition-all shadow-[0_0_10px_rgba(37,99,235,0.3)] text-sm font-medium">
              <Plus className="w-4 h-4" /> Thêm mới
            </button>
          </Link>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-red-950/30 text-red-400 border border-red-900/50 hover:bg-red-900/50 rounded transition-all text-sm font-medium">
            <Trash2 className="w-4 h-4" /> Xóa (Đã chọn)
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-emerald-950/30 text-emerald-400 border border-emerald-900/50 hover:bg-emerald-900/50 rounded transition-all text-sm font-medium">
            <Download className="w-4 h-4" /> Export Excel
          </button>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-indigo-950/30 text-indigo-400 border border-indigo-900/50 hover:bg-indigo-900/50 rounded transition-all text-sm font-medium">
            <Upload className="w-4 h-4" /> Import Excel
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 rounded-lg border border-gray-800/50 flex flex-wrap gap-4 items-end relative z-10">
        <div className="w-[300px]">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Nhập tìm kiếm" 
              className="w-full bg-gray-900 border border-gray-700 rounded-md pl-9 pr-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner"
            />
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
          </div>
        </div>
        
        <div className="w-[200px]">
          <select className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-blue-500/50 transition-all cursor-pointer appearance-none">
            <option value="">Trạng thái</option>
            <option value="Hoạt động">Hoạt động</option>
            <option value="Tạm khóa">Tạm khóa</option>
          </select>
        </div>

        <div className="w-[200px]">
          <select className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-blue-500/50 transition-all cursor-pointer appearance-none">
            <option value="">Loại bài viết</option>
            <option value="Tin tức">Tin tức</option>
            <option value="Khuyến mãi">Khuyến mãi</option>
          </select>
        </div>

        <div>
          <button className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-all shadow-[0_0_10px_rgba(37,99,235,0.3)] font-medium">
            Tìm kiếm
          </button>
        </div>
      </div>
    </div>
  );
}
