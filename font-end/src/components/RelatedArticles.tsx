"use client";
import React from 'react';

export default function RelatedArticles() {
  return (
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
            <p className="text-[15px] text-gray-500 leading-relaxed line-clamp-3">Từ 01/09/2020 đến 30/09/2020, khi mua combo Bo mạch chủ B550/X570 + SSD GIGABYTE / AORUS tại HANOICOMPUTER người dùng sẽ nhận được pin dự phòng Anker.</p>
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
            <p className="text-[15px] text-gray-500 leading-relaxed line-clamp-3">Chương trình khuyến mại đặc biệt dành cho game thủ nhận miễn phí game bom tấn Outriders ngay hôm nay.</p>
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
            <p className="text-[15px] text-gray-500 leading-relaxed line-clamp-3">Giờ đây bạn có thể dễ dàng nâng cấp card đồ họa RTX 3080Ti cho laptop của mình !</p>
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
            <p className="text-[15px] text-gray-500 leading-relaxed line-clamp-3">Chiếc laptop gaming mang sức mạnh cực đỉnh từ Gigabyte.</p>
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
            <p className="text-[15px] text-gray-500 leading-relaxed line-clamp-3">Mẫu bo mạch chủ cao cấp X670E AORUS MASTER dành cho CPU Ryzen 7000 Series đã chính thức đến tay một người dùng đặc biệt.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
