'use client';

import { Search, ArrowUpDown } from 'lucide-react';
import clsx from 'clsx';

const MOCK_SERVICES = [
  { stt: 1, sku: 'BHLT0016', name: 'Gói Bảo Hành 2 năm nhà sản xuất + 1 năm BHMR của Laptop có mức giá bán >25 triệu đến <=30 triệu', time: '24', priceOrigin: '1.269.000 đ', priceFrom: '25.000.000', priceTo: '29.999.000', status: 'HIỂN THỊ', link: '', cat: '159,1087', note: '' },
  { stt: 2, sku: 'BHLT0036', name: 'Gói Bảo Hành 2 năm nhà sản xuất + 2 năm BHMR của Laptop có mức giá bán >25 triệu đến <=30 triệu', time: '24', priceOrigin: '1.989.000 đ', priceFrom: '25.000.000', priceTo: '29.999.000', status: 'HIỂN THỊ', link: '', cat: '159,1087', note: '' },
  { stt: 3, sku: 'BHLT0046', name: 'Gói Bảo Hành 1 đổi 1 của Laptop có mức giá bán >25 triệu đến <=30 triệu', time: '12,24', priceOrigin: '1.379.000 đ', priceFrom: '25.000.000', priceTo: '29.999.000', status: 'HIỂN THỊ', link: '', cat: '159,1087', note: '' },
];

export function TabServices() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center gap-4 mb-6">
        <div className="relative w-96 group">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500 group-focus-within:text-red-500 transition-colors" />
          <input type="text" placeholder="Từ khóa tìm kiếm..." className="w-full pl-9 pr-3 py-2 bg-gray-900 border border-gray-700 rounded-sm text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/30 transition-all shadow-inner" />
        </div>
        <button className="bg-blue-600 hover:bg-blue-500 border border-blue-500 text-white rounded-sm px-6 py-2 flex items-center justify-center gap-2 text-sm font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(37,99,235,0.4)]">
          Tìm kiếm
        </button>
      </div>

      <div className="glass-panel border-gray-800 rounded-lg shadow-sm overflow-hidden text-sm">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-950/80 border-b border-gray-800 text-gray-400 text-[10px] uppercase tracking-wider font-mono">
                <th className="p-3 font-bold whitespace-nowrap"><div className="flex items-center gap-1 cursor-pointer hover:text-red-400">STT <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
                <th className="p-3 font-bold whitespace-nowrap"><div className="flex items-center gap-1 cursor-pointer hover:text-red-400">Mã sản phẩm <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
                <th className="p-3 font-bold min-w-[300px]"><div className="flex items-center gap-1 cursor-pointer hover:text-red-400">Tên sản phẩm <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
                <th className="p-3 font-bold whitespace-nowrap"><div className="flex items-center gap-1 cursor-pointer hover:text-red-400">Thời gian bảo hành <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
                <th className="p-3 font-bold whitespace-nowrap"><div className="flex items-center gap-1 cursor-pointer hover:text-red-400">Giá gốc <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
                <th className="p-3 font-bold whitespace-nowrap"><div className="flex items-center gap-1 cursor-pointer hover:text-red-400">Giá từ <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
                <th className="p-3 font-bold whitespace-nowrap"><div className="flex items-center gap-1 cursor-pointer hover:text-red-400">Giá đến <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
                <th className="p-3 font-bold whitespace-nowrap"><div className="flex items-center gap-1 cursor-pointer hover:text-red-400">Trạng thái <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
                <th className="p-3 font-bold whitespace-nowrap"><div className="flex items-center gap-1 cursor-pointer hover:text-red-400">Link cho khách hàng <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
                <th className="p-3 font-bold whitespace-nowrap"><div className="flex items-center gap-1 cursor-pointer hover:text-red-400">Danh mục áp dụng <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
                <th className="p-3 font-bold whitespace-nowrap"><div className="flex items-center gap-1 cursor-pointer hover:text-red-400">Ghi chú <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {MOCK_SERVICES.map((srv, idx) => (
                <tr key={idx} className="hover:bg-gray-800/30 transition-colors group text-xs">
                  <td className="p-3 text-gray-300 font-bold">{srv.stt}</td>
                  <td className="p-3">
                    <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-sm border border-blue-500/20 font-mono">● {srv.sku}</span>
                  </td>
                  <td className="p-3 font-medium text-gray-200 group-hover:text-red-400 transition-colors cursor-pointer leading-tight">
                    {srv.name}
                  </td>
                  <td className="p-3 text-gray-400 font-mono">{srv.time}</td>
                  <td className="p-3 text-gray-300 font-mono text-right">{srv.priceOrigin}</td>
                  <td className="p-3 text-gray-400 font-mono text-right">{srv.priceFrom}</td>
                  <td className="p-3 text-gray-400 font-mono text-right">{srv.priceTo}</td>
                  <td className="p-3 text-center">
                    <div className={clsx(
                      "inline-block px-2 py-0.5 rounded-sm text-[10px] font-bold text-white uppercase tracking-wider",
                      srv.status === 'ẨN' ? "bg-red-950/50 text-red-400 border border-red-900" : "bg-green-950/50 text-green-400 border border-green-900"
                    )}>
                      {srv.status}
                    </div>
                  </td>
                  <td className="p-3 text-gray-500">{srv.link}</td>
                  <td className="p-3 text-gray-400 font-mono">{srv.cat}</td>
                  <td className="p-3 text-gray-500">{srv.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-gray-950/50 border-t border-gray-800 flex items-center justify-end gap-4 text-sm">
          <span className="text-gray-500 font-mono text-xs uppercase tracking-wider">Hiển thị</span>
          <select className="bg-gray-900 border border-gray-700 rounded-sm px-2 py-1 text-gray-300 focus:outline-none">
            <option>20</option>
          </select>
          
          <div className="flex items-center gap-1 ml-4">
            <button className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-500 hover:text-white transition-colors">&lt;</button>
            <button className="w-8 h-8 flex items-center justify-center border border-blue-500 bg-blue-500/20 text-blue-400 rounded-sm font-bold shadow-[0_0_10px_rgba(59,130,246,0.2)]">1</button>
            <button className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-500 hover:text-white transition-colors">&gt;</button>
          </div>
        </div>
      </div>
    </div>
  );
}
