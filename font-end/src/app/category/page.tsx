import React, { Suspense } from "react";
import CategoryClient from "./CategoryClient";
import { internalApiUrl } from "@/lib/apiUrl";

export default async function CategoryPage(props: any) {
  const searchParams = await props.searchParams;
  const params = await props.params;

  // Extract categoryId from props if it exists, or fallback
  const categoryId = searchParams?.id || undefined;
  const API_URL = internalApiUrl("");

  // Build query for products
  let productUrl = `${API_URL}/api/products?limit=24&page=1`;
  if (categoryId) {
    productUrl += `&category_id=${categoryId}&feature_scope=configured`;
  }
  
  // Append extra filter attributes
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (!["id", "page", "limit", "category_id", "feature_scope"].includes(key)) {
        productUrl += `&${encodeURIComponent(key)}=${encodeURIComponent(value as string)}`;
      }
    });
  }

  // Fetch initial data concurrently
  let products = { data: [], pagination: { totalPages: 1, total: 0 } };
  let categories = { data: [] };
  let priceBounds = { data: { min: 0, max: 200000000 } };
  let attributes = { data: [] };

  try {
    const responses = await Promise.all([
      fetch(productUrl, { next: { revalidate: 60 } }),
      categoryId ? fetch(`${API_URL}/api/categories?parentId=${categoryId}`, { next: { revalidate: 300 } }) : Promise.resolve(null),
      categoryId ? fetch(`${API_URL}/api/categories/price-bounds?categoryId=${categoryId}`, { next: { revalidate: 300 } }) : Promise.resolve(null),
      categoryId ? fetch(`${API_URL}/api/categories/attributes?categoryId=${categoryId}`, { next: { revalidate: 300 } }) : Promise.resolve(null),
    ]);

    const [productsRes, categoriesRes, priceBoundsRes, attributesRes] = responses;

    if (productsRes && productsRes.ok) products = await productsRes.json();
    if (categoriesRes && categoriesRes.ok) categories = await categoriesRes.json();
    if (priceBoundsRes && priceBoundsRes.ok) priceBounds = await priceBoundsRes.json();
    if (attributesRes && attributesRes.ok) attributes = await attributesRes.json();

  } catch (err) {
    console.error("Error fetching SSR data for Category Page:", err);
  }

  const initialData = {
    products,
    categories,
    priceBounds,
    attributes,
  };

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center text-white">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mb-4"></div>
        </div>
      }
    >
      <CategoryClient 
        categoryId={categoryId} 
        searchParams={searchParams} 
        params={params} 
        initialData={initialData} 
      />
    </Suspense>
  );
}
