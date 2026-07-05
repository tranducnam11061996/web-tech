'use client';

import { Search, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';

export function BannerListFilter() {
  return (
    <div className="flex flex-col gap-4 mb-4">
      {/* Filter Bar + Actions */}
      <div className="flex justify-between items-center bg-[#0a0a0f]/90 backdrop-blur-md p-3 rounded-lg border border-gray-800/50 shadow-sm z-20">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-[260px]">
            <input
              type="text"
              placeholder="Nhập tìm kiếm"
              className="w-full bg-gray-900 border border-gray-700 rounded-md pl-9 pr-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner"
            />
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
          </div>

          <select className="bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-blue-500/50 transition-all cursor-pointer appearance-none w-[180px]">
            <option value="">Chọn trạng thái</option>
            <option value="1">Hiển thị</option>
            <option value="0">Không hiển thị</option>
          </select>

          <select className="bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-blue-500/50 transition-all cursor-pointer appearance-none w-[180px]">
            <option value="">Chọn vị trí banner</option>
            <option value="trang-chu">Trang chủ</option>
            <option value="sidebar">Sidebar</option>
          </select>

          <button className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-all shadow-[0_0_10px_rgba(37,99,235,0.3)] font-medium text-sm">
            Tìm kiếm
          </button>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/banner/edit">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-all shadow-[0_0_10px_rgba(37,99,235,0.3)] text-sm font-medium">
              <Plus className="w-4 h-4" /> Thêm mới
            </button>
          </Link>
          <button className="flex items-center gap-2 px-4 py-2 bg-red-950/30 text-red-400 border border-red-900/50 hover:bg-red-900/50 rounded-md transition-all text-sm font-medium">
            <Trash2 className="w-4 h-4" /> Xóa (Đã chọn)
          </button>
        </div>
      </div>
    </div>
  );
}
