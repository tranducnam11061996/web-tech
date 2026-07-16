"use client";

import { useState } from "react";
import type { MouseEvent } from "react";
import { addCartItem } from "@/lib/cart";
import { SHOW_PRODUCT_CARD_FAVORITES } from "@/lib/storefrontFeatureFlags";
import ProgressiveImage from "./ProgressiveImage";
import ProductCardAttributeBadges, { type ProductCardAttributeBadge } from "./ProductCardAttributeBadges";
import FavoriteButton from "./FavoriteButton";
import ProductCardLink from "./ProductCardLink";

export interface ProductGridCardData {
  id: number;
  slug: string;
  name: string;
  sku?: string;
  thumbnail?: string;
  price?: number;
  marketPrice?: number;
  brand?: string;
  cardBadges?: ProductCardAttributeBadge[];
}

interface ProductGridCardProps {
  product: ProductGridCardData;
  onFavoriteChange?: (favorited: boolean) => void;
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("vi-VN").format(Math.max(0, Math.round(value || 0)));
}

function CurrencyValue({
  value,
  className = "",
  currencyClassName = "",
}: {
  value: number;
  className?: string;
  currencyClassName?: string;
}) {
  return (
    <span className={`tabular-nums ${className}`}>
      {formatPrice(value)}
      <span
        className={`ml-0.5 align-top text-[12px] font-bold underline decoration-1 underline-offset-[2px] ${currencyClassName}`}
      >
        đ
      </span>
    </span>
  );
}

export default function ProductGridCard({ product, onFavoriteChange }: ProductGridCardProps) {
  const [justAdded, setJustAdded] = useState(false);
  const price = Number(product.price || 0);
  const marketPrice = Number(product.marketPrice || 0);
  const hasPrice = price > 0;
  const hasDiscount = hasPrice && marketPrice > price;
  const discountPercent = hasDiscount ? Math.round(((marketPrice - price) / marketPrice) * 100) : 0;
  const productSlug = product.slug || `product-${product.id}`;

  const handleAddToCart = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!hasPrice) return;

    addCartItem({
      productId: Number(product.id),
      slug: productSlug,
      name: product.name || "Sản phẩm",
      sku: product.sku || "",
      thumbnail: product.thumbnail || "",
      price,
      marketPrice,
    });

    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1500);
  };

  return (
    <article
      className="product-grid-card group relative flex h-full flex-col overflow-hidden rounded-xl border border-[#27272a] bg-gradient-to-b from-[#1a1a1d] to-[#111113] shadow-[0_4px_12px_rgba(0,0,0,0.2)] transition-[border-color,box-shadow] duration-200 ease-out hover:border-[#3f3f46] hover:shadow-[0_8px_30px_rgba(0,0,0,0.6)]"
      data-product-card
    >
      {hasDiscount ? (
        <div className="product-grid-card-discount absolute right-3 top-3 z-30 rounded-full bg-gradient-to-r from-red-600 via-rose-500 to-orange-500 px-2.5 py-1 text-[10px] font-black text-white shadow-[0_10px_26px_rgba(239,68,68,0.3)] ring-1 ring-white/10">
          Giảm {discountPercent}%
        </div>
      ) : null}

      {SHOW_PRODUCT_CARD_FAVORITES ? (
        <FavoriteButton
          productId={Number(product.id)}
          onChange={onFavoriteChange}
        />
      ) : null}

      <ProductCardLink href={`/${productSlug}`} className="flex h-full flex-1 flex-col">
        <div className="product-card-image-frame bg-[#151518]">
          <ProgressiveImage
            src={product.thumbnail || ""}
            alt={product.name}
            className="h-full w-full object-contain object-center"
          />
          <ProductCardAttributeBadges badges={product.cardBadges} />
        </div>

        <div
          className="product-grid-card-content relative z-10 flex flex-1 flex-col p-2.5"
          data-product-card-content
        >
          <p className="product-grid-card-title mb-3 min-h-10 text-center text-[13px] leading-5 text-[#f5f7fb] drop-shadow-[0_2px_10px_rgba(255,255,255,0.08)] line-clamp-2">
            {product.name}
          </p>

          <div
            className={`product-grid-card-footer mt-auto grid min-h-11 items-center gap-1 ${
              hasPrice
                ? "product-grid-card-footer-priced grid-cols-[minmax(0,1fr)_auto_36px]"
                : "grid-cols-1"
            }`}
            data-product-card-footer
          >
            <div className="relative flex h-11 min-w-0 items-center">
              {hasDiscount ? (
                <div
                  className="product-grid-card-market-price absolute left-0 top-0 whitespace-nowrap text-[10px] font-semibold leading-none text-zinc-500 line-through decoration-zinc-500/80"
                  data-product-market-price
                >
                  <CurrencyValue value={marketPrice} currencyClassName="product-grid-card-market-currency relative -top-0.5 text-[8px]" />
                </div>
              ) : null}

              <div
                className="product-grid-card-sale-price min-w-0 whitespace-nowrap bg-gradient-to-r from-white via-cyan-400 to-purple-500 bg-clip-text text-[13px] font-extrabold text-transparent"
                data-product-sale-price
              >
                {hasPrice ? <CurrencyValue value={price} currencyClassName="product-grid-card-sale-currency text-[9px]" /> : "Liên hệ"}
              </div>
            </div>

            {hasPrice ? (
              <span
                className="flex shrink-0 items-center justify-center gap-1 whitespace-nowrap text-[11px] font-bold text-[#10b981]"
                data-product-stock-status
              >
                <span className="size-1.5 rounded-full bg-[#10b981]" aria-hidden="true" />
                <span className="product-grid-card-stock-label" data-product-stock-label>
                  Sẵn hàng
                </span>
              </span>
            ) : null}
          </div>
        </div>
      </ProductCardLink>

      {hasPrice ? (
        <button
          type="button"
          aria-label="Thêm vào giỏ hàng"
          data-product-cart-button
          onClick={handleAddToCart}
          className={`product-grid-card-cart absolute bottom-3.5 right-2.5 z-20 flex size-9 items-center justify-center rounded-xl border transition-all ${
            justAdded
              ? "border-emerald-400 bg-emerald-500/15 text-emerald-300 shadow-[0_0_22px_rgba(16,185,129,0.24)]"
              : "border-[#303036] bg-[#151518] text-cyan-300 hover:border-emerald-400 hover:text-emerald-300 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)]"
          }`}
        >
          {justAdded ? (
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M6 6h15l-1.5 9h-12L6 6Z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M6 6 5 3H2" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 20.25h.01M18 20.25h.01" />
            </svg>
          )}
        </button>
      ) : null}
    </article>
  );
}
