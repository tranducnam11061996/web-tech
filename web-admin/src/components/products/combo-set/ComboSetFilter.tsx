'use client';

import { Search, Plus } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export function ComboSetFilter({ initialSearch = '', initialStatus = 'all' }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    setSearchTerm(searchParams.get('search') || '');
    setStatus(searchParams.get('status') || 'all');
  }, [searchParams]);

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (searchTerm) {
      params.set('search', searchTerm);
    } else {
      params.delete('search');
    }
    
    if (status && status !== 'all') {
      params.set('status', status);
    } else {
      params.delete('status');
    }
    
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="p-4 border-b border-gray-800/80 bg-gray-900/40 backdrop-blur-md flex flex-wrap gap-4 items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-3 flex-1 min-w-[300px] max-w-2xl">
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Tìm kiếm theo tên combo set..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full pl-9 pr-3 py-2 bg-gray-950 border border-gray-700 rounded-sm text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner" 
          />
        </div>
        
        <select 
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="bg-gray-950 border border-gray-700 rounded-sm px-4 py-2 text-sm text-gray-400 focus:outline-none focus:border-blue-500/50 transition-all cursor-pointer min-w-[150px]"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Hoạt động</option>
          <option value="inactive">Tạm ngưng</option>
        </select>
        
        <button 
          onClick={handleSearch}
          className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/50 rounded-sm px-6 py-2 flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider transition-all hover:shadow-[0_0_15px_rgba(37,99,235,0.2)] whitespace-nowrap"
        >
          Tìm kiếm
        </button>
      </div>

      <div className="flex gap-2 ml-auto">
        <Link
          href="/product/combo-set/edit"
          className="flex min-h-10 items-center gap-2 rounded-sm border border-green-500/50 bg-green-600/10 px-4 py-2 text-sm font-bold uppercase tracking-wider text-green-400 transition-all hover:bg-green-600/20 hover:shadow-[0_0_15px_rgba(34,197,94,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Thêm mới
        </Link>
      </div>
    </div>
  );
}
