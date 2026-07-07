import { Suspense } from "react";
import SearchClient, { type SearchClientProps } from "./SearchClient";

type SearchApiResponse = SearchClientProps["initialData"]["products"] & {
  attributes?: SearchClientProps["initialData"]["attributes"]["data"];
};

export default async function SearchPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const query = typeof searchParams?.q === 'string' ? searchParams.q : '';
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  // Fetch products từ search API
  let products: SearchApiResponse = {
    data: [],
    attributes: [],
    pagination: { page: 1, limit: 24, totalPages: 1, total: 0 },
  };
  let attributes: SearchClientProps["initialData"]["attributes"] = { data: [] };

  if (query.trim()) {
    try {
      const productUrl = new URL(`${API_URL}/api/search`);
      productUrl.searchParams.set("q", query);
      productUrl.searchParams.set("page", "1");
      productUrl.searchParams.set("limit", "24");

      const productsRes = await fetch(productUrl.toString(), { cache: "no-store" });

      if (productsRes.ok) {
        products = await productsRes.json();
        attributes = { data: products.attributes || [] };
      }
    } catch (err) {
      console.error("Error fetching search results:", err);
    }
  }

  const initialData = { products, attributes, query };

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
