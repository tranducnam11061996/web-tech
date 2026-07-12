"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type ProductDetailModalContextValue = {
  specificationsOpen: boolean;
  openSpecifications: () => void;
  closeSpecifications: () => void;
};

const ProductDetailModalContext = createContext<ProductDetailModalContextValue | null>(null);

export function ProductDetailModalProvider({ children }: { children: ReactNode }) {
  const [specificationsOpen, setSpecificationsOpen] = useState(false);
  const value = useMemo(() => ({
    specificationsOpen,
    openSpecifications: () => setSpecificationsOpen(true),
    closeSpecifications: () => setSpecificationsOpen(false),
  }), [specificationsOpen]);

  return <ProductDetailModalContext.Provider value={value}>{children}</ProductDetailModalContext.Provider>;
}

export function useProductDetailModal() {
  const context = useContext(ProductDetailModalContext);
  if (!context) throw new Error("useProductDetailModal must be used within ProductDetailModalProvider");
  return context;
}
