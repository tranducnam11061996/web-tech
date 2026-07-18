'use client';

import Link from 'next/link';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { formatPcPrice, pcBuilderApi, PC_BUILDER_DRAFT_KEY, type PcBuilderQuote, type PcBuilderSelection } from '@/lib/pcBuilder';

export default function PcBuilderCheckoutClient() {
  const [selections, setSelections] = useState<PcBuilderSelection[]>([]);
  const [quote, setQuote] = useState<PcBuilderQuote | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', note: '', paymentMethod: 'bank_transfer' });
  const [warningsConfirmed, setWarningsConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [orderId, setOrderId] = useState<number | null>(null);
  const idempotencyKey = useRef('');

  useEffect(() => {
    try {
      const draft = JSON.parse(localStorage.getItem(PC_BUILDER_DRAFT_KEY) || '{}');
      const items = Array.isArray(draft.selections) ? draft.selections as PcBuilderSelection[] : [];
      setSelections(items);
      if (!items.length) { setError('Chưa có cấu hình để thanh toán.'); setLoading(false); return; }
      pcBuilderApi<PcBuilderQuote>('/api/pc-builder/quote', { method: 'POST', body: JSON.stringify({ selections: items, assemblyRequired: true }) })
        .then(setQuote).catch((reason) => setError(reason.message)).finally(() => setLoading(false));
    } catch { setError('Draft cấu hình không hợp lệ.'); setLoading(false); }
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    if (!quote?.compatible) { setError('Cấu hình không còn hợp lệ.'); return; }
    if (quote.diagnostics.some((item) => item.severity === 'warning') && !warningsConfirmed) { setError('Vui lòng xác nhận cảnh báo trước khi đặt hàng.'); return; }
    setSubmitting(true);
    try {
      const { getCustomerRecaptchaToken } = await import('@/lib/customerRecaptcha');
      const recaptchaToken = await getCustomerRecaptchaToken('pc_builder_order_submit');
      idempotencyKey.current ||= crypto.randomUUID();
      const data = await pcBuilderApi<{ orderId: number }>('/api/pc-builder/orders', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey.current }, body: JSON.stringify({
        recaptchaToken, website: '', selections, assemblyRequired: true, warningsConfirmed,
        customer: { name: form.name.trim(), phone: form.phone.trim(), email: form.email.trim() },
        receiver: { enabled: false, name: '', phone: '' }, delivery: { method: 'pickup', provinceCode: '', province: '', wardCode: '', ward: '', address: '', note: form.note.trim() },
        paymentMethod: form.paymentMethod, invoice: { enabled: false, companyName: '', taxCode: '', address: '', email: '' }, note: form.note.trim(),
      }) });
      setOrderId(data.orderId); localStorage.removeItem(PC_BUILDER_DRAFT_KEY);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Không thể tạo đơn hàng.'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <main className="grid min-h-[60vh] place-items-center"><Loader2 className="h-8 w-8 animate-spin text-red-500" /></main>;
  if (orderId) return <main className="mx-auto grid min-h-[65vh] max-w-xl place-items-center px-4 text-center"><div><CheckCircle2 className="mx-auto h-16 w-16 text-emerald-400" /><h1 className="mt-5 text-3xl font-black">Đặt cấu hình thành công</h1><p className="mt-3 text-zinc-400">Mã đơn hàng #{orderId}. Đội ngũ kỹ thuật sẽ xác nhận trước khi lắp ráp.</p><Link href="/" className="mt-7 inline-flex rounded-xl bg-red-600 px-6 py-3 font-bold">Về trang chủ</Link></div></main>;

  return <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6"><div className="mb-6"><p className="text-xs font-bold uppercase tracking-widest text-red-400">PC Builder</p><h1 className="mt-2 text-3xl font-black">Thông tin đặt hàng</h1></div>{error && <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>}<div className="grid gap-6 lg:grid-cols-[1fr_380px]"><form onSubmit={submit} className="space-y-5 rounded-2xl border border-white/10 bg-[#151518] p-5 sm:p-6"><h2 className="text-lg font-black">Người đặt hàng</h2><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-bold">Họ tên<input required minLength={2} maxLength={150} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-red-500" /></label><label className="text-sm font-bold">Số điện thoại<input required value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-red-500" /></label></div><label className="block text-sm font-bold">Email<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-red-500" /></label><label className="block text-sm font-bold">Ghi chú<textarea maxLength={1000} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} className="mt-2 min-h-28 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 outline-none focus:border-red-500" /></label><fieldset><legend className="mb-3 text-sm font-bold">Thanh toán</legend><div className="grid gap-3 sm:grid-cols-2"><label className="rounded-xl border border-white/10 p-4"><input type="radio" name="payment" checked={form.paymentMethod === 'bank_transfer'} onChange={() => setForm({ ...form, paymentMethod: 'bank_transfer' })} className="mr-2" />Chuyển khoản</label><label className="rounded-xl border border-white/10 p-4"><input type="radio" name="payment" checked={form.paymentMethod === 'cod'} onChange={() => setForm({ ...form, paymentMethod: 'cod' })} className="mr-2" />Thanh toán khi nhận</label></div></fieldset>{quote?.diagnostics.some((item) => item.severity === 'warning') && <label className="flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-100"><input type="checkbox" checked={warningsConfirmed} onChange={(event) => setWarningsConfirmed(event.target.checked)} className="mt-1" /><span>Tôi đã đọc và xác nhận các cảnh báo về đường xuất hình/cấu hình.</span></label>}<button disabled={submitting || !quote?.compatible} className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-4 font-black disabled:opacity-40">{submitting && <Loader2 className="h-5 w-5 animate-spin" />}Đặt hàng & lắp ráp miễn phí</button></form><aside className="h-fit rounded-2xl border border-white/10 bg-[#151518] p-5 lg:sticky lg:top-5"><h2 className="font-black">Cấu hình đã quote lại</h2><div className="my-4 max-h-80 space-y-3 overflow-y-auto border-y border-white/10 py-4">{quote?.items.map((item) => <div key={item.productId} className="flex justify-between gap-3 text-sm"><span className="line-clamp-2 text-zinc-400">{item.name} × {item.quantity}</span><strong className="shrink-0">{formatPcPrice(item.lineTotal)}</strong></div>)}</div>{quote?.diagnostics.map((item) => <div key={item.ruleCode} className={`mb-2 flex gap-2 rounded-lg p-3 text-xs ${item.severity === 'error' ? 'bg-red-500/10 text-red-200' : 'bg-amber-500/10 text-amber-100'}`}><AlertTriangle className="h-4 w-4 shrink-0" />{item.message}</div>)}<div className="mt-4 flex items-end justify-between"><span className="font-bold">Tổng cộng</span><strong className="text-2xl text-red-500">{formatPcPrice(quote?.totals.total || 0)}</strong></div><p className="mt-2 text-right text-xs text-emerald-400">Lắp ráp miễn phí</p></aside></div></main>;
}
