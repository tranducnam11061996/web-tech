"use client";
import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import SimilarProducts from "../../components/SimilarProducts";
import WhyBuyFaq from "../../components/WhyBuyFaq";
import ProgressiveImage from "../../components/ProgressiveImage";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// ─── Types ───────────────────────────────────────────────────────
export interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
  marketPrice: number;
  savings: number;
  thumbnail: string;
  slug: string;
  brand: string;
}

export interface Attribute {
  id: number;
  name: string;
  icon: string | null;
  filter_code: string;
  attribute_code: string;
  values: { id: number; name: string; productCount: number }[];
}

export interface SearchClientProps {
  initialData: {
    products: { data: Product[]; pagination: { page: number; limit: number; total: number; totalPages: number } };
    attributes: { data: Attribute[] };
    query: string;
  };
}

// ─── Slugify helper (giống CategoryClient) ──────────────────────
const slugify = (str: string) => {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .replace(/[^a-z0-9\- ]/g, "")
    .trim()
    .replace(/\s+/g, "-");
};

// ─── Attribute Filter Block (giống CategoryClient) ──────────────
function AttributeFilterBlock({
  attr,
  isLast,
  isOpen,
}: {
  attr: Attribute;
  isLast: boolean;
  isOpen: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const [isExpanded, setIsExpanded] = useState(isOpen);
  const router = useRouter();
  const searchParams = useSearchParams();

  const filterKey = attr.filter_code || slugify(attr.name);
  const currentValues = searchParams.get(filterKey)?.split(",") || [];
  const displayValues = useMemo(
    () => (attr.values || []).filter((v) => (v.name || "").trim().length > 0),
    [attr.values]
  );

  const handleToggle = (valName: string) => {
    const valSlug = slugify(valName);
    const newParams = new URLSearchParams(searchParams.toString());

    let newValues = [...currentValues];
    if (newValues.includes(valSlug)) {
      newValues = newValues.filter((v) => v !== valSlug);
    } else {
      newValues.push(valSlug);
    }

    if (newValues.length > 0) {
      newParams.set(filterKey, newValues.join(","));
    } else {
      newParams.delete(filterKey);
    }

    const currentPath =
      typeof window !== "undefined"
        ? window.location.pathname
        : "/tim";
    router.push(currentPath + "?" + newParams.toString(), { scroll: false });
  };

  return (
    <div
      className={`filter-section ${isExpanded ? "open" : ""}`}
      style={isLast ? { borderBottom: "none" } : {}}
      data-group={`attr-${attr.id}`}
    >
      <div
        className="filter-title"
        onClick={() => setIsExpanded((open) => !open)}
      >
        <span className="flex items-center gap-2">
          <span className="text-sm">{attr.icon || "📌"}</span> {attr.name}
        </span>
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>
      <div
        className="filter-content mt-3"
        style={!isExpanded ? { display: "none" } : {}}
      >
        <div className="space-y-2">
          {displayValues.slice(0, showAll ? undefined : 4).map((val) => {
            const valSlug = slugify(val.name);
            const isChecked = currentValues.includes(valSlug);
            return (
              <label
                key={val.id}
                className={`flex items-center p-[10px] rounded-[10px] border cursor-pointer transition-all ${
                  isChecked
                    ? "border-[#3f3f46] bg-[#202023]"
                    : "border-[#27272a] bg-[#161618] hover:border-[#3f3f46]"
                }`}
              >
                <input
                  type="checkbox"
                  value={val.id}
                  checked={isChecked}
                  onChange={() => handleToggle(val.name)}
                  className="sr-only"
                />
                <div
                  className={`w-[18px] h-[18px] rounded-[6px] border-2 flex items-center justify-center shrink-0 shadow-sm transition-colors ${
                    isChecked
                      ? "border-cyan-500 bg-cyan-500"
                      : "border-[#4b4b4b] bg-transparent"
                  }`}
                >
                  {isChecked && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="3"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <span
                  className={`flex-1 font-medium text-sm ml-3 transition-colors ${
                    isChecked ? "text-white" : "text-[#d1d5db] hover:text-white"
                  }`}
                >
                  {val.name}
                </span>
                {val.productCount > 0 && (
                  <span className="text-[11px] px-2 py-[2px] rounded-md font-medium bg-[#27272a] text-[#a87b51] ml-2">
                    {val.productCount}
                  </span>
                )}
              </label>
            );
          })}
        </div>
        {displayValues.length > 4 && (
          <button
            className="flex items-center gap-3 mt-4 mb-2 ml-1 text-[15px] text-gray-400 hover:text-white transition-colors font-medium"
            onClick={() => setShowAll(!showAll)}
          >
            <div className="relative w-[20px] h-[20px] flex items-center justify-center rounded-[3px] bg-[#1a1a1e] border border-[#27272a] rotate-45 shrink-0 m-1">
              {showAll ? (
                <svg
                  className="w-2.5 h-2.5 text-gray-400 absolute -rotate-45"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="w-3 h-3 text-gray-400 absolute -rotate-45"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              )}
            </div>
            {showAll ? "Thu gọn" : `+ ${displayValues.length - 4} mục`}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Main SearchClient ───────────────────────────────────────────
export default function SearchClient({ initialData }: SearchClientProps) {
  const [products, setProducts] = useState<Product[]>(initialData?.products?.data || []);
  const [currentPage, setCurrentPage] = useState(initialData?.products?.pagination?.page || 1);
  const [totalPages, setTotalPages] = useState(initialData?.products?.pagination?.totalPages || 1);
  const [totalProducts, setTotalProducts] = useState(initialData?.products?.pagination?.total || 0);
  const [attributes, setAttributes] = useState<Attribute[]>(initialData?.attributes?.data || []);
  const [isLoading, setIsLoading] = useState(false);
  const searchParamsHook = useSearchParams();
  const searchKey = searchParamsHook?.toString() || "";
  const router = useRouter();
  const lastSearchKeyRef = useRef(searchKey);
  const lastRequestKeyRef = useRef(`${searchKey}|${currentPage}`);
  const query = searchParamsHook?.get("q") || initialData?.query || "";

  // Re-fetch the combined product/facet response when URL filters or pagination change.
  useEffect(() => {
    if (searchKey !== lastSearchKeyRef.current && currentPage !== 1) {
      lastSearchKeyRef.current = searchKey;
      setCurrentPage(1);
      return;
    }
    if (searchKey !== lastSearchKeyRef.current) {
      lastSearchKeyRef.current = searchKey;
    }

    const requestKey = `${searchKey}|${currentPage}`;
    if (requestKey === lastRequestKeyRef.current) return;
    lastRequestKeyRef.current = requestKey;

    const controller = new AbortController();
    const url = new URL(`${API_URL}/api/search`);
    url.searchParams.set("q", query);
    url.searchParams.set("limit", "24");
    url.searchParams.set("page", String(currentPage));

    // Copy tất cả filter params từ URL (brand, cpu, ram...)
    const paramsFromUrl = new URLSearchParams(searchKey);
    paramsFromUrl.forEach((value, key) => {
      if (!["q", "page", "limit"].includes(key)) {
        url.searchParams.set(key, value);
      }
    });

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    setIsLoading(true);
    fetch(url.toString(), { signal: controller.signal })
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setProducts(res.data);
          setTotalPages(res.pagination.totalPages);
          setTotalProducts(res.pagination.total);
          setAttributes(res.attributes || []);
        }
      })
      .catch((err) => {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          console.error("Error fetching products:", err);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [currentPage, searchKey, query]);

  // Build active filters list
  const activeFilters: any[] = [];
  const attributeActiveFilters = useMemo(() => {
    const filters: any[] = [];
    const paramsFromUrl = new URLSearchParams(searchKey);
    const attributeLookup = new Map<
      string,
      { attrName: string; values: Map<string, string> }
    >();

    for (const attr of attributes) {
      const key = attr.filter_code || slugify(attr.name);
      const values = new Map<string, string>();
      for (const val of attr.values || []) {
        values.set(slugify(val.name), val.name);
      }
      attributeLookup.set(key, { attrName: attr.name, values });
    }

    paramsFromUrl.forEach((value, key) => {
      if (["q", "page", "limit"].includes(key)) return;
      const attr = attributeLookup.get(key);
      if (!attr) return;

      (value.split(",") || []).forEach((valSlug) => {
        const valName = attr.values.get(valSlug);
        if (valName) {
          filters.push({ key, attrName: attr.attrName, valSlug, valName });
        }
      });
    });

    return filters;
  }, [attributes, searchKey, query]);

  activeFilters.push(...attributeActiveFilters);

  // Clear/filter handlers
  const handleClearAll = () => {
    const currentPath =
      typeof window !== "undefined"
        ? window.location.pathname
        : "/tim";
    const newParams = new URLSearchParams(searchParamsHook?.toString() || "");
    activeFilters.forEach((f) => {
      if (f.key) newParams.delete(f.key);
    });
    const qs = newParams.toString();
    router.push(qs ? currentPath + "?" + qs : currentPath, {
      scroll: false,
    });
  };

  const handleRemoveFilter = (f: any) => {
    const newParams = new URLSearchParams(searchParamsHook?.toString() || "");
    let vals = newParams.get(f.key)?.split(",") || [];
    vals = vals.filter((v) => v !== f.valSlug);
    if (vals.length > 0) newParams.set(f.key, vals.join(","));
    else newParams.delete(f.key);
    const currentPath =
      typeof window !== "undefined"
        ? window.location.pathname
        : "/tim";
    router.push(currentPath + "?" + newParams.toString(), { scroll: false });
  };

  return (
    <div className="bg-[#0a0a0c] min-h-screen text-white font-sans">
      <Header />

      {/* ─── SEARCH HEADER BAR ─────────────────────── */}
      <div className="max-w-[1800px] mx-auto px-6 pt-6">
        <div className="flex flex-col gap-4 mb-6">
          {/* Title + result count */}
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
              Kết quả tìm kiếm: &ldquo;{query}&rdquo;
            </h1>
            <p className="text-[13px] text-gray-500 mt-1">
              Tìm thấy {totalProducts} sản phẩm
            </p>
          </div>

          {/* Sort bar */}
          <div className="flex flex-col md:flex-row items-center justify-between bg-[#111115] border border-[#1a1a1e] rounded-2xl p-4">
            <h2 className="text-[15px] font-extrabold text-white mb-4 md:mb-0 pl-1 tracking-wide">
              {totalProducts} sản phẩm
            </h2>
            <div className="flex items-center gap-4 w-full md:w-auto">
              {/* Sort Dropdown */}
              <div className="relative shrink-0 min-w-[170px]">
                <select
                  className="w-full appearance-none bg-[#18181b] border border-[#27272a] text-[15px] font-bold text-gray-300 rounded-xl pl-4 pr-10 py-2.5 focus:outline-none focus:border-cyan-700 hover:border-[#3f3f46] transition-all cursor-pointer"
                  onChange={(e) => {
                    const newParams = new URLSearchParams(
                      searchParamsHook?.toString() || ""
                    );
                    if (e.target.value) newParams.set("sort", e.target.value);
                    else newParams.delete("sort");
                    const currentPath =
                      typeof window !== "undefined"
                        ? window.location.pathname
                        : "/tim";
                    const queryString = newParams.toString();
                    router.push(
                      currentPath + (queryString ? "?" + queryString : ""),
                      { scroll: false }
                    );
                  }}
                  defaultValue={searchParamsHook?.get("sort") || ""}
                >
                  <option value="">Sắp xếp mặc định</option>
                  <option value="price_asc">Giá: Thấp {"->"} Cao</option>
                  <option value="price_desc">Giá: Cao {"->"} Thấp</option>
                  <option value="newest">Mới nhất</option>
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none flex flex-col gap-[2px]">
                  <svg
                    className="w-2.5 h-2.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="3"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── PRODUCTS + SIDEBAR ───────────────────── */}
      <div className="max-w-[1800px] mx-auto flex gap-6 px-6 pb-6">
        {/* ===== SIDEBAR LEFT ===== */}
        <aside className="w-[300px] shrink-0 hidden lg:block">
          <div className="bg-[#111115] border border-[#1a1a1e] rounded-2xl p-5 mb-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-base">🔧</span>
                <span className="text-[15px] font-extrabold text-white">
                  Bộ Lọc
                </span>
              </div>
            </div>

            {/* Active Filters */}
            <div
              id="active-filters-sidebar"
              style={activeFilters.length === 0 ? { display: "none" } : {}}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-400 font-semibold">
                  Bộ lọc đã chọn :{" "}
                </span>
                <span
                  id="active-filters-count"
                  className="bg-[#1a1a1e] text-[10px] text-gray-500 px-1.5 py-0.5 rounded font-bold"
                >
                  {activeFilters.length}
                </span>
                <span
                  id="clear-all-filters"
                  className="text-[10px] text-cyan-500 ml-auto cursor-pointer hover:underline"
                  onClick={handleClearAll}
                >
                  Bỏ chọn tất cả
                </span>
              </div>
              <div
                id="active-filters-list"
                className="flex gap-2 mb-4 flex-wrap mt-2"
              >
                {activeFilters.map((f, i) => (
                  <span
                    key={f.isPrice ? "price" : `${f.key}-${f.valSlug}`}
                    className="bg-cyan-900/30 text-cyan-400 border border-cyan-800/50 text-[11px] px-2 py-1 rounded flex items-center gap-1 cursor-pointer hover:bg-cyan-900/50 transition-colors"
                    onClick={() => handleRemoveFilter(f)}
                  >
                    {f.isPrice
                      ? `Giá`
                      : f.valName}
                    <span className="text-cyan-500 hover:text-white">
                      ✕
                    </span>
                  </span>
                ))}
              </div>
            </div>

            {/* Attribute filter blocks */}
            {attributes.map((attr, index) => (
              <AttributeFilterBlock
                key={attr.id}
                attr={attr}
                isLast={index === attributes.length - 1}
                isOpen={index < 4}
              />
            ))}
          </div>
        </aside>

        {/* ===== PRODUCT GRID RIGHT ===== */}
        <main className="flex-1 min-w-0">
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
            id="productGrid"
          >
            {isLoading ? (
              <div className="col-span-1 sm:col-span-2 xl:col-span-4 flex flex-col items-center justify-center py-32 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mb-4"></div>
                <p className="text-gray-400 text-sm font-medium animate-pulse">
                  Đang tìm kiếm sản phẩm...
                </p>
              </div>
            ) : products.length > 0 ? (
              products.map((product) => (
                <Link
                  key={product.id}
                  href={`/${product.slug}`}
                  className="block bg-gradient-to-b from-[#1a1a1d] to-[#111113] border border-[#27272a] rounded-xl overflow-hidden transition-all duration-300 hover:border-[#3f3f46] shadow-[0_4px_12px_rgba(0,0,0,0.2)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.6)] hover:-translate-y-1.5 flex flex-col h-full group relative"
                >
                  {/* Image Area */}
                  <div className="w-full aspect-[4/3] relative flex items-center justify-center bg-[#151518]">
                    <ProgressiveImage
                      src={product.thumbnail}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Content Area */}
                  <div className="p-4 flex flex-col flex-1 relative z-10">
                    {/* Brand */}
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <span className="border border-[#333] bg-[#1a1a1e] text-[#a1a1aa] text-[10.5px] font-medium px-4 py-1 rounded-full">
                        {product.name.split(" ")[0] || "Brand"}
                      </span>
                    </div>

                    {/* Title */}
                    <p
                      className="text-sm font-medium text-center leading-relaxed line-clamp-2 mb-5 min-h-[42px] bg-clip-text text-transparent bg-gradient-to-r from-gray-100 via-gray-300 to-gray-500"
                    >
                      {product.name}
                    </p>

                    {/* Price & Stock */}
                    <div className="flex items-center justify-between mt-auto">
                      <span className="bg-gradient-to-r from-white via-cyan-400 to-purple-500 bg-clip-text text-transparent font-extrabold text-[17px] tracking-wide">
                        {!product.price || product.price == 0 ? (
                          "Liên hệ"
                        ) : (
                          <>
                            {new Intl.NumberFormat("vi-VN").format(
                              product.price
                            )}
                            <span className="text-[12px] font-bold ml-0.5 align-top underline decoration-1 underline-offset-[2px]">
                              đ
                            </span>
                          </>
                        )}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#10b981] text-[11px] font-bold flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></div>
                          In Stock
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-1 sm:col-span-2 xl:col-span-4 flex flex-col items-center justify-center py-20 text-center bg-[#111115] rounded-2xl border border-[#1a1a1e] my-4">
                <div className="w-20 h-20 mb-5 rounded-full bg-[#1a1a1e] border border-[#27272a] flex items-center justify-center text-3xl">
                  🔍
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Không tìm thấy sản phẩm phù hợp
                </h3>
                <p className="text-[15px] text-gray-500 max-w-sm mx-auto mb-6 leading-relaxed">
                  Rất tiếc, không có sản phẩm nào khớp với từ khóa &ldquo;
                  {query}&rdquo;.
                </p>
                <button
                  className="bg-emerald-600/20 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white px-6 py-2 rounded-lg text-sm font-semibold transition-all"
                  onClick={handleClearAll}
                >
                  Bỏ tất cả bộ lọc
                </button>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-12 mb-10">
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.max(1, prev - 1))
                }
                disabled={currentPage === 1}
                className="w-10 h-10 flex items-center justify-center bg-[#18181b] rounded-xl text-gray-400 hover:text-white hover:bg-[#27272a] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>

              <div className="flex gap-2 flex-wrap justify-center">
                {(() => {
                  const range = [];
                  const rangeWithDots: (number | "...")[] = [];
                  let l: number | undefined;

                  for (let i = 1; i <= totalPages; i++) {
                    if (i === 1 || i === totalPages) {
                      range.push(i);
                    } else if (currentPage <= 3 && i <= 5) {
                      range.push(i);
                    } else if (
                      currentPage >= totalPages - 2 &&
                      i >= totalPages - 4
                    ) {
                      range.push(i);
                    } else if (i >= currentPage - 1 && i <= currentPage + 1) {
                      range.push(i);
                    }
                  }

                  for (const i of range) {
                    if (l !== undefined) {
                      if (i - l === 2) {
                        rangeWithDots.push(l + 1);
                      } else if (i - l !== 1) {
                        rangeWithDots.push("...");
                      }
                    }
                    rangeWithDots.push(i);
                    l = i;
                  }

                  return rangeWithDots.map((page, index) =>
                    page === "..." ? (
                      <span
                        key={`dots-${index}`}
                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#18181b] text-gray-500 font-medium"
                      >
                        ...
                      </span>
                    ) : (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page as number)}
                        className={`w-10 h-10 flex items-center justify-center rounded-xl text-[15px] font-semibold transition-all ${
                          currentPage === page
                            ? "bg-[#0b63e5] text-white shadow-[0_4px_12px_rgba(11,99,229,0.3)]"
                            : "bg-[#18181b] text-gray-400 hover:text-white hover:bg-[#27272a]"
                        }`}
                      >
                        {page}
                      </button>
                    )
                  );
                })()}
              </div>

              <button
                onClick={() =>
                  setCurrentPage((prev) =>
                    Math.min(totalPages, prev + 1)
                  )
                }
                disabled={currentPage === totalPages}
                className="w-10 h-10 flex items-center justify-center bg-[#18181b] rounded-xl text-gray-400 hover:text-white hover:bg-[#27272a] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>
          )}
        </main>
      </div>

      <WhyBuyFaq />
      <SimilarProducts />
      <Footer />
    </div>
  );
}
