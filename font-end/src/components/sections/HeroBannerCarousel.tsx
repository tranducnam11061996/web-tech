'use client';

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

const AUTOPLAY_INTERVAL_MS = 5_000;
const SWIPE_THRESHOLD_PX = 40;

type TouchGesture = {
  startX: number;
  currentX: number;
  dragged: boolean;
};

function desktopImageUrl(banner: HeroBanner) {
  return resolveMenuMediaUrl(banner.imageUrl);
}

function mobileImageUrl(banner: HeroBanner) {
  return resolveMenuMediaUrl(banner.mobileImageUrl || banner.imageUrl);
}

export function HeroBannerCarousel({ banners }: { banners: HeroBanner[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const [isTouching, setIsTouching] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const [isInViewport, setIsInViewport] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const carouselRef = useRef<HTMLDivElement>(null);
  const touchGestureRef = useRef<TouchGesture | null>(null);
  const suppressClickRef = useRef(false);
  const safeBanners = useMemo(
    () => banners.filter((banner) => banner.imageUrl || banner.renderMode === 'hybrid'),
    [banners],
  );
  const hasMultipleBanners = safeBanners.length > 1;
  const isInteractionPaused = isHovered || isFocusWithin || isTouching;

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotionPreference = () => setPrefersReducedMotion(mediaQuery.matches);
    updateMotionPreference();
    mediaQuery.addEventListener('change', updateMotionPreference);
    return () => mediaQuery.removeEventListener('change', updateMotionPreference);
  }, []);

  useEffect(() => {
    const updateVisibility = () => setIsDocumentVisible(document.visibilityState === 'visible');
    updateVisibility();
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  useEffect(() => {
    const carousel = carouselRef.current;
    if (!carousel || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsInViewport(entry.isIntersecting),
      { threshold: 0.15 },
    );
    observer.observe(carousel);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (
      !hasMultipleBanners
      || isInteractionPaused
      || !isDocumentVisible
      || !isInViewport
      || prefersReducedMotion
    ) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % safeBanners.length);
    }, AUTOPLAY_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [hasMultipleBanners, isDocumentVisible, isInViewport, isInteractionPaused, prefersReducedMotion, safeBanners.length]);

  useEffect(() => {
    if (activeIndex >= safeBanners.length) setActiveIndex(0);
  }, [activeIndex, safeBanners.length]);

  const move = (direction: 1 | -1) => {
    if (!hasMultipleBanners) return;
    setActiveIndex((current) => (current + direction + safeBanners.length) % safeBanners.length);
  };

  if (safeBanners.length === 0) return null;

  return (
    <div
      ref={carouselRef}
      id="heroCarousel"
      data-section3-carousel
      role="region"
      aria-label="Banner khuyến mãi trang chủ"
      aria-roledescription="carousel"
      tabIndex={0}
      className="relative mx-4 my-4 overflow-hidden rounded-2xl bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111] md:mx-8 md:mb-8 md:mt-7"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocusCapture={() => setIsFocusWithin(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsFocusWithin(false);
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          move(-1);
        } else if (event.key === 'ArrowRight') {
          event.preventDefault();
          move(1);
        } else if (event.key === 'Home' && hasMultipleBanners) {
          event.preventDefault();
          setActiveIndex(0);
        } else if (event.key === 'End' && hasMultipleBanners) {
          event.preventDefault();
          setActiveIndex(safeBanners.length - 1);
        }
      }}
      onTouchStart={(event) => {
        const startX = event.touches[0]?.clientX;
        if (typeof startX !== 'number') return;
        touchGestureRef.current = { startX, currentX: startX, dragged: false };
        setIsTouching(true);
      }}
      onTouchMove={(event) => {
        const gesture = touchGestureRef.current;
        const currentX = event.touches[0]?.clientX;
        if (!gesture || typeof currentX !== 'number') return;
        gesture.currentX = currentX;
        if (Math.abs(currentX - gesture.startX) > 8) gesture.dragged = true;
      }}
      onTouchEnd={() => {
        const gesture = touchGestureRef.current;
        touchGestureRef.current = null;
        setIsTouching(false);
        if (!gesture) return;
        const delta = gesture.currentX - gesture.startX;
        if (Math.abs(delta) >= SWIPE_THRESHOLD_PX) move(delta < 0 ? 1 : -1);
        if (gesture.dragged) {
          suppressClickRef.current = true;
          window.setTimeout(() => { suppressClickRef.current = false; }, 500);
        }
      }}
      onTouchCancel={() => {
        touchGestureRef.current = null;
        setIsTouching(false);
      }}
      onClickCapture={(event) => {
        if (!suppressClickRef.current) return;
        event.preventDefault();
        event.stopPropagation();
        suppressClickRef.current = false;
      }}
    >
      <div
        id="heroTrack"
        data-section3-track
        className="flex h-full transition-transform duration-500 ease-out motion-reduce:transition-none"
        style={{ transform: `translate3d(-${activeIndex * 100}%, 0, 0)` }}
      >
        {safeBanners.map((banner, index) => {
          const isActive = index === activeIndex;
          const headline = cleanMenuTextTrimmed(banner.text?.headline || banner.name);
          const subheading = cleanMenuTextTrimmed(banner.text?.subheading);
          const ctaLabel = cleanMenuTextTrimmed(banner.text?.ctaLabel);
          const desktopUrl = desktopImageUrl(banner);
          const mobileUrl = mobileImageUrl(banner);
          const altText = cleanMenuTextTrimmed(banner.altText || banner.name || 'Banner');
          const slide = (
            <div
              className="relative size-full overflow-hidden bg-[#474747]"
              style={{ backgroundColor: resolveMenuHexColor(banner.style?.backgroundColor, '#474747') }}
            >
              {desktopUrl ? (
                <picture className="absolute inset-0 block size-full">
                  {banner.mobileImageUrl ? <source media="(max-width: 1024px)" srcSet={mobileUrl} /> : null}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={desktopUrl}
                    alt={altText}
                    width={1920}
                    height={394}
                    loading={index === 0 ? 'eager' : 'lazy'}
                    fetchPriority={index === 0 ? 'high' : 'low'}
                    decoding={index === 0 ? 'sync' : 'async'}
                    draggable={false}
                    className="size-full object-cover object-center"
                  />
                </picture>
              ) : null}

              {banner.renderMode === 'hybrid' ? (
                <div className="pointer-events-none absolute inset-0 flex select-none items-center justify-start bg-[linear-gradient(90deg,rgba(0,0,0,0.38),rgba(0,0,0,0.05))]">
                  <div
                    data-section3-overlay
                    className="mx-6 w-1/2 text-left sm:mx-10 sm:max-w-[480px] sm:-translate-y-[13px] md:ml-16 md:mr-10 md:max-w-[600px] lg:ml-20 lg:max-w-[640px] xl:ml-24"
                    style={{ color: resolveMenuHexColor(banner.style?.textColor, '#ffffff') }}
                  >
                    <h2
                      data-section3-headline
                      className="text-balance text-[clamp(1.4rem,5vw,3.5rem)] font-black leading-[1.1] [text-shadow:0_0_40px_rgba(255,255,255,0.5),0_0_80px_rgba(255,255,255,0.3),0_4px_8px_rgba(0,0,0,0.8)] lg:text-6xl min-[1500px]:text-7xl"
                    >
                      {headline}
                    </h2>
                    {subheading ? (
                      <p
                        data-section3-subheading
                        className="mt-3 hidden text-pretty text-sm opacity-[0.85] min-[576px]:block lg:hidden min-[1500px]:block min-[1500px]:text-base [text-shadow:0_3px_12px_rgba(0,0,0,0.55)]"
                      >
                        {subheading}
                      </p>
                    ) : null}
                    {ctaLabel ? (
                      <div className="mt-2 lg:mt-4">
                        <span
                          data-section3-cta
                          className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-[linear-gradient(135deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.06)_100%)] px-2.5 py-1.5 text-xs font-semibold shadow-[0_12px_30px_rgba(0,0,0,0.4)] backdrop-blur-md transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100 min-[1500px]:gap-2 min-[1500px]:px-5 min-[1500px]:py-2.5 min-[1500px]:text-sm"
                        >
                          <span>{ctaLabel}</span>
                          <svg aria-hidden="true" className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          );

          return (
            <div
              key={banner.id}
              id={`hero-slide-${banner.id}`}
              data-section3-slide
              data-active={isActive}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} / ${safeBanners.length}: ${altText}`}
              aria-hidden={!isActive}
              className="aspect-[1024/397] min-w-0 shrink-0 grow-0 basis-full min-[1025px]:aspect-[1920/394]"
            >
              {banner.targetUrl ? (
                <a
                  href={banner.targetUrl}
                  className="group block size-full text-inherit no-underline"
                  aria-label={altText}
                  tabIndex={isActive ? 0 : -1}
                >
                  {slide}
                </a>
              ) : slide}
            </div>
          );
        })}
      </div>

      {hasMultipleBanners ? (
        <div
          data-section3-indicators
          className="absolute bottom-6 left-1/2 hidden max-w-[85vw] -translate-x-1/2 translate-y-1/2 rounded-full border border-white/25 bg-[linear-gradient(135deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.06)_100%)] p-1.5 shadow-[0_8px_20px_rgba(0,0,0,0.3)] backdrop-blur-md sm:flex"
        >
          <div className="flex gap-2 overflow-hidden rounded-md p-1">
            {safeBanners.map((banner, index) => (
              <button
                key={banner.id}
                type="button"
                aria-label={`Chuyển tới banner ${index + 1}`}
                aria-pressed={index === activeIndex}
                data-active={index === activeIndex}
                onClick={() => setActiveIndex(index)}
                className="h-1.5 w-6 shrink-0 rounded-full bg-white/40 transition-[background-color,box-shadow] duration-200 data-[active=true]:bg-white data-[active=true]:shadow-[0_0_8px_rgba(255,255,255,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white motion-reduce:transition-none"
              >
                <span className="sr-only">Chuyển tới banner {index + 1}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
