"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import ProgressiveImage from "../../components/ProgressiveImage";
import {
  CartItem,
  formatCurrency,
  removePurchasedCartItems,
  useCartItems,
} from "@/lib/cart";
import { getAppliedVoucherCode, setAppliedVoucherCode } from "@/lib/voucher";
import {
  customerFetch,
  type CustomerAddress,
  useCustomerSession,
} from "@/lib/customer";
import { FieldError } from "@/components/forms/FieldError";
import { mapCheckoutServerFields, validateCheckoutForm } from "@/lib/checkoutValidation";
import { apiErrorSummary, parseStorefrontResponse, StorefrontApiError } from "@/lib/storefrontApi";
import { focusFirstInvalidField, type FieldErrors } from "@/lib/storefrontValidation";

const VietnamLocationSelector = dynamic(
  () => import("@/components/location/VietnamLocationSelector").then((module) => module.VietnamLocationSelector),
  { loading: () => <div className="h-24 animate-pulse rounded-lg bg-[#111115]" aria-hidden="true" /> },
);

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

type CheckoutItem = CartItem & QuoteItem;

type VoucherQuote = {
  code: string | null;
  status: "none" | "applied" | "invalid";
  message: string | null;
  discount: number;
  note: string | null;
};
type QuoteTotals = { voucherDiscount: number; total: number };

type CheckoutForm = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  receiverEnabled: boolean;
  receiverName: string;
  receiverPhone: string;
  deliveryMethod: "shipping" | "pickup";
  provinceCode: string;
  province: string;
  wardCode: string;
  ward: string;
  address: string;
  note: string;
  invoiceEnabled: boolean;
  companyName: string;
  taxCode: string;
  invoiceAddress: string;
  invoiceEmail: string;
  paymentMethod: "cod" | "bank_transfer";
};

const initialForm: CheckoutForm = {
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  receiverEnabled: false,
  receiverName: "",
  receiverPhone: "",
  deliveryMethod: "shipping",
  provinceCode: "",
  province: "",
  wardCode: "",
  ward: "",
  address: "",
  note: "",
  invoiceEnabled: false,
  companyName: "",
  taxCode: "",
  invoiceAddress: "",
  invoiceEmail: "",
  paymentMethod: "bank_transfer",
};

function mergeQuote(item: CartItem, quote?: QuoteItem): CheckoutItem {
  return {
    ...item,
    productId: item.productId,
    quantity: item.quantity,
    name: quote?.name || item.name,
    sku: quote?.sku || item.sku,
    slug: quote?.slug || item.slug,
    thumbnail: quote?.thumbnail || item.thumbnail,
    price: quote?.price ?? item.price,
    marketPrice: quote?.marketPrice ?? item.marketPrice,
    available: quote?.available ?? true,
    reason: quote?.reason ?? null,
    lineTotal: quote?.lineTotal ?? item.price * item.quantity,
    lineMarketTotal:
      quote?.lineMarketTotal ??
      (item.marketPrice || item.price) * item.quantity,
  };
}

function CheckoutProductRow({ item }: { item: CheckoutItem }) {
  const href = `/${item.slug.replace(/^\/+/, "")}`;
  const hasMarketPrice = item.available && item.marketPrice > item.price;

  return (
    <div className="flex items-center gap-4 p-4 border-b border-[#1a1a1e] last:border-b-0">
      <Link
        href={href}
        className="w-14 h-14 shrink-0 bg-[#0d0d10] border border-[#1a1a1e] rounded-md flex items-center justify-center overflow-hidden"
      >
        <ProgressiveImage
          src={
            item.thumbnail ||
            "https://placehold.co/300x300/1f2937/a1a1aa?text=TrucTiepGAME"
          }
          alt={item.name}
          className="w-full h-full object-contain p-2"
        />
      </Link>
      <div className="flex-1 min-w-0">
        <Link
          href={href}
          className="text-sm font-medium text-white line-clamp-2 hover:text-cyan-400 transition"
        >
          {item.name}
        </Link>
        <p className="text-[11px] text-gray-500">
          [{item.sku || item.productId}]
        </p>
        {!item.available && (
          <p className="text-[11px] text-red-400 mt-1">
            Sản phẩm hiện chưa thể đặt mua
          </p>
        )}
      </div>
      <div className="text-center shrink-0 w-8">
        <p className="text-sm text-gray-400">x{item.quantity}</p>
      </div>
      <div className="text-right shrink-0 w-28">
        <p className="text-red-500 font-bold text-sm">
          {item.available ? formatCurrency(item.price) : "Liên hệ"}
        </p>
        {hasMarketPrice && (
          <p className="text-gray-500 line-through text-[11px]">
            {formatCurrency(item.marketPrice)}
          </p>
        )}
      </div>
    </div>
  );
}

export default function CheckoutClient() {
  const cartItems = useCartItems();
  const { user } = useCustomerSession();
  const selectedCartItems = useMemo(
    () => cartItems.filter((item) => item.selected && !item.savedForLater),
    [cartItems],
  );

  const [quoteMap, setQuoteMap] = useState<Record<number, QuoteItem>>({});
  const [quoteTotals, setQuoteTotals] = useState<QuoteTotals>({
    voucherDiscount: 0,
    total: 0,
  });
  const [voucher, setVoucher] = useState<VoucherQuote | null>(null);
  const [voucherCode] = useState(() => getAppliedVoucherCode());
  const [isQuoting, setIsQuoting] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const [quoteRetry, setQuoteRetry] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<CheckoutForm>(initialForm);
  const [error, setError] = useState("");
  const [deliveryError, setDeliveryError] = useState("");
  const [success, setSuccess] = useState<{
    orderId: number;
    total: number;
  } | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | "">("");
  const accountPrefilled = useRef(false);
  const orderIdempotencyKey = useRef<string | null>(null);
  const quoteRequestId = useRef(0);
  const [website, setWebsite] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const checkoutFormRef = useRef<HTMLFormElement>(null);
  const clientErrors = useMemo(() => validateCheckoutForm(form), [form]);
  const visibleError = (field: string) => fieldErrors[field] || (touched[field] ? clientErrors[field] : "");
  const touchField = (field: string) => setTouched((current) => ({ ...current, [field]: true }));

  useEffect(() => {
    if (!user || accountPrefilled.current) return;
    accountPrefilled.current = true;
    setForm((current) => ({
      ...current,
      customerName: current.customerName || user.name,
      customerPhone: current.customerPhone || user.phone,
      customerEmail: current.customerEmail || user.email,
      receiverName:
        current.receiverName || user.defaultAddress?.recipientName || "",
      receiverPhone: current.receiverPhone || user.defaultAddress?.phone || "",
      provinceCode:
        current.provinceCode || user.defaultAddress?.provinceCode || "",
      province: current.province || user.defaultAddress?.provinceName || "",
      wardCode: current.wardCode || user.defaultAddress?.wardCode || "",
      ward:
        current.ward ||
        [user.defaultAddress?.wardName, user.defaultAddress?.districtName]
          .filter(Boolean)
          .join(", "),
      address: current.address || user.defaultAddress?.address || "",
    }));
    if (user.defaultAddress) setSelectedAddressId(user.defaultAddress.id);
    void customerFetch("/api/customer/addresses")
      .then((data) => setSavedAddresses(data.items || []))
      .catch(() => setSavedAddresses([]));
  }, [user]);

  const quoteRequestItems = useMemo(
    () =>
      selectedCartItems.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    [selectedCartItems],
  );

  const quoteKey = useMemo(
    () =>
      quoteRequestItems
        .map((item) => `${item.productId}:${item.quantity}`)
        .join("|"),
    [quoteRequestItems],
  );

  useEffect(() => {
    if (quoteRequestItems.length === 0) {
      setQuoteMap({});
      setQuoteTotals({ voucherDiscount: 0, total: 0 });
      setVoucher(null);
      setIsQuoting(false);
      setQuoteError("");
      return;
    }

    const controller = new AbortController();
    const requestId = ++quoteRequestId.current;
    setIsQuoting(true);
    setQuoteError("");

    const timer = window.setTimeout(() => fetch("/api/cart/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: quoteRequestItems, voucherCode }),
      signal: controller.signal,
    })
      .then((response) => parseStorefrontResponse<{ items: QuoteItem[]; totals?: QuoteTotals; voucher?: VoucherQuote | null }>(response))
      .then((data) => {
        if (requestId !== quoteRequestId.current) return;
        const nextQuoteMap: Record<number, QuoteItem> = {};
        for (const item of data.items) {
          nextQuoteMap[item.productId] = item;
        }
        setQuoteMap(nextQuoteMap);
        setQuoteTotals(data.totals || { voucherDiscount: 0, total: 0 });
        setVoucher(data.voucher || null);
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") {
          setQuoteError(apiErrorSummary(requestError));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsQuoting(false);
      }), 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [quoteKey, quoteRequestItems, voucherCode, quoteRetry]);

  const checkoutItems = useMemo(
    () =>
      selectedCartItems.map((item) =>
        mergeQuote(item, quoteMap[item.productId]),
      ),
    [selectedCartItems, quoteMap],
  );

  const invalidItems = checkoutItems.filter((item) => !item.available);
  const availableItems = checkoutItems.filter((item) => item.available);
  const subtotal = availableItems.reduce(
    (total, item) => total + item.lineTotal,
    0,
  );
  const marketSubtotal = availableItems.reduce(
    (total, item) => total + item.lineMarketTotal,
    0,
  );
  const savings = Math.max(0, marketSubtotal - subtotal);
  const voucherDiscount =
    voucher?.status === "applied"
      ? Number(quoteTotals.voucherDiscount || 0)
      : 0;
  const totalAfterVoucher = Math.max(0, subtotal - voucherDiscount);
  const itemCount = availableItems.reduce(
    (total, item) => total + item.quantity,
    0,
  );
  const canSubmit =
    availableItems.length > 0 &&
    invalidItems.length === 0 &&
    !isSubmitting &&
    !isQuoting &&
    !quoteError &&
    (!voucherCode || voucher?.status === "applied");

  const updateForm = <K extends keyof CheckoutForm>(
    key: K,
    value: CheckoutForm[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const applySavedAddress = (address: CustomerAddress) => {
    setSelectedAddressId(address.id);
    setDeliveryError("");
    setForm((current) => ({
      ...current,
      receiverName: address.recipientName,
      receiverPhone: address.phone,
      provinceCode: address.provinceCode || "",
      province: address.provinceName,
      wardCode: address.wardCode || "",
      ward: [address.wardName, address.districtName].filter(Boolean).join(", "),
      address: address.address,
    }));
  };

  const selectedSavedAddress = useMemo(
    () =>
      savedAddresses.find((address) => address.id === selectedAddressId) ||
      null,
    [savedAddresses, selectedAddressId],
  );

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setDeliveryError("");
    setFieldErrors({});
    setTouched(Object.fromEntries(Object.keys(clientErrors).map((field) => [field, true])));
    if (Object.keys(clientErrors).length) {
      setError("Vui lòng sửa các trường được đánh dấu trước khi đặt hàng.");
      setDeliveryError(clientErrors.provinceCode || clientErrors.wardCode || "");
      window.setTimeout(() => focusFirstInvalidField(checkoutFormRef.current, clientErrors));
      return;
    }

    if (!canSubmit) {
      setError("Giỏ hàng chưa có sản phẩm hợp lệ để đặt hàng.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { getCustomerRecaptchaToken } = await import("@/lib/customerRecaptcha");
      const recaptchaToken = await getCustomerRecaptchaToken("order_submit");
      orderIdempotencyKey.current ||= crypto.randomUUID();
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": orderIdempotencyKey.current },
        body: JSON.stringify({
          recaptchaToken,
          website,
          items: availableItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          customer: {
            name: form.customerName.trim(),
            phone: form.customerPhone.trim(),
            email: form.customerEmail.trim(),
          },
          receiver: {
            enabled: form.receiverEnabled,
            name: form.receiverName.trim(),
            phone: form.receiverPhone.trim(),
          },
          delivery: {
            method: form.deliveryMethod,
            provinceCode: form.provinceCode,
            province: form.province.trim(),
            wardCode: form.wardCode,
            ward: form.ward.trim(),
            address: form.address.trim(),
            note: form.note.trim(),
          },
          paymentMethod: form.paymentMethod,
          voucherCode,
          invoice: {
            enabled: form.invoiceEnabled,
            companyName: form.companyName.trim(),
            taxCode: form.taxCode.trim(),
            address: form.invoiceAddress.trim(),
            email: form.invoiceEmail.trim(),
          },
        }),
      });

      const data = await parseStorefrontResponse<{ orderId: number; total: number }>(response);

      removePurchasedCartItems(availableItems.map((item) => item.productId));
      setAppliedVoucherCode("");
      setSuccess({ orderId: data.orderId, total: data.total });
    } catch (submitError) {
      if (submitError instanceof StorefrontApiError) {
        if (submitError.status >= 400 && submitError.status < 500 && submitError.code !== "ORDER_PROCESSING") orderIdempotencyKey.current = null;
        const mapped = mapCheckoutServerFields(submitError.fields);
        setFieldErrors(mapped);
        setTouched((current) => ({ ...current, ...Object.fromEntries(Object.keys(mapped).map((field) => [field, true])) }));
        setDeliveryError(mapped.provinceCode || mapped.wardCode || "");
        window.setTimeout(() => focusFirstInvalidField(checkoutFormRef.current, mapped));
      }
      setError(apiErrorSummary(submitError));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-[#0a0a0c] min-h-screen text-white font-sans">
        <section className="max-w-[900px] mx-auto px-4 md:px-6 py-16">
          <div className="bg-[#111115] border border-emerald-500/30 rounded-2xl p-10 text-center">
            <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center text-2xl">
              ✓
            </div>
            <h1 className="text-2xl font-black mb-2">Đặt hàng thành công</h1>
            <p className="text-gray-400 mb-6">
              Mã đơn hàng của bạn là{" "}
              <span className="font-bold text-white">#{success.orderId}</span>,
              tổng giá trị {formatCurrency(success.total)}.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/"
                className="px-6 py-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold transition"
              >
                Tiếp tục mua sắm
              </Link>
              <Link
                href="/gio-hang"
                className="px-6 py-3 rounded-lg bg-[#1a1a1e] hover:bg-[#27272a] border border-[#27272a] text-white font-bold transition"
              >
                Xem giỏ hàng
              </Link>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="bg-[#0a0a0c] min-h-screen text-white font-sans">
      <form ref={checkoutFormRef} onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
        <div className="sr-only" aria-hidden="true">
          <label htmlFor="checkout-website">Website</label>
          <input id="checkout-website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
        </div>
        <section
          data-checkout-page
          className="mx-auto w-full min-w-0 max-w-[1400px] px-4 py-8 md:px-6"
        >
          <Link
            href="/gio-hang"
            className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-400 text-sm font-medium mb-6 transition"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Quay lại giỏ hàng
          </Link>

          {selectedCartItems.length === 0 ? (
            <div className="bg-[#111115] border border-[#1a1a1e] rounded-2xl p-10 text-center">
              <h1 className="text-xl font-black mb-2">
                Chưa có sản phẩm được chọn
              </h1>
              <p className="text-sm text-gray-500 mb-6">
                Hãy quay lại giỏ hàng và chọn sản phẩm cần đặt.
              </p>
              <Link
                href="/gio-hang"
                className="inline-flex px-6 py-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold transition"
              >
                Quay lại giỏ hàng
              </Link>
            </div>
          ) : (
            <div
              data-checkout-layout
              className="flex w-full min-w-0 flex-col items-stretch gap-6 lg:flex-row lg:items-start"
            >
              <div data-checkout-details className="w-full min-w-0 space-y-6 lg:w-2/3">
                <div className="bg-[#111115] border border-[#1a1a1e] rounded-[12px]">
                  <div className="p-5 border-b border-[#1a1a1e]">
                    <h3 className="font-bold text-[15px] text-white">
                      Sản phẩm trong đơn ({itemCount})
                      {isQuoting && (
                        <span className="ml-3 text-[11px] text-cyan-400">
                          Đang cập nhật giá...
                        </span>
                      )}
                    </h3>
                  </div>
                  {checkoutItems.map((item) => (
                    <CheckoutProductRow key={item.productId} item={item} />
                  ))}
                </div>

                <div className="bg-[#111115] border border-[#1a1a1e] rounded-[12px] p-5 space-y-5">
                  <h3 className="font-bold text-[15px] text-white">
                    Thông tin người đặt hàng
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><input
                      name="customerName"
                      aria-label="Họ và tên người đặt hàng"
                      required
                      maxLength={150}
                      autoComplete="name"
                      value={form.customerName}
                      onChange={(e) =>
                        updateForm("customerName", e.target.value)
                      }
                      onBlur={() => touchField("customerName")}
                      aria-invalid={Boolean(visibleError("customerName")) || undefined}
                      aria-describedby={visibleError("customerName") ? "checkout-customer-name-error" : undefined}
                      type="text"
                      placeholder="Họ và tên"
                      className="bg-[#0d0d10] border border-[#27272a] rounded-lg px-[14px] py-[10px] text-white text-[13px] outline-none w-full transition-colors duration-200 focus:border-blue-500 placeholder-[#555]"
                    /><FieldError id="checkout-customer-name-error" message={visibleError("customerName")} /></div>
                    <div><input
                      name="customerPhone"
                      aria-label="Số điện thoại người đặt hàng"
                      required
                      type="tel"
                      inputMode="tel"
                      maxLength={20}
                      autoComplete="tel"
                      value={form.customerPhone}
                      onChange={(e) =>
                        updateForm("customerPhone", e.target.value)
                      }
                      onBlur={() => touchField("customerPhone")}
                      aria-invalid={Boolean(visibleError("customerPhone")) || undefined}
                      aria-describedby={visibleError("customerPhone") ? "checkout-customer-phone-error" : undefined}
                      placeholder="Số điện thoại"
                      className="bg-[#0d0d10] border border-[#27272a] rounded-lg px-[14px] py-[10px] text-white text-[13px] outline-none w-full transition-colors duration-200 focus:border-blue-500 placeholder-[#555]"
                    /><FieldError id="checkout-customer-phone-error" message={visibleError("customerPhone")} /></div>
                    <div><input
                      name="customerEmail"
                      aria-label="Email người đặt hàng"
                      maxLength={255}
                      autoComplete="email"
                      value={form.customerEmail}
                      onChange={(e) =>
                        updateForm("customerEmail", e.target.value)
                      }
                      onBlur={() => touchField("customerEmail")}
                      aria-invalid={Boolean(visibleError("customerEmail")) || undefined}
                      aria-describedby={visibleError("customerEmail") ? "checkout-customer-email-error" : undefined}
                      type="email"
                      placeholder="Email (Không bắt buộc)"
                      className="bg-[#0d0d10] border border-[#27272a] rounded-lg px-[14px] py-[10px] text-white text-[13px] outline-none w-full transition-colors duration-200 focus:border-blue-500 placeholder-[#555]"
                    /><FieldError id="checkout-customer-email-error" message={visibleError("customerEmail")} /></div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      checked={form.receiverEnabled}
                      onChange={(e) => { updateForm("receiverEnabled", e.target.checked); if (!e.target.checked) setFieldErrors((current) => { const next = { ...current }; delete next.receiverName; delete next.receiverPhone; return next; }); }}
                      type="checkbox"
                      className="w-4 h-4 accent-blue-500 cursor-pointer"
                    />
                    <span className="text-sm text-gray-300">
                      Nhờ người khác nhận hàng
                    </span>
                  </label>
                  {form.receiverEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><input
                        name="receiverName"
                        aria-label="Họ và tên người nhận"
                        maxLength={150}
                        autoComplete="name"
                        value={form.receiverName}
                        onChange={(e) =>
                          updateForm("receiverName", e.target.value)
                        }
                        onBlur={() => touchField("receiverName")}
                        aria-invalid={Boolean(visibleError("receiverName")) || undefined}
                        aria-describedby={visibleError("receiverName") ? "checkout-receiver-name-error" : undefined}
                        type="text"
                        placeholder="Họ và tên người nhận"
                        className="bg-[#0d0d10] border border-[#27272a] rounded-lg px-[14px] py-[10px] text-white text-[13px] outline-none w-full transition-colors duration-200 focus:border-blue-500 placeholder-[#555]"
                      /><FieldError id="checkout-receiver-name-error" message={visibleError("receiverName")} /></div>
                      <div><input
                        name="receiverPhone"
                        aria-label="Số điện thoại người nhận"
                        type="tel"
                        inputMode="tel"
                        maxLength={20}
                        autoComplete="tel"
                        value={form.receiverPhone}
                        onChange={(e) =>
                          updateForm("receiverPhone", e.target.value)
                        }
                        onBlur={() => touchField("receiverPhone")}
                        aria-invalid={Boolean(visibleError("receiverPhone")) || undefined}
                        aria-describedby={visibleError("receiverPhone") ? "checkout-receiver-phone-error" : undefined}
                        placeholder="Số điện thoại người nhận"
                        className="bg-[#0d0d10] border border-[#27272a] rounded-lg px-[14px] py-[10px] text-white text-[13px] outline-none w-full transition-colors duration-200 focus:border-blue-500 placeholder-[#555]"
                      /><FieldError id="checkout-receiver-phone-error" message={visibleError("receiverPhone")} /></div>
                    </div>
                  )}
                </div>

                <div className="bg-[#111115] border border-[#1a1a1e] rounded-[12px] p-5 space-y-5">
                  <h3 className="font-bold text-[15px] text-white">
                    Địa chỉ nhận hàng
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all ${form.deliveryMethod === "shipping" ? "border-blue-500/50 bg-blue-500/5" : "border-[#27272a] hover:border-blue-500/30"}`}
                    >
                      <input
                        checked={form.deliveryMethod === "shipping"}
                        onChange={() => {
                          setDeliveryError("");
                          updateForm("deliveryMethod", "shipping");
                        }}
                        type="radio"
                        name="delivery"
                        className="w-4 h-4 accent-blue-500 cursor-pointer"
                      />
                      <span className="text-sm font-medium text-white flex items-center gap-2">
                        Giao hàng tận nơi
                      </span>
                    </label>
                    <label
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all ${form.deliveryMethod === "pickup" ? "border-blue-500/50 bg-blue-500/5" : "border-[#27272a] hover:border-blue-500/30"}`}
                    >
                      <input
                        checked={form.deliveryMethod === "pickup"}
                        onChange={() => {
                          setDeliveryError("");
                          updateForm("deliveryMethod", "pickup");
                        }}
                        type="radio"
                        name="delivery"
                        className="w-4 h-4 accent-blue-500 cursor-pointer"
                      />
                      <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
                        Nhận tại cửa hàng
                      </span>
                    </label>
                  </div>
                </div>

                <div className="bg-[#111115] border border-[#1a1a1e] rounded-[12px] p-5 space-y-5">
                  <h3 className="font-bold text-[15px] text-white">
                    Địa chỉ giao hàng
                  </h3>
                  {user ? (
                    <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="text-xs font-semibold text-cyan-100">
                          Địa chỉ đã lưu
                          <select
                            value={selectedAddressId}
                            onChange={(event) => {
                              const nextId = Number(event.target.value) || "";
                              setSelectedAddressId(nextId);
                              setDeliveryError("");
                              const address = savedAddresses.find(
                                (item) => item.id === nextId,
                              );
                              if (!address) return;
                              applySavedAddress(address);
                            }}
                            className="mt-1 block min-w-[240px] rounded border border-[#30303a] bg-[#0c0c11] px-2 py-2 text-sm text-white outline-none focus:border-cyan-400"
                          >
                            <option value="">Nhập địa chỉ khác</option>
                            {savedAddresses.map((address) => (
                              <option key={address.id} value={address.id}>
                                {address.isDefault ? "Mặc định — " : ""}
                                {address.address}, {address.provinceName}
                              </option>
                            ))}
                          </select>
                        </label>
                        <Link
                          href="/tai-khoan/so-dia-chi"
                          className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                        >
                          Quản lý địa chỉ
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <p className="rounded-lg border border-[#30303a] bg-[#0c0c11] p-3 text-xs text-slate-400">
                      <Link
                        href="/tai-khoan/dang-nhap"
                        className="font-semibold text-cyan-300 hover:text-cyan-200"
                      >
                        Đăng nhập
                      </Link>{" "}
                      để tự điền và chọn địa chỉ đã lưu.
                    </p>
                  )}
                  {selectedSavedAddress?.locationSchemaVersion ===
                  "legacy_3tier" ? (
                    <p
                      className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100"
                      role="status"
                    >
                      Địa chỉ đã lưu này theo địa giới cũ. Vui lòng chọn lại
                      tỉnh/thành phố và phường/xã hiện hành.
                    </p>
                  ) : null}
                  <VietnamLocationSelector
                    idPrefix="checkout-delivery"
                    value={{
                      provinceCode: form.provinceCode,
                      provinceName: form.province,
                      wardCode: form.wardCode,
                      wardName: form.ward,
                    }}
                    error={deliveryError || undefined}
                    required={form.deliveryMethod === "shipping"}
                    triggerClassName="bg-[#0d0d10] border border-[#27272a] rounded-lg px-[14px] py-[10px] text-white text-[13px] outline-none w-full transition-colors duration-200 focus:border-blue-500 placeholder-[#555]"
                    onChange={(location) => {
                      setDeliveryError("");
                      setFieldErrors((current) => { const next = { ...current }; delete next.provinceCode; delete next.wardCode; return next; });
                      setSelectedAddressId("");
                      setForm((current) => ({
                        ...current,
                        provinceCode: location.provinceCode,
                        province: location.provinceName,
                        wardCode: location.wardCode,
                        ward: location.wardName,
                      }));
                    }}
                  />
                  <input
                    name="address"
                    aria-label="Địa chỉ giao hàng"
                    value={form.address}
                    onChange={(e) => {
                      setDeliveryError("");
                      updateForm("address", e.target.value);
                    }}
                    onBlur={() => touchField("address")}
                    type="text"
                    placeholder="Số nhà, tên đường"
                    aria-invalid={Boolean(visibleError("address")) || undefined}
                    aria-describedby={
                      visibleError("address") ? "checkout-address-error" : undefined
                    }
                    className="bg-[#0d0d10] border border-[#27272a] rounded-lg px-[14px] py-[10px] text-white text-[13px] outline-none w-full transition-colors duration-200 focus:border-blue-500 placeholder-[#555]"
                  />
                  <FieldError id="checkout-address-error" message={visibleError("address")} />
                  <textarea
                    name="note"
                    aria-label="Ghi chú đơn hàng"
                    value={form.note}
                    onChange={(e) =>
                      updateForm("note", e.target.value.slice(0, 1000))
                    }
                    onBlur={() => touchField("note")}
                    maxLength={1000}
                    aria-invalid={Boolean(visibleError("note")) || undefined}
                    aria-describedby={visibleError("note") ? "checkout-note-error checkout-note-count" : "checkout-note-count"}
                    rows={4}
                    placeholder="Ghi chú"
                    className="resize-y bg-[#0d0d10] border border-[#27272a] rounded-lg px-[14px] py-[10px] text-white text-[13px] outline-none w-full transition-colors duration-200 focus:border-blue-500 placeholder-[#555]"
                  />
                  <FieldError id="checkout-note-error" message={visibleError("note")} />
                  <p id="checkout-note-count" className="text-right text-[11px] text-gray-600 -mt-3">
                    {form.note.length}/1000
                  </p>
                </div>

                <div className="bg-[#111115] border border-[#1a1a1e] rounded-[12px] p-5 space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-[15px] text-white">
                      Xuất hóa đơn công ty
                    </h3>
                    <label className="relative w-[48px] h-[26px] cursor-pointer inline-block">
                      <input
                        checked={form.invoiceEnabled}
                        aria-label="Xuất hóa đơn công ty"
                        onChange={(e) => { updateForm("invoiceEnabled", e.target.checked); if (!e.target.checked) setFieldErrors((current) => { const next = { ...current }; delete next.companyName; delete next.taxCode; delete next.invoiceAddress; delete next.invoiceEmail; return next; }); }}
                        type="checkbox"
                        className="peer sr-only"
                      />
                      <span className="absolute inset-0 bg-[#27272a] rounded-full transition duration-300 peer-checked:bg-blue-500 before:absolute before:content-[''] before:h-[20px] before:w-[20px] before:left-[3px] before:bottom-[3px] before:bg-white before:rounded-full before:transition before:duration-300 peer-checked:before:translate-x-[22px]"></span>
                    </label>
                  </div>
                  {form.invoiceEnabled && (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><input
                          name="companyName"
                          aria-label="Tên công ty"
                          value={form.companyName}
                          onChange={(e) =>
                            updateForm("companyName", e.target.value)
                          }
                          onBlur={() => touchField("companyName")}
                          aria-invalid={Boolean(visibleError("companyName")) || undefined}
                          aria-describedby={visibleError("companyName") ? "checkout-company-error" : undefined}
                          type="text"
                          placeholder="Tên công ty"
                          className="bg-[#0d0d10] border border-[#27272a] rounded-lg px-[14px] py-[10px] text-white text-[13px] outline-none w-full transition-colors duration-200 focus:border-blue-500 placeholder-[#555]"
                        /><FieldError id="checkout-company-error" message={visibleError("companyName")} /></div>
                        <div><input
                          name="taxCode"
                          aria-label="Mã số thuế"
                          value={form.taxCode}
                          onChange={(e) =>
                            updateForm("taxCode", e.target.value)
                          }
                          onBlur={() => touchField("taxCode")}
                          aria-invalid={Boolean(visibleError("taxCode")) || undefined}
                          aria-describedby={visibleError("taxCode") ? "checkout-tax-code-error" : undefined}
                          type="text"
                          placeholder="Mã số thuế"
                          className="bg-[#0d0d10] border border-[#27272a] rounded-lg px-[14px] py-[10px] text-white text-[13px] outline-none w-full transition-colors duration-200 focus:border-blue-500 placeholder-[#555]"
                        /><FieldError id="checkout-tax-code-error" message={visibleError("taxCode")} /></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><input
                          name="invoiceAddress"
                          aria-label="Địa chỉ xuất hóa đơn"
                          value={form.invoiceAddress}
                          onChange={(e) =>
                            updateForm("invoiceAddress", e.target.value)
                          }
                          onBlur={() => touchField("invoiceAddress")}
                          aria-invalid={Boolean(visibleError("invoiceAddress")) || undefined}
                          aria-describedby={visibleError("invoiceAddress") ? "checkout-invoice-address-error" : undefined}
                          type="text"
                          placeholder="Địa chỉ xuất hóa đơn"
                          className="bg-[#0d0d10] border border-[#27272a] rounded-lg px-[14px] py-[10px] text-white text-[13px] outline-none w-full transition-colors duration-200 focus:border-blue-500 placeholder-[#555]"
                        /><FieldError id="checkout-invoice-address-error" message={visibleError("invoiceAddress")} /></div>
                        <div><input
                          name="invoiceEmail"
                          aria-label="Email nhận hóa đơn"
                          value={form.invoiceEmail}
                          onChange={(e) =>
                            updateForm("invoiceEmail", e.target.value)
                          }
                          onBlur={() => touchField("invoiceEmail")}
                          aria-invalid={Boolean(visibleError("invoiceEmail")) || undefined}
                          aria-describedby={visibleError("invoiceEmail") ? "checkout-invoice-email-error" : undefined}
                          type="email"
                          placeholder="Email nhận hóa đơn"
                          className="bg-[#0d0d10] border border-[#27272a] rounded-lg px-[14px] py-[10px] text-white text-[13px] outline-none w-full transition-colors duration-200 focus:border-blue-500 placeholder-[#555]"
                        /><FieldError id="checkout-invoice-email-error" message={visibleError("invoiceEmail")} /></div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div
                data-checkout-summary
                className="w-full min-w-0 space-y-4 lg:sticky lg:top-6 lg:w-1/3 lg:self-start"
              >
                <div className="bg-[#111115] border border-[#1a1a1e] rounded-[12px] p-5 space-y-4">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-gray-400">Tổng tiền sản phẩm</span>
                    <span className="font-bold text-white">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-gray-400">
                      Tiết kiệm theo giá niêm yết
                    </span>
                    <span className="font-bold text-red-500">
                      -{formatCurrency(savings)}
                    </span>
                  </div>
                  {voucherDiscount > 0 && (
                    <div className="flex justify-between text-[13px]">
                      <span className="text-gray-400">
                        Giảm giá voucher {voucherCode ? `(${voucherCode})` : ""}
                      </span>
                      <span className="font-bold text-emerald-400">
                        -{formatCurrency(voucherDiscount)}
                      </span>
                    </div>
                  )}
                  {voucher?.status === "applied" && voucher.note && (
                    <p className="text-xs leading-5 text-emerald-300">
                      {voucher.note}
                    </p>
                  )}
                  {voucherCode && voucher?.status === "invalid" && (
                    <p className="text-xs leading-5 text-red-300">
                      {voucher.message}
                    </p>
                  )}
                  <div className="border-t border-[#1a1a1e] pt-4 flex justify-between items-start">
                    <span className="font-bold text-white text-sm">
                      Cần thanh toán
                    </span>
                    <div className="text-right">
                      <span className="font-black text-xl text-red-500 block leading-none">
                        {formatCurrency(totalAfterVoucher)}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        (Đã bao gồm VAT)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#111115] border border-[#1a1a1e] rounded-[12px] p-5 space-y-4">
                  <h3 className="font-bold text-[15px] text-white">
                    Chọn phương thức thanh toán
                  </h3>
                  <label
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all ${form.paymentMethod === "cod" ? "border-blue-500/50 bg-blue-500/5" : "border-[#27272a] hover:border-blue-500/30"}`}
                  >
                    <input
                      checked={form.paymentMethod === "cod"}
                      onChange={() => updateForm("paymentMethod", "cod")}
                      type="radio"
                      name="payment"
                      className="w-4 h-4 accent-blue-500 cursor-pointer"
                    />
                    <div className="w-8 h-8 rounded bg-red-500/20 flex items-center justify-center text-red-500 text-sm font-bold shrink-0">
                      đ
                    </div>
                    <span className="text-sm text-gray-300">
                      Thanh toán khi nhận hàng
                    </span>
                  </label>
                  <label
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all ${form.paymentMethod === "bank_transfer" ? "border-blue-500/50 bg-blue-500/5" : "border-[#27272a] hover:border-blue-500/30"}`}
                  >
                    <input
                      checked={form.paymentMethod === "bank_transfer"}
                      onChange={() =>
                        updateForm("paymentMethod", "bank_transfer")
                      }
                      type="radio"
                      name="payment"
                      className="w-4 h-4 accent-blue-500 cursor-pointer"
                    />
                    <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center text-blue-500 text-sm shrink-0">
                      🏦
                    </div>
                    <span className="text-sm text-white font-medium">
                      Thanh toán bằng chuyển khoản
                    </span>
                  </label>
                </div>

                {error && (
                  <div role="alert" aria-live="assertive" className="bg-red-500/10 border border-red-500/30 text-red-200 rounded-xl p-3 text-sm">
                    {error}
                  </div>
                )}
                {quoteError && (
                  <div role="alert" aria-live="polite" className="bg-amber-500/10 border border-amber-500/30 text-amber-100 rounded-xl p-3 text-sm">
                    <p>{quoteError}</p>
                    <button type="button" onClick={() => setQuoteRetry((value) => value + 1)} className="mt-2 font-bold underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400">Thử cập nhật lại</button>
                  </div>
                )}

                {invalidItems.length > 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-200 rounded-xl p-3 text-sm">
                    Có sản phẩm chưa thể đặt mua. Vui lòng quay lại giỏ hàng để
                    bỏ sản phẩm đó.
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? "Đang đặt hàng..." : "Đặt hàng"}
                  </button>
                  <Link
                    href="/"
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
                  >
                    Chọn thêm sản phẩm
                  </Link>
                  <button
                    type="button"
                    className="w-full bg-[#1a1a1e] text-gray-500 font-bold py-3 rounded-lg flex items-center justify-center gap-2 border border-[#27272a] cursor-not-allowed"
                  >
                    Tải ảnh báo giá
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </form>
    </div>
  );
}
