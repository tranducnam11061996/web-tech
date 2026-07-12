'use client';

import { CalendarClock, Edit3, ExternalLink, Link2, Loader2, Megaphone, PackagePlus, Plus, Save, Search, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CategoryScopeSelector, type CategoryScopeItem } from '@/components/shared/CategoryScopeSelector';
import { ProductSelectModal, type SelectableProduct } from '@/components/shared/ProductSelectModal';

type PromotionState = 'disabled' | 'scheduled' | 'active' | 'expired';
type PromotionListItem = {
  id: number;
  displayText: string;
  detailUrl: string;
  status: number;
  displayOrder: number;
  state: PromotionState;
  startsAt: string | null;
  endsAt: string | null;
  productCount: number;
  categoryCount: number;
};
type PromotionForm = {
  displayText: string;
  detailUrl: string;
  status: boolean;
  displayOrder: number;
  startsAt: string;
  endsAt: string;
  products: SelectableProduct[];
  categoryIds: number[];
};
type Pagination = { page: number; totalPages: number; total: number; limit: number };

const EMPTY_FORM: PromotionForm = { displayText: '', detailUrl: '', status: true, displayOrder: 0, startsAt: '', endsAt: '', products: [], categoryIds: [] };
const EMPTY_PAGINATION: Pagination = { page: 1, totalPages: 1, total: 0, limit: 20 };
const STATE_LABELS: Record<PromotionState, string> = { active: 'Đang chạy', scheduled: 'Sắp chạy', expired: 'Đã hết hạn', disabled: 'Đã tắt' };
const STATE_CLASSES: Record<PromotionState, string> = {
  active: 'border-emerald-700/40 bg-emerald-950/30 text-emerald-300',
  scheduled: 'border-blue-700/40 bg-blue-950/30 text-blue-300',
  expired: 'border-amber-700/40 bg-amber-950/30 text-amber-300',
  disabled: 'border-gray-700 bg-gray-900 text-gray-400',
};

function isExternalUrl(url: string) { return /^https:\/\//i.test(url); }
function displayDate(value: string | null) { return value ? value.replace('T', ' ') : 'Không giới hạn'; }
function normalizeProductSearch(value: string) {
  return value.toLocaleLowerCase('vi-VN').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').trim();
}

export function ProductPromotionManager({ editPromotionId, standalone = false }: { editPromotionId?: number; standalone?: boolean }) {
  const router = useRouter();
  const [items, setItems] = useState<PromotionListItem[]>([]);
  const [categories, setCategories] = useState<CategoryScopeItem[]>([]);
  const [pagination, setPagination] = useState(EMPTY_PAGINATION);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [scopeFilter, setScopeFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<PromotionForm>(EMPTY_FORM);
  const [formOpen, setFormOpen] = useState(false);
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [selectedProductQuery, setSelectedProductQuery] = useState('');
  const dialogRef = useRef<HTMLFormElement>(null);
  const firstFieldRef = useRef<HTMLTextAreaElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const productPickerOpenRef = useRef(false);
  const loadedEditRef = useRef(false);
  useEffect(() => { productPickerOpenRef.current = productPickerOpen; }, [productPickerOpen]);

  const filteredSelectedProducts = useMemo(() => {
    const query = normalizeProductSearch(selectedProductQuery);
    if (!query) return form.products;
    return form.products.filter((product) => [product.proName, product.storeSKU, String(product.id)]
      .some((value) => normalizeProductSearch(value).includes(query)));
  }, [form.products, selectedProductQuery]);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage('');
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (search) params.set('search', search);
    if (stateFilter) params.set('state', stateFilter);
    if (scopeFilter) params.set('scope', scopeFilter);
    try {
      const response = await fetch(`/api/admin/product-promotions?${params}`);
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error?.message || 'Không thể tải chương trình khuyến mãi.');
      setItems(json.data.items || []);
      setPagination(json.data.pagination || EMPTY_PAGINATION);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể tải chương trình khuyến mãi.');
    } finally {
      setLoading(false);
    }
  }, [page, scopeFilter, search, stateFilter]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/admin/product-categories', { signal: controller.signal })
      .then((response) => response.json())
      .then((json) => { if (json.success) setCategories(json.data.items || []); })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setProductPickerOpen(false);
    if (standalone) router.push('/sales/product-promotions');
  }, [router, standalone]);
  useEffect(() => {
    if (!formOpen || standalone) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => firstFieldRef.current?.focus({ preventScroll: true }));
    const onKeyDown = (event: KeyboardEvent) => {
      if (productPickerOpenRef.current) return;
      if (event.key === 'Escape') { event.preventDefault(); closeForm(); return; }
      if (event.key !== 'Tab') return;
      const controls = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])') || []);
      const first = controls[0];
      const last = controls.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus({ preventScroll: true });
    };
  }, [closeForm, formOpen]);

  const startCreate = () => {
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    setEditingId(null);
    setForm(EMPTY_FORM);
    setSelectedProductQuery('');
    setFieldErrors({});
    setFormError('');
    setFormOpen(true);
  };
  const startEdit = async (id: number) => {
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    setMessage('');
    try {
      const response = await fetch(`/api/admin/product-promotions/${id}`);
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error?.message || 'Không thể tải chương trình.');
      const value = json.data;
      setEditingId(id);
      setForm({
        displayText: value.displayText || '', detailUrl: value.detailUrl || '', status: Number(value.status) === 1,
        displayOrder: Number(value.displayOrder || 0), startsAt: value.startsAt || '', endsAt: value.endsAt || '',
        products: (value.products || []).map((product: { id: number; sku: string; name: string; status: number }) => ({ id: Number(product.id), storeSKU: product.sku || '', proName: product.name || `Sản phẩm #${product.id}`, isOn: Number(product.status) })),
        categoryIds: (value.categories || []).map((category: { id: number }) => Number(category.id)),
      });
      setSelectedProductQuery('');
      setFieldErrors({});
      setFormError('');
      setFormOpen(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể tải chương trình.');
    }
  };

  useEffect(() => {
    if (!standalone) return;
    if (!editPromotionId) {
      setMessage('Mã chương trình khuyến mãi không hợp lệ.');
      return;
    }
    if (loadedEditRef.current) return;
    loadedEditRef.current = true;
    void startEdit(editPromotionId);
  }, [editPromotionId, standalone]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!form.displayText.trim()) errors.displayText = 'Nhập nội dung hiển thị.';
    if (!form.detailUrl.trim()) errors.detailUrl = 'Nhập đường dẫn chi tiết.';
    if (form.products.length === 0 && form.categoryIds.length === 0) errors.scope = 'Chọn ít nhất một SKU hoặc danh mục.';
    if ((form.startsAt && !form.endsAt) || (!form.startsAt && form.endsAt)) errors.schedule = 'Cần nhập đủ thời gian bắt đầu và kết thúc.';
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) { setFormError('Vui lòng kiểm tra các trường được đánh dấu.'); return; }
    setSaving(true);
    setFormError('');
    try {
      const response = await fetch(editingId ? `/api/admin/product-promotions/${editingId}` : '/api/admin/product-promotions', {
        method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, productIds: form.products.map((product) => product.id) }),
      });
      const json = await response.json();
      if (!response.ok || !json.success) {
        setFieldErrors(json.error?.fields || {});
        throw new Error(json.error?.message || 'Không thể lưu chương trình.');
      }
      closeForm();
      setMessage(editingId ? 'Đã cập nhật chương trình khuyến mãi.' : 'Đã tạo chương trình khuyến mãi.');
      await load();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Không thể lưu chương trình.');
    } finally {
      setSaving(false);
    }
  };

  const removePromotion = async () => {
    if (!editingId || !window.confirm('Xóa vĩnh viễn chương trình này và toàn bộ liên kết SKU/danh mục?')) return;
    setDeleting(true);
    setFormError('');
    try {
      const response = await fetch(`/api/admin/product-promotions/${editingId}`, { method: 'DELETE' });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error?.message || 'Không thể xóa chương trình.');
      closeForm();
      setMessage('Đã xóa chương trình khuyến mãi.');
      await load();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Không thể xóa chương trình.');
    } finally {
      setDeleting(false);
    }
  };

  const applySearch = () => { setPage(1); setSearch(searchInput.trim()); };

  return <section className="space-y-4">
    {!standalone ? <>
    <header className="rounded-2xl border border-gray-800 bg-gray-950/60 p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div><h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white"><Megaphone aria-hidden="true" className="h-6 w-6 text-red-400" />Khuyến mãi sản phẩm</h1><p className="mt-1 max-w-2xl text-sm leading-6 text-gray-400">Quản lý nội dung ưu đãi hiển thị theo SKU hoặc toàn bộ cây danh mục. Chức năng này không thay đổi giá và đơn hàng.</p></div>
        <button type="button" onClick={startCreate} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-500 focus-visible:outline-2 focus-visible:outline-red-300"><Plus aria-hidden="true" className="h-4 w-4" />Tạo chương trình</button>
      </div>
      <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(240px,1fr)_190px_190px_auto]">
        <label className="relative"><span className="sr-only">Tìm chương trình</span><Search aria-hidden="true" className="absolute left-3 top-3.5 h-4 w-4 text-gray-500" /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') applySearch(); }} placeholder="Tìm theo nội dung hoặc URL" className="min-h-11 w-full rounded-lg border border-gray-700 bg-gray-950 pl-10 pr-3 text-sm text-white outline-none focus:border-red-500" /></label>
        <label><span className="sr-only">Lọc trạng thái</span><select value={stateFilter} onChange={(event) => { setStateFilter(event.target.value); setPage(1); }} className="min-h-11 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 text-sm text-white"><option value="">Tất cả trạng thái</option><option value="active">Đang chạy</option><option value="scheduled">Sắp chạy</option><option value="expired">Đã hết hạn</option><option value="disabled">Đã tắt</option></select></label>
        <label><span className="sr-only">Lọc phạm vi</span><select value={scopeFilter} onChange={(event) => { setScopeFilter(event.target.value); setPage(1); }} className="min-h-11 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 text-sm text-white"><option value="">Tất cả phạm vi</option><option value="sku">Chỉ SKU</option><option value="category">Chỉ danh mục</option><option value="mixed">SKU + danh mục</option></select></label>
        <button type="button" onClick={applySearch} className="min-h-11 rounded-lg border border-gray-700 px-5 text-sm font-semibold text-gray-200 hover:border-red-500 hover:text-white focus-visible:outline-2 focus-visible:outline-red-300">Lọc</button>
      </div>
    </header>

    {message ? <div role="status" className="rounded-lg border border-blue-800/40 bg-blue-950/20 px-4 py-3 text-sm text-blue-100">{message}</div> : null}
    <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-950/60" aria-busy={loading}>
      <div className="overflow-x-auto"><table className="w-full min-w-[1080px] text-left text-sm"><thead className="border-b border-gray-800 bg-gray-950 text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-4 py-3">Nội dung</th><th className="px-4 py-3">Ưu tiên</th><th className="px-4 py-3">Phạm vi</th><th className="px-4 py-3">Lịch chạy</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3"><span className="sr-only">Thao tác</span></th></tr></thead><tbody>
        {loading ? <tr><td colSpan={6} className="px-4 py-16 text-center text-gray-500"><span role="status" className="inline-flex items-center gap-2"><Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />Đang tải chương trình...</span></td></tr> : items.length === 0 ? <tr><td colSpan={6} className="px-4 py-16 text-center text-gray-500">Chưa có chương trình phù hợp bộ lọc.</td></tr> : items.map((item) => <tr key={item.id} className="border-b border-gray-900 text-gray-300 last:border-0 hover:bg-gray-900/50"><td className="max-w-[460px] px-4 py-4"><p className="line-clamp-2 font-medium leading-6 text-white">{item.displayText}</p><a href={item.detailUrl} target={isExternalUrl(item.detailUrl) ? '_blank' : undefined} rel={isExternalUrl(item.detailUrl) ? 'noopener noreferrer' : undefined} className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs text-blue-300 hover:text-blue-200 focus-visible:outline-2 focus-visible:outline-blue-400"><Link2 aria-hidden="true" className="h-3 w-3 flex-none" />{item.detailUrl}</a></td><td className="px-4 py-4 font-mono tabular-nums text-gray-200">{item.displayOrder}</td><td className="px-4 py-4"><div className="flex flex-wrap gap-2"><span className="rounded-full bg-blue-950/40 px-2.5 py-1 text-xs text-blue-200">{item.productCount} SKU</span><span className="rounded-full bg-cyan-950/40 px-2.5 py-1 text-xs text-cyan-200">{item.categoryCount} danh mục</span></div></td><td className="px-4 py-4 text-xs leading-5 text-gray-400"><span>{displayDate(item.startsAt)}</span><br /><span>đến {displayDate(item.endsAt)}</span></td><td className="px-4 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${STATE_CLASSES[item.state]}`}>{STATE_LABELS[item.state]}</span></td><td className="px-4 py-4 text-right"><a href={`/sales/product-promotions/${item.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-gray-700 px-3 text-xs font-medium text-gray-200 hover:border-blue-600 hover:text-blue-300 focus-visible:outline-2 focus-visible:outline-blue-400"><Edit3 aria-hidden="true" className="h-3.5 w-3.5" />Sửa</a></td></tr>)}
      </tbody></table></div>
      <div className="flex items-center justify-between border-t border-gray-800 px-4 py-3"><p className="text-xs text-gray-500">Tổng <span className="tabular-nums">{pagination.total}</span> chương trình</p><div className="flex items-center gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="min-h-10 rounded-lg border border-gray-700 px-3 text-sm text-gray-300 disabled:opacity-40">Trước</button><span className="px-2 text-xs tabular-nums text-gray-500">{page}/{pagination.totalPages}</span><button type="button" disabled={page >= pagination.totalPages} onClick={() => setPage((current) => current + 1)} className="min-h-10 rounded-lg border border-gray-700 px-3 text-sm text-gray-300 disabled:opacity-40">Sau</button></div></div>
    </div>
    </> : null}

    {standalone && !formOpen ? <div role={message ? 'alert' : 'status'} className="mx-auto flex min-h-48 max-w-6xl items-center justify-center rounded-2xl border border-gray-800 bg-gray-950/60 px-6 text-sm text-gray-400">{message || 'Đang tải chương trình khuyến mãi...'}</div> : null}
    {formOpen ? <div className={standalone ? 'mx-auto max-w-6xl py-2' : 'fixed inset-0 z-50 overflow-y-auto bg-black/75 p-4 backdrop-blur-sm'} onMouseDown={standalone ? undefined : (event) => { if (event.target === event.currentTarget) closeForm(); }}><form ref={dialogRef} role={standalone ? undefined : 'dialog'} aria-modal={standalone ? undefined : true} aria-labelledby="promotion-form-title" aria-describedby="promotion-form-description" onSubmit={submit} className="mx-auto my-4 max-w-6xl rounded-2xl border border-gray-700 bg-[#0d0d12] shadow-2xl">
      <div className="sticky top-0 z-10 flex items-start justify-between rounded-t-2xl border-b border-gray-800 bg-[#0d0d12]/95 px-5 py-4 backdrop-blur"><div><h2 id="promotion-form-title" className="text-xl font-bold text-white">{editingId ? 'Cập nhật khuyến mãi sản phẩm' : 'Tạo khuyến mãi sản phẩm'}</h2><p id="promotion-form-description" className="mt-1 text-sm text-gray-500">Phạm vi SKU và danh mục được kết hợp theo điều kiện “hoặc”.</p></div><button type="button" onClick={closeForm} aria-label={standalone ? 'Quay lại danh sách khuyến mãi' : 'Đóng biểu mẫu'} className="grid h-11 w-11 place-items-center rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white focus-visible:outline-2 focus-visible:outline-red-300"><X aria-hidden="true" className="h-5 w-5" /></button></div>
      <div className="space-y-6 p-5">
        {formError ? <div id="promotion-form-error" role="alert" className="rounded-lg border border-red-700/40 bg-red-950/30 px-4 py-3 text-sm text-red-200">{formError}</div> : null}
        <fieldset className="rounded-xl border border-gray-800 p-4"><legend className="px-2 text-sm font-semibold text-white">1. Nội dung hiển thị</legend><div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <label className="block text-sm font-medium text-gray-200 lg:col-span-2">Nội dung khuyến mãi<textarea ref={firstFieldRef} value={form.displayText} maxLength={1000} required aria-invalid={Boolean(fieldErrors.displayText)} aria-describedby={fieldErrors.displayText ? 'promotion-text-error' : 'promotion-text-help'} onChange={(event) => setForm((current) => ({ ...current, displayText: event.target.value }))} className="mt-2 min-h-24 w-full resize-y rounded-lg border border-gray-700 bg-gray-950 px-3 py-2.5 leading-6 text-white outline-none focus:border-red-500" /><span id="promotion-text-help" className="mt-1 flex justify-between text-xs text-gray-500"><span>Câu này xuất hiện trực tiếp trên trang sản phẩm.</span><span className="tabular-nums">{form.displayText.length}/1000</span></span>{fieldErrors.displayText ? <span id="promotion-text-error" className="mt-1 block text-xs text-red-300">{fieldErrors.displayText}</span> : null}</label>
          <label className="block text-sm font-medium text-gray-200">Đường dẫn “Xem chi tiết”<input value={form.detailUrl} required aria-invalid={Boolean(fieldErrors.detailUrl)} aria-describedby={fieldErrors.detailUrl ? 'promotion-url-error' : 'promotion-url-help'} onChange={(event) => setForm((current) => ({ ...current, detailUrl: event.target.value }))} placeholder="/khuyen-mai/... hoặc https://..." className="mt-2 min-h-11 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 text-white outline-none focus:border-red-500" /><span id="promotion-url-help" className="mt-1 block text-xs text-gray-500">Chỉ chấp nhận đường dẫn nội bộ hoặc HTTPS.</span>{fieldErrors.detailUrl ? <span id="promotion-url-error" className="mt-1 block text-xs text-red-300">{fieldErrors.detailUrl}</span> : null}</label>
          <label className="block text-sm font-medium text-gray-200">Thứ tự ưu tiên<input type="number" min={0} max={65535} value={form.displayOrder} onChange={(event) => setForm((current) => ({ ...current, displayOrder: Number(event.target.value) }))} className="mt-2 min-h-11 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 tabular-nums text-white outline-none focus:border-red-500" /><span className="mt-1 block text-xs text-gray-500">Số nhỏ hơn xuất hiện trước.</span></label>
          <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-gray-200"><input type="checkbox" checked={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.checked }))} className="h-4 w-4" />Kích hoạt chương trình</label>
          <div className="rounded-xl border border-blue-900/40 bg-blue-950/15 p-3 lg:col-span-2"><p className="text-xs font-semibold uppercase tracking-wide text-blue-300">Xem trước storefront</p><div className="mt-3 flex items-start gap-3"><span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-blue-600 text-xs font-bold text-white">01</span><p className="text-sm leading-6 text-gray-200">{form.displayText || 'Nội dung khuyến mãi sẽ xuất hiện tại đây.'} <a href={form.detailUrl || '#'} onClick={(event) => event.preventDefault()} className="inline-flex min-h-10 items-center font-semibold text-sky-400">Xem chi tiết</a></p></div></div>
        </div></fieldset>

        <fieldset aria-describedby={fieldErrors.scope ? 'promotion-scope-error' : 'promotion-scope-help'} className="rounded-xl border border-gray-800 p-4"><legend className="px-2 text-sm font-semibold text-white">2. Phạm vi áp dụng</legend><p id="promotion-scope-help" className="mb-4 text-sm text-gray-500">Sản phẩm khớp SKU trực tiếp hoặc nằm trong cây danh mục đã chọn đều được hiển thị một lần.</p>{fieldErrors.scope ? <p id="promotion-scope-error" role="alert" className="mb-4 text-sm text-red-300">{fieldErrors.scope}</p> : null}
          <section aria-labelledby="selected-products-title" className="mb-4 rounded-xl border border-gray-800 bg-gray-950/60 p-4"><div className="flex items-center justify-between gap-3"><div><h3 id="selected-products-title" className="text-sm font-semibold text-white">SKU trực tiếp <span className="ml-1 tabular-nums text-blue-300">{form.products.length}</span></h3><p className="mt-1 text-xs text-gray-500">Tìm nhanh SKU đã chọn bên dưới hoặc dùng nút để thêm SKU mới.</p></div><button type="button" onClick={() => setProductPickerOpen(true)} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-blue-700 px-3 text-sm font-semibold text-blue-200 hover:bg-blue-950/40 focus-visible:outline-2 focus-visible:outline-blue-400"><PackagePlus aria-hidden="true" className="h-4 w-4" />Chọn SKU</button></div>
            {form.products.length > 0 ? <div className="relative mt-3"><label htmlFor="selected-product-search" className="sr-only">Tìm SKU đã chọn</label><Search aria-hidden="true" className="absolute left-3 top-3.5 h-4 w-4 text-gray-500" /><input id="selected-product-search" type="search" value={selectedProductQuery} onChange={(event) => setSelectedProductQuery(event.target.value)} placeholder="Tìm theo tên, SKU hoặc ID đang áp dụng" className="min-h-11 w-full rounded-lg border border-gray-700 bg-gray-950 pl-10 pr-11 text-sm text-white outline-none focus:border-blue-500" />{selectedProductQuery ? <button type="button" onClick={() => setSelectedProductQuery('')} aria-label="Xóa từ khóa tìm SKU" className="absolute right-1 top-0.5 grid h-10 w-10 place-items-center rounded-md text-gray-500 hover:bg-gray-800 hover:text-white focus-visible:outline-2 focus-visible:outline-blue-400"><X aria-hidden="true" className="h-4 w-4" /></button> : null}</div> : null}
            <div className="mt-3 grid gap-2 sm:grid-cols-2">{form.products.length === 0 ? <p className="rounded-lg border border-dashed border-gray-800 px-3 py-6 text-center text-sm text-gray-500 sm:col-span-2">Chưa chọn SKU trực tiếp.</p> : filteredSelectedProducts.length > 0 ? filteredSelectedProducts.map((product) => <div key={product.id} className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-900/60 px-3 py-2"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-gray-200">{product.proName}</p><p className="font-mono text-xs text-blue-300">{product.storeSKU || '—'} · ID {product.id}</p></div><button type="button" onClick={() => setForm((current) => ({ ...current, products: current.products.filter((item) => item.id !== product.id) }))} aria-label={`Bỏ ${product.proName}`} className="grid h-10 w-10 place-items-center rounded-md text-gray-500 hover:bg-gray-800 hover:text-white focus-visible:outline-2 focus-visible:outline-blue-400"><X aria-hidden="true" className="h-4 w-4" /></button></div>) : <p className="rounded-lg border border-dashed border-gray-800 px-3 py-6 text-center text-sm text-gray-500 sm:col-span-2">Không tìm thấy SKU đã chọn phù hợp.</p>}</div>
          </section>
          <CategoryScopeSelector categories={categories} selectedIds={form.categoryIds} onChange={(categoryIds) => setForm((current) => ({ ...current, categoryIds }))} searchable />
        </fieldset>

        <fieldset className="rounded-xl border border-gray-800 p-4"><legend className="px-2 text-sm font-semibold text-white">3. Lịch chạy</legend><div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-medium text-gray-200"><span className="inline-flex items-center gap-2"><CalendarClock aria-hidden="true" className="h-4 w-4 text-gray-500" />Bắt đầu</span><input type="datetime-local" value={form.startsAt} aria-invalid={Boolean(fieldErrors.schedule)} aria-describedby={fieldErrors.schedule ? 'promotion-schedule-error' : 'promotion-schedule-help'} onChange={(event) => setForm((current) => ({ ...current, startsAt: event.target.value }))} className="mt-2 min-h-11 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 text-white" /></label><label className="text-sm font-medium text-gray-200"><span className="inline-flex items-center gap-2"><CalendarClock aria-hidden="true" className="h-4 w-4 text-gray-500" />Kết thúc</span><input type="datetime-local" value={form.endsAt} aria-invalid={Boolean(fieldErrors.schedule)} aria-describedby={fieldErrors.schedule ? 'promotion-schedule-error' : 'promotion-schedule-help'} onChange={(event) => setForm((current) => ({ ...current, endsAt: event.target.value }))} className="mt-2 min-h-11 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 text-white" /></label></div><p id="promotion-schedule-help" className="mt-2 text-xs text-gray-500">Bỏ trống cả hai để không giới hạn thời gian. Thời gian nhập theo giờ Việt Nam.</p>{fieldErrors.schedule ? <p id="promotion-schedule-error" className="mt-1 text-xs text-red-300">{fieldErrors.schedule}</p> : null}</fieldset>
      </div>
      <div className="sticky bottom-0 flex flex-col-reverse gap-3 rounded-b-2xl border-t border-gray-800 bg-[#0d0d12]/95 px-5 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between"><div>{editingId ? <button type="button" onClick={() => void removePromotion()} disabled={deleting || saving} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-red-800 px-4 text-sm font-semibold text-red-300 hover:bg-red-950/30 disabled:opacity-50"><Trash2 aria-hidden="true" className="h-4 w-4" />{deleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}</button> : null}</div><div className="flex justify-end gap-3"><button type="button" onClick={closeForm} className="min-h-11 rounded-lg border border-gray-700 px-4 text-sm text-gray-300 hover:bg-gray-800">{standalone ? 'Quay lại danh sách' : 'Hủy'}</button><button type="submit" disabled={saving || deleting} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"><Save aria-hidden="true" className="h-4 w-4" />{saving ? 'Đang lưu...' : 'Lưu chương trình'}</button></div></div>
    </form></div> : null}

    <ProductSelectModal isOpen={productPickerOpen} onClose={() => setProductPickerOpen(false)} onSelect={(products) => setForm((current) => ({ ...current, products }))} initialSelected={form.products} title="Chọn SKU áp dụng khuyến mãi" />
  </section>;
}
