"use client";
import React, { Suspense, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import WhyBuyFaq from "../../components/WhyBuyFaq";
import ProgressiveImage from "../../components/ProgressiveImage";
import CategoryFeatureProductGrid from "../../components/CategoryFeatureProductGrid";
import Breadcrumb from "../../components/Breadcrumb";
import Link from "next/link";
import type { CategoryTrailItem } from "../../types/breadcrumb";
import {
  buildSidebarSectionVisibility,
  type SidebarSectionVisibility,
} from "../../lib/sidebarFilterVisibility";
import { sanitizeLegacyHtml } from "../../lib/sanitizeHtml";
import {
  buildQueryPath,
  CATALOG_PAGE_SIZE,
  normalizeCatalogPage,
} from "../../lib/pagination";

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
      data-group={`attr-${attr.id}`}
    >
      <div
        className="filter-title"
        onClick={() => setIsExpanded((open) => !open)}
      >
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
      <div
        className="filter-content mt-3"
        style={!isExpanded ? { display: "none" } : {}}
      >
        <div className="space-y-2">
          {displayValues.map((val: any) => {
            const valSlug = slugify(val.name);
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
                  onChange={() => handleToggle(val.name)}
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
  const sidebarSearchInputRef = useRef<HTMLInputElement>(null);
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
      sidebarSearchInputRef.current?.focus();
    }
  }, [isSidebarSearchOpen]);

  const activeFilters: any[] = [];

  const attributeActiveFilters = useMemo(() => {
    const filters: any[] = [];
    const paramsFromUrl = new URLSearchParams(searchKey);
    const attributeLookup = new Map<string, { attrName: string; values: Map<string, string> }>();

    for (const attr of attributes) {
      const key = attr.filter_code || attr.attribute_code || slugify(attr.name);
      const values = new Map<string, string>();

      for (const val of attr.values || []) {
        values.set(slugify(val.name), val.name);
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
    }

    // Append extra filter attributes
    const paramsFromUrl = new URLSearchParams(searchKey);
    paramsFromUrl.forEach((value, key) => {
      if (!["id", "page", "limit", "category_id"].includes(key)) {
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

  return (
    <div className="bg-[#0a0a0c] min-h-screen text-white font-sans">
      <Header />
      
      {/* ===== CATEGORY HERO SECTION ===== */}
      <div className="max-w-[1800px] mx-auto px-6 pt-6">
        
        <Breadcrumb items={categoryBreadcrumbItems} />

        {/* Banner Area */}
        <div className="flex flex-col lg:flex-row gap-8 mb-8">
          {/* Banner Image / Graphic */}
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
          
          {/* Banner Text */}
          <div className="lg:w-1/2 flex flex-col justify-center">
            <h1 className="text-2xl md:text-[28px] font-extrabold text-white mb-4 tracking-tight">
              {categoryInfo?.name || "Danh mục sản phẩm"}
            </h1>
            {isValidHtmlContent(sanitizeLegacyHtml(categoryInfo?.summary)) ? (
              <div 
                className="text-[15px] text-gray-400 leading-relaxed space-y-3"
                dangerouslySetInnerHTML={{ __html: sanitizeLegacyHtml(categoryInfo.summary) }}
              />
            ) : isValidHtmlContent(sanitizeLegacyHtml(categoryInfo?.meta_description)) ? (
              <div 
                className="text-[15px] text-gray-400 leading-relaxed space-y-3"
                dangerouslySetInnerHTML={{ __html: sanitizeLegacyHtml(categoryInfo.meta_description) }}
              />
            ) : (
              <div className="text-[15px] text-gray-400 leading-relaxed space-y-3">
                Sẵn kho - Đa dạng - Giá tốt - Bảo hành chính hãng
              </div>
            )}
          </div>
        </div>

        {/* Subcategory Quick Links (4 Boxes) */}
        {subcategories.filter((s) => (s.productCount || 0) > 0).length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {subcategories.filter((s) => (s.productCount || 0) > 0).slice(0, 4).map((subCat) => (
              <Link 
                key={subCat.id} 
                href={subCat.slug.startsWith('/') ? subCat.slug : `/${subCat.slug}`} 
                className="flex items-center bg-[#111115] hover:bg-[#16161a] border border-[#1a1a1e] hover:border-[#27272a] rounded-[14px] p-5 transition-all duration-300 shadow-sm hover:shadow-md"
              >
                 <span className="bg-gradient-to-r from-white via-cyan-400 to-purple-500 bg-clip-text text-transparent font-bold text-[16px]">
                   {subCat.name} <span className="font-normal text-[16px] ml-1">({subCat.productCount || 0})</span>
                 </span>
              </Link>
            ))}
          </div>
        )}

        {/* Sort and Search Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between bg-[#111115] border border-[#1a1a1e] rounded-2xl p-4 mb-4 shadow-sm">
           <h2 className="text-[15px] font-extrabold text-white mb-4 md:mb-0 pl-1 tracking-wide">
             {categoryInfo?.metaTitle || categoryInfo?.name || "Danh mục sản phẩm"} ({totalProducts} sản phẩm)
           </h2>
           
           <div className="flex items-center gap-4 w-full md:w-auto">
              {/* Search */}
              <div className="relative flex-1 md:w-[240px]">
                 <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                 </svg>
                 <input 
                    type="text" 
                    placeholder="Search..." 
                    className="w-full bg-[#18181b] border border-[#27272a] text-[15px] font-medium text-white rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:border-cyan-700 focus:ring-1 focus:ring-cyan-700 transition-all"
                 />
              </div>
              
              {/* Sort Dropdown */}
              <div className="relative shrink-0 min-w-[170px]">
                 <select 
                    className="w-full appearance-none bg-[#18181b] border border-[#27272a] text-[15px] font-bold text-gray-300 rounded-xl pl-4 pr-10 py-2.5 focus:outline-none focus:border-cyan-700 hover:border-[#3f3f46] transition-all cursor-pointer"
                    onChange={(e) => {
                       const newParams = new URLSearchParams(searchParamsHook?.toString() || "");
                       if (e.target.value) {
                          newParams.set("sort", e.target.value);
                       } else {
                          newParams.delete("sort");
                       }
                       newParams.delete("page");
                       const currentPath = typeof window !== "undefined" ? window.location.pathname : "/";
                       startTransition(() => {
                         router.push(buildQueryPath(currentPath, newParams.toString(), {}), { scroll: false });
                       });
                    }}
                    defaultValue={searchParamsHook?.get("sort") || ""}
                 >
                    <option value="">Sắp xếp mặc định</option>
                    <option value="price_asc">Giá: Thấp {"->"} Cao</option>
                    <option value="price_desc">Giá: Cao {"->"} Thấp</option>
                 </select>
                 <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none flex flex-col gap-[2px]">
                   <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                   </svg>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/*  ==================== PRODUCT & SIDEBAR AREA ====================  */}
      <div className="max-w-[1800px] mx-auto flex gap-6 px-6 pb-6">
        {/*  ===== SIDEBAR LEFT =====  */}
        <aside className="w-[300px] shrink-0 hidden lg:block">
          {/*  Filters Panel  */}
          <div
            className="bg-[#111115] border border-[#1a1a1e] rounded-2xl p-5 mb-5"
            id="sidebar-category"
          >
            {/*  Header  */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-base">🔧</span>
                <span className="text-[15px] font-extrabold text-white">
                  Bộ Lọc
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <button
                  className="hover:text-white transition"
                  id="seach-filters-sidebar"
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

            {/*  Search Input (Hidden by default)  */}
            <div
              id="sidebar-search-container"
              className={`${isSidebarSearchOpen ? "" : "hidden"} mb-4 transition-all`}
            >
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
                  🔍
                </span>
                <input
                  ref={sidebarSearchInputRef}
                  type="text"
                  maxLength={100}
                  id="sidebar-search-input"
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

            {/*  Active Filters  */}
            <div
              id="active-filters-sidebar"
              style={activeFilters.length === 0 ? { display: "none" } : {}}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-400 font-semibold">
                  Bộ lọc đã chọn :
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
                      ? `Giá từ: ${new Intl.NumberFormat("vi-VN").format(currentPrice.min)} - ${new Intl.NumberFormat("vi-VN").format(currentPrice.max)}`
                      : f.valName}
                    <span className="text-cyan-500 hover:text-white">✕</span>
                  </span>
                ))}
              </div>
            </div>

            {/*  Price Range  */}
            <div
              className={`filter-section ${isPriceFilterOpen ? "open" : ""}`}
              id="price-range-sidebar"
              style={isFilterSearchActive && !matchesSidebarSearch("Khoáº£ng GiÃ¡") ? { display: "none" } : {}}
            >
              <div
                className="filter-title"
                onClick={() => setIsPriceFilterOpen((open) => !open)}
              >
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
              <div
                className="filter-content px-1 mt-2"
                style={!isPriceFilterOpen ? { display: "none" } : {}}
              >
                <div className="dual-range-container">
                  <div
                    className="dual-range-track"
                    id="price-track"
                    style={{
                      left: `${((currentPrice.min - priceBounds.min) / (priceBounds.max - priceBounds.min || 1)) * 100}%`,
                      right: `${100 - ((currentPrice.max - priceBounds.min) / (priceBounds.max - priceBounds.min || 1)) * 100}%`,
                    }}
                  ></div>
                  <input
                    type="range"
                    id="price-min"
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
                    id="price-max"
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
                  <span id="price-val-min">
                    Từ: {" "}
                    {new Intl.NumberFormat("vi-VN").format(currentPrice.min)} đ
                  </span>
                  <span id="price-val-max">
                    Đến: {" "}
                    {new Intl.NumberFormat("vi-VN").format(currentPrice.max)} đ
                  </span>
                </div>
              </div>
            </div>

            {/*  Category  */}
            {subcategories.length > 0 && visibleSubcategories.length > 0 && (
              <div className={`filter-section ${isCategoryFilterOpen ? "open" : ""}`} data-group="category">
                <div
                  className="filter-title"
                  onClick={() => setIsCategoryFilterOpen((open) => !open)}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm">📁</span> Danh mục con
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
                  style={!isCategoryFilterOpen ? { display: "none" } : {}}
                >
                  <div className="space-y-2">
                    {visibleSubcategories
                      .slice(0, showAllSubcategories ? undefined : 4)
                      .map((subCat) => (
                        <Link
                          key={subCat.id}
                          href={`/${subCat.slug.replace(/^\/+/, '')}`}
                          className="flex items-center p-[10px] rounded-[10px] border border-[#27272a] bg-[#161618] hover:border-[#3f3f46] cursor-pointer transition-all"
                        >
                          <div className="w-[18px] h-[18px] rounded-[6px] border-2 border-[#4b4b4b] bg-transparent flex items-center justify-center shrink-0 shadow-sm transition-colors">
                          </div>
                          <span className="flex-1 font-medium text-sm text-[#d1d5db] hover:text-white transition-colors ml-3">
                            {subCat.name}
                          </span>
                          {subCat.productCount > 0 && (
                            <span className="text-[11px] px-2 py-[2px] rounded-md font-medium bg-[#27272a] text-[#a87b51] ml-2">
                              {subCat.productCount}
                            </span>
                          )}
                        </Link>
                      ))}
                  </div>
                  {visibleSubcategories.length > 4 && (
                    <button
                      className="flex items-center gap-3 mt-4 mb-2 ml-1 text-[15px] text-gray-400 hover:text-white transition-colors font-medium"
                      onClick={() =>
                        setShowAllSubcategories(!showAllSubcategories)
                      }
                    >
                      <div className="relative w-[20px] h-[20px] flex items-center justify-center rounded-[3px] bg-[#1a1a1e] border border-[#27272a] rotate-45 shrink-0 m-1">
                        {showAllSubcategories ? (
                          <svg className="w-2.5 h-2.5 text-gray-400 absolute -rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3 text-gray-400 absolute -rotate-45" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                        )}
                      </div>
                      {showAllSubcategories
                        ? "Thu gọn danh mục"
                        : `+ ${visibleSubcategories.length - 4} danh mục`}
                    </button>
                  )}
                </div>
              </div>
            )}

            {visibleAttributes.map((attr: any, index) => (
              <AttributeFilterBlock
                key={attr.id}
                attr={attr}
                isLast={index === visibleAttributes.length - 1}
                isOpen={index < 4}
                isFilterSearchActive={isFilterSearchActive}
              />
            ))}
          </div>

          {/*  Promo Box 1: AI Laptop Finder  */}
          <div
            className="promo-box"
            style={{
              background:
                "linear-gradient(135deg, #0c1a12 0%, #111115 50%, #1a0f10 100%)",
              borderColor: "#1a2e1f",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="bg-red-500/20 text-red-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                ⚡ AI-Powered
              </span>
              <span className="text-xl">🤖</span>
            </div>
            <h3 className="text-[22px] font-extrabold leading-tight mb-1">
              Your perfect
            </h3>
            <h3 className="text-[22px] font-extrabold leading-tight mb-1">
              <span className="text-emerald-400">laptop match</span> awaits
            </h3>
            <p className="text-[11px] text-gray-500 leading-relaxed mb-4">
              Tell our AI what you need. Budget, purpose, done. Matched in
              seconds.
            </p>
            <div className="flex gap-2 mb-5">
              <span className="bg-[#1a1a1e] text-[10px] text-gray-400 px-3 py-1.5 rounded-full flex items-center gap-1">
                🎮 Gaming
              </span>
              <span className="bg-[#1a1a1e] text-[10px] text-gray-400 px-3 py-1.5 rounded-full flex items-center gap-1">
                💼 Work
              </span>
              <span className="bg-[#1a1a1e] text-[10px] text-gray-400 px-3 py-1.5 rounded-full flex items-center gap-1">
                📚 Study
              </span>
            </div>
            <button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2">
              ✦ Launch Finder →
            </button>
          </div>

          {/*  Promo Box 2: Build Smart  */}
          <div
            className="promo-box"
            style={{
              background: "linear-gradient(135deg, #111115 0%, #0f1117 100%)",
              borderColor: "#1a1a2e",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-xl font-extrabold leading-tight">
                  Don't guess.
                </h3>
                <h3 className="text-xl font-extrabold leading-tight">
                  <span className="text-cyan-400">Build smart.</span>
                </h3>
              </div>
              <span className="text-xl">👍</span>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed mb-4">
              Your budget & games in → perfectly optimized build out. No tech
              knowledge needed.
            </p>
            <div className="flex gap-2 mb-5">
              <span className="bg-[#1a1a1e] text-[11px] text-gray-400 px-3 py-1.5 rounded-full font-bold">
                50K+
              </span>
              <span className="bg-[#1a1a1e] text-[11px] text-gray-400 px-3 py-1.5 rounded-full font-bold">
                ~60s
              </span>
              <span className="bg-[#1a1a1e] text-[11px] text-gray-400 px-3 py-1.5 rounded-full font-bold">
                #1
              </span>
            </div>
            <button className="w-full bg-[#1a1a1e] hover:bg-[#27272a] text-white text-sm font-bold py-2.5 rounded-xl transition border border-[#27272a]">
              Start Building →
            </button>
          </div>

          {/*  Promo Box 3: App Only Deals  */}
          <div
            className="promo-box"
            style={{
              background: "linear-gradient(135deg, #0f1117 0%, #111115 100%)",
              borderColor: "#1a1a2e",
            }}
          >
            <span className="bg-blue-500/20 text-blue-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 w-fit mb-3">
              📱 Mobile App
            </span>
            <h3 className="text-xl font-extrabold leading-tight mb-0.5">
              Unlock
            </h3>
            <h3 className="text-xl font-extrabold leading-tight mb-2">
              <span className="text-blue-400">App Only</span> Deals
            </h3>
            <p className="text-[11px] text-gray-500 leading-relaxed mb-4">
              Prices you won't find on desktop. Download and save.
            </p>
            <div className="flex gap-3">
              <button className="flex-1 bg-[#1a1a1e] hover:bg-[#27272a] text-white text-[11px] font-bold py-2 rounded-lg transition border border-[#27272a] flex items-center justify-center gap-1.5">
                {" "}
                App Store
              </button>
              <button className="flex-1 bg-[#1a1a1e] hover:bg-[#27272a] text-white text-[11px] font-bold py-2 rounded-lg transition border border-[#27272a] flex items-center justify-center gap-1.5">
                ▶ Google Play
              </button>
            </div>
          </div>

          {/*  Promo Box 4: Know More  */}
          <div
            className="promo-box"
            style={{ background: "#111115", borderColor: "#1a1a1e" }}
          >
            <div className="flex items-center justify-between mb-1">
              <div>
                <h3 className="text-xl font-extrabold leading-tight">
                  Know more.
                </h3>
                <h3 className="text-xl font-extrabold leading-tight">
                  <span className="text-purple-400">Game better.</span>
                </h3>
              </div>
              <span className="text-gray-600 text-sm">OG</span>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed mb-4">
              Reviews, guides & benchmarks from the Evetech team. Read before
              you buy.
            </p>
            <div className="flex gap-2 mb-5">
              <span className="bg-[#1a1a1e] text-[11px] text-gray-400 px-3 py-1.5 rounded-full font-bold">
                100+
              </span>
              <span className="bg-[#1a1a1e] text-[11px] text-gray-400 px-3 py-1.5 rounded-full font-bold">
                50+
              </span>
              <span className="bg-[#1a1a1e] text-[11px] text-gray-400 px-3 py-1.5 rounded-full font-bold">
                REAL
              </span>
            </div>
            <button className="w-full bg-[#1a1a1e] hover:bg-[#27272a] text-white text-sm font-bold py-2.5 rounded-xl transition border border-[#27272a]">
              Explore Evezone →
            </button>
          </div>
        </aside>

        {/*  ===== PRODUCT GRID RIGHT =====  */}
        <main className="flex-1 min-w-0">
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
            id="productGrid"
          >
            {errorText ? (
              <div
                className="col-span-1 my-4 flex flex-col items-center justify-center rounded-2xl border border-red-500/40 bg-[#111115] px-5 py-20 text-center sm:col-span-2 xl:col-span-4"
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
              <div className="col-span-1 sm:col-span-2 xl:col-span-4 flex flex-col items-center justify-center py-32 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mb-4"></div>
                <p className="text-gray-400 text-sm font-medium animate-pulse">
                  Đang tải sản phẩm...
                </p>
              </div>
            ) : products.length > 0 || featureBox ? (
              <CategoryFeatureProductGrid
                products={products}
                featureBox={featureBox}
                emptyState={null}
              />
            ) : (
              <div className="col-span-1 sm:col-span-2 xl:col-span-4 flex flex-col items-center justify-center py-20 text-center bg-[#111115] rounded-2xl border border-[#1a1a1e] my-4">
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
                  const range = [];
                  const rangeWithDots = [];
                  let l;

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
                    if (l) {
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
                        type="button"
                        aria-label={`Đến trang ${page}`}
                        aria-current={currentPage === page ? "page" : undefined}
                        onClick={() => navigateToPage(page as number)}
                        disabled={isPending || isLoading}
                        className={`w-10 h-10 flex items-center justify-center rounded-xl text-[15px] font-semibold transition-all ${currentPage === page
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

      {/* ==================== STATIC HTML ==================== */}
      {categoryInfo?.staticHtml && (
        <section className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="rounded-2xl p-6 md:p-8 relative shadow-sm">
            <div 
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

