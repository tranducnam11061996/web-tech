"use client";

import { useState } from "react";
import ProductGridCard, { type ProductGridCardData } from "./ProductGridCard";

export default function SimilarProducts({ products = [] }: { products?: ProductGridCardData[] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const visibleProducts = isExpanded ? products.slice(0, 15) : products.slice(0, 5);

  return (
    <section className="mx-auto max-w-[1800px] px-4 py-6 md:px-6" aria-labelledby="similar-products-title">
      <div className="rounded-2xl border border-[#1a1a1e] bg-[#111115] p-4 md:p-6">
        <div className="mb-5">
          <h2 id="similar-products-title" className="text-xl font-bold text-white md:text-2xl">
            Sản phẩm tương tự
          </h2>
        </div>

        {visibleProducts.length > 0 ? (
          <div id="similar-products-grid" className="grid min-w-0 grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {visibleProducts.map((product) => <ProductGridCard key={product.id} product={product} />)}
          </div>
        ) : (
          <p role="status" className="rounded-xl border border-dashed border-[#27272a] py-10 text-center text-sm text-zinc-500">
            Chưa có sản phẩm tương tự phù hợp.
          </p>
        )}

        {products.length > 5 ? (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              className="show-btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              aria-controls="similar-products-grid"
              aria-expanded={isExpanded}
              onClick={() => setIsExpanded((expanded) => !expanded)}
            >
              {isExpanded ? "Thu gọn" : `Xem thêm (${Math.min(products.length, 15) - 5})`}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
