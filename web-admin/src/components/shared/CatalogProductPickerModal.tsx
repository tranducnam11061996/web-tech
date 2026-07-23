'use client';

import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type CatalogProductChoice = {
  id: number;
  storeSKU: string;
  proName: string;
  brandId: number;
  brandName: string;
  proThum: string;
  price: number;
  market_price: number;
  isOn: number;
  assignedGroupId?: number | null;
  assignedGroupName?: string | null;
};

export type CatalogBrandChoice = { id: number; name: string; productCount: number };

export function CatalogProductPickerModal({
  isOpen,
  onClose,
  selectedProductIds,
  onSelect,
  title,
  description,
  emptyText = 'Không có SKU phù hợp.',
  queryParams,
  brands: providedBrands,
  brandsEndpoint = '/api/admin/product-groups/brands',
  selectingProductId = null,
  selectionError = '',
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedProductIds: number[];
  onSelect: (product: CatalogProductChoice) => void;
  title: string;
  description: string;
  emptyText?: string;
  queryParams?: Record<string, string | number | undefined>;
  brands?: CatalogBrandChoice[];
  brandsEndpoint?: string;
  selectingProductId?: number | null;
  selectionError?: string;
}) {
  const generatedId = useId().replace(/:/g, '');
  const titleId = `${generatedId}-catalog-product-picker-title`;
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const [query, setQuery] = useState('');
  const [brandId, setBrandId] = useState('');
  const [status, setStatus] = useState('1');
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState<CatalogProductChoice[]>([]);
  const [loadedBrands, setLoadedBrands] = useState<CatalogBrandChoice[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const brands = providedBrands || loadedBrands;
  const stableQueryParams = useMemo(
    () => Object.entries(queryParams || {}).filter((entry): entry is [string, string | number] => entry[1] !== undefined),
    [queryParams],
  );

  useEffect(() => {
    if (!isOpen) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => searchRef.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      ));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || providedBrands || loadedBrands.length > 0) return;
    fetch(brandsEndpoint, { cache: 'no-store' })
      .then(async (response) => ({ response, payload: await response.json() }))
      .then(({ response, payload }) => {
        if (response.ok && payload.success) setLoadedBrands(payload.data || []);
      })
      .catch(() => undefined);
  }, [brandsEndpoint, isOpen, loadedBrands.length, providedBrands]);

  useEffect(() => setPage(1), [query, brandId, status]);
  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const params = new URLSearchParams({ page: String(page), limit: '20' });
        for (const [key, value] of stableQueryParams) params.set(key, String(value));
        if (query.trim()) params.set('search', query.trim());
        if (brandId) params.set('brandId', brandId);
        if (status) params.set('status', status);
        const response = await fetch(`/api/admin/products?${params}`, { signal: controller.signal, cache: 'no-store' });
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể tải sản phẩm.');
        setProducts(payload.data.items || []);
        setTotalPages(payload.data.pagination?.totalPages || 1);
      } catch (fetchError) {
        if ((fetchError as Error).name !== 'AbortError') {
          setError((fetchError as Error).message || 'Không thể tải sản phẩm.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [brandId, isOpen, page, query, stableQueryParams, status]);

  if (!isOpen || typeof document === 'undefined') return null;
  const selectedSet = new Set(selectedProductIds);
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        tabIndex={-1}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Đóng hộp chọn sản phẩm"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[92vh] w-full max-w-[1400px] flex-col overflow-hidden rounded-xl border border-gray-800 bg-gray-950 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-800 bg-blue-950/35 p-4">
          <div>
            <h2 id={titleId} className="text-lg font-bold text-white">{title}</h2>
            <p className="mt-1 text-xs text-gray-400">{description}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="rounded p-2 text-gray-400 hover:bg-gray-800 hover:text-white focus-visible:outline-2 focus-visible:outline-blue-400">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-3 border-b border-gray-800 bg-gray-900/40 p-4 md:grid-cols-[minmax(260px,1fr)_240px_180px]">
          <label className="relative">
            <span className="sr-only">Tìm theo SKU hoặc tên sản phẩm</span>
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-500" aria-hidden="true" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              maxLength={150}
              placeholder="Tìm SKU hoặc tên sản phẩm..."
              className="w-full rounded-md border border-gray-700 bg-gray-950 py-2 pl-9 pr-3 text-sm text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30"
            />
          </label>
          <label>
            <span className="sr-only">Lọc theo thương hiệu</span>
            <select value={brandId} onChange={(event) => setBrandId(event.target.value)} className="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500">
              <option value="">Tất cả thương hiệu</option>
              {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.name} ({brand.productCount})</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Lọc theo trạng thái</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-200 outline-none focus:border-blue-500">
              <option value="">Mọi trạng thái</option>
              <option value="1">Đang bán</option>
              <option value="0">Đang ẩn</option>
            </select>
          </label>
        </div>

        <div className="min-h-[360px] flex-1 overflow-auto custom-scrollbar" aria-busy={loading}>
          {error ? <div role="alert" className="m-4 rounded-md border border-red-900 bg-red-950/30 p-3 text-red-300">{error}</div> : null}
          {selectionError ? <div role="alert" className="m-4 rounded-md border border-red-900 bg-red-950/30 p-3 text-red-300">{selectionError}</div> : null}
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-gray-900 text-xs uppercase tracking-wide text-gray-400">
              <tr><th className="p-3">Sản phẩm</th><th className="p-3">Thương hiệu</th><th className="p-3">Giá</th><th className="p-3 text-center">Trạng thái</th><th className="w-28 p-3 text-center">Chọn</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {!loading && products.length === 0 ? <tr><td colSpan={5} className="p-12 text-center text-gray-400">{emptyText}</td></tr> : null}
              {products.map((product) => {
                const selected = selectedSet.has(Number(product.id));
                const selecting = selectingProductId === Number(product.id);
                return (
                  <tr key={product.id} className="hover:bg-gray-800/25">
                    <td className="max-w-[620px] p-3"><div className="font-medium text-gray-100">{product.proName}</div><div className="mt-1 font-mono text-xs text-blue-300">{product.storeSKU} · ID {product.id}</div></td>
                    <td className="p-3 text-gray-300">{product.brandName || '—'}</td>
                    <td className="p-3 font-semibold text-red-300">{new Intl.NumberFormat('vi-VN').format(Number(product.price || 0))}đ</td>
                    <td className="p-3 text-center"><span className={Number(product.isOn) === 1 ? 'text-emerald-300' : 'text-amber-300'}>{Number(product.isOn) === 1 ? 'Đang bán' : 'Đang ẩn'}</span></td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        disabled={selected || selectingProductId !== null}
                        onClick={() => onSelect(product)}
                        className="rounded-md border border-blue-700 bg-blue-950/40 px-3 py-1.5 font-semibold text-blue-300 hover:bg-blue-900/50 focus-visible:outline-2 focus-visible:outline-blue-400 disabled:cursor-not-allowed disabled:border-gray-700 disabled:text-gray-500"
                      >
                        {selected ? 'Đã chọn' : selecting ? 'Đang lưu…' : 'Chọn'}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {loading ? <tr><td colSpan={5} className="p-12 text-center text-gray-400"><span role="status">Đang tải sản phẩm…</span></td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-center gap-3 border-t border-gray-800 p-4">
          <button type="button" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} aria-label="Trang sản phẩm trước" className="rounded border border-gray-700 p-2 text-gray-300 focus-visible:outline-2 focus-visible:outline-blue-400 disabled:opacity-40"><ChevronLeft className="h-4 w-4" aria-hidden="true" /></button>
          <span className="text-sm text-gray-400">Trang {page}/{totalPages}</span>
          <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage((value) => value + 1)} aria-label="Trang sản phẩm sau" className="rounded border border-gray-700 p-2 text-gray-300 focus-visible:outline-2 focus-visible:outline-blue-400 disabled:opacity-40"><ChevronRight className="h-4 w-4" aria-hidden="true" /></button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
