'use client';

import { X, Plus } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

type FrameProductModalNode = {
  id: string;
  name: string;
  sku: string;
  brand: string;
  price: string;
  warranty: string;
  hasImage: boolean;
};

const MOCK_PRODUCTS: FrameProductModalNode[] = [
  { id: '2', name: 'Laptop Dell 14 DC14250 71092478 (Core 7 150U/16GB/512GB/Win11/Office)', sku: 'LTDL0694', brand: 'DELL', price: 'vnd', warranty: '12 tháng', hasImage: true },
  { id: '3', name: 'Laptop Acer Aspire 7 A715-59G-59RD (NH.D)', sku: 'LTAC1037', brand: 'ACER', price: 'vnd', warranty: '24 tháng (Riêng Pin & Sạc bh 12 tháng)', hasImage: true },
  { id: '4', name: 'Bộ Mini PC Asus NUC ROG RNUC15JNK9X38', sku: 'PCAN0042', brand: 'ASUS', price: 'vnd', warranty: '36 tháng', hasImage: false },
  { id: '5', name: 'Giá đỡ cho khóa điện từ LMD-280ZL', sku: 'CCKS0075', brand: 'HÃNG KHÁC', price: '529.000 vnd', warranty: '0 tháng', hasImage: false },
  { id: '6', name: 'RAM Laptop TeamGroup Elite (TTED416G320)', sku: 'RATG0050', brand: 'TEAMGROUP', price: '3.290.000 vnd', warranty: '36 tháng', hasImage: true },
  { id: '7', name: 'Thiết bị tường lửa FortiGate-100F kèm dịch vụ', sku: 'FIRE0068', brand: 'FORTIGATE', price: 'vnd', warranty: '12 Tháng', hasImage: true },
  { id: '8', name: 'Tai nghe Jabra Biz 1100 Duo QD (1119-0158)', sku: 'TNJA0049', brand: 'JABRA', price: '699.000 vnd', warranty: '12 tháng', hasImage: false },
  { id: '9', name: 'Laptop MSI Cyborg 15 Max C13WE-422VN (i7)', sku: 'LTMS0662', brand: 'MSI', price: '41.999.000 vnd', warranty: '24 tháng (Riêng Pin & Sạc bh 12 tháng)', hasImage: true },
  { id: '10', name: 'Laptop MSI Cyborg 15 Max C13WF-421VN (i7)', sku: 'LTMS0661', brand: 'MSI', price: '44.499.000 vnd', warranty: '24 tháng (Riêng Pin & Sạc bh 12 tháng)', hasImage: true },
];

export function AddFrameProductModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  
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
      <div className="relative w-full max-w-[1400px] max-h-[90vh] bg-gray-950 border border-gray-800 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gradient-to-r from-blue-900/50 to-blue-950">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-1.5 h-5 bg-blue-400 rounded-full shadow-[0_0_10px_rgba(96,165,250,0.8)]"></span>
            Chọn sản phẩm vào khung
          </h2>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/50 rounded border border-transparent transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-auto custom-scrollbar bg-gray-950/30">
          <table className="w-full text-left border-collapse min-w-[1300px] text-sm">
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
                <th className="p-3 font-bold">Thông tin bảo hành</th>
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
                  <td className="p-3 text-xs">
                    <span className="text-gray-400 block">Thời hạn: <span className="text-blue-400 font-medium">{row.warranty}</span></span>
                  </td>
                  <td className="p-3 text-center">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/30 text-emerald-400 border border-emerald-900 hover:bg-emerald-900/50 hover:border-emerald-500/50 rounded transition-all text-xs font-bold shadow-sm mx-auto">
                       Chọn sản phẩm
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
