'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Gift, Loader2, PlusCircle, Search } from 'lucide-react';
import { RichTextEditor } from './RichTextEditor';

type ComboSetNode = {
  id: number;
  relationId?: number;
  title: string;
  status: number;
  product_count?: number;
  from_time?: number;
  to_time?: number;
  isSelected?: boolean;
};

type PaginationData = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
};

const EMPTY_PAGINATION: PaginationData = {
  currentPage: 1,
  totalPages: 1,
  totalItems: 0,
  pageSize: 20,
};

function formatUnixTime(unixTimestamp?: number) {
  if (!unixTimestamp) return '-';
  const date = new Date(unixTimestamp * 1000);
  return `${date.toLocaleDateString('vi-VN')} ${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
}

function LocalPagination({
  pagination,
  disabled,
  onPageChange,
  onLimitChange,
}: {
  pagination: PaginationData;
  disabled: boolean;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}) {
  const pages = [];
  const start = Math.max(1, pagination.currentPage - 2);
  const end = Math.min(pagination.totalPages, start + 4);
  for (let page = start; page <= end; page += 1) pages.push(page);

  return (
    <div className="p-4 bg-gray-950/50 border-t border-gray-800 flex items-center justify-between gap-4 text-sm flex-wrap">
      <div className="flex items-center gap-2">
        <label className="text-gray-500 font-mono text-xs uppercase tracking-wider" htmlFor="combo-page-size">Hiển thị</label>
        <select
          id="combo-page-size"
          value={pagination.pageSize}
          disabled={disabled}
          onChange={(event) => onLimitChange(Number(event.target.value))}
          className="bg-gray-900 border border-gray-700 rounded-sm px-2 py-1 text-gray-300 focus:outline-none focus:border-red-500/50 cursor-pointer disabled:opacity-50"
        >
          <option value="20">20</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
        <span className="text-gray-500 font-mono text-xs ml-2">Tổng số: {pagination.totalItems}</span>
      </div>

      <div className="flex items-center gap-1 ml-auto" aria-label="Phân trang combo set">
        <button type="button" onClick={() => onPageChange(1)} disabled={disabled || pagination.currentPage === 1} className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-500 hover:text-white hover:border-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Trang đầu">
          |&lt;
        </button>
        <button type="button" onClick={() => onPageChange(pagination.currentPage - 1)} disabled={disabled || pagination.currentPage === 1} className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-500 hover:text-white hover:border-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Trang trước">
          &lt;
        </button>
        {pages.map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            disabled={disabled}
            aria-current={page === pagination.currentPage ? 'page' : undefined}
            className={`w-8 h-8 flex items-center justify-center rounded-sm transition-colors ${
              page === pagination.currentPage
                ? 'border border-red-500 bg-red-500/20 text-red-400 font-bold shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                : 'border border-gray-800 bg-gray-900 text-gray-400 hover:text-white hover:border-gray-600'
            } disabled:opacity-50`}
          >
            {page}
          </button>
        ))}
        <button type="button" onClick={() => onPageChange(pagination.currentPage + 1)} disabled={disabled || pagination.currentPage === pagination.totalPages} className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-500 hover:text-white hover:border-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Trang sau">
          &gt;
        </button>
        <button type="button" onClick={() => onPageChange(pagination.totalPages)} disabled={disabled || pagination.currentPage === pagination.totalPages} className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-500 hover:text-white hover:border-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" aria-label="Trang cuối">
          &gt;|
        </button>
      </div>
    </div>
  );
}

export function TabCombo({
  productId,
  form,
  onChange,
  initialComboSets = [],
  isActive = true,
}: {
  productId?: number;
  form?: Record<string, any>;
  onChange?: (field: string, value: any) => void;
  initialComboSets?: ComboSetNode[];
  isActive?: boolean;
}) {
  const [appliedCombos, setAppliedCombos] = useState<ComboSetNode[]>(initialComboSets);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [catalogCombos, setCatalogCombos] = useState<ComboSetNode[]>([]);
  const [pagination, setPagination] = useState<PaginationData>(EMPTY_PAGINATION);
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState('all');
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [addingId, setAddingId] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const selectedIds = useMemo(() => new Set(appliedCombos.map((combo) => Number(combo.id))), [appliedCombos]);

  useEffect(() => {
    setAppliedCombos(initialComboSets);
  }, [initialComboSets]);

  useEffect(() => {
    if (!isActive) setCatalogOpen(false);
  }, [isActive]);

  const loadCatalog = useCallback(async (page = 1, limit = pagination.pageSize) => {
    if (!productId) return;
    setLoadingCatalog(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        status,
        productId: String(productId),
      });
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      const response = await fetch(`/api/admin/combo-sets?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể tải danh sách combo set.');
      setCatalogCombos(payload.data?.combos || []);
      setPagination(payload.data?.pagination || EMPTY_PAGINATION);
      setCatalogLoaded(true);
    } catch (catalogError: any) {
      setError(catalogError.message || 'Không thể tải danh sách combo set.');
    } finally {
      setLoadingCatalog(false);
    }
  }, [pagination.pageSize, productId, searchTerm, status]);

  const openCatalog = async () => {
    setCatalogOpen(true);
    if (!catalogLoaded) await loadCatalog(1, pagination.pageSize);
  };

  const addCombo = async (setId: number) => {
    if (!productId) return;
    setAddingId(setId);
    setMessage('');
    setError('');
    try {
      const response = await fetch(`/api/admin/products/${productId}/combo-sets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setId }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể thêm combo set.');
      setAppliedCombos(payload.data?.items || []);
      setCatalogCombos((current) => current.map((combo) => combo.id === setId ? { ...combo, isSelected: true } : combo));
      setMessage(payload.message || 'Đã thêm sản phẩm vào combo set.');
    } catch (addError: any) {
      setError(addError.message || 'Không thể thêm combo set.');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <RichTextEditor
        title="Khuyến mãi"
        minHeight="240px"
        value={form?.specialOffer || ''}
        onChange={(value) => onChange?.('specialOffer', value)}
      />

      <section className="space-y-4" aria-busy={loadingCatalog || addingId !== null}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-bold text-gray-200 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1 h-4 bg-red-500 rounded-full inline-block shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
            Combo set đang áp dụng
          </h3>
          <button
            type="button"
            onClick={openCatalog}
            disabled={!productId || loadingCatalog}
            aria-expanded={catalogOpen}
            aria-controls="combo-set-catalog"
            className="inline-flex items-center justify-center gap-2 rounded-sm border border-blue-500/50 bg-blue-500/10 px-4 py-2 text-xs font-bold uppercase tracking-wider text-blue-300 transition-colors hover:border-blue-400 hover:bg-blue-500/15 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loadingCatalog && !catalogLoaded ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <PlusCircle className="h-4 w-4" aria-hidden="true" />}
            {appliedCombos.length > 0 ? 'Chọn thêm combo set' : 'Chọn combo set'}
          </button>
        </div>

        {!productId && (
          <div className="rounded-sm border border-amber-900/50 bg-amber-950/20 px-4 py-3 text-xs font-medium text-amber-300">
            Hãy lưu sản phẩm ở tab Cơ bản trước khi chọn combo set.
          </div>
        )}
        {message && <div aria-live="polite" className="rounded-sm border border-green-900 bg-green-950/30 px-3 py-2 text-xs font-bold text-green-300">{message}</div>}
        {error && <div role="alert" className="rounded-sm border border-red-900 bg-red-950/30 px-3 py-2 text-xs font-bold text-red-300">{error}</div>}

        {appliedCombos.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-gray-800 bg-gray-950/40">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-950/80 text-xs uppercase tracking-wider text-gray-400">
                  <th className="p-3 font-bold">ID</th>
                  <th className="p-3 font-bold">Tên combo set</th>
                  <th className="p-3 font-bold">Trạng thái</th>
                  <th className="p-3 font-bold">Thời gian áp dụng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {appliedCombos.map((combo) => (
                  <tr key={combo.id} className="hover:bg-gray-900/60">
                    <td className="p-3 font-mono text-gray-500">{combo.id}</td>
                    <td className="p-3 font-medium text-gray-200">{combo.title}</td>
                    <td className="p-3">
                      {combo.status === 1 ? (
                        <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2 py-1 text-xs text-green-400">Hoạt động</span>
                      ) : (
                        <span className="rounded-full border border-gray-500/30 bg-gray-500/10 px-2 py-1 text-xs text-gray-400">Tạm ngưng</span>
                      )}
                    </td>
                    <td className="p-3 text-xs text-gray-500">{formatUnixTime(combo.from_time)} → {formatUnixTime(combo.to_time)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {catalogOpen && (
          <div id="combo-set-catalog" className="overflow-hidden rounded-lg border border-gray-800 bg-gray-950/40">
            <div className="flex flex-col gap-3 border-b border-gray-800 p-4 lg:flex-row lg:items-center">
              <div className="relative flex-1 group">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500 group-focus-within:text-red-500 transition-colors" aria-hidden="true" />
                <label htmlFor="combo-search" className="sr-only">Tìm kiếm combo set</label>
                <input
                  id="combo-search"
                  type="text"
                  placeholder="Nhập từ khóa tìm kiếm combo set..."
                  className="w-full pl-9 pr-3 py-2 bg-gray-900 border border-gray-700 rounded-sm text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all shadow-inner"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && loadCatalog(1, pagination.pageSize)}
                />
              </div>
              <label htmlFor="combo-status" className="sr-only">Trạng thái combo set</label>
              <select
                id="combo-status"
                className="bg-gray-900 border border-gray-700 rounded-sm px-4 py-2 text-sm text-gray-400 focus:outline-none focus:border-red-500/50 transition-all cursor-pointer"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="active">Đang hoạt động</option>
                <option value="inactive">Tạm ngưng</option>
              </select>
              <button
                type="button"
                onClick={() => loadCatalog(1, pagination.pageSize)}
                disabled={loadingCatalog}
                className="inline-flex items-center justify-center gap-2 rounded-sm border border-blue-500 bg-blue-600 px-6 py-2 text-sm font-bold uppercase tracking-wider text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingCatalog ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Search className="h-4 w-4" aria-hidden="true" />}
                Tìm kiếm
              </button>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-950/80 border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider font-mono">
                    <th className="p-4 font-bold">ID</th>
                    <th className="p-4 font-bold">Tên combo set</th>
                    <th className="p-4 font-bold text-center">Số SP</th>
                    <th className="p-4 font-bold">Trạng thái</th>
                    <th className="p-4 font-bold text-center w-48">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {loadingCatalog && catalogCombos.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-gray-500 font-mono">Đang tải combo set...</td></tr>
                  ) : catalogCombos.length === 0 ? (
                    <tr><td colSpan={5} className="p-8 text-center text-gray-500 font-mono">Không tìm thấy combo set nào</td></tr>
                  ) : (
                    catalogCombos.map((combo) => {
                      const isSelected = combo.isSelected || selectedIds.has(combo.id);
                      return (
                        <tr key={combo.id} className="hover:bg-gray-800/30 transition-colors group">
                          <td className="p-4 text-gray-500">{combo.id}</td>
                          <td className="p-4 font-medium text-gray-300 group-hover:text-red-400 transition-colors">{combo.title}</td>
                          <td className="p-4 text-center text-blue-300">{combo.product_count || 0}</td>
                          <td className="p-4">
                            {combo.status === 1 ? (
                              <span className="px-2 py-1 text-xs text-green-400 bg-green-500/10 border border-green-500/30 rounded-full">Hoạt động</span>
                            ) : (
                              <span className="px-2 py-1 text-xs text-gray-400 bg-gray-500/10 border border-gray-500/30 rounded-full">Tạm ngưng</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <button
                              type="button"
                              onClick={() => addCombo(combo.id)}
                              disabled={isSelected || addingId !== null}
                              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-400 transition-all hover:text-blue-300 disabled:cursor-not-allowed disabled:text-gray-500"
                            >
                              {isSelected ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : addingId === combo.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Gift className="h-3.5 w-3.5" aria-hidden="true" />}
                              {isSelected ? 'Đã chọn' : addingId === combo.id ? 'Đang chọn' : 'Chọn set này'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <LocalPagination
              pagination={pagination}
              disabled={loadingCatalog}
              onPageChange={(page) => loadCatalog(page, pagination.pageSize)}
              onLimitChange={(limit) => loadCatalog(1, limit)}
            />
          </div>
        )}
      </section>
    </div>
  );
}
