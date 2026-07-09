'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cleanMenuTextTrimmed, resolveMenuHexColor, resolveMenuMediaUrl } from '@/lib/menuUtils';

export type HeroBanner = {
  id: number | string;
  name: string;
  imageUrl: string;
  mobileImageUrl?: string;
  targetUrl?: string;
  altText?: string;
  renderMode?: 'image' | 'hybrid';
  text?: {
    headline?: string;
    subheading?: string;
    ctaLabel?: string;
  };
  style?: {
    backgroundColor?: string;
    textColor?: string;
  };
};

function bannerImageUrl(banner: HeroBanner) {
  return resolveMenuMediaUrl(banner.mobileImageUrl || banner.imageUrl);
}

function bannerDesktopImageUrl(banner: HeroBanner) {
  return resolveMenuMediaUrl(banner.imageUrl);
}

function slideStyle(banner: HeroBanner) {
  return {
    backgroundColor: resolveMenuHexColor(banner.style?.backgroundColor, '#474747'),
  };
}

export function HeroBannerCarousel({ banners }: { banners: HeroBanner[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartRef = useRef<number | null>(null);
  const safeBanners = useMemo(() => banners.filter((banner) => banner.imageUrl || banner.renderMode === 'hybrid'), [banners]);
  const hasMultipleBanners = safeBanners.length > 1;

  useEffect(() => {
    if (!hasMultipleBanners || isPaused) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % safeBanners.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [hasMultipleBanners, isPaused, safeBanners.length]);

  useEffect(() => {
    if (activeIndex >= safeBanners.length) setActiveIndex(0);
  }, [activeIndex, safeBanners.length]);

  const move = (direction: 1 | -1) => {
    if (!hasMultipleBanners) return;
    setActiveIndex((current) => (current + direction + safeBanners.length) % safeBanners.length);
  };

  return (
    <div
      className="hero-carousel"
      id="heroCarousel"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={(event) => {
        touchStartRef.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        const start = touchStartRef.current;
        touchStartRef.current = null;
        if (start === null) return;
        const delta = (event.changedTouches[0]?.clientX ?? start) - start;
        if (Math.abs(delta) > 40) move(delta < 0 ? 1 : -1);
      }}
    >
      <div className="hero-track" id="heroTrack" style={{ transform: `translateX(-${activeIndex * 100}%)` }}>
        {safeBanners.map((banner) => {
          const headline = cleanMenuTextTrimmed(banner.text?.headline || banner.name);
          const subheading = cleanMenuTextTrimmed(banner.text?.subheading);
          const ctaLabel = cleanMenuTextTrimmed(banner.text?.ctaLabel);
          const content = (
            <div className="hero-slide dynamic-banner-slide" style={slideStyle(banner)}>
              {bannerDesktopImageUrl(banner) ? (
                <picture>
                  {banner.mobileImageUrl ? <source media="(max-width: 640px)" srcSet={bannerImageUrl(banner)} /> : null}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={bannerDesktopImageUrl(banner)} alt={banner.altText || banner.name || 'Banner'} className="hero-banner-image" />
                </picture>
              ) : null}
              {banner.renderMode === 'hybrid' ? (
                <div className="slide-content hero-banner-overlay" style={{ color: resolveMenuHexColor(banner.style?.textColor, '#ffffff') }}>
                  <div className="slide-left">
                    <h2 className="apple-title">{headline}</h2>
                    {subheading ? <p className="apple-desc">{subheading}</p> : null}
                    {ctaLabel ? <span className="btn-buy">{ctaLabel}</span> : null}
                  </div>
                </div>
              ) : null}
            </div>
          );

          return banner.targetUrl ? (
            <a key={banner.id} href={banner.targetUrl} className="hero-slide-link" aria-label={banner.altText || banner.name}>
              {content}
            </a>
          ) : (
            <div key={banner.id} className="hero-slide-link">
              {content}
            </div>
          );
        })}
      </div>

      {hasMultipleBanners ? (
        <>
          <button
            type="button"
            className="hero-nav-button hero-nav-prev"
            aria-label="Banner trước"
            onClick={(event) => {
              event.stopPropagation();
              move(-1);
            }}
          >
            <ChevronLeft className="hero-nav-icon" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="hero-nav-button hero-nav-next"
            aria-label="Banner tiếp theo"
            onClick={(event) => {
              event.stopPropagation();
              move(1);
            }}
          >
            <ChevronRight className="hero-nav-icon" aria-hidden="true" />
          </button>
        </>
      ) : null}

      <div className="indicators-wrapper">
        <div className="indicators-pill" id="indicators">
          {safeBanners.map((banner, index) => (
            <button
              key={banner.id}
              type="button"
              aria-label={`Chuyển tới banner ${index + 1}`}
              onClick={() => setActiveIndex(index)}
              className={`indicator-dash ${index === activeIndex ? 'active' : ''}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
