'use client';

import { X, Search } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

type VariantProductModalNode = {
  id: string;
  sku: string;
  name: string;
  brand: string;
  price: string;
  marketPrice: string;
  discount: string;
  stock: number;
  warranty: string;
  hasImage: boolean;
};

const MOCK_PRODUCTS: VariantProductModalNode[] = [
  { id: '1', sku: 'LTDL0695', name: 'Laptop Dell 16 DC16250 71092481 (Core 5 120U/16GB/512GB/Win11/Office)', brand: 'DELL', price: 'VND', marketPrice: '0 VND', discount: 'Giảm undefined%', stock: 0, warranty: '12 tháng', hasImage: true },
  { id: '2', sku: 'LTDL0694', name: 'Laptop Dell 14 DC14250 71092478 (Core 7 150U/16GB/512GB/Win11/Office)', brand: 'DELL', price: 'VND', marketPrice: '0 VND', discount: 'Giảm undefined%', stock: 0, warranty: '12 tháng', hasImage: true },
  { id: '3', sku: 'LTAC1037', name: 'Laptop Acer Aspire 7 A715-59G-59RD (NH.DXUSV.00', brand: 'ACER', price: 'VND', marketPrice: '0 VND', discount: 'Giảm undefined%', stock: 0, warranty: '24 tháng (Riêng Pin, Adapter bh 12 tháng)', hasImage: true },
  { id: '4', sku: 'PCAN0042', name: 'Bộ Mini PC Asus NUC ROG RNUC15JNK9X38AA3 (Ultra)', brand: 'ASUS', price: 'VND', marketPrice: '0 VND', discount: 'Giảm undefined%', stock: 0, warranty: '36 tháng', hasImage: false },
  { id: '5', sku: 'CCKS0075', name: 'Giá đỡ cho khóa điện từ LMD-280ZL', brand: 'HÃNG KHÁC', price: 'VND', marketPrice: '799.000 VND', discount: 'Giảm undefined%', stock: 0, warranty: '0 tháng', hasImage: false },
  { id: '6', sku: 'RATG0050', name: 'RAM Laptop TeamGroup Elite (TTED416G3200C22-S0', brand: 'TEAMGROUP', price: 'VND', marketPrice: '3.990.000 VND', discount: 'Giảm undefined%', stock: 0, warranty: '36 tháng', hasImage: true },
  { id: '7', sku: 'FIRE0068', name: 'Thiết bị tường lửa FortiGate-100F kèm dịch vụ hỗ trợ', brand: 'FORTIGATE', price: 'VND', marketPrice: '0 VND', discount: 'Giảm undefined%', stock: 0, warranty: '12 Tháng', hasImage: true },
  { id: '8', sku: 'TNJA0049', name: 'Tai nghe Jabra Biz 1100 Duo QD (1119-0158)', brand: 'JABRA', price: 'VND', marketPrice: '899.000 VND', discount: 'Giảm undefined%', stock: 0, warranty: '12 tháng', hasImage: false },
  { id: '9', sku: 'LTMS0662', name: 'Laptop MSI Cyborg 15 Max C13WE-422VN (i7 13620H', brand: 'MSI', price: 'VND', marketPrice: '42.999.000 VND', discount: 'Giảm undefined%', stock: 0, warranty: '24 tháng (Riêng Pin, Adapter bh 12 tháng)', hasImage: true },
  { id: '10', sku: 'LTMS0661', name: 'Laptop MSI Cyborg 15 Max C13WF-421VN (i7 13620H', brand: 'MSI', price: 'VND', marketPrice: '44.999.000 VND', discount: 'Giảm undefined%', stock: 0, warranty: '24 tháng (Riêng Pin, Adapter bh 12 tháng)', hasImage: true },
];

export function AddVariantProductModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  
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
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Container */}
      <div className="relative w-full max-w-[1500px] max-h-[90vh] bg-gray-950 border border-gray-800 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gradient-to-r from-blue-900/40 to-blue-950/80">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-1.5 h-5 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span>
            Chọn sản phẩm cho phân loại
          </h2>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/50 rounded border border-transparent transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 bg-gray-900/50 border-b border-gray-800 flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <input 
              type="text" 
              placeholder="Nhập tìm kiếm" 
              className="w-full bg-gray-950 border border-gray-700 rounded-md pl-9 pr-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50 transition-all shadow-inner"
            />
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-2.5" />
          </div>
          <select className="flex-1 min-w-[150px] bg-gray-950 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-blue-500/50 transition-all cursor-pointer">
            <option value="">Đặc điểm sản phẩm</option>
          </select>
          <select className="flex-1 min-w-[150px] bg-gray-950 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-blue-500/50 transition-all cursor-pointer">
            <option value="">Lọc theo điều kiện</option>
          </select>
          <select className="flex-1 min-w-[150px] bg-gray-950 border border-gray-700 rounded-md px-3 py-2 text-sm text-gray-400 focus:outline-none focus:border-blue-500/50 transition-all cursor-pointer">
            <option value="">Chọn thương hiệu</option>
          </select>
          <button className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-all shadow-[0_0_10px_rgba(37,99,235,0.3)] text-sm font-medium">
            Tìm kiếm
          </button>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-auto custom-scrollbar bg-gray-950/30">
          <table className="w-full text-left border-collapse min-w-[1300px] text-sm">
            <thead className="bg-gray-900/80 sticky top-0 z-10 backdrop-blur-sm shadow-sm border-b border-gray-800">
              <tr className="text-gray-400 text-xs uppercase tracking-wider font-mono">
                <th className="p-3 font-bold">Mã sản phẩm</th>
                <th className="p-3 font-bold min-w-[250px]">Tên sản phẩm</th>
                <th className="p-3 font-bold text-center">Ảnh sản phẩm</th>
                <th className="p-3 font-bold text-center">Thương hiệu</th>
                <th className="p-3 font-bold">Giá bán</th>
                <th className="p-3 font-bold">Giá thị trường</th>
                <th className="p-3 font-bold text-center">Số lượng tồn kho</th>
                <th className="p-3 font-bold">Bảo hành</th>
                <th className="p-3 font-bold text-center w-28">Thêm sản phẩm</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {MOCK_PRODUCTS.map((row) => (
                <tr key={row.id} className="hover:bg-gray-800/40 transition-colors group">
                  <td className="p-3 align-middle">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]"></span>
                      <span className="font-mono text-gray-300 font-medium">{row.sku}</span>
                    </div>
                  </td>
                  <td className="p-3 font-medium text-gray-200 hover:text-blue-400 transition-colors cursor-pointer leading-relaxed align-middle">{row.name}</td>
                  <td className="p-3 text-center align-middle">
                    {row.hasImage ? (
                      <div className="w-14 h-10 border border-gray-700 rounded bg-gray-900 overflow-hidden relative mx-auto group-hover:border-blue-500/50 transition-colors flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mN8/x8AAuMB8DtXNJsAAAAASUVORK5CYII=" alt={row.name} className="absolute inset-0 w-full h-full object-cover" />
                      </div>
                    ) : (
                      <span className="text-xs text-gray-600 italic">Không có ảnh</span>
                    )}
                  </td>
                  <td className="p-3 text-center font-bold text-blue-500 uppercase tracking-wider text-xs align-middle">{row.brand}</td>
                  <td className="p-3 font-bold text-red-500 align-middle">{row.price}</td>
                  <td className="p-3 align-middle">
                    <span className="text-gray-300 block font-medium">{row.marketPrice}</span>
                    <span className="text-red-400 block mt-0.5 text-xs">({row.discount})</span>
                  </td>
                  <td className="p-3 text-center align-middle">
                    <span className="font-mono font-bold text-red-500">{row.stock}</span>
                  </td>
                  <td className="p-3 text-gray-400 text-xs align-middle">{row.warranty}</td>
                  <td className="p-3 text-center align-middle">
                    <button className="flex items-center justify-center w-full py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 hover:border-blue-500/50 rounded transition-all text-xs font-bold shadow-sm mx-auto">
                       Chọn
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="p-4 border-t border-gray-800 flex justify-between items-center bg-gray-950/50">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 uppercase font-mono">Số hàng hiển thị</span>
            <select className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded px-2 py-1 outline-none">
              <option>20</option>
              <option>50</option>
            </select>
          </div>
          <div className="flex items-center gap-1">
             <button className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-500 hover:text-white transition-colors">|&lt;</button>
             <button className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-500 hover:text-white transition-colors">&lt;</button>
             <button className="w-8 h-8 flex items-center justify-center border border-blue-500 bg-blue-500/20 text-blue-400 font-bold rounded-sm shadow-[0_0_10px_rgba(59,130,246,0.2)]">1</button>
             <button className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-400 hover:text-white transition-colors">2</button>
             <button className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-400 hover:text-white transition-colors">3</button>
             <button className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-400 hover:text-white transition-colors">4</button>
             <button className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-400 hover:text-white transition-colors">5</button>
             <span className="px-2 text-gray-600">...</span>
             <button className="w-10 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-400 hover:text-white font-mono transition-colors">1781</button>
             <button className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-500 hover:text-white transition-colors">&gt;</button>
             <button className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-500 hover:text-white transition-colors">&gt;|</button>
          </div>
        </div>

      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
