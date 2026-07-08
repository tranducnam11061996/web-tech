'use client';

import { Edit, Trash2, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import { ConfirmDeleteModal } from '@/components/shared/ConfirmDeleteModal';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type VariantGroupNode = {
  stt: number;
  id: string;
  name: string;
  updater: string;
  createdAt: string;
  updatedAt: string;
  description: string;
};

const MOCK_GROUPS: VariantGroupNode[] = [
  { stt: 1, id: '1', name: 'Vietmap Live Pro', updater: 'dinh-1347', createdAt: '13-05-2026 11:07:23', updatedAt: '13-05-2026 11:29:15', description: '' },
  { stt: 2, id: '2', name: 'Bộ Phím chuột không dây Logitech MK250', updater: 'Bùi Viết Linh', createdAt: '10-08-2025 22:40:13', updatedAt: '28-07-2025 09:43:17', description: '' },
  { stt: 3, id: '3', name: 'Màn hình DELL U', updater: 'Bùi Văn Dương', createdAt: '10-08-2025 22:40:13', updatedAt: '16-07-2025 10:51:17', description: '' },
  { stt: 4, id: '4', name: 'Rapoo MT560', updater: 'Bùi Viết Linh', createdAt: '10-08-2025 22:40:13', updatedAt: '14-06-2025 09:01:45', description: '' },
  { stt: 5, id: '5', name: 'Chuột không dây Rapoo M300 Silent', updater: 'Bùi Viết Linh', createdAt: '10-08-2025 22:40:13', updatedAt: '13-06-2025 09:17:00', description: '' },
  { stt: 6, id: '6', name: 'ITtest', updater: 'Miles Tester', createdAt: '10-08-2025 22:40:13', updatedAt: '10-06-2025 17:19:37', description: '' },
  { stt: 7, id: '7', name: 'Camera IP Wifi TP-Link Tapo', updater: 'Bùi Viết Linh', createdAt: '10-08-2025 22:40:13', updatedAt: '22-05-2025 09:42:21', description: '' },
  { stt: 8, id: '8', name: 'Bàn phím HE Logitech PRO X TKL RAPID', updater: 'Bùi Viết Linh', createdAt: '10-08-2025 22:40:13', updatedAt: '13-05-2025 23:47:53', description: '' },
  { stt: 9, id: '9', name: 'Kaspersky', updater: 'Bùi Viết Linh', createdAt: '10-08-2025 22:40:13', updatedAt: '12-05-2025 13:21:09', description: '' },
  { stt: 10, id: '10', name: 'Chuột gaming không dây EDRA EM608W', updater: 'Bùi Viết Linh', createdAt: '10-08-2025 22:40:13', updatedAt: '02-05-2025 16:29:32', description: '' },
  { stt: 11, id: '11', name: 'Bàn phím cơ gaming có dây EDRA EK316', updater: 'Bùi Viết Linh', createdAt: '10-08-2025 22:40:13', updatedAt: '02-05-2025 16:17:06', description: '' },
  { stt: 12, id: '12', name: 'Bàn phím cơ game Edra EK387FL', updater: 'Bùi Viết Linh', createdAt: '10-08-2025 22:40:13', updatedAt: '02-05-2025 15:34:02', description: '' },
  { stt: 13, id: '13', name: 'Bàn phím Keychron V1', updater: 'Bùi Viết Linh', createdAt: '10-08-2025 22:40:13', updatedAt: '24-04-2025 16:34:02', description: '' },
  { stt: 14, id: '14', name: 'Bộ lưu điện Hikvision', updater: 'Bùi Viết Linh', createdAt: '10-08-2025 22:40:13', updatedAt: '24-04-2025 08:42:31', description: '' },
  { stt: 15, id: '15', name: 'DELL Latitude 7420', updater: 'Bùi Văn Dương', createdAt: '10-08-2025 22:40:13', updatedAt: '23-04-2025 15:33:05', description: '' },
  { stt: 16, id: '16', name: 'Loa Bluetooth Ultimate Ears Wonderboom 2', updater: 'Bùi Văn Dương', createdAt: '10-08-2025 22:40:13', updatedAt: '18-04-2025 11:10:31', description: '' },
  { stt: 17, id: '17', name: 'CAMERA WIFI EZVIZ', updater: 'Bùi Viết Linh', createdAt: '10-08-2025 22:40:13', updatedAt: '11-04-2025 16:00:59', description: '' },
  { stt: 18, id: '18', name: 'HDD SkyHawk Likenew', updater: 'Bùi Văn Dương', createdAt: '10-08-2025 22:40:13', updatedAt: '09-04-2025 12:00:14', description: '' },
  { stt: 19, id: '19', name: 'HDD Seagate Likenew', updater: 'Bùi Văn Dương', createdAt: '10-08-2025 22:40:13', updatedAt: '09-04-2025 11:49:28', description: '' },
  { stt: 20, id: '20', name: 'Bàn phím Keychron V3M', updater: 'Bùi Viết Linh', createdAt: '10-08-2025 22:40:13', updatedAt: '08-04-2025 14:44:38', description: '' },
];

export function ProductGroupTable() {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingDeleteGroup, setPendingDeleteGroup] = useState<VariantGroupNode | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const closeDeleteModal = () => {
    if (busyId !== null) return;
    setPendingDeleteGroup(null);
    setDeleteError('');
  };

  const deleteGroup = async () => {
    const group = pendingDeleteGroup;
    if (!group) return;
    setBusyId(group.id);
    setDeleteError('');
    try {
      const response = await fetch(`/api/admin/product-groups/${group.id}?mode=permanent`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể xóa nhóm sản phẩm');
      setPendingDeleteGroup(null);
      router.refresh();
    } catch (error: any) {
      setDeleteError(error.message || 'Không thể xóa nhóm sản phẩm');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="glass-panel border-gray-800 rounded-lg shadow-sm overflow-hidden text-sm relative z-10 flex flex-col h-full">
      <div className="overflow-x-auto custom-scrollbar flex-1">
        <table className="w-full text-left border-collapse min-w-[1200px]">
          <thead>
            <tr className="bg-gray-950/80 border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider font-mono sticky top-0 z-20">
              <th className="p-3 font-bold w-12 text-center"><input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 cursor-pointer" /></th>
              <th className="p-3 font-bold text-center w-16"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">STT <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold min-w-[300px]"><div className="flex items-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Danh sách biến thể sản phẩm <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Người cập nhật <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Ngày tạo <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Ngày cập nhật <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Mô tả tóm tắt <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center w-24">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {MOCK_GROUPS.map((row) => (
              <tr key={row.id} className="hover:bg-gray-800/30 transition-colors group">
                <td className="p-3 text-center">
                  <input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500 checked:border-blue-500 focus:ring-blue-500/30 transition-all cursor-pointer" />
                </td>
                <td className="p-3 text-center font-mono font-bold text-gray-400">{row.stt}</td>
                <td className="p-3 font-medium text-gray-200 group-hover:text-blue-400 transition-colors cursor-pointer">{row.name}</td>
                <td className="p-3 text-center text-gray-300">{row.updater}</td>
                <td className="p-3 text-center font-mono text-gray-400">{row.createdAt}</td>
                <td className="p-3 text-center font-mono text-gray-400">{row.updatedAt}</td>
                <td className="p-3 text-center text-gray-500 italic">{row.description || '-'}</td>
                <td className="p-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Link href="/product-group/edit">
                      <button className="p-1.5 text-green-400 hover:text-white hover:bg-green-600 bg-green-950/30 border border-green-900/50 rounded-sm transition-all hover:shadow-[0_0_10px_rgba(34,197,94,0.5)]"><Edit className="w-4 h-4" /></button>
                    </Link>
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => {
                        setPendingDeleteGroup(row);
                        setDeleteError('');
                      }}
                      className="p-1.5 text-red-400 hover:text-white hover:bg-red-600 bg-red-950/30 border border-red-900/50 rounded-sm transition-all hover:shadow-[0_0_10px_rgba(239,68,68,0.5)] disabled:opacity-50"
                      title="Xóa"
                      aria-label={`Xóa nhóm sản phẩm ${row.name}`}
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
          <button className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-400 hover:text-white hover:border-gray-600 transition-colors">4</button>
          <button className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-400 hover:text-white hover:border-gray-600 transition-colors">5</button>
          <span className="px-2 text-gray-600">...</span>
          <button className="w-10 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-400 hover:text-white hover:border-gray-600 transition-colors font-mono">100</button>
          
          <button className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-500 hover:text-white hover:border-gray-600 transition-colors">&gt;</button>
          <button className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-500 hover:text-white hover:border-gray-600 transition-colors">&gt;|</button>
        </div>
      </div>

      <ConfirmDeleteModal
        open={!!pendingDeleteGroup}
        title="Xóa vĩnh viễn nhóm sản phẩm?"
        description="Hành động này sẽ xóa nhóm sản phẩm, các thuộc tính cấu hình và liên kết sản phẩm trong nhóm."
        itemName={pendingDeleteGroup?.name}
        details={[
          { label: 'ID', value: pendingDeleteGroup?.id },
          { label: 'Người cập nhật', value: pendingDeleteGroup?.updater },
        ]}
        error={deleteError}
        loading={busyId !== null}
        onCancel={closeDeleteModal}
        onConfirm={deleteGroup}
      />
    </div>
  );
}
