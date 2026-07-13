"use client";

import { useState } from "react";
import { addCartItem } from "@/lib/cart";
import type { ProductGridCardData } from "./ProductGridCard";

export default function ProductCardAddButton({ product }: { product: ProductGridCardData }) {
  const [justAdded, setJustAdded] = useState(false);
  const price = Number(product.price || 0);
  if (price <= 0) return null;
  return <button type="button" aria-label={`Thêm ${product.name} vào giỏ hàng`} onClick={(event) => {
    event.preventDefault();
    event.stopPropagation();
    addCartItem({ productId: Number(product.id), slug: product.slug || `product-${product.id}`, name: product.name, sku: product.sku || "", thumbnail: product.thumbnail || "", price, marketPrice: Number(product.marketPrice || 0) });
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1500);
  }} className={`absolute bottom-4 right-4 z-20 flex h-11 w-11 items-center justify-center rounded-2xl border transition-all ${justAdded ? "border-emerald-400 bg-emerald-500/15 text-emerald-300" : "border-[#303036] bg-[#151518] text-cyan-300 hover:border-emerald-400 hover:text-emerald-300"}`}>
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.3" d={justAdded ? "M5 13l4 4L19 7" : "M6 6h15l-1.5 9h-12L6 6Zm0 0L5 3H2M9 20.25h.01M18 20.25h.01"} /></svg>
  </button>;
}
