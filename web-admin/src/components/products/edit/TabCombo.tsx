'use client';

import { Search } from 'lucide-react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Pagination } from '@/components/shared/Pagination';

export function TabCombo({ combosData }: { combosData?: any }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState('all');

  // Sync initial state from URL
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
    
    params.set('page', '1'); // Reset to page 1 on new search
    
    router.push(pathname + '?' + params.toString());
  };

  const combos = combosData?.combos || [];
  const pagination = combosData?.pagination || { currentPage: 1, totalPages: 1, totalItems: 0, pageSize: 20 };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-4 mb-6">
        <div className="relative w-96 group">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500 group-focus-within:text-red-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Nhập từ khóa tìm kiếm combo set..." 
            className="w-full pl-9 pr-3 py-2 bg-gray-900 border border-gray-700 rounded-sm text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all shadow-inner" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <select 
          className="bg-gray-900 border border-gray-700 rounded-sm px-4 py-2 text-sm text-gray-400 focus:outline-none focus:border-red-500/50 transition-all cursor-pointer"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Tạm ngưng</option>
        </select>
        <button 
          onClick={handleSearch}
          className="bg-blue-600 hover:bg-blue-500 border border-blue-500 text-white rounded-sm px-6 py-2 flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)]"
        >
          Tìm kiếm
        </button>
      </div>

      <div className="glass-panel border-gray-800 rounded-lg shadow-sm overflow-hidden text-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-950/80 border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider font-mono">
                <th className="p-4 font-bold">ID</th>
                <th className="p-4 font-bold">Tên Combo Set</th>
                <th className="p-4 font-bold">Trạng thái</th>
                <th className="p-4 font-bold text-center w-48">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {combos.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500 font-mono">Không tìm thấy Combo Set nào</td>
                </tr>
              ) : (
                combos.map((combo: any) => (
                  <tr key={combo.id} className="hover:bg-gray-800/30 transition-colors group">
                    <td className="p-4 text-gray-500">{combo.id}</td>
                    <td className="p-4 font-medium text-gray-300 group-hover:text-red-400 transition-colors cursor-pointer">{combo.title}</td>
                    <td className="p-4">
                      {combo.status === 1 ? (
                        <span className="px-2 py-1 text-xs text-green-400 bg-green-500/10 border border-green-500/30 rounded-full">Hoạt động</span>
                      ) : (
                        <span className="px-2 py-1 text-xs text-gray-400 bg-gray-500/10 border border-gray-500/30 rounded-full">Tạm ngưng</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <button className="text-blue-400 hover:text-blue-300 hover:underline decoration-blue-500/50 font-medium transition-all text-xs uppercase tracking-wider">
                        Chọn set này
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination 
          currentPage={pagination.currentPage} 
          totalPages={pagination.totalPages} 
          totalItems={pagination.totalItems} 
          pageSize={pagination.pageSize} 
        />
      </div>
    </div>
  );
}
