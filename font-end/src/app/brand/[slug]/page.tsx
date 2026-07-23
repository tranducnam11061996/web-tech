import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import CatalogDetailLayout from "@/components/catalog/CatalogDetailLayout";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import type { ProductGridCardData } from "@/components/ProductGridCard";
import { internalApiUrl } from "@/lib/apiUrl";
import {
  normalizeCollectionPage,
  normalizeCollectionSort,
} from "@/lib/collectionPage";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type BrandPayload = {
  brand: {
    id: number;
    name: string;
    slug: string;
    summary: string;
    description: string;
    image: string;
    metaTitle: string;
    metaKeywords: string;
    metaDescription: string;
    totalProductCount: number;
  };
  products: ProductGridCardData[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
};

function buildApiUrl(slug: string, searchParams: Record<string, string | string[] | undefined>) {
  const url = new URL(internalApiUrl(`/api/brands/${encodeURIComponent(slug)}`));
  const page = normalizeCollectionPage(searchParams.page);
  const sort = normalizeCollectionSort(searchParams.sort);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", "24");
  if (sort) url.searchParams.set("sort", sort);
  return url;
}

async function loadBrand(slug: string, searchParams: Record<string, string | string[] | undefined>) {
  try {
    const response = await fetch(buildApiUrl(slug, searchParams), { next: { revalidate: 60 } });
    const payload = await response.json().catch(() => null);
    if (response.status === 404) return { status: 404, data: null as BrandPayload | null };
    if (!response.ok || !payload?.success) {
      return { status: response.status || 500, data: null as BrandPayload | null };
    }
    return { status: 200, data: payload.data as BrandPayload };
  } catch {
    return { status: 500, data: null as BrandPayload | null };
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadBrand(slug, {});
  if (result.status === 404) notFound();
  if (!result.data) return { title: "Thương hiệu | TrucTiepGAME" };
  const brand = result.data.brand;
  return {
    title: brand.metaTitle || `${brand.name} | TrucTiepGAME`,
    description: brand.metaDescription || brand.summary || `Sản phẩm chính hãng ${brand.name} tại TrucTiepGAME.`,
    alternates: { canonical: `/brand/${brand.slug}` },
  };
}

export default async function BrandPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: SearchParams;
}) {
  const [{ slug }, resolvedSearch] = await Promise.all([params, searchParams]);
  const result = await loadBrand(slug, resolvedSearch);
  if (result.status === 404) notFound();
  if (!result.data) {
    return (
      <>
        <Header />
        <main className="mx-auto min-h-[55vh] max-w-4xl px-4 py-20 text-center text-white">
          <h1 className="text-2xl font-bold">Chưa thể tải thương hiệu</h1>
          <p className="mt-3 text-zinc-400">Dữ liệu tạm thời không khả dụng. Vui lòng thử lại.</p>
          <Link
            href={`/brand/${encodeURIComponent(slug)}`}
            className="mt-6 inline-flex rounded-lg bg-cyan-500 px-5 py-2.5 font-semibold text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            Thử lại
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  const { brand, products, pagination } = result.data;
  return (
    <CatalogDetailLayout
      kind="brand"
      name={brand.name}
      description={brand.description}
      basePath={`/brand/${encodeURIComponent(brand.slug)}`}
      products={products}
      pagination={pagination}
      currentSort={normalizeCollectionSort(resolvedSearch.sort)}
    />
  );
}
