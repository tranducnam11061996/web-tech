import Link from "next/link";

export default function CategoryPromoCards() {
  return (
    <>
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
            {"\u26A1 Khuyến Mãi Laptop"}
          </span>
          <span className="text-xl">{"\u{1F916}"}</span>
        </div>
        <h3 className="text-[22px] font-extrabold leading-tight mb-1">
          Hãy chọn
        </h3>
        <h3 className="text-[22px] font-extrabold leading-tight mb-1">
          <span className="text-emerald-400">Laptop</span> của bạn
        </h3>
        <p className="text-[11px] text-gray-500 leading-relaxed mb-4">
          Đầy đủ phân khúc giá, cấu hình khủng, giá tốt, khuyến mãi siêu hời
        </p>
        <div className="flex gap-2 mb-5">
          <span className="bg-[#1a1a1e] text-[10px] text-gray-400 px-3 py-1.5 rounded-full flex items-center gap-1">
            {"\u{1F3AE} Gaming"}
          </span>
          <span className="bg-[#1a1a1e] text-[10px] text-gray-400 px-3 py-1.5 rounded-full flex items-center gap-1">
            {"\u{1F4BC} Làm việc"}
          </span>
          <span className="bg-[#1a1a1e] text-[10px] text-gray-400 px-3 py-1.5 rounded-full flex items-center gap-1">
            {"\u{1F4DA} Học tập"}
          </span>
        </div>
        <Link
          href="/laptop"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500"
        >
          {"\u2726 Xem ngay \u2192"}
        </Link>
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
              Công xưởng
            </h3>
            <h3 className="text-xl font-extrabold leading-tight">
              <span className="text-cyan-400">PC Gaming</span> siêu khủng
            </h3>
          </div>
          <span className="text-xl">{"\u{1F44D}"}</span>
        </div>
        <p className="text-[11px] text-gray-500 leading-relaxed mb-4">
          Các cấu hình PC chiến game mượt, lắp ráp bởi chuyên gia, đã test trực tiếp hiệu năng, phục vụ chính xác theo yêu cầu của bạn.
        </p>
        <div className="flex gap-2 mb-5">
          <span className="bg-[#1a1a1e] text-[11px] text-gray-400 px-3 py-1.5 rounded-full font-bold">
            Tối ưu
          </span>
          <span className="bg-[#1a1a1e] text-[11px] text-gray-400 px-3 py-1.5 rounded-full font-bold">
            Chuyên gia
          </span>
          <span className="bg-[#1a1a1e] text-[11px] text-gray-400 px-3 py-1.5 rounded-full font-bold">
            Max ping
          </span>
        </div>
        <Link
          href="/bo-pc-gaming-livestream.html"
          className="block w-full rounded-xl border border-[#27272a] bg-[#1a1a1e] py-2.5 text-center text-sm font-bold text-white transition hover:bg-[#27272a]"
        >
          {"\u2726 Xem cấu hình \u2192"}
        </Link>
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
          {"\u{1F4F1} Màn hình"}
        </span>
        <h3 className="text-xl font-extrabold leading-tight mb-0.5">
          Ưu đãi
        </h3>
        <h3 className="text-xl font-extrabold leading-tight mb-2">
          <span className="text-blue-400">Màn hình</span> máy tính
        </h3>
        <p className="text-[11px] text-gray-500 leading-relaxed mb-4">
          Màn hình nét căng – làm việc mượt mà . Chọn màn hình chuẩn màu, hiển thị sắc nét cho cả làm việc lẫn giải trí
        </p>
        <Link
          href="/monitor-man-hinh.html"
          className="block w-full rounded-xl border border-[#27272a] bg-[#1a1a1e] py-2.5 text-center text-sm font-bold text-white transition hover:bg-[#27272a]"
        >
          {"\u2726 Xem ngay \u2192"}
        </Link>
      </div>

      {/*  Promo Box 4: Know More  */}
      <div
        className="promo-box"
        style={{ background: "#111115", borderColor: "#1a1a1e" }}
      >
        <div className="flex items-center justify-between mb-1">
          <div>
            <h3 className="text-xl font-extrabold leading-tight">
              Ưu đãi
            </h3>
            <h3 className="text-xl font-extrabold leading-tight">
              <span className="text-purple-400">Doanh Nghiệp</span>
            </h3>
          </div>
          <span className="text-gray-600 text-sm">⚡</span>
        </div>
        <p className="text-[11px] text-gray-500 leading-relaxed mb-4">
          Tư vấn và triển khai hệ thống cấu hình PC office chạy mượt, tiết kiệm chi phí, phù hợp cho cá nhân và doanh nghiệp.
        </p>
        <div className="flex gap-2 mb-5">
          <span className="bg-[#1a1a1e] text-[11px] text-gray-400 px-3 py-1.5 rounded-full font-bold">
            Giá tốt
          </span>
          <span className="bg-[#1a1a1e] text-[11px] text-gray-400 px-3 py-1.5 rounded-full font-bold">
            Hỗ trợ 24/7
          </span>
          <span className="bg-[#1a1a1e] text-[11px] text-gray-400 px-3 py-1.5 rounded-full font-bold">
            Linh Hoạt
          </span>
        </div>
        <Link
          href="/pc-van-phong.html"
          className="block w-full rounded-xl border border-[#27272a] bg-[#1a1a1e] py-2.5 text-center text-sm font-bold text-white transition hover:bg-[#27272a]"
        >
          {"\u2726 Xem cấu hình \u2192"}
        </Link>
      </div>
    </>
  );
}
