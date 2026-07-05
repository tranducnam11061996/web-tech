"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import ProgressiveImage from "../../components/ProgressiveImage";
import Link from "next/link";

export default function CheckoutPage() {
  return (
    <>    
        <Header />
<section className="max-w-[1400px] mx-auto px-4 md:px-6 py-8">

  {/* ===== Back link ===== */}
  <a href="#" className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-400 text-sm font-medium mb-6 transition">
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
    Quay lại giỏ hàng
  </a>

  <div className="flex flex-col lg:flex-row gap-6 items-start">

    {/* ===== LEFT PANEL (2/3) ===== */}
    <div className="lg:w-2/3 space-y-6">

      {/* ===== Product List ===== */}
      <div className="bg-[#111115] border border-[#1a1a1e] rounded-[12px]">
        <div className="p-5 border-b border-[#1a1a1e]">
          <h3 className="font-bold text-[15px] text-white">Sản phẩm trong đơn (6)</h3>
        </div>

        {/* ===== Item 1 ===== */}
        <div className="flex items-center gap-4 p-4 border-b border-[#1a1a1e]">
          <div className="w-14 h-14 shrink-0 bg-[#0d0d10] border border-[#1a1a1e] rounded-md flex items-center justify-center">
            <span className="text-2xl opacity-30">🔊</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Loa Kiểm Âm Bluetooth Thonet & Vander Vertrag 2.0 (màu trắng)</p>
            <p className="text-[11px] text-gray-500">[SPTV0008]</p>
          </div>
          <div className="text-center shrink-0 w-8">
            <p className="text-sm text-gray-400">x1</p>
          </div>
          <div className="text-right shrink-0 w-28">
            <p className="text-red-500 font-bold text-sm">2.289.000₫</p>
            <p className="text-gray-500 line-through text-[11px]">3.699.000₫</p>
          </div>
        </div>

        {/* ===== Item 2 ===== */}
        <div className="flex items-center gap-4 p-4 border-b border-[#1a1a1e]">
          <div className="w-14 h-14 shrink-0 bg-[#0d0d10] border border-[#1a1a1e] rounded-md flex items-center justify-center">
            <span className="text-2xl opacity-30">❄️</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Fan CPU Noctua NH-U12A</p>
            <p className="text-[11px] text-gray-500">[FANC0667]</p>
          </div>
          <div className="text-center shrink-0 w-8">
            <p className="text-sm text-gray-400">x1</p>
          </div>
          <div className="text-right shrink-0 w-28">
            <p className="text-red-500 font-bold text-sm">3.299.000₫</p>
            <p className="text-gray-500 line-through text-[11px]">3.939.000₫</p>
          </div>
        </div>

        {/* ===== Item 3 ===== */}
        <div className="flex items-center gap-4 p-4 border-b border-[#1a1a1e]">
          <div className="w-14 h-14 shrink-0 bg-[#0d0d10] border border-[#1a1a1e] rounded-md flex items-center justify-center">
            <span className="text-2xl opacity-30">🖱️</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Chuột gaming không dây ZOWIE EC3-DW</p>
            <p className="text-[11px] text-gray-500">[MEZO0043]</p>
          </div>
          <div className="text-center shrink-0 w-8">
            <p className="text-sm text-gray-400">x1</p>
          </div>
          <div className="text-right shrink-0 w-28">
            <p className="text-red-500 font-bold text-sm">3.999.000₫</p>
            <p className="text-gray-500 line-through text-[11px]">4.499.000₫</p>
          </div>
        </div>

        {/* ===== Item 4: GPU with warning ===== */}
        <div className="p-4 border-b border-[#1a1a1e]">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 shrink-0 bg-[#0d0d10] border border-[#1a1a1e] rounded-md flex items-center justify-center">
              <span className="text-2xl opacity-30">🖥️</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">Card màn hình Asus TUF GAMING RTX 5080 16G GDDR7 OC</p>
              <p className="text-[11px] text-gray-500">[VGAS0807]</p>
              <div className="mt-2 border border-red-500/30 bg-red-500/5 rounded-md p-2.5">
                <p className="text-[11px] font-bold text-red-500 mb-0.5">Quý khách lưu ý</p>
                <p className="text-[11px] text-gray-400 leading-relaxed">HACOM đang khuyến mãi giảm giá sốc Linh kiện này, nếu mua kèm đủ: Mainboard, CPU, RAM, SSD/HDD, Case, Nguồn.</p>
              </div>
            </div>
            <div className="text-center shrink-0 w-8 mt-2">
              <p className="text-sm text-gray-400">x1</p>
            </div>
            <div className="text-right shrink-0 w-28 mt-2">
              <p className="text-red-500 font-bold text-sm">46.999.000₫</p>
              <p className="text-gray-500 line-through text-[11px]">49.499.000₫</p>
            </div>
          </div>
        </div>

        {/* ===== Item 5 ===== */}
        <div className="flex items-center gap-4 p-4 border-b border-[#1a1a1e]">
          <div className="w-14 h-14 shrink-0 bg-[#0d0d10] border border-[#1a1a1e] rounded-md flex items-center justify-center">
            <span className="text-2xl opacity-30">🎮</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Tay cầm chơi game Flydigi Direwolf 4 màu xám</p>
            <p className="text-[11px] text-gray-500">[GPFD0026]</p>
          </div>
          <div className="text-center shrink-0 w-8">
            <p className="text-sm text-gray-400">x1</p>
          </div>
          <div className="text-right shrink-0 w-28">
            <p className="text-red-500 font-bold text-sm">789.000₫</p>
            <p className="text-gray-500 line-through text-[11px]">999.000₫</p>
          </div>
        </div>

        {/* ===== Item 6: Laptop with Flash Sale badge ===== */}
        <div className="p-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 shrink-0 bg-[#0d0d10] border border-[#1a1a1e] rounded-md flex items-center justify-center">
              <span className="text-2xl opacity-30">💻</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">Laptop Acer Aspire Go AG15-72P-54GY (NX.JRRSV.002) Core 5-120U/16GB RAM DDR4/512GSSD/15.6 inch FHD/Win 11 SL/Bạc)</p>
              <p className="text-[11px] text-gray-500">[LTAC1001]</p>
              <span className="inline-flex items-center gap-1 mt-2 px-2.5 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded text-[11px] font-bold text-yellow-500">⚡ Flash Sale</span>
            </div>
            <div className="text-center shrink-0 w-8 mt-2">
              <p className="text-sm text-gray-400">x1</p>
            </div>
            <div className="text-right shrink-0 w-28 mt-2">
              <p className="text-red-500 font-bold text-sm">18.499.000₫</p>
              <p className="text-gray-500 line-through text-[11px]">20.999.000₫</p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Thông tin người đặt hàng ===== */}
      <div className="bg-[#111115] border border-[#1a1a1e] rounded-[12px] p-5 space-y-5">
        <h3 className="font-bold text-[15px] text-white">Thông tin người đặt hàng</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input type="text" placeholder="Họ và tên" className="bg-[#0d0d10] border border-[#27272a] rounded-lg px-[14px] py-[10px] text-white text-[13px] outline-none w-full transition-colors duration-200 focus:border-blue-500 placeholder-[#555]" />
          <input type="text" placeholder="Số điện thoại" className="bg-[#0d0d10] border border-[#27272a] rounded-lg px-[14px] py-[10px] text-white text-[13px] outline-none w-full transition-colors duration-200 focus:border-blue-500 placeholder-[#555]" />
          <input type="email" placeholder="Email (Không bắt buộc)" className="bg-[#0d0d10] border border-[#27272a] rounded-lg px-[14px] py-[10px] text-white text-[13px] outline-none w-full transition-colors duration-200 focus:border-blue-500 placeholder-[#555]" />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" defaultChecked className="w-4 h-4 accent-blue-500 cursor-pointer" />
          <span className="text-sm text-gray-300">Nhờ người khác nhận hàng</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" placeholder="Họ và tên người nhận" className="bg-[#0d0d10] border border-[#27272a] rounded-lg px-[14px] py-[10px] text-white text-[13px] outline-none w-full transition-colors duration-200 focus:border-blue-500 placeholder-[#555]" />
          <input type="text" placeholder="Số điện thoại người nhận" className="bg-[#0d0d10] border border-[#27272a] rounded-lg px-[14px] py-[10px] text-white text-[13px] outline-none w-full transition-colors duration-200 focus:border-blue-500 placeholder-[#555]" />
        </div>
      </div>

      {/* ===== Địa chỉ nhận hàng ===== */}
      <div className="bg-[#111115] border border-[#1a1a1e] rounded-[12px] p-5 space-y-5">
        <h3 className="font-bold text-[15px] text-white">Địa chỉ nhận hàng</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all border-blue-500/50 bg-blue-500/5">
            <input type="radio" name="delivery" defaultChecked className="w-4 h-4 accent-blue-500 cursor-pointer" />
            <span className="text-sm font-medium text-white flex items-center gap-2">🚚 Giao hàng tận nơi</span>
          </label>
          <label className="flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all border-[#27272a] hover:border-blue-500/30">
            <input type="radio" name="delivery" className="w-4 h-4 accent-blue-500 cursor-pointer" />
            <span className="text-sm font-medium text-gray-400 flex items-center gap-2">🏪 Nhận tại cửa hàng</span>
          </label>
        </div>
      </div>

      {/* ===== Địa chỉ giao hàng ===== */}
      <div className="bg-[#111115] border border-[#1a1a1e] rounded-[12px] p-5 space-y-5">
        <h3 className="font-bold text-[15px] text-white">Địa chỉ giao hàng</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select className="bg-[#0d0d10] border border-[#27272a] rounded-lg px-[14px] py-[10px] text-white text-[13px] outline-none w-full transition-colors duration-200 focus:border-blue-500 appearance-none cursor-pointer pr-[36px] bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2212%22%20height=%2212%22%20fill=%22%23888%22%20viewBox=%220%200%2016%2016%22%3E%3Cpath%20d=%22M1.646%204.646a.5.5%200%200%201%20.708%200L8%2010.293l5.646-5.647a.5.5%200%200%201%20.708.708l-6%206a.5.5%200%200%201-.708%200l-6-6a.5.5%200%200%201%200-.708z%22/%3E%3C/svg%3E')] bg-no-repeat bg-[position:right_14px_center]">
            <option>Chọn Tỉnh/Thành phố</option>
          </select>
          <select className="bg-[#0d0d10] border border-[#27272a] rounded-lg px-[14px] py-[10px] text-white text-[13px] outline-none w-full transition-colors duration-200 focus:border-blue-500 appearance-none cursor-pointer pr-[36px] bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2212%22%20height=%2212%22%20fill=%22%23888%22%20viewBox=%220%200%2016%2016%22%3E%3Cpath%20d=%22M1.646%204.646a.5.5%200%200%201%20.708%200L8%2010.293l5.646-5.647a.5.5%200%200%201%20.708.708l-6%206a.5.5%200%200%201-.708%200l-6-6a.5.5%200%200%201%200-.708z%22/%3E%3C/svg%3E')] bg-no-repeat bg-[position:right_14px_center]">
            <option>Chọn Phường/Xã</option>
          </select>
        </div>
        <input type="text" placeholder="Số nhà, tên đường" className="bg-[#0d0d10] border border-[#27272a] rounded-lg px-[14px] py-[10px] text-white text-[13px] outline-none w-full transition-colors duration-200 focus:border-blue-500 placeholder-[#555]" />
        <textarea rows="4" placeholder="Ghi chú (Ví dụ: Hãy gọi tôi khi chuẩn bị hàng xong)" className="resize-y bg-[#0d0d10] border border-[#27272a] rounded-lg px-[14px] py-[10px] text-white text-[13px] outline-none w-full transition-colors duration-200 focus:border-blue-500 placeholder-[#555]"></textarea>
        <p className="text-right text-[11px] text-gray-600 -mt-3">0/128</p>
      </div>

      {/* ===== Xuất hóa đơn công ty ===== */}
      <div className="bg-[#111115] border border-[#1a1a1e] rounded-[12px] p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-[15px] text-white">Xuất hóa đơn công ty</h3>
          <label className="relative w-[48px] h-[26px] cursor-pointer inline-block">
            <input type="checkbox" defaultChecked className="peer sr-only" />
            <span className="absolute inset-0 bg-[#27272a] rounded-full transition duration-300 peer-checked:bg-blue-500 before:absolute before:content-[''] before:h-[20px] before:w-[20px] before:left-[3px] before:bottom-[3px] before:bg-white before:rounded-full before:transition before:duration-300 peer-checked:before:translate-x-[22px]"></span>
          </label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" placeholder="Tên công ty" className="bg-[#0d0d10] border border-[#27272a] rounded-lg px-[14px] py-[10px] text-white text-[13px] outline-none w-full transition-colors duration-200 focus:border-blue-500 placeholder-[#555]" />
          <input type="text" placeholder="Mã số thuế" className="bg-[#0d0d10] border border-[#27272a] rounded-lg px-[14px] py-[10px] text-white text-[13px] outline-none w-full transition-colors duration-200 focus:border-blue-500 placeholder-[#555]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" placeholder="Địa chỉ xuất hóa đơn" className="bg-[#0d0d10] border border-[#27272a] rounded-lg px-[14px] py-[10px] text-white text-[13px] outline-none w-full transition-colors duration-200 focus:border-blue-500 placeholder-[#555]" />
          <input type="email" placeholder="Email nhận hóa đơn" className="bg-[#0d0d10] border border-[#27272a] rounded-lg px-[14px] py-[10px] text-white text-[13px] outline-none w-full transition-colors duration-200 focus:border-blue-500 placeholder-[#555]" />
        </div>
      </div>

    </div>

    {/* ===== RIGHT PANEL (1/3 + STICKY) ===== */}
    <div className="lg:w-1/3 lg:sticky lg:top-6 lg:self-start space-y-4">

      {/* ===== Order Summary ===== */}
      <div className="bg-[#111115] border border-[#1a1a1e] rounded-[12px] p-5 space-y-4">
        <div className="flex justify-between text-[13px]">
          <span className="text-gray-400">Tổng tiền sản phẩm</span>
          <span className="font-bold text-white">76.374.000₫</span>
        </div>
        <div className="flex justify-between text-[13px]">
          <span className="text-gray-400">Giảm giá Flash Sale</span>
          <span className="font-bold text-red-500">-500.000₫</span>
        </div>
        <div className="border-t border-[#1a1a1e] pt-4 flex justify-between items-start">
          <span className="font-bold text-white text-sm">Cần thanh toán</span>
          <div className="text-right">
            <span className="font-black text-xl text-red-500 block leading-none">75.874.000₫</span>
            <span className="text-[10px] text-gray-500">(Đã bao gồm VAT)</span>
          </div>
        </div>
      </div>

      {/* ===== Payment Methods ===== */}
      <div className="bg-[#111115] border border-[#1a1a1e] rounded-[12px] p-5 space-y-4">
        <h3 className="font-bold text-[15px] text-white">Chọn phương thức thanh toán</h3>

        <label className="flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all border-[#27272a] hover:border-blue-500/30">
          <input type="radio" name="payment" className="w-4 h-4 accent-blue-500 cursor-pointer" />
          <div className="w-8 h-8 rounded bg-red-500/20 flex items-center justify-center text-red-500 text-sm font-bold shrink-0">đ</div>
          <span className="text-sm text-gray-300">Thanh toán khi nhận hàng</span>
        </label>

        <label className="flex items-center gap-3 px-4 py-3 rounded-lg border cursor-pointer transition-all border-blue-500/50 bg-blue-500/5">
          <input type="radio" name="payment" defaultChecked className="w-4 h-4 accent-blue-500 cursor-pointer" />
          <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center text-blue-500 text-sm shrink-0">🏦</div>
          <span className="text-sm text-white font-medium">Thanh toán bằng chuyển khoản</span>
        </label>
      </div>

      {/* ===== Action Buttons ===== */}
      <div className="space-y-3">
        <button className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          Đặt hàng
        </button>
        <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          Chọn thêm sản phẩm
        </button>
        <button className="w-full bg-[#1a1a1e] hover:bg-[#27272a] text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2 border border-[#27272a]">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Tải ảnh báo giá
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button className="w-full bg-[#1a1a1e] hover:bg-[#27272a] text-white font-medium py-3 rounded-lg transition flex items-center justify-center gap-2 border border-[#27272a] text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Tải file Excel
          </button>
          <button className="w-full bg-[#1a1a1e] hover:bg-[#27272a] text-white font-medium py-3 rounded-lg transition flex items-center justify-center gap-2 border border-[#27272a] text-sm">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            In báo giá
          </button>
        </div>
      </div>

    </div>

  </div>
</section>
        <Footer />    
    </>
  );
}
