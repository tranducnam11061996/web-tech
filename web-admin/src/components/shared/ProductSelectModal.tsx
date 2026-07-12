'use client';

import { Check, Loader2, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export type SelectableProduct = {
  id: number;
  proName: string;
  storeSKU: string;
  isOn?: number;
};

type Pagination = { currentPage: number; totalPages: number; totalItems: number; pageSize: number };
const EMPTY_PAGINATION: Pagination = { currentPage: 1, totalPages: 1, totalItems: 0, pageSize: 20 };
const EMPTY_PRODUCTS: SelectableProduct[] = [];

export function ProductSelectModal({
  isOpen,
  onClose,
  onSelect,
  multiple = true,
  initialSelected = EMPTY_PRODUCTS,
  title = 'Tìm kiếm và chọn sản phẩm',
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (products: SelectableProduct[]) => void;
  multiple?: boolean;
  initialSelected?: SelectableProduct[];
  title?: string;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState<SelectableProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [selectedProducts, setSelectedProducts] = useState<Map<number, SelectableProduct>>(() => new Map());
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    setSearchTerm('');
    setSearchInput('');
    setPage(1);
    setError('');
    setSelectedProducts(new Map(initialSelected.map((product) => [Number(product.id), product])));
  }, [initialSelected, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (searchTerm) params.set('search', searchTerm);
    fetch(`/api/admin/products?${params}`, { signal: controller.signal })
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok || !json.success) throw new Error(json.error?.message || 'Không thể tải danh sách sản phẩm.');
        setProducts(json.data.items || []);
        setPagination(json.data.pagination || EMPTY_PAGINATION);
      })
      .catch((reason: unknown) => {
        if ((reason as { name?: string })?.name !== 'AbortError') setError(reason instanceof Error ? reason.message : 'Không thể tải danh sách sản phẩm.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [isOpen, page, searchTerm]);

  useEffect(() => {
    if (!isOpen) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => searchRef.current?.focus({ preventScroll: true }));
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); closeRef.current(); return; }
      if (event.key !== 'Tab') return;
      const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),[href],[tabindex]:not([tabindex="-1"])') || []);
      const first = controls[0];
      const last = controls.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus({ preventScroll: true });
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const runSearch = () => { setSearchTerm(searchInput.trim()); setPage(1); };
  const toggleSelect = (product: SelectableProduct) => setSelectedProducts((current) => {
    const next = new Map(current);
    if (next.has(product.id)) next.delete(product.id);
    else { if (!multiple) next.clear(); next.set(product.id, product); }
    return next;
  });
  const allCurrentPageSelected = products.length > 0 && products.every((product) => selectedProducts.has(product.id));
  const toggleCurrentPage = () => setSelectedProducts((current) => {
    const next = new Map(current);
    if (allCurrentPageSelected) products.forEach((product) => next.delete(product.id));
    else products.forEach((product) => next.set(product.id, product));
    return next;
  });
  const confirm = () => { onSelect([...selectedProducts.values()]); onClose(); };

  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="product-selector-title" aria-busy={loading} className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-gray-700 bg-[#0d0d12] shadow-2xl">
      <div className="flex items-start justify-between border-b border-gray-800 px-5 py-4">
        <div><h2 id="product-selector-title" className="text-lg font-bold text-white">{title}</h2><p className="mt-1 text-sm text-gray-500">Lựa chọn được giữ nguyên khi chuyển trang kết quả.</p></div>
        <button type="button" onClick={onClose} aria-label="Đóng bộ chọn sản phẩm" className="grid h-11 w-11 place-items-center rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white focus-visible:outline-2 focus-visible:outline-blue-400"><X aria-hidden="true" className="h-5 w-5" /></button>
      </div>
      <div className="flex gap-3 border-b border-gray-800 bg-gray-950/70 p-4">
        <label className="relative flex-1"><span className="sr-only">Tìm sản phẩm theo tên, SKU hoặc ID</span><Search aria-hidden="true" className="absolute left-3 top-3 h-4 w-4 text-gray-500" /><input ref={searchRef} value={searchInput} onChange={(event) => setSearchInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); runSearch(); } }} placeholder="Tên, SKU hoặc ID sản phẩm" className="min-h-11 w-full rounded-lg border border-gray-700 bg-gray-900 pl-10 pr-3 text-sm text-white outline-none focus:border-blue-500" /></label>
        <button type="button" onClick={runSearch} className="min-h-11 rounded-lg bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-blue-300">Tìm kiếm</button>
      </div>
      {error ? <div role="alert" className="border-b border-red-800/50 bg-red-950/30 px-4 py-3 text-sm text-red-200">{error}</div> : null}
      <div className="relative min-h-72 flex-1 overflow-auto">
        {loading ? <div className="absolute inset-0 z-10 grid place-items-center bg-gray-950/60"><span role="status" className="flex items-center gap-2 text-sm text-gray-300"><Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-blue-400" />Đang tải sản phẩm...</span></div> : null}
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="sticky top-0 z-[1] border-b border-gray-800 bg-gray-900 text-xs uppercase tracking-wide text-gray-500"><tr><th className="w-16 px-4 py-3">{multiple ? <button type="button" onClick={toggleCurrentPage} aria-label={allCurrentPageSelected ? 'Bỏ chọn trang hiện tại' : 'Chọn trang hiện tại'} className="grid h-10 w-10 place-items-center rounded-md focus-visible:outline-2 focus-visible:outline-blue-400">{allCurrentPageSelected ? <CheckSquareIcon /> : <span className="h-4 w-4 rounded border border-gray-600" />}</button> : null}</th><th className="px-4 py-3">SKU / ID</th><th className="px-4 py-3">Sản phẩm</th><th className="px-4 py-3">Trạng thái</th></tr></thead>
          <tbody>{!loading && products.length === 0 ? <tr><td colSpan={4} className="px-4 py-16 text-center text-gray-500">Không tìm thấy sản phẩm phù hợp.</td></tr> : products.map((product) => {
            const selected = selectedProducts.has(product.id);
            return <tr key={product.id} className={selected ? 'border-b border-gray-900 bg-blue-950/20' : 'border-b border-gray-900 hover:bg-gray-900/60'}><td className="px-4 py-2"><button type="button" onClick={() => toggleSelect(product)} aria-pressed={selected} aria-label={`${selected ? 'Bỏ chọn' : 'Chọn'} ${product.proName}`} className="grid h-10 w-10 place-items-center rounded-md focus-visible:outline-2 focus-visible:outline-blue-400">{selected ? <Check aria-hidden="true" className="h-4 w-4 text-blue-300" /> : <span className="h-4 w-4 rounded border border-gray-600" />}</button></td><td className="px-4 py-3"><p className="font-mono text-blue-200">{product.storeSKU || '—'}</p><p className="text-xs text-gray-600">ID {product.id}</p></td><td className="px-4 py-3 font-medium text-gray-200">{product.proName}</td><td className="px-4 py-3"><span className={Number(product.isOn) === 1 ? 'text-emerald-300' : 'text-amber-300'}>{Number(product.isOn) === 1 ? 'Đang bán' : 'Đang ẩn'}</span></td></tr>;
          })}</tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 border-t border-gray-800 bg-gray-950 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-400">Đã chọn <strong className="tabular-nums text-blue-300">{selectedProducts.size}</strong> sản phẩm</p>
        <div className="flex items-center justify-center gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="min-h-10 rounded-lg border border-gray-700 px-3 text-sm text-gray-300 disabled:opacity-40">Trước</button><span className="px-2 text-xs tabular-nums text-gray-500">{page}/{pagination.totalPages}</span><button type="button" disabled={page >= pagination.totalPages} onClick={() => setPage((current) => current + 1)} className="min-h-10 rounded-lg border border-gray-700 px-3 text-sm text-gray-300 disabled:opacity-40">Sau</button></div>
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="min-h-11 rounded-lg border border-gray-700 px-4 text-sm text-gray-300 hover:bg-gray-800">Hủy</button><button type="button" onClick={confirm} disabled={selectedProducts.size === 0} className="min-h-11 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"><Check aria-hidden="true" className="mr-2 inline h-4 w-4" />Xác nhận</button></div>
      </div>
    </div>
  </div>;
}

function CheckSquareIcon() {
  return <span aria-hidden="true" className="grid h-4 w-4 place-items-center rounded border border-blue-500 bg-blue-600"><Check className="h-3 w-3 text-white" /></span>;
}
