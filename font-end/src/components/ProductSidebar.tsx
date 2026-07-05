"use client";
import React, { useState } from 'react';

interface ProductSidebarProps {
  productData: any;
}

export default function ProductSidebar({ productData }: ProductSidebarProps) {
  const [qty, setQty] = useState(1);
  const [openPromos, setOpenPromos] = useState<string[]>(['promo1', 'promo2']);
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  const togglePromo = (id: string) => {
    setOpenPromos(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  const formatNum = (num: number) => new Intl.NumberFormat('vi-VN').format(num);
  const priceStr = formatNum(productData.price || 0);
  const marketPriceStr = formatNum(productData.marketPrice || 0);
  const savingsStr = formatNum(productData.savings || 0);

  return (
    <div className="w-full lg:w-[40%] space-y-5">
      <div className="hidden lg:block space-y-5">
        {/* Title */}
        <h1 className="text-xl md:text-2xl font-extrabold leading-tight">{productData.name}</h1>
        <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
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
            <div className="space-y-2.5 text-[15px] text-gray-200 product-spec-list">
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
                  className="mt-3 text-emerald-400 hover:text-emerald-300 text-sm font-bold w-fit flex items-center px-3 py-1.5 bg-transparent rounded shadow-[0_0_10px_rgba(0,0,0,0.3)] hover:shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-shadow"
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
        <p className="text-sm font-bold text-red-200 mb-1">Giá khuyến mãi:</p>
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
        <span className="bg-[#111115] border border-emerald-800 text-emerald-400 text-[14px] font-bold px-4 py-1.5 rounded-full">Giá đã bao gồm VAT</span>
        <span className="bg-[#111115] border border-cyan-800 text-cyan-400 text-[14px] font-bold px-4 py-1.5 rounded-full">Bảo hành: {productData.warranty}</span>
      </div>

      {/* Stores */}
      <div>
        <p className="text-sm text-gray-500 font-semibold mb-3">Có 2 cửa hàng sẵn sản phẩm</p>
        <div className="store-row"><span className="text-emerald-400 text-sm">📞</span><span className="text-emerald-400 text-sm font-bold">02432001088</span><span className="text-gray-600 text-sm">•</span><span className="text-cyan-400 text-sm">📍 35 Cao Lỗ - Đông Anh - Hà Nội</span></div>
        <div className="store-row"><span className="text-emerald-400 text-sm">📞</span><span className="text-emerald-400 text-sm font-bold">19001903 [25435]</span><span className="text-gray-600 text-sm">•</span><span className="text-cyan-400 text-sm">📍 34 Trần Não - An Khánh - TP. Hồ Chí Minh</span></div>
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
        MUA ONLINE<br /><span className="text-[14px] font-medium opacity-80">Giao nhanh tận nơi, miễn phí toàn quốc</span>
      </button>

      {/* Installment */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button className="py-3 rounded-xl bg-[#111115] border border-emerald-800 text-emerald-400 text-[14px] font-bold hover:bg-emerald-900/20 transition text-center leading-tight">TRẢ GÓP HỒ SƠ DUYỆT ONLINE<br /><span className="font-normal text-gray-500">Chỉ từ 1.299.833đ/6 tháng</span></button>
        <button className="py-3 rounded-xl bg-[#111115] border border-cyan-800 text-cyan-400 text-[14px] font-bold hover:bg-cyan-900/20 transition text-center leading-tight">TRẢ GÓP QUA THẺ VISA<br /><span className="font-normal text-gray-500">Chỉ từ 649.916đ/12 tháng</span></button>
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
              <span className="w-6 h-6 rounded-full bg-red-500 text-white text-[14px] font-bold flex items-center justify-center shrink-0">1</span>
              <div>
                <p className="text-sm font-bold text-orange-400 leading-relaxed">NHẬN QUÀ TẶNG ARI BLIND BOX & VOUCHER LÊN ĐẾN 500.000 VNĐ KHI BUILD PC AMD CÙNG GIGABYTE</p>
                <ul className="mt-2 space-y-2 text-[14px] text-gray-400 list-disc pl-4">
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
          <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-[14px] font-bold flex items-center justify-center shrink-0">2</span>
          <span>CẢM XÚC WORLD CUP</span>
          <div className="promo-toggle">{openPromos.includes("promo2") ? "▲" : "▼"}</div>
        </div>
        <div className="promo-body">
          <div className="p-5">
            <ul className="space-y-2 text-[14px] text-gray-400 list-disc pl-4">
              <li>Từ nay đến <span className="text-white font-bold">19/07/2026</span>, khi mua sản phẩm bất kỳ tại HACOM, Quý khách hàng có cơ hội nhận được <span className="text-white font-bold">Bộ PC VGA 5060</span> siêu xịn !</li>
              <li><a href="#" className="text-cyan-400 hover:underline">(Chi tiết chương trình xem tại đây)</a> ⭐</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom CTA */}
      <button className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-700 to-emerald-600 text-white text-[14px] font-black tracking-wide hover:from-emerald-600 hover:to-emerald-500 transition-all flex items-center justify-center gap-2">
        📞 CAM KẾT GIÁ CẠNH TRANH NHẤT, GỌI 19001903 HOẶC ĐẾN TẠI CỬA HÀNG
      </button>

    </div>
  );
}
