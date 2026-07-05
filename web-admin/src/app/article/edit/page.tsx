'use client';

import { Save, X, ExternalLink, Image as ImageIcon, UploadCloud, FolderOpen } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Image from 'next/image';

const RichTextEditor = dynamic(() => import('@/components/products/edit/RichTextEditor').then(mod => mod.RichTextEditor), {
  ssr: false,
  loading: () => <div className="h-[500px] w-full bg-gray-900 border border-gray-700 rounded-md animate-pulse flex items-center justify-center text-gray-500">Đang tải Editor...</div>
});

export default function ArticleEditPage() {
  return (
    <div className="w-full h-full p-2 animate-in fade-in duration-300 overflow-y-auto custom-scrollbar relative">
      <div className="max-w-[1600px] mx-auto pb-24 space-y-6">
        
        {/* Header & Sticky Actions */}
        <div className="flex justify-between items-center sticky top-0 bg-[#0a0a0f]/95 backdrop-blur-md z-30 py-4 border-b border-gray-800/80 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center gap-3">
              <span className="w-2 h-8 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)]"></span>
              Cập nhật bài viết
            </h1>
            <p className="text-gray-400 text-sm mt-1 ml-5">Quản lý thông tin chi tiết và nội dung của bài viết</p>
          </div>
          
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-5 py-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20 rounded-md transition-all font-medium">
              <ExternalLink className="w-4 h-4" /> Mở trang tab
            </button>
            <button className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:shadow-[0_0_20px_rgba(37,99,235,0.6)] font-bold">
              <Save className="w-4 h-4" /> Lưu
            </button>
            <Link href="/article/article-list">
              <button className="flex items-center gap-2 px-6 py-2 bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20 rounded-md transition-all font-medium">
                <X className="w-4 h-4" /> Đóng
              </button>
            </Link>
          </div>
        </div>

        {/* Categories */}
        <div className="glass-panel p-6 rounded-xl border border-gray-800/80 group">
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            Danh mục (có thể chọn nhiều danh mục) <span className="text-red-500">*</span>
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-3 gap-x-6 text-sm text-gray-300">
            <label className="flex items-center gap-2 cursor-pointer group/label"><input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500" /> <span className="group-hover/label:text-blue-400 transition-colors">Tin tức công nghệ</span></label>
            <label className="flex items-center gap-2 cursor-pointer group/label"><input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500" /> <span className="group-hover/label:text-blue-400 transition-colors">Landingpage Khuyến Mại</span></label>
            <label className="flex items-center gap-2 cursor-pointer group/label"><input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500" /> <span className="group-hover/label:text-blue-400 transition-colors">Review Sản Phẩm</span></label>
            <label className="flex items-center gap-2 cursor-pointer group/label"><input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500" /> <span className="group-hover/label:text-blue-400 transition-colors">Tư vấn phần cứng</span></label>
            
            <label className="flex items-center gap-2 cursor-pointer group/label"><input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500" /> <span className="group-hover/label:text-blue-400 transition-colors">Người HACOM</span></label>
            <label className="flex items-center gap-2 cursor-pointer group/label"><input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500" /> <span className="group-hover/label:text-blue-400 transition-colors">Download phần mềm, game</span></label>
            <label className="flex items-center gap-2 cursor-pointer group/label"><input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500" /> <span className="group-hover/label:text-blue-400 transition-colors">Sự kiện</span></label>
            <label className="flex items-center gap-2 cursor-pointer group/label"><input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500" defaultChecked /> <span className="group-hover/label:text-blue-400 transition-colors text-blue-400">Kinh nghiệm - thủ thuật</span></label>
            
            <label className="flex items-center gap-2 cursor-pointer group/label"><input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500" /> <span className="group-hover/label:text-blue-400 transition-colors">Bản Tin Công Nghệ</span></label>
            <label className="flex items-center gap-2 cursor-pointer group/label"><input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500" /> <span className="group-hover/label:text-blue-400 transition-colors">Ứng dụng. Phần mềm</span></label>
            <label className="flex items-center gap-2 cursor-pointer group/label"><input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500" /> <span className="group-hover/label:text-blue-400 transition-colors">Tin khuyến mại</span></label>
            <div></div>

            <label className="flex items-center gap-2 cursor-pointer group/label"><input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500" /> <span className="group-hover/label:text-blue-400 transition-colors">Give Away</span></label>
            <label className="flex items-center gap-2 cursor-pointer group/label"><input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500" /> <span className="group-hover/label:text-blue-400 transition-colors">Game</span></label>
            <label className="flex items-center gap-2 cursor-pointer group/label"><input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500" /> <span className="group-hover/label:text-blue-400 transition-colors">Tư vấn mua hàng</span></label>
            <div></div>

            <label className="flex items-center gap-2 cursor-pointer group/label"><input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500" /> <span className="group-hover/label:text-blue-400 transition-colors">Khuyến mại hết hạn</span></label>
            <label className="flex items-center gap-2 cursor-pointer group/label"><input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500" /> <span className="group-hover/label:text-blue-400 transition-colors">Tuyển dụng nhân sự</span></label>
            <label className="flex items-center gap-2 cursor-pointer group/label"><input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500" /> <span className="group-hover/label:text-blue-400 transition-colors">Kiến thức phần cứng</span></label>
          </div>
        </div>

        {/* Basic Info */}
        <div className="glass-panel p-6 rounded-xl border border-gray-800/80 space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-300">Tiêu đề <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              defaultValue="Cách kết nối máy in với laptop đơn giản – Hướng dẫn đầy đủ 2026"
              className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all" 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Thời gian của bài viết</label>
              <select className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500 transition-all appearance-none">
                <option value="">Thay đổi thời gian</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Thời gian ban đầu</label>
              <input 
                type="text" 
                defaultValue="19/06/2026 13:59"
                readOnly
                className="w-full bg-gray-800/50 border border-gray-700 rounded-md px-4 py-2 text-gray-400 cursor-not-allowed" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Index</label>
              <select className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500 transition-all appearance-none">
                <option value="Index">Index</option>
                <option value="NoIndex">NoIndex</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Follow</label>
              <select className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500 transition-all appearance-none">
                <option value="Follow">Follow</option>
                <option value="NoFollow">NoFollow</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Trạng thái</label>
              <select className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500 transition-all appearance-none">
                <option value="1">Cho hiển thị</option>
                <option value="0">Tạm ẩn</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Thứ tự</label>
              <input 
                type="text" 
                placeholder="Nhập thứ tự"
                className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500 transition-all" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Nổi bật</label>
              <select className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500 transition-all appearance-none">
                <option value="">Nhập nổi bật</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Mã video</label>
              <input 
                type="text" 
                placeholder="Nhập mã video"
                className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500 transition-all" 
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Url ngoại tuyến</label>
              <input 
                type="text" 
                placeholder="Nhập url ngoại tuyến"
                className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500 transition-all" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Url <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                defaultValue="cach-ket-noi-may-in-voi-laptop-don-gian"
                className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500 transition-all" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Đường dẫn yêu cầu</label>
              <input 
                type="text" 
                defaultValue="/cach-ket-noi-may-in-voi-laptop-don-gian"
                className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500 transition-all" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Băm Url</label>
              <input 
                type="text" 
                placeholder="Nhập băm Url"
                className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500 transition-all" 
              />
            </div>
          </div>
        </div>

        {/* Images */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel p-6 rounded-xl border border-gray-800/80 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Hình thu nhỏ</label>
              <div className="flex">
                <button className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-l-md text-gray-300 hover:bg-gray-700 transition-colors">
                  <ImageIcon className="w-4 h-4" /> Chọn ảnh
                </button>
                <input 
                  type="text" 
                  defaultValue="cach-ket-noi-may-in-voi-laptop-don-gian-hacom-1.jpg"
                  className="flex-1 bg-gray-900/80 border border-l-0 border-gray-700 rounded-r-md px-4 py-2 text-gray-400 cursor-not-allowed text-sm" 
                  readOnly
                />
              </div>
            </div>
            <div className="w-full h-48 bg-gray-900/50 border border-dashed border-gray-700 rounded-lg flex flex-col items-center justify-center p-2">
              <span className="text-xs text-gray-500 mb-2">Ảnh thu nhỏ hiện tại</span>
              <div className="relative w-40 h-28 border border-gray-800 rounded bg-black">
                <Image src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mN8/x8AAuMB8DtXNJsAAAAASUVORK5CYII=" alt="thumb" fill className="object-cover" />
              </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-xl border border-gray-800/80 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Hình nền</label>
              <div className="flex">
                <button className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-l-md text-gray-300 hover:bg-gray-700 transition-colors">
                  <ImageIcon className="w-4 h-4" /> Chọn tệp...
                </button>
                <input 
                  type="text" 
                  placeholder=""
                  className="flex-1 bg-gray-900/80 border border-l-0 border-gray-700 rounded-r-md px-4 py-2 text-gray-400 cursor-not-allowed text-sm" 
                  readOnly
                />
              </div>
            </div>
            <div className="w-full h-48 bg-gray-900/50 border border-dashed border-gray-700 rounded-lg flex flex-col items-center justify-center">
              <span className="text-xs text-gray-500 mb-2">Hình nền hiện tại</span>
              <div className="w-40 h-28 bg-gray-800 rounded flex items-center justify-center text-gray-600 text-sm">Chưa có ảnh</div>
            </div>
          </div>
        </div>

        {/* Tóm tắt */}
        <div className="glass-panel p-6 rounded-xl border border-gray-800/80 space-y-2">
          <label className="text-sm font-medium text-gray-300">Tóm tắt <span className="text-red-500">*</span></label>
          <textarea 
            rows={3}
            defaultValue="Hướng dẫn cách kết nối máy in với laptop Windows 10/11, Macbook chi tiết từ A-Z. Xem ngay mẹo sửa lỗi máy in nhanh chóng tại HACOM!"
            className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-4 py-3 text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all resize-none custom-scrollbar" 
          ></textarea>
          <p className="text-xs text-gray-500 font-mono">Số từ: 27 , Số kí tự: 131</p>
        </div>

        {/* Nội dung */}
        <div className="glass-panel p-6 rounded-xl border border-gray-800/80">
          <label className="text-sm font-medium text-gray-300 block mb-4">Nội dung</label>
          
          <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
            {/* Ảnh tải lên */}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 rounded text-xs font-medium transition-all">
                  <UploadCloud className="w-3.5 h-3.5" /> Tải ảnh lên
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20 rounded text-xs font-medium transition-all">
                  <FolderOpen className="w-3.5 h-3.5" /> Kho ảnh có sẵn
                </button>
                <button className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 rounded text-xs font-medium transition-all">
                  Đóng
                </button>
              </div>
              
              <div className="border border-red-500/30 bg-red-500/5 rounded p-2 text-center">
                <p className="text-red-400 text-xs font-bold">Ảnh tải lên (Mỗi lần thao tác tối đa 10 ảnh)</p>
              </div>

              <div className="h-[400px] border border-gray-700 bg-gray-900/50 rounded flex items-center justify-center">
                <p className="text-gray-500 text-sm">Bạn chưa tải lên ảnh nào !</p>
              </div>
            </div>

            {/* Rich Text */}
            <div className="space-y-2">
              <div className="border border-gray-700 rounded-md overflow-hidden">
                <RichTextEditor defaultValue="<p>Máy in bỗng không kết nối với laptop? Đây là lỗi khá phổ biến, đặc biệt sau khi cài lại Windows, thay đổi mạng WiFi hoặc lần đầu thiết lập máy in mới. HACOM hướng dẫn chi tiết toàn bộ quy trình <strong>kết nối máy in với laptop</strong> qua các phương thức USB, WiFi và mạng LAN, kèm cách xử lý những lỗi thường gặp. Áp dụng linh hoạt trên cả Windows và macOS.</p><br/><img src='#' alt='TỰ SỬA LỖI MÁY IN VĂN PHÒNG' />" />
              </div>
              <p className="text-xs text-gray-500 font-mono text-right">Số kí tự: 3483 từ</p>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="glass-panel p-6 rounded-xl border border-gray-800/80 space-y-2">
          <label className="text-sm font-medium text-gray-300">Tags (Mỗi cụm từ 1 dòng)</label>
          <textarea 
            rows={4}
            placeholder="Nhập tags"
            className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-4 py-3 text-gray-100 focus:outline-none focus:border-blue-500 transition-all resize-none custom-scrollbar" 
          ></textarea>
        </div>

        {/* Dùng cho SEO */}
        <div className="glass-panel p-6 rounded-xl border border-gray-800/80 space-y-6">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span className="w-1.5 h-4 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            Dùng cho SEO
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Tiêu đề Meta <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                defaultValue="Cách Kết Nối Máy In Với Laptop Đơn Giản 2026 | HACOM"
                className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500 transition-all" 
              />
              <p className="text-xs text-gray-500 font-mono">Số từ: 12 , Số kí tự: 52</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Từ khóa Meta <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                defaultValue="kết nối máy in với laptop, cách kết nối máy in với laptop, hướng dẫn kết nối máy in với laptop, kết nối máy in laptop Windows"
                className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500 transition-all" 
              />
              <p className="text-xs text-gray-500 font-mono">Số từ: 27 , Số kí tự: 125</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-300">Mô tả Meta <span className="text-red-500">*</span></label>
            <textarea 
              rows={3}
              defaultValue="Hướng dẫn cách kết nối máy in với laptop Windows 10/11, Macbook chi tiết từ A-Z. Xem ngay mẹo sửa lỗi máy in nhanh chóng tại HACOM!"
              className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-4 py-3 text-gray-100 focus:outline-none focus:border-blue-500 transition-all resize-none custom-scrollbar" 
            ></textarea>
            <p className="text-xs text-gray-500 font-mono">Số từ: 27 , Số kí tự: 131 (Khuyến nghị: 160 ký tự)</p>
          </div>
        </div>

      </div>
    </div>
  );
}
