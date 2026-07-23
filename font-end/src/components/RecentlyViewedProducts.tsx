"use client";

import { useEffect, useState } from "react";
import ProductGridCard, { type ProductGridCardData } from "./ProductGridCard";
import {
  PRODUCT_RELATED_GRID_CLASS,
  PRODUCT_RELATED_INITIAL_COUNT,
  PRODUCT_RELATED_MAX_COUNT,
} from "./productRelatedLayout";

const STORAGE_KEY = "hacom.recently-viewed.v1";
const STORAGE_VERSION = 1;
const MAX_VISIBLE_ITEMS = PRODUCT_RELATED_MAX_COUNT;
const MAX_STORED_ITEMS = MAX_VISIBLE_ITEMS + 1;
const requestFlights = new Map<string, Promise<ProductGridCardData[]>>();

type RecentlyViewedSnapshot = ProductGridCardData & { viewedAt: string };

function normalizeSnapshot(value: unknown): RecentlyViewedSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Partial<RecentlyViewedSnapshot>;
  const id = Number(item.id);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const slug = String(item.slug || "").replace(/^\/+|\/+$/g, "");
  const name = String(item.name || "").trim();
  if (!slug || !name) return null;
  return {
    id,
    slug,
    name,
    sku: String(item.sku || ""),
    thumbnail: String(item.thumbnail || ""),
    price: Number(item.price || 0),
    marketPrice: Number(item.marketPrice || 0),
    brand: String(item.brand || ""),
    cardBadges: Array.isArray(item.cardBadges) ? item.cardBadges : [],
    viewedAt: item.viewedAt || new Date(0).toISOString(),
  };
}

function normalizeHistory(values: unknown[]) {
  const byId = new Map<number, RecentlyViewedSnapshot>();
  for (const value of values) {
    const item = normalizeSnapshot(value);
    if (!item || byId.has(item.id)) continue;
    byId.set(item.id, item);
    if (byId.size === MAX_STORED_ITEMS) break;
  }
  return Array.from(byId.values());
}

function readHistory() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "null");
    if (!parsed || parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.items)) return [];
    return normalizeHistory(parsed.items);
  } catch {
    return [];
  }
}

function writeHistory(items: RecentlyViewedSnapshot[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, items: normalizeHistory(items) }));
}

function fetchProductsByIds(ids: number[]) {
  const key = ids.join(",");
  const existing = requestFlights.get(key);
  if (existing) return existing;
  const flight = fetch(`/api/products?ids=${encodeURIComponent(key)}`)
    .then(async (response) => {
      if (!response.ok) throw new Error(`Recently viewed request failed: ${response.status}`);
      const payload = await response.json();
      return Array.isArray(payload.data) ? payload.data as ProductGridCardData[] : [];
    })
    .finally(() => requestFlights.delete(key));
  requestFlights.set(key, flight);
  return flight;
}

export default function RecentlyViewedProducts({ currentProduct }: { currentProduct: ProductGridCardData }) {
  const [products, setProducts] = useState<ProductGridCardData[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    setIsExpanded(false);
    const currentSnapshot: RecentlyViewedSnapshot = {
      ...currentProduct,
      viewedAt: new Date().toISOString(),
    };

    const loadHistory = (revalidate: boolean) => {
      const storedHistory = readHistory();
      const nextHistory = normalizeHistory([
        currentSnapshot,
        ...storedHistory.filter((item) => item.id !== currentProduct.id),
      ]);
      writeHistory(nextHistory);
      const previousProducts = nextHistory.filter((item) => item.id !== currentProduct.id).slice(0, MAX_VISIBLE_ITEMS);
      if (active) {
        setProducts(previousProducts);
        setIsHydrated(true);
      }

      if (!revalidate || previousProducts.length === 0) return;
      const viewedAtById = new Map(previousProducts.map((item) => [Number(item.id), item.viewedAt]));
      void fetchProductsByIds(previousProducts.map((item) => Number(item.id)))
        .then((freshProducts) => {
          if (!active) return;
          setProducts(freshProducts);
          writeHistory([
            currentSnapshot,
            ...freshProducts.map((product) => ({
              ...product,
              viewedAt: viewedAtById.get(Number(product.id)) || new Date().toISOString(),
            })),
          ]);
        })
        .catch(() => {
          // Keep the last-known snapshots when revalidation is unavailable.
        });
    };

    loadHistory(true);
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const previousProducts = readHistory()
        .filter((item) => item.id !== currentProduct.id)
        .slice(0, MAX_VISIBLE_ITEMS);
      if (active) {
        setProducts(previousProducts);
        setIsHydrated(true);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      active = false;
      window.removeEventListener("storage", handleStorage);
    };
  }, [currentProduct]);

  const visibleProducts = isExpanded
    ? products.slice(0, PRODUCT_RELATED_MAX_COUNT)
    : products.slice(0, PRODUCT_RELATED_INITIAL_COUNT);

  if (!isHydrated || products.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1800px] px-4 py-6 md:px-6" aria-labelledby="recently-viewed-title">
      <div className="rounded-2xl border border-[#1a1a1e] bg-[#111115] p-4 md:p-6">
        <div className="mb-5">
          <h2 id="recently-viewed-title" className="text-xl font-bold text-white md:text-2xl">
            Sản phẩm đã xem
          </h2>
        </div>

        {visibleProducts.length > 0 ? (
          <div id="recently-viewed-grid" className={PRODUCT_RELATED_GRID_CLASS}>
            {visibleProducts.map((product) => <ProductGridCard key={product.id} product={product} />)}
          </div>
        ) : null}

        {products.length > PRODUCT_RELATED_INITIAL_COUNT ? (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              className="show-btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              aria-controls="recently-viewed-grid"
              aria-expanded={isExpanded}
              onClick={() => setIsExpanded((expanded) => !expanded)}
            >
              {isExpanded
                ? "Thu gọn"
                : `Xem thêm (${Math.min(products.length, PRODUCT_RELATED_MAX_COUNT) - PRODUCT_RELATED_INITIAL_COUNT})`}
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
