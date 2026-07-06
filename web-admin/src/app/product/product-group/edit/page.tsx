'use client';

import { Save, X, Plus, Trash2, Search, ListFilter, Maximize, PlusCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { AddVariantProductModal } from '@/components/product-group/AddVariantProductModal';

export default function ProductGroupEditPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="w-full h-full p-2 animate-in fade-in duration-300 overflow-y-auto custom-scrollbar relative">
      {/* Header Sticky */}
      <div className="flex justify-between items-center mb-6 sticky top-0 bg-[#0a0a0f]/90 backdrop-blur-md z-30 py-3 border-b border-gray-800/50">
        <div>
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center gap-3">
            <span className="w-2 h-8 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)]"></span>
            Quản lý biến thể sản phẩm
          </h1>
          <p className="text-gray-400 text-sm mt-1 ml-5">Tạo và quản lý các phiên bản sản phẩm khác nhau</p>
        </div>
        
        <div className="flex gap-3">
          <Link href="/product/product-group">
            <button className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 border border-gray-700 hover:border-gray-500 text-gray-300 rounded-md transition-all font-medium">
              <X className="w-4 h-4" /> Đóng
            </button>
          </Link>
          <button className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)] hover:shadow-[0_0_20px_rgba(37,99,235,0.6)] font-bold">
            <Save className="w-4 h-4" /> Lưu & Hiển thị
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 w-full h-full pb-20">
        
        {/* Section 1: Thông tin nhóm */}
        <div className="glass-panel p-6 rounded-xl border border-gray-800/80 space-y-5 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-800 to-gray-700 group-hover:from-blue-600 group-hover:to-indigo-500 transition-all duration-500"></div>
          <h2 className="text-lg font-bold text-white mb-4">Thông tin nhóm</h2>
          
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Tên nhóm <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                defaultValue="Vietmap Live Pro" 
                className="w-full bg-gray-900/80 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all" 
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Mô tả tóm tắt</label>
              <input 
                type="text" 
                placeholder="Nhập mô tả" 
                className="w-full bg-gray-900/80 border border-gray-700 rounded-lg px-4 py-2.5 text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all" 
              />
            </div>
          </div>
        </div>

        {/* Section 2: Thiết lập phân loại */}
        <div className="glass-panel p-6 rounded-xl border border-gray-800/80 space-y-6 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-800 to-gray-700 group-hover:from-purple-600 group-hover:to-pink-500 transition-all duration-500"></div>
          
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-bold text-white">Thiết lập phân loại</h2>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 hover:border-blue-500/50 rounded-lg transition-all text-sm font-bold">
              <Plus className="w-4 h-4" /> Thêm nhóm phân loại mới
            </button>
          </div>
          
          <div className="bg-gray-950/50 border border-gray-800 rounded-lg p-5 relative">
            <button className="absolute top-4 right-4 text-gray-500 hover:text-red-400 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-gray-200 mb-4">Tên phân loại 1</h3>
            
            <div className="space-y-6">
              <div className="w-full max-w-md">
                <input 
                  type="text" 
                  defaultValue="Thời gian sử dụng :" 
                  className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all" 
                />
              </div>
              
              <div className="space-y-3">
                <label className="text-sm font-medium text-gray-400">Các tùy chọn</label>
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      defaultValue="12 Tháng" 
                      className="w-48 bg-gray-900 border border-gray-700 rounded-md px-3 py-1.5 text-gray-200 focus:outline-none focus:border-blue-500 transition-all" 
                    />
                    <button className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-950/30 rounded-md transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      defaultValue="24 Tháng" 
                      className="w-48 bg-gray-900 border border-gray-700 rounded-md px-3 py-1.5 text-gray-200 focus:outline-none focus:border-blue-500 transition-all" 
                    />
                    <button className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-950/30 rounded-md transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <button className="flex items-center gap-1.5 px-3 py-1.5 text-blue-400 border border-blue-900/50 hover:bg-blue-950/30 rounded-md transition-colors text-sm">
                    <Plus className="w-4 h-4" /> Thêm tùy chọn
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Danh sách phân loại hàng */}
        <div className="glass-panel p-0 rounded-xl border border-gray-800/80 relative overflow-hidden group flex flex-col">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-800 to-gray-700 group-hover:from-emerald-600 group-hover:to-teal-500 transition-all duration-500 z-10"></div>
          
          <div className="p-6 pb-4 border-b border-gray-800/50">
            <h2 className="text-lg font-bold text-white">Danh sách phân loại hàng</h2>
          </div>
          
          <div className="p-4 bg-gray-950/30 border-b border-gray-800/50 flex justify-end gap-2 text-gray-400">
            <button className="p-2 hover:text-white hover:bg-gray-800 rounded transition-colors"><Search className="w-5 h-5" /></button>
            <button className="p-2 hover:text-white hover:bg-gray-800 rounded transition-colors"><ListFilter className="w-5 h-5" /></button>
            <button className="p-2 hover:text-white hover:bg-gray-800 rounded transition-colors"><Maximize className="w-5 h-5" /></button>
          </div>
          
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead className="bg-gray-900/80 border-b border-gray-800">
                <tr className="text-gray-300 text-sm font-bold">
                  <th className="p-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span> Thời gian sử dụng :
                  </th>
                  <th className="p-4">Sản phẩm</th>
                  <th className="p-4">Giá</th>
                  <th className="p-4 text-center w-32">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                <tr className="hover:bg-gray-800/20 transition-colors">
                  <td className="p-4 text-gray-300 font-medium">12 Tháng</td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 border border-gray-700 rounded bg-gray-900 overflow-hidden relative flex-shrink-0">
                         <Image src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mN8/x8AAuMB8DtXNJsAAAAASUVORK5CYII=" alt="product" fill className="object-cover" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-200">Phần Mềm Dẫn Đường Vietmap Live Pro 1 năm</div>
                        <div className="text-xs text-gray-500 font-mono mt-0.5">SOVI0007</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-bold text-gray-200">419,000đ</td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => setIsModalOpen(true)}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 rounded transition-all text-sm font-medium mx-auto whitespace-nowrap"
                    >
                       <PlusCircle className="w-4 h-4" /> Chọn SP
                    </button>
                  </td>
                </tr>
                <tr className="hover:bg-gray-800/20 transition-colors">
                  <td className="p-4 text-gray-300 font-medium">24 Tháng</td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 border border-gray-700 rounded bg-gray-900 overflow-hidden relative flex-shrink-0">
                         <Image src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mN8/x8AAuMB8DtXNJsAAAAASUVORK5CYII=" alt="product" fill className="object-cover" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-200">Phần Mềm Dẫn Đường Vietmap Live Pro 2 năm</div>
                        <div className="text-xs text-gray-500 font-mono mt-0.5">SOVI0008</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-bold text-gray-200">669,000đ</td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => setIsModalOpen(true)}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 rounded transition-all text-sm font-medium mx-auto whitespace-nowrap"
                    >
                       <PlusCircle className="w-4 h-4" /> Chọn SP
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <AddVariantProductModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
