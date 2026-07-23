"use client";

import Link from "next/link";
import type { ReactNode } from "react";

interface ProductCardLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  title?: string;
  target?: "_blank";
  rel?: string;
}

/** Ensures catalog-to-product navigation starts at the product header. */
export default function ProductCardLink({ children, target, ...props }: ProductCardLinkProps) {
  return (
    <Link
      {...props}
      target={target}
      scroll={target !== "_blank"}
      onNavigate={
        target === "_blank"
          ? undefined
          : () => {
              window.scrollTo({ left: 0, top: 0, behavior: "auto" });
            }
      }
    >
      {children}
    </Link>
  );
}
