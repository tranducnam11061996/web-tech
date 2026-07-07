'use client';

import { Plus, Trash2, Download, Upload, Info, Search, Filter, CheckCircle } from 'lucide-react';
import Link from 'next/link';

export function CategoryFilter() {
  return (
    <div className="space-y-4 mb-6">
      {/* Top Actions */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-gray-500 bg-gray-900/50 border border-gray-800 rounded-sm hover:text-red-400 hover:border-red-900 transition-all uppercase tracking-wider disabled:opacity-50">
          <Trash2 className="w-3.5 h-3.5" /> Xóa (đã chọn)
        </button>
        <Link href="/product/categories-edit" className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-blue-400 bg-blue-950/20 border border-blue-900 rounded-sm hover:border-blue-500 hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all uppercase tracking-wider">
          <Plus className="w-3.5 h-3.5" /> Thêm mới
        </Link>
        <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-green-400 bg-green-950/20 border border-green-900 rounded-sm hover:border-green-500 hover:shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all uppercase tracking-wider">
          <Download className="w-3.5 h-3.5" /> Export Excel
        </button>
        <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-teal-400 bg-teal-950/20 border border-teal-900 rounded-sm hover:border-teal-500 hover:shadow-[0_0_15px_rgba(20,184,166,0.3)] transition-all uppercase tracking-wider">
          <Upload className="w-3.5 h-3.5" /> Import sản phẩm theo danh mục
        </button>
        <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-teal-400 bg-teal-950/20 border border-teal-900 rounded-sm hover:border-teal-500 hover:shadow-[0_0_15px_rgba(20,184,166,0.3)] transition-all uppercase tracking-wider">
          <Upload className="w-3.5 h-3.5" /> Import danh mục SEO
        </button>
        <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-purple-400 bg-purple-950/20 border border-purple-900 rounded-sm hover:border-purple-500 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all uppercase tracking-wider">
          <Download className="w-3.5 h-3.5" /> File mẫu import update cho SEO
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 glass-panel border-gray-800 rounded-sm shadow-sm relative z-10">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64 group">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500 group-focus-within:text-red-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Từ khoá..." 
              className="w-full pl-9 pr-3 py-2 bg-gray-900 border border-gray-700 rounded-sm text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all shadow-inner"
            />
          </div>
          
          <div className="relative group">
            <Filter className="absolute left-3 top-2.5 h-4 w-4 text-gray-500 group-focus-within:text-red-500 transition-colors" />
            <select className="pl-9 pr-8 py-2 bg-gray-900 border border-gray-700 rounded-sm text-sm text-gray-300 focus:outline-none focus:border-red-500/50 transition-all appearance-none cursor-pointer">
              <option value="">Lọc theo Trạng thái</option>
              <option value="1">Hiển thị</option>
              <option value="0">Không hiển thị</option>
            </select>
          </div>

          <button className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-blue-400 bg-blue-950/20 border border-blue-900 rounded-sm hover:bg-blue-600 hover:text-white hover:border-blue-500 hover:shadow-[0_0_15px_rgba(37,99,235,0.5)] transition-all uppercase tracking-wider">
            Tìm kiếm
          </button>
        </div>

        <button className="flex items-center gap-2 px-6 py-2 text-sm font-bold text-gray-400 bg-gray-900 border border-gray-700 rounded-sm hover:text-white hover:border-gray-500 transition-all uppercase tracking-wider">
          <CheckCircle className="w-4 h-4" /> Xác nhận
        </button>
      </div>
    </div>
  );
}
