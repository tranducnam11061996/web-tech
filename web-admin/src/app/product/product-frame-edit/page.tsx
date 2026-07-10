import { Save, X, Upload } from 'lucide-react';
import Link from 'next/link';

export default function ProductFrameEditPage() {
  return (
    <div className="w-full h-full p-2 animate-in fade-in duration-300 overflow-y-auto custom-scrollbar relative">
      <div className="flex justify-between items-center mb-4 sticky top-0 bg-[#0a0a0f]/90 backdrop-blur-md z-20 py-2 border-b border-gray-800/50">
        <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500 flex items-center gap-3">
          <span className="w-1.5 h-6 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span>
          Chỉnh sửa khung sản phẩm
        </h1>
        <div className="flex gap-3">
          <Link href="/product/product-frame">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-700 hover:border-gray-500 text-gray-300 rounded-md transition-all">
              <X className="w-4 h-4" /> Đóng
            </button>
          </Link>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] hover:shadow-[0_0_20px_rgba(37,99,235,0.5)]">
            <Save className="w-4 h-4" /> Lưu
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 w-full h-full pb-20 mt-6">
        
        <div className="glass-panel p-6 rounded-lg border border-gray-800/50 space-y-6">
          <h2 className="text-lg font-bold text-gray-200 mb-6 flex items-center gap-2">
            <span className="w-1 h-4 bg-blue-500 rounded-full"></span> Thông tin chi tiết khung
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Tên bộ sưu tập <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                defaultValue="Sticker GIÁ SỐC 2025" 
                className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Class CSS <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                defaultValue="sticker2025-giasoc" 
                className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner font-mono text-sm" 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">Vị trí khung <span className="text-red-500">*</span></label>
              <select className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner cursor-pointer">
                <option value="right">Bên phải</option>
                <option value="left">Bên trái</option>
                <option value="bottom">Bên dưới</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-300">URL ảnh CDN <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  defaultValue="https://cdn-files.hacom.vn/hacom/cdn/Media/Image/CollectionFrame/1" 
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner font-mono text-xs" 
                />
                <button className="bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 hover:border-gray-600 px-3 py-2 rounded-md transition-colors flex items-center justify-center">
                  <Upload className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
