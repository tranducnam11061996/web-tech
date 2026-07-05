'use client';

import { Edit, Trash2, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';

type CollectionNode = {
  stt: number;
  id: string;
  name: string;
  link: string;
  productCount: number;
  createdAt: string;
};

const MOCK_COLLECTIONS: CollectionNode[] = [
  { stt: 1, id: '1994', name: 'Back to School Acer 2026', link: 'Xem trang', productCount: 47, createdAt: '19-06-2026 16:14:10' },
  { stt: 2, id: '1978', name: 'bts ngày vàng 6 Thiết bị Văn phòng', link: 'Xem trang', productCount: 6, createdAt: '11-06-2026 15:03:38' },
  { stt: 3, id: '1977', name: 'BST Ngày Vàng 6 Siêu Thị', link: 'Xem trang', productCount: 6, createdAt: '11-06-2026 15:00:42' },
  { stt: 4, id: '1976', name: 'BST Ngày Vàng 6 Tablet', link: 'Xem trang', productCount: 6, createdAt: '11-06-2026 14:56:30' },
  { stt: 5, id: '1975', name: 'BST Ngày Vàng 6 Mô hình', link: 'Xem trang', productCount: 6, createdAt: '11-06-2026 14:55:02' },
  { stt: 6, id: '1974', name: 'BST Ngày Vàng 6 Thiết bị lưu trữ', link: 'Xem trang', productCount: 6, createdAt: '11-06-2026 14:53:51' },
  { stt: 7, id: '1973', name: 'BST Ngày Vàng 6 Phụ kiện Laptop', link: 'Xem trang', productCount: 15, createdAt: '11-06-2026 14:52:26' },
  { stt: 8, id: '1972', name: 'BST Ngày Vàng 6 TV', link: 'Xem trang', productCount: 6, createdAt: '11-06-2026 14:51:13' },
  { stt: 9, id: '1971', name: 'BST Ngày Vàng 6 Chăm sóc sức khỏe', link: 'Xem trang', productCount: 6, createdAt: '11-06-2026 14:47:13' },
  { stt: 10, id: '1970', name: 'BST Ngày Vàng 6 Đồ gia dụng', link: 'Xem trang', productCount: 12, createdAt: '11-06-2026 14:45:48' },
  { stt: 11, id: '1969', name: 'BST Ngày Vàng 6 Phần mềm', link: 'Xem trang', productCount: 6, createdAt: '11-06-2026 14:44:24' },
  { stt: 12, id: '1968', name: 'BST Ngày Vàng 6 Loa', link: 'Xem trang', productCount: 12, createdAt: '11-06-2026 14:41:39' },
  { stt: 13, id: '1967', name: 'BST Ngày Vàng 6 Máy chiếu', link: 'Xem trang', productCount: 6, createdAt: '11-06-2026 14:40:50' },
  { stt: 14, id: '1966', name: 'BST Ngày Vàng 6 Máy In', link: 'Xem trang', productCount: 12, createdAt: '11-06-2026 14:35:35' },
  { stt: 15, id: '1965', name: 'BST Ngày Vàng 6 Wifi', link: 'Xem trang', productCount: 11, createdAt: '11-06-2026 14:33:28' },
  { stt: 16, id: '1964', name: 'BST Ngày Vàng 6 Thiết bị Chơi Game', link: 'Xem trang', productCount: 12, createdAt: '11-06-2026 14:32:22' },
  { stt: 17, id: '1963', name: 'BST Ngày Vàng 6 Bàn Ghế', link: 'Xem trang', productCount: 14, createdAt: '11-06-2026 14:30:56' },
  { stt: 18, id: '1962', name: 'BST Ngày Vàng 6 Linh kiện', link: 'Xem trang', productCount: 38, createdAt: '11-06-2026 14:25:45' },
  { stt: 19, id: '1961', name: 'BST Ngày Vàng 6 Bảng Vẽ', link: 'Xem trang', productCount: 12, createdAt: '11-06-2026 14:19:39' },
  { stt: 20, id: '1960', name: 'BST Ngày Vàng 6 Gear', link: 'Xem trang', productCount: 12, createdAt: '11-06-2026 14:14:32' },
];

export function CollectionTable() {
  return (
    <div className="glass-panel border-gray-800 rounded-lg shadow-sm overflow-hidden text-sm relative z-10 flex flex-col h-full">
      <div className="overflow-x-auto custom-scrollbar flex-1">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-gray-950/80 border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider font-mono sticky top-0 z-20">
              <th className="p-3 font-bold w-12 text-center"><input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 cursor-pointer" /></th>
              <th className="p-3 font-bold text-center w-16"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">STT <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center w-24"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">ID <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold min-w-[250px]"><div className="flex items-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Tên bộ sưu tập <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Link <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Số sản phẩm <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Ngày tạo <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center w-24"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Thao tác <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {MOCK_COLLECTIONS.map((row) => (
              <tr key={row.id} className="hover:bg-gray-800/30 transition-colors group">
                <td className="p-3 text-center">
                  <input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500 checked:border-blue-500 focus:ring-blue-500/30 transition-all cursor-pointer" />
                </td>
                <td className="p-3 text-center font-mono text-gray-400 font-bold">{row.stt}</td>
                <td className="p-3 text-center font-mono text-blue-400">{row.id}</td>
                <td className="p-3 font-medium text-gray-200 group-hover:text-blue-400 transition-colors cursor-pointer">{row.name}</td>
                <td className="p-3 text-center">
                  <span className="text-blue-500 hover:text-blue-400 hover:underline cursor-pointer">{row.link}</span>
                </td>
                <td className="p-3 text-center">
                  <span className="font-mono text-gray-300">{row.productCount} sp </span>
                  <Link href="/product/collection/product">
                    <span className="text-blue-500 hover:text-blue-400 hover:underline cursor-pointer">(Xem sản phẩm)</span>
                  </Link>
                </td>
                <td className="p-3 text-center font-mono text-gray-400">{row.createdAt}</td>
                <td className="p-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Link href="/product/collection-edit">
                      <button className="p-1 text-green-400 hover:text-white hover:bg-green-600 bg-green-950/30 border border-green-900/50 rounded-sm transition-all hover:shadow-[0_0_10px_rgba(34,197,94,0.5)]"><Edit className="w-3.5 h-3.5" /></button>
                    </Link>
                    <button className="p-1 text-red-400 hover:text-white hover:bg-red-600 bg-red-950/30 border border-red-900/50 rounded-sm transition-all hover:shadow-[0_0_10px_rgba(239,68,68,0.5)]"><Trash2 className="w-3.5 h-3.5" /></button>
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
          <button className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-400 hover:text-white hover:border-gray-600 transition-colors">4</button>
          <button className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-400 hover:text-white hover:border-gray-600 transition-colors">5</button>
          <span className="px-2 text-gray-600">...</span>
          <button className="w-10 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-400 hover:text-white hover:border-gray-600 transition-colors font-mono">45</button>
          
          <button className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-500 hover:text-white hover:border-gray-600 transition-colors">&gt;</button>
          <button className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-500 hover:text-white hover:border-gray-600 transition-colors">&gt;|</button>
        </div>
      </div>
    </div>
  );
}
