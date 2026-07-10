'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import clsx from 'clsx';
import { PAGE_SIZE_OPTIONS, normalizePageSize } from '@/lib/admin/pagination';

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
};

export function Pagination({ currentPage, totalPages, totalItems, pageSize }: PaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const normalizedPageSize = normalizePageSize(pageSize);

  const createPageQueryString = useCallback(
    (page: number) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', page.toString());
      params.set('limit', normalizedPageSize.toString());
      return params.toString();
    },
    [normalizedPageSize, searchParams]
  );

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    router.push(pathname + '?' + createPageQueryString(page));
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLimit = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    params.set('limit', newLimit);
    params.set('page', '1'); // Reset to page 1 on limit change
    router.push(pathname + '?' + params.toString());
  };

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, currentPage + 2);
      
      if (start === 1) end = maxVisiblePages;
      if (end === totalPages) start = totalPages - maxVisiblePages + 1;
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="p-4 bg-gray-950/50 border-t border-gray-800 flex items-center justify-between gap-4 text-sm flex-wrap">
      <div className="flex items-center gap-2">
        <span className="text-gray-500 font-mono text-xs uppercase tracking-wider">Hiển thị</span>
        <select 
          value={normalizedPageSize}
          onChange={handleLimitChange}
          className="bg-gray-900 border border-gray-700 rounded-sm px-2 py-1 text-gray-300 focus:outline-none focus:border-red-500/50 cursor-pointer"
        >
          {PAGE_SIZE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <span className="text-gray-500 font-mono text-xs ml-2">Tổng số: {totalItems}</span>
      </div>
      
      <div className="flex items-center gap-1 ml-auto">
        {/* First Page */}
        <button 
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1}
          className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-500 hover:text-white hover:border-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          |&lt;
        </button>
        {/* Prev Page */}
        <button 
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-500 hover:text-white hover:border-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          &lt;
        </button>
        
        {pages[0] > 1 && (
          <>
            <button 
              onClick={() => handlePageChange(1)}
              className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
            >
              1
            </button>
            {pages[0] > 2 && <span className="px-2 text-gray-600">...</span>}
          </>
        )}

        {pages.map((p) => (
          <button 
            key={p}
            onClick={() => handlePageChange(p)}
            className={clsx(
              "w-8 h-8 flex items-center justify-center rounded-sm transition-colors",
              p === currentPage 
                ? "border border-red-500 bg-red-500/20 text-red-400 font-bold shadow-[0_0_10px_rgba(239,68,68,0.2)]" 
                : "border border-gray-800 bg-gray-900 text-gray-400 hover:text-white hover:border-gray-600"
            )}
          >
            {p}
          </button>
        ))}

        {pages[pages.length - 1] < totalPages && (
          <>
            {pages[pages.length - 1] < totalPages - 1 && <span className="px-2 text-gray-600">...</span>}
            <button 
              onClick={() => handlePageChange(totalPages)}
              className="w-12 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-400 hover:text-white hover:border-gray-600 transition-colors font-mono"
            >
              {totalPages}
            </button>
          </>
        )}
        
        {/* Next Page */}
        <button 
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-500 hover:text-white hover:border-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          &gt;
        </button>
        {/* Last Page */}
        <button 
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-500 hover:text-white hover:border-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          &gt;|
        </button>
      </div>
    </div>
  );
}
