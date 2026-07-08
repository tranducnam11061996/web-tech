'use client';

import { Edit, Trash2, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import { ConfirmDeleteModal } from '@/components/shared/ConfirmDeleteModal';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type BannerNode = {
  id: number;
  name: string;
  stt: number;
  visible: boolean;
  fromDate: string;
  toDate: string;
};

const MOCK_BANNERS: BannerNode[] = [
  { id: 5900, name: 'Ngày vàng - Giảm sốc', stt: 10035, visible: true, fromDate: '', toDate: '' },
  { id: 7240, name: 'Khuyến Mãi - Mùa World Cup', stt: 10028, visible: true, fromDate: '', toDate: '' },
  { id: 7227, name: 'Give Away - Bộ PC 5060', stt: 10026, visible: true, fromDate: '', toDate: '' },
  { id: 4836, name: 'Windows - Office Bản Quyền', stt: 10024, visible: true, fromDate: '', toDate: '' },
  { id: 7043, name: 'Linh Kiện - Giảm Thêm', stt: 10022, visible: true, fromDate: '', toDate: '' },
  { id: 7702, name: 'UPGRADE NOW WITH NVIDIA', stt: 10015, visible: true, fromDate: '', toDate: '' },
  { id: 6880, name: 'Tuần lễ vàng LENOVO 3', stt: 10010, visible: false, fromDate: '', toDate: '' },
];

export function BannerListTable() {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [pendingDeleteBanner, setPendingDeleteBanner] = useState<BannerNode | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const closeDeleteModal = () => {
    if (busyId !== null) return;
    setPendingDeleteBanner(null);
    setDeleteError('');
  };

  const deleteBanner = async () => {
    const banner = pendingDeleteBanner;
    if (!banner) return;
    setBusyId(banner.id);
    setDeleteError('');
    try {
      const response = await fetch(`/api/admin/banners/${banner.id}?mode=permanent`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể xóa banner');
      setPendingDeleteBanner(null);
      router.refresh();
    } catch (error: any) {
      setDeleteError(error.message || 'Không thể xóa banner');
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
              <th className="p-3 font-bold w-12 text-center">
                <input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 cursor-pointer" />
              </th>
              <th className="p-3 font-bold w-32">
                <div className="flex items-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Mã banner <ArrowUpDown className="w-3 h-3 text-gray-600" /></div>
              </th>
              <th className="p-3 font-bold min-w-[250px]">
                <div className="flex items-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Tên banner <ArrowUpDown className="w-3 h-3 text-gray-600" /></div>
              </th>
              <th className="p-3 font-bold text-center w-32">
                <div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Banner <ArrowUpDown className="w-3 h-3 text-gray-600" /></div>
              </th>
              <th className="p-3 font-bold text-center">
                <div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Đường dẫn</div>
              </th>
              <th className="p-3 font-bold text-center">
                <div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">STT / Trạng thái <ArrowUpDown className="w-3 h-3 text-gray-600" /></div>
              </th>
              <th className="p-3 font-bold text-center">
                <div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Từ ngày <ArrowUpDown className="w-3 h-3 text-gray-600" /></div>
              </th>
              <th className="p-3 font-bold text-center">
                <div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Đến ngày <ArrowUpDown className="w-3 h-3 text-gray-600" /></div>
              </th>
              <th className="p-3 font-bold text-center w-24">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {MOCK_BANNERS.map((row) => (
              <tr key={row.id} className="hover:bg-gray-800/30 transition-colors group">
                <td className="p-3 text-center align-middle">
                  <input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500 checked:border-blue-500 focus:ring-blue-500/30 transition-all cursor-pointer" />
                </td>
                <td className="p-3 align-middle">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${row.visible ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.8)]' : 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]'}`}></span>
                    <span className="font-bold text-gray-200 font-mono">{row.id}</span>
                  </div>
                </td>
                <td className="p-3 font-medium text-gray-200 group-hover:text-blue-400 transition-colors cursor-pointer align-middle">
                  {row.name}
                </td>
                <td className="p-3 text-center align-middle">
                  <div className="w-20 h-12 bg-gray-900 border border-gray-700 rounded overflow-hidden relative mx-auto group-hover:border-blue-500/50 transition-colors">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mN8/x8AAuMB8DtXNJsAAAAASUVORK5CYII=" alt={row.name} className="absolute inset-0 w-full h-full object-cover" />
                  </div>
                </td>
                <td className="p-3 text-center align-middle">
                  <a href="#" className="text-blue-400 hover:text-blue-300 hover:underline transition-colors text-xs whitespace-nowrap">Xem trang banner</a>
                </td>
                <td className="p-3 text-center align-middle">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="font-bold text-blue-400 font-mono">STT: {row.stt}</span>
                    <span className={`text-xs font-bold uppercase tracking-wider ${row.visible ? 'text-green-400' : 'text-red-400'}`}>
                      {row.visible ? 'HIỂN THỊ' : 'KHÔNG HIỂN THỊ'}
                    </span>
                  </div>
                </td>
                <td className="p-3 text-center font-mono text-gray-400 align-middle whitespace-nowrap">
                  {row.fromDate || ''}
                </td>
                <td className="p-3 text-center font-mono text-gray-400 align-middle whitespace-nowrap">
                  {row.toDate || ''}
                </td>
                <td className="p-3 text-center align-middle">
                  <div className="flex items-center justify-center gap-2">
                    <Link href="/banner/edit">
                      <button className="p-1.5 text-green-400 hover:text-white hover:bg-green-600 bg-green-950/30 border border-green-900/50 rounded-sm transition-all hover:shadow-[0_0_10px_rgba(34,197,94,0.5)]" title="Chỉnh sửa">
                        <Edit className="w-4 h-4" />
                      </button>
                    </Link>
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => {
                        setPendingDeleteBanner(row);
                        setDeleteError('');
                      }}
                      className="p-1.5 text-red-400 hover:text-white hover:bg-red-600 bg-red-950/30 border border-red-900/50 rounded-sm transition-all hover:shadow-[0_0_10px_rgba(239,68,68,0.5)] disabled:opacity-50"
                      title="Xóa"
                      aria-label={`Xóa banner ${row.name}`}
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
          <button className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-400 hover:text-white hover:border-gray-600 transition-colors font-mono">47</button>

          <button className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-500 hover:text-white hover:border-gray-600 transition-colors">&gt;</button>
          <button className="w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm text-gray-500 hover:text-white hover:border-gray-600 transition-colors">&gt;|</button>
        </div>
      </div>

      <ConfirmDeleteModal
        open={!!pendingDeleteBanner}
        title="Xóa vĩnh viễn banner?"
        description="Hành động này sẽ xóa banner và dữ liệu danh mục áp dụng của banner."
        itemName={pendingDeleteBanner?.name}
        details={[
          { label: 'ID', value: pendingDeleteBanner?.id },
          { label: 'STT', value: pendingDeleteBanner?.stt },
        ]}
        error={deleteError}
        loading={busyId !== null}
        onCancel={closeDeleteModal}
        onConfirm={deleteBanner}
      />
    </div>
  );
}
