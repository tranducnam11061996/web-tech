'use client';

import { Edit3, PackagePlus, Plus, Save, Search, Ticket, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ProductSelectModal, type SelectableProduct } from '@/components/shared/ProductSelectModal';
import { VoucherCategorySelector, type VoucherCategory } from './VoucherCategorySelector';
import {
  normalizeVoucherDigits,
  validateVoucherNumericFields,
  type VoucherNumericField,
} from './voucherForm';

type Voucher = {
  id: number;
  code: string;
  title: string;
  description: string;
  status: number;
  quantityMode: 'limited' | 'unlimited';
  totalQuantity: number | null;
  remainingQuantity: number | null;
  discountType: 'fixed' | 'percent';
  discountValue: number;
  maxDiscount: number | null;
  minimumOrderValue: number;
  startsAt: string | null;
  endsAt: string | null;
  usedCount: number;
  pendingCount: number;
  productCount: number;
  categories: Array<{ id: number; name: string }>;
};
type Redemption = { orderId: number; discountAmount: number; status: string; orderStatus: number };
type VoucherForm = {
  code: string; title: string; description: string; status: boolean;
  quantityMode: 'limited' | 'unlimited'; totalQuantity: string;
  discountType: 'fixed' | 'percent'; discountValue: string; maxDiscount: string;
  minimumOrderValue: string; startsAt: string; endsAt: string; categoryIds: number[];
  products: SelectableProduct[];
};

const emptyForm: VoucherForm = {
  code: '', title: '', description: '', status: true, quantityMode: 'unlimited', totalQuantity: '1',
  discountType: 'fixed', discountValue: '0', maxDiscount: '1000', minimumOrderValue: '0',
  startsAt: '', endsAt: '', categoryIds: [], products: [],
};
const money = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value || 0)}đ`;

export function VoucherManager() {
  const [items, setItems] = useState<Voucher[]>([]);
  const [categories, setCategories] = useState<VoucherCategory[]>([]);
  const [form, setForm] = useState<VoucherForm>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<VoucherNumericField, string>>>({});
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [selectedProductQuery, setSelectedProductQuery] = useState('');
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const totalQuantityRef = useRef<HTMLInputElement>(null);
  const discountValueRef = useRef<HTMLInputElement>(null);
  const maxDiscountRef = useRef<HTMLInputElement>(null);
  const minimumOrderValueRef = useRef<HTMLInputElement>(null);
  const filteredSelectedProducts = useMemo(() => {
    const query = selectedProductQuery.trim().toLocaleLowerCase('vi-VN');
    if (!query) return form.products;
    return form.products.filter((product) => `${product.proName} ${product.storeSKU} ${product.id}`.toLocaleLowerCase('vi-VN').includes(query));
  }, [form.products, selectedProductQuery]);

  const load = async () => {
    setLoading(true);
    try {
      const [vouchers, categoryData] = await Promise.all([
        fetch('/api/admin/vouchers').then((response) => response.json()),
        fetch('/api/admin/product-categories').then((response) => response.json()),
      ]);
      if (vouchers.success) setItems(vouchers.data.items || []);
      if (categoryData.success) setCategories(categoryData.data.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialog = document.querySelector<HTMLFormElement>('div.fixed.inset-0 form');
    dialog?.setAttribute('role', 'dialog'); dialog?.setAttribute('aria-modal', 'true'); dialog?.setAttribute('aria-label', editingId ? 'Cập nhật voucher' : 'Tạo voucher');
    const controls = () => Array.from(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])') || []);
    controls()[0]?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (productPickerOpen) return;
      if (event.defaultPrevented) return;
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); return; }
      if (event.key !== 'Tab') return;
      const items = controls(); const first = items[0]; const last = items.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => { document.removeEventListener('keydown', onKeyDown); document.body.style.overflow = previousOverflow; lastFocusedRef.current?.focus({ preventScroll: true }); };
  }, [editingId, open, productPickerOpen]);

  const startCreate = () => {
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    setEditingId(null);
    setForm(emptyForm);
    setRedemptions([]);
    setMessage('');
    setFieldErrors({});
    setSelectedProductQuery('');
    setProductPickerOpen(false);
    setOpen(true);
  };

  const startEdit = async (id: number) => {
    lastFocusedRef.current = document.activeElement as HTMLElement | null;
    setMessage('');
    setFieldErrors({});
    setSelectedProductQuery('');
    setProductPickerOpen(false);
    const response = await fetch(`/api/admin/vouchers/${id}`);
    const json = await response.json();
    if (!json.success) {
      setMessage(json.error?.message || 'Không thể tải voucher.');
      return;
    }
    const value = json.data;
    setEditingId(id);
    setRedemptions(value.redemptions || []);
    setForm({
      code: value.code,
      title: value.title,
      description: value.description || '',
      status: Number(value.status) === 1,
      quantityMode: value.quantityMode,
      totalQuantity: String(value.totalQuantity ?? 1),
      discountType: value.discountType,
      discountValue: String(value.discountValue ?? 0),
      maxDiscount: String(value.maxDiscount ?? 1000),
      minimumOrderValue: String(value.minimumOrderValue ?? 0),
      startsAt: value.startsAt || '',
      endsAt: value.endsAt || '',
      categoryIds: value.categoryIds || [],
      products: value.products || [],
    });
    setOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage('');
    const validation = validateVoucherNumericFields(form);
    setFieldErrors(validation.errors);
    if (!validation.payload) {
      const firstInvalidField = (['totalQuantity', 'discountValue', 'maxDiscount', 'minimumOrderValue'] as VoucherNumericField[]).find((field) => validation.errors[field]);
      const inputByField = {
        totalQuantity: totalQuantityRef,
        discountValue: discountValueRef,
        maxDiscount: maxDiscountRef,
        minimumOrderValue: minimumOrderValueRef,
      };
      if (firstInvalidField) inputByField[firstInvalidField].current?.focus({ preventScroll: false });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(editingId ? `/api/admin/vouchers/${editingId}` : '/api/admin/vouchers', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          products: undefined,
          productIds: form.products.map((product) => Number(product.id)),
          ...validation.payload,
        }),
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.error?.message || 'Không thể lưu voucher.');
      setOpen(false);
      await load();
    } catch (error: any) {
      setMessage(error.message || 'Không thể lưu voucher.');
    } finally {
      setSaving(false);
    }
  };

  const updateNumericField = (field: VoucherNumericField, value: string) => {
    setForm((current) => ({ ...current, [field]: normalizeVoucherDigits(value) }));
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  return <section className="space-y-4 animate-in fade-in duration-300">
    <div className="flex flex-col gap-3 rounded-xl border border-gray-800 bg-gray-950/60 p-5 lg:flex-row lg:items-center lg:justify-between">
      <div><h1 className="flex items-center gap-2 text-xl font-bold text-white"><Ticket className="h-5 w-5 text-red-400" /> Quản lý voucher</h1><p className="mt-1 text-sm text-gray-400">Thiết lập ưu đãi, quota, thời hạn và theo dõi tình trạng sử dụng.</p></div>
      <button onClick={startCreate} className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500"><Plus className="h-4 w-4" /> Tạo voucher</button>
    </div>

    {message ? <div role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{message}</div> : null}

    <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-950/60">
      <table className="min-w-[1200px] w-full text-left text-sm"><thead className="border-b border-gray-800 text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-4 py-3">Voucher</th><th className="px-4 py-3">Giảm giá</th><th className="px-4 py-3">Phạm vi áp dụng</th><th className="px-4 py-3">Thời hạn</th><th className="px-4 py-3 text-center">Đã dùng</th><th className="px-4 py-3 text-center">Đang chờ</th><th className="px-4 py-3 text-center">Còn lại</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3" /></tr></thead>
        <tbody>{loading ? <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-500">Đang tải voucher...</td></tr> : items.length === 0 ? <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-500">Chưa có voucher nào.</td></tr> : items.map((item) => <tr key={item.id} className="border-b border-gray-900/80 text-gray-300 hover:bg-gray-900/40"><td className="px-4 py-4"><p className="font-mono font-bold text-white">{item.code}</p><p className="mt-1 max-w-[240px] truncate text-xs text-gray-500">{item.title}</p></td><td className="px-4 py-4">{item.discountType === 'percent' ? `${item.discountValue}% (tối đa ${money(item.maxDiscount || 0)})` : money(item.discountValue)}<p className="mt-1 text-xs text-gray-500">Đơn từ {money(item.minimumOrderValue)}</p></td><td className="max-w-[240px] px-4 py-4 text-xs">{item.categories.length === 0 && item.productCount === 0 ? <span className="rounded-full bg-amber-500/10 px-2 py-1 text-amber-200">Toàn bộ sản phẩm</span> : <div className="space-y-2"><div className="flex flex-wrap gap-1.5">{item.productCount > 0 ? <span className="rounded-full bg-blue-500/10 px-2 py-1 text-blue-200">{item.productCount} SKU</span> : null}{item.categories.length > 0 ? <span className="rounded-full bg-cyan-500/10 px-2 py-1 text-cyan-200">{item.categories.length} danh mục</span> : null}</div>{item.categories.length > 0 ? <span className="line-clamp-2 text-gray-400">{item.categories.map((category) => category.name).join(', ')}</span> : null}</div>}</td><td className="px-4 py-4 text-xs text-gray-400">{item.startsAt && item.endsAt ? <>{item.startsAt.replace('T', ' ')}<br />đến {item.endsAt.replace('T', ' ')}</> : 'Không giới hạn'}</td><td className="px-4 py-4 text-center font-semibold text-emerald-400">{item.usedCount}</td><td className="px-4 py-4 text-center font-semibold text-amber-300">{item.pendingCount}</td><td className="px-4 py-4 text-center font-semibold text-cyan-300">{item.quantityMode === 'unlimited' ? 'Không giới hạn' : `${item.remainingQuantity}/${item.totalQuantity}`}</td><td className="px-4 py-4"><span className={item.status ? 'rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300' : 'rounded-full bg-gray-800 px-2 py-1 text-xs text-gray-400'}>{item.status ? 'Đang bật' : 'Đã tắt'}</span></td><td className="px-4 py-4 text-right"><button onClick={() => void startEdit(item.id)} className="inline-flex items-center gap-1 rounded-md border border-gray-700 px-2.5 py-1.5 text-xs text-gray-200 hover:border-cyan-500 hover:text-cyan-300"><Edit3 className="h-3.5 w-3.5" /> Sửa</button></td></tr>)}</tbody>
      </table>
    </div>

    {open ? <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"><form onSubmit={submit} className="mx-auto my-6 max-w-5xl rounded-2xl border border-gray-700 bg-[#101014] p-6 shadow-2xl"><div className="mb-6 flex items-start justify-between"><div><h2 className="text-lg font-bold text-white">{editingId ? 'Cập nhật voucher' : 'Tạo voucher'}</h2><p className="mt-1 text-sm text-gray-400">Thời gian được nhập theo giờ Việt Nam.</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Đóng biểu mẫu voucher" className="rounded-md p-2 text-gray-400 hover:bg-gray-800 hover:text-white focus-visible:outline-2 focus-visible:outline-blue-400"><X aria-hidden="true" className="h-5 w-5" /></button></div>
      <div className="grid gap-5 lg:grid-cols-2">
        <label className="block text-sm font-medium text-gray-200">Mã voucher<input required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2.5 font-mono text-white outline-none focus:border-red-500" placeholder="LAPTOP5" /></label>
        <label className="block text-sm font-medium text-gray-200">Tên voucher<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2.5 text-white outline-none focus:border-red-500" /></label>
        <label className="block text-sm font-medium text-gray-200 lg:col-span-2">Mô tả<textarea maxLength={4000} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-2 min-h-20 w-full resize-y rounded-lg border border-gray-700 bg-gray-950 px-3 py-2.5 text-white outline-none focus:border-red-500" /><span className="mt-1 block text-right text-xs tabular-nums text-gray-500">{form.description.length}/4000</span></label>

        <div className="rounded-lg border border-gray-800 p-4">
          <p className="font-semibold text-white">Số lượng sử dụng</p>
          <div className="mt-3 flex gap-4 text-sm">
            <label><input type="radio" checked={form.quantityMode === 'unlimited'} onChange={() => {
              setForm((current) => ({ ...current, quantityMode: 'unlimited' }));
              setFieldErrors((current) => {
                const next = { ...current };
                delete next.totalQuantity;
                return next;
              });
            }} className="mr-2" />Không giới hạn</label>
            <label><input type="radio" checked={form.quantityMode === 'limited'} onChange={() => setForm((current) => ({ ...current, quantityMode: 'limited' }))} className="mr-2" />Giới hạn</label>
          </div>
          {form.quantityMode === 'limited' ? <label className="mt-3 block text-xs font-medium text-gray-400">Tổng lượt
            <input ref={totalQuantityRef} type="text" inputMode="numeric" pattern="[0-9]*" value={form.totalQuantity} onChange={(event) => updateNumericField('totalQuantity', event.target.value)} aria-invalid={Boolean(fieldErrors.totalQuantity)} aria-describedby={fieldErrors.totalQuantity ? 'voucher-total-quantity-error' : undefined} className={`mt-1.5 w-full rounded-lg border bg-gray-950 px-3 py-2.5 text-sm tabular-nums text-white outline-none focus:border-red-500 ${fieldErrors.totalQuantity ? 'border-red-500' : 'border-gray-700'}`} />
            {fieldErrors.totalQuantity ? <span id="voucher-total-quantity-error" className="mt-1 block font-normal text-red-300">{fieldErrors.totalQuantity}</span> : null}
          </label> : null}
        </div>
        <div className="rounded-lg border border-gray-800 p-4">
          <p className="font-semibold text-white">Giảm giá</p>
          <div className="mt-3 flex gap-4 text-sm">
            <label><input type="radio" checked={form.discountType === 'fixed'} onChange={() => {
              setForm((current) => ({ ...current, discountType: 'fixed' }));
              setFieldErrors((current) => {
                const next = { ...current };
                delete next.discountValue;
                delete next.maxDiscount;
                return next;
              });
            }} className="mr-2" />Số tiền</label>
            <label><input type="radio" checked={form.discountType === 'percent'} onChange={() => {
              setForm((current) => ({ ...current, discountType: 'percent' }));
              setFieldErrors((current) => {
                const next = { ...current };
                delete next.discountValue;
                return next;
              });
            }} className="mr-2" />Phần trăm</label>
          </div>
          <label className="mt-3 block text-xs font-medium text-gray-400">{form.discountType === 'percent' ? 'Phần trăm giảm' : 'Số tiền giảm'}
            <div className="relative mt-1.5"><input ref={discountValueRef} type="text" inputMode="numeric" pattern="[0-9]*" value={form.discountValue} onChange={(event) => updateNumericField('discountValue', event.target.value)} aria-invalid={Boolean(fieldErrors.discountValue)} aria-describedby={fieldErrors.discountValue ? 'voucher-discount-value-error' : undefined} className={`w-full rounded-lg border bg-gray-950 px-3 py-2.5 pr-8 text-sm tabular-nums text-white outline-none focus:border-red-500 ${fieldErrors.discountValue ? 'border-red-500' : 'border-gray-700'}`} /><span aria-hidden="true" className="absolute right-3 top-2.5 text-sm text-gray-500">{form.discountType === 'percent' ? '%' : 'đ'}</span></div>
            {fieldErrors.discountValue ? <span id="voucher-discount-value-error" className="mt-1 block font-normal text-red-300">{fieldErrors.discountValue}</span> : null}
          </label>
          {form.discountType === 'percent' ? <label className="mt-3 block text-xs font-medium text-gray-400">Giảm tối đa
            <div className="relative mt-1.5"><input ref={maxDiscountRef} type="text" inputMode="numeric" pattern="[0-9]*" value={form.maxDiscount} onChange={(event) => updateNumericField('maxDiscount', event.target.value)} aria-invalid={Boolean(fieldErrors.maxDiscount)} aria-describedby={fieldErrors.maxDiscount ? 'voucher-max-discount-help voucher-max-discount-error' : 'voucher-max-discount-help'} className={`w-full rounded-lg border bg-gray-950 px-3 py-2.5 pr-8 text-sm tabular-nums text-white outline-none focus:border-red-500 ${fieldErrors.maxDiscount ? 'border-red-500' : 'border-gray-700'}`} /><span aria-hidden="true" className="absolute right-3 top-2.5 text-sm text-gray-500">đ</span></div>
            <span id="voucher-max-discount-help" className="mt-1 block font-normal text-gray-500">Mức giảm không vượt quá số tiền này và phải chia hết cho 1.000.</span>
            {fieldErrors.maxDiscount ? <span id="voucher-max-discount-error" className="mt-1 block font-normal text-red-300">{fieldErrors.maxDiscount}</span> : null}
          </label> : null}
        </div>

        <label className="block text-sm font-medium text-gray-200">Giá trị đơn tối thiểu
          <div className="relative mt-2"><input ref={minimumOrderValueRef} type="text" inputMode="numeric" pattern="[0-9]*" value={form.minimumOrderValue} onChange={(event) => updateNumericField('minimumOrderValue', event.target.value)} aria-invalid={Boolean(fieldErrors.minimumOrderValue)} aria-describedby={fieldErrors.minimumOrderValue ? 'voucher-minimum-order-error' : undefined} className={`w-full rounded-lg border bg-gray-950 px-3 py-2.5 pr-8 tabular-nums text-white outline-none focus:border-red-500 ${fieldErrors.minimumOrderValue ? 'border-red-500' : 'border-gray-700'}`} /><span aria-hidden="true" className="absolute right-3 top-2.5 text-sm text-gray-500">đ</span></div>
          {fieldErrors.minimumOrderValue ? <span id="voucher-minimum-order-error" className="mt-1 block text-xs font-normal text-red-300">{fieldErrors.minimumOrderValue}</span> : null}
        </label>
        <label className="flex items-center gap-2 pt-7 text-sm font-medium text-gray-200"><input type="checkbox" checked={form.status} onChange={(event) => setForm({ ...form, status: event.target.checked })} className="h-4 w-4" />Kích hoạt voucher</label>
        <label className="block text-sm font-medium text-gray-200">Bắt đầu (tùy chọn)<input type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2.5 text-white" /></label>
        <label className="block text-sm font-medium text-gray-200">Kết thúc (tùy chọn)<input type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2.5 text-white" /></label>

        <fieldset className="lg:col-span-2 rounded-xl border border-gray-800 p-4">
          <legend className="px-2 text-sm font-semibold text-white">Phạm vi áp dụng</legend>
          <p id="voucher-scope-help" className="mb-4 text-sm leading-6 text-gray-500">SKU trực tiếp và cây danh mục được hợp nhất. Sản phẩm khớp một trong hai phạm vi đều được áp dụng; để trống cả hai sẽ áp dụng voucher cho toàn bộ sản phẩm.</p>
          {form.products.length === 0 && form.categoryIds.length === 0 ? <div role="status" className="mb-4 rounded-lg border border-amber-800/50 bg-amber-950/20 px-3 py-2 text-sm text-amber-200">Voucher đang áp dụng cho toàn bộ sản phẩm.</div> : null}
          <section aria-labelledby="voucher-selected-products-title" className="mb-4 rounded-xl border border-gray-800 bg-gray-950/60 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div><h3 id="voucher-selected-products-title" className="text-sm font-semibold text-white">SKU trực tiếp <span className="ml-1 tabular-nums text-blue-300">{form.products.length}</span></h3><p className="mt-1 text-xs leading-5 text-gray-500">Có thể chọn cả SKU đang bán và đang ẩn. Runtime chỉ tính sản phẩm đang khả dụng và có giá hợp lệ.</p></div>
              <button type="button" onClick={() => setProductPickerOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-blue-700 px-3 text-sm font-semibold text-blue-200 hover:bg-blue-950/40 focus-visible:outline-2 focus-visible:outline-blue-400"><PackagePlus aria-hidden="true" className="h-4 w-4" />Chọn SKU</button>
            </div>
            {form.products.length > 0 ? <div className="relative mt-3"><label htmlFor="voucher-selected-product-search" className="sr-only">Tìm SKU đã chọn</label><Search aria-hidden="true" className="absolute left-3 top-3.5 h-4 w-4 text-gray-500" /><input id="voucher-selected-product-search" type="search" value={selectedProductQuery} onChange={(event) => setSelectedProductQuery(event.target.value)} placeholder="Tìm theo tên, SKU hoặc ID đang áp dụng" className="min-h-11 w-full rounded-lg border border-gray-700 bg-gray-950 pl-10 pr-11 text-sm text-white outline-none focus:border-blue-500" />{selectedProductQuery ? <button type="button" onClick={() => setSelectedProductQuery('')} aria-label="Xóa từ khóa tìm SKU" className="absolute right-1 top-0.5 grid h-10 w-10 place-items-center rounded-md text-gray-500 hover:bg-gray-800 hover:text-white focus-visible:outline-2 focus-visible:outline-blue-400"><X aria-hidden="true" className="h-4 w-4" /></button> : null}</div> : null}
            <div className="mt-3 grid gap-2 sm:grid-cols-2">{form.products.length === 0 ? <p className="rounded-lg border border-dashed border-gray-800 px-3 py-6 text-center text-sm text-gray-500 sm:col-span-2">Chưa chọn SKU trực tiếp.</p> : filteredSelectedProducts.length > 0 ? filteredSelectedProducts.map((product) => <div key={product.id} className="flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-900/60 px-3 py-2"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-gray-200">{product.proName}</p><p className="font-mono text-xs text-blue-300">{product.storeSKU || '—'} · ID {product.id}</p><p className={Number(product.isOn) === 1 ? 'mt-1 text-xs text-emerald-300' : 'mt-1 text-xs text-amber-300'}>{Number(product.isOn) === 1 ? 'Đang bán' : 'Đang ẩn'}</p></div><button type="button" onClick={() => setForm((current) => ({ ...current, products: current.products.filter((item) => item.id !== product.id) }))} aria-label={`Bỏ ${product.proName}`} className="grid h-10 w-10 place-items-center rounded-md text-gray-500 hover:bg-gray-800 hover:text-white focus-visible:outline-2 focus-visible:outline-blue-400"><X aria-hidden="true" className="h-4 w-4" /></button></div>) : <p className="rounded-lg border border-dashed border-gray-800 px-3 py-6 text-center text-sm text-gray-500 sm:col-span-2">Không tìm thấy SKU đã chọn phù hợp.</p>}</div>
          </section>
          <VoucherCategorySelector categories={categories} selectedIds={form.categoryIds} onChange={(categoryIds) => setForm((current) => ({ ...current, categoryIds }))} />
        </fieldset>
        {editingId ? <div className="lg:col-span-2"><p className="text-sm font-medium text-gray-200">Lịch sử sử dụng gần đây</p><div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-gray-800 bg-gray-950">{redemptions.length === 0 ? <p className="p-3 text-sm text-gray-500">Voucher chưa được sử dụng.</p> : redemptions.map((redemption) => <div key={redemption.orderId} className="flex items-center justify-between border-b border-gray-800 px-3 py-2 text-xs last:border-0"><span className="font-mono text-white">Đơn #{redemption.orderId}</span><span className="text-gray-400">-{money(redemption.discountAmount)}</span><span className={redemption.status === 'released' ? 'text-red-300' : redemption.orderStatus === 3 ? 'text-emerald-300' : 'text-amber-300'}>{redemption.status === 'released' ? 'Đã hoàn lượt' : redemption.orderStatus === 3 ? 'Đã sử dụng' : 'Đang chờ'}</span></div>)}</div></div> : null}
      </div>
      <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-gray-700 px-4 py-2.5 text-sm text-gray-300">Hủy</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Đang lưu...' : 'Lưu voucher'}</button></div>
    </form></div> : null}
    <ProductSelectModal isOpen={productPickerOpen} onClose={() => setProductPickerOpen(false)} onSelect={(products) => setForm((current) => ({ ...current, products }))} initialSelected={form.products} title="Chọn SKU áp dụng voucher" />
  </section>;
}
