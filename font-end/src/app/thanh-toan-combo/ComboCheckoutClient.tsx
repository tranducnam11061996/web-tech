"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { CheckoutProductRow, type CheckoutDisplayItem } from "@/components/commerce/CheckoutProductRow";
import { CommercePageFrame } from "@/components/commerce/CommercePageFrame";
import { FieldError } from "@/components/forms/FieldError";
import { customerFetch, type CustomerAddress, useCustomerSession } from "@/lib/customer";
import { formatCurrency } from "@/lib/cart";
import { setComboCart, toComboApiPayload, useComboCart } from "@/lib/comboCart";
import { mapCheckoutServerFields, validateCheckoutForm } from "@/lib/checkoutValidation";
import { apiErrorSummary, parseStorefrontResponse, StorefrontApiError } from "@/lib/storefrontApi";
import { focusFirstInvalidField, type FieldErrors } from "@/lib/storefrontValidation";

type QuoteItem = CheckoutDisplayItem & { groupIndex: number; lineTotal: number; comboDiscount: number };
type Quote = {
  comboSet: { title: string }; anchor: CheckoutDisplayItem;
  groups: Array<{ groupIndex: number; title: string; items: QuoteItem[] }>;
  totals: { subtotalBeforeDiscount: number; comboDiscount: number; total: number; itemCount: number };
};
type CheckoutForm = {
  customerName: string; customerPhone: string; customerEmail: string; receiverEnabled: boolean; receiverName: string; receiverPhone: string;
  deliveryMethod: "shipping" | "pickup"; provinceCode: string; province: string; wardCode: string; ward: string; address: string; note: string;
  invoiceEnabled: boolean; companyName: string; taxCode: string; invoiceAddress: string; invoiceEmail: string; paymentMethod: "cod" | "bank_transfer";
};
const initialForm: CheckoutForm = { customerName: "", customerPhone: "", customerEmail: "", receiverEnabled: false, receiverName: "", receiverPhone: "", deliveryMethod: "shipping", provinceCode: "", province: "", wardCode: "", ward: "", address: "", note: "", invoiceEnabled: false, companyName: "", taxCode: "", invoiceAddress: "", invoiceEmail: "", paymentMethod: "bank_transfer" };
const inputClass = "w-full rounded-lg border border-[#27272a] bg-[#0d0d10] px-[14px] py-[10px] text-[13px] text-white outline-none transition-colors placeholder:text-[#555] focus:border-blue-500";
const VietnamLocationSelector = dynamic(
  () => import("@/components/location/VietnamLocationSelector").then((module) => module.VietnamLocationSelector),
  { loading: () => <div className="h-24 animate-pulse rounded-lg bg-[#111115]" aria-hidden="true" /> },
);

export default function ComboCheckoutClient() {
  const cart = useComboCart();
  const { user } = useCustomerSession();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [form, setForm] = useState<CheckoutForm>(initialForm);
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | "">("");
  const [error, setError] = useState(""); const [deliveryError, setDeliveryError] = useState("");
  const [isQuoting, setIsQuoting] = useState(false); const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ orderId: number; total: number } | null>(null);
  const idempotencyKey = useRef<string | null>(null); const prefilled = useRef(false);
  const checkoutFormRef = useRef<HTMLFormElement>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const clientErrors = useMemo(() => validateCheckoutForm(form), [form]);
  const visibleError = (field: string) => fieldErrors[field] || (touched[field] ? clientErrors[field] : "");
  const markTouched = (field: string) => setTouched((current) => ({ ...current, [field]: true }));
  useEffect(() => {
    if (!cart || cart.items.length === 0) { setQuote(null); setIsQuoting(false); return; }
    const controller = new AbortController(); setIsQuoting(true); setError("");
    fetch("/api/combo-cart/quote", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify(toComboApiPayload(cart)) })
      .then((response) => parseStorefrontResponse<Quote>(response))
      .then(setQuote).catch((cause) => { if (!controller.signal.aborted) { setQuote(null); setError(apiErrorSummary(cause)); } })
      .finally(() => { if (!controller.signal.aborted) setIsQuoting(false); });
    return () => controller.abort();
  }, [cart]);
  useEffect(() => {
    if (!user || prefilled.current) return;
    prefilled.current = true;
    setForm((current) => ({ ...current, customerName: current.customerName || user.name, customerPhone: current.customerPhone || user.phone, customerEmail: current.customerEmail || user.email, receiverName: current.receiverName || user.defaultAddress?.recipientName || "", receiverPhone: current.receiverPhone || user.defaultAddress?.phone || "", provinceCode: current.provinceCode || user.defaultAddress?.provinceCode || "", province: current.province || user.defaultAddress?.provinceName || "", wardCode: current.wardCode || user.defaultAddress?.wardCode || "", ward: current.ward || [user.defaultAddress?.wardName, user.defaultAddress?.districtName].filter(Boolean).join(", "), address: current.address || user.defaultAddress?.address || "" }));
    if (user.defaultAddress) setSelectedAddressId(user.defaultAddress.id);
    void customerFetch("/api/customer/addresses").then((data) => setSavedAddresses(data.items || [])).catch(() => setSavedAddresses([]));
  }, [user]);
  const items = useMemo<CheckoutDisplayItem[]>(() => quote ? [{ ...quote.anchor, quantity: 1, caption: "Sản phẩm chính" }, ...quote.groups.flatMap((group) => group.items.map((item) => ({ ...item, caption: group.title })))] : [], [quote]);
  const selectedSavedAddress = useMemo(() => savedAddresses.find((address) => address.id === selectedAddressId) || null, [savedAddresses, selectedAddressId]);
  const update = <K extends keyof CheckoutForm>(key: K, value: CheckoutForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => { const next = { ...current }; delete next[key]; return next; });
  };
  const applyAddress = (address: CustomerAddress) => { setSelectedAddressId(address.id); setDeliveryError(""); setForm((current) => ({ ...current, receiverName: address.recipientName, receiverPhone: address.phone, provinceCode: address.provinceCode || "", province: address.provinceName, wardCode: address.wardCode || "", ward: [address.wardName, address.districtName].filter(Boolean).join(", "), address: address.address })); };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(""); setDeliveryError(""); setFieldErrors({});
    if (!cart || !quote) return setError("Giỏ combo chưa hợp lệ.");
    if (Object.keys(clientErrors).length) {
      setFieldErrors(clientErrors);
      setDeliveryError(clientErrors.provinceCode || clientErrors.wardCode || "");
      setError(Object.values(clientErrors)[0] || "Vui lòng sửa thông tin thanh toán.");
      window.setTimeout(() => focusFirstInvalidField(checkoutFormRef.current, clientErrors));
      return;
    }
    setIsSubmitting(true);
    try {
      const { getCustomerRecaptchaToken } = await import("@/lib/customerRecaptcha");
      const recaptchaToken = await getCustomerRecaptchaToken("combo_order_submit"); idempotencyKey.current ||= crypto.randomUUID();
      const response = await fetch("/api/combo-orders", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey.current }, body: JSON.stringify({ ...toComboApiPayload(cart), recaptchaToken, website: "", customer: { name: form.customerName.trim(), phone: form.customerPhone.trim(), email: form.customerEmail.trim() }, receiver: { enabled: form.receiverEnabled, name: form.receiverName.trim(), phone: form.receiverPhone.trim() }, delivery: { method: form.deliveryMethod, provinceCode: form.provinceCode, province: form.province.trim(), wardCode: form.wardCode, ward: form.ward.trim(), address: form.address.trim(), note: form.note.trim() }, paymentMethod: form.paymentMethod, invoice: { enabled: form.invoiceEnabled, companyName: form.companyName.trim(), taxCode: form.taxCode.trim(), address: form.invoiceAddress.trim(), email: form.invoiceEmail.trim() }, note: form.note.trim() }) });
      const payload = await parseStorefrontResponse<{ orderId: number; total: number }>(response);
      setSuccess(payload); setComboCart(null);
    } catch (cause) {
      if (cause instanceof StorefrontApiError) {
        if (cause.status < 500 && cause.code !== "ORDER_PROCESSING") idempotencyKey.current = null;
        const mapped = mapCheckoutServerFields(cause.fields); setFieldErrors(mapped);
        setDeliveryError(mapped.provinceCode || mapped.wardCode || "");
        window.setTimeout(() => focusFirstInvalidField(checkoutFormRef.current, mapped));
      }
      setError(apiErrorSummary(cause));
    } finally { setIsSubmitting(false); }
  };
  if (success) return <CommercePageFrame><main className="min-h-[55vh] bg-[#0a0a0c]"><section className="mx-auto max-w-[1400px] px-4 py-12 pb-24 md:px-6"><div className="rounded-2xl border border-emerald-500/30 bg-[#111115] p-10 text-center"><div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-emerald-500/10 text-2xl text-emerald-400">✓</div><h1 className="mb-2 text-xl font-black">Đặt đơn combo thành công</h1><p className="text-gray-400">Mã đơn hàng: <strong className="text-white">#{success.orderId}</strong></p><p className="mb-6 text-gray-400">Tổng thanh toán: <strong className="text-red-400">{formatCurrency(success.total)}</strong></p><Link href="/" className="inline-flex rounded-lg bg-red-600 px-6 py-3 font-bold text-white transition hover:bg-red-500">Về trang chủ</Link></div></section></main></CommercePageFrame>;
  if (!cart || cart.items.length === 0) return <CommercePageFrame><main className="min-h-[55vh] bg-[#0a0a0c]"><section className="mx-auto max-w-[1400px] px-4 py-12 pb-24 md:px-6"><div className="rounded-2xl border border-[#1a1a1e] bg-[#111115] p-10 text-center"><h1 className="mb-2 text-xl font-black">Giỏ combo đang trống</h1><p className="mb-6 text-sm text-gray-500">Hãy quay lại giỏ combo để chọn sản phẩm mua kèm.</p><Link href="/gio-hang-combo" className="inline-flex rounded-lg bg-red-600 px-6 py-3 font-bold text-white transition hover:bg-red-500">Quay lại giỏ combo</Link></div></section></main></CommercePageFrame>;
  return <CommercePageFrame><main className="min-h-[55vh] bg-[#0a0a0c]"><form ref={checkoutFormRef} onSubmit={submit} noValidate aria-busy={isSubmitting}><section className="mx-auto max-w-[1400px] px-4 py-8 pb-24 md:px-6"><Link href="/gio-hang-combo" className="mb-6 inline-flex text-sm font-semibold text-blue-400 transition hover:text-blue-300">‹ Quay lại giỏ combo</Link><div className="flex flex-col items-start gap-6 lg:flex-row"><div className="flex w-full flex-col gap-6 lg:w-2/3">
    <section className="overflow-hidden rounded-xl border border-[#1a1a1e] bg-[#111115]"><h1 className="border-b border-[#1a1a1e] px-5 py-5 text-[15px] font-bold text-white">Sản phẩm trong đơn ({quote?.totals.itemCount || 0})</h1>{isQuoting && !quote ? <div className="h-32 animate-pulse bg-[#0d0d10]" /> : items.map((item) => <CheckoutProductRow key={`${item.productId}-${item.caption}`} item={item} />)}</section>
    <section className="space-y-5 rounded-xl border border-[#1a1a1e] bg-[#111115] p-5">
      <h2 className="text-[15px] font-bold text-white">Thông tin người đặt hàng</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div><label htmlFor="combo-customer-name" className="mb-1.5 block text-xs font-semibold text-gray-300">Họ và tên *</label><input id="combo-customer-name" name="customerName" value={form.customerName} onChange={(event) => update("customerName", event.target.value)} onBlur={() => markTouched("customerName")} autoComplete="name" aria-invalid={Boolean(visibleError("customerName")) || undefined} aria-describedby="combo-customer-name-error" className={inputClass} /><FieldError id="combo-customer-name-error" message={visibleError("customerName")} /></div>
        <div><label htmlFor="combo-customer-phone" className="mb-1.5 block text-xs font-semibold text-gray-300">Số điện thoại *</label><input id="combo-customer-phone" name="customerPhone" value={form.customerPhone} onChange={(event) => update("customerPhone", event.target.value)} onBlur={() => markTouched("customerPhone")} autoComplete="tel" inputMode="tel" maxLength={20} aria-invalid={Boolean(visibleError("customerPhone")) || undefined} aria-describedby="combo-customer-phone-error" className={inputClass} /><FieldError id="combo-customer-phone-error" message={visibleError("customerPhone")} /></div>
        <div><label htmlFor="combo-customer-email" className="mb-1.5 block text-xs font-semibold text-gray-300">Email (không bắt buộc)</label><input id="combo-customer-email" name="customerEmail" value={form.customerEmail} onChange={(event) => update("customerEmail", event.target.value)} onBlur={() => markTouched("customerEmail")} autoComplete="email" type="email" maxLength={255} aria-invalid={Boolean(visibleError("customerEmail")) || undefined} aria-describedby="combo-customer-email-error" className={inputClass} /><FieldError id="combo-customer-email-error" message={visibleError("customerEmail")} /></div>
      </div>
      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-white"><input type="checkbox" checked={form.receiverEnabled} onChange={(event) => { update("receiverEnabled", event.target.checked); if (!event.target.checked) setFieldErrors((current) => { const next = { ...current }; delete next.receiverName; delete next.receiverPhone; return next; }); }} className="size-4 accent-blue-500" />Nhờ người khác nhận hàng</label>
      {form.receiverEnabled ? <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div><label htmlFor="combo-receiver-name" className="mb-1.5 block text-xs font-semibold text-gray-300">Họ tên người nhận *</label><input id="combo-receiver-name" name="receiverName" value={form.receiverName} onChange={(event) => update("receiverName", event.target.value)} onBlur={() => markTouched("receiverName")} autoComplete="name" aria-invalid={Boolean(visibleError("receiverName")) || undefined} aria-describedby="combo-receiver-name-error" className={inputClass} /><FieldError id="combo-receiver-name-error" message={visibleError("receiverName")} /></div>
        <div><label htmlFor="combo-receiver-phone" className="mb-1.5 block text-xs font-semibold text-gray-300">Số điện thoại người nhận *</label><input id="combo-receiver-phone" name="receiverPhone" value={form.receiverPhone} onChange={(event) => update("receiverPhone", event.target.value)} onBlur={() => markTouched("receiverPhone")} autoComplete="tel" inputMode="tel" maxLength={20} aria-invalid={Boolean(visibleError("receiverPhone")) || undefined} aria-describedby="combo-receiver-phone-error" className={inputClass} /><FieldError id="combo-receiver-phone-error" message={visibleError("receiverPhone")} /></div>
      </div> : null}
    </section>
    <section className="space-y-5 rounded-xl border border-[#1a1a1e] bg-[#111115] p-5">
      <h2 className="text-[15px] font-bold text-white">Địa chỉ nhận hàng</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 ${form.deliveryMethod === "shipping" ? "border-blue-500/50 bg-blue-500/5" : "border-[#27272a]"}`}><input type="radio" name="deliveryMethod" value="shipping" checked={form.deliveryMethod === "shipping"} onChange={() => update("deliveryMethod", "shipping")} className="size-4 accent-blue-500" /><span className="text-sm font-medium">Giao hàng tận nơi</span></label>
        <label className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 ${form.deliveryMethod === "pickup" ? "border-blue-500/50 bg-blue-500/5" : "border-[#27272a]"}`}><input type="radio" name="deliveryMethod" value="pickup" checked={form.deliveryMethod === "pickup"} onChange={() => { update("deliveryMethod", "pickup"); setDeliveryError(""); setFieldErrors((current) => { const next = { ...current }; delete next.provinceCode; delete next.wardCode; delete next.address; return next; }); }} className="size-4 accent-blue-500" /><span className="text-sm font-medium text-gray-300">Nhận tại cửa hàng</span></label>
      </div>
      {form.deliveryMethod === "shipping" ? <>
        <div className="rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-3 text-xs">{user ? <label className="font-semibold text-cyan-100">Địa chỉ đã lưu<select value={selectedAddressId} onChange={(event) => { const id = Number(event.target.value) || ""; setSelectedAddressId(id); const address = savedAddresses.find((item) => item.id === id); if (address) applyAddress(address); }} className="mt-1 block min-w-[240px] rounded border border-[#30303a] bg-[#0c0c11] px-2 py-2 text-sm text-white outline-none"><option value="">Nhập địa chỉ khác</option>{savedAddresses.map((address) => <option key={address.id} value={address.id}>{address.isDefault ? "Mặc định — " : ""}{address.address}, {address.provinceName}</option>)}</select></label> : <p className="text-slate-400"><Link href="/tai-khoan/dang-nhap" className="font-semibold text-cyan-300">Đăng nhập</Link> để tự điền và chọn địa chỉ đã lưu.</p>}</div>
        {selectedSavedAddress?.locationSchemaVersion === "legacy_3tier" ? <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">Địa chỉ đã lưu theo địa giới cũ. Vui lòng chọn lại tỉnh/thành phố và phường/xã hiện hành.</p> : null}
        <VietnamLocationSelector idPrefix="combo-checkout-delivery" value={{ provinceCode: form.provinceCode, provinceName: form.province, wardCode: form.wardCode, wardName: form.ward }} error={deliveryError || visibleError("provinceCode") || visibleError("wardCode") || undefined} required triggerClassName={inputClass} onChange={(location) => { setDeliveryError(""); setSelectedAddressId(""); setFieldErrors((current) => { const next = { ...current }; delete next.provinceCode; delete next.wardCode; return next; }); setForm((current) => ({ ...current, provinceCode: location.provinceCode, province: location.provinceName, wardCode: location.wardCode, ward: location.wardName })); }} />
        <div><label htmlFor="combo-address" className="mb-1.5 block text-xs font-semibold text-gray-300">Số nhà, tên đường *</label><input id="combo-address" name="address" value={form.address} onChange={(event) => update("address", event.target.value)} onBlur={() => markTouched("address")} autoComplete="street-address" maxLength={255} aria-invalid={Boolean(visibleError("address")) || undefined} aria-describedby="combo-address-error" className={inputClass} /><FieldError id="combo-address-error" message={visibleError("address")} /></div>
      </> : <p className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3 text-xs text-blue-100">Nhân viên sẽ liên hệ xác nhận cửa hàng nhận hàng phù hợp.</p>}
      <div><label htmlFor="combo-note" className="mb-1.5 block text-xs font-semibold text-gray-300">Ghi chú (không bắt buộc)</label><textarea id="combo-note" name="note" value={form.note} onChange={(event) => update("note", event.target.value.slice(0, 1000))} onBlur={() => markTouched("note")} rows={4} maxLength={1000} aria-invalid={Boolean(visibleError("note")) || undefined} aria-describedby="combo-note-error combo-note-count" className={`${inputClass} resize-y`} /><FieldError id="combo-note-error" message={visibleError("note")} /><p id="combo-note-count" className="mt-1 text-right text-[11px] text-gray-500">{form.note.length}/1000</p></div>
    </section>
    <section className="space-y-5 rounded-xl border border-[#1a1a1e] bg-[#111115] p-5">
      <div className="flex items-center justify-between"><h2 className="text-[15px] font-bold">Xuất hóa đơn công ty</h2><label className="relative inline-block size-[26px] w-12 cursor-pointer"><span className="sr-only">Yêu cầu xuất hóa đơn công ty</span><input type="checkbox" checked={form.invoiceEnabled} onChange={(event) => { update("invoiceEnabled", event.target.checked); if (!event.target.checked) setFieldErrors((current) => { const next = { ...current }; delete next.companyName; delete next.taxCode; delete next.invoiceAddress; delete next.invoiceEmail; return next; }); }} className="peer sr-only" /><span className="absolute inset-0 rounded-full bg-[#27272a] before:absolute before:bottom-[3px] before:left-[3px] before:size-5 before:rounded-full before:bg-white before:transition peer-checked:bg-blue-500 peer-checked:before:translate-x-[22px]" /></label></div>
      {form.invoiceEnabled ? <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div><label htmlFor="combo-company-name" className="mb-1.5 block text-xs font-semibold text-gray-300">Tên công ty *</label><input id="combo-company-name" name="companyName" value={form.companyName} onChange={(event) => update("companyName", event.target.value)} onBlur={() => markTouched("companyName")} maxLength={255} aria-invalid={Boolean(visibleError("companyName")) || undefined} aria-describedby="combo-company-name-error" className={inputClass} /><FieldError id="combo-company-name-error" message={visibleError("companyName")} /></div>
        <div><label htmlFor="combo-tax-code" className="mb-1.5 block text-xs font-semibold text-gray-300">Mã số thuế *</label><input id="combo-tax-code" name="taxCode" value={form.taxCode} onChange={(event) => update("taxCode", event.target.value)} onBlur={() => markTouched("taxCode")} inputMode="numeric" maxLength={14} aria-invalid={Boolean(visibleError("taxCode")) || undefined} aria-describedby="combo-tax-code-error" className={inputClass} /><FieldError id="combo-tax-code-error" message={visibleError("taxCode")} /></div>
        <div><label htmlFor="combo-invoice-address" className="mb-1.5 block text-xs font-semibold text-gray-300">Địa chỉ xuất hóa đơn *</label><input id="combo-invoice-address" name="invoiceAddress" value={form.invoiceAddress} onChange={(event) => update("invoiceAddress", event.target.value)} onBlur={() => markTouched("invoiceAddress")} maxLength={255} aria-invalid={Boolean(visibleError("invoiceAddress")) || undefined} aria-describedby="combo-invoice-address-error" className={inputClass} /><FieldError id="combo-invoice-address-error" message={visibleError("invoiceAddress")} /></div>
        <div><label htmlFor="combo-invoice-email" className="mb-1.5 block text-xs font-semibold text-gray-300">Email nhận hóa đơn *</label><input id="combo-invoice-email" name="invoiceEmail" value={form.invoiceEmail} onChange={(event) => update("invoiceEmail", event.target.value)} onBlur={() => markTouched("invoiceEmail")} type="email" maxLength={255} aria-invalid={Boolean(visibleError("invoiceEmail")) || undefined} aria-describedby="combo-invoice-email-error" className={inputClass} /><FieldError id="combo-invoice-email-error" message={visibleError("invoiceEmail")} /></div>
      </div> : null}
    </section>
  </div><aside className="w-full space-y-4 lg:sticky lg:top-6 lg:w-1/3 lg:self-start"><section className="space-y-4 rounded-xl border border-[#1a1a1e] bg-[#111115] p-5">{quote ? <><div className="flex justify-between text-[13px]"><span className="text-gray-400">Tổng tiền sản phẩm</span><b>{formatCurrency(quote.totals.subtotalBeforeDiscount)}</b></div><div className="flex justify-between text-[13px]"><span className="text-gray-400">Giảm combo</span><b className="text-emerald-400">-{formatCurrency(quote.totals.comboDiscount)}</b></div><div className="flex items-start justify-between border-t border-[#1a1a1e] pt-4"><span className="text-sm font-bold">Cần thanh toán</span><div className="text-right"><strong className="block text-xl font-black leading-none text-red-500">{formatCurrency(quote.totals.total)}</strong><span className="text-[10px] text-gray-500">(Đã bao gồm VAT)</span></div></div></> : <p className="text-sm text-gray-500">Đang kiểm tra giá combo...</p>}</section><section className="space-y-4 rounded-xl border border-[#1a1a1e] bg-[#111115] p-5"><h2 className="text-[15px] font-bold">Chọn phương thức thanh toán</h2><label className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 ${form.paymentMethod === "cod" ? "border-blue-500/50 bg-blue-500/5" : "border-[#27272a]"}`}><input type="radio" name="payment" checked={form.paymentMethod === "cod"} onChange={() => update("paymentMethod", "cod")} className="size-4 accent-blue-500" /><span className="flex size-8 items-center justify-center rounded bg-red-500/20 font-bold text-red-500">đ</span><span className="text-sm text-gray-300">Thanh toán khi nhận hàng</span></label><label className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 ${form.paymentMethod === "bank_transfer" ? "border-blue-500/50 bg-blue-500/5" : "border-[#27272a]"}`}><input type="radio" name="payment" checked={form.paymentMethod === "bank_transfer"} onChange={() => update("paymentMethod", "bank_transfer")} className="size-4 accent-blue-500" /><span className="flex size-8 items-center justify-center rounded bg-blue-500/20 text-blue-500">⌂</span><span className="text-sm font-medium">Thanh toán bằng chuyển khoản</span></label></section>{error ? <div role="alert" aria-live="assertive" className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">{error}</div> : null}<div className="space-y-3"><button type="submit" disabled={!quote || isQuoting || isSubmitting} className="flex w-full items-center justify-center rounded-lg bg-red-600 py-3 font-bold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50">{isSubmitting ? "Đang đặt đơn..." : "Đặt đơn combo"}</button><Link href="/" className="flex w-full items-center justify-center rounded-lg bg-blue-600 py-3 font-bold text-white transition hover:bg-blue-500">Chọn thêm sản phẩm</Link><button type="button" disabled className="flex w-full cursor-not-allowed items-center justify-center rounded-lg border border-[#27272a] bg-[#1a1a1e] py-3 font-bold text-gray-500">Tải ảnh báo giá</button></div></aside></div></section></form></main></CommercePageFrame>;
}
