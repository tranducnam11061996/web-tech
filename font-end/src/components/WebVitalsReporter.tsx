"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useReportWebVitals } from "next/web-vitals";

type Vital = {
  name: "CLS" | "FCP" | "INP" | "LCP" | "TTFB";
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  navigationType: string;
};

function pageGroup(pathname: string) {
  if (pathname === "/") return "home";
  if (pathname === "/tim") return "search";
  if (pathname.includes("thanh-toan")) return "checkout";
  if (pathname.includes("gio-hang")) return "cart";
  if (pathname.startsWith("/tai-khoan")) return "account";
  return "product";
}

function sampled() {
  try {
    const key = "hacom.rum.sample.v1";
    const stored = window.sessionStorage.getItem(key);
    if (stored) return stored === "1";
    const selected = Math.random() < 0.05;
    window.sessionStorage.setItem(key, selected ? "1" : "0");
    return selected;
  } catch {
    return false;
  }
}

export default function WebVitalsReporter() {
  const pathname = usePathname();
  const enabled = useRef<boolean | null>(null);
  const metrics = useRef<Vital[]>([]);

  const flush = () => {
    if (!enabled.current || metrics.current.length === 0) return;
    const body = JSON.stringify({ page: pageGroup(pathname), metrics: metrics.current.splice(0, 5) });
    if (body.length > 2_048) return;
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/telemetry/web-vitals", new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch("/api/telemetry/web-vitals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  };

  useReportWebVitals((metric) => {
    if (enabled.current === null) enabled.current = sampled();
    if (!enabled.current || !["CLS", "FCP", "INP", "LCP", "TTFB"].includes(metric.name)) return;
    metrics.current.push({
      name: metric.name as Vital["name"],
      value: metric.value,
      rating: metric.rating,
      navigationType: metric.navigationType,
    });
    if (metrics.current.length >= 5) flush();
  });

  useEffect(() => {
    const handlePageHide = () => flush();
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
      flush();
    };
  }, [pathname]);

  return null;
}
