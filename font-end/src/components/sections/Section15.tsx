"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

export type HomepageBrand = {
  id: number;
  name: string;
  slug: string;
  image: string;
  productCount: number;
};

export default function Section15({ brands = [] }: { brands?: HomepageBrand[] }) {
  const [expanded, setExpanded] = useState(false);
  if (!brands.length) return null;
  const visibleBrands = expanded ? brands : brands.slice(0, 24);
  const hasMore = brands.length > 24;

  return (
    <section className="section-15 py-10 bg-dark-200" id="section-15" aria-labelledby="homepage-brands-title">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="brands-section">
          <div className="section-header">
            <h2 className="section-title" id="homepage-brands-title">Thương hiệu <span className="highlight">chúng tôi phân phối</span></h2>
            <span className="text-xs font-semibold text-zinc-500">{brands.length} thương hiệu</span>
          </div>
          <div className="brands-grid" id="brandsGrid">
            {visibleBrands.map((brand) => (
              <Link key={brand.id} href={`/brand/${brand.slug}`} className="brand-card" title={`${brand.name} · ${brand.productCount} sản phẩm`}>
                {brand.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={brand.image} alt={`Logo ${brand.name}`} loading="lazy" className="brand-logo-image" />
                ) : (
                  <span className="brand-name">{brand.name}</span>
                )}
                <span className="sr-only">Xem {brand.productCount} sản phẩm {brand.name}</span>
              </Link>
            ))}
          </div>
          {hasMore ? (
            <div className={`expand-overlay ${expanded ? "is-expanded" : ""}`}>
              <button
                type="button"
                className={`expand-btn ${expanded ? "rotated" : ""}`}
                aria-expanded={expanded}
                aria-controls="brandsGrid"
                aria-label={expanded ? "Thu gọn danh sách thương hiệu" : `Xem thêm ${brands.length - 24} thương hiệu`}
                onClick={() => setExpanded((value) => !value)}
              >
                <ChevronDown aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
