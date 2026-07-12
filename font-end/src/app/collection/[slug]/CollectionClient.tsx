"use client";

import React, { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductGridCard, { type ProductGridCardData } from "@/components/ProductGridCard";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const PAGE_SIZE = 24;
const PRICE_STEP = 1000;
const SKELETON_KEYS = Array.from({ length: 8 }, (_, index) => `collection-skeleton-${index}`);

type CollectionInfo = {
  id: number;
  name: string;
  url: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  productCount: number;
};

type PriceBounds = {
  min: number;
  max: number;
};

type PaginationData = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type CollectionApiResponse = {
  success: boolean;
  collection: CollectionInfo;
  data: ProductGridCardData[];
  priceBounds: PriceBounds;
  pagination: PaginationData;
  message?: string;
};

type CollectionClientProps = {
  slug: string;
  initialData: CollectionApiResponse;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(Math.max(0, Math.round(Number(value || 0))));
}

function formatPrice(value: number) {
  return `${formatNumber(value)} d`;
}

function clampPrice(value: number, bounds: PriceBounds) {
  if (!Number.isFinite(value)) return bounds.min;
  return Math.min(Math.max(value, bounds.min), bounds.max);
}

function priceBoundsAvailable(bounds: PriceBounds) {
  return bounds.min > 0 && bounds.max > 0 && bounds.max >= bounds.min;
}

function paginationRange(currentPage: number, totalPages: number) {
  const range: number[] = [];
  const rangeWithDots: Array<number | "..."> = [];
  let lastPage: number | undefined;

  for (let page = 1; page <= totalPages; page += 1) {
    if (page === 1 || page === totalPages) range.push(page);
    else if (currentPage <= 3 && page <= 5) range.push(page);
    else if (currentPage >= totalPages - 2 && page >= totalPages - 4) range.push(page);
    else if (page >= currentPage - 1 && page <= currentPage + 1) range.push(page);
  }

  for (const page of range) {
    if (lastPage !== undefined) {
      if (page - lastPage === 2) rangeWithDots.push(lastPage + 1);
      else if (page - lastPage !== 1) rangeWithDots.push("...");
    }
    rangeWithDots.push(page);
    lastPage = page;
  }

  return rangeWithDots;
}

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function buildQuery(searchQuery: string, updates: Record<string, string | null>) {
  const params = new URLSearchParams(searchQuery);
  params.set("limit", String(PAGE_SIZE));

  Object.entries(updates).forEach(([key, value]) => {
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
  });

  const queryString = params.toString();
  return queryString ? `?${queryString}` : "";
}

function EmptyState({ onClear, hasFilter }: { onClear: () => void; hasFilter: boolean }) {
  return (
    <div className="col-span-1 my-4 flex flex-col items-center justify-center rounded-2xl border border-[#1a1a1e] bg-[#111115] px-5 py-20 text-center sm:col-span-2 xl:col-span-4">
      <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-cyan-500/20 bg-cyan-500/5 text-cyan-300">
        <svg className="h-9 w-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
        </svg>
      </div>
      <h2 className="mb-2 text-lg font-bold text-white">Không tìm thấy sản phẩm phù hợp</h2>
      <p className="mb-6 max-w-md text-[15px] leading-relaxed text-gray-500">
        {hasFilter
          ? "Không có sản phẩm nào trong bộ sưu tập khớp khoảng giá hiện tại. Hãy thử nới rộng bộ lọc."
          : "Bộ sưu tập này hiện chưa có sản phẩm đang hiển thị."}
      </p>
      {hasFilter && (
        <button
          type="button"
          onClick={onClear}
          className="rounded-lg border border-emerald-500/30 bg-emerald-600/20 px-6 py-2 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          Bỏ lọc giá
        </button>
      )}
    </div>
  );
}

function ProductSkeletonGrid() {
  return (
    <>
      {SKELETON_KEYS.map((key) => (
        <div key={key} className="min-h-[360px] animate-pulse rounded-xl border border-[#1f1f24] bg-[#111115]">
          <div className="aspect-[4/3] rounded-t-xl bg-[#18181b]" />
          <div className="space-y-3 p-4">
            <div className="mx-auto h-4 w-4/5 rounded bg-[#202026]" />
            <div className="mx-auto h-4 w-2/3 rounded bg-[#202026]" />
            <div className="mt-8 h-6 w-1/2 rounded bg-[#202026]" />
          </div>
        </div>
      ))}
    </>
  );
}

export default function CollectionClient({ slug, initialData }: CollectionClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchKey = searchParams?.toString() || "";
  const [isPending, startTransition] = useTransition();
  const [collection, setCollection] = useState(initialData.collection);
  const [products, setProducts] = useState(initialData.data || []);
  const [priceBounds, setPriceBounds] = useState(initialData.priceBounds || { min: 0, max: 0 });
  const [pagination, setPagination] = useState(initialData.pagination || { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [draftPrice, setDraftPrice] = useState(() => ({
    min: initialData.priceBounds?.min || 0,
    max: initialData.priceBounds?.max || 0,
  }));
  const lastRequestKeyRef = useRef(searchKey);

  const currentPage = Math.max(1, Number(searchParams?.get("page") || pagination.page || 1) || 1);
  const currentSort = searchParams?.get("sort") || "";
  const activeMin = searchParams?.get("min-price");
  const activeMax = searchParams?.get("max-price");
  const hasPriceFilter = Boolean(activeMin || activeMax);
  const hasBounds = priceBoundsAvailable(priceBounds);
  const description = stripHtml(collection.description || collection.metaDescription || "Tuyển chọn các sản phẩm công nghệ nổi bật, đang được sắp xếp theo bộ sưu tập HACOM.");

  useEffect(() => {
    if (!hasBounds) {
      setDraftPrice({ min: 0, max: 0 });
      return;
    }

    const min = activeMin ? Number(activeMin) : priceBounds.min;
    const max = activeMax ? Number(activeMax) : priceBounds.max;
    const safeMin = clampPrice(min, priceBounds);
    const safeMax = clampPrice(max, priceBounds);
    setDraftPrice(safeMin <= safeMax ? { min: safeMin, max: safeMax } : { min: priceBounds.min, max: priceBounds.max });
  }, [activeMax, activeMin, hasBounds, priceBounds]);

  useEffect(() => {
    if (searchKey === lastRequestKeyRef.current) return;
    lastRequestKeyRef.current = searchKey;

    const controller = new AbortController();
    const url = new URL(`${API_URL}/api/collections/${encodeURIComponent(slug)}`);
    const params = new URLSearchParams(searchKey);
    params.set("limit", String(PAGE_SIZE));
    if (!params.get("page")) params.set("page", "1");
    params.forEach((value, key) => url.searchParams.set(key, value));

    setErrorText("");
    setIsLoading(true);
    fetch(url.toString(), { signal: controller.signal })
      .then((response) => response.json())
      .then((payload: CollectionApiResponse) => {
        if (!payload.success) throw new Error(payload.message || "Không thể tải bộ sưu tập");
        setCollection(payload.collection);
        setProducts(payload.data || []);
        setPriceBounds(payload.priceBounds || { min: 0, max: 0 });
        setPagination(payload.pagination || { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
        if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setErrorText(error.message || "Không thể tải bộ sưu tập");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [searchKey, slug]);

  const pushQuery = (updates: Record<string, string | null>) => {
    startTransition(() => {
      router.push(`/collection/${slug}${buildQuery(searchKey, updates)}`, { scroll: false });
    });
  };

  const updateSort = (value: string) => {
    pushQuery({ sort: value || null, page: "1" });
  };

  const applyPriceFilter = () => {
    if (!hasBounds) return;
    const nextMin = clampPrice(draftPrice.min, priceBounds);
    const nextMax = clampPrice(draftPrice.max, priceBounds);
    pushQuery({
      "min-price": nextMin > priceBounds.min ? String(nextMin) : null,
      "max-price": nextMax < priceBounds.max ? String(nextMax) : null,
      page: "1",
    });
  };

  const clearPriceFilter = () => {
    pushQuery({ "min-price": null, "max-price": null, page: "1" });
  };

  const goToPage = (page: number) => {
    if (page < 1 || page > pagination.totalPages || page === currentPage) return;
    pushQuery({ page: String(page) });
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0a0a0c] text-white">
      <Header />

      <main className="mx-auto max-w-[1800px] px-4 pb-10 pt-5 md:px-6">
        <nav className="mb-5 flex flex-wrap items-center gap-2 text-xs font-medium text-gray-500" aria-label="Breadcrumb">
          <Link href="/" className="transition hover:text-white">Trang chủ</Link>
          <span aria-hidden="true">/</span>
          <span className="text-cyan-400">Bộ sưu tập</span>
          <span aria-hidden="true">/</span>
          <span className="text-gray-300">{collection.name}</span>
        </nav>

        <section className="relative mb-5 overflow-hidden rounded-[28px] border border-[#1a1a1e] bg-[#101014] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.28)] md:p-7">
          <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-24 w-72 rounded-full bg-blue-600/10 blur-3xl" />

          <div className="relative grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-300">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.8)]" />
                TrucTiepGAME Collection
              </div>
              <h1 className="max-w-4xl text-2xl font-black tracking-tight text-white md:text-4xl">
                {collection.name}
              </h1>
              <p className="mt-4 max-w-3xl text-[15px] leading-7 text-gray-400">
                {description}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[#202026] bg-[#151519] p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Sản phẩm</p>
                <p className="mt-2 text-2xl font-black text-white">{formatNumber(collection.productCount)}</p>
              </div>
              <div className="rounded-2xl border border-[#202026] bg-[#151519] p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Đang xem</p>
                <p className="mt-2 text-2xl font-black text-emerald-400">{formatNumber(pagination.total)}</p>
              </div>
              <div className="col-span-2 rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.06] p-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">Dải giá</p>
                <p className="mt-2 text-sm font-bold text-white">
                  {hasBounds ? `${formatPrice(priceBounds.min)} - ${formatPrice(priceBounds.max)}` : "Chưa có giá hiển thị"}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-5 rounded-2xl border border-[#1a1a1e] bg-[#111115] p-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h2 className="text-[15px] font-extrabold text-white">{formatNumber(pagination.total)} sản phẩm phù hợp</h2>
              {hasPriceFilter && (
                <button
                  type="button"
                  onClick={clearPriceFilter}
                  className="mt-2 inline-flex min-h-9 items-center gap-2 rounded-full border border-cyan-800/50 bg-cyan-900/30 px-3 text-[12px] font-semibold text-cyan-300 transition hover:bg-cyan-900/50 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  {formatPrice(draftPrice.min)} - {formatPrice(draftPrice.max)}
                  <span aria-hidden="true">x</span>
                </button>
              )}
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto] xl:min-w-[760px]">
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Giá từ</span>
                <input
                  type="number"
                  min={hasBounds ? priceBounds.min : 0}
                  max={hasBounds ? priceBounds.max : undefined}
                  step={PRICE_STEP}
                  disabled={!hasBounds}
                  value={draftPrice.min}
                  onChange={(event) => setDraftPrice((current) => ({ ...current, min: Number(event.target.value) }))}
                  className="h-11 w-full rounded-xl border border-[#27272a] bg-[#18181b] px-4 text-sm font-bold text-white outline-none transition focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 disabled:opacity-50"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-gray-500">Giá đến</span>
                <input
                  type="number"
                  min={hasBounds ? priceBounds.min : 0}
                  max={hasBounds ? priceBounds.max : undefined}
                  step={PRICE_STEP}
                  disabled={!hasBounds}
                  value={draftPrice.max}
                  onChange={(event) => setDraftPrice((current) => ({ ...current, max: Number(event.target.value) }))}
                  className="h-11 w-full rounded-xl border border-[#27272a] bg-[#18181b] px-4 text-sm font-bold text-white outline-none transition focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600 disabled:opacity-50"
                />
              </label>
              <button
                type="button"
                disabled={!hasBounds || isPending}
                onClick={applyPriceFilter}
                className="h-11 rounded-xl border border-emerald-500/30 bg-emerald-600/20 px-5 text-sm font-bold text-emerald-300 transition hover:bg-emerald-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 md:self-end"
              >
                Áp dụng
              </button>
              <label className="block md:self-end">
                <span className="sr-only">Sắp xếp sản phẩm</span>
                <select
                  value={currentSort}
                  onChange={(event) => updateSort(event.target.value)}
                  className="h-11 w-full min-w-[190px] appearance-none rounded-xl border border-[#27272a] bg-[#18181b] px-4 text-sm font-bold text-gray-300 outline-none transition hover:border-[#3f3f46] focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600"
                >
                  <option value="">Sắp xếp mặc định</option>
                  <option value="price_asc">Giá: Thấp - Cao</option>
                  <option value="price_desc">Giá: Cao - Thấp</option>
                  <option value="newest">Mới nhất</option>
                </select>
              </label>
            </div>
          </div>
        </section>

        {errorText && (
          <div className="mb-5 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200" role="alert">
            {errorText}
          </div>
        )}

        <section className="relative">
          {isPending && (
            <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center">
              <div className="rounded-full border border-cyan-500/20 bg-[#111115] px-4 py-2 text-xs font-bold text-cyan-300 shadow-xl">
                Đang cập nhật...
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" id="productGrid" aria-busy={isLoading || isPending}>
            {isLoading || isPending ? (
              <ProductSkeletonGrid />
            ) : products.length > 0 ? (
              products.map((product) => <ProductGridCard key={product.id} product={product} />)
            ) : (
              <EmptyState onClear={clearPriceFilter} hasFilter={hasPriceFilter} />
            )}
          </div>

          {pagination.totalPages > 1 && (
            <div className="mb-10 mt-12 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1 || isPending}
                aria-label="Trang trước"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#18181b] text-gray-400 transition hover:bg-[#27272a] hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m15 18-6-6 6-6" />
                </svg>
              </button>

              <div className="flex flex-wrap justify-center gap-2">
                {paginationRange(currentPage, pagination.totalPages).map((page, index) =>
                  page === "..." ? (
                    <span key={`dots-${index}`} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#18181b] font-medium text-gray-500">
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      type="button"
                      onClick={() => goToPage(page)}
                      disabled={isPending}
                      aria-current={currentPage === page ? "page" : undefined}
                      className={`flex h-10 w-10 items-center justify-center rounded-xl text-[15px] font-semibold transition focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                        currentPage === page
                          ? "bg-[#0b63e5] text-white shadow-[0_4px_12px_rgba(11,99,229,0.3)]"
                          : "bg-[#18181b] text-gray-400 hover:bg-[#27272a] hover:text-white"
                      } disabled:opacity-50`}
                    >
                      {page}
                    </button>
                  ),
                )}
              </div>

              <button
                type="button"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= pagination.totalPages || isPending}
                aria-label="Trang sau"
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#18181b] text-gray-400 transition hover:bg-[#27272a] hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-30"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m9 18 6-6-6-6" />
                </svg>
              </button>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
