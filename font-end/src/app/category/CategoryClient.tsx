"use client";
import React, { Suspense, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RotateCcw, Search, SlidersHorizontal, X } from "lucide-react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import WhyBuyFaq from "../../components/WhyBuyFaq";
import ProgressiveImage from "../../components/ProgressiveImage";
import CategoryFeatureBox from "../../components/CategoryFeatureBox";
import CategoryFeatureProductGrid from "../../components/CategoryFeatureProductGrid";
import CategoryPromoCards from "../../components/CategoryPromoCards";
import Breadcrumb from "../../components/Breadcrumb";
import Link from "next/link";
import type { CategoryTrailItem } from "../../types/breadcrumb";
import {
  buildSidebarSectionVisibility,
  type SidebarSectionVisibility,
} from "../../lib/sidebarFilterVisibility";
import { sanitizeLegacyHtml } from "../../lib/sanitizeHtml";
import {
  buildDesktopPaginationItems,
  buildMobilePaginationItems,
  buildQueryPath,
  CATALOG_PAGE_SIZE,
  normalizeCatalogPage,
  type PaginationItem,
} from "../../lib/pagination";
import { getCategoryDisplayTitle } from "../../lib/categoryTitle";

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

const isValidHtmlContent = (htmlString: string | null | undefined) => {
  if (!htmlString) return false;
  return htmlString.replace(/<[^>]*>?/gm, "").trim().length > 5;
};

const CATEGORY_SUMMARY_FALLBACK = "Sẵn kho - Đa dạng - Giá tốt - Bảo hành chính hãng";

const normalizeCategorySummary = (value: unknown) => {
  const html = sanitizeLegacyHtml(String(value || ""));
  const plainText = html
    .replace(/<[^>]*>?/gm, " ")
    .replace(/&(?:nbsp|#160);/gi, " ")
    .replace(/&(?:amp|#38);/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
  return plainText.length >= 10 ? html : "";
};

const unsafeFilterValuePattern = /^(?:javascript\s*:|https?:\/\/|data\s*:|\/\/)/i;

const getAttributeIcon = (value: unknown) => {
  const icon = String(value || "").trim();
  if (!icon || unsafeFilterValuePattern.test(icon) || icon.length > 16) return "📌";
  return icon;
};

const isDisplayableFilterValue = (value: unknown) => {
  const label = String(value || "").trim();
  return label.length > 0 && !unsafeFilterValuePattern.test(label);
};

interface AttributeValue {
  id: number;
  name: string;
  apiKey?: string;
  productCount: number;
}

interface PreparedAttribute {
  id: number;
  name: string;
  icon: string | null;
  filter_code?: string;
  attribute_code?: string;
  values: AttributeValue[];
  sectionVisibility: SidebarSectionVisibility<AttributeValue>;
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
      newValues = newValues.filter((v) => v !== valSlug);
    } else {
      newValues.push(valSlug);
    }

    if (newValues.length > 0) {
      newParams.set(filterKey, newValues.join(","));
    } else {
      newParams.delete(filterKey);
    }
    newParams.delete("page");

    // Maintain current route
    const currentPath =
      typeof window !== "undefined" ? window.location.pathname : "/";
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
      <div
        id={contentId}
        className="filter-content mt-3"
        style={!isExpanded ? { display: "none" } : {}}
      >
        <div className="space-y-2">
          {displayValues.map((val: any) => {
            const valSlug = val.apiKey || slugify(val.name);
            const isChecked = currentValues.includes(valSlug);
            return (
              <label
                key={val.id}
                className={`flex items-center p-[10px] rounded-[10px] border cursor-pointer transition-all ${isChecked
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
                <div className={`w-[18px] h-[18px] rounded-[6px] border-2 flex items-center justify-center shrink-0 shadow-sm transition-colors ${isChecked ? 'border-cyan-500 bg-cyan-500' : 'border-[#4b4b4b] bg-transparent'}`}>
                  {isChecked && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span
                  className={`flex-1 font-medium text-sm ml-3 transition-colors ${isChecked ? "text-white" : "text-[#d1d5db] hover:text-white"
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
            onClick={() => setShowAll(!showAll)}
          >
            <div className="relative w-[20px] h-[20px] flex items-center justify-center rounded-[3px] bg-[#1a1a1e] border border-[#27272a] rotate-45 shrink-0 m-1">
              {showAll ? (
                <svg className="w-2.5 h-2.5 text-gray-400 absolute -rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-3 h-3 text-gray-400 absolute -rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
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

export default function CategoryContent({ categoryId, params, searchParams, initialData, categoryInfo }: any) {
  const rawCategoryTrail = categoryInfo?.categoryTrail || initialData?.products?.layoutMeta?.categoryTrail || [];
  const catalogTitle = getCategoryDisplayTitle(categoryInfo?.metaTitle, categoryInfo?.name);
  const categorySummaryHtml = normalizeCategorySummary(categoryInfo?.summary);
  const categoryTrail: CategoryTrailItem[] = Array.isArray(rawCategoryTrail) ? rawCategoryTrail : [];
  const categoryBreadcrumbItems = categoryTrail.length > 0
    ? categoryTrail.map((category, index) => ({
        label: category.name,
        href: index < categoryTrail.length - 1 ? `/${category.slug}` : undefined,
      }))
    : [{ label: categoryInfo?.name || "Danh mục sản phẩm" }];

  const [products, setProducts] = useState<any[]>(initialData?.products?.data || []);
  const [featureBox, setFeatureBox] = useState<any>(
    categoryInfo?.featureBox || initialData?.products?.layoutMeta?.featureBox || null,
  );
  const [totalPages, setTotalPages] = useState(initialData?.products?.pagination?.totalPages || 1);
  const [totalProducts, setTotalProducts] = useState(initialData?.products?.pagination?.total || 0);
  const [subcategories, setSubcategories] = useState<any[]>(initialData?.categories?.data || []);
  const [attributes, setAttributes] = useState<any[]>(initialData?.attributes?.data || []);
  const [priceBounds, setPriceBounds] = useState(initialData?.priceBounds?.data || { min: 0, max: 200000000 });
  const searchParamsHook = useSearchParams();
  const searchKey = searchParamsHook?.toString() || "";
  const rawPage = searchParamsHook?.get("page");
  const currentPage = normalizeCatalogPage(rawPage);
  const activeCategoryId = categoryId || searchParamsHook?.get("id") || undefined;
  const activeCategoryKey = activeCategoryId ? String(activeCategoryId) : "";
  const [isPending, startTransition] = useTransition();
  const [errorText, setErrorText] = useState("");
  const [retryNonce, setRetryNonce] = useState(0);

  const hasInitialData = !!(initialData && Object.keys(initialData).length > 0);
  const [showAllSubcategories, setShowAllSubcategories] = useState(false);
  const [isStaticHtmlExpanded, setIsStaticHtmlExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(!hasInitialData); // Loading if no SSR data
  const [isSidebarSearchOpen, setIsSidebarSearchOpen] = useState(false);
  const [sidebarSearchKeyword, setSidebarSearchKeyword] = useState("");
  const [isPriceFilterOpen, setIsPriceFilterOpen] = useState(true);
  const [isCategoryFilterOpen, setIsCategoryFilterOpen] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const desktopSearchInputRef = useRef<HTMLInputElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const mobileFilterDialogRef = useRef<HTMLDialogElement>(null);
  const mobileFilterTriggerRef = useRef<HTMLButtonElement>(null);
  const mobileFilterCloseRef = useRef<HTMLButtonElement>(null);
  const [currentPrice, setCurrentPrice] = useState({
    min: searchParamsHook?.get("min-price")
      ? parseInt(searchParamsHook.get("min-price") as string, 10)
      : 0,
    max: searchParamsHook?.get("max-price")
      ? parseInt(searchParamsHook.get("max-price") as string, 10)
      : 200000000,
  });
  const router = useRouter();

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
  }, [activeCategoryKey]);

  const activeFilters: any[] = [];

  const attributeActiveFilters = useMemo(() => {
    const filters: any[] = [];
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
      if (["id", "page", "limit", "category_id", "sort", "min-price", "max-price"].includes(key)) return;
      const attr = attributeLookup.get(key);
      if (!attr) return;

      value.split(",").forEach((valSlug) => {
        const valName = attr.values.get(valSlug);
        if (valName) {
          filters.push({
            key,
            attrName: attr.attrName,
            valSlug,
            valName,
          });
        }
      });
    });

    return filters;
  }, [attributes, searchKey]);

  activeFilters.push(...attributeActiveFilters);

  const normalizedSidebarKeyword = sidebarSearchKeyword.trim().toLowerCase();
  const isFilterSearchActive = normalizedSidebarKeyword.length > 0;
  const matchesSidebarSearch = (value: string) =>
    !isFilterSearchActive || value.toLowerCase().includes(normalizedSidebarKeyword);

  const visibleSubcategories = useMemo(() => {
    if (!isFilterSearchActive || matchesSidebarSearch("Danh má»¥c con")) return subcategories;
    return subcategories.filter((subCat) => matchesSidebarSearch(subCat.name || ""));
  }, [isFilterSearchActive, normalizedSidebarKeyword, subcategories]);

  const visibleAttributes = useMemo(() => {
    return attributes
      .map((attr) => {
        const displayableValues = (attr.values || []).filter((value: any) =>
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
  const urlMin = searchParamsHook?.get("min-price");
  const urlMax = searchParamsHook?.get("max-price");
  if (urlMin || urlMax) {
    activeFilters.unshift({
      isPrice: true,
      valName: `Giá từ: ${new Intl.NumberFormat("vi-VN").format(urlMin ? parseInt(urlMin, 10) : priceBounds.min)} - ${new Intl.NumberFormat("vi-VN").format(urlMax ? parseInt(urlMax, 10) : priceBounds.max)}`,
    });
  }

  useEffect(() => {
    const minParam = searchParamsHook?.get("min-price");
    const maxParam = searchParamsHook?.get("max-price");
    setCurrentPrice({
      min: minParam ? parseInt(minParam, 10) : priceBounds.min,
      max: maxParam ? parseInt(maxParam, 10) : priceBounds.max,
    });
  }, [searchKey, priceBounds]);

  const handlePriceChange = (e: any, type: "min" | "max") => {
    const val = parseInt(e.target.value, 10);
    setCurrentPrice((prev) => {
      let newMin = prev.min;
      let newMax = prev.max;
      if (type === "min") newMin = Math.min(val, prev.max - 1000);
      else newMax = Math.max(val, prev.min + 1000);
      return { min: newMin, max: newMax };
    });
  };

  const handlePriceCommit = () => {
    const newParams = new URLSearchParams(searchParamsHook?.toString() || "");
    if (currentPrice.min > priceBounds.min)
      newParams.set("min-price", currentPrice.min.toString());
    else newParams.delete("min-price");
    if (currentPrice.max < priceBounds.max)
      newParams.set("max-price", currentPrice.max.toString());
    else newParams.delete("max-price");
    newParams.delete("page");
    const currentPath =
      typeof window !== "undefined" ? window.location.pathname : "/";
    startTransition(() => {
      router.push(buildQueryPath(currentPath, newParams.toString(), {}), { scroll: false });
    });
  };

  // Clear all filters handler
  const handleClearAll = () => {
    const newParams = new URLSearchParams(searchParamsHook?.toString() || "");
    activeFilters.forEach((f) => {
      if (f.key) newParams.delete(f.key);
    });
    newParams.delete("min-price");
    newParams.delete("max-price");
    newParams.delete("page");
    const currentPath =
      typeof window !== "undefined" ? window.location.pathname : "/";
    startTransition(() => {
      router.push(buildQueryPath(currentPath, newParams.toString(), {}), { scroll: false });
    });
  };

  // Remove single filter
  const handleRemoveFilter = (f: any) => {
    if (f.isPrice) {
      const newParams = new URLSearchParams(searchParamsHook?.toString() || "");
      newParams.delete("min-price");
      newParams.delete("max-price");
      newParams.delete("page");
      const currentPath =
        typeof window !== "undefined" ? window.location.pathname : "/";
      startTransition(() => {
        router.push(buildQueryPath(currentPath, newParams.toString(), {}), { scroll: false });
      });
      return;
    }
    const newParams = new URLSearchParams(searchParamsHook?.toString() || "");
    let vals = newParams.get(f.key)?.split(",") || [];
    vals = vals.filter((v) => v !== f.valSlug);
    if (vals.length > 0) newParams.set(f.key, vals.join(","));
    else newParams.delete(f.key);
    newParams.delete("page");
    const currentPath =
      typeof window !== "undefined" ? window.location.pathname : "/";
    startTransition(() => {
      router.push(buildQueryPath(currentPath, newParams.toString(), {}), { scroll: false });
    });
  };

  const isFirstProductRender = useRef(hasInitialData);
  const isFirstMetadataRender = useRef(hasInitialData);
  const lastRequestKeyRef = useRef(`${activeCategoryKey}|${searchKey}|0`);

  const navigateToPage = (page: number, replace = false) => {
    const safePage = Math.min(Math.max(1, page), Math.max(1, totalPages));
    const currentPath = typeof window !== "undefined" ? window.location.pathname : "/";
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
    if (isFirstProductRender.current && retryNonce === 0) {
      isFirstProductRender.current = false;
      return; // Skip fetching on mount only if SSR provided initial data
    }

    const requestKey = `${activeCategoryKey}|${searchKey}|${retryNonce}`;
    if (requestKey === lastRequestKeyRef.current) return;
    lastRequestKeyRef.current = requestKey;

    const controller = new AbortController();
    const requestParams = new URLSearchParams();
    requestParams.set("limit", String(CATALOG_PAGE_SIZE));
    requestParams.set("page", String(currentPage));

    if (activeCategoryKey) {
      requestParams.set("category_id", activeCategoryKey);
      requestParams.set("feature_scope", "configured");
    }

    // Append extra filter attributes
    const paramsFromUrl = new URLSearchParams(searchKey);
    paramsFromUrl.forEach((value, key) => {
      if (!["id", "page", "limit", "category_id", "feature_scope"].includes(key)) {
        requestParams.set(key, value);
      }
    });

    setErrorText("");
    setIsLoading(true);
    void (async () => {
      try {
        const response = await fetch(`/api/products?${requestParams.toString()}`, {
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok || !payload.success) {
          throw new Error(payload.message || "Không thể tải sản phẩm");
        }

        const nextTotalPages = Math.max(1, Number(payload.pagination?.totalPages) || 1);
        setTotalPages(nextTotalPages);
        setTotalProducts(Number(payload.pagination?.total) || 0);
        if (currentPage > nextTotalPages) {
          navigateToPage(nextTotalPages, true);
          return;
        }

        setProducts(payload.data || []);
        setFeatureBox(payload.layoutMeta?.featureBox || null);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.error("Error fetching products:", error);
          setErrorText(error instanceof Error ? error.message : "Không thể tải sản phẩm");
        }
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    })();

    return () => controller.abort();
  }, [activeCategoryKey, currentPage, retryNonce, searchKey]);

  useEffect(() => {
    if (!activeCategoryKey) return;

    if (isFirstMetadataRender.current) {
      isFirstMetadataRender.current = false;
      return;
    }

    const API_URL = "";
    const controller = new AbortController();

    Promise.all([
      fetch(`${API_URL}/api/categories?parentId=${activeCategoryKey}`, { signal: controller.signal }).then((res) => res.json()),
      fetch(`${API_URL}/api/categories/price-bounds?categoryId=${activeCategoryKey}`, { signal: controller.signal }).then((res) => res.json()),
      fetch(`${API_URL}/api/categories/attributes?categoryId=${activeCategoryKey}`, { signal: controller.signal }).then((res) => res.json()),
    ])
      .then(([categoriesRes, priceBoundsRes, attributesRes]) => {
        if (categoriesRes.success) setSubcategories(categoriesRes.data);
        if (priceBoundsRes.success) setPriceBounds(priceBoundsRes.data);
        if (attributesRes.success) setAttributes(attributesRes.data);
      })
      .catch((err) => {
        if (err.name !== "AbortError") console.error("Error fetching category metadata:", err);
      });

    return () => controller.abort();
  }, [activeCategoryKey]);

  const handleSortChange = (value: string) => {
    const newParams = new URLSearchParams(searchParamsHook?.toString() || "");
    if (value) newParams.set("sort", value);
    else newParams.delete("sort");
    newParams.delete("page");
    const currentPath = typeof window !== "undefined" ? window.location.pathname : "/";
    startTransition(() => {
      router.push(buildQueryPath(currentPath, newParams.toString(), {}), { scroll: false });
    });
  };

  const renderSortSelect = (surface: "desktop" | "mobile") => (
    <div className={`relative shrink-0 ${surface === "desktop" ? "min-w-[170px]" : "w-full"}`}>
      <label htmlFor={`${surface}-category-sort`} className={surface === "mobile" ? "mb-2 block text-xs font-semibold text-gray-400" : "sr-only"}>
        Sắp xếp sản phẩm
      </label>
      <select
        id={`${surface}-category-sort`}
        data-category-sort={surface}
        aria-label="Sắp xếp sản phẩm"
        className="w-full appearance-none rounded-xl border border-[#323238] bg-[#18181b] py-2.5 pl-4 pr-10 text-[15px] font-bold text-gray-300 outline-none transition-colors hover:border-[#4a4a52] focus:border-cyan-600"
        onChange={(event) => handleSortChange(event.target.value)}
        value={searchParamsHook?.get("sort") || ""}
      >
        <option value="">Sắp xếp mặc định</option>
        <option value="price_asc">Giá: Thấp → Cao</option>
        <option value="price_desc">Giá: Cao → Thấp</option>
      </select>
      {surface === "desktop" && (
        <svg aria-hidden="true" className="pointer-events-none absolute bottom-3.5 right-3.5 h-3 w-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
        </svg>
      )}
    </div>
  );

  const renderFilterPanel = (surface: "desktop" | "mobile") => {
    const idPrefix = `${surface}-category-filter`;
    const searchInputRef = surface === "desktop" ? desktopSearchInputRef : mobileSearchInputRef;
    const priceContentId = `${idPrefix}-price-content`;
    const categoryContentId = `${idPrefix}-subcategory-content`;

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
                  {filter.isPrice
                    ? `Giá từ: ${new Intl.NumberFormat("vi-VN").format(currentPrice.min)} - ${new Intl.NumberFormat("vi-VN").format(currentPrice.max)}`
                    : filter.valName}
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
            <div className="dual-range-container">
              <div
                className="dual-range-track"
                style={{
                  left: `${((currentPrice.min - priceBounds.min) / (priceBounds.max - priceBounds.min || 1)) * 100}%`,
                  right: `${100 - ((currentPrice.max - priceBounds.min) / (priceBounds.max - priceBounds.min || 1)) * 100}%`,
                }}
              />
              <input type="range" id={`${idPrefix}-price-min`} aria-label="Giá tối thiểu" className="dual-range-slider" min={priceBounds.min} max={priceBounds.max} value={currentPrice.min} step={1000} onChange={(event) => handlePriceChange(event, "min")} onMouseUp={handlePriceCommit} onTouchEnd={handlePriceCommit} />
              <input type="range" id={`${idPrefix}-price-max`} aria-label="Giá tối đa" className="dual-range-slider" min={priceBounds.min} max={priceBounds.max} value={currentPrice.max} step={1000} onChange={(event) => handlePriceChange(event, "max")} onMouseUp={handlePriceCommit} onTouchEnd={handlePriceCommit} />
            </div>
            <div className="mt-4 flex justify-between text-[10px] text-gray-500">
              <span>Từ: {new Intl.NumberFormat("vi-VN").format(currentPrice.min)} đ</span>
              <span>Đến: {new Intl.NumberFormat("vi-VN").format(currentPrice.max)} đ</span>
            </div>
          </div>
        </div>

        {subcategories.length > 0 && visibleSubcategories.length > 0 && (
          <div className={`filter-section ${isCategoryFilterOpen ? "open" : ""}`} data-group={`${idPrefix}-category`}>
            <button type="button" className="filter-title" onClick={() => setIsCategoryFilterOpen((open) => !open)} aria-expanded={isCategoryFilterOpen} aria-controls={categoryContentId}>
              <span className="flex items-center gap-2"><span aria-hidden="true" className="text-sm">📁</span> Danh mục con</span>
              <svg aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
            </button>
            <div id={categoryContentId} className="filter-content mt-3" hidden={!isCategoryFilterOpen}>
              <div className="space-y-2">
                {visibleSubcategories.slice(0, showAllSubcategories ? undefined : 4).map((subCat) => (
                  <Link key={subCat.id} href={`/${subCat.slug.replace(/^\/+/, "")}`} className="flex items-center rounded-[10px] border border-[#27272a] bg-[#161618] p-[10px] transition-colors hover:border-[#3f3f46]">
                    <span aria-hidden="true" className="h-[18px] w-[18px] shrink-0 rounded-[6px] border-2 border-[#4b4b4b]" />
                    <span className="ml-3 flex-1 text-sm font-medium text-[#d1d5db]">{subCat.name}</span>
                    {subCat.productCount > 0 && <span className="ml-2 rounded-md bg-[#27272a] px-2 py-[2px] text-[11px] font-medium text-[#d6a879]">{subCat.productCount}</span>}
                  </Link>
                ))}
              </div>
              {visibleSubcategories.length > 4 && (
                <button type="button" className="ml-1 mt-4 flex items-center gap-2 text-sm font-medium text-gray-400 hover:text-white" onClick={() => setShowAllSubcategories((showAll) => !showAll)}>
                  <span aria-hidden="true">{showAllSubcategories ? "−" : "+"}</span>
                  {showAllSubcategories ? "Thu gọn danh mục" : `Thêm ${visibleSubcategories.length - 4} danh mục`}
                </button>
              )}
            </div>
          </div>
        )}

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
      <span
        key={`dots-${index}`}
        aria-hidden="true"
        className="flex size-10 items-center justify-center rounded-xl bg-[#18181b] font-medium text-gray-500"
      >
        ...
      </span>
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
      
      {/* ===== CATEGORY HERO SECTION ===== */}
      <div className="max-w-[1800px] mx-auto px-3 pt-6 sm:px-6">
        
        <Breadcrumb items={categoryBreadcrumbItems} />

        {/* Banner Area */}
        <div className="flex flex-col lg:flex-row gap-8 mb-8">
          {/* Banner Image / Graphic */}
          {featureBox?.backgroundImageUrl && featureBox?.targetUrl ? (
            <div data-category-page-feature className="min-h-[220px] overflow-hidden rounded-[20px] lg:w-1/2 lg:aspect-[85/33]">
              <CategoryFeatureBox featureBox={featureBox} className="h-full w-full rounded-[20px]" showCta={false} />
            </div>
          ) : (
          <div className="lg:w-1/2 rounded-[20px] overflow-hidden relative aspect-[85/33] border border-[#1a1a1e] bg-gradient-to-r from-[#121810] via-[#0d1112] to-[#120a13]">
             {isValidHtmlContent(categoryInfo?.imgBig) ? (
               <ProgressiveImage
                 src={`https://hacom.vn/media/category/${categoryInfo.imgBig}`}
                 alt={categoryInfo?.name || "Category Image"}
                 className="w-full h-full object-cover"
               />
             ) : (
               <>
                 {/* Glow effects */}
                 <div className="absolute top-0 left-1/4 w-1/2 h-full bg-emerald-500/10 blur-[100px] rounded-full"></div>
                 <div className="absolute top-0 right-0 w-1/3 h-full bg-purple-500/10 blur-[80px] rounded-full"></div>
                 
                 {/* Content */}
                 <div className="absolute inset-0 flex flex-col justify-center items-center p-8 text-left bg-gradient-to-l from-black/80 via-black/40 to-transparent">
                    <div className="max-w-[80%]">
                       <p className="text-[11px] md:text-[15px] font-bold text-gray-300 tracking-[0.2em] mb-2 drop-shadow-lg">
                         PCM
                       </p>
                       <h2 className="text-3xl md:text-5xl font-black text-white italic tracking-tight drop-shadow-xl" style={{ textShadow: "0 4px 20px rgba(0,0,0,0.8)" }}>
                         {categoryInfo?.name || "Danh Mục Sản Phẩm"}
                       </h2>
                    </div>
                 </div>
               </>
             )}
          </div>
          )}
          
          {/* Banner Text */}
          <div className="lg:w-1/2 flex flex-col justify-center">
            <h1 className="text-2xl md:text-[28px] font-extrabold text-white mb-4 tracking-tight">
              {categoryInfo?.name || "Danh mục sản phẩm"}
            </h1>
            {categorySummaryHtml ? (
              <div 
                data-category-summary
                className="text-[15px] text-gray-400 leading-relaxed space-y-3"
                dangerouslySetInnerHTML={{ __html: categorySummaryHtml }}
              />
            ) : (
              <div data-category-summary data-summary-fallback className="text-[15px] text-gray-400 leading-relaxed space-y-3">
                {CATEGORY_SUMMARY_FALLBACK}
              </div>
            )}
          </div>
        </div>

        {/* Subcategory Quick Links (4 Boxes) */}
        {subcategories.filter((s) => (s.productCount || 0) > 0).length > 0 && (
          <div data-category-subcategory-grid className="mb-8 grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
            {subcategories.filter((s) => (s.productCount || 0) > 0).slice(0, 4).map((subCat) => (
              <Link 
                key={subCat.id} 
                href={subCat.slug.startsWith('/') ? subCat.slug : `/${subCat.slug}`} 
                data-category-subcategory-card
                className="flex min-h-[88px] items-center rounded-[14px] border border-[#1a1a1e] bg-[#111115] p-4 shadow-sm transition-colors hover:border-[#27272a] hover:bg-[#16161a] sm:p-5"
              >
                 <span className="bg-gradient-to-r from-white via-cyan-400 to-purple-500 bg-clip-text text-transparent font-bold text-[16px]">
                   {subCat.name} <span className="font-normal text-[16px] ml-1">({subCat.productCount || 0})</span>
                 </span>
              </Link>
            ))}
          </div>
        )}

        {/* Sort and Search Bar */}
        <div data-category-toolbar className="mb-4 flex min-w-0 items-center justify-between gap-2 rounded-2xl border border-[#1a1a1e] bg-[#111115] p-2 shadow-sm sm:p-4">
          <h2 className="min-w-0 flex-1 truncate pl-1 text-[15px] font-extrabold tracking-wide text-white">
            {catalogTitle} ({totalProducts} sản phẩm)
          </h2>
          <div className="hidden lg:block">{renderSortSelect("desktop")}</div>
          <button
            ref={mobileFilterTriggerRef}
            type="button"
            data-category-filter-trigger
            className="flex h-10 shrink-0 items-center gap-2 rounded-xl border border-[#3b82f6] bg-[#0b63e5] px-3 text-sm font-semibold text-white shadow-sm hover:border-[#60a5fa] hover:bg-[#0a58cc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111115] lg:hidden"
            aria-haspopup="dialog"
            aria-expanded={isMobileFilterOpen}
            aria-controls="mobile-category-filter-dialog"
            onClick={() => setIsMobileFilterOpen(true)}
          >
            <SlidersHorizontal aria-hidden="true" className="size-[18px]" />
            Bộ lọc
          </button>
        </div>
      </div>

      <dialog
        ref={mobileFilterDialogRef}
        id="mobile-category-filter-dialog"
        data-category-mobile-filter-dialog
        aria-labelledby="mobile-category-filter-title"
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
            <h2 id="mobile-category-filter-title" className="text-lg font-extrabold">Bộ lọc</h2>
            <div className="ml-auto flex items-center gap-1">
              <button
                type="button"
                className="flex h-10 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-gray-400 hover:bg-white/5 hover:text-white"
                aria-expanded={isSidebarSearchOpen}
                aria-controls="mobile-category-filter-search"
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

      {/*  ==================== PRODUCT & SIDEBAR AREA ====================  */}
      <div className="max-w-[1800px] mx-auto flex gap-6 px-3 pb-6 sm:px-6">
        {/*  ===== SIDEBAR LEFT =====  */}
        <aside data-category-desktop-filter className="hidden w-[300px] shrink-0 lg:block">
          <div className="mb-5">{renderFilterPanel("desktop")}</div>

          <CategoryPromoCards />
        </aside>

        {/*  ===== PRODUCT GRID RIGHT =====  */}
        <main className="flex-1 min-w-0">
          <div
            className="grid grid-cols-2 gap-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4"
            id="productGrid"
          >
            {errorText ? (
              <div
                className="col-span-2 my-4 flex flex-col items-center justify-center rounded-2xl border border-red-500/40 bg-[#111115] px-5 py-20 text-center lg:col-span-3 xl:col-span-4"
                role="alert"
              >
                <h3 className="mb-2 text-lg font-bold text-white">Không thể tải sản phẩm</h3>
                <p className="mb-6 max-w-sm text-sm leading-relaxed text-gray-400">
                  Kết nối đang gặp sự cố tạm thời. Hãy thử tải lại danh sách sản phẩm.
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
                <p className="text-gray-400 text-sm font-medium animate-pulse">
                  Đang tải sản phẩm...
                </p>
              </div>
            ) : products.length > 0 || featureBox ? (
              <CategoryFeatureProductGrid
                products={products}
                featureBox={null}
                emptyState={null}
              />
            ) : (
              <div className="col-span-2 my-4 flex flex-col items-center justify-center rounded-2xl border border-[#1a1a1e] bg-[#111115] py-20 text-center lg:col-span-3 xl:col-span-4">
                <div className="w-20 h-20 mb-5 rounded-full bg-[#1a1a1e] border border-[#27272a] flex items-center justify-center text-3xl">
                  🔍
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  Không tìm thấy sản phẩm phù hợp
                </h3>
                <p className="text-[15px] text-gray-500 max-w-sm mx-auto mb-6 leading-relaxed">
                  Rất tiếc, không có sản phẩm nào khớp với bộ lọc bạn đang chọn.
                  Hãy thử bỏ bớt một vài bộ lọc hoặc thay đổi tiêu chí tìm kiếm.
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

          {/* Pagination UI */}
          {totalPages > 1 && (
            <nav data-category-pagination aria-label="Phân trang sản phẩm" className="mt-12 mb-10 flex flex-nowrap items-center justify-center gap-2">
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

              <div data-category-pagination-pages="mobile" className="flex flex-nowrap justify-center gap-2 lg:hidden">
                {renderPaginationItems(buildMobilePaginationItems(currentPage, totalPages))}
              </div>
              <div data-category-pagination-pages="desktop" className="hidden flex-wrap justify-center gap-2 lg:flex">
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

      {/* ==================== STATIC HTML ==================== */}
      {categoryInfo?.staticHtml && (
        <section data-category-static-section className="max-w-[1800px] mx-auto px-3 py-4 sm:px-6">
          <div data-category-static-frame className="relative rounded-2xl px-0 py-6 shadow-sm sm:p-6 md:p-8">
            <div
              data-category-static-html
              className={`static-html-content transition-all duration-500 ease-in-out text-gray-300 text-[15px] leading-relaxed 
                [&>h1]:text-white [&>h1]:text-2xl [&>h1]:font-bold [&>h1]:mb-4 [&>h1]:mt-6
                [&>h2]:text-white [&>h2]:text-xl [&>h2]:font-bold [&>h2]:mb-3 [&>h2]:mt-5
                [&>h3]:text-white [&>h3]:text-lg [&>h3]:font-bold [&>h3]:mb-3 [&>h3]:mt-4
                [&>p]:mb-4 [&>img]:max-w-full [&>img]:rounded-lg [&>img]:my-4
                [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-4
                [&>ol]:list-decimal [&>ol]:pl-5 [&>ol]:mb-4
                ${isStaticHtmlExpanded ? '' : 'max-h-[300px] overflow-hidden'}`}
              dangerouslySetInnerHTML={{ __html: sanitizeLegacyHtml(categoryInfo.staticHtml) }}
            />
            
            {!isStaticHtmlExpanded && (
              <div className="absolute bottom-0 left-0 right-0 h-[200px] bg-gradient-to-t from-[#111115] via-[#111115]/90 to-transparent pointer-events-none rounded-b-2xl" />
            )}
            
            <div className={`flex justify-center mt-4 relative z-10 ${!isStaticHtmlExpanded ? '-mt-8' : 'mt-6'}`}>
              <button
                onClick={() => setIsStaticHtmlExpanded(!isStaticHtmlExpanded)}
                className="bg-[#18181b] border border-[#27272a] hover:border-[#0b63e5] hover:text-[#0b63e5] text-white font-medium px-6 py-2.5 rounded-full transition-all flex items-center gap-2 shadow-md shadow-black/10"
              >
                {isStaticHtmlExpanded ? "Thu gọn" : "Xem thêm"}
                <svg
                  className={`w-4 h-4 transition-transform duration-300 ${isStaticHtmlExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        </section>
      )}

      {/*  ==================== ss21.html ====================  */}
      <WhyBuyFaq buyingGuide={categoryInfo?.buyingGuide} />

      <Footer />
    </div>
  );
}

