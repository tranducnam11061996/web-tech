'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * SafeImage – Component ảnh an toàn cho toàn hệ thống Backend.
 * 
 * Cơ chế hoạt động:
 * 1. Hiển thị ảnh placeholder mặc định ngay lập tức (không delay).
 * 2. Khi component mount, tạo một Image() ẩn để tải ảnh thật.
 * 3. Nếu ảnh thật tải thành công → thay thế placeholder bằng ảnh thật (có hiệu ứng fade-in).
 * 4. Nếu ảnh thật bị lỗi (404, timeout, etc.) → giữ nguyên placeholder, KHÔNG retry.
 * 
 * Ưu điểm so với next/image:
 * - Không gây lỗi upstream trên server (vì không đi qua Next.js Image Optimization API).
 * - Không gây flood 404 errors trong terminal.
 * - Hiển thị nhanh hơn vì placeholder render ngay.
 */

type SafeImageProps = {
  src: string;
  alt: string;
  className?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  placeholderType?: 'product' | 'banner' | 'brand' | 'article' | 'generic';
};

// SVG placeholder cho từng loại nội dung
const placeholders: Record<string, string> = {
  product: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' fill='%23111827'/%3E%3Crect x='30' y='25' width='60' height='50' rx='4' fill='%231f2937' stroke='%23374151' stroke-width='1'/%3E%3Cpath d='M45 55 L55 45 L65 55 L75 40' stroke='%234b5563' stroke-width='2' fill='none'/%3E%3Ccircle cx='50' cy='38' r='5' fill='%234b5563'/%3E%3Crect x='30' y='82' width='60' height='6' rx='3' fill='%231f2937'/%3E%3Crect x='38' y='93' width='44' height='4' rx='2' fill='%23111827' stroke='%231f2937' stroke-width='0.5'/%3E%3C/svg%3E`,
  banner: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='80' viewBox='0 0 200 80'%3E%3Crect width='200' height='80' fill='%23111827'/%3E%3Crect x='10' y='10' width='180' height='60' rx='6' fill='%231f2937' stroke='%23374151' stroke-width='1'/%3E%3Ctext x='100' y='45' text-anchor='middle' fill='%234b5563' font-size='12' font-family='sans-serif'%3EBanner%3C/text%3E%3C/svg%3E`,
  brand: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%23111827'/%3E%3Ccircle cx='40' cy='35' r='18' fill='%231f2937' stroke='%23374151' stroke-width='1'/%3E%3Ctext x='40' y='40' text-anchor='middle' fill='%234b5563' font-size='10' font-family='sans-serif'%3EBrand%3C/text%3E%3Crect x='15' y='60' width='50' height='5' rx='2.5' fill='%231f2937'/%3E%3C/svg%3E`,
  article: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='100' viewBox='0 0 160 100'%3E%3Crect width='160' height='100' fill='%23111827'/%3E%3Crect x='10' y='10' width='140' height='55' rx='4' fill='%231f2937' stroke='%23374151' stroke-width='1'/%3E%3Crect x='10' y='72' width='100' height='6' rx='3' fill='%231f2937'/%3E%3Crect x='10' y='84' width='70' height='4' rx='2' fill='%23111827' stroke='%231f2937' stroke-width='0.5'/%3E%3C/svg%3E`,
  generic: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23111827'/%3E%3Crect x='20' y='20' width='60' height='40' rx='4' fill='%231f2937' stroke='%23374151' stroke-width='1'/%3E%3Cpath d='M35 45 L45 35 L55 45 L65 30' stroke='%234b5563' stroke-width='2' fill='none'/%3E%3Ccircle cx='40' cy='32' r='4' fill='%234b5563'/%3E%3Crect x='20' y='68' width='60' height='5' rx='2.5' fill='%231f2937'/%3E%3C/svg%3E`,
};

// Cache ảnh đã thử tải rồi (tránh retry nếu cùng URL xuất hiện nhiều lần)
const imageCache = new Map<string, 'loading' | 'loaded' | 'error'>();

export function SafeImage({
  src,
  alt,
  className = '',
  fill = false,
  width,
  height,
  placeholderType = 'generic',
}: SafeImageProps) {
  const [displaySrc, setDisplaySrc] = useState<string>(placeholders[placeholderType] || placeholders.generic);
  const [loaded, setLoaded] = useState(false);
  const attemptedRef = useRef(false);

  useEffect(() => {
    // Không tải nếu src rỗng hoặc đã là data URI
    if (!src || src.startsWith('data:')) return;
    // Không retry nếu đã thử rồi
    if (attemptedRef.current) return;
    attemptedRef.current = true;

    // Nếu ảnh đã được cache là lỗi → bỏ qua luôn
    const cached = imageCache.get(src);
    if (cached === 'error') return;
    if (cached === 'loaded') {
      setDisplaySrc(src);
      setLoaded(true);
      return;
    }

    // Đánh dấu đang tải
    imageCache.set(src, 'loading');

    // Tạo Image ẩn để preload
    const img = new window.Image();
    img.src = src;

    img.onload = () => {
      imageCache.set(src, 'loaded');
      setDisplaySrc(src);
      setLoaded(true);
    };

    img.onerror = () => {
      // Đánh dấu lỗi → không bao giờ thử lại URL này nữa
      imageCache.set(src, 'error');
      // Giữ nguyên placeholder
    };

    // Cleanup
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  const style: React.CSSProperties = fill
    ? { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'contain' }
    : {};

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={displaySrc}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      className={`${className} transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-70'}`}
      style={style}
      loading="lazy"
      decoding="async"
    />
  );
}
