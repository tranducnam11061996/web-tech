'use client';

import { ArrowRight, RefreshCw, Search, ShieldCheck, ShoppingBag, SlidersHorizontal, UserRoundCheck, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type Customer = { id:number; name:string; email:string; phone:string; status:string; verified:boolean; createdAt:string; lastLoginAt:string|null; orderCount:number; completedOrderCount:number; totalCompletedValue:number; lastOrderId:number|null; lastOrderAt:number|null };
type ResponseData = { items:Customer[]; nextCursor:number|null; summary:{total:number;active:number;blocked:number;purchasers:number} };
type Filters = { q:string; status:string; verified:string; purchased:string; createdFrom:string; createdTo:string; lastLoginFrom:string; lastLoginTo:string };
const EMPTY_FILTERS: Filters = { q:'', status:'', verified:'', purchased:'', createdFrom:'', createdTo:'', lastLoginFrom:'', lastLoginTo:'' };

const money = (value:number) => `${new Intl.NumberFormat('vi-VN').format(value || 0)}đ`;
const date = (value:string|number|null) => value ? new Date(typeof value === 'number' ? value * 1000 : value).toLocaleString('vi-VN') : '—';

function Badge({ status, verified }: { status?: string; verified?: boolean }) {
  if (verified !== undefined) return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${verified ? 'border-emerald-700/60 bg-emerald-950/50 text-emerald-200' : 'border-amber-700/60 bg-amber-950/40 text-amber-200'}`}>{verified ? 'Đã xác minh' : 'Chưa xác minh'}</span>;
  const blocked = status === 'blocked';
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold ${blocked ? 'border-red-700/60 bg-red-950/45 text-red-200' : 'border-cyan-700/60 bg-cyan-950/45 text-cyan-100'}`}><span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />{blocked ? 'Đã khóa' : status === 'pending' ? 'Chờ xác minh' : 'Đang hoạt động'}</span>;
}

function SummaryCard({ icon: Icon, label, value, tone }: { icon: typeof Users; label:string; value:number; tone:string }) {
  return <div className={`min-w-40 rounded-xl border p-4 ${tone}`}><div className="flex items-center justify-between"><span className="text-xs font-medium uppercase tracking-wide text-slate-300">{label}</span><Icon className="h-4 w-4" aria-hidden="true" /></div><p className="mt-3 text-2xl font-bold text-white">{new Intl.NumberFormat('vi-VN').format(value)}</p></div>;
}

export function CustomerManager() {
  const router = useRouter();
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [data, setData] = useState<ResponseData>({ items: [], nextCursor: null, summary: { total: 0, active: 0, blocked: 0, purchasers: 0 } });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const query = useMemo(() => JSON.stringify(filters), [filters]);

  const load = useCallback(async (cursor: number | null = null, append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: '50' });
      Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
      if (cursor) params.set('cursor', String(cursor));
      const response = await fetch(`/api/admin/storefront-customers?${params}`, { cache: 'no-store' });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) throw new Error(result?.error?.message || 'Không thể tải danh sách khách hàng.');
      setData((previous) => append ? { ...result.data, items: [...previous.items, ...result.data.items] } : result.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải danh sách khách hàng.');
    } finally {
      setLoading(false); setLoadingMore(false);
    }
  }, [filters]);

  useEffect(() => { void load(); }, [load, query]);
  const submit = (event: React.FormEvent) => { event.preventDefault(); setFilters({ ...draft }); };
  const reset = () => { setDraft(EMPTY_FILTERS); setFilters(EMPTY_FILTERS); };

  return <section className="space-y-4">
    <header className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 shadow-[0_14px_40px_rgba(0,0,0,.18)]">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-cyan-300">CRM storefront</p><h1 className="mt-1 flex items-center gap-2 text-2xl font-bold text-white"><Users className="h-6 w-6 text-cyan-300" aria-hidden="true" />Danh sách khách hàng</h1><p className="mt-2 max-w-2xl text-sm text-slate-400">Tra cứu tài khoản storefront, hành vi mua hàng và tình trạng bảo mật mà không trộn dữ liệu legacy.</p></div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:border-cyan-700 hover:text-cyan-200 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />Làm mới</button>
      </div>
      <div className="mt-5 flex gap-3 overflow-x-auto pb-1">
        <SummaryCard icon={Users} label="Tổng khách" value={data.summary.total} tone="border-slate-700 bg-slate-900/60 text-slate-300" />
        <SummaryCard icon={UserRoundCheck} label="Hoạt động" value={data.summary.active} tone="border-cyan-900/70 bg-cyan-950/25 text-cyan-300" />
        <SummaryCard icon={ShieldCheck} label="Đã khóa" value={data.summary.blocked} tone="border-red-900/70 bg-red-950/25 text-red-300" />
        <SummaryCard icon={ShoppingBag} label="Đã mua hàng" value={data.summary.purchasers} tone="border-emerald-900/70 bg-emerald-950/25 text-emerald-300" />
      </div>
    </header>

    <form onSubmit={submit} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4" aria-label="Bộ lọc khách hàng">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-200"><SlidersHorizontal className="h-4 w-4 text-cyan-300" aria-hidden="true" />Bộ lọc vận hành</div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label className="min-w-0"><span className="mb-1 block text-xs text-slate-400">Tìm khách</span><span className="flex items-center rounded-lg border border-slate-700 bg-slate-900/70 px-2 focus-within:border-cyan-500"><Search className="h-4 w-4 text-slate-500" aria-hidden="true" /><input value={draft.q} onChange={(event) => setDraft({ ...draft, q: event.target.value })} placeholder="Mã, tên, email, điện thoại" className="min-w-0 w-full bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-slate-600" /></span></label>
        <label><span className="mb-1 block text-xs text-slate-400">Trạng thái</span><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"><option value="">Tất cả trạng thái</option><option value="active">Đang hoạt động</option><option value="blocked">Đã khóa</option><option value="pending">Chờ xác minh</option></select></label>
        <label><span className="mb-1 block text-xs text-slate-400">Email</span><select value={draft.verified} onChange={(event) => setDraft({ ...draft, verified: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"><option value="">Tất cả</option><option value="yes">Đã xác minh</option><option value="no">Chưa xác minh</option></select></label>
        <label><span className="mb-1 block text-xs text-slate-400">Mua hàng</span><select value={draft.purchased} onChange={(event) => setDraft({ ...draft, purchased: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"><option value="">Tất cả</option><option value="yes">Đã có đơn</option><option value="no">Chưa có đơn</option></select></label>
        <label><span className="mb-1 block text-xs text-slate-400">Tạo từ ngày</span><input type="date" value={draft.createdFrom} onChange={(event) => setDraft({ ...draft, createdFrom: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500" /></label>
        <label><span className="mb-1 block text-xs text-slate-400">Tạo đến ngày</span><input type="date" value={draft.createdTo} onChange={(event) => setDraft({ ...draft, createdTo: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500" /></label>
        <label><span className="mb-1 block text-xs text-slate-400">Đăng nhập từ</span><input type="date" value={draft.lastLoginFrom} onChange={(event) => setDraft({ ...draft, lastLoginFrom: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500" /></label>
        <label><span className="mb-1 block text-xs text-slate-400">Đăng nhập đến</span><input type="date" value={draft.lastLoginTo} onChange={(event) => setDraft({ ...draft, lastLoginTo: event.target.value })} className="w-full rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500" /></label>
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2"><button type="button" onClick={reset} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-400 hover:text-white">Xóa lọc</button><button type="submit" className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-500">Áp dụng lọc</button></div>
    </form>

    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60" aria-busy={loading}>
      <table className="min-w-[1120px] w-full text-left text-sm"><thead className="border-b border-slate-800 bg-slate-900/80 text-xs uppercase tracking-wide text-slate-400"><tr><th className="p-4">Khách hàng</th><th className="p-4">Xác minh</th><th className="p-4 text-right">Đơn hàng</th><th className="p-4 text-right">Chi tiêu hoàn tất</th><th className="p-4">Đơn gần nhất</th><th className="p-4">Đăng nhập cuối</th><th className="p-4">Trạng thái</th><th className="p-4"><span className="sr-only">Thao tác</span></th></tr></thead>
        <tbody>{data.items.map((customer) => <tr key={customer.id} className="border-b border-slate-900/90 transition-colors hover:bg-cyan-950/15"><td className="p-4"><p className="font-semibold text-white">#{customer.id} · {customer.name}</p><p className="mt-1 text-xs text-slate-400">{customer.email}</p><p className="text-xs text-slate-500">{customer.phone}</p></td><td className="p-4"><Badge verified={customer.verified} /></td><td className="p-4 text-right"><p className="font-semibold text-white">{customer.orderCount}</p><p className="text-xs text-slate-500">{customer.completedOrderCount} hoàn tất</p></td><td className="p-4 text-right font-semibold text-emerald-300">{money(customer.totalCompletedValue)}</td><td className="p-4 text-xs text-slate-300">{customer.lastOrderId ? <><p className="font-mono text-cyan-300">#{customer.lastOrderId}</p><p className="mt-1 text-slate-500">{date(customer.lastOrderAt)}</p></> : '—'}</td><td className="p-4 text-xs text-slate-400">{date(customer.lastLoginAt)}</td><td className="p-4"><Badge status={customer.status} /></td><td className="p-4"><button type="button" onClick={() => router.push(`/customers/${customer.id}`)} className="inline-flex items-center gap-1 rounded-lg border border-cyan-800/70 bg-cyan-950/35 px-3 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-900/50">Xem hồ sơ<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></button></td></tr>)}</tbody>
      </table>
      {loading ? <p className="p-10 text-center text-sm text-slate-400" role="status">Đang tải khách hàng...</p> : null}
      {!loading && error ? <div className="p-10 text-center" role="alert"><p className="text-red-300">{error}</p><button type="button" onClick={() => void load()} className="mt-3 rounded-lg border border-red-800 px-3 py-2 text-sm text-red-200">Thử lại</button></div> : null}
      {!loading && !error && data.items.length === 0 ? <p className="p-12 text-center text-sm text-slate-500">Không có khách hàng phù hợp với bộ lọc hiện tại.</p> : null}
    </div>
    {data.nextCursor ? <button type="button" disabled={loadingMore} onClick={() => void load(data.nextCursor, true)} className="w-full rounded-xl border border-slate-700 bg-slate-900/70 py-3 text-sm font-semibold text-slate-200 hover:border-cyan-700 disabled:opacity-50">{loadingMore ? 'Đang tải thêm...' : 'Tải thêm khách hàng'}</button> : null}
  </section>;
}
