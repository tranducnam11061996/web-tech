'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { Search, Plus, Trash2, ChevronDown } from 'lucide-react';
import Link from 'next/link';

type Props = {
  initialQuery: string;
  selectedCount: number;
  busy: boolean;
  onSearch: (query: string) => void;
  onDeleteSelected: () => void;
  onBulkAction: (action: 'activate' | 'hide') => void;
};

export function AttributeFilter({ initialQuery, selectedCount, busy, onSearch, onDeleteSelected, onBulkAction }: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  useEffect(() => setQuery(initialQuery), [initialQuery]);
  useEffect(() => {
    if (!actionsOpen) return;
    const close = (event: MouseEvent) => {
      if (!actionsRef.current?.contains(event.target as Node)) setActionsOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [actionsOpen]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSearch(query.trim());
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4 justify-between items-start sm:items-center">
      {/* Left side: Search */}
      <form onSubmit={submit} className="flex items-center gap-2 w-full sm:w-auto">
        <div className="relative group w-full sm:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-500 group-focus-within:text-blue-400 transition-colors" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-800 rounded-md leading-5 bg-gray-900/50 text-gray-300 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/50 sm:text-sm transition-all shadow-inner"
            placeholder="Từ khoá"
          />
        </div>
        <button type="submit" className="px-4 py-2 border border-blue-900/50 text-blue-400 bg-blue-950/20 hover:bg-blue-900/40 rounded-md text-sm font-medium transition-all shadow-[0_0_15px_rgba(59,130,246,0.1)] hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] whitespace-nowrap">
          Tìm kiếm
        </button>
      </form>

      {/* Right side: Actions */}
      <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
        <Link href="/product/attribute/edit">
          <button className="flex items-center gap-2 px-3 py-2 border border-blue-900/50 text-blue-400 bg-blue-950/20 hover:bg-blue-900/40 rounded-md text-sm font-medium transition-all shadow-[0_0_15px_rgba(59,130,246,0.1)] hover:shadow-[0_0_20px_rgba(59,130,246,0.2)] whitespace-nowrap">
            <Plus className="w-4 h-4" />
            Thêm mới
          </button>
        </Link>
        <button
          type="button"
          disabled={!selectedCount || busy}
          onClick={onDeleteSelected}
          className="flex items-center gap-2 px-3 py-2 border border-red-900/50 text-red-400 bg-red-950/20 hover:bg-red-900/40 rounded-md text-sm font-medium transition-all shadow-[0_0_15px_rgba(239,68,68,0.1)] hover:shadow-[0_0_20px_rgba(239,68,68,0.2)] whitespace-nowrap disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          Xóa ({selectedCount ? selectedCount : 'Đã chọn'})
        </button>
        <div ref={actionsRef} className="relative">
          <button
            type="button"
            disabled={!selectedCount || busy}
            onClick={() => setActionsOpen((open) => !open)}
            className="flex items-center gap-2 px-3 py-2 border border-purple-900/50 text-purple-400 bg-purple-950/20 hover:bg-purple-900/40 rounded-md text-sm font-medium transition-all shadow-[0_0_15px_rgba(168,85,247,0.1)] hover:shadow-[0_0_20px_rgba(168,85,247,0.2)] whitespace-nowrap disabled:opacity-50"
          >
            Thao tác khác
            <ChevronDown className="w-4 h-4" />
          </button>
          {actionsOpen && (
            <div className="absolute right-0 top-full z-40 mt-1 min-w-40 overflow-hidden rounded-md border border-purple-900/50 bg-gray-950 shadow-xl">
              <button type="button" onClick={() => { setActionsOpen(false); onBulkAction('activate'); }} className="block w-full px-3 py-2 text-left text-sm text-green-400 hover:bg-gray-900">Kích hoạt</button>
              <button type="button" onClick={() => { setActionsOpen(false); onBulkAction('hide'); }} className="block w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-900">Tạm ẩn</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
