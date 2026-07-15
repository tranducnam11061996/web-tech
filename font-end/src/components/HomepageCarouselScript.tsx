"use client";

import Script from "next/script";
import { useEffect } from "react";

type HomepageCarouselController = {
  init: (root?: ParentNode) => void;
  destroy: () => void;
};

declare global {
  interface Window {
    HacomHomepageCarousel?: HomepageCarouselController;
  }
}

export default function HomepageCarouselScript() {
  useEffect(() => () => {
    window.HacomHomepageCarousel?.destroy();
  }, []);

  return (
    <Script
      id="hacom-homepage-carousel"
      src="/homepage-carousel.js?v=1"
      strategy="afterInteractive"
      onReady={() => window.HacomHomepageCarousel?.init(document)}
    />
  );
}
