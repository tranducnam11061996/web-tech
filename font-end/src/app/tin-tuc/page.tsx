import Header from "../../components/Header";
import Footer from "../../components/Footer";

export default function TinTucPage() {
  return (
    <>     
        <Header />
<div className="max-w-[1400px] mx-auto px-4 py-8 space-y-12">

  {/* SECTION 1: HERO NEWS */}
  <div className="space-y-4">
    {/* Row 1: 2 items */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="relative overflow-hidden rounded-[12px] cursor-pointer group aspect-[16/9] md:aspect-[2/1]">
        <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: 'linear-gradient(45deg, #1e3a8a, #9333ea)' }}></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.9)_0%,rgba(0,0,0,0.1)_60%,transparent_100%)] flex flex-col justify-end p-[20px]">
          <span className="bg-white/20 backdrop-blur-[4px] px-[8px] py-[2px] rounded-[4px] text-[10px] font-bold uppercase inline-block mb-[8px] w-fit">Tin tức</span>
          <h2 className="text-xl md:text-2xl font-bold text-white mb-2 leading-tight">Facebook bổ sung AI Mode cho tính năng tìm kiếm</h2>
          <p className="text-xs text-gray-300">Ngọc Anh - 17/06/2026</p>
        </div>
      </div>
      <div className="relative overflow-hidden rounded-[12px] cursor-pointer group aspect-[16/9] md:aspect-[2/1]">
        <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: 'linear-gradient(45deg, #7f1d1d, #ea580c)' }}></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.9)_0%,rgba(0,0,0,0.1)_60%,transparent_100%)] flex flex-col justify-end p-[20px]">
          <span className="bg-white/20 backdrop-blur-[4px] px-[8px] py-[2px] rounded-[4px] text-[10px] font-bold uppercase inline-block mb-[8px] w-fit">Tin tức</span>
          <h2 className="text-xl md:text-2xl font-bold text-white mb-2 leading-tight">Robot hình người Pemba chinh phục đỉnh núi lửa Chimborazo</h2>
          <p className="text-xs text-gray-300">Thảo Huỳnh - 10/06/2026</p>
        </div>
      </div>
    </div>
    {/* Row 2: 3 items */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="relative overflow-hidden rounded-[12px] cursor-pointer group aspect-[16/9]">
        <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: 'linear-gradient(45deg, #064e3b, #10b981)' }}></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.9)_0%,rgba(0,0,0,0.1)_60%,transparent_100%)] flex flex-col justify-end p-[20px]">
          <span className="bg-white/20 backdrop-blur-[4px] px-[8px] py-[2px] rounded-[4px] text-[10px] font-bold uppercase inline-block mb-[8px] w-fit">Tin tức</span>
          <h3 className="text-sm md:text-base font-bold text-white mb-1 leading-snug">Việt Nam nổi bật tại WWDC 2026 với nhiều hình ảnh và ngôn ngữ</h3>
        </div>
      </div>
      <div className="relative overflow-hidden rounded-[12px] cursor-pointer group aspect-[16/9]">
        <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: 'linear-gradient(45deg, #4c1d95, #c026d3)' }}></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.9)_0%,rgba(0,0,0,0.1)_60%,transparent_100%)] flex flex-col justify-end p-[20px]">
          <span className="bg-white/20 backdrop-blur-[4px] px-[8px] py-[2px] rounded-[4px] text-[10px] font-bold uppercase inline-block mb-[8px] w-fit">Tin tức</span>
          <h3 className="text-sm md:text-base font-bold text-white mb-1 leading-snug">Radeon RX 9070 GRE mở bán toàn cầu: Cạnh tranh RTX 5070 với mức giá của RTX 5060 Ti</h3>
        </div>
      </div>
      <div className="relative overflow-hidden rounded-[12px] cursor-pointer group aspect-[16/9]">
        <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105" style={{ backgroundImage: 'linear-gradient(45deg, #1e1b4b, #3b82f6)' }}></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.9)_0%,rgba(0,0,0,0.1)_60%,transparent_100%)] flex flex-col justify-end p-[20px]">
          <span className="bg-white/20 backdrop-blur-[4px] px-[8px] py-[2px] rounded-[4px] text-[10px] font-bold uppercase inline-block mb-[8px] w-fit">Tin tức</span>
          <h3 className="text-sm md:text-base font-bold text-white mb-1 leading-snug">HP giới thiệu loạt Laptop và PC AI mới tại COMPUTEX 2026 với nền tảng NVIDIA RTX Spark</h3>
        </div>
      </div>
    </div>
  </div>

  {/* SECTION 2: TIN TỨC & SIDEBAR */}
  <div className="flex flex-col lg:flex-row gap-8">
    {/* Left: News List */}
    <div className="lg:w-[70%]">
      <h3 className="text-[18px] font-extrabold uppercase mb-[20px] flex items-center gap-[8px] text-blue-500">TIN TỨC</h3>
      
      <div className="flex gap-[16px] mb-[20px] pb-[20px] border-b border-[#1a1a1e] last:border-b-0">
        <div className="w-[30%] aspect-video bg-[#111115] rounded-[8px] overflow-hidden shrink-0 relative bg-gradient-to-br from-gray-800 to-gray-900"></div>
        <div className="flex-1">
          <h4 className="text-lg font-bold text-white mb-2 hover:text-blue-400 cursor-pointer">Intel thử nghiệm dây chuyền sản xuất chip 18A-P thế hệ mới</h4>
          <p className="text-xs text-gray-400 mb-2"><span className="font-bold text-gray-300">nthnhung</span> - 3 hours trước</p>
          <p className="text-sm text-gray-500 line-clamp-2">PV Tech News - Intel chính thức bước vào giai đoạn sản xuất thử nghiệm tiến trình 18A-P, công nghệ bán dẫn tiên tiến...</p>
        </div>
      </div>

      <div className="flex gap-[16px] mb-[20px] pb-[20px] border-b border-[#1a1a1e] last:border-b-0">
        <div className="w-[30%] aspect-video bg-[#111115] rounded-[8px] overflow-hidden shrink-0 relative bg-gradient-to-br from-blue-900 to-blue-800"></div>
        <div className="flex-1">
          <h4 className="text-lg font-bold text-white mb-2 hover:text-blue-400 cursor-pointer">Theo Silicon Motion: Thị trường SSD bán lẻ "gần như biến mất" vì khan...</h4>
          <p className="text-xs text-gray-400 mb-2"><span className="font-bold text-gray-300">nthnhung</span> - 23 hours trước</p>
          <p className="text-sm text-gray-500 line-clamp-2">PV Tech News - Phó Chủ tịch Silicon Motion cho biết thị trường SSD bán lẻ gần như biến mất khi nhà sản xuất...</p>
        </div>
      </div>

      <div className="flex gap-[16px] mb-[20px] pb-[20px] border-b border-[#1a1a1e] last:border-b-0">
        <div className="w-[30%] aspect-video bg-[#111115] rounded-[8px] overflow-hidden shrink-0 relative bg-gradient-to-br from-green-900 to-green-800"></div>
        <div className="flex-1">
          <h4 className="text-lg font-bold text-white mb-2 hover:text-blue-400 cursor-pointer">Việt Nam đứng thứ hai trong cuộc đua ứng dụng AI tại Đông Nam...</h4>
          <p className="text-xs text-gray-400 mb-2"><span className="font-bold text-gray-300">nthnhung</span> - 2 days trước</p>
          <p className="text-sm text-gray-500 line-clamp-2">PV Tech News - Báo cáo "Global AI Diffusion" của Microsoft ghi nhận Việt Nam có tỷ lệ ứng dụng AI vào đời sống...</p>
        </div>
      </div>
      
      <div className="flex gap-[16px] mb-[20px] pb-[20px] border-b border-[#1a1a1e] last:border-b-0">
        <div className="w-[30%] aspect-video bg-[#111115] rounded-[8px] overflow-hidden shrink-0 relative bg-gradient-to-br from-red-900 to-red-800"></div>
        <div className="flex-1">
          <h4 className="text-lg font-bold text-white mb-2 hover:text-blue-400 cursor-pointer">Chính phủ Anh cấm trẻ em dưới 16 tuổi dùng mạng xã hội, thắt...</h4>
          <p className="text-xs text-gray-400 mb-2"><span className="font-bold text-gray-300">nthnhung</span> - 2 days trước</p>
          <p className="text-sm text-gray-500 line-clamp-2">PV Tech News - Thủ tướng Anh Keir Starmer ngày 15/6 tuyên bố cấm trẻ dưới 16 tuổi dùng mạng xã hội và siết...</p>
        </div>
      </div>

      <div className="flex gap-[16px] mb-[20px] pb-[20px] border-b border-[#1a1a1e] last:border-b-0">
        <div className="w-[30%] aspect-video bg-[#111115] rounded-[8px] overflow-hidden shrink-0 relative bg-gradient-to-br from-purple-900 to-purple-800"></div>
        <div className="flex-1">
          <h4 className="text-lg font-bold text-white mb-2 hover:text-blue-400 cursor-pointer">Facebook bổ sung AI Mode cho tính năng tìm kiếm</h4>
          <p className="text-xs text-gray-400 mb-2"><span className="font-bold text-gray-300">Ngọc Anh</span> - 2 days trước</p>
          <p className="text-sm text-gray-500 line-clamp-2">PV Tech News - Meta vừa bổ sung AI Mode vào tính năng tìm kiếm trên nền tảng ứng dụng Facebook của mình khiến...</p>
        </div>
      </div>
      
      <div className="flex gap-[16px] mb-[20px] pb-[20px] border-b border-[#1a1a1e] last:border-b-0">
        <div className="w-[30%] aspect-video bg-[#111115] rounded-[8px] overflow-hidden shrink-0 relative bg-gradient-to-br from-cyan-900 to-cyan-800"></div>
        <div className="flex-1">
          <h4 className="text-lg font-bold text-white mb-2 hover:text-blue-400 cursor-pointer">SpaceX đưa máy chủ AI lên quỹ đạo: Sải cánh 70m, chạy chip NVIDIA</h4>
          <p className="text-xs text-gray-400 mb-2"><span className="font-bold text-gray-300">Thảo Huỳnh</span> - 12/06/2026</p>
          <p className="text-sm text-gray-500 line-clamp-2">PV Tech News - SpaceX vừa công bố AI1, vệ tinh đầu tiên trong kế hoạch xây dựng mạng lưới máy chủ AI trên...</p>
        </div>
      </div>

      <div className="flex items-center justify-between mt-6">
        <div className="flex gap-2">
          <button className="w-8 h-8 rounded border border-[#27272a] flex items-center justify-center hover:bg-[#1a1a1e] transition">&lt;</button>
          <button className="w-8 h-8 rounded border border-[#27272a] flex items-center justify-center hover:bg-[#1a1a1e] transition">&gt;</button>
        </div>
        <button className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded transition">XEM THÊM</button>
      </div>

    </div>

    {/* Right: Sidebar */}
    <div className="lg:w-[30%] space-y-8">
      <div className="text-center bg-[#111115] border border-[#1a1a1e] rounded-xl p-6">
        <h3 className="text-2xl font-black text-red-500 uppercase tracking-wide">nổi bật</h3>
        <p className="text-sm text-gray-500 italic mb-6">Tổng hợp các chuyên mục hot</p>
        
        <div className="grid grid-cols-3 gap-y-6 gap-x-2">
          <div className="text-center cursor-pointer group">
            <div className="w-[60px] h-[60px] bg-[#111115] rounded-full flex items-center justify-center mx-auto mb-[8px] border border-[#1a1a1e] text-[24px] transition-colors duration-200 group-hover:border-blue-500 text-blue-400">💻</div>
            <p className="text-xs font-semibold text-gray-300">MacBook Neo</p>
          </div>
          <div className="text-center cursor-pointer group">
            <div className="w-[60px] h-[60px] bg-[#111115] rounded-full flex items-center justify-center mx-auto mb-[8px] border border-[#1a1a1e] text-[24px] transition-colors duration-200 group-hover:border-blue-500 text-purple-400">🧠</div>
            <p className="text-xs font-semibold text-gray-300">Xu hướng AI</p>
          </div>
          <div className="text-center cursor-pointer group">
            <div className="w-[60px] h-[60px] bg-[#111115] rounded-full flex items-center justify-center mx-auto mb-[8px] border border-[#1a1a1e] text-[24px] transition-colors duration-200 group-hover:border-blue-500 text-green-400">⭐</div>
            <p className="text-xs font-semibold text-gray-300">Review - Đánh giá Laptop</p>
          </div>
          <div className="text-center cursor-pointer group">
            <div className="w-[60px] h-[60px] bg-[#111115] rounded-full flex items-center justify-center mx-auto mb-[8px] border border-[#1a1a1e] text-[24px] transition-colors duration-200 group-hover:border-blue-500 text-yellow-400">🔧</div>
            <p className="text-xs font-semibold text-gray-300">Build PC</p>
          </div>
          <div className="text-center cursor-pointer group">
            <div className="w-[60px] h-[60px] bg-[#111115] rounded-full flex items-center justify-center mx-auto mb-[8px] border border-[#1a1a1e] text-[24px] transition-colors duration-200 group-hover:border-blue-500 text-red-400">🎮</div>
            <p className="text-xs font-semibold text-gray-300">GAME</p>
          </div>
          <div className="text-center cursor-pointer group">
            <div className="w-[60px] h-[60px] bg-[#111115] rounded-full flex items-center justify-center mx-auto mb-[8px] border border-[#1a1a1e] text-[24px] transition-colors duration-200 group-hover:border-blue-500 text-cyan-400">🖼️</div>
            <p className="text-xs font-semibold text-gray-300">Hình nền</p>
          </div>
        </div>
      </div>

      {/* Banner */}
      <div className="w-full aspect-[1/2] bg-gradient-to-b from-red-600 to-red-900 rounded-xl flex flex-col items-center justify-center text-center p-6 border border-red-500/30">
        <p className="text-yellow-300 font-bold text-lg mb-2">GIÁ TỐI THIỂU</p>
        <p className="text-white font-black text-2xl mb-4 leading-tight">HIỆU NĂNG TỐI ĐA</p>
        <div className="bg-yellow-500 text-black px-4 py-1.5 text-xs font-bold rounded-full mb-8">PC BUILD SẴN PHONG VŨ</div>
        
        <div className="w-full bg-white text-black p-4 rounded-lg mb-4 shadow-lg">
          <p className="font-bold text-sm">PC VĂN PHÒNG</p>
          <p className="text-[10px] text-gray-500 font-bold mt-1">VOUCHER ĐẾN</p>
          <p className="text-red-600 font-black text-2xl mt-1">500K</p>
        </div>
        
        <div className="w-full bg-white text-black p-4 rounded-lg shadow-lg">
          <p className="font-bold text-sm">PC GAMING</p>
          <p className="text-[10px] text-gray-500 font-bold mt-1">VOUCHER ĐẾN</p>
          <p className="text-red-600 font-black text-2xl mt-1">2 TRIỆU</p>
        </div>
      </div>

    </div>
  </div>

  {/* SECTION 3: YOUTUBE VIDEO */}
  <div>
    <h3 className="text-[18px] font-extrabold uppercase mb-[20px] flex items-center gap-[8px] text-red-500"><span className="text-red-600">▶</span> Phong Vũ Official</h3>
    <div className="flex flex-col lg:flex-row bg-[#0d0d10] border border-[#1a1a1e] rounded-xl overflow-hidden">
      
      {/* Main Video */}
      <div className="lg:w-[65%] bg-black relative">
        <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-gray-800 to-black">
          {/* Play Button Overlay */}
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center text-white text-2xl cursor-pointer hover:bg-red-500 transition shadow-[0_0_20px_rgba(220,38,38,0.5)] pl-1">▶</div>
        </div>
      </div>

      {/* Playlist */}
      <div className="lg:w-[35%] bg-[#111115] flex flex-col">
        <div className="p-4 border-b border-[#1a1a1e]">
          <h4 className="font-bold text-sm text-white">Danh sách phát</h4>
        </div>
        <div className="flex-1 overflow-y-auto max-h-[400px] p-2 space-y-1">
          
          <div className="flex gap-[12px] p-[12px] cursor-pointer rounded-[8px] transition-colors duration-200 hover:bg-[#1a1a1e] bg-[#1a1a1e]">
            <div className="w-[120px] aspect-video bg-black rounded-[6px] relative overflow-hidden bg-gradient-to-r from-blue-900 to-purple-900"><span className="absolute bottom-[4px] right-[4px] bg-black/80 text-[10px] px-[4px] py-[2px] rounded-[4px] text-white">04:28</span></div>
            <div className="flex-1">
              <p className="text-[13px] font-bold text-white line-clamp-2 leading-snug">Tai nghe kẹp tai hot 2026: Sony LinkBuds Clip có gì hay?</p>
            </div>
          </div>
          
          <div className="flex gap-[12px] p-[12px] cursor-pointer rounded-[8px] transition-colors duration-200 hover:bg-[#1a1a1e]">
            <div className="w-[120px] aspect-video bg-black rounded-[6px] relative overflow-hidden bg-gradient-to-r from-green-900 to-blue-900"><span className="absolute bottom-[4px] right-[4px] bg-black/80 text-[10px] px-[4px] py-[2px] rounded-[4px] text-white">10:32</span></div>
            <div className="flex-1">
              <p className="text-[13px] font-medium text-gray-300 line-clamp-2 leading-snug">Trên tay nhanh SONY WF-1000XM6, CHỐNG ỒN đỉnh hơn XM5!?</p>
            </div>
          </div>

          <div className="flex gap-[12px] p-[12px] cursor-pointer rounded-[8px] transition-colors duration-200 hover:bg-[#1a1a1e]">
            <div className="w-[120px] aspect-video bg-black rounded-[6px] relative overflow-hidden bg-gradient-to-r from-purple-900 to-red-900"><span className="absolute bottom-[4px] right-[4px] bg-black/80 text-[10px] px-[4px] py-[2px] rounded-[4px] text-white">04:46</span></div>
            <div className="flex-1">
              <p className="text-[13px] font-medium text-gray-300 line-clamp-2 leading-snug">Bộ Gaming Gear Xuyên Thấu Phantom White Của Razer Đẹp Đến Mức Nào?</p>
            </div>
          </div>

          <div className="flex gap-[12px] p-[12px] cursor-pointer rounded-[8px] transition-colors duration-200 hover:bg-[#1a1a1e]">
            <div className="w-[120px] aspect-video bg-black rounded-[6px] relative overflow-hidden bg-gradient-to-r from-yellow-900 to-orange-900"><span className="absolute bottom-[4px] right-[4px] bg-black/80 text-[10px] px-[4px] py-[2px] rounded-[4px] text-white">06:18</span></div>
            <div className="flex-1">
              <p className="text-[13px] font-medium text-gray-300 line-clamp-2 leading-snug">Razer BlackShark V3 X HyperSpeed | Tai nghe gaming 2 củ này có đáng mua?</p>
            </div>
          </div>

          <div className="flex gap-[12px] p-[12px] cursor-pointer rounded-[8px] transition-colors duration-200 hover:bg-[#1a1a1e]">
            <div className="w-[120px] aspect-video bg-black rounded-[6px] relative overflow-hidden bg-gradient-to-r from-gray-700 to-gray-900"><span className="absolute bottom-[4px] right-[4px] bg-black/80 text-[10px] px-[4px] py-[2px] rounded-[4px] text-white">07:09</span></div>
            <div className="flex-1">
              <p className="text-[13px] font-medium text-gray-300 line-clamp-2 leading-snug">Sony WH1000XM6 | Tai nghe Tier S được nhiều người mua nhất năm 2025</p>
            </div>
          </div>
          
          <div className="flex gap-[12px] p-[12px] cursor-pointer rounded-[8px] transition-colors duration-200 hover:bg-[#1a1a1e]">
            <div className="w-[120px] aspect-video bg-black rounded-[6px] relative overflow-hidden bg-gradient-to-r from-teal-900 to-cyan-900"><span className="absolute bottom-[4px] right-[4px] bg-black/80 text-[10px] px-[4px] py-[2px] rounded-[4px] text-white">09:16</span></div>
            <div className="flex-1">
              <p className="text-[13px] font-medium text-gray-300 line-clamp-2 leading-snug">Anker Soundcore K20i | Earbuds Giá Rẻ Thì Có Gì Ngon!?</p>
            </div>
          </div>

        </div>
      </div>

    </div>
  </div>

  {/* SECTION 4: ĐÁNH GIÁ */}
  <div>
    <div className="flex justify-between items-end mb-6 border-b border-[#1a1a1e] pb-3">
      <h3 className="text-[18px] font-extrabold uppercase flex items-center gap-[8px] text-blue-500 mb-0"><span className="text-blue-500 text-xl">👍</span> ĐÁNH GIÁ</h3>
      <a href="#" className="text-[13px] font-bold text-blue-500 hover:text-blue-400 transition uppercase tracking-wide">XEM THÊM</a>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      
      {/* Col 1 */}
      <div>
        <div className="mb-6 cursor-pointer group">
          <div className="aspect-[16/9] bg-gradient-to-br from-indigo-900 to-purple-900 rounded-xl mb-4 overflow-hidden relative">
            <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition duration-300"></div>
          </div>
          <h4 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition leading-snug">Ưu nhược điểm của màn hình OLED khi chơi game</h4>
          <p className="text-xs text-gray-500">21 hours trước</p>
        </div>
        <div className="space-y-4">
          <div className="flex gap-4 cursor-pointer group">
            <div className="w-[120px] shrink-0 aspect-[4/3] bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg overflow-hidden"></div>
            <div>
              <h5 className="text-sm font-bold text-white mb-1 group-hover:text-blue-400 transition leading-snug line-clamp-2">Top 7 laptop Acer gaming có ưu đãi hấp dẫn tại Phong Vũ</h5>
              <p className="text-[12px] text-gray-500 line-clamp-2 mb-1">Để tìm được một chiếc laptop gaming vừa chiến mượt mọi tựa game, lại vừa có mức giá hợp lý chưa bao giờ là...</p>
              <p className="text-[11px] text-gray-600">29/05/2026</p>
            </div>
          </div>
          <div className="flex gap-4 cursor-pointer group">
            <div className="w-[120px] shrink-0 aspect-[4/3] bg-gradient-to-br from-blue-900 to-cyan-900 rounded-lg overflow-hidden"></div>
            <div>
              <h5 className="text-sm font-bold text-white mb-1 group-hover:text-blue-400 transition leading-snug line-clamp-2">Top laptop dưới 20 triệu hiệu năng cao đáng mua tại Phong Vũ</h5>
              <p className="text-[12px] text-gray-500 line-clamp-2 mb-1">Trong phân khúc phổ thông - cận tầm trung, việc tìm một chiếc laptop vừa mạnh mẽ vừa có mức giá hợp lý chưa...</p>
              <p className="text-[11px] text-gray-600">21/05/2026</p>
            </div>
          </div>
        </div>
      </div>

      {/* Col 2 */}
      <div>
        <div className="mb-6 cursor-pointer group">
          <div className="aspect-[16/9] bg-gradient-to-br from-red-900 to-orange-900 rounded-xl mb-4 overflow-hidden relative">
             <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition duration-300"></div>
          </div>
          <h4 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition leading-snug">Top laptop gaming có trải nghiệm màn hình cực tốt</h4>
          <p className="text-xs text-gray-500">04/06/2026</p>
        </div>
        <div className="space-y-4">
          <div className="flex gap-4 cursor-pointer group">
            <div className="w-[120px] shrink-0 aspect-[4/3] bg-gradient-to-br from-cyan-900 to-blue-900 rounded-lg overflow-hidden"></div>
            <div>
              <h5 className="text-sm font-bold text-white mb-1 group-hover:text-blue-400 transition leading-snug line-clamp-2">Top 10+ laptop ASUS khuyến mãi tốt nhất cho sinh viên & văn phòng</h5>
              <p className="text-[12px] text-gray-500 line-clamp-2 mb-1">Laptop ASUS khuyến mãi luôn là lựa chọn đáng cân nhắc cho sinh viên và dân văn phòng nhờ thiết kế gọn nhẹ, hiệu...</p>
              <p className="text-[11px] text-gray-600">21/05/2026</p>
            </div>
          </div>
          <div className="flex gap-4 cursor-pointer group">
            <div className="w-[120px] shrink-0 aspect-[4/3] bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg overflow-hidden"></div>
            <div>
              <h5 className="text-sm font-bold text-white mb-1 group-hover:text-blue-400 transition leading-snug line-clamp-2">ROG Flow Z13-KJP & TUF Gaming A14 2026 ra mắt tại Việt Nam</h5>
              <p className="text-[12px] text-gray-500 line-clamp-2 mb-1">ASUS Republic of Gamers (ROG) chính thức ra mắt tại Việt Nam bộ đôi ROG Flow Z13-KJP và TUF Gaming A14 2026. Cả hai...</p>
              <p className="text-[11px] text-gray-600">15/04/2026</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</div>
        <Footer />    
    </>
  );
}
