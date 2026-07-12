"use client";

import type { ReactNode } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export function CommercePageFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#0a0a0c] font-sans text-white">
      <Header />
      {children}
      <Footer />
    </div>
  );
}
