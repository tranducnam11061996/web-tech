'use client';

import { Plus, Search } from 'lucide-react';
import Link from 'next/link';

export function ProductGroupFilter({ search, onSearchChange }: { search: string; onSearchChange: (value: string) => void }) {
  return (
    <div className="mb-4 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-800/50 bg-[#0a0a0f]/90 p-3 shadow-sm backdrop-blur-md">
        <div>
          <h1 className="flex items-center gap-3 text-xl font-bold text-white">
            <span className="h-6 w-1.5 rounded-full bg-blue-500" aria-hidden="true" />
            Group sản phẩm
          </h1>
          <p className="mt-1 text-sm text-gray-400">Gom các SKU độc lập thành một nhóm phiên bản trên trang chi tiết.</p>
        </div>
        <Link href="/product/product-group/edit" className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400">
          <Plus className="h-4 w-4" aria-hidden="true" /> Thêm group
        </Link>
      </div>

      <div className="glass-panel rounded-lg border border-gray-800/50 p-4">
        <label htmlFor="product-group-search" className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-gray-400">Tìm kiếm group</label>
        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-500" aria-hidden="true" />
          <input
            id="product-group-search"
            type="search"
            value={search}
            maxLength={150}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tên hoặc mô tả group..."
            className="w-full rounded-md border border-gray-700 bg-gray-900 py-2 pl-9 pr-3 text-sm text-gray-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
          />
        </div>
      </div>
    </div>
  );
}
