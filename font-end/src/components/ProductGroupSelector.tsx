'use client';

import { Check, ChevronLeft, ChevronRight, Package } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { ProductGroupDetail } from '@/types/product-detail';

const ITEMS_PER_SLIDE = 4;
const price = (value: number) => `${new Intl.NumberFormat('vi-VN').format(Math.max(0, Math.round(value || 0)))}đ`;

function ProductThumbnail({ thumbnail }: { thumbnail: string }) {
  const [failed, setFailed] = useState(false);
  if (!thumbnail || failed) return <Package className="product-group-thumbnail-fallback" aria-hidden="true" />;
  return <img src={thumbnail} alt="" loading="lazy" onError={() => setFailed(true)} />;
}

export default function ProductGroupSelector({ productGroup }: { productGroup?: ProductGroupDetail | null }) {
  const [slideIndex, setSlideIndex] = useState(0);
  const slides = useMemo(() => {
    const items = productGroup?.items || [];
    return Array.from({ length: Math.ceil(items.length / ITEMS_PER_SLIDE) }, (_, index) => items.slice(index * ITEMS_PER_SLIDE, (index + 1) * ITEMS_PER_SLIDE));
  }, [productGroup]);
  useEffect(() => setSlideIndex(0), [productGroup?.id]);
  if (!productGroup || productGroup.items.length < 2) return null;

  const move = (delta: number) => setSlideIndex((current) => Math.max(0, Math.min(slides.length - 1, current + delta)));
  return (
    <section className="product-variant-block product-group-block" aria-labelledby={`product-group-${productGroup.id}-title`}>
      <p id={`product-group-${productGroup.id}-title`} className="product-variant-title">{productGroup.displayLabel}</p>
      <div
        className="product-group-carousel"
        role="region"
        aria-roledescription="carousel"
        aria-label={`${productGroup.displayLabel}: ${productGroup.name}`}
        tabIndex={slides.length > 1 ? 0 : -1}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1); }
          if (event.key === 'ArrowRight') { event.preventDefault(); move(1); }
        }}
      >
        {slides.length > 1 && slideIndex > 0 ? <button type="button" className="product-group-arrow is-left" onClick={() => move(-1)} aria-label="Xem 4 phiên bản trước"><ChevronLeft aria-hidden="true" /></button> : null}
        <div className="product-group-viewport">
          <div className="product-group-track" style={{ transform: `translateX(-${slideIndex * 100}%)` }}>
            {slides.map((items, index) => (
              <div key={index} className="product-group-slide" aria-hidden={index !== slideIndex}>
                <div className="product-variant-list">
                  {items.map((item) => {
                    const content = <><span className="product-variant-img"><ProductThumbnail thumbnail={item.thumbnail} /></span><span className="product-variant-info"><span className="product-variant-name">{item.displayName}</span><span className="product-variant-price">{price(item.price)}</span></span>{item.isCurrent ? <span className="product-variant-tick"><Check size={12} strokeWidth={4} aria-hidden="true" /></span> : null}</>;
                    return item.isCurrent
                      ? <span key={item.productId} className="product-variant-btn is-active" aria-current="page" title={item.name}>{content}</span>
                      : <Link key={item.productId} href={`/${item.slug.replace(/^\/+/, '')}`} className="product-variant-btn" title={item.name}>{content}</Link>;
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
        {slides.length > 1 && slideIndex < slides.length - 1 ? <button type="button" className="product-group-arrow is-right" onClick={() => move(1)} aria-label="Xem 4 phiên bản tiếp theo"><ChevronRight aria-hidden="true" /></button> : null}
      </div>
      {slides.length > 1 ? <div className="product-group-pagination" aria-label="Chọn trang phiên bản">{slides.map((_, index) => <button key={index} type="button" className={index === slideIndex ? 'is-active' : ''} onClick={() => setSlideIndex(index)} aria-label={`Trang ${index + 1}`} aria-current={index === slideIndex ? 'true' : undefined} />)}<span className="sr-only" aria-live="polite">Trang {slideIndex + 1} trên {slides.length}</span></div> : null}
    </section>
  );
}
