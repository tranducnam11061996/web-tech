"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import ProgressiveImage from "../../components/ProgressiveImage";
import {
  CartItem,
  formatCurrency,
  removeCartItem,
  removeSelectedCartItems,
  setAllActiveCartItemsSelected,
  setCartItemSavedForLater,
  setCartItemSelected,
  updateCartQuantity,
  useCartItems,
} from "@/lib/cart";
import { getAppliedVoucherCode, setAppliedVoucherCode } from "@/lib/voucher";

type QuoteItem = {
  productId: number;
  quantity: number;
  name: string;
  sku: string;
  slug: string;
  thumbnail: string;
  price: number;
  marketPrice: number;
  available: boolean;
  reason: string | null;
  lineTotal: number;
  lineMarketTotal: number;
};

type VoucherQuote = {
  code: string | null;
  status: "none" | "applied" | "invalid";
  message: string | null;
  discount: number;
  note: string | null;
};

type VoucherQuoteResponse = {
  totals: { voucherDiscount: number };
  voucher: VoucherQuote;
};

type DisplayCartItem = CartItem & {
  available: boolean;
  reason: string | null;
  lineTotal: number;
  lineMarketTotal: number;
};

function reasonText(reason: string | null) {
  if (reason === "inactive") return "Sản phẩm đang tạm ẩn";
  if (reason === "invalid_price") return "Sản phẩm chưa có giá bán";
  if (reason === "not_found") return "Sản phẩm không còn tồn tại";
  return "Sản phẩm hiện chưa thể đặt mua";
}

function mergeQuote(item: CartItem, quote?: QuoteItem): DisplayCartItem {
  if (!quote) {
    return {
      ...item,
      available: true,
      reason: null,
      lineTotal: item.price * item.quantity,
      lineMarketTotal: (item.marketPrice > 0 ? item.marketPrice : item.price) * item.quantity,
    };
  }

  return {
    ...item,
    name: quote.name || item.name,
    sku: quote.sku || item.sku,
    slug: quote.slug || item.slug,
    thumbnail: quote.thumbnail || item.thumbnail,
    price: quote.price,
    marketPrice: quote.marketPrice,
    available: quote.available,
    reason: quote.reason,
    lineTotal: quote.lineTotal,
    lineMarketTotal: quote.lineMarketTotal,
  };
}

function CartRow({
  item,
  saved,
}: {
  item: DisplayCartItem;
  saved?: boolean;
}) {
  const href = `/${item.slug.replace(/^\/+/, "")}`;
  const hasMarketPrice = item.available && item.marketPrice > item.price;

  return (
    <div className="bg-[#111115] border border-[#1a1a1e] rounded-xl p-4 flex items-start gap-4">
      {!saved && (
        <input
          type="checkbox"
          checked={item.selected}
          onChange={(event) => setCartItemSelected(item.productId, event.target.checked)}
          className="accent-red-500 cursor-pointer w-5 h-5 mt-4 shrink-0"
        />
      )}

      <Link
        href={href}
        className="w-20 h-20 md:w-24 md:h-24 shrink-0 bg-[#0d0d10] border border-[#1a1a1e] rounded-md flex items-center justify-center overflow-hidden"
      >
        <ProgressiveImage
          src={item.thumbnail || "https://placehold.co/300x300/1f2937/a1a1aa?text=TrucTiepGAME"}
          alt={item.name}
          className="w-full h-full object-contain p-2"
        />
      </Link>

      <div className="flex-1 min-w-0 flex flex-col lg:flex-row gap-4 lg:items-center">
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <Link href={href} className="font-bold text-sm text-white hover:text-cyan-400 transition">
            {item.name}
          </Link>
          <p className="text-[11px] text-gray-500">Mã: {item.sku || item.productId}</p>

          {!item.available && (
            <div className="mt-1 border border-red-500/30 bg-red-500/5 rounded-md p-2 text-[11px] text-red-300">
              {reasonText(item.reason)}
            </div>
          )}

          <div className="mt-2 flex flex-wrap gap-2">
            {saved ? (
              <button
                onClick={() => setCartItemSavedForLater(item.productId, false)}
                className="text-[11px] font-medium border border-emerald-700 bg-emerald-900/20 text-emerald-300 hover:text-white px-2.5 py-1 rounded-full transition flex items-center gap-1 w-fit"
              >
                Chuyển vào giỏ
              </button>
            ) : (
              <button
                onClick={() => setCartItemSavedForLater(item.productId, true)}
                className="text-[11px] font-medium border border-[#27272a] bg-[#1a1a1e] text-gray-300 hover:text-white px-2.5 py-1 rounded-full transition flex items-center gap-1 w-fit"
              >
                <span className="text-red-500 font-bold">+</span> Mua sau
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 lg:w-[auto]">
          <div className="w-24 md:w-28 text-left lg:text-right shrink-0">
            <p className="text-red-500 font-bold text-[13px] md:text-sm">
              {item.available ? formatCurrency(item.price) : "Liên hệ"}
            </p>
            {hasMarketPrice && (
              <p className="text-gray-500 line-through text-[11px]">
                {formatCurrency(item.marketPrice)}
              </p>
            )}
          </div>

          <div className="w-20 md:w-24 shrink-0 flex items-center justify-start lg:justify-center">
            <div className="flex border border-[#27272a] rounded overflow-hidden h-7 md:h-8 w-full max-w-[80px]">
              <button
                onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                className="w-6 md:w-8 flex items-center justify-center bg-[#0d0d10] hover:bg-[#1a1a1e] text-gray-400"
              >
                -
              </button>
              <input
                type="text"
                value={item.quantity}
                onChange={(event) => updateCartQuantity(item.productId, Number(event.target.value))}
                className="w-full text-center bg-transparent text-xs text-white font-medium border-x border-[#27272a] outline-none"
              />
              <button
                onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                className="w-6 md:w-8 flex items-center justify-center bg-[#0d0d10] hover:bg-[#1a1a1e] text-gray-400"
              >
                +
              </button>
            </div>
          </div>

          <div className="w-24 md:w-28 text-right hidden lg:block shrink-0">
            <p className="text-red-500 font-bold text-sm">
              {item.available ? formatCurrency(item.lineTotal) : "0đ"}
            </p>
          </div>
        </div>
      </div>

      <div className="w-10 flex justify-end shrink-0 mt-2 lg:mt-6">
        <button
          onClick={() => removeCartItem(item.productId)}
          className="w-8 h-8 rounded-md bg-[#1a1a1e] hover:bg-red-500/20 hover:text-red-500 text-gray-400 flex items-center justify-center transition"
          title="Xóa sản phẩm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function CartClient() {
  const router = useRouter();
  const cartItems = useCartItems();
  const [quoteMap, setQuoteMap] = useState<Record<number, QuoteItem>>({});
  const [isQuoting, setIsQuoting] = useState(false);
  const [message, setMessage] = useState("");
  const [voucherInput, setVoucherInput] = useState(() => getAppliedVoucherCode());
  const [appliedVoucherCode, setAppliedVoucherCodeState] = useState(() => getAppliedVoucherCode());
  const [voucherQuote, setVoucherQuote] = useState<VoucherQuoteResponse | null>(null);
  const [isVoucherQuoting, setIsVoucherQuoting] = useState(false);

  const quoteRequestItems = useMemo(
    () => cartItems.map((item) => ({ productId: item.productId, quantity: item.quantity })),
    [cartItems],
  );

  const quoteKey = useMemo(
    () => quoteRequestItems.map((item) => `${item.productId}:${item.quantity}`).join("|"),
    [quoteRequestItems],
  );

  useEffect(() => {
    if (quoteRequestItems.length === 0) {
      setQuoteMap({});
      setIsQuoting(false);
      return;
    }

    const controller = new AbortController();
    setIsQuoting(true);

    fetch("/api/cart/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: quoteRequestItems }),
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((json) => {
        if (!json.success) return;
        const nextQuoteMap: Record<number, QuoteItem> = {};
        for (const item of json.data.items as QuoteItem[]) {
          nextQuoteMap[item.productId] = item;
        }
        setQuoteMap(nextQuoteMap);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setMessage("Chưa thể cập nhật giá mới nhất. Vui lòng thử lại.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsQuoting(false);
      });

    return () => controller.abort();
  }, [quoteKey, quoteRequestItems]);

  const voucherRequestItems = useMemo(
    () => cartItems
      .filter((item) => item.selected && !item.savedForLater)
      .map((item) => ({ productId: item.productId, quantity: item.quantity })),
    [cartItems],
  );
  const voucherQuoteKey = useMemo(
    () => `${appliedVoucherCode}|${voucherRequestItems.map((item) => `${item.productId}:${item.quantity}`).join('|')}`,
    [appliedVoucherCode, voucherRequestItems],
  );

  useEffect(() => {
    if (!appliedVoucherCode || voucherRequestItems.length === 0) {
      setVoucherQuote(null);
      setIsVoucherQuoting(false);
      return;
    }
    const controller = new AbortController();
    setIsVoucherQuoting(true);
    fetch('/api/cart/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: voucherRequestItems, voucherCode: appliedVoucherCode }),
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((json) => { if (json.success) setVoucherQuote(json.data as VoucherQuoteResponse); })
      .catch((error) => { if (error.name !== 'AbortError') setMessage('Không thể kiểm tra voucher. Vui lòng thử lại.'); })
      .finally(() => { if (!controller.signal.aborted) setIsVoucherQuoting(false); });
    return () => controller.abort();
  }, [voucherQuoteKey, voucherRequestItems]);

  const activeItems = useMemo(
    () => cartItems.filter((item) => !item.savedForLater).map((item) => mergeQuote(item, quoteMap[item.productId])),
    [cartItems, quoteMap],
  );

  const savedItems = useMemo(
    () => cartItems.filter((item) => item.savedForLater).map((item) => mergeQuote(item, quoteMap[item.productId])),
    [cartItems, quoteMap],
  );

  const selectedAvailableItems = activeItems.filter((item) => item.selected && item.available);
  const selectedItemCount = selectedAvailableItems.reduce((total, item) => total + item.quantity, 0);
  const subtotal = selectedAvailableItems.reduce((total, item) => total + item.lineTotal, 0);
  const marketSubtotal = selectedAvailableItems.reduce((total, item) => total + item.lineMarketTotal, 0);
  const savings = Math.max(0, marketSubtotal - subtotal);
  const voucherDiscount = voucherQuote?.voucher.status === 'applied' ? Number(voucherQuote.totals.voucherDiscount || 0) : 0;
  const totalAfterVoucher = Math.max(0, subtotal - voucherDiscount);
  const allSelected = activeItems.length > 0 && activeItems.every((item) => item.selected);
  const selectedCount = activeItems.filter((item) => item.selected).length;

  const handleCheckout = () => {
    if (selectedAvailableItems.length === 0) {
      setMessage("Vui lòng chọn ít nhất một sản phẩm hợp lệ để đặt hàng.");
      return;
    }
    router.push("/thanh-toan");
  };

  const applyVoucher = () => {
    const code = voucherInput.trim().toUpperCase();
    setAppliedVoucherCodeState(code);
    setAppliedVoucherCode(code);
  };

  const clearVoucher = () => {
    setVoucherInput('');
    setAppliedVoucherCodeState('');
    setAppliedVoucherCode('');
    setVoucherQuote(null);
  };

  return (
    <div className="bg-[#0a0a0c] min-h-screen text-white font-sans">
      <Header />
      <section className="max-w-[1400px] mx-auto px-4 md:px-6 py-12">
        {cartItems.length === 0 ? (
          <div className="bg-[#111115] border border-[#1a1a1e] rounded-2xl p-10 text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center text-2xl">
              🛒
            </div>
            <h1 className="text-xl font-black mb-2">Giỏ hàng đang trống</h1>
            <p className="text-sm text-gray-500 mb-6">Hãy chọn thêm sản phẩm để tiếp tục đặt hàng.</p>
            <Link href="/" className="inline-flex px-6 py-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold transition">
              Tiếp tục mua sắm
            </Link>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            <div className="lg:w-2/3 flex flex-col gap-4">
              <div className="bg-[#111115] border border-[#1a1a1e] rounded-xl p-4 flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(event) => setAllActiveCartItemsSelected(event.target.checked)}
                  className="accent-red-500 cursor-pointer w-5 h-5 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-sm text-white">
                    Tất cả ({selectedCount}/{activeItems.length}) sản phẩm
                  </span>
                  {isQuoting && <span className="ml-3 text-[11px] text-cyan-400">Đang cập nhật giá...</span>}
                </div>
                <div className="w-28 text-right hidden lg:block text-sm text-gray-400 font-medium shrink-0">Đơn giá</div>
                <div className="w-24 text-center hidden lg:block text-sm text-gray-400 font-medium shrink-0">Số lượng</div>
                <div className="w-28 text-right hidden lg:block text-sm text-gray-400 font-medium shrink-0">Thành tiền</div>
                <div className="w-10 flex justify-end shrink-0">
                  <button
                    onClick={removeSelectedCartItems}
                    disabled={selectedCount === 0}
                    className="w-8 h-8 rounded-md bg-[#1a1a1e] hover:bg-red-500/20 hover:text-red-500 text-gray-400 flex items-center justify-center transition disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Xóa sản phẩm đã chọn"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {message && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-xl p-3 text-sm">
                  {message}
                </div>
              )}

              {activeItems.length > 0 ? (
                activeItems.map((item) => <CartRow key={item.productId} item={item} />)
              ) : (
                <div className="bg-[#111115] border border-[#1a1a1e] rounded-xl p-8 text-center text-gray-400">
                  Tất cả sản phẩm hiện đang nằm trong danh sách mua sau.
                </div>
              )}

              {savedItems.length > 0 && (
                <div className="mt-4 space-y-4">
                  <h2 className="text-sm font-black uppercase tracking-wider text-gray-400">Mua sau ({savedItems.length})</h2>
                  {savedItems.map((item) => (
                    <CartRow key={item.productId} item={item} saved />
                  ))}
                </div>
              )}
            </div>

            <div className="lg:w-1/3 lg:sticky lg:top-6 lg:self-start space-y-4">
              <div className="bg-[#111115] border border-[#1a1a1e] rounded-xl p-4 bg-gradient-to-r from-[#111115] to-[#16161a]">
                <div className="flex items-center gap-3"><div className="w-10 h-10 bg-red-500/10 text-red-500 rounded-lg flex items-center justify-center text-xl">%</div><div><p className="font-bold text-sm text-white">Voucher giảm giá</p><p className="text-[11px] text-gray-500">Áp dụng cho sản phẩm đang chọn</p></div></div>
                <div className="mt-3 flex gap-2"><input value={voucherInput} onChange={(event) => setVoucherInput(event.target.value.toUpperCase())} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); applyVoucher(); } }} placeholder="Nhập mã voucher" className="min-w-0 flex-1 rounded-lg border border-[#303036] bg-[#0d0d10] px-3 py-2 text-sm font-mono text-white outline-none focus:border-red-500" /><button onClick={applyVoucher} disabled={!voucherInput.trim() || isVoucherQuoting} className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white hover:bg-red-500 disabled:opacity-50">{isVoucherQuoting ? 'Đang kiểm tra' : 'Áp dụng'}</button></div>
                {appliedVoucherCode && <div className={`mt-3 rounded-lg border p-3 text-xs ${voucherQuote?.voucher.status === 'applied' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-red-500/30 bg-red-500/10 text-red-200'}`}><div className="flex items-start justify-between gap-3"><span>{voucherQuote?.voucher.message || 'Đang kiểm tra voucher...'}</span><button onClick={clearVoucher} className="shrink-0 underline">Bỏ mã</button></div>{voucherQuote?.voucher.status === 'applied' && voucherQuote.voucher.note && <p className="mt-1 text-emerald-300">{voucherQuote.voucher.note}</p>}</div>}
              </div>

              <div className="bg-[#111115] border border-[#1a1a1e] rounded-xl p-5">
                <h3 className="font-bold text-[15px] text-white mb-5">Thông tin đơn hàng</h3>

                <div className="space-y-4 text-[13px] border-b border-[#1a1a1e] pb-5 mb-5">
                  <div className="flex justify-between text-gray-400">
                    <span>Sản phẩm đã chọn</span>
                    <span className="font-bold text-white">{selectedItemCount}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Tổng tiền sản phẩm</span>
                    <span className="font-bold text-white">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Tiết kiệm theo giá niêm yết</span>
                    <span className="font-bold text-red-500">-{formatCurrency(savings)}</span>
                  </div>
                  {voucherDiscount > 0 && <div className="flex justify-between text-gray-400"><span>Giảm giá voucher</span><span className="font-bold text-emerald-400">-{formatCurrency(voucherDiscount)}</span></div>}
                </div>

                <div className="flex justify-between items-start mb-6">
                  <span className="font-bold text-white text-sm mt-1">Cần thanh toán</span>
                  <div className="text-right">
                    <span className="font-black text-[22px] text-red-500 leading-none block mb-1">
                      {formatCurrency(totalAfterVoucher)}
                    </span>
                    <span className="text-[10px] text-gray-500">(Đã bao gồm VAT)</span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={selectedAvailableItems.length === 0}
                  className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg transition mb-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Tiến hành đặt hàng
                </button>
                <button className="w-full bg-transparent border border-red-500/50 text-red-500/60 font-bold py-3 rounded-lg flex items-center justify-center gap-2 cursor-not-allowed">
                  Mua trả góp
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
      <Footer />
    </div>
  );
}
