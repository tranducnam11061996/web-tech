"use client";

import React, { useEffect, useMemo, useState } from "react";

interface ProgressiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackText?: string;
  className?: string;
  disableLoadingEffects?: boolean;
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
  fallbackText = "TrucTiepGAME",
  className = "",
  disableLoadingEffects = false,
  loading = "lazy",
  ...props
}: ProgressiveImageProps) {
  const placeholder = useMemo(() => getPlaceholder(fallbackText), [fallbackText]);
  const [imgSrc, setImgSrc] = useState(() => src || placeholder);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setImgSrc(src || placeholder);
    setIsLoaded(false);
  }, [placeholder, src]);

  return (
    <img
      src={imgSrc}
      alt={alt}
      loading={loading}
      decoding="async"
      onLoad={() => setIsLoaded(true)}
      onError={() => {
        if (imgSrc !== placeholder) setImgSrc(placeholder);
        setIsLoaded(true);
      }}
      className={`${className} transition-all duration-500 ${
        disableLoadingEffects || isLoaded
          ? "opacity-100 blur-0 scale-100"
          : "opacity-60 blur-md scale-95"
      }`}
      {...props}
    />
  );
}
