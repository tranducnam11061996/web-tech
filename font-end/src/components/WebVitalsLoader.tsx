"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const WebVitalsReporter = dynamic(() => import("./WebVitalsReporter"), { ssr: false });

export default function WebVitalsLoader() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const windowWithIdle = window as Window & { requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (windowWithIdle.requestIdleCallback) {
      const id = windowWithIdle.requestIdleCallback(() => setEnabled(true), { timeout: 4_000 });
      return () => windowWithIdle.cancelIdleCallback?.(id);
    }
    const timer = window.setTimeout(() => setEnabled(true), 2_000);
    return () => window.clearTimeout(timer);
  }, []);
  return enabled ? <WebVitalsReporter /> : null;
}
