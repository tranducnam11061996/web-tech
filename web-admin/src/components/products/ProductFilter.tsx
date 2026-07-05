'use client';

import { Search, Upload, RefreshCw, Download, FileSpreadsheet, AlertCircle, X } from 'lucide-react';
import { useSearch } from '@/hooks/useSearch';

export function ProductTopActions() {
  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
      <div className="flex items-center gap-2 text-sm text-gray-400 font-mono">
        <span className="font-medium text-gray-300 bg-gray-800/50 border border-gray-700/50 px-3 py-1 rounded-sm">DANH SÁCH SẢN PHẨM</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-300 bg-gray-900 border border-gray-700 rounded-sm hover:border-blue-500/50 hover:text-blue-400 hover:shadow-[0_0_10px_rgba(59,130,246,0.3)] transition-all uppercase tracking-wider">
          <Upload className="w-3.5 h-3.5" /> Import IMG
        </button>
        <button className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-300 bg-gray-900 border border-gray-700 rounded-sm hover:border-purple-500/50 hover:text-purple-400 hover:shadow-[0_0_10px_rgba(168,85,247,0.3)] transition-all uppercase tracking-wider group">
          <RefreshCw className="w-3.5 h-3.5 group-hover:animate-spin" /> Sync DB
        </button>
        <button className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-300 bg-gray-900 border border-gray-700 rounded-sm hover:border-green-500/50 hover:text-green-400 hover:shadow-[0_0_10px_rgba(34,197,94,0.3)] transition-all uppercase tracking-wider">
          <FileSpreadsheet className="w-3.5 h-3.5" /> Export XLS
        </button>
        <button className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-300 bg-gray-900 border border-gray-700 rounded-sm hover:border-blue-500/50 hover:text-blue-400 hover:shadow-[0_0_10px_rgba(59,130,246,0.3)] transition-all uppercase tracking-wider">
          <Upload className="w-3.5 h-3.5" /> Import XLS
        </button>
        <button className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-red-400 bg-red-950/20 border border-red-900 rounded-sm hover:border-red-500 hover:text-red-300 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all uppercase tracking-wider">
          <Download className="w-3.5 h-3.5" /> Export SEO
        </button>
      </div>
    </div>
  );
}

export function ProductFilter() {
  const { keyword, setKeyword, handleSearch, handleClear, handleKeyDown, isSearching } = useSearch();

  return (
    <div className="glass-panel p-5 rounded-lg mb-6 relative overflow-hidden">
      {/* Tech decorative accent */}
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-red-500 via-blue-500 to-purple-500"></div>

      {/* Search active indicator */}
      {isSearching && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-blue-950/30 border border-blue-800/50 rounded-sm text-xs">
          <Search className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-blue-300 font-mono">
            Đang tìm kiếm: <strong className="text-blue-400">&quot;{keyword}&quot;</strong>
          </span>
          <button 
            onClick={handleClear}
            className="ml-auto flex items-center gap-1 text-gray-400 hover:text-red-400 transition-colors"
          >
            <X className="w-3.5 h-3.5" /> Xóa bộ lọc
          </button>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {/* Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="relative col-span-1 md:col-span-1 lg:col-span-1 group">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500 group-focus-within:text-red-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Từ khóa..." 
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full pl-9 pr-3 py-2 bg-gray-950 border border-gray-800 rounded-sm text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all" 
            />
          </div>
          <select className="col-span-1 bg-gray-950 border border-gray-800 rounded-sm px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all appearance-none cursor-pointer">
            <option>Đặc điểm sản phẩm</option>
          </select>
          <select className="col-span-1 bg-gray-950 border border-gray-800 rounded-sm px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all appearance-none cursor-pointer">
            <option>Xét theo điều kiện</option>
          </select>
          <select className="col-span-1 bg-gray-950 border border-gray-800 rounded-sm px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all appearance-none cursor-pointer">
            <option>Danh mục sản phẩm</option>
          </select>
          <select className="col-span-1 bg-gray-950 border border-gray-800 rounded-sm px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all appearance-none cursor-pointer">
            <option>Xem theo thương hiệu</option>
          </select>
          <select className="col-span-1 bg-gray-950 border border-gray-800 rounded-sm px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all appearance-none cursor-pointer">
            <option>Sắp xếp theo hiển thị</option>
          </select>
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <select className="col-span-1 bg-gray-950 border border-gray-800 rounded-sm px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all appearance-none cursor-pointer">
            <option>Loại</option>
          </select>
          <input type="date" className="col-span-1 bg-gray-950 border border-gray-800 rounded-sm px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all" />
          <input type="date" className="col-span-1 bg-gray-950 border border-gray-800 rounded-sm px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all" />
          <select className="col-span-1 bg-gray-950 border border-gray-800 rounded-sm px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all appearance-none cursor-pointer">
            <option>Trạng thái hàng</option>
          </select>
          
          <div className="col-span-1 flex items-center justify-center gap-3 border border-gray-800 bg-gray-900/50 rounded-sm px-3 py-2">
            <div className="w-8 h-4 bg-gray-800 rounded-full relative cursor-pointer group shadow-inner">
              <div className="w-3.5 h-3.5 bg-gray-400 rounded-full absolute top-0.5 left-0.5 transition-all group-hover:bg-red-400"></div>
            </div>
            <span className="text-xs font-mono text-gray-400 uppercase tracking-widest">SP Mới</span>
          </div>
          
          <button 
            onClick={handleSearch}
            className="col-span-1 bg-red-600 hover:bg-red-500 border border-red-500 text-white rounded-sm px-4 py-2 flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(220,38,38,0.4)] hover:shadow-[0_0_25px_rgba(220,38,38,0.6)]"
          >
            <Search className="w-4 h-4" />
            Tìm kiếm
          </button>
        </div>
      </div>
    </div>
  );
}
