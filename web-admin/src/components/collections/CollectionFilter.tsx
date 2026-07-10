'use client';

import { Search, Plus } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';

export function CollectionFilter({ initialSearch = '' }: { initialSearch?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(initialSearch);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (search.trim()) params.set('search', search.trim());
    else params.delete('search');
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex flex-col gap-4 mb-4">
      <div className="flex justify-between items-center bg-[#0a0a0f]/90 backdrop-blur-md p-3 rounded-lg border border-gray-800/50 shadow-sm z-20">
        <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-blue-500 flex items-center gap-3">
          <span className="w-1.5 h-6 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span>
          Danh sách Bộ sưu tập
        </h1>

        <div className="flex items-center gap-3">
          <Link href="/product/collection-edit">
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-all shadow-[0_0_10px_rgba(37,99,235,0.3)]">
              <Plus className="w-4 h-4" /> Thêm mới
            </button>
          </Link>
        </div>
      </div>

      <form onSubmit={submit} className="glass-panel p-4 rounded-lg border border-gray-800/50 flex flex-wrap gap-4 items-end relative z-10">
        <div className="w-[300px]">
          <label className="text-xs font-medium text-gray-400 mb-1.5 block uppercase tracking-wider">Từ khóa</label>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nhập ID, tên hoặc link..."
            className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner"
          />
        </div>

        <button className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-all shadow-[0_0_10px_rgba(37,99,235,0.3)] font-medium">
          <Search className="w-4 h-4" /> Tìm kiếm
        </button>
      </form>
    </div>
  );
}
