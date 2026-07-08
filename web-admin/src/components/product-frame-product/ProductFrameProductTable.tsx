'use client';

import { Eye, Trash2, ArrowUpDown } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDeleteModal } from '@/components/shared/ConfirmDeleteModal';

type FrameProductNode = {
  stt: number;
  id: string;
  sku: string;
  name: string;
  price: string;
  stock: number;
};

const MOCK_PRODUCTS: FrameProductNode[] = [
  { stt: 1, id: '1', sku: 'CPUA0211', name: 'CPU AMD Ryzen 3 3200G (3.6 GHz Upto 4.0 GHz / 6MB / 4 Cores, 4 Threads / Radeon Vega 8 / 65W / Socket AM4)', price: '1.899.000', stock: 1 },
  { stt: 2, id: '2', sku: 'CPUA0212', name: 'CPU AMD Ryzen 5 3400G (3.7 GHz Upto 4.2 GHz / 6MB / 4 Cores, 8 Threads / Radeon Vega 11 / 65W / Socket AM4)', price: '2.199.000', stock: 1 },
  { stt: 3, id: '3', sku: 'CPUA0226', name: 'CPU AMD Athlon 3000G (3.5GHz, 2 nhân 4 luồng , 5MB Cache, 35W) - Socket AMD AM4', price: '1.299.000', stock: 1 },
  { stt: 4, id: '4', sku: 'CPUA0245', name: 'CPU AMD Ryzen 5 5600X (3.7 GHz Upto 4.6GHz / 35MB / 6 Cores, 12 Threads / 65W / Socket AM4)', price: '3.699.000', stock: 1 },
  { stt: 5, id: '5', sku: 'CPUA0253', name: 'CPU AMD Ryzen 5 5600G (3.9GHz Upto 4.4GHz / 19MB / 6 Cores, 12 Threads / 65W / Socket AM4)', price: '4.099.000', stock: 1 },
  { stt: 6, id: '6', sku: 'CPUI0446', name: 'CPU Intel Core i7-12700F (Up to 4.8Ghz, 12 nhân 20 luồng, 25MB Cache, 125W, Socket Intel LGA)', price: '7.799.000', stock: 1 },
];

export function ProductFrameProductTable() {
  const [pendingDeleteProduct, setPendingDeleteProduct] = useState<FrameProductNode | null>(null);

  return (
    <div className="glass-panel border-gray-800 rounded-lg shadow-sm overflow-hidden text-sm relative z-10 flex flex-col h-full">
      <div className="overflow-x-auto custom-scrollbar flex-1">
        <table className="w-full text-left border-collapse min-w-[1100px]">
          <thead>
            <tr className="bg-gray-950/80 border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider font-mono sticky top-0 z-20">
              <th className="p-4 font-bold w-12 text-center"><input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 cursor-pointer" /></th>
              <th className="p-4 font-bold text-center w-16">STT</th>
              <th className="p-4 font-bold"><div className="flex items-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Mã sản phẩm <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-4 font-bold text-center"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Ảnh sản phẩm <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-4 font-bold min-w-[300px]"><div className="flex items-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Tên sản phẩm <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-4 font-bold"><div className="flex items-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Giá bán <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-4 font-bold text-center"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Tồn kho <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-4 font-bold text-center w-24">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {MOCK_PRODUCTS.map((row) => (
              <tr key={row.id} className="hover:bg-gray-800/30 transition-colors group">
                <td className="p-4 text-center align-middle">
                  <input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500 checked:border-blue-500 focus:ring-blue-500/30 transition-all cursor-pointer" />
                </td>
                <td className="p-4 text-center font-mono font-bold text-gray-400 align-middle">{row.stt}</td>
                <td className="p-4 align-middle">
                  <div className="flex items-center gap-2 border border-gray-700 bg-gray-900/50 rounded-md px-3 py-1 w-fit">
                    <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
                    <span className="font-mono text-gray-300 font-medium">{row.sku}</span>
                  </div>
                </td>
                <td className="p-4 text-center align-middle">
                  <div className="w-16 h-16 border border-gray-800 rounded bg-gray-950 overflow-hidden relative mx-auto group-hover:border-blue-500/50 transition-colors flex items-center justify-center p-1">
                     {/* eslint-disable-next-line @next/next/no-img-element */}
                     <img 
                      src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mN8/x8AAuMB8DtXNJsAAAAASUVORK5CYII=" 
                      alt="CPU Image" 
                      className="absolute inset-0 w-full h-full object-contain"
                    />
                  </div>
                </td>
                <td className="p-4 font-medium text-gray-200 group-hover:text-blue-400 transition-colors cursor-pointer align-middle leading-relaxed">{row.name}</td>
                <td className="p-4 font-bold text-gray-200 align-middle">{row.price}</td>
                <td className="p-4 text-center font-mono font-bold text-gray-400 align-middle">{row.stock}</td>
                <td className="p-4 text-center align-middle">
                  <div className="flex items-center justify-center gap-2">
                    <button className="p-1.5 text-blue-400 hover:text-white hover:bg-blue-600 bg-blue-950/30 border border-blue-900/50 rounded-sm transition-all hover:shadow-[0_0_10px_rgba(59,130,246,0.5)]"><Eye className="w-4 h-4" /></button>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteProduct(row)}
                      className="p-1.5 text-red-400 hover:text-white hover:bg-red-600 bg-red-950/30 border border-red-900/50 rounded-sm transition-all hover:shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                      title="Xóa"
                      aria-label={`Xóa sản phẩm khỏi khung ${row.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 bg-gray-950/50 border-t border-gray-800 flex flex-wrap items-center justify-between gap-4 text-sm mt-auto">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 font-mono text-xs uppercase tracking-wider">Số hàng hiển thị</span>
          <select className="bg-gray-900 border border-gray-700 rounded-sm px-2 py-1 text-gray-300 focus:outline-none focus:border-blue-500/50">
            <option>20</option>
            <option>50</option>
            <option>100</option>
          </select>
        </div>
        
        <div className="flex items-center gap-1">
          <button className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-500 hover:text-white hover:border-gray-600 transition-colors">|&lt;</button>
          <button className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-500 hover:text-white hover:border-gray-600 transition-colors">&lt;</button>
          
          <button className="w-8 h-8 flex items-center justify-center border border-blue-500 bg-blue-500/20 text-blue-400 rounded-sm font-bold shadow-[0_0_10px_rgba(59,130,246,0.2)]">1</button>
          <button className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-400 hover:text-white hover:border-gray-600 transition-colors">2</button>
          <button className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-400 hover:text-white hover:border-gray-600 transition-colors">3</button>
          
          <button className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-500 hover:text-white hover:border-gray-600 transition-colors">&gt;</button>
          <button className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-500 hover:text-white hover:border-gray-600 transition-colors">&gt;|</button>
        </div>
      </div>

      <ConfirmDeleteModal
        open={!!pendingDeleteProduct}
        title="Chưa thể xóa sản phẩm khỏi khung"
        description="Màn này hiện đang dùng dữ liệu mock và chưa được kết nối backend xóa thật. Hệ thống sẽ không thực hiện xóa giả."
        itemName={pendingDeleteProduct?.name}
        details={[
          { label: 'ID', value: pendingDeleteProduct?.id },
          { label: 'SKU', value: pendingDeleteProduct?.sku },
        ]}
        confirmDisabled
        confirmLabel="Chưa hỗ trợ"
        onCancel={() => setPendingDeleteProduct(null)}
        onConfirm={() => undefined}
      />
    </div>
  );
}
