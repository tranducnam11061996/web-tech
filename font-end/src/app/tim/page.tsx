import { Suspense } from "react";
import SearchClient, { type SearchClientProps } from "./SearchClient";
import { internalApiUrl } from "@/lib/apiUrl";
import { CATALOG_PAGE_SIZE, normalizeCatalogPage } from "@/lib/pagination";

type SearchApiResponse = SearchClientProps["initialData"]["products"] & {
  attributes?: SearchClientProps["initialData"]["attributes"]["data"];
  priceBounds?: SearchClientProps["initialData"]["priceBounds"]["data"];
};

export default async function SearchPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const query = typeof searchParams?.q === 'string' ? searchParams.q : '';
  const API_URL = internalApiUrl("");

  // Fetch products từ search API
  let products: SearchApiResponse = {
    data: [],
    attributes: [],
    priceBounds: { min: 0, max: 0 },
    pagination: { page: 1, limit: 24, totalPages: 1, total: 0 },
  };
  let attributes: SearchClientProps["initialData"]["attributes"] = { data: [] };
  let priceBounds: SearchClientProps["initialData"]["priceBounds"] = {
    data: { min: 0, max: 0 },
  };

  if (query.trim()) {
    try {
      const productUrl = new URL(`${API_URL}/api/search`);
      Object.entries(searchParams || {}).forEach(([key, value]) => {
        const normalizedValue = Array.isArray(value) ? value[0] : value;
        if (normalizedValue != null && normalizedValue !== "") {
          productUrl.searchParams.set(key, String(normalizedValue));
        }
      });
      productUrl.searchParams.set("q", query);
      productUrl.searchParams.set("page", String(normalizeCatalogPage(searchParams?.page)));
      productUrl.searchParams.set("limit", String(CATALOG_PAGE_SIZE));

      const productsRes = await fetch(productUrl.toString(), { next: { revalidate: 30 } });

      if (productsRes.ok) {
        products = await productsRes.json();
        attributes = { data: products.attributes || [] };
        priceBounds = { data: products.priceBounds || { min: 0, max: 0 } };
      }
    } catch (err) {
      console.error("Error fetching search results:", err);
    }
  }

  const initialData = { products, attributes, priceBounds, query };

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0c] flex items-center justify-center text-white">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mb-4"></div>
        </div>
      }
    >
      <SearchClient initialData={initialData} />
    </Suspense>
  );
}
