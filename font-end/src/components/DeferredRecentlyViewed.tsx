"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { ProductGridCardData } from "./ProductGridCard";

const RecentlyViewedProducts = dynamic(() => import("./RecentlyViewedProducts"), { ssr: false });

export default function DeferredRecentlyViewed({ currentProduct }: { currentProduct: ProductGridCardData }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!ref.current || !("IntersectionObserver" in window)) { setVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setVisible(true);
      observer.disconnect();
    }, { rootMargin: "800px" });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={ref} data-testid="deferred-recently-viewed" className="min-h-1">{visible ? <RecentlyViewedProducts currentProduct={currentProduct} /> : null}</div>;
}
