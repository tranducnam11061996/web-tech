'use client';

import { Edit, Trash2, ArrowUpDown } from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';
import { Pagination } from '@/components/shared/Pagination';

export type AttributeNode = {
  id: number;
  sequence: number;
  code: string;
  name: string;
  valueCount: number;
  categoryCount: number;
  isActive: boolean;
};

type AttributeListTableProps = {
  attributes: AttributeNode[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
  };
};

export function AttributeListTable({ attributes, pagination }: AttributeListTableProps) {
  return (
    <div className="glass-panel border-gray-800 rounded-lg shadow-sm overflow-hidden text-sm relative z-10 flex flex-col h-full">
      <div className="overflow-x-auto custom-scrollbar flex-1">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-gray-950/80 border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider font-mono sticky top-0 z-20">
              <th className="p-3 font-bold w-12 text-center">
                <input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 cursor-pointer" />
              </th>
              <th className="p-3 font-bold w-20 text-center">
                <div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">
                  STT <ArrowUpDown className="w-3 h-3 text-gray-600" />
                </div>
              </th>
              <th className="p-3 font-bold">
                <div className="flex items-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">
                  Mã <ArrowUpDown className="w-3 h-3 text-gray-600" />
                </div>
              </th>
              <th className="p-3 font-bold min-w-[200px]">
                <div className="flex items-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">
                  Tên hiển thị <ArrowUpDown className="w-3 h-3 text-gray-600" />
                </div>
              </th>
              <th className="p-3 font-bold text-center">
                <div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">
                  Giá trị <ArrowUpDown className="w-3 h-3 text-gray-600" />
                </div>
              </th>
              <th className="p-3 font-bold text-center">
                <div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">
                  Danh mục đang có <ArrowUpDown className="w-3 h-3 text-gray-600" />
                </div>
              </th>
              <th className="p-3 font-bold text-center">
                <div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">
                  Trạng thái <ArrowUpDown className="w-3 h-3 text-gray-600" />
                </div>
              </th>
              <th className="p-3 font-bold text-center w-24">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody>
            {attributes.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-8 text-center text-gray-500">
                  Không tìm thấy dữ liệu.
                </td>
              </tr>
            ) : (
              attributes.map((attr, index) => (
                <tr key={attr.id} className="hover:bg-gray-800/30 transition-colors group">
                  <td className="p-3 border-b border-gray-800/50 text-center">
                    <input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500 checked:border-blue-500 focus:ring-blue-500/30 transition-all cursor-pointer" />
                  </td>
                  <td className="p-3 border-b border-gray-800/50 text-center text-gray-400 font-mono">
                    {attr.sequence || index + 1}
                  </td>
                  <td className="p-3 border-b border-gray-800/50 font-medium text-gray-300">
                    {attr.code}
                  </td>
                  <td className="p-3 border-b border-gray-800/50 font-medium text-blue-400 hover:underline cursor-pointer">
                    {attr.name}
                  </td>
                  <td className="p-3 border-b border-gray-800/50 text-center text-gray-300 font-mono">
                    {attr.valueCount}
                  </td>
                  <td className="p-3 border-b border-gray-800/50 text-center text-blue-400 cursor-pointer hover:underline">
                    {attr.categoryCount} danh mục
                  </td>
                  <td className="p-3 border-b border-gray-800/50 text-center">
                    <span className={clsx(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                      attr.isActive 
                        ? "bg-green-500/10 text-green-400 border-green-500/20" 
                        : "bg-gray-500/10 text-gray-400 border-gray-500/20"
                    )}>
                      <span className={clsx("w-1.5 h-1.5 rounded-full", attr.isActive ? "bg-green-400 shadow-[0_0_5px_#4ade80]" : "bg-gray-400")}></span>
                      {attr.isActive ? 'Hoạt động' : 'Tạm ẩn'}
                    </span>
                  </td>
                  <td className="p-3 border-b border-gray-800/50 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
                      <Link href="/product/attribute/edit">
                        <button className="p-1.5 text-green-400 hover:text-white hover:bg-green-600 bg-green-950/30 border border-green-900/50 rounded transition-all hover:shadow-[0_0_10px_rgba(34,197,94,0.3)]">
                          <Edit className="w-4 h-4" />
                        </button>
                      </Link>
                      <button className="p-1.5 text-red-400 hover:text-white hover:bg-red-600 bg-red-950/30 border border-red-900/50 rounded transition-all hover:shadow-[0_0_10px_rgba(239,68,68,0.3)]">
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

      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        pageSize={pagination.pageSize}
      />
    </div>
  );
}
