'use client';

import { Save, X, Upload, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

export default function BannerEditPage() {
  return (
    <div className="w-full h-full p-2 animate-in fade-in duration-300 overflow-y-auto custom-scrollbar relative">
      <div className="max-w-[1200px] mx-auto pb-24 space-y-6">

        {/* Header Sticky */}
        <div className="flex justify-between items-center sticky top-0 bg-[#0a0a0f]/95 backdrop-blur-md z-30 py-4 border-b border-gray-800/80 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center gap-3">
              <span className="w-2 h-8 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)]"></span>
              Cập nhật Banner
            </h1>
            <p className="text-gray-400 text-sm mt-1 ml-5">Quản lý nội dung và vị trí hiển thị của banner</p>
          </div>

          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:shadow-[0_0_20px_rgba(37,99,235,0.6)] font-bold">
              <Save className="w-4 h-4" /> Lưu
            </button>
            <Link href="/banner/banner-list">
              <button className="flex items-center gap-2 px-6 py-2 bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20 rounded-md transition-all font-medium">
                <X className="w-4 h-4" /> Đóng
              </button>
            </Link>
          </div>
        </div>

        {/* Vị trí Banner */}
        <div className="glass-panel p-6 rounded-xl border border-gray-800/80 space-y-2">
          <label className="text-sm font-medium text-gray-300">Vị trí Banner <span className="text-red-500">*</span></label>
          <select className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-4 py-2.5 text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all appearance-none cursor-pointer">
            <option value="slider-trang-chu">Banner slider trang chủ - template 2024</option>
            <option value="sidebar">Sidebar</option>
            <option value="footer">Footer</option>
          </select>
        </div>

        {/* Danh mục cho banner */}
        <div className="glass-panel p-6 rounded-xl border border-gray-800/80 space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="w-1.5 h-4 bg-cyan-500 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.8)]"></span>
            Hãy chọn danh mục cho banner
          </h2>
          <div className="space-y-3 text-sm text-gray-300 pl-2">
            <label className="flex items-center gap-3 cursor-pointer group">
              <span className="text-gray-600 text-xs">+</span>
              <input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500" />
              <span className="group-hover:text-blue-400 transition-colors">Quà Tặng Khuyến Mãi</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <span className="text-gray-600 text-xs">+</span>
              <input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500" />
              <span className="group-hover:text-blue-400 transition-colors">Sản phẩm AI</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <span className="text-gray-600 text-xs">+</span>
              <input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500" />
              <span className="group-hover:text-blue-400 transition-colors">Giảm giá trực tiếp</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <span className="text-gray-600 text-xs">+</span>
              <input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500" />
              <span className="group-hover:text-blue-400 transition-colors text-blue-400">Thu Cũ Đổi Mới, Lên Đời</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <span className="text-gray-600 text-xs">+</span>
              <input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500" />
              <span className="group-hover:text-blue-400 transition-colors text-blue-400">Dịch Vụ Sửa Chữa, Lắp Đặt</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <span className="text-gray-600 text-xs">+</span>
              <input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500" />
              <span className="group-hover:text-blue-400 transition-colors text-blue-400">Thiết Bị Mô Phỏng, Mô Hình</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <span className="text-gray-600 text-xs">+</span>
              <input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500" />
              <span className="group-hover:text-blue-400 transition-colors">Linh Kiện Tân Nước Thanh Lý</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer group">
              <span className="text-gray-600 text-xs">+</span>
              <input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500" />
              <span className="group-hover:text-blue-400 transition-colors">Gợi ý của HACOM</span>
            </label>
          </div>
        </div>

        {/* Tên banner */}
        <div className="glass-panel p-6 rounded-xl border border-gray-800/80 space-y-2">
          <label className="text-sm font-medium text-gray-300">Tên banner <span className="text-red-500">*</span></label>
          <input
            type="text"
            defaultValue="Ngày vàng - Giảm sốc"
            className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-4 py-2.5 text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
          />
        </div>

        {/* Ảnh đại diện */}
        <div className="glass-panel p-6 rounded-xl border border-gray-800/80 space-y-5">
          <label className="text-sm font-medium text-gray-300">Ảnh đại diện</label>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload */}
            <div className="space-y-4">
              <div className="flex">
                <button className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-l-md text-gray-300 hover:bg-gray-700 transition-colors">
                  <Upload className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  defaultValue="Silde-trang-chu-ngay-vang.png"
                  className="flex-1 bg-gray-900/80 border border-l-0 border-gray-700 rounded-r-md px-4 py-2 text-gray-400 cursor-not-allowed text-sm"
                  readOnly
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">Hoặc dán link ảnh có sẵn</label>
                <input
                  type="text"
                  placeholder="Dán link ảnh tại đây..."
                  className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-4 py-2.5 text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
                />
              </div>
            </div>

            {/* Preview */}
            <div className="flex items-center justify-center">
              <div className="relative w-full max-w-[400px] h-36 bg-gray-900/50 border border-dashed border-gray-700 rounded-lg overflow-hidden flex items-center justify-center">
                <Image src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mN8/x8AAuMB8DtXNJsAAAAASUVORK5CYII=" alt="banner preview" fill className="object-cover opacity-30" />
                <span className="relative z-10 text-gray-500 text-xs font-mono">Ảnh preview banner</span>
              </div>
            </div>
          </div>
        </div>

        {/* Địa chỉ URL đích */}
        <div className="glass-panel p-6 rounded-xl border border-gray-800/80 space-y-2">
          <label className="text-sm font-medium text-gray-300">Địa chỉ URL đích <span className="text-red-500">*</span></label>
          <input
            type="text"
            defaultValue="https://hacom.vn/ngay-vang-giam-soc"
            className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-4 py-2.5 text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
          />
        </div>

        {/* Thứ tự + Loại hiển thị */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel p-6 rounded-xl border border-gray-800/80 space-y-2">
            <label className="text-sm font-medium text-gray-300">Thứ tự hiển thị <span className="text-red-500">*</span></label>
            <input
              type="number"
              defaultValue={10035}
              className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-4 py-2.5 text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
            />
          </div>
          <div className="glass-panel p-6 rounded-xl border border-gray-800/80 space-y-2">
            <label className="text-sm font-medium text-gray-300">Loại hiển thị <span className="text-red-500">*</span></label>
            <select className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-4 py-2.5 text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all appearance-none cursor-pointer">
              <option value="always">Luôn hiển thị, chỉ ẩn khi hạ bằng tay</option>
              <option value="schedule">Theo lịch</option>
            </select>
          </div>
        </div>

        {/* Hiển thị + Khác */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel p-6 rounded-xl border border-gray-800/80 space-y-2">
            <label className="text-sm font-medium text-gray-300">Hiển thị <span className="text-red-500">*</span></label>
            <select className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-4 py-2.5 text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all appearance-none cursor-pointer">
              <option value="1">Hiển thị</option>
              <option value="0">Không hiển thị</option>
            </select>
          </div>
          <div className="glass-panel p-6 rounded-xl border border-gray-800/80 space-y-2">
            <label className="text-sm font-medium text-gray-300">Khác</label>
            <select className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-4 py-2.5 text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all appearance-none cursor-pointer">
              <option value="mobile">Hiển thị tại mobile</option>
              <option value="desktop">Hiển thị tại desktop</option>
              <option value="all">Hiển thị tất cả</option>
            </select>
          </div>
        </div>

      </div>
    </div>
  );
}
