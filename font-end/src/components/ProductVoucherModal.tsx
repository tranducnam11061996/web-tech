"use client";

import { Check, Copy, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ProductVoucherSummary } from "@/types/product-detail";

const FOCUSABLE = 'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

const money = (value: number) => `${new Intl.NumberFormat("vi-VN").format(Math.max(0, Math.round(value || 0)))}đ`;
const date = (value: string | null) => value
  ? new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value))
  : "Không giới hạn";
const discount = (voucher: ProductVoucherSummary) => voucher.discountType === "percent"
  ? `${voucher.discountValue}%${voucher.maxDiscount ? `, tối đa ${money(voucher.maxDiscount)}` : ""}`
  : money(voucher.discountValue);
const badgeDiscount = (voucher: ProductVoucherSummary) => {
  if (voucher.discountType === "percent") return `${voucher.discountValue}%`;
  if (voucher.discountValue >= 1_000_000 && voucher.discountValue % 1_000_000 === 0) return `${voucher.discountValue / 1_000_000}TR`;
  if (voucher.discountValue >= 1_000 && voucher.discountValue % 1_000 === 0) return `${voucher.discountValue / 1_000}K`;
  return money(voucher.discountValue);
};

function VoucherTicket({ voucher, onDetails }: { voucher: ProductVoucherSummary; onDetails: () => void }) {
  return <article className="voucher-list-ticket">
    <div className="voucher-list-badge"><span className="voucher-list-badge-label">Giảm</span><span className="voucher-list-badge-value tabular-nums">{badgeDiscount(voucher)}</span></div>
    <div className="voucher-list-content"><div className="voucher-list-info"><strong className="text-balance">{voucher.title}</strong><span className="voucher-list-desc text-pretty">{voucher.description || `Giảm ${discount(voucher)} cho sản phẩm đủ điều kiện.`}</span><span className="voucher-list-expiry">Thời hạn: <strong className="tabular-nums">{date(voucher.endsAt)}</strong></span></div><div className="voucher-list-actions"><span className="rounded bg-red-50 px-2 py-1 font-mono text-xs font-bold text-red-700">{voucher.code}</span><button type="button" className="voucher-list-btn-rules" onClick={onDetails}>Xem chi tiết</button></div></div>
  </article>;
}

export default function ProductVoucherModal({ vouchers, initialVoucher, onClose }: { vouchers: ProductVoucherSummary[]; initialVoucher: ProductVoucherSummary | null; onClose: () => void }) {
  const [selected, setSelected] = useState<ProductVoucherSummary | null>(initialVoucher);
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const close = useCallback(() => { onClose(); window.setTimeout(() => returnFocusRef.current?.focus({ preventScroll: true }), 0); }, [onClose]);

  useEffect(() => {
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus({ preventScroll: true });
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close(); return; }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0]; const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("keydown", onKeyDown); document.body.style.overflow = previousOverflow; };
  }, [close]);

  const copyCode = async () => {
    if (!selected) return;
    try { await navigator.clipboard.writeText(selected.code); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { setCopied(false); }
  };

  return <div className="voucher-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
    <div ref={dialogRef} className={`voucher-modal-content ${selected ? "" : "voucher-list-modal"}`} role="dialog" aria-modal="true" aria-labelledby="product-voucher-modal-title">
      <div className={`voucher-modal-header ${selected ? "" : "voucher-list-header"}`}><h2 id="product-voucher-modal-title" className="voucher-modal-title text-balance">{selected ? "Thể lệ chương trình" : "Ưu đãi & voucher"}</h2><button ref={closeRef} type="button" className="voucher-modal-close" onClick={close} aria-label="Đóng cửa sổ voucher"><X aria-hidden="true" /></button></div>
      {selected ? <div className="voucher-modal-body"><div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3"><div><p className="text-xs text-gray-500">Mã voucher</p><strong className="font-mono text-lg text-red-700">{selected.code}</strong></div><button type="button" onClick={() => void copyCode()} className="inline-flex items-center gap-2 rounded-md bg-[#e30019] px-3 py-2 text-sm font-bold text-white hover:bg-[#b91c1c]">{copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}{copied ? "Đã sao chép" : "Sao chép mã"}</button></div><h3 className="voucher-modal-rule-heading text-balance">{selected.title}</h3>{selected.description ? <p className="voucher-modal-rule-text whitespace-pre-line text-pretty">{selected.description}</p> : null}<p className="voucher-modal-rule-text"><strong>Mức giảm:</strong> {discount(selected)}</p><p className="voucher-modal-rule-text"><strong>Đơn hàng tối thiểu:</strong> {selected.minimumOrderValue > 0 ? money(selected.minimumOrderValue) : "Không yêu cầu"}</p><p className="voucher-modal-rule-text"><strong>Phạm vi:</strong> {selected.categoryNames.length > 0 ? selected.categoryNames.join(", ") + " và các danh mục con" : "Toàn bộ sản phẩm"}</p><p className="voucher-modal-rule-text"><strong>Thời hạn:</strong> {date(selected.endsAt)}</p>{initialVoucher === null ? <button type="button" className="mt-4 text-sm font-semibold text-red-600 underline" onClick={() => { setCopied(false); setSelected(null); }}>Quay lại danh sách</button> : null}</div> : <><div className="voucher-list-body">{vouchers.map((voucher) => <VoucherTicket key={voucher.id} voucher={voucher} onDetails={() => { setCopied(false); setSelected(voucher); }} />)}</div><div className="voucher-list-footer"><button type="button" className="voucher-list-btn-close" onClick={close}>Đóng</button></div></>}
    </div>
  </div>;
}
