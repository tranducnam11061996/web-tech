"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { getComboCart, setComboCart, type ComboCartItem } from "@/lib/comboCart";
import type { ComboSetSummary, ProductDetailData } from "@/types/product-detail";
import type { BundleProduct } from "./ProductBundleModal";

const ProductBundleModal = dynamic(() => import("./ProductBundleModal"), { ssr: false });
const GROUPS_PER_SLIDE = 4;
const money = (value: number) => `${new Intl.NumberFormat("vi-VN").format(Math.max(0, Math.round(value || 0)))}đ`;

type Selected = ComboCartItem & BundleProduct;
type QuoteItem = Selected & { comboDiscount: number; lineTotal: number };
type Quote = {
  anchor: { price: number };
  groups: Array<{ groupIndex: number; items: QuoteItem[] }>;
  totals: { total: number; comboDiscount: number };
};

export default function ProductComboBuilder({ productData }: { productData: ProductDetailData }) {
  const sets = productData.comboSets || [];
  const [setId, setSetId] = useState(sets[0]?.id || 0);
  const activeSet = useMemo<ComboSetSummary | undefined>(() => sets.find((set) => set.id === setId) || sets[0], [setId, sets]);
  const [selected, setSelected] = useState<Selected[]>([]);
  const [openGroup, setOpenGroup] = useState<number | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState("");
  const [groupSlideIndex, setGroupSlideIndex] = useState(0);
  const router = useRouter();

  useEffect(() => { setSelected([]); setQuote(null); setError(""); setGroupSlideIndex(0); }, [activeSet?.id]);
  useEffect(() => {
    if (!activeSet || selected.length === 0) { setQuote(null); return; }
    const controller = new AbortController();
    setQuoting(true); setError("");
    fetch(`/api/combo-cart/quote`, {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
      body: JSON.stringify({ anchorProductId: Number(productData.id), comboSetId: activeSet.id, revision: activeSet.revision, items: selected.map(({ groupIndex, id, quantity }) => ({ groupIndex, productId: id, quantity })) }),
    }).then(async (response) => { const payload = await response.json(); if (!response.ok || !payload.success) throw new Error(payload?.error?.message || "Không thể tính giá combo."); return payload.data; })
      .then((data) => setQuote(data)).catch((cause) => { if (!controller.signal.aborted) { setQuote(null); setError(cause instanceof Error ? cause.message : "Không thể tính giá combo."); } })
      .finally(() => { if (!controller.signal.aborted) setQuoting(false); });
    return () => controller.abort();
  }, [activeSet, productData.id, selected]);

  const toggleProduct = useCallback((groupIndex: number, product: BundleProduct) => {
    setSelected((current) => current.some((item) => item.id === product.id)
      ? current.filter((item) => item.id !== product.id)
      : [...current, { ...product, groupIndex, productId: product.id, quantity: 1 }]);
  }, []);
  const changeQuantity = (productId: number, delta: number) => setSelected((current) => current.map((item) => item.id === productId ? { ...item, quantity: Math.min(99, Math.max(1, item.quantity + delta)) } : item));
  const buyCombo = () => {
    if (!activeSet || !quote || selected.length === 0 || quoting) return;
    const current = getComboCart();
    if (current && (current.anchorProductId !== Number(productData.id) || current.comboSetId !== activeSet.id) && !window.confirm("Giỏ combo hiện tại sẽ được thay thế. Bạn có muốn tiếp tục?")) return;
    setComboCart({ version: 1, anchorProductId: Number(productData.id), comboSetId: activeSet.id, revision: activeSet.revision, items: selected.map((item) => ({ groupIndex: item.groupIndex, productId: item.id, quantity: item.quantity })) });
    router.push("/gio-hang-combo");
  };

  if (!activeSet || sets.length === 0) return null;
  const groupSlides = Array.from(
    { length: Math.ceil(activeSet.groups.length / GROUPS_PER_SLIDE) },
    (_, index) => activeSet.groups.slice(index * GROUPS_PER_SLIDE, (index + 1) * GROUPS_PER_SLIDE),
  );
  const moveGroupSlide = (delta: number) => setGroupSlideIndex((current) => Math.max(0, Math.min(groupSlides.length - 1, current + delta)));
  const quotedItems = new Map(quote?.groups.flatMap((group) => group.items).map((item) => [item.productId, item]) || []);
  return <div className="product-bundle-card">
    <div className="product-bundle-heading"><span className="product-bundle-title"><span role="img" aria-label="Ưu đãi nóng" className="product-bundle-fire">🔥</span> Mua kèm giá sốc</span></div>
    {sets.length > 1 && <div className="product-bundle-selector"><label htmlFor="combo-set-select">Chọn combo</label><select id="combo-set-select" value={activeSet.id} onChange={(event) => setSetId(Number(event.target.value))}>{sets.map((set) => <option key={set.id} value={set.id}>{set.title}</option>)}</select></div>}
    <div
      className="product-bundle-slider-container"
      role="region"
      aria-roledescription="carousel"
      aria-label={`Nhóm sản phẩm mua kèm: ${activeSet.title}`}
      tabIndex={groupSlides.length > 1 ? 0 : -1}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") { event.preventDefault(); moveGroupSlide(-1); }
        if (event.key === "ArrowRight") { event.preventDefault(); moveGroupSlide(1); }
      }}
    >
      {groupSlides.length > 1 && groupSlideIndex > 0 && <button type="button" className="product-bundle-slider-arrow is-left" onClick={() => moveGroupSlide(-1)} aria-label="Xem 4 nhóm sản phẩm trước"><ChevronLeft aria-hidden="true" /></button>}
      <div className="product-bundle-slider-viewport">
        <div className="product-bundle-slider-track" style={{ transform: `translateX(-${groupSlideIndex * 100}%)` }}>
          {groupSlides.map((groups, slideIndex) => <div key={slideIndex} className="product-bundle-slide" aria-hidden={slideIndex !== groupSlideIndex}>
            <div className="product-bundle-items">
              {groups.map((group) => <article key={group.groupIndex} className="product-bundle-item"><div className="product-bundle-item-image"><img src={group.image} alt=""/></div><div className="product-bundle-item-info"><h4 className="product-bundle-item-title">{group.title}</h4><div className="product-bundle-item-bottom"><span className="product-bundle-item-promo">{group.discountLabel}</span><button type="button" className="product-bundle-item-btn" onClick={() => setOpenGroup(group.groupIndex)}>Chọn thêm <Plus aria-hidden="true"/></button></div></div></article>)}
            </div>
          </div>)}
        </div>
      </div>
      {groupSlides.length > 1 && groupSlideIndex < groupSlides.length - 1 && <button type="button" className="product-bundle-slider-arrow is-right" onClick={() => moveGroupSlide(1)} aria-label="Xem 4 nhóm sản phẩm tiếp theo"><ChevronRight aria-hidden="true" /></button>}
    </div>
    {groupSlides.length > 1 && <div className="product-bundle-pagination" aria-label="Chọn trang nhóm sản phẩm">{groupSlides.map((_, index) => <button key={index} type="button" className={`product-bundle-dot${index === groupSlideIndex ? " is-active" : ""}`} onClick={() => setGroupSlideIndex(index)} aria-label={`Trang ${index + 1}`} aria-current={index === groupSlideIndex ? "true" : undefined} />)}<span className="sr-only" aria-live="polite">Trang {groupSlideIndex + 1} trên {groupSlides.length}</span></div>}
    {selected.length > 0 && <section className="product-bundle-demo-section" aria-label="Sản phẩm đang mua kèm"><p className="product-bundle-demo-heading">Bạn đang mua kèm {selected.length} sản phẩm:</p><div className="product-bundle-demo-list">
      {selected.map((item) => { const priced = quotedItems.get(item.id); return <article key={item.id} className="product-bundle-demo-item"><div className="product-bundle-demo-image"><img src={item.thumbnail} alt=""/></div><div className="product-bundle-demo-copy"><p className="product-bundle-demo-name">{item.name}</p><div className="product-bundle-demo-prices"><span className="product-bundle-demo-sale">{money(priced ? priced.lineTotal : item.price * item.quantity)}</span>{priced && priced.comboDiscount > 0 && <span className="product-bundle-demo-original">{money(item.price * item.quantity)}</span>}</div></div><div className="product-bundle-demo-actions"><button type="button" className="product-bundle-demo-remove" onClick={() => setSelected((current) => current.filter((entry) => entry.id !== item.id))} aria-label={`Xóa ${item.name}`}><Trash2 aria-hidden="true"/></button><div className="product-bundle-demo-quantity"><button type="button" onClick={() => changeQuantity(item.id, -1)} disabled={item.quantity === 1} aria-label={`Giảm số lượng ${item.name}`}><Minus aria-hidden="true"/></button><span>{item.quantity}</span><button type="button" onClick={() => changeQuantity(item.id, 1)} aria-label={`Tăng số lượng ${item.name}`}><Plus aria-hidden="true"/></button></div></div></article>; })}
    </div></section>}
    <div className="product-bundle-footer"><div className="product-bundle-footer-summary"><div className="product-bundle-total"><span className="product-bundle-label">Tạm tính:</span><span className="product-bundle-price">{quoting ? "Đang tính..." : money(quote?.totals.total ?? Number(productData.price || 0))}</span></div><div className="product-bundle-savings"><span className="product-bundle-label">Tiết kiệm:</span><span className="product-bundle-discount">{money(quote?.totals.comboDiscount || 0)}</span></div></div><button type="button" className="product-bundle-buy-btn" disabled={!quote || selected.length === 0 || quoting} onClick={buyCombo}><ShoppingCart aria-hidden="true"/> Mua combo</button></div>
    {error && <p className="product-demo-message" role="alert">{error}</p>}
    <ProductBundleModal isOpen={openGroup !== null} onClose={() => setOpenGroup(null)} setId={activeSet.id} anchorProductId={Number(productData.id)} revision={activeSet.revision} groups={activeSet.groups} initialGroupIndex={openGroup ?? activeSet.groups[0].groupIndex} selectedProductIds={selected.map((item) => item.id)} onToggle={toggleProduct}/>
  </div>;
}
