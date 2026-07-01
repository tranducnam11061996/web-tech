"use client";
import { useEffect, useState } from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import ProgressiveImage from "../../components/ProgressiveImage";

export default function CategoryPage({ categoryId }: { categoryId?: string | number }) {
  const [products, setProducts] = useState<any[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);

  useEffect(() => {
    let url = `http://localhost:3000/api/products?limit=24&page=${currentPage}`;
    if (categoryId) {
      url += "&category_id=" + categoryId;
    } else if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const catId = searchParams.get("id");
      if (catId) {
        url += "&category_id=" + catId;
      }
    }
    
    // Scroll to top when changing page
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    fetch(url)
      .then(res => res.json())
      .then(res => {
        if (res.success) {
          setProducts(res.data);
          if (res.pagination) {
            setTotalPages(res.pagination.totalPages);
            setTotalProducts(res.pagination.total);
          }
        }
      })
      .catch(err => console.error("Error fetching products:", err));
  }, [categoryId, currentPage]);

  return (
    <>
      <Header />
      {/*  ==================== ss20.html ====================  */}
<div className="max-w-[1800px] mx-auto flex gap-6 p-6">

  {/*  ===== SIDEBAR LEFT =====  */}
  <aside className="w-[300px] shrink-0 hidden lg:block">

    {/*  Filters Panel  */}
    <div className="bg-[#111115] border border-[#1a1a1e] rounded-2xl p-5 mb-5" id="sidebar-category">
      {/*  Header  */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-base">🔧</span>
          <span className="text-[15px] font-extrabold text-white">Filters</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <button className="hover:text-white transition" id="seach-filters-sidebar" onClick={() => typeof window !== "undefined" && window.toggleSidebarSearch()}>🔍 Tìm Nhanh</button>
        </div>
      </div>

      {/*  Search Input (Hidden by default)  */}
      <div id="sidebar-search-container" className="hidden mb-4 transition-all">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">🔍</span>
          <input type="text" id="sidebar-search-input" placeholder="Nhập từ khóa tìm kiếm filter..." className="w-full bg-[#18181b] border border-[#27272a] rounded-lg py-2 pl-8 pr-8 text-sm text-gray-300 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-colors" onInput={() => typeof window !== "undefined" && window.filterSidebar()} />
          <button className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white text-xs transition" onClick={() => typeof window !== "undefined" && window.closeSidebarSearch()}>✕</button>
        </div>
      </div>

      {/*  Active Filters  */}
      <div id="active-filters-sidebar">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-gray-400 font-semibold">Active Filters</span>
          <span id="active-filters-count" className="bg-[#1a1a1e] text-[10px] text-gray-500 px-1.5 py-0.5 rounded font-bold">0</span>
          <span id="clear-all-filters" className="text-[10px] text-cyan-500 ml-auto cursor-pointer hover:underline hidden" onClick={() => typeof window !== "undefined" && window.clearAllFilters()}>Clear all</span>
        </div>
        <div id="active-filters-list" className="flex gap-2 mb-4 flex-wrap">
          {/*  Populated by JS  */}
        </div>
      </div>

      {/*  Price Range  */}
      <div className="filter-section open" id="price-range-sidebar">
        <div className="filter-title" onClick={(e) => typeof window !== "undefined" && window.toggleFilter(e.currentTarget)}>
          <span className="flex items-center gap-2"><span className="text-sm">💰</span> Price Range</span>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
        </div>
        <div className="filter-content px-1 mt-2">
          <div className="dual-range-container">
            <div className="dual-range-track" id="price-track" style={{ "left": "0%", "right": "0%" }}></div>
            <input type="range" id="price-min" className="dual-range-slider" min="0" max="200000" defaultValue="0" step="1000" onInput={() => typeof window !== "undefined" && window.updatePriceSlider()} />
            <input type="range" id="price-max" className="dual-range-slider" min="0" max="200000" defaultValue="200000" step="1000" onInput={() => typeof window !== "undefined" && window.updatePriceSlider()} />
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 mt-4">
            <span id="price-val-min">R 0</span>
            <span id="price-val-max">R 200,000</span>
          </div>
        </div>
      </div>

      {/*  Category  */}
      <div className="filter-section open" data-group="category">
        <div className="filter-title" onClick={(e) => typeof window !== "undefined" && window.toggleFilter(e.currentTarget)}>
          <span className="flex items-center gap-2"><span className="text-sm">📁</span> Category</span>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
        </div>
        <div className="filter-content mt-3">
          <label className="filter-checkbox"><input type="checkbox" value="NVIDIA GeForce Grap..." /> NVIDIA GeForce Grap...</label>
        </div>
      </div>

      {/*  Brands  */}
      <div className="filter-section open" data-group="brands">
        <div className="filter-title" onClick={(e) => typeof window !== "undefined" && window.toggleFilter(e.currentTarget)}>
          <span className="flex items-center gap-2"><span className="text-sm">🏷️</span> Brands <span id="brands-count-badge" className="bg-emerald-900/50 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded font-bold">6</span></span>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
        </div>
        <div className="filter-content mt-3 space-y-0.5">
          <label className="filter-checkbox"><input type="checkbox" value="MSI" /> MSI <span className="filter-count">17</span></label>
          <label className="filter-checkbox"><input type="checkbox" value="ASUS" /> ASUS <span className="filter-count"></span></label>
          <label className="filter-checkbox"><input type="checkbox" value="Palit" /> Palit <span className="filter-count">(10)</span></label>
          <label className="filter-checkbox"><input type="checkbox" value="ASROCK" /> ASROCK <span className="filter-count">(6)</span></label>
          <button className="text-[11px] text-cyan-500 mt-2 hover:underline flex items-center gap-1">+ 4 more</button>
        </div>
      </div>

      {/*  Color  */}
      <div className="filter-section open" data-group="color">
        <div className="filter-title" onClick={(e) => typeof window !== "undefined" && window.toggleFilter(e.currentTarget)}>
          <span className="flex items-center gap-2"><span className="text-sm">🎨</span> Color</span>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
        </div>
        <div className="filter-content mt-3 space-y-0.5">
          <label className="filter-checkbox"><input type="checkbox" value="Black" /> Black</label>
          <label className="filter-checkbox"><input type="checkbox" value="Silver" /> Silver</label>
          <label className="filter-checkbox"><input type="checkbox" value="White" /> White</label>
          <label className="filter-checkbox"><input type="checkbox" value="Other" /> Other</label>
        </div>
      </div>

      {/*  Collapsible filters  */}
      <div className="filter-section" data-group="gpu-series">
        <div className="filter-title" onClick={(e) => typeof window !== "undefined" && window.toggleFilter(e.currentTarget)}>
          <span className="flex items-center gap-2"><span className="text-sm">⚙️</span> G P U Series</span>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
        </div>
        <div className="filter-content mt-3 space-y-0.5" style={{ "display": "none" }}>
          <label className="filter-checkbox"><input type="checkbox" value="RTX 50 Series" /> RTX 50 Series <span className="filter-count">(12)</span></label>
          <label className="filter-checkbox"><input type="checkbox" value="RTX 40 Series" /> RTX 40 Series <span className="filter-count">(24)</span></label>
          <label className="filter-checkbox"><input type="checkbox" value="RTX 30 Series" /> RTX 30 Series <span className="filter-count">(8)</span></label>
        </div>
      </div>
      <div className="filter-section" data-group="length-mm">
        <div className="filter-title" onClick={(e) => typeof window !== "undefined" && window.toggleFilter(e.currentTarget)}>
          <span className="flex items-center gap-2"><span className="text-sm">📏</span> Length(mm)</span>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
        </div>
        <div className="filter-content mt-3 space-y-0.5" style={{ "display": "none" }}>
          <label className="filter-checkbox"><input type="checkbox" value="< 200mm" /> {"<"} 200mm</label>
          <label className="filter-checkbox"><input type="checkbox" value="200mm - 300mm" /> 200mm - 300mm</label>
          <label className="filter-checkbox"><input type="checkbox" value="> 300mm" /> {">"} 300mm</label>
        </div>
      </div>
      <div className="filter-section" data-group="memory-size">
        <div className="filter-title" onClick={(e) => typeof window !== "undefined" && window.toggleFilter(e.currentTarget)}>
          <span className="flex items-center gap-2"><span className="text-sm">💾</span> Memory Size</span>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
        </div>
        <div className="filter-content mt-3 space-y-0.5" style={{ "display": "none" }}>
          <label className="filter-checkbox"><input type="checkbox" value="8GB" /> 8GB</label>
          <label className="filter-checkbox"><input type="checkbox" value="12GB" /> 12GB</label>
          <label className="filter-checkbox"><input type="checkbox" value="16GB" /> 16GB</label>
          <label className="filter-checkbox"><input type="checkbox" value="24GB" /> 24GB</label>
        </div>
      </div>
      <div className="filter-section" data-group="recommended-psu">
        <div className="filter-title" onClick={(e) => typeof window !== "undefined" && window.toggleFilter(e.currentTarget)}>
          <span className="flex items-center gap-2"><span className="text-sm">⚡</span> Recommended P S U ( W)</span>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
        </div>
        <div className="filter-content mt-3 space-y-0.5" style={{ "display": "none" }}>
          <label className="filter-checkbox"><input type="checkbox" value="500W - 650W" /> 500W - 650W</label>
          <label className="filter-checkbox"><input type="checkbox" value="750W - 850W" /> 750W - 850W</label>
          <label className="filter-checkbox"><input type="checkbox" value="1000W+" /> 1000W+</label>
        </div>
      </div>
      <div className="filter-section" style={{ "borderBottom": "none" }} data-group="slot-width">
        <div className="filter-title" onClick={(e) => typeof window !== "undefined" && window.toggleFilter(e.currentTarget)}>
          <span className="flex items-center gap-2"><span className="text-sm">📐</span> Slot Width</span>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg>
        </div>
        <div className="filter-content mt-3 space-y-0.5" style={{ "display": "none" }}>
          <label className="filter-checkbox"><input type="checkbox" value="2 Slots" /> 2 Slots</label>
          <label className="filter-checkbox"><input type="checkbox" value="2.5 Slots" /> 2.5 Slots</label>
          <label className="filter-checkbox"><input type="checkbox" value="3 Slots" /> 3 Slots</label>
        </div>
      </div>
    </div>

    {/*  Promo Box 1: AI Laptop Finder  */}
    <div className="promo-box" style={{ "background": "linear-gradient(135deg, #0c1a12 0%, #111115 50%, #1a0f10 100%)", "borderColor": "#1a2e1f" }}>
      <div className="flex items-center justify-between mb-3">
        <span className="bg-red-500/20 text-red-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">⚡ AI-Powered</span>
        <span className="text-xl">🤖</span>
      </div>
      <h3 className="text-[22px] font-extrabold leading-tight mb-1">Your perfect</h3>
      <h3 className="text-[22px] font-extrabold leading-tight mb-1"><span className="text-emerald-400">laptop match</span> awaits</h3>
      <p className="text-[11px] text-gray-500 leading-relaxed mb-4">Tell our AI what you need. Budget, purpose, done. Matched in seconds.</p>
      <div className="flex gap-2 mb-5">
        <span className="bg-[#1a1a1e] text-[10px] text-gray-400 px-3 py-1.5 rounded-full flex items-center gap-1">🎮 Gaming</span>
        <span className="bg-[#1a1a1e] text-[10px] text-gray-400 px-3 py-1.5 rounded-full flex items-center gap-1">💼 Work</span>
        <span className="bg-[#1a1a1e] text-[10px] text-gray-400 px-3 py-1.5 rounded-full flex items-center gap-1">📚 Study</span>
      </div>
      <button className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2">✦ Launch Finder →</button>
    </div>

    {/*  Promo Box 2: Build Smart  */}
    <div className="promo-box" style={{ "background": "linear-gradient(135deg, #111115 0%, #0f1117 100%)", "borderColor": "#1a1a2e" }}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-[20px] font-extrabold leading-tight">Don't guess.</h3>
          <h3 className="text-[20px] font-extrabold leading-tight"><span className="text-cyan-400">Build smart.</span></h3>
        </div>
        <span className="text-xl">👍</span>
      </div>
      <p className="text-[11px] text-gray-500 leading-relaxed mb-4">Your budget & games in → perfectly optimized build out. No tech knowledge needed.</p>
      <div className="flex gap-2 mb-5">
        <span className="bg-[#1a1a1e] text-[11px] text-gray-400 px-3 py-1.5 rounded-full font-bold">50K+</span>
        <span className="bg-[#1a1a1e] text-[11px] text-gray-400 px-3 py-1.5 rounded-full font-bold">~60s</span>
        <span className="bg-[#1a1a1e] text-[11px] text-gray-400 px-3 py-1.5 rounded-full font-bold">#1</span>
      </div>
      <button className="w-full bg-[#1a1a1e] hover:bg-[#27272a] text-white text-sm font-bold py-2.5 rounded-xl transition border border-[#27272a]">Start Building →</button>
    </div>

    {/*  Promo Box 3: App Only Deals  */}
    <div className="promo-box" style={{ "background": "linear-gradient(135deg, #0f1117 0%, #111115 100%)", "borderColor": "#1a1a2e" }}>
      <span className="bg-blue-500/20 text-blue-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 w-fit mb-3">📱 Mobile App</span>
      <h3 className="text-[20px] font-extrabold leading-tight mb-0.5">Unlock</h3>
      <h3 className="text-[20px] font-extrabold leading-tight mb-2"><span className="text-blue-400">App Only</span> Deals</h3>
      <p className="text-[11px] text-gray-500 leading-relaxed mb-4">Prices you won't find on desktop. Download and save.</p>
      <div className="flex gap-3">
        <button className="flex-1 bg-[#1a1a1e] hover:bg-[#27272a] text-white text-[11px] font-bold py-2 rounded-lg transition border border-[#27272a] flex items-center justify-center gap-1.5"> App Store</button>
        <button className="flex-1 bg-[#1a1a1e] hover:bg-[#27272a] text-white text-[11px] font-bold py-2 rounded-lg transition border border-[#27272a] flex items-center justify-center gap-1.5">▶ Google Play</button>
      </div>
    </div>

    {/*  Promo Box 4: Know More  */}
    <div className="promo-box" style={{ "background": "#111115", "borderColor": "#1a1a1e" }}>
      <div className="flex items-center justify-between mb-1">
        <div>
          <h3 className="text-[20px] font-extrabold leading-tight">Know more.</h3>
          <h3 className="text-[20px] font-extrabold leading-tight"><span className="text-purple-400">Game better.</span></h3>
        </div>
        <span className="text-gray-600 text-sm">OG</span>
      </div>
      <p className="text-[11px] text-gray-500 leading-relaxed mb-4">Reviews, guides & benchmarks from the Evetech team. Read before you buy.</p>
      <div className="flex gap-2 mb-5">
        <span className="bg-[#1a1a1e] text-[11px] text-gray-400 px-3 py-1.5 rounded-full font-bold">100+</span>
        <span className="bg-[#1a1a1e] text-[11px] text-gray-400 px-3 py-1.5 rounded-full font-bold">50+</span>
        <span className="bg-[#1a1a1e] text-[11px] text-gray-400 px-3 py-1.5 rounded-full font-bold">REAL</span>
      </div>
      <button className="w-full bg-[#1a1a1e] hover:bg-[#27272a] text-white text-sm font-bold py-2.5 rounded-xl transition border border-[#27272a]">Explore Evezone →</button>
    </div>

  </aside>

  {/*  ===== PRODUCT GRID RIGHT =====  */}
  <main className="flex-1 min-w-0">
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" id="productGrid">
      {products.length > 0 ? products.map((product: any) => (
        <a key={product.id} href={`/${product.slug}`} className="product-card-category block relative overflow-hidden transition hover:-translate-y-1">
          <div className="product-img-category relative">
            <div className="gpu-box relative" style={{ background: "linear-gradient(135deg, #0f1a14 0%, #111115 50%, #141418 100%)", border: "1px solid #1a2e1f", height: "100%" }}>
              <div className="absolute inset-0 flex items-center justify-center p-4 z-10">
                <ProgressiveImage src={product.thumbnail} alt={product.name} className="w-[85%] h-[85%] object-contain" />
              </div>
            </div>
          </div>
          <div className="p-4 relative z-20">
            <p className="text-[10px] text-gray-500 font-semibold text-center mb-1">HACOM</p>
            <p className="text-[12px] text-gray-300 font-medium text-center leading-tight mb-3 line-clamp-2 h-[32px]">{product.name}</p>
            <div className="flex items-center justify-between">
              <span className="text-white font-extrabold text-[15px]">
                {new Intl.NumberFormat("vi-VN").format(product.price)}<sup className="text-[10px] underline decoration-[1px] underline-offset-2 ml-1 relative -top-1">d</sup>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400 text-[10px] font-semibold flex items-center gap-0.5">? In Stock</span>
                <button className="text-gray-600 hover:text-white transition text-sm">?</button>
              </div>
            </div>
          </div>
        </a>
      )) : (
        <div className="col-span-4 flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
        </div>
      )}
    </div>

    {/* Pagination UI */}
    {totalPages > 1 && (
      <div className="flex justify-center items-center gap-2 mt-12 mb-10">
        <button 
          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
          disabled={currentPage === 1}
          className="w-10 h-10 flex items-center justify-center bg-[#18181b] rounded-xl text-gray-400 hover:text-white hover:bg-[#27272a] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
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
                  rangeWithDots.push('...');
                }
              }
              rangeWithDots.push(i);
              l = i;
            }

            return rangeWithDots.map((page, index) => (
              page === '...' ? (
                <span key={`dots-${index}`} className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#18181b] text-gray-500 font-medium">...</span>
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
            ));
          })()}
        </div>

        <button 
          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
          disabled={currentPage === totalPages}
          className="w-10 h-10 flex items-center justify-center bg-[#18181b] rounded-xl text-gray-400 hover:text-white hover:bg-[#27272a] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
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
      <button className="tab-btn active" onClick={(e) => typeof window !== "undefined" && window.switchTab('whybuy',e.currentTarget)}>Why Buy</button>
      <button className="tab-btn" onClick={(e) => typeof window !== "undefined" && window.switchTab('faq',e.currentTarget)}>FAQ</button>
    </div>

    {/*  WHY BUY TAB  */}
    <div id="tab-whybuy">
      <h2 className="text-2xl md:text-3xl font-extrabold mb-4 leading-tight">Top 5 Reasons to Invest in a High-Performance Graphics Card (GPU)</h2>
      <p className="text-sm text-gray-500 leading-relaxed mb-8 max-w-[1200px]">Investing in a top-quality graphics card (GPU) significantly boosts your gaming performance, delivering higher frame rates and stunning visuals. It also accelerates demanding tasks such as video editing and 3D rendering, making your workflow more efficient. With the ability to support multiple monitors, a GPU creates an expansive workspace perfect for multitasking. Additionally, GPUs enhance overall system performance, ensuring your setup is ready for future software and gaming innovations.</p>

      <div className="space-y-2" id="whybuy-accordion">
        <div className="accordion-item">
          <div className="accordion-header" onClick={(e) => typeof window !== "undefined" && window.toggleAccordion(e.currentTarget)}>
            <span className="accordion-num">01</span>
            <span className="accordion-title">Enhanced Gaming Performance:</span>
            <span className="accordion-icon"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg></span>
          </div>
          <div className="accordion-body"><div className="accordion-body-inner">A high-performance GPU delivers higher frame rates and smoother gameplay, allowing you to enjoy the latest AAA titles at maximum settings. Whether you're into competitive esports or immersive open-world adventures, a powerful graphics card ensures a lag-free, visually stunning experience that keeps you ahead of the competition.</div></div>
        </div>
        <div className="accordion-item">
          <div className="accordion-header" onClick={(e) => typeof window !== "undefined" && window.toggleAccordion(e.currentTarget)}>
            <span className="accordion-num">02</span>
            <span className="accordion-title">Efficient Video Editing and Rendering:</span>
            <span className="accordion-icon"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg></span>
          </div>
          <div className="accordion-body"><div className="accordion-body-inner">Content creators and professionals benefit immensely from GPU acceleration. Tasks like 4K video editing, 3D modeling, and real-time rendering that would take hours on a CPU can be completed in minutes with a dedicated GPU, dramatically improving your productivity and creative workflow.</div></div>
        </div>
        <div className="accordion-item">
          <div className="accordion-header" onClick={(e) => typeof window !== "undefined" && window.toggleAccordion(e.currentTarget)}>
            <span className="accordion-num">03</span>
            <span className="accordion-title">Machine Learning and AI Capabilities:</span>
            <span className="accordion-icon"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg></span>
          </div>
          <div className="accordion-body"><div className="accordion-body-inner">Modern GPUs are essential for machine learning, deep learning, and AI workloads. With thousands of CUDA cores and dedicated Tensor cores, GPUs can process massive datasets and train neural networks exponentially faster than CPUs, making them indispensable for data scientists and AI researchers.</div></div>
        </div>
        <div className="accordion-item">
          <div className="accordion-header" onClick={(e) => typeof window !== "undefined" && window.toggleAccordion(e.currentTarget)}>
            <span className="accordion-num">04</span>
            <span className="accordion-title">Cryptocurrency Mining:</span>
            <span className="accordion-icon"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg></span>
          </div>
          <div className="accordion-body"><div className="accordion-body-inner">While the mining landscape has evolved, GPUs remain relevant for mining certain cryptocurrencies. Their parallel processing capabilities make them efficient at solving complex mathematical problems required for blockchain verification and proof-of-work algorithms.</div></div>
        </div>
        <div className="accordion-item">
          <div className="accordion-header" onClick={(e) => typeof window !== "undefined" && window.toggleAccordion(e.currentTarget)}>
            <span className="accordion-num">05</span>
            <span className="accordion-title">Multi-Monitor and VR Support:</span>
            <span className="accordion-icon"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg></span>
          </div>
          <div className="accordion-body"><div className="accordion-body-inner">High-end GPUs support multiple display outputs, enabling expansive multi-monitor setups for productivity or gaming. They also power VR headsets with the high refresh rates and low latency needed for comfortable, immersive virtual reality experiences without motion sickness.</div></div>
        </div>
      </div>

      <p className="text-xs text-gray-600 leading-relaxed mt-8 max-w-[1200px]">Summary: Graphics cards deliver superior gaming performance, expedite video editing and rendering tasks, unlock machine learning and AI potential, facilitate cryptocurrency mining, and provide support for multi-monitor and VR setups. These vital features make them essential for gamers, content creators, industry professionals, and tech enthusiasts seeking optimal performance and cutting-edge functionality. 🚀</p>
    </div>

    {/*  FAQ TAB  */}
    <div id="tab-faq" className="hidden">
      <h2 className="text-2xl md:text-3xl font-extrabold mb-4 leading-tight">Frequently Asked Questions</h2>
      <p className="text-sm text-gray-500 leading-relaxed mb-8 max-w-[1200px]">Find answers to the most common questions about graphics cards, compatibility, warranty, and more. Can't find what you're looking for? Contact our support team for personalized assistance.</p>

      <div className="space-y-2" id="faq-accordion">
        <div className="accordion-item">
          <div className="accordion-header" onClick={(e) => typeof window !== "undefined" && window.toggleAccordion(e.currentTarget)}>
            <span className="accordion-num">01</span>
            <span className="accordion-title">What graphics card is compatible with my PC?</span>
            <span className="accordion-icon"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg></span>
          </div>
          <div className="accordion-body"><div className="accordion-body-inner">Compatibility depends on your motherboard's PCIe slot (most modern GPUs use PCIe x16), your power supply wattage, and your case dimensions. Check your PSU's wattage rating and available PCIe power connectors, and measure your case's GPU clearance before purchasing. Our AI PC Builder tool can help you find the perfect match.</div></div>
        </div>
        <div className="accordion-item">
          <div className="accordion-header" onClick={(e) => typeof window !== "undefined" && window.toggleAccordion(e.currentTarget)}>
            <span className="accordion-num">02</span>
            <span className="accordion-title">How much VRAM do I need for gaming?</span>
            <span className="accordion-icon"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg></span>
          </div>
          <div className="accordion-body"><div className="accordion-body-inner">For 1080p gaming, 6-8GB VRAM is sufficient for most titles. For 1440p, aim for 8-12GB. For 4K gaming, 12GB+ is recommended. Keep in mind that newer games are becoming more VRAM-hungry, so investing in more VRAM now can future-proof your setup for upcoming titles.</div></div>
        </div>
        <div className="accordion-item">
          <div className="accordion-header" onClick={(e) => typeof window !== "undefined" && window.toggleAccordion(e.currentTarget)}>
            <span className="accordion-num">03</span>
            <span className="accordion-title">What is the warranty on your graphics cards?</span>
            <span className="accordion-icon"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg></span>
          </div>
          <div className="accordion-body"><div className="accordion-body-inner">All our graphics cards come with a minimum 3-year manufacturer warranty. Some premium models from brands like ASUS ROG and MSI Gaming offer extended warranties. We also provide our own Evetech support for the first 12 months for hassle-free returns and replacements.</div></div>
        </div>
        <div className="accordion-item">
          <div className="accordion-header" onClick={(e) => typeof window !== "undefined" && window.toggleAccordion(e.currentTarget)}>
            <span className="accordion-num">04</span>
            <span className="accordion-title">NVIDIA vs AMD: Which should I choose?</span>
            <span className="accordion-icon"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg></span>
          </div>
          <div className="accordion-body"><div className="accordion-body-inner">Both offer excellent performance. NVIDIA excels in ray tracing (RTX), DLSS upscaling, and AI workloads with CUDA cores. AMD Radeon cards often provide better raw rasterization performance per dollar. For content creation and AI, NVIDIA is generally preferred. For pure gaming value, AMD can be a strong choice.</div></div>
        </div>
        <div className="accordion-item">
          <div className="accordion-header" onClick={(e) => typeof window !== "undefined" && window.toggleAccordion(e.currentTarget)}>
            <span className="accordion-num">05</span>
            <span className="accordion-title">Do you offer delivery and installation services?</span>
            <span className="accordion-icon"><svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"/></svg></span>
          </div>
          <div className="accordion-body"><div className="accordion-body-inner">Yes! We offer nationwide delivery across South Africa with various shipping options including express next-day delivery. For customers in Gauteng, we also offer professional installation services where our technicians will install your new GPU and ensure everything is running optimally.</div></div>
        </div>
      </div>

      <p className="text-xs text-gray-600 leading-relaxed mt-8 max-w-[1200px]">Still have questions? Our dedicated support team is available via live chat, email, or phone to help you make the right choice. We're here to ensure you get the best graphics card for your needs and budget. 💬</p>
    </div>

  </div>
</section>

{/*  ==================== ss22.html ====================  */}
<section className="max-w-[1800px] mx-auto px-6 py-12">
  <div className="bg-[#111115] border border-[#1a1a1e] rounded-2xl p-6 md:p-8">

    {/*  Tabs  */}
    <div className="flex items-center gap-3 mb-8">
      <button className="rtab active" onClick={(e) => typeof window !== "undefined" && window.switchRTab('products',e.currentTarget)}>Similar Products <span className="badge">30</span></button>
      <button className="rtab" onClick={(e) => typeof window !== "undefined" && window.switchRTab('pages',e.currentTarget)}>Related Pages <span className="badge">14</span></button>
      <button className="rtab" onClick={(e) => typeof window !== "undefined" && window.switchRTab('posts',e.currentTarget)}>Related Posts <span className="badge">15</span></button>
    </div>

    {/*  SIMILAR PRODUCTS  */}
    <div id="rtab-products">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4" id="products-grid"></div>
      <div className="flex justify-center mt-8">
        <button className="show-btn" id="products-btn" onClick={() => typeof window !== "undefined" && window.toggleShow('products')}>Show All (15)</button>
      </div>
    </div>

    {/*  RELATED PAGES  */}
    <div id="rtab-pages" className="hidden">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4" id="pages-grid"></div>
      <div className="flex justify-center mt-8">
        <button className="show-btn" id="pages-btn" onClick={() => typeof window !== "undefined" && window.toggleShow('pages')}>Show All (15)</button>
      </div>
    </div>

    {/*  RELATED POSTS  */}
    <div id="rtab-posts" className="hidden">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4" id="posts-grid"></div>
      <div className="flex justify-center mt-8">
        <button className="show-btn" id="posts-btn" onClick={() => typeof window !== "undefined" && window.toggleShow('posts')}>Show All (15)</button>
      </div>
    </div>

  </div>
</section>


      <Footer />
    </>
  );
}
