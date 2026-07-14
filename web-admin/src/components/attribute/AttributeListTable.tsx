'use client';

import { Edit, Trash2, ArrowUpDown } from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';
import { Pagination } from '@/components/shared/Pagination';
import type { AttributeListItem } from '@/lib/admin/attributeTypes';

type Props = {
  attributes: AttributeListItem[];
  pagination: { currentPage: number; totalPages: number; totalItems: number; pageSize: number };
  selectedIds: Set<number>;
  busy: boolean;
  onToggleOne: (id: number) => void;
  onToggleAll: () => void;
  onDelete: (attribute: AttributeListItem) => void;
  onSort: (sort: string) => void;
};

export function AttributeListTable({ attributes, pagination, selectedIds, busy, onToggleOne, onToggleAll, onDelete, onSort }: Props) {
  const allSelected = attributes.length > 0 && attributes.every((attribute) => selectedIds.has(attribute.id));
  const sortable = (label: string, key: string, centered = false) => (
    <button type="button" onClick={() => onSort(key)} className={`flex items-center gap-1 cursor-pointer hover:text-blue-400 transition-colors ${centered ? 'justify-center w-full' : ''}`}>
      {label} <ArrowUpDown className="w-3 h-3 text-gray-600" />
    </button>
  );

  return (
    <div className="glass-panel border-gray-800 rounded-lg shadow-sm overflow-hidden text-sm relative z-10 flex flex-col h-full">
      <div className="overflow-x-auto custom-scrollbar flex-1">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-gray-950/80 border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider font-mono sticky top-0 z-20">
              <th className="p-3 font-bold w-12 text-center">
                <input type="checkbox" checked={allSelected} onChange={onToggleAll} aria-label="Chọn tất cả thuộc tính trên trang" className="rounded-sm bg-gray-900 border-gray-700 cursor-pointer" />
              </th>
              <th className="p-3 font-bold w-20 text-center">{sortable('STT', 'sequence', true)}</th>
              <th className="p-3 font-bold">{sortable('Mã', 'code')}</th>
              <th className="p-3 font-bold min-w-[200px]">{sortable('Tên hiển thị', 'name')}</th>
              <th className="p-3 font-bold text-center">{sortable('Giá trị', 'valueCount', true)}</th>
              <th className="p-3 font-bold text-center">{sortable('Danh mục đang có', 'categoryCount', true)}</th>
              <th className="p-3 font-bold text-center">{sortable('Trạng thái', 'status', true)}</th>
              <th className="p-3 font-bold text-center w-24">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {attributes.length === 0 ? (
              <tr><td colSpan={8} className="p-8 text-center text-gray-500">Không tìm thấy dữ liệu.</td></tr>
            ) : attributes.map((attribute) => (
              <tr key={attribute.id} className="hover:bg-gray-800/30 transition-colors group">
                <td className="p-3 border-b border-gray-800/50 text-center">
                  <input type="checkbox" checked={selectedIds.has(attribute.id)} onChange={() => onToggleOne(attribute.id)} aria-label={`Chọn thuộc tính ${attribute.name}`} className="rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500 checked:border-blue-500 focus:ring-blue-500/30 transition-all cursor-pointer" />
                </td>
                <td className="p-3 border-b border-gray-800/50 text-center text-gray-400 font-mono">{attribute.sequence}</td>
                <td className="p-3 border-b border-gray-800/50 font-medium text-gray-300">{attribute.code}</td>
                <td className="p-3 border-b border-gray-800/50 font-medium text-blue-400 hover:underline cursor-pointer">{attribute.name}</td>
                <td className="p-3 border-b border-gray-800/50 text-center text-gray-300 font-mono">{attribute.valueCount}</td>
                <td className="p-3 border-b border-gray-800/50 text-center text-blue-400 cursor-pointer hover:underline">{attribute.categoryCount} danh mục</td>
                <td className="p-3 border-b border-gray-800/50 text-center">
                  <span className={clsx('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border', attribute.isActive ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20')}>
                    <span className={clsx('w-1.5 h-1.5 rounded-full', attribute.isActive ? 'bg-green-400 shadow-[0_0_5px_#4ade80]' : 'bg-gray-400')}></span>
                    {attribute.isActive ? 'Hoạt động' : 'Tạm ẩn'}
                  </span>
                </td>
                <td className="p-3 border-b border-gray-800/50 text-center">
                  <div className="flex items-center justify-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                    <Link href={`/product/attribute/edit?id=${attribute.id}`}>
                      <button type="button" aria-label={`Sửa thuộc tính ${attribute.name}`} className="p-1.5 text-green-400 hover:text-white hover:bg-green-600 bg-green-950/30 border border-green-900/50 rounded transition-all hover:shadow-[0_0_10px_rgba(34,197,94,0.3)]">
                        <Edit className="w-4 h-4" />
                      </button>
                    </Link>
                    <button type="button" disabled={busy} onClick={() => onDelete(attribute)} className="p-1.5 text-red-400 hover:text-white hover:bg-red-600 bg-red-950/30 border border-red-900/50 rounded transition-all hover:shadow-[0_0_10px_rgba(239,68,68,0.3)] disabled:opacity-50" title="Xóa" aria-label={`Xóa thuộc tính ${attribute.name}`}>
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination currentPage={pagination.currentPage} totalPages={pagination.totalPages} totalItems={pagination.totalItems} pageSize={pagination.pageSize} />
    </div>
  );
}

export type AttributeNode = AttributeListItem;
