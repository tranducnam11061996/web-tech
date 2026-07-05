import { RichTextEditor } from '@/components/products/edit/RichTextEditor';
import { Save, X, Image as ImageIcon, Upload } from 'lucide-react';
import Link from 'next/link';

export default function CollectionEditPage() {
  return (
    <div className="w-full h-full p-2 animate-in fade-in duration-300 overflow-y-auto custom-scrollbar relative">
      <div className="flex justify-between items-center mb-4 sticky top-0 bg-[#0a0a0f]/90 backdrop-blur-md z-20 py-2 border-b border-gray-800/50">
        <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500 flex items-center gap-3">
          <span className="w-1.5 h-6 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span>
          Chỉnh sửa Bộ sưu tập
        </h1>
        <div className="flex gap-3">
          <Link href="/products/collection">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-700 hover:border-gray-500 text-gray-300 rounded-md transition-all">
              <X className="w-4 h-4" /> Đóng
            </button>
          </Link>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_20px_rgba(37,99,235,0.5)]">
            <Save className="w-4 h-4" /> Lưu
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 max-w-[1200px] mx-auto pb-20">
        
        {/* Section 1: Thông tin cơ bản */}
        <div className="glass-panel p-6 rounded-lg border border-gray-800/50 space-y-5">
          <h2 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-blue-500 rounded-full"></span> Thông tin cơ bản
          </h2>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Tên bộ sưu tập <span className="text-red-500">*</span></label>
              <input type="text" defaultValue="Back to School Acer 2026" className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Link <span className="text-red-500">*</span></label>
              <input type="text" defaultValue="bst-bts-acer-2026" className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Trạng thái <span className="text-red-500">*</span></label>
              <select className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner cursor-pointer">
                <option>Hiện</option>
                <option>Ẩn</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-300">Bộ sưu tập cha</label>
              <select className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner cursor-pointer">
                <option>Chọn bộ sưu tập cha</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Hiển thị Landing Page */}
        <div className="glass-panel p-6 rounded-lg border border-gray-800/50 space-y-5">
          <h2 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-purple-500 rounded-full"></span> Hiển thị Landing Page
          </h2>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Banner cho landing page</label>
              <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-md p-1">
                <span className="bg-gray-800 text-gray-400 px-3 py-1 rounded text-xs truncate flex-1">Banner-Acer-2026.png</span>
                <button className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-xs transition-colors flex items-center gap-1"><Upload className="w-3 h-3"/> Tải lên</button>
              </div>
            </div>
            <div className="h-32 border border-dashed border-gray-700 rounded-md flex flex-col items-center justify-center bg-gradient-to-br from-green-900/40 to-blue-900/40 group hover:border-blue-500/50 transition-colors relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://via.placeholder.com/400x150/004400/00ff00?text=BACK+TO+SCHOOL')] bg-cover bg-center opacity-70"></div>
                <div className="relative z-10 flex flex-col items-center">
                  <ImageIcon className="w-8 h-8 text-white/70 group-hover:text-white transition-colors mb-2 drop-shadow-md" />
                  <span className="text-xs text-white font-bold drop-shadow-md bg-black/50 px-2 py-1 rounded">Ảnh đại diện hiện tại</span>
                </div>
            </div>
          </div>

          <div className="space-y-1 pt-2">
            <label className="text-sm font-medium text-gray-300">Link "Xem thêm" cho Landing page</label>
            <input type="text" placeholder="Nhập link seeMoreUrl" className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner" />
          </div>

          <div className="flex items-center gap-10 pt-4">
            <div className="flex items-center gap-2">
              <input type="checkbox" className="w-4 h-4 rounded bg-gray-900 border-gray-700 text-blue-500 focus:ring-blue-500/30 cursor-pointer" />
              <label className="text-sm text-gray-300">Không đồng bộ giá</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" className="w-4 h-4 rounded bg-gray-900 border-gray-700 text-blue-500 focus:ring-blue-500/30 cursor-pointer" />
              <label className="text-sm text-gray-300">Không đồng bộ tồn kho</label>
            </div>
          </div>
        </div>

        {/* Section 3: Nội dung chi tiết */}
        <div className="glass-panel p-6 rounded-lg border border-gray-800/50 space-y-5">
          <h2 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-green-500 rounded-full"></span> Nội dung
          </h2>
          
          <RichTextEditor 
            title="" 
            defaultValue="<p>Chương trình Back to School Acer 2026 mang đến...</p>"
            minHeight="400px"
            id="collection-content"
          />
        </div>

        {/* Section 4: Cấu hình SEO */}
        <div className="glass-panel p-6 rounded-lg border border-gray-800/50 space-y-5">
          <h2 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
            <span className="w-1 h-4 bg-yellow-500 rounded-full"></span> Dùng cho SEO
          </h2>

          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between items-end mb-1">
                <label className="text-sm font-medium text-gray-300">Tiêu đề Meta <span className="text-red-500">*</span></label>
                <span className="text-xs text-gray-500">Số từ: <strong className="text-gray-300">11</strong>, Số kí tự: <strong className="text-gray-300">48</strong></span>
              </div>
              <input type="text" defaultValue="Back to School Acer 2026 - Ưu Đãi Laptop Học Tập" className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner" />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-end mb-1">
                <label className="text-sm font-medium text-gray-300">Từ khóa Meta <span className="text-red-500">*</span></label>
                <span className="text-xs text-gray-500">Số từ: <strong className="text-gray-300">44</strong>, Số kí tự: <strong className="text-gray-300">242</strong></span>
              </div>
              <textarea 
                defaultValue="Back to School Acer 2026, Acer Back to School 2026, ưu đãi laptop Acer, laptop sinh viên," 
                className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner min-h-[80px]"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-end mb-1">
                <label className="text-sm font-medium text-gray-300">Mô tả Meta <span className="text-red-500">*</span></label>
              </div>
              <textarea 
                defaultValue="Khám phá chương trình Back to School Acer 2026 với nhiều ưu đãi hấp dẫn cho laptop học tập, văn phòng và gaming dành cho học sinh, sinh viên." 
                className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner min-h-[100px]"
              />
              <div className="text-xs text-gray-500 mt-2">Số từ: <strong className="text-gray-300">29</strong>, Số kí tự: <strong className="text-gray-300">141</strong> (Khuyến nghị: 160 ký tự)</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
