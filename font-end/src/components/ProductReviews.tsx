import React from 'react';

export default function ProductReviews() {
  return (
    <div className="card-box scroll-mt-24" id="sec-reviews">
        <h3 className="font-bold text-lg text-white mb-6">Nhận xét và Đánh giá</h3>
        <div className="flex flex-col md:flex-row gap-8 items-center md:items-start border-b border-[#1a1a1e] pb-6 mb-6">

          {/* Rating Summary */}
          <div className="text-center w-full md:w-[30%] shrink-0">
            <div className="text-4xl font-black text-red-500 mb-1">0/5</div>
            <div className="text-sm text-gray-500 mb-2">0 lượt đánh giá</div>
            <div className="text-gray-600 text-lg mb-3">☆☆☆☆☆</div>
            <button className="w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold py-2 rounded-md transition">Gửi đánh giá</button>
          </div>

          {/* Rating Bars */}
          <div className="flex-1 w-full space-y-2 flex flex-col justify-center mt-2">
            {/* 5 Star */}
            <div className="flex items-center gap-3 text-[15px] text-gray-400">
              <span className="w-3 text-right">5</span> <span className="text-gray-600">★</span>
              <div className="flex-1 h-3 bg-[#1a1a1e] rounded-full overflow-hidden">
                <div className="h-full bg-yellow-500 w-0"></div>
              </div>
              <span className="w-20 text-blue-500 text-right">0 đánh giá</span>
            </div>
            {/* 4 Star */}
            <div className="flex items-center gap-3 text-[15px] text-gray-400">
              <span className="w-3 text-right">4</span> <span className="text-gray-600">★</span>
              <div className="flex-1 h-3 bg-[#1a1a1e] rounded-full overflow-hidden">
                <div className="h-full bg-yellow-500 w-0"></div>
              </div>
              <span className="w-20 text-blue-500 text-right">0 đánh giá</span>
            </div>
            {/* 3 Star */}
            <div className="flex items-center gap-3 text-[15px] text-gray-400">
              <span className="w-3 text-right">3</span> <span className="text-gray-600">★</span>
              <div className="flex-1 h-3 bg-[#1a1a1e] rounded-full overflow-hidden">
                <div className="h-full bg-yellow-500 w-0"></div>
              </div>
              <span className="w-20 text-blue-500 text-right">0 đánh giá</span>
            </div>
            {/* 2 Star */}
            <div className="flex items-center gap-3 text-[15px] text-gray-400">
              <span className="w-3 text-right">2</span> <span className="text-gray-600">★</span>
              <div className="flex-1 h-3 bg-[#1a1a1e] rounded-full overflow-hidden">
                <div className="h-full bg-yellow-500 w-0"></div>
              </div>
              <span className="w-20 text-blue-500 text-right">0 đánh giá</span>
            </div>
            {/* 1 Star */}
            <div className="flex items-center gap-3 text-[15px] text-gray-400">
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
  );
}
