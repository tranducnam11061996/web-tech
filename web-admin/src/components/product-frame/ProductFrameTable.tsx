'use client';

import { Edit, Trash2, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ConfirmDeleteModal } from '@/components/shared/ConfirmDeleteModal';

type FrameNode = {
  stt: number;
  id: string;
  name: string;
  cssClass: string;
  imageLink: string;
  position: string;
  productCount: number;
  createdAt: string;
};

const MOCK_FRAMES: FrameNode[] = [
  { stt: 1, id: '1152', name: 'Vòng Quay May Mắn - Gia Dụng 05 2026', cssClass: 'vqmm-giadung-05-2026', imageLink: 'Xem ảnh', position: 'Bên dưới', productCount: 154, createdAt: '15-05-2026 17:25:41' },
  { stt: 2, id: '1151', name: 'Vòng Quay May Mắn - Gear 05 2026', cssClass: 'vqmm-gear-05-2026', imageLink: 'Xem ảnh', position: 'Bên dưới', productCount: 990, createdAt: '15-05-2026 17:23:46' },
  { stt: 3, id: '1150', name: 'Vòng Quay May Mắn - TB Game - 05 2026', cssClass: 'vqmm-tb-game-05-2026', imageLink: 'Xem ảnh', position: 'Bên dưới', productCount: 886, createdAt: '15-05-2026 17:21:50' },
  { stt: 4, id: '1149', name: 'Vòng Quay May Mắn - Màn Hình - 05 2026', cssClass: 'vqmm-manhinh-05-2026', imageLink: 'Xem ảnh', position: 'Bên dưới', productCount: 1199, createdAt: '15-05-2026 17:11:03' },
  { stt: 5, id: '1148', name: 'Vòng Quay May Mắn - PC - 05 2026', cssClass: 'vqmm-pc-05-2026', imageLink: 'Xem ảnh', position: 'Bên dưới', productCount: 332, createdAt: '15-05-2026 17:09:41' },
  { stt: 6, id: '1147', name: 'Vòng Quay May Mắn - Laptop - 05 2026', cssClass: 'vqmm-laptop-05-2026', imageLink: 'Xem ảnh', position: 'Bên dưới', productCount: 708, createdAt: '15-05-2026 17:08:07' },
  { stt: 7, id: '1145', name: 'Khung tháng 4 - PC MSI tặng Màn', cssClass: 'khung-thang-04-pc-msi-tang-man', imageLink: 'Xem ảnh', position: 'Bên dưới', productCount: 0, createdAt: '22-04-2026 14:19:07' },
  { stt: 8, id: '1136', name: 'Độc Quyền Tại Việt Nam', cssClass: 'doc-quyen-tai-viet-nam', imageLink: 'Xem ảnh', position: 'Bên dưới', productCount: 1, createdAt: '07-04-2026 17:16:25' },
  { stt: 9, id: '1019', name: 'Giá Sốc RAM SSD', cssClass: 'gia-soc-ram-ssd', imageLink: 'Xem ảnh', position: 'Bên dưới', productCount: 68, createdAt: '10-03-2026 17:36:36' },
  { stt: 10, id: '829', name: 'Khung CPU Giảm Nửa Giá', cssClass: 'cpu-giam-nua-gia-hacom', imageLink: 'Xem ảnh', position: 'Bên dưới', productCount: 58, createdAt: '05-02-2026 11:45:33' },
  { stt: 11, id: '828', name: 'Khung Bảo Hành 12 Tháng - TrucTiepGAME', cssClass: 'bao-hanh-12-thang-hacom', imageLink: 'Xem ảnh', position: 'Bên dưới', productCount: 15, createdAt: '05-02-2026 11:34:23' },
  { stt: 12, id: '827', name: 'Bán và Phân Phối Tại Việt Nam', cssClass: 'ban-va-phan-phoi-tai-viet-nam', imageLink: 'Xem ảnh', position: 'Bên dưới', productCount: 0, createdAt: '05-02-2026 11:29:38' },
  { stt: 13, id: '283', name: 'Sticker GIÁ SỐC 2025', cssClass: 'sticker2025-giasoc', imageLink: 'Xem ảnh', position: 'Bên phải', productCount: 0, createdAt: '09-10-2025 17:51:36' },
  { stt: 14, id: '282', name: 'Sticker HOT 2025', cssClass: 'sticker2025-hot', imageLink: 'Xem ảnh', position: 'Bên trái', productCount: 0, createdAt: '09-10-2025 17:50:28' },
  { stt: 15, id: '281', name: 'Sticker TrucTiepGAME Phân Phối', cssClass: 'sticker2025-hacomphanphoi', imageLink: 'Xem ảnh', position: 'Bên phải', productCount: 0, createdAt: '09-10-2025 17:49:32' },
];

export function ProductFrameTable() {
  const [pendingDeleteFrame, setPendingDeleteFrame] = useState<FrameNode | null>(null);

  return (
    <div className="glass-panel border-gray-800 rounded-lg shadow-sm overflow-hidden text-sm relative z-10 flex flex-col h-full">
      <div className="overflow-x-auto custom-scrollbar flex-1">
        <table className="w-full text-left border-collapse min-w-[1200px]">
          <thead>
            <tr className="bg-gray-950/80 border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider font-mono sticky top-0 z-20">
              <th className="p-3 font-bold w-12 text-center"><input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 cursor-pointer" /></th>
              <th className="p-3 font-bold text-center w-16"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">STT <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center w-24"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">ID <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold min-w-[250px]"><div className="flex items-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Tên bộ sưu tập <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold min-w-[200px]"><div className="flex items-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Class CSS <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Ảnh khung <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Vị trí khung <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Số sản phẩm <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Ngày tạo <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center w-24">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {MOCK_FRAMES.map((row) => (
              <tr key={row.id} className="hover:bg-gray-800/30 transition-colors group">
                <td className="p-3 text-center">
                  <input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500 checked:border-blue-500 focus:ring-blue-500/30 transition-all cursor-pointer" />
                </td>
                <td className="p-3 text-center font-mono text-gray-400 font-bold">{row.stt}</td>
                <td className="p-3 text-center font-mono text-blue-400">{row.id}</td>
                <td className="p-3 font-medium text-gray-200 group-hover:text-blue-400 transition-colors cursor-pointer">{row.name}</td>
                <td className="p-3 font-mono text-gray-400 text-xs">{row.cssClass}</td>
                <td className="p-3 text-center">
                  <span className="text-blue-500 hover:text-blue-400 hover:underline cursor-pointer">{row.imageLink}</span>
                </td>
                <td className="p-3 text-center text-gray-300">{row.position}</td>
                <td className="p-3 text-center">
                  <span className="font-mono text-gray-300">{row.productCount} sp </span>
                  <Link href="/product/product-frame/product">
                    <span className="text-blue-500 hover:text-blue-400 hover:underline cursor-pointer">(Xem sản phẩm)</span>
                  </Link>
                </td>
                <td className="p-3 text-center font-mono text-gray-400">{row.createdAt}</td>
                <td className="p-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Link href="/product/product-frame-edit">
                      <button className="p-1.5 text-green-400 hover:text-white hover:bg-green-600 bg-green-950/30 border border-green-900/50 rounded-sm transition-all hover:shadow-[0_0_10px_rgba(34,197,94,0.5)]"><Edit className="w-4 h-4" /></button>
                    </Link>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteFrame(row)}
                      className="p-1.5 text-red-400 hover:text-white hover:bg-red-600 bg-red-950/30 border border-red-900/50 rounded-sm transition-all hover:shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                      title="Xóa"
                      aria-label={`Xóa khung sản phẩm ${row.name}`}
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
        open={!!pendingDeleteFrame}
        title="Chưa thể xóa khung sản phẩm"
        description="Màn này hiện đang dùng dữ liệu mock và chưa được kết nối backend xóa thật. Hệ thống sẽ không thực hiện xóa giả."
        itemName={pendingDeleteFrame?.name}
        details={[{ label: 'ID', value: pendingDeleteFrame?.id }]}
        confirmDisabled
        confirmLabel="Chưa hỗ trợ"
        onCancel={() => setPendingDeleteFrame(null)}
        onConfirm={() => undefined}
      />
    </div>
  );
}
