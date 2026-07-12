'use client';

import { AlertTriangle, ChevronLeft, ChevronRight, Edit, RefreshCw, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { ConfirmDeleteModal } from '@/components/shared/ConfirmDeleteModal';
import type { ProductGroupListItem } from './types';

type Pagination = { currentPage: number; totalPages: number; totalItems: number; pageSize: number };
const EMPTY_PAGINATION: Pagination = { currentPage: 1, totalPages: 1, totalItems: 0, pageSize: 20 };

function formatTime(value: number) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value * 1000));
}

export function ProductGroupTable({ search }: { search: string }) {
  const deferredSearch = useDeferredValue(search.trim());
  const [items, setItems] = useState<ProductGroupListItem[]>([]);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => setPage(1), [deferredSearch, limit]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (deferredSearch) params.set('search', deferredSearch);
        const response = await fetch(`/api/admin/product-groups?${params}`, { signal: controller.signal, cache: 'no-store' });
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể tải danh sách group');
        setItems(payload.data.items || []);
        setPagination(payload.data.pagination || EMPTY_PAGINATION);
        setSelected(new Set());
      } catch (fetchError) {
        if ((fetchError as Error).name !== 'AbortError') setError((fetchError as Error).message || 'Không thể tải danh sách group');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [deferredSearch, limit, page, reloadToken]);

  const allSelected = items.length > 0 && items.every((item) => selected.has(item.id));
  const selectedItems = useMemo(() => items.filter((item) => selected.has(item.id)), [items, selected]);
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(items.map((item) => item.id)));
  const deleteSelected = async () => {
    setDeleting(true);
    setError('');
    try {
      for (const item of selectedItems) {
        const response = await fetch(`/api/admin/product-groups/${item.id}`, { method: 'DELETE' });
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload?.error?.message || `Không thể xóa ${item.name}`);
      }
      setConfirming(false);
      setReloadToken((value) => value + 1);
    } catch (deleteError) {
      setError((deleteError as Error).message || 'Không thể xóa group');
      setConfirming(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="glass-panel relative flex h-full flex-col overflow-hidden rounded-lg border border-gray-800 text-sm shadow-sm" aria-busy={loading}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 bg-gray-950/60 px-4 py-3">
        <p className="text-gray-400"><strong className="text-white">{pagination.totalItems}</strong> group</p>
        <div className="flex items-center gap-2">
          {selected.size > 0 ? (
            <button type="button" onClick={() => setConfirming(true)} className="inline-flex items-center gap-2 rounded-md border border-red-800 bg-red-950/30 px-3 py-2 text-red-300 hover:bg-red-900/40 focus-visible:outline-2 focus-visible:outline-red-400">
              <Trash2 className="h-4 w-4" aria-hidden="true" /> Xóa {selected.size} group
            </button>
          ) : null}
          <button type="button" aria-label="Tải lại danh sách" onClick={() => setReloadToken((value) => value + 1)} className="rounded-md border border-gray-700 p-2 text-gray-300 hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-blue-400">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      {error ? <div role="alert" className="m-4 rounded-md border border-red-900 bg-red-950/30 p-3 text-red-300">{error}</div> : null}
      <div className="min-h-0 flex-1 overflow-auto custom-scrollbar">
        <table className="w-full min-w-[1050px] border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-gray-950 text-xs uppercase tracking-wider text-gray-400">
            <tr>
              <th className="w-12 p-3 text-center"><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="Chọn tất cả group trên trang" /></th>
              <th className="p-3">Group</th><th className="p-3 text-center">Thuộc tính</th><th className="p-3 text-center">SKU</th>
              <th className="p-3">Trạng thái</th><th className="p-3">Cập nhật</th><th className="w-24 p-3 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60">
            {!loading && items.length === 0 ? (
              <tr><td colSpan={7} className="p-12 text-center text-gray-400">{deferredSearch ? 'Không tìm thấy group phù hợp.' : 'Chưa có group sản phẩm.'}</td></tr>
            ) : null}
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-800/25">
                <td className="p-3 text-center"><input type="checkbox" checked={selected.has(item.id)} onChange={() => setSelected((current) => { const next = new Set(current); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next; })} aria-label={`Chọn group ${item.name}`} /></td>
                <td className="max-w-[430px] p-3"><Link href={`/product/product-group/edit?id=${item.id}`} className="font-semibold text-gray-100 hover:text-blue-400 focus-visible:outline-2 focus-visible:outline-blue-400">{item.name}</Link><p className="mt-1 truncate text-xs text-gray-500">{item.description || 'Không có mô tả'}</p></td>
                <td className="p-3 text-center font-mono text-gray-300">{item.attributeCount}</td>
                <td className="p-3 text-center"><strong className="text-gray-100">{item.validProductCount}</strong>{item.orphanProductCount > 0 ? <span className="ml-2 inline-flex items-center gap-1 text-xs text-amber-300" title={`${item.orphanProductCount} liên kết mồ côi`}><AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />{item.orphanProductCount}</span> : null}</td>
                <td className="p-3">{item.isVisible ? <span className="rounded-full border border-emerald-800 bg-emerald-950/40 px-2.5 py-1 text-xs font-semibold text-emerald-300">Đang hiển thị</span> : <span className="rounded-full border border-amber-800 bg-amber-950/40 px-2.5 py-1 text-xs font-semibold text-amber-300">Chưa đủ SKU</span>}</td>
                <td className="p-3 text-xs text-gray-400"><div>{formatTime(item.updatedAt || item.createdAt)}</div><div className="mt-1 text-gray-500">{item.updatedBy || item.createdBy || '—'}</div></td>
                <td className="p-3 text-center"><div className="flex justify-center gap-2"><Link href={`/product/product-group/edit?id=${item.id}`} aria-label={`Sửa group ${item.name}`} className="rounded border border-green-900 bg-green-950/30 p-2 text-green-400 hover:bg-green-900/50 focus-visible:outline-2 focus-visible:outline-green-400"><Edit className="h-4 w-4" aria-hidden="true" /></Link><button type="button" aria-label={`Xóa group ${item.name}`} onClick={() => { setSelected(new Set([item.id])); setConfirming(true); }} className="rounded border border-red-900 bg-red-950/30 p-2 text-red-400 hover:bg-red-900/50 focus-visible:outline-2 focus-visible:outline-red-400"><Trash2 className="h-4 w-4" aria-hidden="true" /></button></div></td>
              </tr>
            ))}
            {loading ? <tr><td colSpan={7} className="p-12 text-center text-gray-400"><span role="status">Đang tải group sản phẩm…</span></td></tr> : null}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-800 bg-gray-950/50 p-4">
        <label className="flex items-center gap-2 text-xs text-gray-400">Số hàng <select value={limit} onChange={(event) => setLimit(Number(event.target.value))} className="rounded border border-gray-700 bg-gray-900 px-2 py-1.5 text-gray-200"><option>20</option><option>50</option><option>100</option></select></label>
        <div className="flex items-center gap-2"><button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} aria-label="Trang trước" className="rounded border border-gray-700 p-2 text-gray-300 disabled:opacity-40"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button><span className="text-xs text-gray-400">Trang {pagination.currentPage}/{pagination.totalPages}</span><button type="button" disabled={page >= pagination.totalPages || loading} onClick={() => setPage((value) => value + 1)} aria-label="Trang sau" className="rounded border border-gray-700 p-2 text-gray-300 disabled:opacity-40"><ChevronRight className="h-4 w-4" aria-hidden="true" /></button></div>
      </div>

      <ConfirmDeleteModal open={confirming} title={`Xóa vĩnh viễn ${selectedItems.length} group?`} description="Các thuộc tính, giá trị và liên kết SKU trong group sẽ bị xóa. Sản phẩm gốc không bị xóa." itemName={selectedItems.map((item) => item.name).slice(0, 3).join(', ')} error="" loading={deleting} onCancel={() => { if (!deleting) setConfirming(false); }} onConfirm={deleteSelected} />
    </div>
  );
}
