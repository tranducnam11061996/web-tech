"use client";

import React, { useState, useEffect, useRef } from "react";

interface ProgressiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackText?: string;
  className?: string;
}

export default function ProgressiveImage({
  src,
  alt,
  fallbackText = "TrucTiepGAME",
  className = "",
  ...props
}: ProgressiveImageProps) {
  // SVG Placeholder with a smooth CSS-based shimmer animation instead of static text
  const placeholder = `data:image/svg+xml;base64,${btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <rect width="100%" height="100%" fill="#1b1c1d"/>
      <text x="50%" y="50%" font-family="sans-serif" font-size="20px" fill="#444" text-anchor="middle" dy=".3em" font-weight="bold">${fallbackText}</text>
    </svg>`
  )}`;

  const [imgSrc, setImgSrc] = useState(placeholder);
  const [status, setStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle');
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!src) {
      setStatus('error');
      return;
    }

    // Optimization: Intersection Observer for Lazy Loading
    // Only load the real image when it enters the viewport
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && status === 'idle') {
          setStatus('loading');
          const img = new Image();
          img.src = src;
          
          img.onload = () => {
            setImgSrc(src);
            setStatus('loaded');
          };
          
          img.onerror = () => {
            setStatus('error');
            // Remains as placeholder
          };
          
          observer.disconnect();
        }
      },
      { rootMargin: "50px" } // Start loading 50px before it enters the viewport
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src, status]);

  const isLoaded = status === 'loaded';

  return (
    <img
      ref={imgRef}
      src={imgSrc}
      alt={alt}
      className={`${className} transition-all duration-500 ${
        isLoaded ? "opacity-100 blur-0 scale-100" : "opacity-60 blur-md scale-95"
      }`}
      {...props}
    />
  );
}
