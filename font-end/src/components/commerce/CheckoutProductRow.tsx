"use client";

import Link from "next/link";
import ProgressiveImage from "@/components/ProgressiveImage";
import { formatCurrency } from "@/lib/cart";

export type CheckoutDisplayItem = {
  productId: number;
  quantity: number;
  name: string;
  sku?: string;
  slug?: string;
  thumbnail?: string;
  price: number;
  marketPrice?: number;
  available?: boolean;
  caption?: string;
};

export function CheckoutProductRow({ item }: { item: CheckoutDisplayItem }) {
  const available = item.available !== false;
  const href = `/${String(item.slug || "").replace(/^\/+/, "")}`;
  const hasMarketPrice = available && Number(item.marketPrice || 0) > item.price;
  const content = (
    <>
      <ProgressiveImage
        src={item.thumbnail || "https://placehold.co/300x300/1f2937/a1a1aa?text=TrucTiepGAME"}
        alt={item.name}
        className="size-full object-contain p-2"
      />
    </>
  );

  return (
    <div className="flex items-center gap-4 border-b border-[#1a1a1e] p-4 last:border-b-0">
      {item.slug ? (
        <Link href={href} className="size-14 shrink-0 overflow-hidden rounded-md border border-[#1a1a1e] bg-[#0d0d10]">
          {content}
        </Link>
      ) : (
        <div className="size-14 shrink-0 overflow-hidden rounded-md border border-[#1a1a1e] bg-[#0d0d10]">{content}</div>
      )}
      <div className="min-w-0 flex-1">
        {item.slug ? <Link href={href} className="line-clamp-2 text-sm font-medium text-white transition hover:text-cyan-400">{item.name}</Link> : <p className="line-clamp-2 text-sm font-medium text-white">{item.name}</p>}
        <p className="text-[11px] text-gray-500">{item.caption || `[${item.sku || item.productId}]`}</p>
        {!available && <p className="mt-1 text-[11px] text-red-400">Sản phẩm hiện chưa thể đặt mua</p>}
      </div>
      <div className="w-8 shrink-0 text-center"><p className="text-sm text-gray-400">x{item.quantity}</p></div>
      <div className="w-28 shrink-0 text-right">
        <p className="text-sm font-bold text-red-500">{available ? formatCurrency(item.price) : "Liên hệ"}</p>
        {hasMarketPrice && <p className="text-[11px] text-gray-500 line-through">{formatCurrency(Number(item.marketPrice))}</p>}
      </div>
    </div>
  );
}
