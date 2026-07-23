"use client";

import React, { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import ProductGridCard from "../../components/ProductGridCard";
import {
  buildSidebarSectionVisibility,
  type SidebarSectionVisibility,
} from "../../lib/sidebarFilterVisibility";
import {
  buildDesktopPaginationItems,
  buildMobilePaginationItems,
  buildQueryPath,
  CATALOG_PAGE_SIZE,
  normalizeCatalogPage,
  type PaginationItem,
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
  idPrefix,
}: {
  attr: PreparedAttribute;
  isLast: boolean;
  isOpen: boolean;
  isFilterSearchActive: boolean;
  idPrefix: string;
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
  const contentId = `${idPrefix}-attribute-${attr.id}`;

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
      data-group={`${idPrefix}-attr-${attr.id}`}
    >
      <button
        type="button"
        className="filter-title"
        onClick={() => setIsExpanded((open) => !open)}
        aria-expanded={isExpanded}
        aria-controls={contentId}
      >
        <span className="flex items-center gap-2">
          <span className="text-sm" aria-hidden="true">{getAttributeIcon(attr.icon)}</span> {attr.name}
        </span>
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      <div id={contentId} className="filter-content mt-3" hidden={!isExpanded}>
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
                  <span className="text-[11px] px-2 py-[2px] rounded-md font-medium bg-[#27272a] text-[#d6a879] ml-2">
                    {val.productCount}
                  </span>
                )}
              </label>
            );
          })}
        </div>
        {collapsedCount > 0 && (
          <button
            type="button"
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
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<PriceBounds>(() => {
    return initialBounds.min > 0 ? initialBounds : { min: 0, max: 0 };
  });

  const desktopSearchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const mobileFilterDialogRef = useRef<HTMLDialogElement>(null);
  const mobileFilterTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileFilterCloseRef = useRef<HTMLButtonElement>(null);
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
      const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
      (isDesktop ? desktopSearchInputRef : mobileSearchInputRef).current?.focus();
    }
  }, [isSidebarSearchOpen]);

  const closeMobileFilter = () => {
    setIsMobileFilterOpen(false);
    window.setTimeout(() => mobileFilterTriggerRef.current?.focus(), 0);
  };

  useEffect(() => {
    const dialog = mobileFilterDialogRef.current;
    if (!dialog) return;

    if (isMobileFilterOpen && !dialog.open) {
      dialog.showModal();
      document.body.classList.add("category-filter-dialog-open");
      window.requestAnimationFrame(() => mobileFilterCloseRef.current?.focus());
    } else if (!isMobileFilterOpen && dialog.open) {
      dialog.close();
      document.body.classList.remove("category-filter-dialog-open");
    }

    return () => document.body.classList.remove("category-filter-dialog-open");
  }, [isMobileFilterOpen]);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 1024px)");
    const handleDesktopChange = (event: MediaQueryListEvent) => {
      if (event.matches) setIsMobileFilterOpen(false);
    };
    desktopQuery.addEventListener("change", handleDesktopChange);
    return () => desktopQuery.removeEventListener("change", handleDesktopChange);
  }, []);

  useEffect(() => {
    setIsMobileFilterOpen(false);
  }, [query]);

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

  const handleSortChange = (value: string) => {
    const newParams = new URLSearchParams(searchParamsHook?.toString() || "");
    if (value) newParams.set("sort", value);
    else newParams.delete("sort");
    newParams.delete("page");

    const currentPath = typeof window !== "undefined" ? window.location.pathname : "/tim";
    startTransition(() => {
      router.push(buildQueryPath(currentPath, newParams.toString(), {}), { scroll: false });
    });
  };

  const renderSortSelect = (surface: "desktop" | "mobile") => (
    <div className={`relative shrink-0 ${surface === "desktop" ? "min-w-[170px]" : "w-full"}`}>
      <label htmlFor={`${surface}-search-sort`} className={surface === "mobile" ? "mb-2 block text-xs font-semibold text-gray-400" : "sr-only"}>
        Sắp xếp sản phẩm
      </label>
      <select
        id={`${surface}-search-sort`}
        data-search-sort={surface}
        aria-label="Sắp xếp sản phẩm"
        className="w-full appearance-none rounded-xl border border-[#323238] bg-[#18181b] py-2.5 pl-4 pr-10 text-[15px] font-bold text-gray-300 outline-none transition-colors hover:border-[#4a4a52] focus:border-cyan-600"
        onChange={(event) => handleSortChange(event.target.value)}
        value={searchParamsHook?.get("sort") || ""}
      >
        <option value="">Sắp xếp mặc định</option>
        <option value="price_asc">Giá: Thấp → Cao</option>
        <option value="price_desc">Giá: Cao → Thấp</option>
        <option value="newest">Mới nhất</option>
      </select>
      {surface === "desktop" && (
        <svg aria-hidden="true" className="pointer-events-none absolute bottom-3.5 right-3.5 h-3 w-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
        </svg>
      )}
    </div>
  );

  const renderFilterPanel = (surface: "desktop" | "mobile") => {
    const idPrefix = `${surface}-search-filter`;
    const searchInputRef = surface === "desktop" ? desktopSearchInputRef : mobileSearchInputRef;
    const priceContentId = `${idPrefix}-price-content`;

    return (
      <div className={surface === "desktop" ? "rounded-2xl border border-[#1a1a1e] bg-[#111115] p-5" : "px-4 pb-6"}>
        {surface === "desktop" && (
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal aria-hidden="true" className="h-4 w-4 text-gray-400" />
              <span className="text-[15px] font-extrabold text-white">Bộ lọc</span>
            </div>
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-gray-500 transition-colors hover:text-white"
              aria-expanded={isSidebarSearchOpen}
              aria-controls={`${idPrefix}-search`}
              onClick={() => {
                setIsSidebarSearchOpen((open) => {
                  if (open) setSidebarSearchKeyword("");
                  return !open;
                });
              }}
            >
              <Search aria-hidden="true" className="h-3.5 w-3.5" />
              Tìm nhanh
            </button>
          </div>
        )}

        {surface === "mobile" && <div className="mb-5">{renderSortSelect("mobile")}</div>}

        <div id={`${idPrefix}-search`} className={`${isSidebarSearchOpen ? "" : "hidden"} mb-4`}>
          <label htmlFor={`${idPrefix}-search-input`} className="sr-only">Tìm nhanh bộ lọc</label>
          <div className="relative">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500" />
            <input
              ref={searchInputRef}
              type="search"
              maxLength={100}
              id={`${idPrefix}-search-input`}
              placeholder="Nhập từ khóa tìm kiếm bộ lọc..."
              className="w-full rounded-lg border border-[#323238] bg-[#18181b] py-2 pl-9 pr-9 text-sm text-gray-300 outline-none transition-colors focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
              value={sidebarSearchKeyword}
              onChange={(event) => setSidebarSearchKeyword(event.target.value)}
            />
            <button
              type="button"
              aria-label="Đóng tìm kiếm bộ lọc"
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-gray-500 hover:bg-white/5 hover:text-white"
              onClick={() => {
                setIsSidebarSearchOpen(false);
                setSidebarSearchKeyword("");
              }}
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>

        {activeFilters.length > 0 && (
          <div id={`${idPrefix}-active-filters`}>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-400">Bộ lọc đã chọn:</span>
              <span className="rounded bg-[#1a1a1e] px-1.5 py-0.5 text-[10px] font-bold text-gray-500">{activeFilters.length}</span>
              <button type="button" className="ml-auto text-[11px] text-cyan-500 hover:underline" onClick={handleClearAll}>
                Bỏ chọn tất cả
              </button>
            </div>
            <div className="mb-4 mt-2 flex flex-wrap gap-2">
              {activeFilters.map((filter) => (
                <button
                  type="button"
                  key={filter.isPrice ? "price" : `${filter.key}-${filter.valSlug}`}
                  className="flex items-center gap-1 rounded border border-cyan-800/50 bg-cyan-900/30 px-2 py-1 text-left text-[11px] text-cyan-400 transition-colors hover:bg-cyan-900/50"
                  onClick={() => handleRemoveFilter(filter)}
                  aria-label={`Bỏ bộ lọc ${filter.isPrice ? "khoảng giá" : filter.valName}`}
                >
                  {filter.valName}
                  <X aria-hidden="true" className="h-3 w-3" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div
          className={`filter-section ${isPriceFilterOpen ? "open" : ""}`}
          style={isFilterSearchActive && !matchesSidebarSearch("Khoảng Giá") ? { display: "none" } : {}}
        >
          <button
            type="button"
            className="filter-title"
            onClick={() => setIsPriceFilterOpen((open) => !open)}
            aria-expanded={isPriceFilterOpen}
            aria-controls={priceContentId}
          >
            <span className="flex items-center gap-2"><span aria-hidden="true" className="text-sm">💰</span> Khoảng Giá</span>
            <svg aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
          </button>
          <div id={priceContentId} className="filter-content mt-2 px-1" hidden={!isPriceFilterOpen}>
            {hasPriceBounds ? (
              <>
                <div className="dual-range-container">
                  <div className="dual-range-track" style={priceTrackStyles} />
                  <input type="range" id={`${idPrefix}-price-min`} aria-label="Giá tối thiểu" className="dual-range-slider" min={priceBounds.min} max={priceBounds.max} value={currentPrice.min} step={1000} onChange={(event) => handlePriceChange(event, "min")} onMouseUp={handlePriceCommit} onTouchEnd={handlePriceCommit} />
                  <input type="range" id={`${idPrefix}-price-max`} aria-label="Giá tối đa" className="dual-range-slider" min={priceBounds.min} max={priceBounds.max} value={currentPrice.max} step={1000} onChange={(event) => handlePriceChange(event, "max")} onMouseUp={handlePriceCommit} onTouchEnd={handlePriceCommit} />
                </div>
                <div className="mt-4 flex justify-between text-[10px] text-gray-500">
                  <span>Từ: {new Intl.NumberFormat("vi-VN").format(currentPrice.min)} đ</span>
                  <span>Đến: {new Intl.NumberFormat("vi-VN").format(currentPrice.max)} đ</span>
                </div>
              </>
            ) : (
              <div className="py-2 text-[12px] text-gray-500">Không có khoảng giá khả dụng cho kết quả hiện tại.</div>
            )}
          </div>
        </div>

        {visibleAttributes.map((attr, index) => (
          <AttributeFilterBlock
            key={`${surface}-${attr.id}`}
            attr={attr}
            isLast={index === visibleAttributes.length - 1}
            isOpen={index < 4}
            isFilterSearchActive={isFilterSearchActive}
            idPrefix={idPrefix}
          />
        ))}
      </div>
    );
  };

  const renderPaginationItems = (items: PaginationItem[]) => items.map((page, index) =>
    page === "..." ? (
      <span key={`dots-${index}`} aria-hidden="true" className="flex size-10 items-center justify-center rounded-xl bg-[#18181b] font-medium text-gray-500">...</span>
    ) : (
      <button
        key={page}
        type="button"
        aria-label={`Đến trang ${page}`}
        aria-current={currentPage === page ? "page" : undefined}
        onClick={() => navigateToPage(page)}
        disabled={isPending || isLoading}
        className={`flex size-10 items-center justify-center rounded-xl text-[15px] font-semibold tabular-nums transition-colors ${currentPage === page
            ? "bg-[#0b63e5] text-white shadow-[0_4px_12px_rgba(11,99,229,0.3)]"
            : "bg-[#18181b] text-gray-400 hover:bg-[#27272a] hover:text-white"
          }`}
      >
        {page}
      </button>
    ),
  );

  return (
    <div className="bg-[#0a0a0c] min-h-screen text-white font-sans">
      <Header />

      <div className="max-w-[1800px] mx-auto px-3 pt-6 sm:px-6">
        <div className="flex flex-col gap-4 mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
              Kết quả tìm kiếm: &ldquo;{query}&rdquo;
            </h1>
            <p className="text-[13px] text-gray-500 mt-1">Tìm thấy {totalProducts} sản phẩm</p>
          </div>

          <div data-search-toolbar className="flex min-w-0 items-center justify-between gap-2 rounded-2xl border border-[#1a1a1e] bg-[#111115] p-2 sm:p-4">
            <h2 className="min-w-0 flex-1 truncate pl-1 text-[15px] font-extrabold text-white">
              {totalProducts} sản phẩm
            </h2>
            <div className="hidden lg:block">{renderSortSelect("desktop")}</div>
            <button
              ref={mobileFilterTriggerRef}
              type="button"
              data-search-filter-trigger
              className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-[#3b82f6] bg-[#0b63e5] px-3 text-sm font-semibold text-white shadow-sm hover:border-[#60a5fa] hover:bg-[#0a58cc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111115] lg:hidden"
              aria-haspopup="dialog"
              aria-expanded={isMobileFilterOpen}
              aria-controls="mobile-search-filter-dialog"
              onClick={() => setIsMobileFilterOpen(true)}
            >
              <SlidersHorizontal aria-hidden="true" className="size-[18px]" />
              Bộ lọc
            </button>
          </div>
        </div>
      </div>

      <dialog
        ref={mobileFilterDialogRef}
        id="mobile-search-filter-dialog"
        data-search-mobile-filter-dialog
        aria-labelledby="mobile-search-filter-title"
        className="fixed inset-y-0 left-0 m-0 h-[calc(100dvh-60px)] max-h-none w-[min(340px,calc(100vw-48px))] max-w-none overflow-hidden border-0 border-r border-[#303036] bg-[#202124] p-0 text-white shadow-2xl backdrop:bg-black/70 md:h-dvh lg:hidden"
        onCancel={(event) => {
          event.preventDefault();
          closeMobileFilter();
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeMobileFilter();
        }}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex shrink-0 items-center gap-2 border-b border-[#303036] px-4 py-3">
            <SlidersHorizontal aria-hidden="true" className="h-5 w-5 text-gray-400" />
            <h2 id="mobile-search-filter-title" className="text-lg font-extrabold">Bộ lọc</h2>
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                className="flex h-10 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-gray-400 hover:bg-white/5 hover:text-white"
                aria-expanded={isSidebarSearchOpen}
                aria-controls="mobile-search-filter-search"
                onClick={() => {
                  setIsSidebarSearchOpen((open) => {
                    if (open) setSidebarSearchKeyword("");
                    return !open;
                  });
                }}
              >
                <Search aria-hidden="true" className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">Tìm nhanh</span>
              </button>
              <button
                type="button"
                className="flex h-10 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-gray-400 hover:bg-white/5 hover:text-white"
                onClick={handleClearAll}
              >
                <RotateCcw aria-hidden="true" className="h-4 w-4" />
                Đặt lại
              </button>
              <button
                ref={mobileFilterCloseRef}
                type="button"
                aria-label="Đóng bộ lọc"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#45454c] text-gray-300 hover:bg-white/5 hover:text-white"
                onClick={closeMobileFilter}
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-4">
            {renderFilterPanel("mobile")}
          </div>
        </div>
      </dialog>

      <div className="max-w-[1800px] mx-auto flex gap-6 px-3 pb-6 sm:px-6">
        <aside data-search-desktop-filter className="hidden w-[300px] shrink-0 lg:block">
          <div className="mb-5">{renderFilterPanel("desktop")}</div>
        </aside>

        <main className="flex-1 min-w-0">
          <div data-search-product-grid className="grid grid-cols-2 gap-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4" id="productGrid">
            {errorText ? (
              <div
                className="col-span-2 my-4 flex flex-col items-center justify-center rounded-2xl border border-red-500/40 bg-[#111115] px-5 py-20 text-center lg:col-span-3 xl:col-span-4"
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
              <div className="col-span-2 flex flex-col items-center justify-center py-32 text-center lg:col-span-3 xl:col-span-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mb-4"></div>
                <p className="text-gray-400 text-sm font-medium animate-pulse">Đang tìm kiếm sản phẩm...</p>
              </div>
            ) : products.length > 0 ? (
              products.map((product) => (
                <ProductGridCard key={product.id} product={product} />
              ))
            ) : (
              <div className="col-span-2 my-4 flex flex-col items-center justify-center rounded-2xl border border-[#1a1a1e] bg-[#111115] py-20 text-center lg:col-span-3 xl:col-span-4">
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
            <nav data-search-pagination aria-label="Phân trang sản phẩm" className="mt-12 mb-10 flex flex-nowrap items-center justify-center gap-2">
              <button
                type="button"
                aria-label="Trang trước"
                onClick={() => navigateToPage(currentPage - 1)}
                disabled={currentPage === 1 || isPending || isLoading}
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#18181b] text-gray-400 transition-colors hover:bg-[#27272a] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
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

              <div data-search-pagination-pages="mobile" className="flex flex-nowrap justify-center gap-2 lg:hidden">
                {renderPaginationItems(buildMobilePaginationItems(currentPage, totalPages))}
              </div>
              <div data-search-pagination-pages="desktop" className="hidden flex-wrap justify-center gap-2 lg:flex">
                {renderPaginationItems(buildDesktopPaginationItems(currentPage, totalPages))}
              </div>

              <button
                type="button"
                aria-label="Trang sau"
                onClick={() => navigateToPage(currentPage + 1)}
                disabled={currentPage === totalPages || isPending || isLoading}
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#18181b] text-gray-400 transition-colors hover:bg-[#27272a] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
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
            </nav>
          )}
        </main>
      </div>

      <Footer />
    </div>
  );
}
