'use client';

import { X, Search, Filter, Box, Tag, SortAsc, Plus } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

type ProductModalNode = {
  id: string;
  name: string;
  sku: string;
  brand: string;
  price: string;
  hasImage: boolean;
};

const MOCK_PRODUCTS: ProductModalNode[] = [
  { id: '1', name: 'Laptop Acer Aspire 7 A715-59G-59RD (NH.D)', sku: 'LTAC1037', brand: 'ACER', price: 'vnd', hasImage: false },
  { id: '2', name: 'Bộ Mini PC Asus NUC ROG RNUC15JNK9X38', sku: 'PCAN0042', brand: 'ASUS', price: 'vnd', hasImage: false },
  { id: '3', name: 'Giá đỡ cho khóa điện từ LMD-280ZL', sku: 'CCKS0075', brand: 'HÃNG KHÁC', price: 'vnd', hasImage: false },
  { id: '4', name: 'RAM Laptop TeamGroup Elite (TTED416G320)', sku: 'RATG0050', brand: 'TEAMGROUP', price: 'vnd', hasImage: false },
  { id: '5', name: 'Thiết bị tường lửa FortiGate-100F kèm dịch v', sku: 'FIRE0068', brand: 'FORTIGATE', price: 'vnd', hasImage: true },
  { id: '6', name: 'Tai nghe Jabra Biz 1100 Duo QD (1119-0158)', sku: 'TNJA0049', brand: 'JABRA', price: '699.000 vnd', hasImage: false },
  { id: '7', name: 'Laptop MSI Cyborg 15 Max C13WE-422VN (i7)', sku: 'LTMS0662', brand: 'MSI', price: '41.999.000 vnd', hasImage: true },
  { id: '8', name: 'Laptop MSI Cyborg 15 Max C13WF-421VN (i7)', sku: 'LTMS0661', brand: 'MSI', price: '44.499.000 vnd', hasImage: true },
  { id: '9', name: 'Laptop MSI Crosshair 16 HX E14WFK-074VN', sku: 'LTMS0660', brand: 'MSI', price: '55.499.000 vnd', hasImage: true },
];

export function AddProductModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  
  // Prevent body scroll when modal is open
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
      <div className="relative w-full max-w-6xl max-h-[90vh] bg-gray-950 border border-gray-800 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gradient-to-r from-blue-900/50 to-blue-950">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-1.5 h-5 bg-blue-400 rounded-full shadow-[0_0_10px_rgba(96,165,250,0.8)]"></span>
            Chọn sản phẩm vào bộ sưu tập
          </h2>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/50 rounded border border-transparent transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 bg-gray-900/50 border-b border-gray-800 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="text" placeholder="Nhập tìm kiếm" className="w-full bg-gray-950 border border-gray-800 rounded-md pl-9 pr-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50" />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <select className="w-full bg-gray-950 border border-gray-800 rounded-md pl-9 pr-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 appearance-none">
                <option>Đặc điểm sản phẩm</option>
              </select>
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <select className="w-full bg-gray-950 border border-gray-800 rounded-md pl-9 pr-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 appearance-none">
                <option>Xét theo điều kiện</option>
              </select>
            </div>
            <div className="relative">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <select className="w-full bg-gray-950 border border-gray-800 rounded-md pl-9 pr-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 appearance-none">
                <option>Xem theo thương hiệu</option>
              </select>
            </div>
            <div className="relative">
              <SortAsc className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <select className="w-full bg-gray-950 border border-gray-800 rounded-md pl-9 pr-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 appearance-none">
                <option>Sắp xếp theo thứ tự hiển thị</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Box className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <select className="w-full bg-gray-950 border border-gray-800 rounded-md pl-9 pr-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 appearance-none">
                <option>Loại</option>
              </select>
            </div>
            <button className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-all text-sm font-medium shadow-[0_0_10px_rgba(37,99,235,0.2)]">
              <Search className="w-4 h-4" /> Tìm kiếm
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-auto custom-scrollbar bg-gray-950/30">
          <table className="w-full text-left border-collapse min-w-[1000px] text-sm">
            <thead className="bg-gray-900/80 sticky top-0 z-10 backdrop-blur-sm shadow-sm border-b border-gray-800">
              <tr className="text-gray-400 text-xs uppercase tracking-wider font-mono">
                <th className="p-3 font-bold w-12 text-center">STT</th>
                <th className="p-3 font-bold min-w-[250px]">Tên sản phẩm</th>
                <th className="p-3 font-bold">Mã sản phẩm</th>
                <th className="p-3 font-bold text-center">Ảnh</th>
                <th className="p-3 font-bold text-center">Thương hiệu</th>
                <th className="p-3 font-bold">Giá bán</th>
                <th className="p-3 font-bold">Giảm giá</th>
                <th className="p-3 font-bold">Số lượng tồn kho</th>
                <th className="p-3 font-bold text-center w-32">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {MOCK_PRODUCTS.map((row) => (
                <tr key={row.id} className="hover:bg-gray-800/40 transition-colors group">
                  <td className="p-3 text-center font-mono font-bold text-gray-500 group-hover:text-gray-300">{row.id}</td>
                  <td className="p-3 font-medium text-blue-400 hover:underline cursor-pointer leading-relaxed">{row.name}</td>
                  <td className="p-3 font-mono text-gray-400">{row.sku}</td>
                  <td className="p-3 text-center">
                    {row.hasImage ? (
                      <div className="w-14 h-10 border border-gray-700 rounded bg-gray-900 overflow-hidden relative mx-auto group-hover:border-blue-500/50 transition-colors flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mN8/x8AAuMB8DtXNJsAAAAASUVORK5CYII=" alt={row.name} className="absolute inset-0 w-full h-full object-cover" />
                      </div>
                    ) : (
                      <span className="text-xs text-gray-600 italic">Không có ảnh</span>
                    )}
                  </td>
                  <td className="p-3 text-center font-bold text-blue-500 uppercase tracking-wider text-xs">{row.brand}</td>
                  <td className="p-3 font-bold text-red-400">{row.price}</td>
                  <td className="p-3 text-xs">
                    <span className="text-red-400 block font-medium">Giảm giá: 0%</span>
                    <span className="text-gray-500 block mt-0.5">so với giá gốc</span>
                  </td>
                  <td className="p-3 text-xs">
                    <span className="text-gray-300 block">Số lượng tổng:</span>
                    <span className="text-blue-400 block mt-0.5 font-medium">còn hàng</span>
                  </td>
                  <td className="p-3 text-center">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/30 text-emerald-400 border border-emerald-900 hover:bg-emerald-900/50 hover:border-emerald-500/50 rounded transition-all text-xs font-bold shadow-sm mx-auto">
                      <Plus className="w-3.5 h-3.5" /> Chọn sản phẩm
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
