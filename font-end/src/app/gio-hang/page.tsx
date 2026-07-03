"use client";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

export default function CartPage() {
  return (
    <div className="bg-[#0a0a0c] min-h-screen text-white font-sans">
      <Header />
      <section className="max-w-[1400px] mx-auto px-4 md:px-6 py-12">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/*  */}
          <div className="lg:w-2/3 flex flex-col gap-4">
            {/*  */}
            <div className="bg-[#111115] border border-[#1a1a1e] rounded-xl p-4 flex items-center gap-4">
              <input
                type="checkbox"
                defaultChecked
                className="accent-red-500 cursor-pointer w-5 h-5 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <span className="font-bold text-sm text-white">
                  Tất cả (6/6) sản phẩm
                </span>
              </div>
              <div className="w-28 text-right hidden lg:block text-sm text-gray-400 font-medium shrink-0">
                Đơn giá
              </div>
              <div className="w-24 text-center hidden lg:block text-sm text-gray-400 font-medium shrink-0">
                Số lượng
              </div>
              <div className="w-28 text-right hidden lg:block text-sm text-gray-400 font-medium shrink-0">
                Thành tiền
              </div>
              <div className="w-10 flex justify-end shrink-0">
                <button
                  className="w-8 h-8 rounded-md bg-[#1a1a1e] hover:bg-red-500/20 hover:text-red-500 text-gray-400 flex items-center justify-center transition"
                  title="Xóa tất cả"
                >
                  <svg
                    xmlns="http://www.w3.org/0000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/*  */}
            <div className="bg-[#111115] border border-[#1a1a1e] rounded-xl p-4 flex items-start gap-4">
              <input
                type="checkbox"
                defaultChecked
                className="accent-red-500 cursor-pointer w-5 h-5 mt-4 shrink-0"
              />
              <div className="w-20 h-20 md:w-24 md:h-24 shrink-0 bg-[#0d0d10] border border-[#1a1a1e] rounded-md flex items-center justify-center overflow-hidden">
                <span className="text-3xl opacity-30">🔊</span>
              </div>
              <div className="flex-1 min-w-0 flex flex-col lg:flex-row gap-4 lg:items-center">
                {/*  */}
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <h4 className="font-bold text-sm text-white">
                    Loa Kiểm Âm Bluetooth Thonet & Vander Vertrag 2.0 (màu
                    trắng)
                  </h4>
                  <p className="text-[11px] text-gray-500">Mã: SPTV0008</p>
                  <div className="mt-2">
                    <button className="text-[11px] font-medium border border-[#27272a] bg-[#1a1a1e] text-gray-300 hover:text-white px-2.5 py-1 rounded-full transition flex items-center gap-1 w-fit">
                      <span className="text-red-500 font-bold">+</span> Mua sau
                    </button>
                  </div>
                </div>
                {/*  */}
                <div className="flex items-center gap-4 lg:w-[auto]">
                  <div className="w-24 md:w-28 text-left lg:text-right shrink-0">
                    <p className="text-red-500 font-bold text-[13px] md:text-sm">
                      2.289.000₫
                    </p>
                    <p className="text-gray-500 line-through text-[11px]">
                      3.699.000₫
                    </p>
                  </div>
                  <div className="w-20 md:w-24 shrink-0 flex items-center justify-start lg:justify-center">
                    <div className="flex border border-[#27272a] rounded overflow-hidden h-7 md:h-8 w-full max-w-[80px]">
                      <button className="w-6 md:w-8 flex items-center justify-center bg-[#0d0d10] hover:bg-[#1a1a1e] text-gray-400">
                        -
                      </button>
                      <input
                        type="text"
                        value="1"
                        className="w-full text-center bg-transparent text-xs text-white font-medium border-x border-[#27272a] outline-none"
                      />
                      <button className="w-6 md:w-8 flex items-center justify-center bg-[#0d0d10] hover:bg-[#1a1a1e] text-gray-400">
                        +
                      </button>
                    </div>
                  </div>
                  <div className="w-24 md:w-28 text-right hidden lg:block shrink-0">
                    <p className="text-red-500 font-bold text-sm">2.289.000₫</p>
                  </div>
                </div>
              </div>
              <div className="w-10 flex justify-end shrink-0 mt-2 lg:mt-6">
                <button className="w-8 h-8 rounded-md bg-[#1a1a1e] hover:bg-red-500/20 hover:text-red-500 text-gray-400 flex items-center justify-center transition">
                  <svg
                    xmlns="http://www.w3.org/0000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/*  */}
            <div className="bg-[#111115] border border-[#1a1a1e] rounded-xl p-4 flex items-start gap-4">
              <input
                type="checkbox"
                defaultChecked
                className="accent-red-500 cursor-pointer w-5 h-5 mt-4 shrink-0"
              />
              <div className="w-20 h-20 md:w-24 md:h-24 shrink-0 bg-[#0d0d10] border border-[#1a1a1e] rounded-md flex items-center justify-center overflow-hidden">
                <span className="text-3xl opacity-30">❄️</span>
              </div>
              <div className="flex-1 min-w-0 flex flex-col lg:flex-row gap-4 lg:items-center">
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <h4 className="font-bold text-sm text-white">
                    Fan CPU Noctua NH-U12A
                  </h4>
                  <p className="text-[11px] text-gray-500">Mã: FANC0667</p>
                  <div className="mt-2">
                    <button className="text-[11px] font-medium border border-[#27272a] bg-[#1a1a1e] text-gray-300 hover:text-white px-2.5 py-1 rounded-full transition flex items-center gap-1 w-fit">
                      <span className="text-red-500 font-bold">+</span> Mua sau
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4 lg:w-[auto]">
                  <div className="w-24 md:w-28 text-left lg:text-right shrink-0">
                    <p className="text-red-500 font-bold text-[13px] md:text-sm">
                      3.299.000₫
                    </p>
                    <p className="text-gray-500 line-through text-[11px]">
                      3.939.000₫
                    </p>
                  </div>
                  <div className="w-20 md:w-24 shrink-0 flex items-center justify-start lg:justify-center">
                    <div className="flex border border-[#27272a] rounded overflow-hidden h-7 md:h-8 w-full max-w-[80px]">
                      <button className="w-6 md:w-8 flex items-center justify-center bg-[#0d0d10] hover:bg-[#1a1a1e] text-gray-400">
                        -
                      </button>
                      <input
                        type="text"
                        value="1"
                        className="w-full text-center bg-transparent text-xs text-white font-medium border-x border-[#27272a] outline-none"
                      />
                      <button className="w-6 md:w-8 flex items-center justify-center bg-[#0d0d10] hover:bg-[#1a1a1e] text-gray-400">
                        +
                      </button>
                    </div>
                  </div>
                  <div className="w-24 md:w-28 text-right hidden lg:block shrink-0">
                    <p className="text-red-500 font-bold text-sm">3.299.000₫</p>
                  </div>
                </div>
              </div>
              <div className="w-10 flex justify-end shrink-0 mt-2 lg:mt-6">
                <button className="w-8 h-8 rounded-md bg-[#1a1a1e] hover:bg-red-500/20 hover:text-red-500 text-gray-400 flex items-center justify-center transition">
                  <svg
                    xmlns="http://www.w3.org/0000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/*  */}
            <div className="bg-[#111115] border border-[#1a1a1e] rounded-xl p-4 flex items-start gap-4">
              <input
                type="checkbox"
                defaultChecked
                className="accent-red-500 cursor-pointer w-5 h-5 mt-4 shrink-0"
              />
              <div className="w-20 h-20 md:w-24 md:h-24 shrink-0 bg-[#0d0d10] border border-[#1a1a1e] rounded-md flex items-center justify-center overflow-hidden">
                <span className="text-3xl opacity-30">🖱️</span>
              </div>
              <div className="flex-1 min-w-0 flex flex-col lg:flex-row gap-4 lg:items-center">
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <h4 className="font-bold text-sm text-white">
                    Chuột gaming không dây ZOWIE EC3-DW
                  </h4>
                  <p className="text-[11px] text-gray-500">Mã: MEZO0043</p>
                  <div className="mt-2">
                    <button className="text-[11px] font-medium border border-[#27272a] bg-[#1a1a1e] text-gray-300 hover:text-white px-2.5 py-1 rounded-full transition flex items-center gap-1 w-fit">
                      <span className="text-red-500 font-bold">+</span> Mua sau
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4 lg:w-[auto]">
                  <div className="w-24 md:w-28 text-left lg:text-right shrink-0">
                    <p className="text-red-500 font-bold text-[13px] md:text-sm">
                      3.999.000₫
                    </p>
                    <p className="text-gray-500 line-through text-[11px]">
                      4.499.000₫
                    </p>
                  </div>
                  <div className="w-20 md:w-24 shrink-0 flex items-center justify-start lg:justify-center">
                    <div className="flex border border-[#27272a] rounded overflow-hidden h-7 md:h-8 w-full max-w-[80px]">
                      <button className="w-6 md:w-8 flex items-center justify-center bg-[#0d0d10] hover:bg-[#1a1a1e] text-gray-400">
                        -
                      </button>
                      <input
                        type="text"
                        value="1"
                        className="w-full text-center bg-transparent text-xs text-white font-medium border-x border-[#27272a] outline-none"
                      />
                      <button className="w-6 md:w-8 flex items-center justify-center bg-[#0d0d10] hover:bg-[#1a1a1e] text-gray-400">
                        +
                      </button>
                    </div>
                  </div>
                  <div className="w-24 md:w-28 text-right hidden lg:block shrink-0">
                    <p className="text-red-500 font-bold text-sm">3.999.000₫</p>
                  </div>
                </div>
              </div>
              <div className="w-10 flex justify-end shrink-0 mt-2 lg:mt-6">
                <button className="w-8 h-8 rounded-md bg-[#1a1a1e] hover:bg-red-500/20 hover:text-red-500 text-gray-400 flex items-center justify-center transition">
                  <svg
                    xmlns="http://www.w3.org/0000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/*  */}
            <div className="bg-[#111115] border border-[#1a1a1e] rounded-xl p-4 flex items-start gap-4">
              <input
                type="checkbox"
                defaultChecked
                className="accent-red-500 cursor-pointer w-5 h-5 mt-4 shrink-0"
              />
              <div className="w-20 h-20 md:w-24 md:h-24 shrink-0 bg-[#0d0d10] border border-[#1a1a1e] rounded-md flex items-center justify-center overflow-hidden">
                <span className="text-3xl opacity-30">🖥️</span>
              </div>
              <div className="flex-1 min-w-0 flex flex-col lg:flex-row gap-4 lg:items-center">
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <h4 className="font-bold text-sm text-white">
                    Card màn hình Asus TUF GAMING RTX 5080 16G GDDR7 OC
                  </h4>

                  <div className="mt-1 mb-1 border border-red-500/30 bg-red-500/5 rounded-md p-2.5">
                    <p className="text-[11px] font-bold text-red-500 mb-0.5">
                      Quý khách lưu ý
                    </p>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      HACOM đang khuyến mãi giảm giá sốc Linh kiện này, nếu mua
                      kèm đủ: Mainboard, CPU, RAM, SSD/HDD, Case, Nguồn.
                    </p>
                  </div>

                  <p className="text-[11px] text-gray-500">Mã: VGAS0807</p>
                  <div className="mt-2">
                    <button className="text-[11px] font-medium border border-[#27272a] bg-[#1a1a1e] text-gray-300 hover:text-white px-2.5 py-1 rounded-full transition flex items-center gap-1 w-fit">
                      <span className="text-red-500 font-bold">+</span> Mua sau
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4 lg:w-[auto]">
                  <div className="w-24 md:w-28 text-left lg:text-right shrink-0">
                    <p className="text-red-500 font-bold text-[13px] md:text-sm">
                      46.999.000₫
                    </p>
                    <p className="text-gray-500 line-through text-[11px]">
                      49.499.000₫
                    </p>
                  </div>
                  <div className="w-20 md:w-24 shrink-0 flex items-center justify-start lg:justify-center">
                    <div className="flex border border-[#27272a] rounded overflow-hidden h-7 md:h-8 w-full max-w-[80px]">
                      <button className="w-6 md:w-8 flex items-center justify-center bg-[#0d0d10] hover:bg-[#1a1a1e] text-gray-400">
                        -
                      </button>
                      <input
                        type="text"
                        value="1"
                        className="w-full text-center bg-transparent text-xs text-white font-medium border-x border-[#27272a] outline-none"
                      />
                      <button className="w-6 md:w-8 flex items-center justify-center bg-[#0d0d10] hover:bg-[#1a1a1e] text-gray-400">
                        +
                      </button>
                    </div>
                  </div>
                  <div className="w-24 md:w-28 text-right hidden lg:block shrink-0">
                    <p className="text-red-500 font-bold text-sm">
                      46.999.000₫
                    </p>
                  </div>
                </div>
              </div>
              <div className="w-10 flex justify-end shrink-0 mt-2 lg:mt-6">
                <button className="w-8 h-8 rounded-md bg-[#1a1a1e] hover:bg-red-500/20 hover:text-red-500 text-gray-400 flex items-center justify-center transition">
                  <svg
                    xmlns="http://www.w3.org/0000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/*  */}
            <div className="bg-[#111115] border border-[#1a1a1e] rounded-xl p-4 flex items-start gap-4">
              <input
                type="checkbox"
                defaultChecked
                className="accent-red-500 cursor-pointer w-5 h-5 mt-4 shrink-0"
              />
              <div className="w-20 h-20 md:w-24 md:h-24 shrink-0 bg-[#0d0d10] border border-[#1a1a1e] rounded-md flex items-center justify-center overflow-hidden">
                <span className="text-3xl opacity-30">🎮</span>
              </div>
              <div className="flex-1 min-w-0 flex flex-col lg:flex-row gap-4 lg:items-center">
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <h4 className="font-bold text-sm text-white">
                    Tay cầm chơi game Flydigi Direwolf 4 màu xám
                  </h4>
                  <p className="text-[11px] text-gray-500">Mã: GPFD0026</p>
                  <div className="mt-2 flex gap-2">
                    <button className="text-[11px] font-medium border border-gray-600 bg-gray-800 text-white hover:bg-gray-700 px-2.5 py-1 rounded-full transition flex items-center gap-1 w-fit">
                      🎁 Khuyến mãi
                    </button>
                    <button className="text-[11px] font-medium border border-[#27272a] bg-[#1a1a1e] text-gray-300 hover:text-white px-2.5 py-1 rounded-full transition flex items-center gap-1 w-fit">
                      <span className="text-red-500 font-bold">+</span> Mua sau
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4 lg:w-[auto]">
                  <div className="w-24 md:w-28 text-left lg:text-right shrink-0">
                    <p className="text-red-500 font-bold text-[13px] md:text-sm">
                      789.000₫
                    </p>
                    <p className="text-gray-500 line-through text-[11px]">
                      999.000₫
                    </p>
                  </div>
                  <div className="w-20 md:w-24 shrink-0 flex items-center justify-start lg:justify-center">
                    <div className="flex border border-[#27272a] rounded overflow-hidden h-7 md:h-8 w-full max-w-[80px]">
                      <button className="w-6 md:w-8 flex items-center justify-center bg-[#0d0d10] hover:bg-[#1a1a1e] text-gray-400">
                        -
                      </button>
                      <input
                        type="text"
                        value="1"
                        className="w-full text-center bg-transparent text-xs text-white font-medium border-x border-[#27272a] outline-none"
                      />
                      <button className="w-6 md:w-8 flex items-center justify-center bg-[#0d0d10] hover:bg-[#1a1a1e] text-gray-400">
                        +
                      </button>
                    </div>
                  </div>
                  <div className="w-24 md:w-28 text-right hidden lg:block shrink-0">
                    <p className="text-red-500 font-bold text-sm">789.000₫</p>
                  </div>
                </div>
              </div>
              <div className="w-10 flex justify-end shrink-0 mt-2 lg:mt-6">
                <button className="w-8 h-8 rounded-md bg-[#1a1a1e] hover:bg-red-500/20 hover:text-red-500 text-gray-400 flex items-center justify-center transition">
                  <svg
                    xmlns="http://www.w3.org/0000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/*  */}
            <div className="bg-[#111115] border border-[#1a1a1e] rounded-xl p-4">
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  defaultChecked
                  className="accent-red-500 cursor-pointer w-5 h-5 mt-4 shrink-0"
                />
                <div className="w-20 h-20 md:w-24 md:h-24 shrink-0 bg-[#0d0d10] border border-[#1a1a1e] rounded-md flex items-center justify-center overflow-hidden">
                  <span className="text-3xl opacity-30">💻</span>
                </div>
                <div className="flex-1 min-w-0 flex flex-col lg:flex-row gap-4 lg:items-center">
                  <div className="flex-1 min-w-0 flex flex-col gap-1">
                    <h4 className="font-bold text-sm text-white">
                      Laptop Acer Aspire Go AG15-72P-54GY (NX.JRRSV.002) Core
                      5-120U/16GB RAM DDR4/512GSSD/15.6 inch FHD/Win 11 SL/Bạc)
                    </h4>

                    <div className="mt-2 mb-1 border border-yellow-500/30 bg-yellow-500/5 rounded-md p-2.5 w-fit pr-10">
                      <p className="text-[12px] font-bold text-yellow-500 flex items-center gap-1">
                        ⚡ Giá sốc Flash Sale
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        (Tối đa 1 sp) &nbsp; 19/6/2026 - 21/6/2026
                      </p>
                    </div>

                    <p className="text-[11px] text-gray-500">Mã: LTAC1001</p>
                    <div className="mt-2">
                      <button className="text-[11px] font-medium border border-[#27272a] bg-[#1a1a1e] text-gray-300 hover:text-white px-2.5 py-1 rounded-full transition flex items-center gap-1 w-fit">
                        <span className="text-red-500 font-bold">+</span> Mua
                        sau
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 lg:w-[auto]">
                    <div className="w-24 md:w-28 text-left lg:text-right shrink-0">
                      <p className="text-red-500 font-bold text-[13px] md:text-sm">
                        18.499.000₫
                      </p>
                      <p className="text-gray-500 line-through text-[11px]">
                        20.999.000₫
                      </p>
                    </div>
                    <div className="w-20 md:w-24 shrink-0 flex items-center justify-start lg:justify-center">
                      <div className="flex border border-[#27272a] rounded overflow-hidden h-7 md:h-8 w-full max-w-[80px]">
                        <button className="w-6 md:w-8 flex items-center justify-center bg-[#0d0d10] hover:bg-[#1a1a1e] text-gray-400">
                          -
                        </button>
                        <input
                          type="text"
                          value="1"
                          className="w-full text-center bg-transparent text-xs text-white font-medium border-x border-[#27272a] outline-none"
                        />
                        <button className="w-6 md:w-8 flex items-center justify-center bg-[#0d0d10] hover:bg-[#1a1a1e] text-gray-400">
                          +
                        </button>
                      </div>
                    </div>
                    <div className="w-24 md:w-28 text-right hidden lg:block shrink-0">
                      <p className="text-red-500 font-bold text-sm">
                        18.499.000₫
                      </p>
                    </div>
                  </div>
                </div>
                <div className="w-10 flex justify-end shrink-0 mt-2 lg:mt-6">
                  <button className="w-8 h-8 rounded-md bg-[#1a1a1e] hover:bg-red-500/20 hover:text-red-500 text-gray-400 flex items-center justify-center transition">
                    <svg
                      xmlns="http://www.w3.org/0000/svg"
                      className="h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>

              {/*  */}
              <div className="mt-6 ml-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-t-lg rounded-r-lg">
                  <span className="text-sm">🛡️</span>
                  <span className="text-sm font-bold text-green-500">
                    Bảo hành VIP
                  </span>
                </div>
                <div className="border-t-2 border-green-500/50 pt-4 pb-2 space-y-4">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      name="vip_war"
                      className="accent-green-500 cursor-pointer mt-1 w-4 h-4 shrink-0"
                    />
                    <div className="w-5 h-5 bg-green-500/20 rounded flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px]">🛡️</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] text-gray-300 group-hover:text-white transition">
                        Gói Bảo Hành 1 năm nhà sản xuất +1 năm BHMR của Laptop
                        có mức giá bán &gt;16 triệu đến &lt;=19 triệu
                      </p>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Mã: BHLT0004
                      </p>
                      <p className="text-[13px] font-bold text-green-500 mt-1">
                        +689.000 ₫{" "}
                        <span className="text-gray-500 line-through font-normal text-xs ml-1">
                          757.999 ₫
                        </span>
                      </p>
                      <p className="text-[11px] text-blue-400 mt-1 flex items-center gap-1">
                        <svg
                          xmlns="http://www.w3.org/0000/svg"
                          className="h-3 w-3"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Có thể chọn nhiều gói bảo hành
                      </p>
                    </div>
                  </label>

                  <div className="w-full h-px bg-[#1a1a1e] ml-8"></div>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      name="vip_war"
                      className="accent-green-500 cursor-pointer mt-1 w-4 h-4 shrink-0"
                    />
                    <div className="w-5 h-5 bg-green-500/20 rounded flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px]">🛡️</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] text-gray-300 group-hover:text-white transition">
                        Gói Bảo Hành 1 năm nhà sản xuất +2 năm BHMR của Laptop
                        có mức giá bán &gt;16 triệu đến &lt;=19 triệu
                      </p>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Mã: BHLT0024
                      </p>
                      <p className="text-[13px] font-bold text-green-500 mt-1">
                        +1.139.000 ₫{" "}
                        <span className="text-gray-500 line-through font-normal text-xs ml-1">
                          1.252.999 ₫
                        </span>
                      </p>
                      <p className="text-[11px] text-blue-400 mt-1 flex items-center gap-1">
                        <svg
                          xmlns="http://www.w3.org/0000/svg"
                          className="h-3 w-3"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Có thể chọn nhiều gói bảo hành
                      </p>
                    </div>
                  </label>

                  <div className="w-full h-px bg-[#1a1a1e] ml-8"></div>

                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      name="vip_war"
                      className="accent-green-500 cursor-pointer mt-1 w-4 h-4 shrink-0"
                    />
                    <div className="w-5 h-5 bg-green-500/20 rounded flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px]">🛡️</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] text-gray-300 group-hover:text-white transition">
                        Gói Bảo Hành 1 đổi 1 của Laptop có mức giá bán &gt;16
                        triệu đến &lt;=19 triệu
                      </p>
                      <p className="text-[11px] text-gray-500 mt-1">
                        Mã: BHLT0044
                      </p>
                      <p className="text-[13px] font-bold text-green-500 mt-1">
                        +899.000 ₫{" "}
                        <span className="text-gray-500 line-through font-normal text-xs ml-1">
                          989.000 ₫
                        </span>
                      </p>
                      <p className="text-[11px] text-blue-400 mt-1 flex items-center gap-1">
                        <svg
                          xmlns="http://www.w3.org/0000/svg"
                          className="h-3 w-3"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                        Có thể chọn nhiều gói bảo hành
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/*  */}
          <div className="lg:w-1/3 lg:sticky lg:top-6 lg:self-start space-y-4">
            {/*  */}
            <div className="bg-[#111115] border border-[#1a1a1e] rounded-xl p-4 flex justify-between items-center bg-gradient-to-r from-[#111115] to-[#16161a]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500/10 text-red-500 rounded-lg flex items-center justify-center text-xl">
                  🎟️
                </div>
                <div>
                  <p className="font-bold text-sm text-white">
                    Voucher giảm giá
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Hãy áp dụng để tiết kiệm
                  </p>
                </div>
              </div>
              <button className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-2 rounded transition">
                Chọn mã
              </button>
            </div>

            {/*  */}
            <div className="bg-[#111115] border border-[#1a1a1e] rounded-xl p-5">
              <h3 className="font-bold text-[15px] text-white mb-5">
                Thông tin đơn hàng
              </h3>

              <div className="space-y-4 text-[13px] border-b border-[#1a1a1e] pb-5 mb-5">
                <div className="flex justify-between text-gray-400">
                  <span>Tổng tiền sản phẩm</span>
                  <span className="font-bold text-white">76.374.000₫</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Giảm giá Flash Sale</span>
                  <span className="font-bold text-red-500">-500.000₫</span>
                </div>
              </div>

              <div className="flex justify-between items-start mb-6">
                <span className="font-bold text-white text-sm mt-1">
                  Cần thanh toán
                </span>
                <div className="text-right">
                  <span className="font-black text-[22px] text-red-500 leading-none block mb-1">
                    75.874.000₫
                  </span>
                  <span className="text-[10px] text-gray-500">
                    (Đã bao gồm VAT)
                  </span>
                </div>
              </div>

              <button className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg transition mb-3 flex items-center justify-center gap-2">
                <svg
                  xmlns="http://www.w3.org/0000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                Tiến hành đặt hàng
              </button>
              <button className="w-full bg-transparent border border-red-500/50 hover:bg-red-500/10 text-red-500 font-bold py-3 rounded-lg transition flex items-center justify-center gap-2">
                <svg
                  xmlns="http://www.w3.org/0000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
                Mua trả góp
              </button>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
