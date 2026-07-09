"use client";

import type React from "react";
import CategoryFeatureBox, { type CategoryFeatureBoxData } from "./CategoryFeatureBox";
import ProductGridCard, { type ProductGridCardData } from "./ProductGridCard";

export default function CategoryFeatureProductGrid({
  products,
  featureBox,
  isLoading = false,
  emptyState,
}: {
  products: ProductGridCardData[];
  featureBox?: CategoryFeatureBoxData | null;
  isLoading?: boolean;
  emptyState: React.ReactNode;
}) {
  const shouldRenderFeature = Boolean(featureBox?.backgroundImageUrl && featureBox?.targetUrl);
  const position = featureBox?.boxPosition === "right" ? "right" : "left";

  if (isLoading) {
    return (
      <div className="col-span-1 flex flex-col items-center justify-center py-32 text-center sm:col-span-2 xl:col-span-4">
        <div className="mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-emerald-500"></div>
        <p className="animate-pulse text-sm font-medium text-gray-400">Dang tai san pham...</p>
      </div>
    );
  }

  if (products.length === 0 && !shouldRenderFeature) return <>{emptyState}</>;

  if (!shouldRenderFeature) {
    return (
      <>
        {products.map((product) => (
          <ProductGridCard key={product.id} product={product} />
        ))}
      </>
    );
  }

  const leadingProducts = position === "right" ? products.slice(0, 2) : [];
  const trailingProducts = position === "right" ? products.slice(2) : products;

  return (
    <>
      {leadingProducts.map((product) => (
        <ProductGridCard key={product.id} product={product} />
      ))}
      <CategoryFeatureBox
        featureBox={featureBox}
        className="order-first col-span-1 sm:col-span-2 xl:order-none xl:min-h-full"
      />
      {trailingProducts.map((product) => (
        <ProductGridCard key={product.id} product={product} />
      ))}
      {products.length === 0 && emptyState}
    </>
  );
}
