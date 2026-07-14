"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import ProgressiveImage from "@/components/ProgressiveImage";
import { CommercePageFrame } from "@/components/commerce/CommercePageFrame";
import { formatCurrency } from "@/lib/cart";
import { setComboCart, toComboApiPayload, useComboCart } from "@/lib/comboCart";
import { apiErrorSummary, parseStorefrontResponse } from "@/lib/storefrontApi";

type QuoteItem = {
  groupIndex: number; productId: number; quantity: number; name: string; sku: string; slug: string;
  thumbnail: string; price: number; marketPrice: number; lineTotal: number; comboDiscount: number;
};
type Quote = {
  comboSet: { title: string };
  anchor: { productId: number; name: string; sku: string; slug: string; thumbnail: string; price: number; marketPrice: number };
  groups: Array<{ groupIndex: number; title: string; items: QuoteItem[] }>;
  totals: { subtotalBeforeDiscount: number; comboDiscount: number; total: number; itemCount: number };
};

function ComboCartRow({ item, fixed, onUpdate, onRemove }: {
  item: QuoteItem | Quote["anchor"]; fixed?: boolean; onUpdate?: (delta: number) => void; onRemove?: () => void;
}) {
  const href = `/${String(item.slug || "").replace(/^\/+/, "")}`;
  const marketPrice = Number(item.marketPrice || 0);
  const hasMarketPrice = marketPrice > Number(item.price || 0);
  const quantity = "quantity" in item ? item.quantity : 1;
  return <article className="bg-[#111115] border border-[#1a1a1e] rounded-xl p-4 flex items-start gap-4">
    <span aria-hidden="true" className="mt-4 size-5 shrink-0 rounded-sm bg-red-500 text-center text-sm font-black leading-5 text-white">✓</span>
    <Link href={href} className="size-20 shrink-0 overflow-hidden rounded-md border border-[#1a1a1e] bg-[#0d0d10] md:size-24">
      <ProgressiveImage src={item.thumbnail || "https://placehold.co/300x300/1f2937/a1a1aa?text=TrucTiepGAME"} alt={item.name} className="size-full object-contain p-2" />
    </Link>
    <div className="min-w-0 flex-1 flex flex-col gap-1 lg:flex-row lg:items-center lg:gap-4">
      <div className="min-w-0 flex-1">
        <Link href={href} className="text-sm font-bold text-white transition hover:text-cyan-400">{item.name}</Link>
        <p className="text-[11px] text-gray-500">{fixed ? "Sản phẩm chính · Số lượng 1" : `Mã: ${item.sku || item.productId}`}</p>
        {!fixed && "comboDiscount" in item && item.comboDiscount > 0 ? <p className="mt-1 text-[11px] text-emerald-400">Đã giảm combo {formatCurrency(item.comboDiscount)}</p> : null}
      </div>
      <div className="flex items-center gap-4">
        <div className="w-24 shrink-0 text-left lg:text-right">
          <p className="text-sm font-bold text-red-500">{formatCurrency(item.price)}</p>
          {hasMarketPrice ? <p className="text-[11px] text-gray-500 line-through">{formatCurrency(marketPrice)}</p> : null}
        </div>
        <div className="w-20 shrink-0">
          {fixed ? <p className="text-center text-sm text-gray-400">x1</p> : <div className="flex h-8 max-w-20 overflow-hidden rounded border border-[#27272a]">
            <button type="button" onClick={() => onUpdate?.(-1)} disabled={quantity <= 1} aria-label={`Giảm số lượng ${item.name}`} className="w-7 bg-[#0d0d10] text-gray-400 hover:bg-[#1a1a1e] disabled:cursor-not-allowed disabled:opacity-40">−</button>
            <span className="flex-1 border-x border-[#27272a] text-center text-xs font-medium leading-8 text-white">{quantity}</span>
            <button type="button" onClick={() => onUpdate?.(1)} disabled={quantity >= 99} aria-label={`Tăng số lượng ${item.name}`} className="w-7 bg-[#0d0d10] text-gray-400 hover:bg-[#1a1a1e] disabled:cursor-not-allowed disabled:opacity-40">+</button>
          </div>}
        </div>
        <div className="hidden w-28 shrink-0 text-right lg:block"><p className="text-sm font-bold text-red-500">{formatCurrency(fixed ? item.price : (item as QuoteItem).lineTotal)}</p></div>
      </div>
    </div>
    {!fixed ? <button type="button" onClick={onRemove} aria-label={`Xóa ${item.name} khỏi giỏ combo`} className="mt-2 flex size-8 shrink-0 items-center justify-center rounded-md bg-[#1a1a1e] text-gray-400 transition hover:bg-red-500/20 hover:text-red-500 lg:mt-6">⌫</button> : <div className="w-8 shrink-0" />}
  </article>;
}

export default function ComboCartClient() {
  const cart = useComboCart();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!cart || cart.items.length === 0) { setQuote(null); setLoading(false); return; }
    const controller = new AbortController(); setLoading(true); setError("");
    const timer = window.setTimeout(() => fetch("/api/combo-cart/quote", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify(toComboApiPayload(cart)) })
      .then((response) => parseStorefrontResponse<Quote>(response))
      .then((data) => setQuote(data))
      .catch((cause) => { if (!controller.signal.aborted) setError(apiErrorSummary(cause)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); })
    , 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [cart]);
  const update = (productId: number, delta: number) => cart && setComboCart({ ...cart, items: cart.items.map((item) => item.productId === productId ? { ...item, quantity: Math.min(99, Math.max(1, item.quantity + delta)) } : item) });
  const remove = (productId: number) => cart && setComboCart({ ...cart, items: cart.items.filter((item) => item.productId !== productId) });
  const productCount = useMemo(() => quote?.totals.itemCount || 0, [quote]);
  const clear = () => { if (window.confirm("Xóa toàn bộ giỏ combo?")) setComboCart(null); };
  const empty = !cart || cart.items.length === 0;
  return <CommercePageFrame><main className="min-h-[55vh] bg-[#0a0a0c]"><section className="mx-auto max-w-[1400px] px-4 py-12 pb-24 md:px-6">
    {empty ? <div className="rounded-2xl border border-[#1a1a1e] bg-[#111115] p-10 text-center"><div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-red-500/10 text-2xl text-red-400">🛒</div><h1 className="mb-2 text-xl font-black">Giỏ combo đang trống</h1><p className="mb-6 text-sm text-gray-500">Hãy chọn sản phẩm mua kèm để tiếp tục đặt đơn combo.</p><Link href="/" className="inline-flex rounded-lg bg-red-600 px-6 py-3 font-bold text-white transition hover:bg-red-500">Tiếp tục mua sắm</Link></div> : <div className="flex flex-col items-start gap-6 lg:flex-row">
      <div className="flex w-full flex-col gap-4 lg:w-2/3">
        <div className="flex items-center gap-4 rounded-xl border border-[#1a1a1e] bg-[#111115] p-4"><span aria-hidden="true" className="size-5 shrink-0 rounded-sm bg-red-500 text-center text-sm font-black leading-5">✓</span><div className="min-w-0 flex-1"><span className="text-sm font-bold text-white">Tất cả ({productCount}/{productCount}) sản phẩm</span>{loading ? <span className="ml-3 text-[11px] text-cyan-400">Đang cập nhật giá...</span> : null}</div><span className="hidden w-28 shrink-0 text-right text-sm font-medium text-gray-400 lg:block">Đơn giá</span><span className="hidden w-20 shrink-0 text-center text-sm font-medium text-gray-400 lg:block">Số lượng</span><span className="hidden w-28 shrink-0 text-right text-sm font-medium text-gray-400 lg:block">Thành tiền</span><span className="w-8 shrink-0" /></div>
        {error ? <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200"><p>{error}</p><button type="button" onClick={clear} className="mt-3 font-semibold underline">Xóa giỏ combo</button></div> : null}
        {loading && !quote ? <div className="h-40 animate-pulse rounded-xl border border-[#1a1a1e] bg-[#111115]" /> : null}
        {quote ? <><ComboCartRow item={quote.anchor} fixed />{quote.groups.map((group) => <section key={group.groupIndex} className="space-y-3"><h2 className="px-1 pt-3 text-sm font-black uppercase tracking-wide text-gray-400">{group.title}</h2>{group.items.map((item) => <ComboCartRow key={item.productId} item={item} onUpdate={(delta) => update(item.productId, delta)} onRemove={() => remove(item.productId)} />)}</section>)}</> : null}
      </div>
      <aside className="w-full space-y-4 lg:sticky lg:top-6 lg:w-1/3 lg:self-start">
        <div className="rounded-xl border border-[#1a1a1e] bg-gradient-to-r from-[#111115] to-[#16161a] p-4"><div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-lg bg-emerald-500/10 text-xl text-emerald-400">%</div><div><p className="text-sm font-bold text-white">Ưu đãi combo</p><p className="text-[11px] text-gray-500">Giảm giá được áp dụng tự động cho combo</p></div></div>{quote ? <p className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-200">Giảm combo: <strong>-{formatCurrency(quote.totals.comboDiscount)}</strong></p> : null}</div>
        <div className="rounded-xl border border-[#1a1a1e] bg-[#111115] p-5"><h1 className="mb-5 text-[15px] font-bold text-white">Thông tin đơn combo</h1>{quote ? <><div className="mb-5 space-y-4 border-b border-[#1a1a1e] pb-5 text-[13px]"><div className="flex justify-between text-gray-400"><span>Sản phẩm đã chọn</span><b className="text-white">{productCount}</b></div><div className="flex justify-between text-gray-400"><span>Tổng tiền sản phẩm</span><b className="text-white">{formatCurrency(quote.totals.subtotalBeforeDiscount)}</b></div><div className="flex justify-between text-gray-400"><span>Giảm combo</span><b className="text-emerald-400">-{formatCurrency(quote.totals.comboDiscount)}</b></div></div><div className="mb-6 flex items-start justify-between"><span className="mt-1 text-sm font-bold text-white">Cần thanh toán</span><div className="text-right"><strong className="block text-[22px] font-black leading-none text-red-500">{formatCurrency(quote.totals.total)}</strong><span className="text-[10px] text-gray-500">(Đã bao gồm VAT)</span></div></div><Link href="/thanh-toan-combo" className="mb-3 flex w-full items-center justify-center rounded-lg bg-red-600 py-3 font-bold text-white transition hover:bg-red-500">Tiến hành thanh toán</Link><button type="button" onClick={clear} className="w-full rounded-lg border border-red-500/50 py-3 font-bold text-red-400 transition hover:bg-red-500/10">Xóa giỏ combo</button></> : <p className="text-sm text-gray-500">Đang kiểm tra giá combo...</p>}</div>
      </aside>
    </div>}
  </section></main></CommercePageFrame>;
}
