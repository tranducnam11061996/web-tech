"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

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
  decoding = "async",
  onLoad,
  onError,
  ...props
}: ProgressiveImageProps) {
  const placeholder = useMemo(() => getPlaceholder(fallbackText), [fallbackText]);
  const resolvedSrc = src || placeholder;
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageState, setImageState] = useState(() => ({
    src: resolvedSrc,
    loaded: false,
  }));

  useEffect(() => {
    setImageState((current) => {
      if (current.src === resolvedSrc) return current;
      return { src: resolvedSrc, loaded: false };
    });
  }, [resolvedSrc]);

  useEffect(() => {
    const image = imageRef.current;
    if (!image?.complete) return;

    const settledSrc = imageState.src;
    const loadedSuccessfully = image.naturalWidth > 0;
    setImageState((current) => {
      if (current.src !== settledSrc) return current;
      if (!loadedSuccessfully && current.src !== placeholder) {
        return { src: placeholder, loaded: false };
      }
      if (current.loaded) return current;
      return { ...current, loaded: true };
    });
  }, [imageState.src, placeholder]);

  return (
    <img
      {...props}
      ref={imageRef}
      src={imageState.src}
      alt={alt}
      loading={loading}
      decoding={decoding}
      onLoad={(event) => {
        const loadedSrc = imageState.src;
        setImageState((current) => {
          if (current.src !== loadedSrc || current.loaded) return current;
          return { ...current, loaded: true };
        });
        onLoad?.(event);
      }}
      onError={(event) => {
        const failedSrc = event.currentTarget.getAttribute("src") || imageState.src;
        setImageState((current) => {
          if (current.src !== failedSrc) return current;
          if (current.src !== placeholder) return { src: placeholder, loaded: false };
          if (current.loaded) return current;
          return { ...current, loaded: true };
        });
        onError?.(event);
      }}
      className={`${className} transition-[opacity,transform,filter] duration-300 ${
        disableLoadingEffects || imageState.loaded
          ? "opacity-100 blur-0 scale-100"
          : "opacity-60 blur-sm scale-95"
      }`}
    />
  );
}
