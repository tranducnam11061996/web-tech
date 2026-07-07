import { Suspense } from "react";
import SearchClient from "./SearchClient";

export default async function SearchPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  const query = typeof searchParams?.q === 'string' ? searchParams.q : '';
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

  // Fetch products từ search API
  let products = { data: [], pagination: { totalPages: 1, total: 0 } };
  let attributes = { data: [] };

  if (query.trim()) {
    try {
      const productUrl = new URL(`${API_URL}/api/search`);
      productUrl.searchParams.set("q", query);
      productUrl.searchParams.set("page", "1");
      productUrl.searchParams.set("limit", "24");

      const [productsRes, attributesRes] = await Promise.all([
        fetch(productUrl.toString(), { cache: "no-store" }),
        // Attributes sẽ fetch sau khi có productIds — placeholder, fetch ở client
        Promise.resolve(null as any),
      ]);

      if (productsRes.ok) {
        products = await productsRes.json();
      }
    } catch (err) {
      console.error("Error fetching search results:", err);
    }
  }

  // Build product IDs for attributes fetch
  const productIds = (products.data || []).map((p: { id: number }) => p.id).join(',');

  // Fetch attributes từ search results (nếu có products)
  if (productIds) {
    try {
      const attrUrl = new URL(`${API_URL}/api/search-attributes`);
      attrUrl.searchParams.set("productIds", productIds);
      const attrRes = await fetch(attrUrl.toString(), { cache: "no-store" });
      if (attrRes.ok) {
        attributes = await attrRes.json();
      }
    } catch (err) {
      console.error("Error fetching search attributes:", err);
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
