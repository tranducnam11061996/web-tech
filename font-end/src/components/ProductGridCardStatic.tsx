import Image from "next/image";
import type { ProductGridCardData } from "./ProductGridCard";
import ProductCardAttributeBadges from "./ProductCardAttributeBadges";
import ProductCardAddButton from "./ProductCardAddButton";
import FavoriteButton from "./FavoriteButton";
import ProductCardLink from "./ProductCardLink";
import { SHOW_PRODUCT_CARD_FAVORITES } from "@/lib/storefrontFeatureFlags";

const money = (value: number) => new Intl.NumberFormat("vi-VN").format(Math.max(0, Math.round(value || 0)));

export default function ProductGridCardStatic({ product }: { product: ProductGridCardData }) {
  const price = Number(product.price || 0);
  const marketPrice = Number(product.marketPrice || 0);
  const hasPrice = price > 0;
  const hasDiscount = hasPrice && marketPrice > price;
  const discountPercent = hasDiscount ? Math.round(((marketPrice - price) / marketPrice) * 100) : 0;
  const slug = product.slug || `product-${product.id}`;
  return <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-[#27272a] bg-gradient-to-b from-[#1a1a1d] to-[#111113] shadow-[0_4px_12px_rgba(0,0,0,0.2)] transition-[border-color,box-shadow] duration-200 ease-out hover:border-[#3f3f46] hover:shadow-[0_8px_30px_rgba(0,0,0,0.6)]">
    {hasDiscount ? <div className="absolute right-3 top-3 z-30 rounded-full bg-gradient-to-r from-red-600 via-rose-500 to-orange-500 px-3.5 py-1.5 text-[12px] font-black text-white">Giảm {discountPercent}%</div> : null}
    {SHOW_PRODUCT_CARD_FAVORITES ? <FavoriteButton productId={Number(product.id)} /> : null}
    <ProductCardLink href={`/${slug}`} className="flex h-full flex-1 flex-col">
      <div className="product-card-image-frame bg-[#151518]">
        {product.thumbnail ? <Image src={product.thumbnail} alt={product.name} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1535px) 20vw, 16.67vw" className="object-contain object-center" /> : <span className="text-xs font-bold text-zinc-600">TrucTiepGAME</span>}
        <ProductCardAttributeBadges badges={product.cardBadges} />
      </div>
      <div className="relative z-10 flex flex-1 flex-col p-4"><p className="mb-5 min-h-[52px] text-center text-[#f5f7fb] line-clamp-2">{product.name}</p><div className="mt-auto"><div className={`grid min-h-11 items-center gap-2 ${hasPrice ? "grid-cols-[minmax(0,1fr)_auto_44px]" : "grid-cols-1"}`}><div className="relative flex h-11 min-w-0 items-center">{hasDiscount ? <span className="absolute -top-1 left-0 text-[12px] font-semibold text-zinc-500 line-through">{money(marketPrice)}đ</span> : null}<strong className="min-w-0 bg-gradient-to-r from-white via-cyan-400 to-purple-500 bg-clip-text text-[17px] text-transparent">{hasPrice ? `${money(price)}đ` : "Liên hệ"}</strong></div>{hasPrice ? <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-emerald-500"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Sẵn hàng</span> : null}</div></div></div>
    </ProductCardLink>
    <ProductCardAddButton product={product} />
  </article>;
}
