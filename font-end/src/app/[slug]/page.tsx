"use client";

import React, { useState, useEffect, useRef } from 'react';
import Header from "../../components/Header";
import Footer from "../../components/Footer";

import { useParams } from 'next/navigation';
import CategoryClient from '../category/CategoryClient';

export default function ProductPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const [productData, setProductData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [curSlide, setCurSlide] = useState(0);
  const totalSlides = productData?.images?.length || 5;
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [curTranslate, setCurTranslate] = useState(0);

  const [qty, setQty] = useState(1);
  const [openPromos, setOpenPromos] = useState<string[]>(['promo1', 'promo2']);
  const [descExpanded, setDescExpanded] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [specModalOpen, setSpecModalOpen] = useState(false);

  const mainRef = useRef<HTMLDivElement>(null);
  const autoTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!slug) return;
    const fetchProduct = async () => {
      try {
        const res = await fetch(`/api/products/${slug}`);
        const json = await res.json();
        if (json.success) {
          setProductData(json.data);
        } else {
          setError(json.message || "Product not found");
        }
      } catch (err) {
        setError("Error fetching product");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [slug]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSpecModalOpen(false);
      }
    };

    if (specModalOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    }
  }, [specModalOpen]);

  useEffect(() => {
    startAuto();
    return stopAuto;
  }, []);

  const nextSlide = () => {
    setCurSlide((prev) => (prev + 1) % totalSlides);
    resetAuto();
  };

  const prevSlide = () => {
    setCurSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
    resetAuto();
  };

  const startAuto = () => {
    stopAuto();
    autoTimerRef.current = setInterval(() => {
      setCurSlide((prev) => (prev + 1) % totalSlides);
    }, 3000);
  };

  const stopAuto = () => {
    if (autoTimerRef.current) clearInterval(autoTimerRef.current);
  };

  const resetAuto = () => {
    stopAuto();
    startAuto();
  };

  const dStart = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    setStartX('touches' in e ? e.touches[0].clientX : e.pageX);
    stopAuto();
  };

  const dMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const x = 'touches' in e ? e.touches[0].clientX : e.pageX;
    setCurTranslate(x - startX);
  };

  const dEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const w = mainRef.current?.offsetWidth || 1;
    if (curTranslate < -w * 0.15 && curSlide < totalSlides - 1) {
      setCurSlide(curSlide + 1);
    } else if (curTranslate > w * 0.15 && curSlide > 0) {
      setCurSlide(curSlide - 1);
    }
    setCurTranslate(0);
    startAuto();
  };

  const togglePromo = (id: string) => {
    setOpenPromos(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-[#0f0f11] text-white text-xl">Đang tải sản phẩm...</div>;
  if (error) return <div className="flex h-screen items-center justify-center bg-[#0f0f11] text-red-500 text-xl">{error}</div>;
  if (!productData) return null;

  if (productData.type === 'category') {
    return <CategoryClient categoryId={productData.id} params={params} categoryInfo={productData} />;
  }

  const formatNum = (num: number) => new Intl.NumberFormat('vi-VN').format(num);
  const priceStr = formatNum(productData.price || 0);
  const marketPriceStr = formatNum(productData.marketPrice || 0);
  const savingsStr = formatNum(productData.savings || 0);

  return (
    <>


      {/* ==================== Content from ss1.html ==================== */}


      <Header />




      {/* ==================== Content from ss23.html ==================== */}


      <div className="max-w-[1800px] mx-auto px-4 md:px-6 py-6">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-gray-500 mb-6 flex-wrap">
          <a href="#" className="hover:text-emerald-400 transition flex items-center gap-1">🏠 Trang chủ</a><span>/</span>
          <a href="#" className="hover:text-emerald-400 transition">Linh Kiện Máy Tính</a><span>/</span>
          <a href="#" className="hover:text-emerald-400 transition">Mainboard - Bo mạch chủ</a><span>/</span>
          <a href="#" className="hover:text-emerald-400 transition">Mainboard AMD</a><span>/</span>
          <span className="text-gray-400">{productData.name}</span>
        </nav>

        <div className="block lg:hidden mb-6 space-y-3">
          {/* Title */}
          <h1 className="text-xl md:text-2xl font-extrabold leading-tight">{productData.name}</h1>
          <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
            <span>Mã SP: <span className="text-emerald-400 font-bold">{productData.sku}</span></span>
            <span>| Đánh giá: <span className="text-yellow-500">★★★★☆</span></span>
            <span>| Bình luận: <span className="text-gray-400 font-bold">0</span></span>
            <span>| Lượt xem: <span className="text-cyan-400 font-bold">{productData.views}</span></span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* ===== LEFT: CAROUSEL ===== */}
          <div className="w-full lg:w-[60%] lg:sticky lg:top-6 lg:self-start">
            <div className="flex flex-col-reverse lg:flex-row gap-3 lg:items-stretch">
              {/* Thumbnails */}
              <div className="w-full lg:w-[15%] shrink-0" style={{ containerType: 'inline-size' }}>
                <div className="flex flex-row lg:flex-col gap-3 overflow-x-auto lg:overflow-x-hidden lg:overflow-y-auto no-scrollbar pb-1 lg:pb-0 h-full lg:max-h-[calc(5*100cqi+4*0.75rem)]" id="thumbList">

                {Array.from({ length: totalSlides }).map((_, i) => (
                  <div
                    key={i}
                    className={`thumb ${i === curSlide ? 'active' : ''} shrink-0 w-[23%] lg:w-full lg:aspect-square border border-[#27272a] rounded-md overflow-hidden`}
                    onClick={() => setCurSlide(i)}
                  >
                    <img src={productData.images[i] || productData.images[0]} alt={`${productData.name} thumb ${i+1}`} className="w-full h-full object-cover text-transparent text-[0px]" />
                  </div>
                ))}

              </div>
              </div>
              {/* Main carousel */}
              <div className="w-full lg:flex-1 relative lg:h-auto">
                <div className="carousel-main aspect-[4/3] lg:aspect-auto lg:h-full lg:w-full" id="carouselMain" ref={mainRef} onMouseEnter={stopAuto} onMouseLeave={() => { if (!isDragging) startAuto() }} onMouseDown={dStart} onTouchStart={dStart} onMouseMove={dMove} onTouchMove={dMove} onMouseUp={dEnd} onTouchEnd={dEnd}>
                  <div className="carousel-track" id="carTrack" style={{ transform: `translateX(calc(-${curSlide * 100}% + ${curTranslate}px))`, transition: isDragging ? 'none' : 'transform .4s cubic-bezier(.25,1,.5,1)' }}>
                    {Array.from({ length: totalSlides }).map((_, i) => (
                      <div className="carousel-slide" key={i}>
                        <div className="slide-placeholder border border-[#27272a] rounded-xl overflow-hidden bg-[#111115]">
                          <img src={productData.images[i] || productData.images[0]} alt={`${productData.name} image ${i+1}`} className="w-full h-full object-contain text-transparent text-[0px]" />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="car-arrow left-3" onClick={prevSlide}>‹</div>
                  <div className="car-arrow right-3" onClick={nextSlide}>›</div>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-gray-600 text-center mt-3 italic lg:pl-[calc(15%+0.75rem)]">Hình ảnh mang tính chất minh họa / tham khảo !</p>

            {/* Nav Buttons */}
            <div className="flex gap-3 mt-5 justify-center flex-wrap lg:pl-[calc(15%+0.75rem)]">
              <a href="#sec-images" className="nav-btn"><div className="icon">📷</div><span>Hình ảnh<br />sản phẩm</span></a>
              <a href="#sec-specs" className="nav-btn"><div className="icon">📋</div><span>Thông số<br />kỹ thuật</span></a>
              <a href="#sec-faq" className="nav-btn"><div className="icon">💬</div><span>Câu hỏi<br />thường gặp (5)</span></a>
              <a href="#sec-reviews" className="nav-btn"><div className="icon">⭐</div><span>Đánh giá<br />sản phẩm</span></a>
            </div>
          </div>

          {/* ===== RIGHT: PRODUCT INFO ===== */}
          <div className="w-full lg:w-[40%] space-y-5">

            <div className="hidden lg:block space-y-5">
              {/* Title */}
              <h1 className="text-xl md:text-2xl font-extrabold leading-tight">{productData.name}</h1>
              <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
                <span>Mã SP: <span className="text-emerald-400 font-bold">{productData.sku}</span></span>
                <span>| Đánh giá: <span className="text-yellow-500">★★★★☆</span></span>
                <span>| Bình luận: <span className="text-gray-400 font-bold">0</span></span>
                <span>| Lượt xem: <span className="text-cyan-400 font-bold">{productData.views}</span></span>
              </div>
            </div>

            {/* Specs */}
            {(() => {
              if (!productData.proSummary || productData.proSummary.trim() === '') return null;
              const lines = productData.proSummary.split(/\r?\n/).filter((line: string) => line.trim() !== '');
              if (lines.length === 0) return null;
              
              const visibleLines = (summaryExpanded || lines.length <= 4) ? lines : lines.slice(0, 4);

              return (
                <div className="spec-box" id="sec-specs">
                  <h3 className="text-sm font-bold mb-3 text-emerald-400">Thông số sản phẩm</h3>
                  <div className="space-y-2.5 text-[13px] text-gray-200 product-spec-list">
                    {visibleLines.map((line: string, idx: number) => (
                      <div key={idx} className="flex gap-2 items-start leading-relaxed">
                        <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="12" cy="12" r="10" fill="#f97316" />
                          <path d="M7 12.5l3 3 7-7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <span dangerouslySetInnerHTML={{ __html: line }} />
                      </div>
                    ))}
                    {lines.length > 4 && (
                      <button 
                        onClick={() => setSummaryExpanded(!summaryExpanded)}
                        className="mt-3 text-emerald-400 hover:text-emerald-300 text-xs font-bold w-fit flex items-center px-3 py-1.5 bg-transparent rounded shadow-[0_0_10px_rgba(0,0,0,0.3)] hover:shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-shadow"
                      >
                        {summaryExpanded ? "Ẩn bớt" : "Xem thêm"}
                        <svg className={`w-2 h-2 ml-1.5 transition-transform duration-300 ${summaryExpanded ? 'rotate-180' : ''}`} viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M1 2L9 2L5 8L1 2Z" fill="#ef4444" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Price Box */}
            <div className="price-box">
              <p className="text-xs font-bold text-red-200 mb-1">Giá khuyến mãi:</p>
              <div className="flex items-end gap-3 flex-wrap">
                <span className="text-3xl font-black text-white leading-none">
                  {priceStr}<sup className="text-[18px] font-bold underline decoration-[1px] underline-offset-[3px] ml-1.5 relative -top-[0.4em]">đ</sup>
                </span>
                {productData.marketPrice > productData.price && (
                  <>
                    <span className="text-sm line-through text-gray-400 mb-0.5">
                      {marketPriceStr}<sup className="text-[9px] font-bold underline decoration-[1px] underline-offset-[2px] ml-0.5 relative -top-[0.3em]">đ</sup>
                    </span>
                    <span className="text-sm text-yellow-500 font-bold mb-0.5">
                      Tiết kiệm {savingsStr}<sup className="text-[9px] font-bold underline decoration-[1px] underline-offset-[2px] ml-0.5 relative -top-[0.3em]">đ</sup>
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Tags */}
            <div className="flex gap-3 flex-wrap">
              <span className="bg-[#111115] border border-emerald-800 text-emerald-400 text-[11px] font-bold px-4 py-1.5 rounded-full">Giá đã bao gồm VAT</span>
              <span className="bg-[#111115] border border-cyan-800 text-cyan-400 text-[11px] font-bold px-4 py-1.5 rounded-full">Bảo hành: {productData.warranty}</span>
            </div>

            {/* Stores */}
            <div>
              <p className="text-xs text-gray-500 font-semibold mb-3">Có 2 cửa hàng sẵn sản phẩm</p>
              <div className="store-row"><span className="text-emerald-400 text-sm">📞</span><span className="text-emerald-400 text-xs font-bold">02432001088</span><span className="text-gray-600 text-xs">•</span><span className="text-cyan-400 text-xs">📍 35 Cao Lỗ - Đông Anh - Hà Nội</span></div>
              <div className="store-row"><span className="text-emerald-400 text-sm">📞</span><span className="text-emerald-400 text-xs font-bold">19001903 [25435]</span><span className="text-gray-600 text-xs">•</span><span className="text-cyan-400 text-xs">📍 34 Trần Não - An Khánh - TP. Hồ Chí Minh</span></div>
            </div>

            {/* Quantity + Add to cart */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full">
              <div className="flex items-center gap-1 text-sm shrink-0">
                <span className="text-gray-400 font-semibold mr-2">Số lượng:</span>

                <button className="w-9 h-9 rounded-lg bg-[#111115] border border-[#27272a] text-gray-400 hover:text-white hover:border-[#3f3f46] transition font-bold" onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
                <input type="number" id="qtyInput" value={qty} onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))} min="1" className="w-12 h-9 text-center bg-[#111115] border border-[#27272a] rounded-lg text-white text-sm font-bold focus:outline-none focus:border-emerald-500" />
                <button className="w-9 h-9 rounded-lg bg-[#111115] border border-[#27272a] text-gray-400 hover:text-white hover:border-[#3f3f46] transition font-bold" onClick={() => setQty(qty + 1)}>+</button>

              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
                <button className="flex-1 px-6 py-2.5 rounded-xl bg-[#111115] border border-[#27272a] text-gray-300 text-sm font-semibold hover:border-emerald-500 hover:text-emerald-400 transition whitespace-nowrap">Thêm vào giỏ hàng</button>
                <button className="w-10 h-10 shrink-0 rounded-xl bg-[#111115] border border-[#27272a] text-red-400 hover:bg-red-500/10 hover:border-red-500 transition flex items-center justify-center text-lg">♥</button>
              </div>
            </div>

            {/* Buy Online */}
            <button className="w-full py-4 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-black text-base tracking-wide transition-all shadow-lg shadow-red-500/20">
              MUA ONLINE<br /><span className="text-[11px] font-medium opacity-80">Giao nhanh tận nơi, miễn phí toàn quốc</span>
            </button>

            {/* Installment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button className="py-3 rounded-xl bg-[#111115] border border-emerald-800 text-emerald-400 text-[11px] font-bold hover:bg-emerald-900/20 transition text-center leading-tight">TRẢ GÓP HỒ SƠ DUYỆT ONLINE<br /><span className="font-normal text-gray-500">Chỉ từ 1.299.833đ/6 tháng</span></button>
              <button className="py-3 rounded-xl bg-[#111115] border border-cyan-800 text-cyan-400 text-[11px] font-bold hover:bg-cyan-900/20 transition text-center leading-tight">TRẢ GÓP QUA THẺ VISA<br /><span className="font-normal text-gray-500">Chỉ từ 649.916đ/12 tháng</span></button>
            </div>

            {/* Promotions (Expandable) */}
            <div className={`promo-section ${openPromos.includes("promo1") ? "open" : ""}`} id="promo1">
              <div className="promo-header bg-gradient-to-r from-red-900/40 to-red-800/20 text-red-400 cursor-pointer" onClick={() => togglePromo('promo1')}>
                <span>🎁</span><span>KHUYẾN MẠI VÀ QUÀ TẶNG</span>
                <div className="promo-toggle">{openPromos.includes("promo1") ? "▲" : "▼"}</div>
              </div>
              <div className="promo-body">
                <div className="p-5 space-y-4">
                  <div className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0">1</span>
                    <div>
                      <p className="text-xs font-bold text-orange-400 leading-relaxed">NHẬN QUÀ TẶNG ARI BLIND BOX & VOUCHER LÊN ĐẾN 500.000 VNĐ KHI BUILD PC AMD CÙNG GIGABYTE</p>
                      <ul className="mt-2 space-y-2 text-[12px] text-gray-400 list-disc pl-4">
                        <li>Build PC gồm CPU AMD Ryzen AM5 + Mainboard GIGABYTE + VGA Radeon™ RX 6500 XT EAGLE 4G: Nhận Voucher trị giá 500.000 VNĐ. (<a href="#" className="text-cyan-400 hover:underline">Xem chi tiết tại đây</a>)</li>
                        <li>Build PC gồm Mainboard GIGABYTE AMD AM5 + CPU AMD Ryzen AM5: Nhận ngay 01 mô hình ARI Blind Box.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={`promo-section ${openPromos.includes("promo2") ? "open" : ""}`} id="promo2">
              <div className="promo-header bg-gradient-to-r from-orange-900/30 to-orange-800/10 text-orange-400 cursor-pointer" onClick={() => togglePromo('promo2')}>
                <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0">2</span>
                <span>CẢM XÚC WORLD CUP</span>
                <div className="promo-toggle">{openPromos.includes("promo2") ? "▲" : "▼"}</div>
              </div>
              <div className="promo-body">
                <div className="p-5">
                  <ul className="space-y-2 text-[12px] text-gray-400 list-disc pl-4">
                    <li>Từ nay đến <span className="text-white font-bold">19/07/2026</span>, khi mua sản phẩm bất kỳ tại HACOM, Quý khách hàng có cơ hội nhận được <span className="text-white font-bold">Bộ PC VGA 5060</span> siêu xịn !</li>
                    <li><a href="#" className="text-cyan-400 hover:underline">(Chi tiết chương trình xem tại đây)</a> ⭐</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Bottom CTA */}
            <button className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-600 text-white text-[11px] font-black tracking-wide hover:from-emerald-600 hover:to-emerald-500 transition-all flex items-center justify-center gap-2">
              📞 CAM KẾT GIÁ CẠNH TRANH NHẤT, GỌI 19001903 HOẶC ĐẾN TẠI CỬA HÀNG
            </button>

          </div>
        </div>
      </div>



      {/* ==================== Content from ss28.html ==================== */}


      <section className="max-w-[1800px] mx-auto px-4 md:px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-6 items-stretch">

          {/* LEFT COLUMN: Bài viết mô tả (3/5) */}
          <div className="lg:w-3/5" id="cot-motasanpham">
            <div id="descCol" className={`card-box p-6 col-collapsed h-full ${descExpanded ? "expanded" : ""}`} style={{ maxHeight: descExpanded ? "none" : "66vh" }}>

              <h2 className="text-lg font-bold text-white mb-6 border-b border-[#1a1a1e] pb-4">Đánh giá: {productData.name}</h2>

              {/* Article content */}
              <div className="space-y-6 text-[14px] text-gray-300 leading-relaxed product-description-content" dangerouslySetInnerHTML={{ __html: productData.description }}>
              </div>

              {/* Fade overlay + expand button */}
              <div className="fade-overlay">
                <button className="px-6 py-2.5 bg-[#1a1a1e]/90 backdrop-blur-md border border-[#27272a] text-white text-sm font-medium rounded-lg hover:bg-[#27272a] transition flex items-center gap-2" onClick={() => setDescExpanded(true)}>
                  Xem thêm
                  <svg id="descArrow" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                </button>
              </div>
            </div>

            {/* Expand button when already expanded (shown below content) */}
            <div id="descCollapseBtn" className={`${descExpanded ? "flex" : "hidden"} mt-4 justify-center`}>
              <button className="px-6 py-2.5 bg-[#1a1a1e]/90 backdrop-blur-md border border-[#27272a] text-white text-sm font-medium rounded-lg hover:bg-[#27272a] transition flex items-center gap-2" onClick={() => setDescExpanded(false)}>
                Thu gọn
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Thông số kỹ thuật (2/5) */}
          <div className="lg:w-2/5" id="cot-thongsokythuat">
            <div className={`lg:sticky lg:top-6 ${descExpanded ? "" : "h-full"}`}>
              <div id="specCol" className="card-box col-collapsed relative" style={{ height: descExpanded ? "auto" : "100%", maxHeight: "66vh" }}>

                <div className="p-5 border-b border-[#1a1a1e]">
                  <h3 className="font-bold text-[15px] text-white">Thông số kỹ thuật</h3>
                </div>

                <div className="px-2 product-spec-list" dangerouslySetInnerHTML={{ __html: productData.specs }}>
                </div>

                {/* Fade overlay + expand button */}
                <div className="fade-overlay">
                  <button className="px-6 py-2.5 bg-red-600/90 backdrop-blur-md text-white text-sm font-bold rounded-lg hover:bg-red-500 transition flex items-center gap-2" onClick={() => setSpecModalOpen(true)}>
                    Xem thêm cấu hình chi tiết
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </button>
                </div>

              </div>
            </div>
          </div>

        </div>
      </section>

      {/* MODAL: Thông số kỹ thuật chi tiết (ss30 style) */}
      <div id="specModal" className={`modal-backdrop ${specModalOpen ? "active" : ""}`} onClick={() => setSpecModalOpen(false)}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>

          {/* Modal Header */}
          <div className="flex items-center justify-between p-5 border-b border-[#1a1a1e] sticky top-0 bg-[#111115] z-10 rounded-t-2xl">
            <h3 className="font-bold text-base text-white">Thông số kỹ thuật</h3>
            <button className="w-8 h-8 rounded-full bg-[#1a1a1e] hover:bg-red-500/20 hover:text-red-500 text-gray-400 flex items-center justify-center transition" onClick={() => setSpecModalOpen(false)}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Product Title */}
          <div className="flex items-center gap-3 p-5 border-b border-[#1a1a1e]">
            <div className="w-12 h-12 bg-[#0d0d10] border border-[#1a1a1e] rounded-lg flex items-center justify-center shrink-0">
              <span className="text-xl opacity-30">🖥️</span>
            </div>
            <p className="text-sm font-medium text-white">{productData.name}</p>
          </div>

          {/* Section Title */}
          <div className="px-5 pt-5 pb-3">
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Thông số chung</h4>
          </div>

          {/* Full Spec Table */}
          <div className="px-3 pb-5">
            <div className="product-spec-list" dangerouslySetInnerHTML={{ __html: productData.specs }}>
            </div>
          </div>

        </div>
      </div>




      {/* ==================== Content from ss24.html ==================== */}


      <section className="max-w-[1800px] mx-auto px-4 md:px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* LEFT PANEL: 3/5 (60%) */}
          <div className="lg:w-[60%] lg:sticky lg:top-6 lg:self-start flex flex-col gap-6">

            {/* Featured Categories */}
            <div className="card-box">
              <h3 className="font-bold text-lg text-white mb-4">Chuyên mục nổi bật:</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm text-cyan-500">
                <li><a href="#" className="hover:text-cyan-400 transition">Hệ thống chuỗi Cửa hàng - Showroom của HACOM</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition">Bản tin công nghệ hàng ngày</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition">Chuyên mục HACOM Give Away Quà Giá Trị</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition">List sản phẩm Flash Sale HACOM</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition">Build PC nhận chiết khấu "khủng"</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition">HACOM Xả Kho - Thanh Lý</a></li>
                <li><a href="#" className="hover:text-cyan-400 transition">Hàng Hiệu đã qua sử dụng</a></li>
              </ul>
            </div>

            {/* Reviews and Ratings */}
            <div className="card-box">
              <h3 className="font-bold text-lg text-white mb-6">Nhận xét và Đánh giá</h3>
              <div className="flex flex-col md:flex-row gap-8 items-center md:items-start border-b border-[#1a1a1e] pb-6 mb-6">

                {/* Rating Summary */}
                <div className="text-center w-full md:w-[30%] shrink-0">
                  <div className="text-4xl font-black text-red-500 mb-1">0/5</div>
                  <div className="text-xs text-gray-500 mb-2">0 lượt đánh giá</div>
                  <div className="text-gray-600 text-lg mb-3">☆☆☆☆☆</div>
                  <button className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold py-2 rounded-md transition">Gửi đánh giá</button>
                </div>

                {/* Rating Bars */}
                <div className="flex-1 w-full space-y-2 flex flex-col justify-center mt-2">
                  {/* 5 Star */}
                  <div className="flex items-center gap-3 text-[13px] text-gray-400">
                    <span className="w-3 text-right">5</span> <span className="text-gray-600">★</span>
                    <div className="flex-1 h-3 bg-[#1a1a1e] rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500 w-0"></div>
                    </div>
                    <span className="w-20 text-blue-500 text-right">0 đánh giá</span>
                  </div>
                  {/* 4 Star */}
                  <div className="flex items-center gap-3 text-[13px] text-gray-400">
                    <span className="w-3 text-right">4</span> <span className="text-gray-600">★</span>
                    <div className="flex-1 h-3 bg-[#1a1a1e] rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500 w-0"></div>
                    </div>
                    <span className="w-20 text-blue-500 text-right">0 đánh giá</span>
                  </div>
                  {/* 3 Star */}
                  <div className="flex items-center gap-3 text-[13px] text-gray-400">
                    <span className="w-3 text-right">3</span> <span className="text-gray-600">★</span>
                    <div className="flex-1 h-3 bg-[#1a1a1e] rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500 w-0"></div>
                    </div>
                    <span className="w-20 text-blue-500 text-right">0 đánh giá</span>
                  </div>
                  {/* 2 Star */}
                  <div className="flex items-center gap-3 text-[13px] text-gray-400">
                    <span className="w-3 text-right">2</span> <span className="text-gray-600">★</span>
                    <div className="flex-1 h-3 bg-[#1a1a1e] rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500 w-0"></div>
                    </div>
                    <span className="w-20 text-blue-500 text-right">0 đánh giá</span>
                  </div>
                  {/* 1 Star */}
                  <div className="flex items-center gap-3 text-[13px] text-gray-400">
                    <span className="w-3 text-right">1</span> <span className="text-gray-600">★</span>
                    <div className="flex-1 h-3 bg-[#1a1a1e] rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500 w-0"></div>
                    </div>
                    <span className="w-20 text-blue-500 text-right">0 đánh giá</span>
                  </div>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap gap-3">
                <button className="px-5 py-1.5 border border-red-500 text-red-500 rounded-md text-sm font-semibold hover:bg-red-500/10 transition">Tất cả</button>
                <button className="px-4 py-1.5 border border-[#27272a] text-gray-400 rounded-md text-sm font-semibold hover:border-gray-500 hover:text-white transition flex items-center gap-1">5 <span className="text-yellow-500">★</span></button>
                <button className="px-4 py-1.5 border border-[#27272a] text-gray-400 rounded-md text-sm font-semibold hover:border-gray-500 hover:text-white transition flex items-center gap-1">4 <span className="text-yellow-500">★</span></button>
                <button className="px-4 py-1.5 border border-[#27272a] text-gray-400 rounded-md text-sm font-semibold hover:border-gray-500 hover:text-white transition flex items-center gap-1">3 <span className="text-yellow-500">★</span></button>
                <button className="px-4 py-1.5 border border-[#27272a] text-gray-400 rounded-md text-sm font-semibold hover:border-gray-500 hover:text-white transition flex items-center gap-1">2 <span className="text-yellow-500">★</span></button>
                <button className="px-4 py-1.5 border border-[#27272a] text-gray-400 rounded-md text-sm font-semibold hover:border-gray-500 hover:text-white transition flex items-center gap-1">1 <span className="text-yellow-500">★</span></button>
              </div>
            </div>

            {/* Comments */}
            <div className="card-box">
              <h3 className="font-bold text-lg text-white mb-4">Bình luận sản phẩm</h3>
              <textarea className="w-full bg-[#0d0d10] border border-[#27272a] rounded-lg p-4 text-sm text-gray-300 focus:outline-none focus:border-blue-500 transition min-h-[120px] mb-4 resize-y" placeholder="Chia sẻ câu hỏi hoặc nhận xét của bạn về sản phẩm"></textarea>
              <div className="flex justify-between items-center">
                <button className="text-blue-500 text-sm font-medium hover:underline flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/0000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  Đính kèm ảnh
                </button>
                <button className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-6 py-2.5 rounded-md transition">Gửi bình luận</button>
              </div>
            </div>

          </div>

          {/* RIGHT PANEL: 2/5 (40%) */}
          <div className="lg:w-[40%]">
            <div className="card-box">
              <h3 className="font-bold text-xl text-white mb-6 border-b border-[#1a1a1e] pb-4">Bài viết liên quan</h3>

              <div className="space-y-8">

                {/* Article 1 */}
                <div className="flex flex-col gap-4 group">
                  <div className="aspect-[16/9] bg-gradient-to-br from-[#1a1a2e] to-[#0f0f11] border border-[#1a1a1e] rounded-lg overflow-hidden flex items-center justify-center relative">
                    <span className="text-4xl opacity-50 font-black tracking-widest text-white">PROMO</span>
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition duration-300"></div>
                  </div>
                  <div>
                    <h4 className="font-bold text-[15px] text-white leading-snug group-hover:text-blue-400 transition cursor-pointer mb-2">Chương trình Khuyến mãi "MUA COMBO B550/X570 + SSD GIGABYTE / AORUS - TẶNG PIN DỰ PHÒNG ANKER"</h4>
                    <p className="text-[13px] text-gray-500 leading-relaxed line-clamp-3">Từ 01/09/2020 đến 30/09/2020, khi mua combo Bo mạch chủ B550/X570 + SSD GIGABYTE / AORUS tại HANOICOMPUTER người dùng sẽ nhận được pin dự phòng Anker.</p>
                  </div>
                </div>

                {/* Article 2 */}
                <div className="flex flex-col gap-4 group">
                  <div className="aspect-[16/9] bg-gradient-to-br from-[#2e1a2e] to-[#0f0f11] border border-[#1a1a1e] rounded-lg overflow-hidden flex items-center justify-center relative">
                    <span className="text-4xl opacity-50 font-black tracking-widest text-white">GAME</span>
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition duration-300"></div>
                  </div>
                  <div>
                    <h4 className="font-bold text-[15px] text-white leading-snug group-hover:text-blue-400 transition cursor-pointer mb-2">Miễn phí nhận Outriders khi mua Bo Mạch chủ hoặc màn hình GIGABYTE/ AORUS</h4>
                    <p className="text-[13px] text-gray-500 leading-relaxed line-clamp-3">Chương trình khuyến mại đặc biệt dành cho game thủ nhận miễn phí game bom tấn Outriders ngay hôm nay.</p>
                  </div>
                </div>

                {/* Article 3 */}
                <div className="flex flex-col gap-4 group">
                  <div className="aspect-[16/9] bg-gradient-to-br from-[#1a2e1a] to-[#0f0f11] border border-[#1a1a1e] rounded-lg overflow-hidden flex items-center justify-center relative">
                    <span className="text-4xl opacity-50 font-black tracking-widest text-white">GPU BOX</span>
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition duration-300"></div>
                  </div>
                  <div>
                    <h4 className="font-bold text-[15px] text-white leading-snug group-hover:text-blue-400 transition cursor-pointer mb-2">Gigabyte ra mắt AORUS RTX 3080 Ti GAMING BOX</h4>
                    <p className="text-[13px] text-gray-500 leading-relaxed line-clamp-3">Giờ đây bạn có thể dễ dàng nâng cấp card đồ họa RTX 3080Ti cho laptop của mình !</p>
                  </div>
                </div>

                {/* Article 4 */}
                <div className="flex flex-col gap-4 group">
                  <div className="aspect-[16/9] bg-gradient-to-br from-[#2e2e1a] to-[#0f0f11] border border-[#1a1a1e] rounded-lg overflow-hidden flex items-center justify-center relative">
                    <span className="text-4xl opacity-50 font-black tracking-widest text-white">LAPTOP</span>
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition duration-300"></div>
                  </div>
                  <div>
                    <h4 className="font-bold text-[15px] text-white leading-snug group-hover:text-blue-400 transition cursor-pointer mb-2">Đánh giá chi tiết laptop Gigabyte Aorus 15P</h4>
                    <p className="text-[13px] text-gray-500 leading-relaxed line-clamp-3">Chiếc laptop gaming mang sức mạnh cực đỉnh từ Gigabyte.</p>
                  </div>
                </div>

                {/* Article 5 */}
                <div className="flex flex-col gap-4 group">
                  <div className="aspect-[16/9] bg-gradient-to-br from-[#2e1a1a] to-[#0f0f11] border border-[#1a1a1e] rounded-lg overflow-hidden flex items-center justify-center relative">
                    <span className="text-4xl opacity-50 font-black tracking-widest text-white">MB X670E</span>
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition duration-300"></div>
                  </div>
                  <div>
                    <h4 className="font-bold text-[15px] text-white leading-snug group-hover:text-blue-400 transition cursor-pointer mb-2">Lộ diện Mainboard GIGABYTE X670E Aorus Master</h4>
                    <p className="text-[13px] text-gray-500 leading-relaxed line-clamp-3">Mẫu bo mạch chủ cao cấp X670E AORUS MASTER dành cho CPU Ryzen 7000 Series đã chính thức đến tay một người dùng đặc biệt.</p>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </div>
      </section>


      {/* ==================== Content from ss18.html ==================== */}


      <Footer />




    </>
  );
}
