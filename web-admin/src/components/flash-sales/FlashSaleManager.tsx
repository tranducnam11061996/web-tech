'use client';

import Link from 'next/link';
import { CalendarClock, ChevronRight, Flame, Plus, Search, TimerReset } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

type Campaign = { id:number;code:string;name:string;state:string;startsAt:string;endsAt:string;itemCount:number;quotaTotal:number;quotaReserved:number;quotaSold:number;remainingQuantity:number };
type Summary = { total:number;active:number;scheduled:number;drafts:number };

const STATE_LABELS: Record<string,string> = { draft:'Bản nháp',scheduled:'Sắp diễn ra',active:'Đang diễn ra',ended:'Đã kết thúc',paused:'Tạm dừng',archived:'Lưu trữ' };
const STATE_STYLE: Record<string,string> = { active:'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',scheduled:'border-cyan-500/30 bg-cyan-500/10 text-cyan-200',draft:'border-zinc-700 bg-zinc-800/70 text-zinc-300',ended:'border-amber-500/30 bg-amber-500/10 text-amber-200',paused:'border-rose-500/30 bg-rose-500/10 text-rose-200',archived:'border-zinc-700 bg-zinc-900 text-zinc-500' };
const formatNumber = (value:number) => new Intl.NumberFormat('vi-VN').format(value || 0);
const formatTime = (value:string) => value ? new Intl.DateTimeFormat('vi-VN',{ timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit' }).format(new Date(value)) : '—';

export function FlashSaleManager() {
  const [items,setItems] = useState<Campaign[]>([]);
  const [summary,setSummary] = useState<Summary>({total:0,active:0,scheduled:0,drafts:0});
  const [query,setQuery] = useState('');
  const [search,setSearch] = useState('');
  const [state,setState] = useState('all');
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const load = useCallback(async()=>{
    setLoading(true);setError('');
    const params=new URLSearchParams({state});if(search)params.set('q',search);
    try{const response=await fetch(`/api/admin/flash-sales?${params}`);const json=await response.json();if(!response.ok||!json.success)throw new Error(json.error?.message||'Không thể tải Flash Sale.');setItems(json.data.items||[]);setSummary(json.data.summary||{total:0,active:0,scheduled:0,drafts:0});}catch(reason){setError(reason instanceof Error?reason.message:'Không thể tải Flash Sale.');}finally{setLoading(false);}
  },[search,state]);
  useEffect(()=>{void load();},[load]);
  const cards=[['Tổng chiến dịch',summary.total,Flame,'text-rose-300'],['Đang diễn ra',summary.active,TimerReset,'text-emerald-300'],['Sắp diễn ra',summary.scheduled,CalendarClock,'text-cyan-300'],['Bản nháp',summary.drafts,Flame,'text-zinc-300']] as const;
  return <section className="space-y-5">
    <header className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-[#0d0d11] p-5 shadow-2xl shadow-black/20">
      <div aria-hidden="true" className="absolute inset-y-0 right-0 w-72 bg-[radial-gradient(circle_at_center,rgba(244,63,94,.16),transparent_68%)]" />
      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="mb-2 font-mono text-xs uppercase tracking-[.24em] text-rose-400">Sales operations</p><h1 className="flex items-center gap-3 text-2xl font-black tracking-tight text-white"><Flame aria-hidden="true" className="h-6 w-6 text-rose-400" />Flash Sale</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">Quản lý lịch chạy, giá bán và quota giao dịch của từng SKU. Giá và số lượng luôn được kiểm tra lại khi tạo đơn.</p></div><Link href="/sales/flash-sales/new" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-orange-500 px-5 text-sm font-bold text-white shadow-lg shadow-rose-950/30 hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-300"><Plus aria-hidden="true" className="h-4 w-4" />Tạo chiến dịch</Link></div>
    </header>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label,value,Icon,color])=><div key={label} className="rounded-xl border border-zinc-800 bg-[#111116] p-4"><div className="flex items-center justify-between"><p className="text-sm text-zinc-500">{label}</p><Icon aria-hidden="true" className={`h-4 w-4 ${color}`} /></div><p className="mt-3 font-mono text-3xl font-black tabular-nums text-white">{formatNumber(value)}</p></div>)}</div>
    <div className="rounded-2xl border border-zinc-800 bg-[#0d0d11]">
      <div className="flex flex-col gap-3 border-b border-zinc-800 p-4 md:flex-row md:items-center"><form onSubmit={(event)=>{event.preventDefault();setSearch(query.trim());}} className="flex flex-1 gap-2"><label className="relative flex-1"><span className="sr-only">Tìm theo mã hoặc tên chiến dịch</span><Search aria-hidden="true" className="absolute left-3 top-3.5 h-4 w-4 text-zinc-600" /><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Mã hoặc tên chiến dịch" className="min-h-11 w-full rounded-xl border border-zinc-700 bg-black/30 pl-10 pr-3 text-sm text-white outline-none focus:border-rose-500" /></label><button className="min-h-11 rounded-xl border border-zinc-700 px-4 text-sm font-semibold text-zinc-200 hover:border-rose-500">Tìm</button></form><label className="text-sm text-zinc-400"><span className="sr-only">Lọc trạng thái</span><select value={state} onChange={(event)=>setState(event.target.value)} className="min-h-11 min-w-48 rounded-xl border border-zinc-700 bg-[#111116] px-3 text-white"><option value="all">Tất cả trạng thái</option><option value="active">Đang diễn ra</option><option value="scheduled">Sắp diễn ra</option><option value="draft">Bản nháp</option><option value="ended">Đã kết thúc</option><option value="paused">Tạm dừng</option></select></label></div>
      {error?<div role="alert" className="border-b border-rose-800/50 bg-rose-950/30 px-4 py-3 text-sm text-rose-200">{error}</div>:null}
      <div className="overflow-x-auto" aria-busy={loading}><table className="w-full min-w-[1120px] text-left text-sm"><thead className="border-b border-zinc-800 bg-zinc-950/70 text-xs uppercase tracking-wider text-zinc-600"><tr><th className="px-4 py-3">Chiến dịch</th><th className="px-4 py-3">Trạng thái</th><th className="px-4 py-3">Thời gian</th><th className="px-4 py-3 text-right">SKU</th><th className="px-4 py-3 text-right">Đang giữ</th><th className="px-4 py-3 text-right">Đã bán</th><th className="px-4 py-3 text-right">Còn lại</th><th className="w-14"><span className="sr-only">Thao tác</span></th></tr></thead><tbody>{loading?<tr><td colSpan={8} className="px-4 py-16 text-center text-zinc-500"><span role="status">Đang tải chiến dịch...</span></td></tr>:items.length===0?<tr><td colSpan={8} className="px-4 py-16 text-center text-zinc-500">Chưa có chiến dịch phù hợp. Tạo bản nháp đầu tiên để bắt đầu.</td></tr>:items.map((item)=><tr key={item.id} className="border-b border-zinc-900 text-zinc-300 hover:bg-zinc-900/40"><td className="px-4 py-4"><p className="font-mono text-xs font-bold text-rose-300">{item.code}</p><p className="mt-1 max-w-72 truncate font-semibold text-white">{item.name}</p></td><td className="px-4 py-4"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${STATE_STYLE[item.state]||STATE_STYLE.draft}`}>{STATE_LABELS[item.state]||item.state}</span></td><td className="px-4 py-4 text-xs leading-5 text-zinc-500"><span className="text-zinc-300">{formatTime(item.startsAt)}</span><br />đến {formatTime(item.endsAt)}</td><td className="px-4 py-4 text-right font-mono tabular-nums">{formatNumber(item.itemCount)}</td><td className="px-4 py-4 text-right font-mono tabular-nums text-amber-300">{formatNumber(item.quotaReserved)}</td><td className="px-4 py-4 text-right font-mono tabular-nums text-emerald-300">{formatNumber(item.quotaSold)}</td><td className="px-4 py-4 text-right font-mono font-bold tabular-nums text-cyan-300">{formatNumber(item.remainingQuantity)}/{formatNumber(item.quotaTotal)}</td><td className="px-2"><Link aria-label={`Chỉnh sửa ${item.name}`} href={`/sales/flash-sales/${item.id}`} className="grid h-10 w-10 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-white focus-visible:outline-2 focus-visible:outline-rose-400"><ChevronRight aria-hidden="true" className="h-4 w-4" /></Link></td></tr>)}</tbody></table></div>
    </div>
  </section>;
}
