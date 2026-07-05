'use client';

import { Edit, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Pagination } from '@/components/shared/Pagination';

type ComboSetNode = {
  id: number;
  title: string;
  status: number;
  product_count: number;
  from_time: number;
  to_time: number;
};

type PaginationData = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
};

function formatUnixTime(unixTimestamp: number) {
  if (!unixTimestamp) return '-';
  const date = new Date(unixTimestamp * 1000);
  return date.toLocaleDateString('vi-VN') + ' ' + date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

export function ComboSetTable({ combos, pagination }: { combos: ComboSetNode[], pagination: PaginationData }) {
  return (
    <div className="flex flex-col h-full bg-gray-900/30 rounded-lg border border-gray-800/80 overflow-hidden shadow-xl">
      <div className="overflow-x-auto flex-1 custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-950/80 border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider font-mono sticky top-0 z-10 backdrop-blur-md">
              <th className="p-4 font-bold w-16 text-center">ID</th>
              <th className="p-4 font-bold min-w-[300px]">Tên Combo Set</th>
              <th className="p-4 font-bold w-32 text-center">Số lượng SP</th>
              <th className="p-4 font-bold w-40 text-center">Thời gian áp dụng</th>
              <th className="p-4 font-bold w-32 text-center">Trạng thái</th>
              <th className="p-4 font-bold w-44 text-center">Các SP sử dụng</th>
              <th className="p-4 font-bold w-24 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {combos.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-10 text-center text-gray-500 font-mono">
                  Không có dữ liệu Combo Set
                </td>
              </tr>
            ) : (
              combos.map((combo) => (
                <tr key={combo.id} className="hover:bg-gray-800/40 transition-colors group">
                  <td className="p-4 text-center text-gray-500 font-mono text-sm">{combo.id}</td>
                  <td className="p-4 font-medium text-gray-200 group-hover:text-blue-400 transition-colors">
                    {combo.title}
                  </td>
                  <td className="p-4 text-center">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 text-xs font-bold">
                      {combo.product_count}
                    </span>
                  </td>
                  <td className="p-4 text-center text-xs text-gray-400 font-mono">
                    <div className="flex flex-col gap-1">
                      <span className="text-green-500/80">{formatUnixTime(combo.from_time)}</span>
                      <span className="text-red-500/80">{formatUnixTime(combo.to_time)}</span>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    {combo.status === 1 ? (
                      <span className="px-2.5 py-1 text-xs text-green-400 bg-green-500/10 border border-green-500/30 rounded-full font-medium shadow-[0_0_8px_rgba(34,197,94,0.15)]">
                        Hoạt động
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 text-xs text-gray-400 bg-gray-500/10 border border-gray-500/30 rounded-full font-medium">
                        Tạm ngưng
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <Link href={`/product/combo-set/product?id=${combo.id}`}>
                      <button className="px-3 py-1.5 text-xs font-medium text-blue-400 bg-blue-500/10 border border-blue-500/30 hover:bg-blue-600 hover:text-white rounded transition-colors whitespace-nowrap">
                        Xem list sản phẩm
                      </button>
                    </Link>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <Link href={`/product/combo-set/edit?id=${combo.id}`}>
                        <button className="p-1.5 text-blue-400 hover:text-white hover:bg-blue-600 rounded transition-colors shadow-sm" title="Chỉnh sửa">
                          <Edit className="w-4 h-4" />
                        </button>
                      </Link>
                      <button className="p-1.5 text-red-500 hover:text-white hover:bg-red-600 rounded transition-colors shadow-sm" title="Xóa">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {combos.length > 0 && (
        <Pagination 
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pagination.totalItems}
          pageSize={pagination.pageSize}
        />
      )}
    </div>
  );
}
