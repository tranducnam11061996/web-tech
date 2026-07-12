"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import type { ComboGroupSummary } from "@/types/product-detail";

export type BundleProduct = {
  id: number; name: string; sku: string; slug: string; thumbnail: string; brand: string;
  price: number; marketPrice: number; potentialDiscount: number; comboUnitPrice: number;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  setId?: number;
  anchorProductId?: number;
  revision?: string;
  groups?: ComboGroupSummary[];
  initialGroupIndex?: number;
  selectedProductIds?: number[];
  onToggle?: (groupIndex: number, product: BundleProduct) => void;
  tabs?: string[];
  products?: unknown[];
};

const money = (value: number) => `${new Intl.NumberFormat("vi-VN").format(value)}đ`;

export default function ProductBundleModal(props: Props) {
  const [activeGroup, setActiveGroup] = useState(props.initialGroupIndex || 0);
  const [products, setProducts] = useState<BundleProduct[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => { if (props.isOpen) { setActiveGroup(props.initialGroupIndex || 0); setPage(1); setQuery(""); } }, [props.initialGroupIndex, props.isOpen]);
  useEffect(() => {
    if (!props.isOpen) return;
    returnFocusRef.current = document.activeElement as HTMLElement;
    const dialog = dialogRef.current;
    dialog?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") props.onClose();
      if (event.key === "Tab" && dialog) {
        const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),a[href]'));
        if (!focusable.length) return;
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); returnFocusRef.current?.focus(); };
  }, [props.isOpen, props.onClose]);
  useEffect(() => {
    if (!props.isOpen) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true); setError("");
      try {
        const url = new URL(`/api/combo-sets/${props.setId}/groups/${activeGroup}`, window.location.origin);
        url.searchParams.set("anchorProductId", String(props.anchorProductId));
        url.searchParams.set("revision", props.revision || "");
        url.searchParams.set("page", String(page));
        url.searchParams.set("limit", "24");
        if (query.trim()) url.searchParams.set("q", query.trim());
        const response = await fetch(url, { signal: controller.signal });
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload?.error?.message || "Không thể tải sản phẩm combo.");
        setProducts(payload.data.products || []); setPages(payload.data.pagination?.totalPages || 1);
      } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Không thể tải sản phẩm combo."); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }, query ? 250 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [activeGroup, page, props.anchorProductId, props.isOpen, props.revision, props.setId, query]);

  if (!props.isOpen) return null;
  return <div className="bundle-list-overlay" onMouseDown={(event) => event.target === event.currentTarget && props.onClose()}>
    <div ref={dialogRef} className="bundle-list-modal" role="dialog" aria-modal="true" aria-labelledby="combo-dialog-title" tabIndex={-1}>
      <div className="bundle-list-header"><h3 id="combo-dialog-title">Mua Kèm - Giá Sốc</h3><button type="button" className="bundle-list-close" onClick={props.onClose} aria-label="Đóng"><X size={20}/></button></div>
      <div className="bundle-list-tabs-container"><div className="bundle-list-tabs" role="tablist" aria-label="Nhóm sản phẩm combo">
        {(props.groups || []).map((group) => <button key={group.groupIndex} type="button" role="tab" aria-selected={activeGroup === group.groupIndex} className={`bundle-list-tab ${activeGroup === group.groupIndex ? "is-active" : ""}`} onClick={() => { setActiveGroup(group.groupIndex); setPage(1); }}>{group.title}</button>)}
      </div></div>
      <div className="bundle-list-search"><Search size={17} aria-hidden="true"/><label className="sr-only" htmlFor="combo-product-search">Tìm sản phẩm</label><input id="combo-product-search" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Tìm tên hoặc mã sản phẩm"/></div>
      {loading ? <p className="bundle-list-state">Đang tải sản phẩm...</p> : error ? <p className="bundle-list-state is-error" role="alert">{error}</p> : products.length === 0 ? <p className="bundle-list-state">Không có sản phẩm phù hợp.</p> : <div className="bundle-list-grid">
        {products.map((product) => { const selected = (props.selectedProductIds || []).includes(product.id); return <article key={product.id} className="bundle-grid-item"><div className="bundle-grid-brand">{product.brand}</div><div className="bundle-grid-image"><img src={product.thumbnail} alt={product.name}/></div><div className="bundle-grid-item-info"><h4 className="bundle-grid-title">{product.name}</h4><div className="bundle-grid-price-row"><span className="bundle-grid-price">{money(product.comboUnitPrice)}</span>{product.marketPrice > product.comboUnitPrice && <span className="bundle-grid-original">{money(product.marketPrice)}</span>}</div></div><div className="bundle-grid-item-bottom"><a href={`/${product.slug}`} className="bundle-grid-link">Xem chi tiết</a><button type="button" className={`bundle-grid-btn ${selected ? "is-selected" : ""}`} onClick={() => props.onToggle?.(activeGroup, product)}>{selected ? "Bỏ chọn" : "Chọn"}</button></div></article>; })}
      </div>}
      {pages > 1 && <div className="bundle-list-footer"><button type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1} aria-label="Trang trước"><ChevronLeft/></button><span>Trang {page}/{pages}</span><button type="button" onClick={() => setPage((value) => Math.min(pages, value + 1))} disabled={page === pages} aria-label="Trang sau"><ChevronRight/></button></div>}
    </div>
  </div>;
}
