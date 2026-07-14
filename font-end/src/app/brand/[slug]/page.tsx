import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import ProductGridCard, { type ProductGridCardData } from "@/components/ProductGridCard";
import { internalApiUrl } from "@/lib/apiUrl";
import { BrandCatalogFilters } from "@/components/catalog/BrandCatalogFilters";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type BrandPayload = {
  brand: { id: number; name: string; slug: string; summary: string; description: string; image: string; metaTitle: string; metaKeywords: string; metaDescription: string; totalProductCount: number };
  products: ProductGridCardData[];
  priceBounds: { min: number; max: number };
  pagination: { total: number; page: number; limit: number; totalPages: number };
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildApiUrl(slug: string, searchParams: Record<string, string | string[] | undefined>) {
  const url = new URL(internalApiUrl(`/api/brands/${encodeURIComponent(slug)}`));
  url.searchParams.set("limit", "24");
  for (const key of ["page", "sort", "min-price", "max-price"]) {
    const value = first(searchParams[key]);
    if (value) url.searchParams.set(key, value);
  }
  return url;
}

async function loadBrand(slug: string, searchParams: Record<string, string | string[] | undefined>) {
  try {
    const response = await fetch(buildApiUrl(slug, searchParams), { next: { revalidate: 60 } });
    const payload = await response.json().catch(() => null);
    if (response.status === 404) return { status: 404, data: null as BrandPayload | null };
    if (!response.ok || !payload?.success) return { status: response.status || 500, data: null as BrandPayload | null };
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

function pageHref(slug: string, searchParams: Record<string, string | string[] | undefined>, page: number) {
  const query = new URLSearchParams();
  for (const key of ["sort", "min-price", "max-price"]) {
    const value = first(searchParams[key]);
    if (value) query.set(key, value);
  }
  if (page > 1) query.set("page", String(page));
  const suffix = query.toString();
  return `/brand/${slug}${suffix ? `?${suffix}` : ""}`;
}

export default async function BrandPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: SearchParams }) {
  const [{ slug }, resolvedSearch] = await Promise.all([params, searchParams]);
  const result = await loadBrand(slug, resolvedSearch);
  if (result.status === 404) notFound();
  if (!result.data) {
    return <><Header /><main className="mx-auto min-h-[55vh] max-w-4xl px-4 py-20 text-center text-white"><h1 className="text-2xl font-bold">Chưa thể tải thương hiệu</h1><p className="mt-3 text-zinc-400">Dữ liệu tạm thời không khả dụng. Vui lòng thử lại.</p><Link href={`/brand/${slug}`} className="mt-6 inline-flex rounded-lg bg-cyan-500 px-5 py-2.5 font-semibold text-slate-950">Thử lại</Link></main><Footer /></>;
  }
  const { brand, products, pagination, priceBounds } = result.data;
  const currentSort = first(resolvedSearch.sort) || "newest";

  return (
    <><Header /><main className="mx-auto min-h-[65vh] max-w-[1800px] px-4 py-7 text-white sm:px-6">
      <Breadcrumb items={[{ label: "Thương hiệu" }, { label: brand.name }]} />
      <section className="mt-5 overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-950 to-[#111827] p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="flex h-28 w-full shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white p-4 sm:w-56">
            {brand.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.image} alt={`Logo ${brand.name}`} className="h-full w-full object-contain" />
            ) : <span className="max-w-full break-words text-center text-2xl font-black text-zinc-700">{brand.name}</span>}
          </div>
          <div className="min-w-0"><p className="text-xs font-bold uppercase tracking-[.24em] text-cyan-400">Thương hiệu</p><h1 className="mt-2 break-words text-3xl font-black sm:text-4xl">{brand.name}</h1>{brand.summary ? <p className="mt-3 max-w-4xl whitespace-pre-line text-sm leading-7 text-zinc-300">{brand.summary}</p> : null}<p className="mt-3 text-sm text-zinc-500">{pagination.total} sản phẩm đang bán · {brand.totalProductCount} sản phẩm trong dữ liệu</p></div>
        </div>
      </section>

      <BrandCatalogFilters sort={currentSort} minPrice={first(resolvedSearch["min-price"]) || ""} maxPrice={first(resolvedSearch["max-price"]) || ""} bounds={priceBounds} />

      {products.length ? <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6" aria-label={`Sản phẩm ${brand.name}`}>{products.map((product) => <ProductGridCard key={product.id} product={product} />)}</section> : <section className="mt-6 rounded-2xl border border-dashed border-zinc-700 px-6 py-20 text-center"><h2 className="text-xl font-bold">Chưa có sản phẩm phù hợp</h2><p className="mt-2 text-zinc-400">Hãy bỏ khoảng giá hoặc quay lại sau khi catalog được cập nhật.</p><Link href={`/brand/${brand.slug}`} className="mt-5 inline-flex rounded-lg border border-zinc-600 px-4 py-2 text-sm font-semibold hover:border-cyan-400">Xóa bộ lọc</Link></section>}

      {pagination.totalPages > 1 ? <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Phân trang sản phẩm thương hiệu">{pagination.page > 1 ? <Link href={pageHref(brand.slug, resolvedSearch, pagination.page - 1)} className="rounded-lg border border-zinc-700 px-4 py-2 hover:border-cyan-400">Trang trước</Link> : null}<span className="text-sm text-zinc-400">Trang {pagination.page}/{pagination.totalPages}</span>{pagination.page < pagination.totalPages ? <Link href={pageHref(brand.slug, resolvedSearch, pagination.page + 1)} className="rounded-lg border border-zinc-700 px-4 py-2 hover:border-cyan-400">Trang sau</Link> : null}</nav> : null}
      {brand.description ? <section className="mt-10 rounded-xl border border-zinc-800 bg-zinc-950 p-6"><h2 className="text-xl font-bold">Giới thiệu {brand.name}</h2><div className="mt-4 whitespace-pre-line text-sm leading-7 text-zinc-300">{brand.description}</div></section> : null}
    </main><Footer /></>
  );
}
