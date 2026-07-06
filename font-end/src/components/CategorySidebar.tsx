import React from 'react';

const CategorySidebar = () => {
  return (
    <div className="lg:w-[30%] space-y-8">
      
      {/* Category Banner */}
      <div className="text-center bg-[#15151a] border border-[#2a2a32] shadow-[0_4px_20px_rgba(0,0,0,0.3)] rounded-[20px] p-8 mb-8">
        <h3 className="text-3xl font-black text-red-500 uppercase tracking-wide">nổi bật</h3>
        <p className="text-sm text-gray-500 italic mb-8">Tổng hợp các chuyên mục hot</p>
        
        <div className="grid grid-cols-3 gap-y-8 gap-x-4">
          <div className="text-center cursor-pointer group">
            <div className="w-[60px] h-[60px] bg-[#0a0a0c] rounded-full flex items-center justify-center mx-auto mb-3 border border-[#2a2a32] text-[24px] transition-colors duration-200 group-hover:border-blue-500 text-blue-400">💻</div>
            <p className="text-[12px] font-semibold text-gray-300">MacBook Neo</p>
          </div>
          <div className="text-center cursor-pointer group">
            <div className="w-[60px] h-[60px] bg-[#0a0a0c] rounded-full flex items-center justify-center mx-auto mb-3 border border-[#2a2a32] text-[24px] transition-colors duration-200 group-hover:border-purple-500 text-purple-400">🧠</div>
            <p className="text-[12px] font-semibold text-gray-300">Xu hướng AI</p>
          </div>
          <div className="text-center cursor-pointer group">
            <div className="w-[60px] h-[60px] bg-[#0a0a0c] rounded-full flex items-center justify-center mx-auto mb-3 border border-[#2a2a32] text-[24px] transition-colors duration-200 group-hover:border-yellow-500 text-yellow-400">⭐</div>
            <p className="text-[12px] font-semibold text-gray-300">Đánh giá</p>
          </div>
          <div className="text-center cursor-pointer group">
            <div className="w-[60px] h-[60px] bg-[#0a0a0c] rounded-full flex items-center justify-center mx-auto mb-3 border border-[#2a2a32] text-[24px] transition-colors duration-200 group-hover:border-gray-500 text-gray-400">🔧</div>
            <p className="text-[12px] font-semibold text-gray-300">Build PC</p>
          </div>
          <div className="text-center cursor-pointer group">
            <div className="w-[60px] h-[60px] bg-[#0a0a0c] rounded-full flex items-center justify-center mx-auto mb-3 border border-[#2a2a32] text-[24px] transition-colors duration-200 group-hover:border-green-500 text-green-400">🎮</div>
            <p className="text-[12px] font-semibold text-gray-300">GAME</p>
          </div>
          <div className="text-center cursor-pointer group">
            <div className="w-[60px] h-[60px] bg-[#0a0a0c] rounded-full flex items-center justify-center mx-auto mb-3 border border-[#2a2a32] text-[24px] transition-colors duration-200 group-hover:border-cyan-500 text-cyan-400">🖼️</div>
            <p className="text-[12px] font-semibold text-gray-300">Hình nền</p>
          </div>
        </div>
      </div>

      {/* Đọc nhiều nhất (Sidebar Widget) */}
      <div className="bg-[#15151a] border border-[#2a2a32] shadow-[0_4px_20px_rgba(0,0,0,0.3)] rounded-[20px] overflow-hidden">
        <div className="p-6 border-b border-[#2a2a32] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-5 bg-red-500 rounded-full"></div>
            <h4 className="font-bold text-[16px] text-white uppercase tracking-wide">Đọc nhiều nhất</h4>
          </div>
          <span className="text-red-500 text-xs font-bold animate-pulse">🔥 HOT</span>
        </div>
        <div className="p-6 space-y-6">
          <div className="flex gap-[16px] cursor-pointer group border-b border-[#2a2a32] pb-6 last:border-b-0 last:pb-0">
            <div className="w-[30px] font-black text-3xl text-red-900 group-hover:text-red-500 transition">01</div>
            <div className="flex-1">
              <p className="text-[14px] font-bold text-white line-clamp-2 leading-snug group-hover:text-blue-400 transition">ChatGPT Pro 200 USD giúp người dùng "săn" MacBook rẻ hơn</p>
              <p className="text-[12px] text-gray-500 mt-2">23k lượt xem</p>
            </div>
          </div>
          <div className="flex gap-[16px] cursor-pointer group border-b border-[#2a2a32] pb-6 last:border-b-0 last:pb-0">
            <div className="w-[30px] font-black text-3xl text-gray-700 group-hover:text-red-500 transition">02</div>
            <div className="flex-1">
              <p className="text-[14px] font-bold text-white line-clamp-2 leading-snug group-hover:text-blue-400 transition">Intel chính thức bị loại khỏi danh sách 10 công ty giá trị nhất</p>
              <p className="text-[12px] text-gray-500 mt-2">18k lượt xem</p>
            </div>
          </div>
          <div className="flex gap-[16px] cursor-pointer group border-b border-[#2a2a32] pb-6 last:border-b-0 last:pb-0">
            <div className="w-[30px] font-black text-3xl text-gray-700 group-hover:text-red-500 transition">03</div>
            <div className="flex-1">
              <p className="text-[14px] font-bold text-white line-clamp-2 leading-snug group-hover:text-blue-400 transition">SpaceX đưa máy chủ AI lên quỹ đạo: Sải cánh 70m, chip NVIDIA</p>
              <p className="text-[12px] text-gray-500 mt-2">15k lượt xem</p>
            </div>
          </div>
          <div className="flex gap-[16px] cursor-pointer group border-b border-[#2a2a32] pb-6 last:border-b-0 last:pb-0">
            <div className="w-[30px] font-black text-3xl text-gray-700 group-hover:text-red-500 transition">04</div>
            <div className="flex-1">
              <p className="text-[14px] font-bold text-white line-clamp-2 leading-snug group-hover:text-blue-400 transition">LG ra mắt thế hệ laptop LG gram AI 2026: Mỏng nhẹ tinh tế</p>
              <p className="text-[12px] text-gray-500 mt-2">12k lượt xem</p>
            </div>
          </div>
        </div>
      </div>

      {/* Banner Promo */}
      <div className="w-full aspect-[1/2] bg-gradient-to-b from-red-600 to-red-900 rounded-xl flex flex-col items-center justify-center text-center p-6 border border-red-500/30">
        <p className="text-yellow-300 font-bold text-lg mb-2">GIÁ TỐI THIỂU</p>
        <p className="text-white font-black text-2xl mb-4 leading-tight">HIỆU NĂNG TỐI ĐA</p>
        <div className="bg-yellow-500 text-black px-4 py-1.5 text-xs font-bold rounded-full mb-8">PC BUILD SẴN PHONG VŨ</div>
        
        <div className="w-full bg-white text-black p-4 rounded-lg mb-4 shadow-lg cursor-pointer hover:scale-105 transition-transform">
          <p className="font-bold text-sm">PC VĂN PHÒNG</p>
          <p className="text-[10px] text-gray-500 font-bold mt-1">VOUCHER ĐẾN</p>
          <p className="text-red-600 font-black text-2xl mt-1">500K</p>
        </div>
        
        <div className="w-full bg-white text-black p-4 rounded-lg shadow-lg cursor-pointer hover:scale-105 transition-transform">
          <p className="font-bold text-sm">PC GAMING</p>
          <p className="text-[10px] text-gray-500 font-bold mt-1">VOUCHER ĐẾN</p>
          <p className="text-red-600 font-black text-2xl mt-1">2 TRIỆU</p>
        </div>
      </div>

    </div>
  );
};

export default CategorySidebar;
