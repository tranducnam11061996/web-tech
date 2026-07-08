'use client';

import { Eye, Trash2, ArrowUpDown } from 'lucide-react';
import { useState } from 'react';
import { ConfirmDeleteModal } from '@/components/shared/ConfirmDeleteModal';

type ProductNode = {
  id: string;
  name: string;
  sku: string;
  price: string;
  createdAt: string;
  sequence: number;
};

const MOCK_PRODUCTS: ProductNode[] = [
  { id: '1', name: 'Máy in mã vạch TSC TE 300', sku: 'INTS0004', price: '5.349.000', createdAt: '11-06-2026 15:01:04', sequence: 0 },
  { id: '2', name: 'Máy in mã vạch HPRT SL41', sku: 'INRT0045', price: '2.199.000', createdAt: '11-06-2026 15:01:04', sequence: 0 },
  { id: '3', name: 'Máy in mã vạch HPRT HT330', sku: 'INRT0043', price: '4.399.000', createdAt: '11-06-2026 15:01:04', sequence: 0 },
  { id: '4', name: 'Máy in hóa đơn ROCO Q80C', sku: 'INRC0005', price: '999.000', createdAt: '11-06-2026 15:01:04', sequence: 0 },
  { id: '5', name: 'Máy in hóa đơn Epson TM-T8', sku: 'INEP0132', price: '2.479.000', createdAt: '11-06-2026 15:01:04', sequence: 0 },
  { id: '6', name: 'Máy in nhãn Brother PT-D61', sku: 'INBR0136', price: '3.999.000', createdAt: '11-06-2026 15:01:04', sequence: 0 },
];

export function CollectionProductTable() {
  const [pendingDeleteProduct, setPendingDeleteProduct] = useState<ProductNode | null>(null);

  return (
    <div className="glass-panel border-gray-800 rounded-lg shadow-sm overflow-hidden text-sm relative z-10 flex flex-col h-full">
      <div className="overflow-x-auto custom-scrollbar flex-1">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-gray-950/80 border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider font-mono sticky top-0 z-20">
              <th className="p-4 font-bold w-12 text-center"><input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 cursor-pointer" /></th>
              <th className="p-4 font-bold min-w-[250px]"><div className="flex items-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Tên sản phẩm <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-4 font-bold text-center"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Mã sản phẩm <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-4 font-bold text-center"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Ảnh <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-4 font-bold text-center"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Giá bán <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-4 font-bold text-center"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Ngày tạo <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-4 font-bold text-center w-24"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">STT <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-4 font-bold text-center w-24">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {MOCK_PRODUCTS.map((row) => (
              <tr key={row.id} className="hover:bg-gray-800/30 transition-colors group">
                <td className="p-4 text-center align-middle">
                  <input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500 checked:border-blue-500 focus:ring-blue-500/30 transition-all cursor-pointer" />
                </td>
                <td className="p-4 font-medium text-gray-200 group-hover:text-blue-400 transition-colors cursor-pointer align-middle">{row.name}</td>
                <td className="p-4 text-center font-mono text-gray-400 align-middle">{row.sku}</td>
                <td className="p-4 text-center align-middle">
                  <div className="w-16 h-16 border border-gray-800 rounded bg-gray-950 overflow-hidden relative mx-auto group-hover:border-blue-500/50 transition-colors flex items-center justify-center">
                     {/* eslint-disable-next-line @next/next/no-img-element */}
                     <img 
                      src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mN8/x8AAuMB8DtXNJsAAAAASUVORK5CYII=" 
                      alt={row.name} 
                      className="absolute inset-0 w-full h-full object-contain p-1"
                    />
                  </div>
                </td>
                <td className="p-4 text-center font-bold text-blue-400 align-middle">{row.price}</td>
                <td className="p-4 text-center font-mono text-gray-400 align-middle">{row.createdAt}</td>
                <td className="p-4 text-center align-middle">
                  <span className="text-blue-500 hover:text-blue-400 hover:underline cursor-pointer font-mono border-b border-transparent hover:border-blue-400">{row.sequence}</span>
                </td>
                <td className="p-4 text-center align-middle">
                  <div className="flex items-center justify-center gap-2">
                    <button className="p-1.5 text-blue-400 hover:text-white hover:bg-blue-600 bg-blue-950/30 border border-blue-900/50 rounded-sm transition-all hover:shadow-[0_0_10px_rgba(59,130,246,0.5)]"><Eye className="w-4 h-4" /></button>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteProduct(row)}
                      className="p-1.5 text-red-400 hover:text-white hover:bg-red-600 bg-red-950/30 border border-red-900/50 rounded-sm transition-all hover:shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                      title="Xóa"
                      aria-label={`Xóa sản phẩm khỏi bộ sưu tập ${row.name}`}
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
          
          <button className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-500 hover:text-white hover:border-gray-600 transition-colors">&gt;</button>
          <button className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-500 hover:text-white hover:border-gray-600 transition-colors">&gt;|</button>
        </div>
      </div>

      <ConfirmDeleteModal
        open={!!pendingDeleteProduct}
        title="Chưa thể xóa sản phẩm khỏi bộ sưu tập"
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
