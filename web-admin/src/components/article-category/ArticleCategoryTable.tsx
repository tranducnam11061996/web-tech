'use client';

import React, { useState } from 'react';
import { Edit, Trash2, ArrowUpDown, ChevronRight, ChevronDown, Bookmark } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export type ArticleCategoryNode = {
  id: string;
  stt: string;
  name: string;
  articleCount: number;
  displayType: string;
  url: string;
  order: number;
  isActive: boolean;
  children?: ArticleCategoryNode[];
};

interface Props {
  initialData: ArticleCategoryNode[];
}

export function ArticleCategoryTable({ initialData }: Props) {
  const router = useRouter();
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({
    '13': true // Expand "Tin khuyến mại" by default if it happens to be id 13
  });

  const toggleExpand = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const hideCategory = async (row: ArticleCategoryNode) => {
    if (!confirm(`An danh muc bai viet #${row.id}?`)) return;
    try {
      const response = await fetch(`/api/admin/article-categories/${row.id}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Khong the an danh muc');
      router.refresh();
    } catch (error: any) {
      alert(error.message || 'Khong the an danh muc');
    }
  };

  const renderRow = (row: ArticleCategoryNode, isChild = false) => {
    const isExpanded = expandedRows[row.id];
    const hasChildren = row.children && row.children.length > 0;
    
    return (
      <React.Fragment key={row.id}>
        <tr className={`hover:bg-gray-800/30 transition-colors group ${isChild ? 'bg-gray-900/40' : ''}`}>
          <td className="p-3 text-center w-12 border-b border-gray-800/50">
            <input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500 checked:border-blue-500 focus:ring-blue-500/30 transition-all cursor-pointer" />
          </td>
          <td className="p-3 text-center w-12 border-b border-gray-800/50">
            {hasChildren && (
              <button 
                onClick={() => toggleExpand(row.id)}
                className="p-1 rounded hover:bg-gray-700/50 text-gray-400 transition-colors"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            )}
          </td>
          <td className="p-3 border-b border-gray-800/50 w-24">
            <div className={`flex items-center gap-2 font-mono font-medium ${isChild ? 'pl-4 text-green-400' : 'text-blue-400'}`}>
              <Bookmark className={`w-3.5 h-3.5 ${isChild ? 'text-green-500' : 'text-blue-500'}`} />
              {row.stt}
            </div>
          </td>
          <td className="p-3 font-medium text-gray-200 border-b border-gray-800/50 min-w-[250px]">
            <div className={`flex items-center gap-2 ${isChild ? 'pl-6' : ''}`}>
              <span className="hover:text-blue-400 transition-colors cursor-pointer">{row.name}</span>
            </div>
          </td>
          <td className="p-3 text-center font-mono text-gray-300 border-b border-gray-800/50 w-32">{row.articleCount}</td>
          <td className="p-3 text-gray-300 border-b border-gray-800/50 w-64 text-center">{row.displayType}</td>
          <td className="p-3 text-center border-b border-gray-800/50 w-40">
            <a href={`http://localhost:3001/tin-tuc/${row.url}`} className="text-blue-500 hover:text-blue-400 hover:underline cursor-pointer text-sm" target="_blank" rel="noopener noreferrer">Xem trang bài viết</a>
          </td>
          <td className="p-3 text-center font-mono text-gray-300 border-b border-gray-800/50 w-24">{row.order}</td>
          <td className="p-3 text-center border-b border-gray-800/50 w-40">
            <div className="flex items-center justify-center gap-2">
              <button className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${row.isActive ? 'bg-blue-500' : 'bg-gray-600'}`}>
                <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${row.isActive ? 'translate-x-5' : 'translate-x-1'}`} />
              </button>
              <span className={`text-xs font-medium w-32 text-left ${row.isActive ? 'text-blue-400' : 'text-gray-500'}`}>
                {row.isActive ? 'Đang hoạt động' : 'Không hoạt động'}
              </span>
            </div>
          </td>
          <td className="p-3 text-center border-b border-gray-800/50 w-28">
            <div className="flex items-center justify-center gap-2">
              <Link href={`/news/news-category/edit?id=${row.id}`}>
                <button className="p-1.5 text-yellow-500 hover:text-white hover:bg-yellow-600 bg-yellow-950/30 border border-yellow-900/50 rounded transition-all hover:shadow-[0_0_10px_rgba(234,179,8,0.3)]">
                  <Edit className="w-4 h-4" />
                </button>
              </Link>
              <button onClick={() => hideCategory(row)} className="p-1.5 text-red-500 hover:text-white hover:bg-red-600 bg-red-950/30 border border-red-900/50 rounded transition-all hover:shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </td>
        </tr>
        
        {isExpanded && hasChildren && row.children!.map(child => renderRow(child, true))}
      </React.Fragment>
    );
  };

  return (
    <div className="glass-panel border-gray-800 rounded-lg shadow-sm overflow-hidden text-sm relative z-10 flex flex-col h-full bg-[#0a0a0f]/60">
      <div className="overflow-x-auto custom-scrollbar flex-1">
        <table className="w-full text-left border-collapse min-w-[1200px]">
          <thead>
            <tr className="bg-gray-950/80 border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider font-mono sticky top-0 z-20">
              <th className="p-3 font-bold w-12 text-center">
                <input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 cursor-pointer" />
              </th>
              <th className="p-3 font-bold text-center w-12">
                <ArrowUpDown className="w-3 h-3 text-transparent" />
              </th>
              <th className="p-3 font-bold w-24">
                <div className="flex items-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">
                  STT <ArrowUpDown className="w-3 h-3 text-gray-600" />
                </div>
              </th>
              <th className="p-3 font-bold min-w-[250px]">
                <div className="flex items-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">
                  Danh mục bài viết <ArrowUpDown className="w-3 h-3 text-gray-600" />
                </div>
              </th>
              <th className="p-3 font-bold text-center w-32">
                <div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">
                  Số bài viết <ArrowUpDown className="w-3 h-3 text-gray-600" />
                </div>
              </th>
              <th className="p-3 font-bold text-center w-64">
                <div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">
                  Hiển thị <ArrowUpDown className="w-3 h-3 text-gray-600" />
                </div>
              </th>
              <th className="p-3 font-bold text-center w-40">
                Đường dẫn
              </th>
              <th className="p-3 font-bold text-center w-24">
                <div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">
                  Thứ tự <ArrowUpDown className="w-3 h-3 text-gray-600" />
                </div>
              </th>
              <th className="p-3 font-bold text-center w-40">
                <div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">
                  Trạng thái <ArrowUpDown className="w-3 h-3 text-gray-600" />
                </div>
              </th>
              <th className="p-3 font-bold text-center w-28">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {initialData.length > 0 ? (
              initialData.map(row => renderRow(row))
            ) : (
              <tr>
                <td colSpan={10} className="p-8 text-center text-gray-500">
                  Không có dữ liệu danh mục bài viết.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
