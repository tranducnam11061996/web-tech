"use client";

import React, { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import ProductGridCard from "../../components/ProductGridCard";
import {
  buildSidebarSectionVisibility,
  type SidebarSectionVisibility,
} from "../../lib/sidebarFilterVisibility";
import {
  buildQueryPath,
  CATALOG_PAGE_SIZE,
  normalizeCatalogPage,
} from "../../lib/pagination";

const unsafeFilterValuePattern = /^(?:javascript\s*:|https?:\/\/|data\s*:|\/\/)/i;

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
  values: { id: number; name: string; apiKey?: string; productCount: number }[];
}

interface AttributeValue {
  id: number;
  name: string;
  apiKey?: string;
  productCount: number;
}

interface PreparedAttribute extends Attribute {
  sectionVisibility: SidebarSectionVisibility<AttributeValue>;
}

interface PriceBounds {
  min: number;
  max: number;
}

export interface SearchClientProps {
  initialData: {
    products: {
      data: Product[];
      pagination: { page: number; limit: number; total: number; totalPages: number };
    };
    attributes: { data: Attribute[] };
    priceBounds: { data: PriceBounds };
    query: string;
  };
}

const slugify = (str: string) => {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .replace(/[^a-z0-9\- ]/g, "")
    .trim()
    .replace(/\s+/g, "-");
};

const getAttributeIcon = (value: unknown) => {
  const icon = String(value || "").trim();
  if (!icon || unsafeFilterValuePattern.test(icon) || icon.length > 16) return "📌";
  return icon;
};

const isDisplayableFilterValue = (value: unknown) => {
  const label = String(value || "").trim();
  return label.length > 0 && !unsafeFilterValuePattern.test(label);
};

function normalizePriceBounds(bounds: PriceBounds | undefined): PriceBounds {
  const min = Number(bounds?.min || 0);
  const max = Number(bounds?.max || 0);
  if (min <= 0 || max <= 0 || max < min) return { min: 0, max: 0 };
  return { min, max };
}

function clampPriceSelection(min: number, max: number, bounds: PriceBounds) {
  if (bounds.min <= 0 || bounds.max <= 0 || bounds.max < bounds.min) {
    return { min: 0, max: 0 };
  }

  const safeMin = Math.min(Math.max(min, bounds.min), bounds.max);
  const safeMax = Math.max(Math.min(max, bounds.max), bounds.min);

  if (safeMin > safeMax) {
    return { min: bounds.min, max: bounds.max };
  }

  return { min: safeMin, max: safeMax };
}

function AttributeFilterBlock({
  attr,
  isLast,
  isOpen,
  isFilterSearchActive,
}: {
  attr: PreparedAttribute;
  isLast: boolean;
  isOpen: boolean;
  isFilterSearchActive: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const [isExpanded, setIsExpanded] = useState(isOpen);
  const router = useRouter();
  const searchParams = useSearchParams();

  const filterKey = attr.filter_code || attr.attribute_code || slugify(attr.name);
  const currentValues = searchParams.get(filterKey)?.split(",") || [];
  const displayValues = showAll
    ? [...attr.sectionVisibility.visibleValues, ...attr.sectionVisibility.collapsedValues]
    : attr.sectionVisibility.visibleValues;
  const collapsedCount = attr.sectionVisibility.collapsedCount;
  const hasVisibleFilterValues = attr.sectionVisibility.visibleValues.length > 0;

  useEffect(() => {
    if (isFilterSearchActive && hasVisibleFilterValues) {
      setIsExpanded(true);
    }
  }, [
    attr.id,
    attr.sectionVisibility.hasMatchedValues,
    attr.sectionVisibility.sectionNameMatches,
    hasVisibleFilterValues,
    isFilterSearchActive,
  ]);

  const handleToggle = (value: AttributeValue) => {
    const valSlug = value.apiKey || slugify(value.name);
    const newParams = new URLSearchParams(searchParams.toString());
    let newValues = [...currentValues];

    if (newValues.includes(valSlug)) {
      newValues = newValues.filter((value) => value !== valSlug);
    } else {
      newValues.push(valSlug);
    }

    if (newValues.length > 0) {
      newParams.set(filterKey, newValues.join(","));
    } else {
      newParams.delete(filterKey);
    }
    newParams.delete("page");

    const currentPath = typeof window !== "undefined" ? window.location.pathname : "/tim";
    router.push(buildQueryPath(currentPath, newParams.toString(), {}), { scroll: false });
  };

  return (
    <div
      className={`filter-section ${isExpanded ? "open" : ""}`}
      style={isLast ? { borderBottom: "none" } : {}}
      data-group={`attr-${attr.id}`}
    >
      <div className="filter-title" onClick={() => setIsExpanded((open) => !open)}>
        <span className="flex items-center gap-2">
          <span className="text-sm">{getAttributeIcon(attr.icon)}</span> {attr.name}
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
      <div className="filter-content mt-3" style={!isExpanded ? { display: "none" } : {}}>
        <div className="space-y-2">
          {displayValues.map((val) => {
            const valSlug = val.apiKey || slugify(val.name);
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
                  onChange={() => handleToggle(val)}
                  className="sr-only"
                />
                <div
                  className={`w-[18px] h-[18px] rounded-[6px] border-2 flex items-center justify-center shrink-0 shadow-sm transition-colors ${
                    isChecked ? "border-cyan-500 bg-cyan-500" : "border-[#4b4b4b] bg-transparent"
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
        {collapsedCount > 0 && (
          <button
            className="flex items-center gap-3 mt-4 mb-2 ml-1 text-[15px] text-gray-400 hover:text-white transition-colors font-medium"
            onClick={() => setShowAll((value) => !value)}
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
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg
                  className="w-3 h-3 text-gray-400 absolute -rotate-45"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="3"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              )}
            </div>
            {showAll ? "Thu gọn" : `+ ${collapsedCount} mục`}
          </button>
        )}
      </div>
    </div>
  );
}

export default function SearchClient({ initialData }: SearchClientProps) {
  const initialBounds = normalizePriceBounds(initialData?.priceBounds?.data);
  const [products, setProducts] = useState<Product[]>(initialData?.products?.data || []);
  const [totalPages, setTotalPages] = useState(initialData?.products?.pagination?.totalPages || 1);
  const [totalProducts, setTotalProducts] = useState(initialData?.products?.pagination?.total || 0);
  const [attributes, setAttributes] = useState<Attribute[]>(initialData?.attributes?.data || []);
  const [priceBounds, setPriceBounds] = useState<PriceBounds>(initialBounds);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarSearchOpen, setIsSidebarSearchOpen] = useState(false);
  const [sidebarSearchKeyword, setSidebarSearchKeyword] = useState("");
  const [isPriceFilterOpen, setIsPriceFilterOpen] = useState(true);
  const [currentPrice, setCurrentPrice] = useState<PriceBounds>(() => {
    return initialBounds.min > 0 ? initialBounds : { min: 0, max: 0 };
  });

  const sidebarSearchInputRef = useRef<HTMLInputElement>(null);
  const searchParamsHook = useSearchParams();
  const searchKey = searchParamsHook?.toString() || "";
  const router = useRouter();
  const rawPage = searchParamsHook?.get("page");
  const currentPage = normalizeCatalogPage(rawPage);
  const [isPending, startTransition] = useTransition();
  const [errorText, setErrorText] = useState("");
  const [retryNonce, setRetryNonce] = useState(0);
  const lastRequestKeyRef = useRef(`${searchKey}|0`);
  const query = searchParamsHook?.get("q") || initialData?.query || "";

  useEffect(() => {
    if (isSidebarSearchOpen) {
      sidebarSearchInputRef.current?.focus();
    }
  }, [isSidebarSearchOpen]);

  useEffect(() => {
    const nextBounds = normalizePriceBounds(priceBounds);
    const urlMin = searchParamsHook?.get("min-price");
    const urlMax = searchParamsHook?.get("max-price");

    if (nextBounds.min <= 0) {
      setCurrentPrice({ min: 0, max: 0 });
      return;
    }

    const nextMin = urlMin ? parseInt(urlMin, 10) : nextBounds.min;
    const nextMax = urlMax ? parseInt(urlMax, 10) : nextBounds.max;
    setCurrentPrice(clampPriceSelection(nextMin, nextMax, nextBounds));
  }, [priceBounds, searchKey, searchParamsHook]);

  const navigateToPage = (page: number, replace = false) => {
    const safePage = Math.min(Math.max(1, page), Math.max(1, totalPages));
    const currentPath = typeof window !== "undefined" ? window.location.pathname : "/tim";
    const href = buildQueryPath(currentPath, searchKey, {
      page: safePage === 1 ? null : String(safePage),
    });

    startTransition(() => {
      if (replace) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    });
  };

  useEffect(() => {
    const canonicalPage = Math.min(currentPage, Math.max(1, totalPages));
    const canonicalValue = canonicalPage === 1 ? null : String(canonicalPage);
    if (rawPage === canonicalValue) return;
    navigateToPage(canonicalPage, true);
  }, [currentPage, rawPage, totalPages]);

  useEffect(() => {
    const requestKey = `${searchKey}|${retryNonce}`;
    if (requestKey === lastRequestKeyRef.current) return;
    lastRequestKeyRef.current = requestKey;

    const controller = new AbortController();
    const requestParams = new URLSearchParams();
    requestParams.set("q", query);
    requestParams.set("limit", String(CATALOG_PAGE_SIZE));
    requestParams.set("page", String(currentPage));

    const paramsFromUrl = new URLSearchParams(searchKey);
    paramsFromUrl.forEach((value, key) => {
      if (!["q", "page", "limit"].includes(key)) {
        requestParams.set(key, value);
      }
    });

    setErrorText("");
    setIsLoading(true);
    void (async () => {
      try {
        const response = await fetch(`/api/search?${requestParams.toString()}`, {
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok || !payload.success) {
          throw new Error(payload.message || "Không thể tải kết quả tìm kiếm");
        }

        const nextTotalPages = Math.max(1, Number(payload.pagination?.totalPages) || 1);
        setTotalPages(nextTotalPages);
        setTotalProducts(Number(payload.pagination?.total) || 0);
        if (currentPage > nextTotalPages) {
          navigateToPage(nextTotalPages, true);
          return;
        }

        setProducts(payload.data || []);
        setAttributes(payload.attributes || []);
        setPriceBounds(normalizePriceBounds(payload.priceBounds));
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Error fetching products:", error);
          setErrorText(
            error instanceof Error ? error.message : "Không thể tải kết quả tìm kiếm",
          );
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [currentPage, query, retryNonce, searchKey]);

  const normalizedSidebarKeyword = sidebarSearchKeyword.trim().toLowerCase();
  const isFilterSearchActive = normalizedSidebarKeyword.length > 0;
  const matchesSidebarSearch = (value: string) =>
    !isFilterSearchActive || value.toLowerCase().includes(normalizedSidebarKeyword);

  const visibleAttributes = useMemo(() => {
    return attributes
      .map((attr) => {
        const displayableValues = (attr.values || []).filter((value) =>
          isDisplayableFilterValue(value.name),
        );
        const filterKey = attr.filter_code || attr.attribute_code || slugify(attr.name);
        const selectedSlugs = new Set(
          (searchParamsHook?.get(filterKey)?.split(",") || []).filter(Boolean),
        );
        const sectionVisibility = buildSidebarSectionVisibility({
          values: displayableValues,
          keyword: normalizedSidebarKeyword,
          sectionName: attr.name || "",
          selectedSlugs,
          slugify,
          getValueSlug: (value: AttributeValue) => value.apiKey || slugify(value.name),
        });

        if (!sectionVisibility.shouldRenderSection) return null;

        return {
          ...attr,
          values: displayableValues,
          sectionVisibility,
        };
      })
      .filter(Boolean) as PreparedAttribute[];
  }, [attributes, normalizedSidebarKeyword, searchParamsHook]);

  const activeFilters = useMemo(() => {
    const filters: Array<{
      key?: string;
      attrName?: string;
      valSlug?: string;
      valName: string;
      isPrice?: boolean;
    }> = [];
    const paramsFromUrl = new URLSearchParams(searchKey);
    const attributeLookup = new Map<string, { attrName: string; values: Map<string, string> }>();

    for (const attr of attributes) {
      const key = attr.filter_code || attr.attribute_code || slugify(attr.name);
      const values = new Map<string, string>();

      for (const val of attr.values || []) {
        values.set(val.apiKey || slugify(val.name), val.name);
      }

      attributeLookup.set(key, { attrName: attr.name, values });
    }

    paramsFromUrl.forEach((value, key) => {
      if (["q", "page", "limit", "sort", "min-price", "max-price"].includes(key)) return;
      const attr = attributeLookup.get(key);
      if (!attr) return;

      value.split(",").forEach((valSlug) => {
        const valName = attr.values.get(valSlug);
        if (valName) {
          filters.push({ key, attrName: attr.attrName, valSlug, valName });
        }
      });
    });

    const urlMin = searchParamsHook?.get("min-price");
    const urlMax = searchParamsHook?.get("max-price");
    if (urlMin || urlMax) {
      filters.unshift({
        isPrice: true,
        valName: `Giá từ: ${new Intl.NumberFormat("vi-VN").format(currentPrice.min)} - ${new Intl.NumberFormat("vi-VN").format(currentPrice.max)}`,
      });
    }

    return filters;
  }, [attributes, currentPrice.max, currentPrice.min, searchKey, searchParamsHook]);

  const hasPriceBounds = priceBounds.min > 0 && priceBounds.max > 0 && priceBounds.max >= priceBounds.min;

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>, type: "min" | "max") => {
    const value = parseInt(e.target.value, 10);

    setCurrentPrice((prev) => {
      if (!hasPriceBounds) return prev;
      let nextMin = prev.min;
      let nextMax = prev.max;

      if (type === "min") {
        nextMin = Math.min(value, prev.max);
      } else {
        nextMax = Math.max(value, prev.min);
      }

      return clampPriceSelection(nextMin, nextMax, priceBounds);
    });
  };

  const handlePriceCommit = () => {
    const newParams = new URLSearchParams(searchParamsHook?.toString() || "");
    if (!hasPriceBounds) {
      newParams.delete("min-price");
      newParams.delete("max-price");
    } else {
      if (currentPrice.min > priceBounds.min) {
        newParams.set("min-price", String(currentPrice.min));
      } else {
        newParams.delete("min-price");
      }

      if (currentPrice.max < priceBounds.max) {
        newParams.set("max-price", String(currentPrice.max));
      } else {
        newParams.delete("max-price");
      }
    }

    newParams.delete("page");
    const currentPath = typeof window !== "undefined" ? window.location.pathname : "/tim";
    startTransition(() => {
      router.push(buildQueryPath(currentPath, newParams.toString(), {}), { scroll: false });
    });
  };

  const handleClearAll = () => {
    const newParams = new URLSearchParams(searchParamsHook?.toString() || "");
    activeFilters.forEach((filter) => {
      if (filter.key) newParams.delete(filter.key);
    });
    newParams.delete("min-price");
    newParams.delete("max-price");
    newParams.delete("page");

    const currentPath = typeof window !== "undefined" ? window.location.pathname : "/tim";
    startTransition(() => {
      router.push(buildQueryPath(currentPath, newParams.toString(), {}), { scroll: false });
    });
  };

  const handleRemoveFilter = (filter: {
    key?: string;
    valSlug?: string;
    isPrice?: boolean;
  }) => {
    const newParams = new URLSearchParams(searchParamsHook?.toString() || "");

    if (filter.isPrice) {
      newParams.delete("min-price");
      newParams.delete("max-price");
    } else if (filter.key && filter.valSlug) {
      let values = newParams.get(filter.key)?.split(",") || [];
      values = values.filter((value) => value !== filter.valSlug);
      if (values.length > 0) newParams.set(filter.key, values.join(","));
      else newParams.delete(filter.key);
    }
    newParams.delete("page");

    const currentPath = typeof window !== "undefined" ? window.location.pathname : "/tim";
    startTransition(() => {
      router.push(buildQueryPath(currentPath, newParams.toString(), {}), { scroll: false });
    });
  };

  const priceTrackStyles = hasPriceBounds
    ? {
        left: `${((currentPrice.min - priceBounds.min) / (priceBounds.max - priceBounds.min || 1)) * 100}%`,
        right: `${100 - ((currentPrice.max - priceBounds.min) / (priceBounds.max - priceBounds.min || 1)) * 100}%`,
      }
    : { left: "0%", right: "100%" };

  return (
    <div className="bg-[#0a0a0c] min-h-screen text-white font-sans">
      <Header />

      <div className="max-w-[1800px] mx-auto px-6 pt-6">
        <div className="flex flex-col gap-4 mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
              Kết quả tìm kiếm: &ldquo;{query}&rdquo;
            </h1>
            <p className="text-[13px] text-gray-500 mt-1">Tìm thấy {totalProducts} sản phẩm</p>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between bg-[#111115] border border-[#1a1a1e] rounded-2xl p-4">
            <h2 className="text-[15px] font-extrabold text-white mb-4 md:mb-0 pl-1 tracking-wide">
              {totalProducts} sản phẩm
            </h2>
            <div className="flex items-center gap-4 w-full md:w-auto">
              <div className="relative shrink-0 min-w-[170px]">
                <select
                  className="w-full appearance-none bg-[#18181b] border border-[#27272a] text-[15px] font-bold text-gray-300 rounded-xl pl-4 pr-10 py-2.5 focus:outline-none focus:border-cyan-700 hover:border-[#3f3f46] transition-all cursor-pointer"
                  onChange={(e) => {
                    const newParams = new URLSearchParams(searchParamsHook?.toString() || "");
                    if (e.target.value) newParams.set("sort", e.target.value);
                    else newParams.delete("sort");
                    newParams.delete("page");

                    const currentPath = typeof window !== "undefined" ? window.location.pathname : "/tim";
                    startTransition(() => {
                      router.push(buildQueryPath(currentPath, newParams.toString(), {}), { scroll: false });
                    });
                  }}
                  defaultValue={searchParamsHook?.get("sort") || ""}
                >
                  <option value="">Sắp xếp mặc định</option>
                  <option value="price_asc">Giá: Thấp {"->"} Cao</option>
                  <option value="price_desc">Giá: Cao {"->"} Thấp</option>
                  <option value="newest">Mới nhất</option>
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none flex flex-col gap-[2px]">
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

      <div className="max-w-[1800px] mx-auto flex gap-6 px-6 pb-6">
        <aside className="w-[300px] shrink-0 hidden lg:block">
          <div className="bg-[#111115] border border-[#1a1a1e] rounded-2xl p-5 mb-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-base">🔧</span>
                <span className="text-[15px] font-extrabold text-white">Bộ Lọc</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <button
                  className="hover:text-white transition"
                  onClick={() => {
                    setIsSidebarSearchOpen((open) => {
                      if (open) setSidebarSearchKeyword("");
                      return !open;
                    });
                  }}
                >
                  🔍 Tìm Nhanh
                </button>
              </div>
            </div>

            <div className={`${isSidebarSearchOpen ? "" : "hidden"} mb-4 transition-all`}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">🔍</span>
                <input
                  ref={sidebarSearchInputRef}
                  type="text"
                  maxLength={100}
                  placeholder="Nhập từ khóa tìm kiếm bộ lọc ..."
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg py-2 pl-8 pr-8 text-sm text-gray-300 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                  value={sidebarSearchKeyword}
                  onChange={(event) => setSidebarSearchKeyword(event.target.value)}
                />
                <button
                  type="button"
                  aria-label="Đóng tìm kiếm bộ lọc"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs transition"
                  onClick={() => {
                    setIsSidebarSearchOpen(false);
                    setSidebarSearchKeyword("");
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div
              id="active-filters-sidebar"
              style={activeFilters.length === 0 ? { display: "none" } : {}}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-400 font-semibold">Bộ lọc đã chọn :</span>
                <span className="bg-[#1a1a1e] text-[10px] text-gray-500 px-1.5 py-0.5 rounded font-bold">
                  {activeFilters.length}
                </span>
                <span
                  className="text-[10px] text-cyan-500 ml-auto cursor-pointer hover:underline"
                  onClick={handleClearAll}
                >
                  Bỏ chọn tất cả
                </span>
              </div>
              <div className="flex gap-2 mb-4 flex-wrap mt-2">
                {activeFilters.map((filter) => (
                  <span
                    key={filter.isPrice ? "price" : `${filter.key}-${filter.valSlug}`}
                    className="bg-cyan-900/30 text-cyan-400 border border-cyan-800/50 text-[11px] px-2 py-1 rounded flex items-center gap-1 cursor-pointer hover:bg-cyan-900/50 transition-colors"
                    onClick={() => handleRemoveFilter(filter)}
                  >
                    {filter.isPrice ? filter.valName : filter.valName}
                    <span className="text-cyan-500 hover:text-white">✕</span>
                  </span>
                ))}
              </div>
            </div>

            <div
              className={`filter-section ${isPriceFilterOpen ? "open" : ""}`}
              style={isFilterSearchActive && !matchesSidebarSearch("Khoảng Giá") ? { display: "none" } : {}}
            >
              <div className="filter-title" onClick={() => setIsPriceFilterOpen((open) => !open)}>
                <span className="flex items-center gap-2">
                  <span className="text-sm">💰</span> Khoảng Giá
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
              <div className="filter-content px-1 mt-2" style={!isPriceFilterOpen ? { display: "none" } : {}}>
                {hasPriceBounds ? (
                  <>
                    <div className="dual-range-container">
                      <div className="dual-range-track" style={priceTrackStyles}></div>
                      <input
                        type="range"
                        aria-label="Giá tối thiểu"
                        className="dual-range-slider"
                        min={priceBounds.min}
                        max={priceBounds.max}
                        value={currentPrice.min}
                        step={1000}
                        onChange={(e) => handlePriceChange(e, "min")}
                        onMouseUp={handlePriceCommit}
                        onTouchEnd={handlePriceCommit}
                      />
                      <input
                        type="range"
                        aria-label="Giá tối đa"
                        className="dual-range-slider"
                        min={priceBounds.min}
                        max={priceBounds.max}
                        value={currentPrice.max}
                        step={1000}
                        onChange={(e) => handlePriceChange(e, "max")}
                        onMouseUp={handlePriceCommit}
                        onTouchEnd={handlePriceCommit}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-500 mt-4">
                      <span>Từ: {new Intl.NumberFormat("vi-VN").format(currentPrice.min)} đ</span>
                      <span>Đến: {new Intl.NumberFormat("vi-VN").format(currentPrice.max)} đ</span>
                    </div>
                  </>
                ) : (
                  <div className="text-[12px] text-gray-500 py-2">Không có khoảng giá khả dụng cho kết quả hiện tại.</div>
                )}
              </div>
            </div>

            {visibleAttributes.map((attr, index) => (
              <AttributeFilterBlock
                key={attr.id}
                attr={attr}
                isLast={index === visibleAttributes.length - 1}
                isOpen={index < 4}
                isFilterSearchActive={isFilterSearchActive}
              />
            ))}
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5" id="productGrid">
            {errorText ? (
              <div
                className="col-span-1 my-4 flex flex-col items-center justify-center rounded-2xl border border-red-500/40 bg-[#111115] px-5 py-20 text-center sm:col-span-2 xl:col-span-4"
                role="alert"
              >
                <h3 className="mb-2 text-lg font-bold text-white">Không thể tải kết quả tìm kiếm</h3>
                <p className="mb-6 max-w-sm text-sm leading-relaxed text-gray-400">
                  Kết nối đang gặp sự cố tạm thời. Hãy thử tải lại kết quả tìm kiếm.
                </p>
                <button
                  type="button"
                  className="rounded-xl bg-red-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-red-500"
                  onClick={() => setRetryNonce((value) => value + 1)}
                >
                  Thử lại
                </button>
              </div>
            ) : isLoading ? (
              <div className="col-span-1 sm:col-span-2 xl:col-span-4 flex flex-col items-center justify-center py-32 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mb-4"></div>
                <p className="text-gray-400 text-sm font-medium animate-pulse">Đang tìm kiếm sản phẩm...</p>
              </div>
            ) : products.length > 0 ? (
              products.map((product) => (
                <ProductGridCard key={product.id} product={product} />
              ))
            ) : (
              <div className="col-span-1 sm:col-span-2 xl:col-span-4 flex flex-col items-center justify-center py-20 text-center bg-[#111115] rounded-2xl border border-[#1a1a1e] my-4">
                <div className="w-20 h-20 mb-5 rounded-full bg-[#1a1a1e] border border-[#27272a] flex items-center justify-center text-3xl">
                  🔍
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Không tìm thấy sản phẩm phù hợp</h3>
                <p className="text-[15px] text-gray-500 max-w-sm mx-auto mb-6 leading-relaxed">
                  Rất tiếc, không có sản phẩm nào khớp với từ khóa &ldquo;{query}&rdquo;.
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

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-12 mb-10">
              <button
                type="button"
                aria-label="Trang trước"
                onClick={() => navigateToPage(currentPage - 1)}
                disabled={currentPage === 1 || isPending || isLoading}
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
                  const range: number[] = [];
                  const rangeWithDots: Array<number | "..."> = [];
                  let lastPage: number | undefined;

                  for (let page = 1; page <= totalPages; page += 1) {
                    if (page === 1 || page === totalPages) {
                      range.push(page);
                    } else if (currentPage <= 3 && page <= 5) {
                      range.push(page);
                    } else if (currentPage >= totalPages - 2 && page >= totalPages - 4) {
                      range.push(page);
                    } else if (page >= currentPage - 1 && page <= currentPage + 1) {
                      range.push(page);
                    }
                  }

                  for (const page of range) {
                    if (lastPage !== undefined) {
                      if (page - lastPage === 2) {
                        rangeWithDots.push(lastPage + 1);
                      } else if (page - lastPage !== 1) {
                        rangeWithDots.push("...");
                      }
                    }
                    rangeWithDots.push(page);
                    lastPage = page;
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
                        type="button"
                        aria-label={`Đến trang ${page}`}
                        aria-current={currentPage === page ? "page" : undefined}
                        onClick={() => navigateToPage(page as number)}
                        disabled={isPending || isLoading}
                        className={`w-10 h-10 flex items-center justify-center rounded-xl text-[15px] font-semibold transition-all ${
                          currentPage === page
                            ? "bg-[#0b63e5] text-white shadow-[0_4px_12px_rgba(11,99,229,0.3)]"
                            : "bg-[#18181b] text-gray-400 hover:text-white hover:bg-[#27272a]"
                        }`}
                      >
                        {page}
                      </button>
                    ),
                  );
                })()}
              </div>

              <button
                type="button"
                aria-label="Trang sau"
                onClick={() => navigateToPage(currentPage + 1)}
                disabled={currentPage === totalPages || isPending || isLoading}
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

      <Footer />
    </div>
  );
}
