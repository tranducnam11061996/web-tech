'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, ChevronDown, Cpu, Gamepad2, Loader2, Plus, Save, Share2, Sparkles, X } from 'lucide-react';
import {
  formatPcPrice, pcBuilderApi, PC_BUILDER_DRAFT_KEY,
  type PcBuilderCandidate, type PcBuilderComponentCode, type PcBuilderDiagnostic, type PcBuilderQuote, type PcBuilderSelection,
} from '@/lib/pcBuilder';

type Bootstrap = {
  enabled: boolean; autoEnabled: boolean; ruleRevision: string; minimumBudget: number;
  components: Array<{ code: PcBuilderComponentCode; name: string; required: boolean; maxSelections: number; ordering: number }>;
  coverage: Array<{ componentCode: PcBuilderComponentCode; total: number; verified: number; pending: number; stale: number }>;
};
type CandidateResponse = { items: PcBuilderCandidate[]; nextCursor: number | null };
type AutoResponse = { variants: Array<{ variant: 'value' | 'balanced' | 'performance'; quote: PcBuilderQuote; performanceScore: number }>; reason?: string; minimumBudget: number };

const VARIANT_LABEL = { value: 'Tiết kiệm', balanced: 'Cân bằng', performance: 'Hiệu năng' } as const;
const FALLBACK_COMPONENTS: Bootstrap['components'] = [
  ['cpu','CPU',true,1],['mainboard','Mainboard',true,1],['ram','RAM',true,4],['storage','SSD / HDD',true,4],
  ['case','Vỏ máy tính',true,1],['psu','Nguồn máy tính',true,1],['gpu','Card đồ họa',false,1],['cooler','Tản nhiệt',false,1],
  ['monitor','Màn hình',false,2],['keyboard','Bàn phím',false,1],['mouse','Chuột',false,1],['headset','Tai nghe',false,1],
].map(([code,name,required,maxSelections], ordering) => ({ code: code as PcBuilderComponentCode, name: String(name), required: Boolean(required), maxSelections: Number(maxSelections), ordering }));

function readDraft(): PcBuilderSelection[] {
  try { const value = JSON.parse(localStorage.getItem(PC_BUILDER_DRAFT_KEY) || '{}'); return value.version === 1 && Array.isArray(value.selections) ? value.selections : []; } catch { return []; }
}

function DiagnosticList({ items }: { items: PcBuilderDiagnostic[] }) {
  if (!items.length) return null;
  return <div className="space-y-2" aria-live="polite">{items.map((item) => <div key={`${item.ruleCode}-${item.componentCodes.join('-')}`} className={`flex gap-2 rounded-xl border p-3 text-sm ${item.severity === 'error' ? 'border-red-500/30 bg-red-500/10 text-red-100' : 'border-amber-500/30 bg-amber-500/10 text-amber-100'}`}>
    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> <span>{item.message}</span>
  </div>)}</div>;
}

export default function PcBuilderClient() {
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [tab, setTab] = useState<'manual' | 'auto'>('manual');
  const [selections, setSelections] = useState<PcBuilderSelection[]>([]);
  const [quote, setQuote] = useState<PcBuilderQuote | null>(null);
  const [activeComponent, setActiveComponent] = useState<PcBuilderComponentCode | null>(null);
  const [candidates, setCandidates] = useState<PcBuilderCandidate[]>([]);
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [autoForm, setAutoForm] = useState({ budget: 25_000_000, resolution: '1080p', gameType: 'mixed' });
  const [autoResult, setAutoResult] = useState<AutoResponse | null>(null);
  const [autoLoading, setAutoLoading] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('share');
    if (token) {
      pcBuilderApi<{ quote: PcBuilderQuote }>(`/api/pc-builder/builds/${encodeURIComponent(token)}`)
        .then((shared) => setSelections(shared.quote.items.map((item) => ({ componentCode: item.componentCode, productId: item.productId, quantity: item.quantity }))))
        .catch((reason) => setError(reason.message));
    } else setSelections(readDraft());
    pcBuilderApi<Bootstrap>('/api/pc-builder/bootstrap').then(setBootstrap).catch((reason) => setError(reason.message));
  }, []);
  useEffect(() => { localStorage.setItem(PC_BUILDER_DRAFT_KEY, JSON.stringify({ version: 1, selections, savedAt: new Date().toISOString() })); }, [selections]);
  useEffect(() => {
    if (!selections.length) { setQuote(null); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setQuoteLoading(true);
      pcBuilderApi<PcBuilderQuote>('/api/pc-builder/quote', { method: 'POST', signal: controller.signal, body: JSON.stringify({ selections, assemblyRequired: true }) })
        .then((data) => { setQuote(data); setError(''); }).catch((reason) => { if (reason.name !== 'AbortError') setError(reason.message); }).finally(() => setQuoteLoading(false));
    }, 250);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [selections]);

  const components = bootstrap?.components?.length ? bootstrap.components : FALLBACK_COMPONENTS;
  const selectedItems = useMemo(() => new Map((quote?.items || []).map((item) => [item.productId, item])), [quote]);

  const openCandidates = useCallback(async (componentCode: PcBuilderComponentCode) => {
    setActiveComponent(componentCode); setCandidateLoading(true); setCandidates([]); setSearch('');
    try {
      const data = await pcBuilderApi<CandidateResponse>('/api/pc-builder/candidates', { method: 'POST', body: JSON.stringify({ componentCode, selections, limit: 32 }) });
      setCandidates(data.items);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tải được sản phẩm.'); } finally { setCandidateLoading(false); }
  }, [selections]);

  const chooseCandidate = (candidate: PcBuilderCandidate) => {
    if (!activeComponent) return;
    if (!candidate.compatible && !window.confirm(`Sản phẩm này gây xung đột:\n${candidate.reasons.map((item) => `• ${item.message}`).join('\n')}\n\nVẫn thay đổi để tự xử lý các linh kiện bị ảnh hưởng?`)) return;
    setSelections((current) => {
      const max = components.find((item) => item.code === activeComponent)?.maxSelections || 1;
      const existing = current.filter((item) => item.componentCode === activeComponent);
      if (max === 1) return [...current.filter((item) => item.componentCode !== activeComponent), { componentCode: activeComponent, productId: candidate.productId, quantity: 1 }];
      if (existing.some((item) => item.productId === candidate.productId) || existing.length >= max) return current;
      return [...current, { componentCode: activeComponent, productId: candidate.productId, quantity: 1 }];
    });
    setActiveComponent(null);
  };

  const share = async () => {
    try {
      const data = await pcBuilderApi<{ shareToken: string }>('/api/pc-builder/builds', { method: 'POST', body: JSON.stringify({ name: 'Cấu hình PC của tôi', mode: 'manual', selections, input: {} }) });
      const url = `${location.origin}/xay-dung-cau-hinh-pc?share=${data.shareToken}`;
      await navigator.clipboard.writeText(url); window.alert('Đã sao chép liên kết chia sẻ. Liên kết có hiệu lực 90 ngày.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể chia sẻ cấu hình.'); }
  };

  const saveToAccount = async () => {
    try {
      const data = await pcBuilderApi<{ id: number }>('/api/customer/pc-builds', { method: 'POST', body: JSON.stringify({ name: 'Cấu hình PC của tôi', mode: 'manual', selections, input: {} }) });
      window.alert(`Đã lưu cấu hình #${data.id} vào tài khoản.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể lưu cấu hình vào tài khoản.'); }
  };

  const runAuto = async () => {
    setAutoLoading(true); setAutoResult(null); setError('');
    try { setAutoResult(await pcBuilderApi<AutoResponse>('/api/pc-builder/auto', { method: 'POST', body: JSON.stringify({ ...autoForm, cpuBrandIds: [], gpuBrandIds: [] }) })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể tạo cấu hình tự động.'); }
    finally { setAutoLoading(false); }
  };

  if (bootstrap && !bootstrap.enabled) return <main className="mx-auto grid min-h-[65vh] max-w-2xl place-items-center px-4 text-center"><div className="rounded-3xl border border-white/10 bg-[#151518] p-8 sm:p-12"><Cpu className="mx-auto h-14 w-14 text-zinc-700" /><h1 className="mt-5 text-3xl font-black">PC Builder đang được chuẩn bị</h1><p className="mt-3 leading-7 text-zinc-400">Catalog đang trong giai đoạn xác minh tương thích. Tính năng sẽ được mở khi tất cả nhóm linh kiện bắt buộc đạt điều kiện an toàn.</p><Link href="/" className="mt-7 inline-flex rounded-xl bg-red-600 px-6 py-3 font-bold">Về trang chủ</Link></div></main>;

  return <main className="mx-auto min-h-screen max-w-[1500px] px-4 pb-28 pt-6 sm:px-6 lg:px-8">
    <div className="mb-7 overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_right,rgba(220,38,38,.22),transparent_38%),linear-gradient(135deg,#17171b,#0d0d0f)] p-6 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="mb-2 text-xs font-bold uppercase tracking-[.24em] text-red-400">PC Builder</p><h1 className="text-3xl font-black tracking-tight sm:text-4xl">Xây dựng cấu hình PC</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">Chỉ hiển thị linh kiện đã được xác minh. Giá và tương thích được kiểm tra lại trước khi đặt hàng.</p></div><div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-zinc-300">Ngân sách khả dụng từ <strong className="ml-1 text-white">{formatPcPrice(bootstrap?.minimumBudget || 0)}</strong></div></div>
    </div>
    <div role="tablist" aria-label="Chế độ xây dựng" className="mb-6 inline-flex rounded-2xl border border-white/10 bg-white/[.04] p-1">
      <button role="tab" aria-selected={tab === 'manual'} onClick={() => setTab('manual')} className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold ${tab === 'manual' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'}`}><Cpu className="h-4 w-4" />Tự chọn</button>
      <button role="tab" aria-selected={tab === 'auto'} onClick={() => setTab('auto')} className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold ${tab === 'auto' ? 'bg-red-600 text-white' : 'text-zinc-400 hover:text-white'}`}><Gamepad2 className="h-4 w-4" />Gaming tự động</button>
    </div>
    {error && <div className="mb-5 flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100"><span>{error}</span><button onClick={() => setError('')} aria-label="Đóng thông báo"><X className="h-4 w-4" /></button></div>}

    {tab === 'manual' ? <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="space-y-3" aria-label="Danh sách linh kiện">{components.map((component, index) => {
        const chosen = selections.filter((item) => item.componentCode === component.code);
        return <article key={component.code} className="overflow-hidden rounded-2xl border border-white/10 bg-[#131316]">
          <div className="flex items-center gap-3 border-b border-white/[.07] px-4 py-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-white/[.06] text-xs font-black text-zinc-400">{String(index + 1).padStart(2,'0')}</span><div className="min-w-0 flex-1"><h2 className="font-bold">{component.name}</h2><p className="text-xs text-zinc-500">{component.required ? 'Bắt buộc' : 'Tùy chọn'} · tối đa {component.maxSelections}</p></div><button onClick={() => openCandidates(component.code)} className="flex items-center gap-1 rounded-xl bg-white/[.07] px-3 py-2 text-sm font-bold hover:bg-white/[.12]"><Plus className="h-4 w-4" />Chọn</button></div>
          {chosen.length ? <div className="divide-y divide-white/[.06]">{chosen.map((selection) => { const item = selectedItems.get(selection.productId); return <div key={selection.productId} className="flex items-center gap-3 p-4"><div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-white"><Image src={item?.thumbnail || 'https://placehold.co/120x120'} alt="" fill sizes="56px" className="object-contain" /></div><div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-semibold">{item?.name || `Sản phẩm #${selection.productId}`}</p><p className="mt-1 text-sm font-black text-red-400">{item ? formatPcPrice(item.price) : 'Đang kiểm tra giá'}</p></div><button onClick={() => setSelections((current) => current.filter((value) => !(value.componentCode === component.code && value.productId === selection.productId)))} className="rounded-lg p-2 text-zinc-500 hover:bg-red-500/10 hover:text-red-400" aria-label={`Bỏ ${item?.name || 'sản phẩm'}`}><X className="h-4 w-4" /></button></div>; })}</div> : <button onClick={() => openCandidates(component.code)} className="flex w-full items-center justify-between px-4 py-5 text-left text-sm text-zinc-500 hover:bg-white/[.02] hover:text-zinc-300"><span>Chưa chọn {component.name.toLowerCase()}</span><ChevronDown className="h-4 w-4 -rotate-90" /></button>}
        </article>;
      })}</section>
      <aside id="pc-builder-summary" className="h-fit space-y-4 xl:sticky xl:top-5"><div className="rounded-2xl border border-white/10 bg-[#151518] p-5"><div className="mb-5 flex items-center justify-between"><h2 className="text-lg font-black">Tóm tắt cấu hình</h2>{quoteLoading && <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />}</div><div className="space-y-3 border-b border-white/10 pb-5 text-sm"><div className="flex justify-between text-zinc-400"><span>{quote?.totals.itemCount || selections.length} sản phẩm</span><span>{formatPcPrice(quote?.totals.subtotal || 0)}</span></div><div className="flex justify-between text-zinc-400"><span>Phí lắp ráp</span><span className="font-bold text-emerald-400">Miễn phí</span></div></div><div className="flex items-end justify-between py-5"><span className="font-bold">Tổng cộng</span><strong className="text-2xl text-red-500">{formatPcPrice(quote?.totals.total || 0)}</strong></div><DiagnosticList items={quote?.diagnostics || []} /><div className="mt-4 grid grid-cols-2 gap-2"><button onClick={share} disabled={!quote?.compatible} className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-3 text-sm font-bold disabled:opacity-40"><Share2 className="h-4 w-4" />Chia sẻ</button><button onClick={saveToAccount} disabled={!quote?.compatible} className="flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-3 text-sm font-bold disabled:opacity-40"><Save className="h-4 w-4" />Lưu</button></div><Link aria-disabled={!quote?.compatible} href={quote?.compatible ? '/thanh-toan-pc-builder' : '#'} className={`mt-2 flex w-full items-center justify-center rounded-xl py-3.5 text-sm font-black ${quote?.compatible ? 'bg-red-600 hover:bg-red-500' : 'pointer-events-none bg-zinc-800 text-zinc-500'}`}>Đặt mua & lắp ráp</Link></div><p className="px-2 text-xs leading-5 text-zinc-500">Giá chia sẻ luôn được báo lại tại thời điểm mở liên kết. Không sử dụng số lượng legacy làm tồn kho.</p></aside>
    </div> : <section className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]"><div className="h-fit rounded-2xl border border-white/10 bg-[#151518] p-5"><div className="mb-5 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-red-600"><Sparkles className="h-5 w-5" /></span><div><h2 className="font-black">Tạo cấu hình Gaming</h2><p className="text-xs text-zinc-500">Ngân sách chỉ tính thùng máy</p></div></div><label className="mb-4 block text-sm font-bold">Ngân sách<input type="number" min={1_000_000} step={500_000} value={autoForm.budget} onChange={(event) => setAutoForm({ ...autoForm, budget: Number(event.target.value) })} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-red-500" /></label><label className="mb-4 block text-sm font-bold">Độ phân giải<select value={autoForm.resolution} onChange={(event) => setAutoForm({ ...autoForm, resolution: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#202024] px-4 py-3"><option value="1080p">1080p</option><option value="1440p">1440p</option><option value="4k">4K</option></select></label><label className="mb-5 block text-sm font-bold">Loại game<select value={autoForm.gameType} onChange={(event) => setAutoForm({ ...autoForm, gameType: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#202024] px-4 py-3"><option value="esports">eSports</option><option value="aaa">AAA</option><option value="mixed">Hỗn hợp</option></select></label><button onClick={runAuto} disabled={autoLoading || bootstrap?.autoEnabled === false} className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-3.5 font-black disabled:opacity-40">{autoLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}Tạo cấu hình</button></div><div>{autoResult?.variants.length ? <div className="grid gap-4 xl:grid-cols-3">{autoResult.variants.map((entry) => <article key={entry.variant} className="rounded-2xl border border-white/10 bg-[#151518] p-5"><p className="text-xs font-black uppercase tracking-widest text-red-400">{VARIANT_LABEL[entry.variant]}</p><h3 className="mt-2 text-2xl font-black">{formatPcPrice(entry.quote.totals.total)}</h3><div className="my-5 space-y-2">{entry.quote.items.map((item) => <div key={item.productId} className="flex justify-between gap-3 text-xs"><span className="line-clamp-1 text-zinc-400">{item.name}</span><span className="shrink-0 font-bold">{formatPcPrice(item.price)}</span></div>)}</div><button onClick={() => { setSelections(entry.quote.items.map((item) => ({ componentCode: item.componentCode, productId: item.productId, quantity: item.quantity }))); setTab('manual'); }} className="w-full rounded-xl border border-white/10 py-3 text-sm font-bold hover:bg-white/[.06]">Chọn cấu hình này</button></article>)}</div> : <div className="grid min-h-[360px] place-items-center rounded-2xl border border-dashed border-white/10 p-8 text-center"><div><Gamepad2 className="mx-auto h-12 w-12 text-zinc-700" /><h2 className="mt-4 text-lg font-black">Ba phương án rõ ràng</h2><p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">Hệ thống tối ưu theo hiệu năng/giá, độ cân bằng CPU–GPU và hiệu năng cao nhất trong ngân sách. Không ước lượng FPS nếu chưa có benchmark được xác minh.</p></div></div>}</div></section>}

    {activeComponent && <div role="dialog" aria-modal="true" aria-label="Chọn linh kiện" className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm"><button className="absolute inset-0 cursor-default" onClick={() => setActiveComponent(null)} aria-label="Đóng" /><div className="relative flex h-full w-full max-w-2xl flex-col border-l border-white/10 bg-[#101012] shadow-2xl"><div className="border-b border-white/10 p-5"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-widest text-zinc-500">Chọn linh kiện</p><h2 className="mt-1 text-xl font-black">{components.find((item) => item.code === activeComponent)?.name}</h2></div><button onClick={() => setActiveComponent(null)} className="rounded-xl p-3 hover:bg-white/[.06]" aria-label="Đóng"><X /></button></div><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo tên hoặc SKU…" className="mt-4 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm outline-none focus:border-red-500" /></div><div className="flex-1 overflow-y-auto p-4">{candidateLoading ? <div className="grid h-64 place-items-center"><Loader2 className="h-8 w-8 animate-spin text-red-500" /></div> : <div className="space-y-3">{candidates.filter((item) => !search || `${item.name} ${item.sku}`.toLowerCase().includes(search.toLowerCase())).map((candidate) => <button key={candidate.productId} onClick={() => chooseCandidate(candidate)} className={`flex w-full gap-4 rounded-2xl border p-4 text-left ${candidate.compatible ? 'border-white/10 bg-white/[.025] hover:border-emerald-500/40' : 'border-amber-500/20 bg-amber-500/[.04]'}`}><div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white"><Image src={candidate.thumbnail || 'https://placehold.co/160x160'} alt="" fill sizes="80px" className="object-contain" /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><p className="line-clamp-2 text-sm font-bold">{candidate.name}</p>{candidate.compatible ? <Check className="h-5 w-5 shrink-0 text-emerald-400" /> : <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />}</div><p className="mt-1 text-xs text-zinc-500">{candidate.brandName} · {candidate.sku}</p><p className="mt-2 font-black text-red-400">{formatPcPrice(candidate.price)}</p>{!candidate.compatible && <p className="mt-2 text-xs text-amber-300">{candidate.reasons.find((item) => item.severity === 'error')?.message}</p>}</div></button>)}</div>}</div></div></div>}
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#111113]/95 p-3 backdrop-blur xl:hidden"><div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4"><div><p className="text-xs text-zinc-500">Tổng cấu hình</p><p className="font-black text-red-500">{formatPcPrice(quote?.totals.total || 0)}</p></div><a href="#pc-builder-summary" className="rounded-xl bg-red-600 px-5 py-3 text-sm font-black">Xem cấu hình</a></div></div>
  </main>;
}
