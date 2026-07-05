"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import ProgressiveImage from "../../components/ProgressiveImage";
import Link from "next/link";

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

function AttributeFilterBlock({
  attr,
  isLast,
  isOpen,
}: {
  attr: any;
  isLast: boolean;
  isOpen: boolean;
}) {
  const [showAll, setShowAll] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const filterKey = attr.filter_code || slugify(attr.name);
  const currentValues = searchParams.get(filterKey)?.split(",") || [];

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

    // Maintain current route
    const currentPath =
      typeof window !== "undefined" ? window.location.pathname : "/";
    router.push(currentPath + "?" + newParams.toString(), { scroll: false });
  };

  return (
    <div
      className={`filter-section ${isOpen ? "open" : ""}`}
      style={isLast ? { borderBottom: "none" } : {}}
      data-group={`attr-${attr.id}`}
    >
      <div
        className="filter-title"
        onClick={(e) =>
          typeof window !== "undefined" && window.toggleFilter(e.currentTarget)
        }
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
        style={!isOpen ? { display: "none" } : {}}
      >
        <div className="space-y-2">
          {attr.values.slice(0, showAll ? undefined : 4).map((val: any) => {
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
        {attr.values.length > 4 && (
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
            {showAll ? "Thu gọn" : `+ ${attr.values.length - 4} mục`}
          </button>
        )}
      </div>
    </div>
  );
}

import { Suspense } from "react";

export default function CategoryContent({ categoryId, params, searchParams, initialData, categoryInfo }: any) {
  const [products, setProducts] = useState<any[]>(initialData?.products?.data || []);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialData?.products?.pagination?.totalPages || 1);
  const [totalProducts, setTotalProducts] = useState(initialData?.products?.pagination?.total || 0);
  const [subcategories, setSubcategories] = useState<any[]>(initialData?.categories?.data || []);
  const [attributes, setAttributes] = useState<any[]>(initialData?.attributes?.data || []);
  const [priceBounds, setPriceBounds] = useState(initialData?.priceBounds?.data || { min: 0, max: 200000000 });
  const searchParamsHook = useSearchParams();
  const [prevSearch, setPrevSearch] = useState(searchParamsHook?.toString());

  if (searchParamsHook?.toString() !== prevSearch) {
    setPrevSearch(searchParamsHook?.toString());
    setCurrentPage(1);
  }

  const hasInitialData = !!(initialData && Object.keys(initialData).length > 0);
  const [showAllSubcategories, setShowAllSubcategories] = useState(false);
  const [isLoading, setIsLoading] = useState(!hasInitialData); // Loading if no SSR data
  const [currentPrice, setCurrentPrice] = useState({
    min: searchParamsHook?.get("min-price")
      ? parseInt(searchParamsHook.get("min-price") as string, 10)
      : 0,
    max: searchParamsHook?.get("max-price")
      ? parseInt(searchParamsHook.get("max-price") as string, 10)
      : 200000000,
  });
  const router = useRouter();

  const activeFilters: any[] = [];
  if (searchParamsHook && attributes.length > 0) {
    searchParamsHook.forEach((value, key) => {
      if (!["id", "page", "limit", "category_id"].includes(key)) {
        const attr = attributes.find(
          (a) => (a.filter_code || slugify(a.name)) === key,
        );
        if (attr) {
          const vals = value.split(",");
          vals.forEach((valSlug) => {
            const valObj = attr.values.find(
              (v: any) => slugify(v.name) === valSlug,
            );
            if (valObj) {
              activeFilters.push({
                key,
                attrName: attr.name,
                valSlug,
                valName: valObj.name,
              });
            }
          });
        }
      }
    });
  }

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
  }, [searchParamsHook, priceBounds]);

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
    const currentPath =
      typeof window !== "undefined" ? window.location.pathname : "/";
    router.push(currentPath + "?" + newParams.toString(), { scroll: false });
  };

  // Clear all filters handler
  const handleClearAll = () => {
    const newParams = new URLSearchParams(searchParamsHook?.toString() || "");
    activeFilters.forEach((f) => newParams.delete(f.key));
    newParams.delete("min-price");
    newParams.delete("max-price");
    const currentPath =
      typeof window !== "undefined" ? window.location.pathname : "/";
    router.push(currentPath + "?" + newParams.toString(), { scroll: false });
  };

  // Remove single filter
  const handleRemoveFilter = (f: any) => {
    if (f.isPrice) {
      const newParams = new URLSearchParams(searchParamsHook?.toString() || "");
      newParams.delete("min-price");
      newParams.delete("max-price");
      const currentPath =
        typeof window !== "undefined" ? window.location.pathname : "/";
      router.push(currentPath + "?" + newParams.toString(), { scroll: false });
      return;
    }
    const newParams = new URLSearchParams(searchParamsHook?.toString() || "");
    let vals = newParams.get(f.key)?.split(",") || [];
    vals = vals.filter((v) => v !== f.valSlug);
    if (vals.length > 0) newParams.set(f.key, vals.join(","));
    else newParams.delete(f.key);
    const currentPath =
      typeof window !== "undefined" ? window.location.pathname : "/";
    router.push(currentPath + "?" + newParams.toString(), { scroll: false });
  };

  const isFirstRender = React.useRef(hasInitialData);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return; // Skip fetching on mount only if SSR provided initial data
    }

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    let url = `${API_URL}/api/products?limit=24&page=${currentPage}`;
    let activeCatId = categoryId;
    if (!activeCatId && typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      activeCatId = searchParams.get("id") || undefined;
    }

    if (activeCatId) {
      url += "&category_id=" + activeCatId;
    }

    // Append extra filter attributes
    if (searchParamsHook) {
      searchParamsHook.forEach((value, key) => {
        if (!["id", "page", "limit", "category_id"].includes(key)) {
          url += `&${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
        }
      });
    }

    // Scroll to top when changing page
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    setIsLoading(true);
    fetch(url)
      .then((res) => res.json())
      .then((res) => {
        if (res.success) {
          setProducts(res.data);
          if (res.pagination) {
            setTotalPages(res.pagination.totalPages);
            setTotalProducts(res.pagination.total);
          }
        }
      })
      .catch((err) => console.error("Error fetching products:", err))
      .finally(() => setIsLoading(false));

    if (activeCatId) {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
      fetch(`${API_URL}/api/categories?parentId=${activeCatId}`)
        .then((res) => res.json())
        .then((res) => {
          if (res.success) {
            setSubcategories(res.data);
          }
        })
        .catch((err) => console.error("Error fetching subcategories:", err));

      fetch(
        `${API_URL}/api/categories/price-bounds?categoryId=${activeCatId}`,
      )
        .then((res) => res.json())
        .then((res) => {
          if (res.success) {
            setPriceBounds(res.data);
          }
        })
        .catch((err) => console.error("Error fetching price bounds:", err));

      fetch(
        `${API_URL}/api/categories/attributes?categoryId=${activeCatId}`,
      )
        .then((res) => res.json())
        .then((res) => {
          if (res.success) {
            setAttributes(res.data);
          }
        })
        .catch((err) => console.error("Error fetching attributes:", err));
    }
  }, [categoryId, currentPage, searchParamsHook]);

  return (
    <div className="bg-[#0a0a0c] min-h-screen text-white font-sans">
      <Header />
      
      {/* ===== CATEGORY HERO SECTION ===== */}
      <div className="max-w-[1800px] mx-auto px-6 pt-6">
        
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-gray-500 mb-6 flex-wrap font-medium">
          <Link href="/" className="hover:text-white transition flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </Link>
          <span className="text-gray-700">/</span>
          <Link href="#" className="hover:text-white transition">Specials</Link>
          <span className="text-gray-700">/</span>
          <Link href="#" className="hover:text-white transition">Best Graphics Card Deals</Link>
          <span className="text-gray-700">/</span>
          <span className="text-gray-300">Graphics Cards</span>
        </nav>

        {/* Banner Area */}
        <div className="flex flex-col lg:flex-row gap-8 mb-8">
          {/* Banner Image / Graphic */}
          <div className="lg:w-1/2 rounded-[20px] overflow-hidden relative aspect-[85/33] border border-[#1a1a1e] bg-gradient-to-r from-[#121810] via-[#0d1112] to-[#120a13]">
             {categoryInfo?.imgBig ? (
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
                 <div className="absolute inset-0 flex flex-col justify-center items-end p-8 text-right bg-gradient-to-l from-black/80 via-black/40 to-transparent">
                    <div className="max-w-[80%]">
                       <p className="text-[11px] md:text-[15px] font-bold text-gray-300 tracking-[0.2em] mb-2 drop-shadow-lg">
                         AMD RADEON • INTEL ARC • NVIDIA GEFORCE
                       </p>
                       <h2 className="text-3xl md:text-5xl font-black text-white italic tracking-tight drop-shadow-xl" style={{ textShadow: "0 4px 20px rgba(0,0,0,0.8)" }}>
                         GRAPHICS CARDS
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
            {categoryInfo?.summary && categoryInfo.summary.replace(/<[^>]*>?/gm, '').trim().length > 5 ? (
              <div 
                className="text-[15px] text-gray-400 leading-relaxed space-y-3"
                dangerouslySetInnerHTML={{ __html: categoryInfo.summary }}
              />
            ) : null}
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
                       const currentPath = typeof window !== "undefined" ? window.location.pathname : "/";
                       const queryString = newParams.toString();
                       router.push(currentPath + (queryString ? "?" + queryString : ""), { scroll: false });
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
                  onClick={() =>
                    typeof window !== "undefined" &&
                    window.toggleSidebarSearch()
                  }
                >
                  🔍 Tìm Nhanh
                </button>
              </div>
            </div>

            {/*  Search Input (Hidden by default)  */}
            <div
              id="sidebar-search-container"
              className="hidden mb-4 transition-all"
            >
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
                  🔍
                </span>
                <input
                  type="text"
                  id="sidebar-search-input"
                  placeholder="Nhập từ khóa tìm kiếm bộ lọc ..."
                  className="w-full bg-[#18181b] border border-[#27272a] rounded-lg py-2 pl-8 pr-8 text-sm text-gray-300 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors"
                  onInput={() =>
                    typeof window !== "undefined" && window.filterSidebar()
                  }
                />
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs transition"
                  onClick={() =>
                    typeof window !== "undefined" && window.closeSidebarSearch()
                  }
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
            <div className="filter-section open" id="price-range-sidebar">
              <div
                className="filter-title"
                onClick={(e) =>
                  typeof window !== "undefined" &&
                  window.toggleFilter(e.currentTarget)
                }
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
              <div className="filter-content px-1 mt-2">
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
            {subcategories.length > 0 && (
              <div className="filter-section open" data-group="category">
                <div
                  className="filter-title"
                  onClick={(e) =>
                    typeof window !== "undefined" &&
                    window.toggleFilter(e.currentTarget)
                  }
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
                <div className="filter-content mt-3">
                  <div className="space-y-2">
                    {subcategories
                      .slice(0, showAllSubcategories ? undefined : 4)
                      .map((subCat) => (
                        <Link
                          key={subCat.id}
                          href={`/${subCat.slug}`}
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
                  {subcategories.length > 4 && (
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
                        : `+ ${subcategories.length - 4} danh mục`}
                    </button>
                  )}
                </div>
              </div>
            )}

            {attributes.map((attr, index) => (
              <AttributeFilterBlock
                key={attr.id}
                attr={attr}
                isLast={index === attributes.length - 1}
                isOpen={index < 4}
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
            {isLoading ? (
              <div className="col-span-1 sm:col-span-2 xl:col-span-4 flex flex-col items-center justify-center py-32 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mb-4"></div>
                <p className="text-gray-400 text-sm font-medium animate-pulse">
                  Đang tải sản phẩm...
                </p>
              </div>
            ) : products.length > 0 ? (
              products.map((product: any) => (
                <Link
                  key={product.id}
                  href={`/${product.slug}`}
                  className="block bg-gradient-to-b from-[#1a1a1d] to-[#111113] border border-[#27272a] rounded-xl overflow-hidden transition-all duration-300 hover:border-[#3f3f46] shadow-[0_4px_12px_rgba(0,0,0,0.2)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.6)] hover:-translate-y-1.5 flex flex-col h-full group relative"
                >
                  {/* Image Area - Edge to Edge */}
                  <div className="w-full aspect-[4/3] relative flex items-center justify-center bg-[#151518]">
                    <ProgressiveImage
                      src={product.thumbnail}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  {/* Content Area */}
                  <div className="p-4 flex flex-col flex-1 relative z-10">
                    {/* Badges / Brand */}
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <span className="border border-[#333] bg-[#1a1a1e] text-[#a1a1aa] text-[10.5px] font-medium px-4 py-1 rounded-full">
                        {product.name.split(' ')[0] || "Brand"}
                      </span>
                    </div>

                    {/* Title with Gradient */}
                    <p className="text-sm font-medium text-center leading-relaxed line-clamp-2 mb-5 min-h-[42px] bg-clip-text text-transparent bg-gradient-to-r from-gray-100 via-gray-300 to-gray-500">
                      {product.name}
                    </p>

                    {/* Footer: Price & Stock */}
                    <div className="flex items-center justify-between mt-auto">
                      <span className="bg-gradient-to-r from-white via-cyan-400 to-purple-500 bg-clip-text text-transparent font-extrabold text-[17px] tracking-wide">
                        {new Intl.NumberFormat("vi-VN").format(product.price)}
                        <span className="text-[12px] font-bold ml-0.5 align-top underline decoration-1 underline-offset-[2px]">đ</span>
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#10b981] text-[11px] font-bold flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#10b981]"></div> In Stock
                        </span>
                        <svg className="w-4 h-4 text-gray-500 hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
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
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
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

                  for (let i of range) {
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
                        onClick={() => setCurrentPage(page as number)}
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
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
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

      {/*  ==================== ss21.html ====================  */}
      <section className="max-w-[1800px] mx-auto px-6 py-16">
        <div className="bg-[#111115] border border-[#1a1a1e] rounded-2xl p-8 md:p-12">
          {/*  Tabs  */}
          <div className="flex justify-center gap-2 mb-10">
            <button
              className="tab-btn active"
              onClick={(e) =>
                typeof window !== "undefined" &&
                window.switchTab("whybuy", e.currentTarget)
              }
            >
              Why Buy
            </button>
            <button
              className="tab-btn"
              onClick={(e) =>
                typeof window !== "undefined" &&
                window.switchTab("faq", e.currentTarget)
              }
            >
              FAQ
            </button>
          </div>

          {/*  WHY BUY TAB  */}
          <div id="tab-whybuy">
            <h2 className="text-2xl md:text-3xl font-extrabold mb-4 leading-tight">
              Top 5 Reasons to Invest in a High-Performance Graphics Card (GPU)
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-8 max-w-[1200px]">
              Investing in a top-quality graphics card (GPU) significantly
              boosts your gaming performance, delivering higher frame rates and
              stunning visuals. It also accelerates demanding tasks such as
              video editing and 3D rendering, making your workflow more
              efficient. With the ability to support multiple monitors, a GPU
              creates an expansive workspace perfect for multitasking.
              Additionally, GPUs enhance overall system performance, ensuring
              your setup is ready for future software and gaming innovations.
            </p>

            <div className="space-y-2" id="whybuy-accordion">
              <div className="accordion-item">
                <div
                  className="accordion-header"
                  onClick={(e) =>
                    typeof window !== "undefined" &&
                    window.toggleAccordion(e.currentTarget)
                  }
                >
                  <span className="accordion-num">01</span>
                  <span className="accordion-title">
                    Enhanced Gaming Performance:
                  </span>
                  <span className="accordion-icon">
                    <svg
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </span>
                </div>
                <div className="accordion-body">
                  <div className="accordion-body-inner">
                    A high-performance GPU delivers higher frame rates and
                    smoother gameplay, allowing you to enjoy the latest AAA
                    titles at maximum settings. Whether you're into competitive
                    esports or immersive open-world adventures, a powerful
                    graphics card ensures a lag-free, visually stunning
                    experience that keeps you ahead of the competition.
                  </div>
                </div>
              </div>
              <div className="accordion-item">
                <div
                  className="accordion-header"
                  onClick={(e) =>
                    typeof window !== "undefined" &&
                    window.toggleAccordion(e.currentTarget)
                  }
                >
                  <span className="accordion-num">02</span>
                  <span className="accordion-title">
                    Efficient Video Editing and Rendering:
                  </span>
                  <span className="accordion-icon">
                    <svg
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </span>
                </div>
                <div className="accordion-body">
                  <div className="accordion-body-inner">
                    Content creators and professionals benefit immensely from
                    GPU acceleration. Tasks like 4K video editing, 3D modeling,
                    and real-time rendering that would take hours on a CPU can
                    be completed in minutes with a dedicated GPU, dramatically
                    improving your productivity and creative workflow.
                  </div>
                </div>
              </div>
              <div className="accordion-item">
                <div
                  className="accordion-header"
                  onClick={(e) =>
                    typeof window !== "undefined" &&
                    window.toggleAccordion(e.currentTarget)
                  }
                >
                  <span className="accordion-num">03</span>
                  <span className="accordion-title">
                    Machine Learning and AI Capabilities:
                  </span>
                  <span className="accordion-icon">
                    <svg
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </span>
                </div>
                <div className="accordion-body">
                  <div className="accordion-body-inner">
                    Modern GPUs are essential for machine learning, deep
                    learning, and AI workloads. With thousands of CUDA cores and
                    dedicated Tensor cores, GPUs can process massive datasets
                    and train neural networks exponentially faster than CPUs,
                    making them indispensable for data scientists and AI
                    researchers.
                  </div>
                </div>
              </div>
              <div className="accordion-item">
                <div
                  className="accordion-header"
                  onClick={(e) =>
                    typeof window !== "undefined" &&
                    window.toggleAccordion(e.currentTarget)
                  }
                >
                  <span className="accordion-num">04</span>
                  <span className="accordion-title">
                    Cryptocurrency Mining:
                  </span>
                  <span className="accordion-icon">
                    <svg
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </span>
                </div>
                <div className="accordion-body">
                  <div className="accordion-body-inner">
                    While the mining landscape has evolved, GPUs remain relevant
                    for mining certain cryptocurrencies. Their parallel
                    processing capabilities make them efficient at solving
                    complex mathematical problems required for blockchain
                    verification and proof-of-work algorithms.
                  </div>
                </div>
              </div>
              <div className="accordion-item">
                <div
                  className="accordion-header"
                  onClick={(e) =>
                    typeof window !== "undefined" &&
                    window.toggleAccordion(e.currentTarget)
                  }
                >
                  <span className="accordion-num">05</span>
                  <span className="accordion-title">
                    Multi-Monitor and VR Support:
                  </span>
                  <span className="accordion-icon">
                    <svg
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </span>
                </div>
                <div className="accordion-body">
                  <div className="accordion-body-inner">
                    High-end GPUs support multiple display outputs, enabling
                    expansive multi-monitor setups for productivity or gaming.
                    They also power VR headsets with the high refresh rates and
                    low latency needed for comfortable, immersive virtual
                    reality experiences without motion sickness.
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed mt-8 max-w-[1200px]">
              Summary: Graphics cards deliver superior gaming performance,
              expedite video editing and rendering tasks, unlock machine
              learning and AI potential, facilitate cryptocurrency mining, and
              provide support for multi-monitor and VR setups. These vital
              features make them essential for gamers, content creators,
              industry professionals, and tech enthusiasts seeking optimal
              performance and cutting-edge functionality. 🚀
            </p>
          </div>

          {/*  FAQ TAB  */}
          <div id="tab-faq" className="hidden">
            <h2 className="text-2xl md:text-3xl font-extrabold mb-4 leading-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-gray-500 leading-relaxed mb-8 max-w-[1200px]">
              Find answers to the most common questions about graphics cards,
              compatibility, warranty, and more. Can't find what you're looking
              for? Contact our support team for personalized assistance.
            </p>

            <div className="space-y-2" id="faq-accordion">
              <div className="accordion-item">
                <div
                  className="accordion-header"
                  onClick={(e) =>
                    typeof window !== "undefined" &&
                    window.toggleAccordion(e.currentTarget)
                  }
                >
                  <span className="accordion-num">01</span>
                  <span className="accordion-title">
                    What graphics card is compatible with my PC?
                  </span>
                  <span className="accordion-icon">
                    <svg
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </span>
                </div>
                <div className="accordion-body">
                  <div className="accordion-body-inner">
                    Compatibility depends on your motherboard's PCIe slot (most
                    modern GPUs use PCIe x16), your power supply wattage, and
                    your case dimensions. Check your PSU's wattage rating and
                    available PCIe power connectors, and measure your case's GPU
                    clearance before purchasing. Our AI PC Builder tool can help
                    you find the perfect match.
                  </div>
                </div>
              </div>
              <div className="accordion-item">
                <div
                  className="accordion-header"
                  onClick={(e) =>
                    typeof window !== "undefined" &&
                    window.toggleAccordion(e.currentTarget)
                  }
                >
                  <span className="accordion-num">02</span>
                  <span className="accordion-title">
                    How much VRAM do I need for gaming?
                  </span>
                  <span className="accordion-icon">
                    <svg
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </span>
                </div>
                <div className="accordion-body">
                  <div className="accordion-body-inner">
                    For 1080p gaming, 6-8GB VRAM is sufficient for most titles.
                    For 1440p, aim for 8-12GB. For 4K gaming, 12GB+ is
                    recommended. Keep in mind that newer games are becoming more
                    VRAM-hungry, so investing in more VRAM now can future-proof
                    your setup for upcoming titles.
                  </div>
                </div>
              </div>
              <div className="accordion-item">
                <div
                  className="accordion-header"
                  onClick={(e) =>
                    typeof window !== "undefined" &&
                    window.toggleAccordion(e.currentTarget)
                  }
                >
                  <span className="accordion-num">03</span>
                  <span className="accordion-title">
                    What is the warranty on your graphics cards?
                  </span>
                  <span className="accordion-icon">
                    <svg
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </span>
                </div>
                <div className="accordion-body">
                  <div className="accordion-body-inner">
                    All our graphics cards come with a minimum 3-year
                    manufacturer warranty. Some premium models from brands like
                    ASUS ROG and MSI Gaming offer extended warranties. We also
                    provide our own Evetech support for the first 12 months for
                    hassle-free returns and replacements.
                  </div>
                </div>
              </div>
              <div className="accordion-item">
                <div
                  className="accordion-header"
                  onClick={(e) =>
                    typeof window !== "undefined" &&
                    window.toggleAccordion(e.currentTarget)
                  }
                >
                  <span className="accordion-num">04</span>
                  <span className="accordion-title">
                    NVIDIA vs AMD: Which should I choose?
                  </span>
                  <span className="accordion-icon">
                    <svg
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </span>
                </div>
                <div className="accordion-body">
                  <div className="accordion-body-inner">
                    Both offer excellent performance. NVIDIA excels in ray
                    tracing (RTX), DLSS upscaling, and AI workloads with CUDA
                    cores. AMD Radeon cards often provide better raw
                    rasterization performance per dollar. For content creation
                    and AI, NVIDIA is generally preferred. For pure gaming
                    value, AMD can be a strong choice.
                  </div>
                </div>
              </div>
              <div className="accordion-item">
                <div
                  className="accordion-header"
                  onClick={(e) =>
                    typeof window !== "undefined" &&
                    window.toggleAccordion(e.currentTarget)
                  }
                >
                  <span className="accordion-num">05</span>
                  <span className="accordion-title">
                    Do you offer delivery and installation services?
                  </span>
                  <span className="accordion-icon">
                    <svg
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </span>
                </div>
                <div className="accordion-body">
                  <div className="accordion-body-inner">
                    Yes! We offer nationwide delivery across South Africa with
                    various shipping options including express next-day
                    delivery. For customers in Gauteng, we also offer
                    professional installation services where our technicians
                    will install your new GPU and ensure everything is running
                    optimally.
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed mt-8 max-w-[1200px]">
              Still have questions? Our dedicated support team is available via
              live chat, email, or phone to help you make the right choice.
              We're here to ensure you get the best graphics card for your needs
              and budget. 💬
            </p>
          </div>
        </div>
      </section>

      {/*  ==================== ss22.html ====================  */}
      <section className="max-w-[1800px] mx-auto px-6 py-12">
        <div className="bg-[#111115] border border-[#1a1a1e] rounded-2xl p-6 md:p-8">
          {/*  Tabs  */}
          <div className="flex items-center gap-3 mb-8">
            <button
              className="rtab active"
              onClick={(e) =>
                typeof window !== "undefined" &&
                window.switchRTab("products", e.currentTarget)
              }
            >
              Similar Products <span className="badge">30</span>
            </button>
            <button
              className="rtab"
              onClick={(e) =>
                typeof window !== "undefined" &&
                window.switchRTab("pages", e.currentTarget)
              }
            >
              Related Pages <span className="badge">14</span>
            </button>
            <button
              className="rtab"
              onClick={(e) =>
                typeof window !== "undefined" &&
                window.switchRTab("posts", e.currentTarget)
              }
            >
              Related Posts <span className="badge">15</span>
            </button>
          </div>

          {/*  SIMILAR PRODUCTS  */}
          <div id="rtab-products">
            <div
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
              id="products-grid"
            ></div>
            <div className="flex justify-center mt-8">
              <button
                className="show-btn"
                id="products-btn"
                onClick={() =>
                  typeof window !== "undefined" && window.toggleShow("products")
                }
              >
                Show All (15)
              </button>
            </div>
          </div>
          {(() => {
            const range = [];
            const rangeWithDots = [];
            let l;

            for (let i = 1; i <= totalPages; i++) {
              if (i === 1 || i === totalPages) {
                range.push(i);
              } else if (currentPage <= 3 && i <= 5) {
                range.push(i);
              } else if (currentPage >= totalPages - 2 && i >= totalPages - 4) {
                range.push(i);
              } else if (i >= currentPage - 1 && i <= currentPage + 1) {
                range.push(i);
              }
            }

            for (let i of range) {
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
                  onClick={() => setCurrentPage(page as number)}
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
      </section>

      <Footer />
    </div>
  );
}

