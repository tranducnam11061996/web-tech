'use client';

import { Edit3, Plus, Save, Ticket, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { VoucherCategorySelector, type VoucherCategory } from './VoucherCategorySelector';

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
};
type Redemption = { orderId: number; discountAmount: number; status: string; orderStatus: number };
type VoucherForm = {
  code: string; title: string; description: string; status: boolean;
  quantityMode: 'limited' | 'unlimited'; totalQuantity: number;
  discountType: 'fixed' | 'percent'; discountValue: number; maxDiscount: number;
  minimumOrderValue: number; startsAt: string; endsAt: string; categoryIds: number[];
};

const emptyForm: VoucherForm = {
  code: '', title: '', description: '', status: true, quantityMode: 'unlimited', totalQuantity: 1,
  discountType: 'fixed', discountValue: 0, maxDiscount: 1000, minimumOrderValue: 0,
  startsAt: '', endsAt: '', categoryIds: [],
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

  const startCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setRedemptions([]);
    setMessage('');
    setOpen(true);
  };

  const startEdit = async (id: number) => {
    setMessage('');
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
      totalQuantity: value.totalQuantity || 1,
      discountType: value.discountType,
      discountValue: value.discountValue,
      maxDiscount: value.maxDiscount || 1000,
      minimumOrderValue: value.minimumOrderValue,
      startsAt: value.startsAt || '',
      endsAt: value.endsAt || '',
      categoryIds: value.categoryIds || [],
    });
    setOpen(true);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const response = await fetch(editingId ? `/api/admin/vouchers/${editingId}` : '/api/admin/vouchers', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
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

  return <section className="space-y-4 animate-in fade-in duration-300">
    <div className="flex flex-col gap-3 rounded-xl border border-gray-800 bg-gray-950/60 p-5 lg:flex-row lg:items-center lg:justify-between">
      <div><h1 className="flex items-center gap-2 text-xl font-bold text-white"><Ticket className="h-5 w-5 text-red-400" /> Quản lý voucher</h1><p className="mt-1 text-sm text-gray-400">Thiết lập ưu đãi, quota, thời hạn và theo dõi tình trạng sử dụng.</p></div>
      <button onClick={startCreate} className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500"><Plus className="h-4 w-4" /> Tạo voucher</button>
    </div>

    {message ? <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{message}</div> : null}

    <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-950/60">
      <table className="min-w-[1050px] w-full text-left text-sm"><thead className="border-b border-gray-800 text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-4 py-3">Voucher</th><th className="px-4 py-3">Giảm giá</th><th className="px-4 py-3">Thời hạn</th><th className="px-4 py-3 text-center">Đã dùng</th><th className="px-4 py-3 text-center">Đang chờ</th><th className="px-4 py-3 text-center">Còn lại</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3" /></tr></thead>
        <tbody>{loading ? <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500">Đang tải voucher...</td></tr> : items.length === 0 ? <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500">Chưa có voucher nào.</td></tr> : items.map((item) => <tr key={item.id} className="border-b border-gray-900/80 text-gray-300 hover:bg-gray-900/40"><td className="px-4 py-4"><p className="font-mono font-bold text-white">{item.code}</p><p className="mt-1 max-w-[240px] truncate text-xs text-gray-500">{item.title}</p></td><td className="px-4 py-4">{item.discountType === 'percent' ? `${item.discountValue}% (tối đa ${money(item.maxDiscount || 0)})` : money(item.discountValue)}<p className="mt-1 text-xs text-gray-500">Đơn từ {money(item.minimumOrderValue)}</p></td><td className="px-4 py-4 text-xs text-gray-400">{item.startsAt && item.endsAt ? <>{item.startsAt.replace('T', ' ')}<br />đến {item.endsAt.replace('T', ' ')}</> : 'Không giới hạn'}</td><td className="px-4 py-4 text-center font-semibold text-emerald-400">{item.usedCount}</td><td className="px-4 py-4 text-center font-semibold text-amber-300">{item.pendingCount}</td><td className="px-4 py-4 text-center font-semibold text-cyan-300">{item.quantityMode === 'unlimited' ? 'Không giới hạn' : `${item.remainingQuantity}/${item.totalQuantity}`}</td><td className="px-4 py-4"><span className={item.status ? 'rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300' : 'rounded-full bg-gray-800 px-2 py-1 text-xs text-gray-400'}>{item.status ? 'Đang bật' : 'Đã tắt'}</span></td><td className="px-4 py-4 text-right"><button onClick={() => void startEdit(item.id)} className="inline-flex items-center gap-1 rounded-md border border-gray-700 px-2.5 py-1.5 text-xs text-gray-200 hover:border-cyan-500 hover:text-cyan-300"><Edit3 className="h-3.5 w-3.5" /> Sửa</button></td></tr>)}</tbody>
      </table>
    </div>

    {open ? <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"><form onSubmit={submit} className="mx-auto my-6 max-w-5xl rounded-2xl border border-gray-700 bg-[#101014] p-6 shadow-2xl"><div className="mb-6 flex items-start justify-between"><div><h2 className="text-lg font-bold text-white">{editingId ? 'Cập nhật voucher' : 'Tạo voucher'}</h2><p className="mt-1 text-sm text-gray-400">Thời gian được nhập theo giờ Việt Nam.</p></div><button type="button" onClick={() => setOpen(false)} className="rounded-md p-2 text-gray-400 hover:bg-gray-800 hover:text-white"><X className="h-5 w-5" /></button></div>
      <div className="grid gap-5 lg:grid-cols-2">
        <label className="block text-sm font-medium text-gray-200">Mã voucher<input required value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2.5 font-mono text-white outline-none focus:border-red-500" placeholder="LAPTOP5" /></label>
        <label className="block text-sm font-medium text-gray-200">Tên voucher<input required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2.5 text-white outline-none focus:border-red-500" /></label>
        <label className="block text-sm font-medium text-gray-200 lg:col-span-2">Mô tả<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-2 min-h-20 w-full resize-y rounded-lg border border-gray-700 bg-gray-950 px-3 py-2.5 text-white outline-none focus:border-red-500" /></label>

        <div className="rounded-lg border border-gray-800 p-4"><p className="font-semibold text-white">Số lượng sử dụng</p><div className="mt-3 flex gap-4 text-sm"><label><input type="radio" checked={form.quantityMode === 'unlimited'} onChange={() => setForm({ ...form, quantityMode: 'unlimited' })} className="mr-2" />Không giới hạn</label><label><input type="radio" checked={form.quantityMode === 'limited'} onChange={() => setForm({ ...form, quantityMode: 'limited' })} className="mr-2" />Giới hạn</label></div>{form.quantityMode === 'limited' ? <label className="mt-3 block text-xs font-medium text-gray-400">Tổng lượt<input min={1} type="number" value={form.totalQuantity} onChange={(event) => setForm({ ...form, totalQuantity: Number(event.target.value) })} className="mt-1.5 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm text-white" /></label> : null}</div>
        <div className="rounded-lg border border-gray-800 p-4"><p className="font-semibold text-white">Giảm giá</p><div className="mt-3 flex gap-4 text-sm"><label><input type="radio" checked={form.discountType === 'fixed'} onChange={() => setForm({ ...form, discountType: 'fixed' })} className="mr-2" />Số tiền</label><label><input type="radio" checked={form.discountType === 'percent'} onChange={() => setForm({ ...form, discountType: 'percent' })} className="mr-2" />Phần trăm</label></div><label className="mt-3 block text-xs font-medium text-gray-400">{form.discountType === 'percent' ? 'Phần trăm giảm' : 'Số tiền giảm'}<div className="relative mt-1.5"><input required min={1} max={form.discountType === 'percent' ? 100 : undefined} type="number" value={form.discountValue} onChange={(event) => setForm({ ...form, discountValue: Number(event.target.value) })} className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm text-white" />{form.discountType === 'percent' ? <span className="absolute right-3 top-2.5 text-sm text-gray-500">%</span> : <span className="absolute right-3 top-2.5 text-sm text-gray-500">đ</span>}</div></label>{form.discountType === 'percent' ? <label className="mt-3 block text-xs font-medium text-gray-400">Giảm tối đa<div className="relative mt-1.5"><input required min={1000} step={1000} type="number" value={form.maxDiscount} onChange={(event) => setForm({ ...form, maxDiscount: Number(event.target.value) })} className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2.5 pr-8 text-sm text-white" /><span className="absolute right-3 top-2.5 text-sm text-gray-500">đ</span></div><span className="mt-1 block font-normal text-gray-500">Mức giảm không vượt quá số tiền này.</span></label> : null}</div>

        <label className="block text-sm font-medium text-gray-200">Giá trị đơn tối thiểu<div className="relative mt-2"><input min={0} type="number" value={form.minimumOrderValue} onChange={(event) => setForm({ ...form, minimumOrderValue: Number(event.target.value) })} className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2.5 pr-8 text-white" /><span className="absolute right-3 top-2.5 text-sm text-gray-500">đ</span></div></label>
        <label className="flex items-center gap-2 pt-7 text-sm font-medium text-gray-200"><input type="checkbox" checked={form.status} onChange={(event) => setForm({ ...form, status: event.target.checked })} className="h-4 w-4" />Kích hoạt voucher</label>
        <label className="block text-sm font-medium text-gray-200">Bắt đầu (tùy chọn)<input type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2.5 text-white" /></label>
        <label className="block text-sm font-medium text-gray-200">Kết thúc (tùy chọn)<input type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2.5 text-white" /></label>

        <div className="lg:col-span-2"><VoucherCategorySelector categories={categories} selectedIds={form.categoryIds} onChange={(categoryIds) => setForm((current) => ({ ...current, categoryIds }))} /></div>
        {editingId ? <div className="lg:col-span-2"><p className="text-sm font-medium text-gray-200">Lịch sử sử dụng gần đây</p><div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-gray-800 bg-gray-950">{redemptions.length === 0 ? <p className="p-3 text-sm text-gray-500">Voucher chưa được sử dụng.</p> : redemptions.map((redemption) => <div key={redemption.orderId} className="flex items-center justify-between border-b border-gray-800 px-3 py-2 text-xs last:border-0"><span className="font-mono text-white">Đơn #{redemption.orderId}</span><span className="text-gray-400">-{money(redemption.discountAmount)}</span><span className={redemption.status === 'released' ? 'text-red-300' : redemption.orderStatus === 3 ? 'text-emerald-300' : 'text-amber-300'}>{redemption.status === 'released' ? 'Đã hoàn lượt' : redemption.orderStatus === 3 ? 'Đã sử dụng' : 'Đang chờ'}</span></div>)}</div></div> : null}
      </div>
      <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-gray-700 px-4 py-2.5 text-sm text-gray-300">Hủy</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"><Save className="h-4 w-4" />{saving ? 'Đang lưu...' : 'Lưu voucher'}</button></div>
    </form></div> : null}
  </section>;
}
