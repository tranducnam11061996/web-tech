'use client';

import { Edit, Trash2, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import { ConfirmDeleteModal } from '@/components/shared/ConfirmDeleteModal';
import { Pagination } from '@/components/shared/Pagination';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export type CollectionNode = {
  id: number;
  name: string;
  url: string;
  productCount: number;
  storedProductCount: number;
  createdAt: string;
  status: number;
  ordering: number;
};

type PaginationData = {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
};

export function CollectionTable({ collections, pagination }: { collections: CollectionNode[]; pagination: PaginationData }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [pendingDeleteCollection, setPendingDeleteCollection] = useState<CollectionNode | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const closeDeleteModal = () => {
    if (busyId !== null) return;
    setPendingDeleteCollection(null);
    setDeleteError('');
  };

  const deleteCollection = async () => {
    const collection = pendingDeleteCollection;
    if (!collection) return;
    setBusyId(collection.id);
    setDeleteError('');
    try {
      const response = await fetch(`/api/admin/collections/${collection.id}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể xóa bộ sưu tập');
      setPendingDeleteCollection(null);
      router.refresh();
    } catch (error: any) {
      setDeleteError(error.message || 'Không thể xóa bộ sưu tập');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="glass-panel border-gray-800 rounded-lg shadow-sm overflow-hidden text-sm relative z-10 flex flex-col h-full">
      <div className="overflow-x-auto custom-scrollbar flex-1">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-gray-950/80 border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider font-mono sticky top-0 z-20">
              <th className="p-3 font-bold text-center w-16"><div className="flex items-center justify-center gap-1">STT <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center w-24"><div className="flex items-center justify-center gap-1">ID <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold min-w-[260px]"><div className="flex items-center gap-1">Tên bộ sưu tập <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold min-w-[220px] text-center"><div className="flex items-center justify-center gap-1">Link <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-1">Số sản phẩm <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-1">Trạng thái <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-1">Ngày tạo <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center w-24">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {collections.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-10 text-center text-gray-500 font-mono">
                  Không tìm thấy bộ sưu tập nào.
                </td>
              </tr>
            ) : (
              collections.map((row, index) => (
                <tr key={row.id} className="hover:bg-gray-800/30 transition-colors group">
                  <td className="p-3 text-center font-mono text-gray-400 font-bold">
                    {(pagination.page - 1) * pagination.limit + index + 1}
                  </td>
                  <td className="p-3 text-center font-mono text-blue-400">{row.id}</td>
                  <td className="p-3 font-medium text-gray-200 group-hover:text-blue-400 transition-colors">{row.name}</td>
                  <td className="p-3 text-center">
                    <a href={`/${row.url}`} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-400 hover:underline font-mono text-xs">
                      /{row.url}
                    </a>
                  </td>
                  <td className="p-3 text-center">
                    <span className="font-mono text-gray-300">{row.productCount} sp </span>
                    <Link href={`/product/collection/product?id=${row.id}`}>
                      <span className="text-blue-500 hover:text-blue-400 hover:underline cursor-pointer">(Xem sản phẩm)</span>
                    </Link>
                  </td>
                  <td className="p-3 text-center">
                    <span className="inline-flex rounded-sm border border-gray-700 bg-gray-900 px-2 py-1 text-xs font-bold text-gray-300">
                      {row.status}
                    </span>
                  </td>
                  <td className="p-3 text-center font-mono text-gray-400">{row.createdAt}</td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <Link href={`/product/collection-edit?id=${row.id}`}>
                        <button className="p-1 text-green-400 hover:text-white hover:bg-green-600 bg-green-950/30 border border-green-900/50 rounded-sm transition-all hover:shadow-[0_0_10px_rgba(34,197,94,0.5)]">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </Link>
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => {
                          setPendingDeleteCollection(row);
                          setDeleteError('');
                        }}
                        className="p-1 text-red-400 hover:text-white hover:bg-red-600 bg-red-950/30 border border-red-900/50 rounded-sm transition-all hover:shadow-[0_0_10px_rgba(239,68,68,0.5)] disabled:opacity-50"
                        title="Xóa"
                        aria-label={`Xóa bộ sưu tập ${row.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.total}
        pageSize={pagination.limit}
      />

      <ConfirmDeleteModal
        open={!!pendingDeleteCollection}
        title="Xóa vĩnh viễn bộ sưu tập?"
        description="Hành động này sẽ xóa bộ sưu tập và toàn bộ liên kết sản phẩm thuộc bộ sưu tập này."
        itemName={pendingDeleteCollection?.name}
        details={[
          { label: 'ID', value: pendingDeleteCollection?.id },
          { label: 'Số sản phẩm', value: pendingDeleteCollection?.productCount },
        ]}
        error={deleteError}
        loading={busyId !== null}
        onCancel={closeDeleteModal}
        onConfirm={deleteCollection}
      />
    </div>
  );
}
