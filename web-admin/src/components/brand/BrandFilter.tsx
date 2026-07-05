'use client';

import { Search, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { BrandModal } from './BrandModal';

export function BrandFilter() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4 mb-4">
      {/* Top Actions */}
      <div className="flex justify-between items-center bg-[#0a0a0f]/90 backdrop-blur-md p-3 rounded-lg border border-gray-800/50 shadow-sm z-20">
        <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-blue-500 flex items-center gap-3">
          <span className="w-1.5 h-6 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span>
          Danh sách Thương hiệu
        </h1>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-all shadow-[0_0_10px_rgba(37,99,235,0.3)]"
          >
            <Plus className="w-4 h-4" /> Thêm mới
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-red-950/30 text-red-400 border border-red-900/50 hover:bg-red-900/50 rounded-md transition-all">
            <Trash2 className="w-4 h-4" /> Xóa (Đã chọn)
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 rounded-lg border border-gray-800/50 flex flex-wrap gap-4 items-end relative z-10">
        <div className="w-[300px]">
          <label className="text-xs font-medium text-gray-400 mb-1.5 block uppercase tracking-wider">Từ khoá</label>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Nhập từ khóa tìm kiếm..." 
              className="w-full bg-gray-900 border border-gray-700 rounded-md pl-3 pr-10 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner"
            />
          </div>
        </div>

        <div>
          <button className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-all shadow-[0_0_10px_rgba(37,99,235,0.3)] font-medium">
            <Search className="w-4 h-4" /> Tìm kiếm
          </button>
        </div>
      </div>

      <BrandModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} isEdit={false} />
    </div>
  );
}
