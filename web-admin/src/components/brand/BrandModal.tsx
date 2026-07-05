'use client';

import { X, Check, Upload } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

type BrandModalProps = {
  isOpen: boolean;
  onClose: () => void;
  isEdit?: boolean;
  initialData?: any; // Just for mock
};

export function BrandModal({ isOpen, onClose, isEdit = false, initialData }: BrandModalProps) {
  
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-[800px] max-h-[90vh] bg-[#0a0a0f] border border-gray-800 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gradient-to-r from-blue-900/50 to-blue-950">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-1.5 h-5 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span>
            {isEdit ? 'Chỉnh sửa thương hiệu' : 'Thêm mới thương hiệu'}
          </h2>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/50 rounded border border-transparent transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Tên thương hiệu <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                defaultValue={initialData?.name || ''}
                className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner" 
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-300">Thứ tự xuất hiện</label>
                <input 
                  type="text" 
                  placeholder="Nhập thứ tự"
                  className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-300">Nổi bật</label>
                <select className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner appearance-none cursor-pointer">
                  <option value="">Chọn</option>
                  <option value="1">Có</option>
                  <option value="0">Không</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-300">Trạng thái</label>
                <select className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner appearance-none cursor-pointer">
                  <option value="Hoạt động">Hoạt động</option>
                  <option value="Tạm khóa">Tạm khóa</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Logo thương hiệu <span className="text-red-500">*</span></label>
              <div className="flex">
                <button className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-l-md text-gray-300 hover:bg-gray-700 transition-colors">
                  <Upload className="w-4 h-4" />
                </button>
                <input 
                  type="text" 
                  placeholder="Chọn logo"
                  className="flex-1 bg-gray-900/80 border border-l-0 border-gray-700 rounded-r-md px-4 py-2 text-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner cursor-not-allowed" 
                  readOnly
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Mô tả tóm tắt</label>
              <textarea 
                rows={4}
                placeholder="Nhập tóm tắt"
                className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-4 py-3 text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner resize-none custom-scrollbar" 
              ></textarea>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-800/80 space-y-4">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <span className="w-1 h-4 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
              Dùng cho SEO
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-300">Tiêu đề</label>
                <input 
                  type="text" 
                  placeholder="Nhập tiêu đề"
                  className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner" 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-300">Từ khoá</label>
                <input 
                  type="text" 
                  placeholder="Nhập từ khoá"
                  className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner" 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-300">Mô tả</label>
              <input 
                type="text" 
                placeholder="Nhập mô tả"
                className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner" 
              />
            </div>
          </div>

        </div>
        
        {/* Footer Actions */}
        <div className="p-4 border-t border-gray-800 flex justify-center gap-4 bg-gray-950/80">
          <button className="flex items-center gap-2 px-6 py-2 bg-blue-600/20 text-blue-400 border border-blue-600/50 hover:bg-blue-600 hover:text-white rounded-md transition-all font-bold shadow-[0_0_10px_rgba(37,99,235,0.2)]">
            <Check className="w-4 h-4" /> Lưu
          </button>
          <button 
            onClick={onClose}
            className="flex items-center gap-2 px-6 py-2 bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20 rounded-md transition-all font-medium"
          >
            <X className="w-4 h-4" /> Đóng
          </button>
        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
