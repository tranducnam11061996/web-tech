"use client";

import Link from "next/link";
import type { ReactNode } from "react";

interface ProductCardLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  title?: string;
}

/** Ensures catalog-to-product navigation starts at the product header. */
export default function ProductCardLink({ children, ...props }: ProductCardLinkProps) {
  return (
    <Link
      {...props}
      scroll
      onNavigate={() => {
        window.scrollTo({ left: 0, top: 0, behavior: "auto" });
      }}
    >
      {children}
    </Link>
  );
}
