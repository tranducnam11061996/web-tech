"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

interface ProgressiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackText?: string;
  className?: string;
}

const placeholderCache = new Map<string, string>();

function getPlaceholder(text: string) {
  const cached = placeholderCache.get(text);
  if (cached) return cached;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
    <rect width="100%" height="100%" fill="#1b1c1d"/>
    <text x="50%" y="50%" font-family="sans-serif" font-size="20px" fill="#444" text-anchor="middle" dy=".3em" font-weight="bold">${text}</text>
  </svg>`;
  const placeholder = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  placeholderCache.set(text, placeholder);
  return placeholder;
}

export default function ProgressiveImage({
  src,
  alt,
  fallbackText = "HACOM",
  className = "",
  loading = "lazy",
  ...props
}: ProgressiveImageProps) {
  const placeholder = useMemo(() => getPlaceholder(fallbackText), [fallbackText]);
  const [imgSrc, setImgSrc] = useState(() => placeholder);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setImgSrc(placeholder);
    setIsLoaded(false);
    if (!src) return;

    let cancelled = false;
    let observer: IntersectionObserver | null = null;

    const loadImage = () => {
      const image = new Image();
      image.src = src;
      image.onload = () => {
        if (cancelled) return;
        setImgSrc(src);
        setIsLoaded(true);
      };
    };

    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          observer?.disconnect();
          loadImage();
        },
        { rootMargin: "50px" },
      );

      if (imgRef.current) observer.observe(imgRef.current);
    } else {
      loadImage();
    }

    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [placeholder, src]);

  return (
    <img
      ref={imgRef}
      src={imgSrc}
      alt={alt}
      loading={loading}
      className={`${className} transition-all duration-500 ${
        isLoaded ? "opacity-100 blur-0 scale-100" : "opacity-60 blur-md scale-95"
      }`}
      {...props}
    />
  );
}
