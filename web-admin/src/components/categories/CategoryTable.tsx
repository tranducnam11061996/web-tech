'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Eye, EyeOff, Star, Edit, Trash2, FileText, Globe, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';
import { Pagination } from '@/components/shared/Pagination';
import { useRouter } from 'next/navigation';

export type CategoryNode = {
  id: string;
  name: string;
  isFeatured: boolean;
  isVisible: boolean;
  productCount: number;
  sequence: number;
  frontEndUrl?: string;
  children?: CategoryNode[];
};

type CategoryTableProps = {
  categories: CategoryNode[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
  };
};

function CategoryRow({ node, level = 0 }: { node: CategoryNode, level?: number }) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(level === 0 && node.children && node.children.length > 0);
  const hasChildren = node.children && node.children.length > 0;

  const hideCategory = async () => {
    if (!confirm(`An danh muc #${node.id}?`)) return;
    try {
      const response = await fetch(`/api/admin/product-categories/${node.id}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Khong the an danh muc');
      router.refresh();
    } catch (error: any) {
      alert(error.message || 'Khong the an danh muc');
    }
  };

  return (
    <>
      <tr className="hover:bg-gray-800/30 transition-colors group">
        <td className="p-3 border-b border-gray-800/50">
          <div className="flex justify-center" style={{ paddingLeft: `${level * 1.5}rem` }}>
            {hasChildren ? (
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
              >
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            ) : (
              <div className="w-5 h-5"></div>
            )}
          </div>
        </td>
        <td className="p-3 border-b border-gray-800/50 text-center">
          <input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 checked:bg-red-500 checked:border-red-500 focus:ring-red-500/30 transition-all cursor-pointer" />
        </td>
        <td className="p-3 border-b border-gray-800/50 font-medium text-gray-300 group-hover:text-red-400 transition-colors cursor-pointer">
          <div style={{ paddingLeft: `${level * 1.5}rem` }}>{node.name}</div>
        </td>
        <td className="p-3 border-b border-gray-800/50 text-center">
          <button className={clsx(
            "flex items-center justify-center gap-1.5 mx-auto px-2 py-0.5 rounded-sm text-xs font-bold uppercase tracking-wider transition-all",
            node.isFeatured 
              ? "text-red-400 hover:bg-red-500/10" 
              : "text-blue-400 hover:bg-blue-500/10"
          )}>
            <Star className={clsx("w-3.5 h-3.5", node.isFeatured ? "fill-red-400" : "")} />
            {node.isFeatured ? 'Cho nổi bật' : 'Hạ nổi bật'}
          </button>
        </td>
        <td className="p-3 border-b border-gray-800/50 text-center">
          <button className={clsx(
            "flex items-center justify-center gap-1.5 mx-auto px-2 py-0.5 rounded-sm text-xs font-bold uppercase tracking-wider transition-all",
            node.isVisible 
              ? "text-green-400 hover:bg-green-500/10" 
              : "text-gray-500 hover:bg-gray-800"
          )}>
            {node.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {node.isVisible ? 'Hiển thị' : 'Không hiển thị'}
          </button>
        </td>
        <td className="p-3 border-b border-gray-800/50 text-center text-blue-400 font-mono hover:underline cursor-pointer">{node.id}</td>
        <td className="p-3 border-b border-gray-800/50 text-center text-gray-400 font-mono">{node.productCount}</td>
        <td className="p-3 border-b border-gray-800/50 text-center text-blue-400 font-mono">{node.sequence}</td>
        <td className="p-3 border-b border-gray-800/50 text-center">
          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center justify-center gap-2">
              <Link href={`/product/categories-edit?id=${node.id}`}>
                <button className="p-1 text-green-400 hover:text-white hover:bg-green-600 bg-green-950/30 border border-green-900/50 rounded-sm transition-all hover:shadow-[0_0_10px_rgba(34,197,94,0.5)]"><Edit className="w-3.5 h-3.5" /></button>
              </Link>
              <button onClick={hideCategory} className="p-1 text-red-400 hover:text-white hover:bg-red-600 bg-red-950/30 border border-red-900/50 rounded-sm transition-all hover:shadow-[0_0_10px_rgba(239,68,68,0.5)]"><Trash2 className="w-3.5 h-3.5" /></button>
              <button className="p-1 text-teal-400 hover:text-white hover:bg-teal-600 bg-teal-950/30 border border-teal-900/50 rounded-sm transition-all hover:shadow-[0_0_10px_rgba(20,184,166,0.5)]"><FileText className="w-3.5 h-3.5" /></button>
              <button className="p-1 text-blue-400 hover:text-white hover:bg-blue-600 bg-blue-950/30 border border-blue-900/50 rounded-sm transition-all hover:shadow-[0_0_10px_rgba(59,130,246,0.5)]"><Globe className="w-3.5 h-3.5" /></button>
            </div>
            <a href={node.frontEndUrl || '#'} target="_blank" rel="noopener noreferrer">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 hover:text-blue-400 cursor-pointer">Xem tại web</span>
            </a>
          </div>
        </td>
      </tr>
      
      {isExpanded && hasChildren && node.children!.map((child) => (
        <CategoryRow key={child.id} node={child} level={level + 1} />
      ))}
    </>
  );
}

export function CategoryTable({ categories, pagination }: CategoryTableProps) {
  return (
    <div className="glass-panel border-gray-800 rounded-lg shadow-sm overflow-hidden text-sm relative z-10 flex flex-col h-full">
      <div className="overflow-x-auto custom-scrollbar flex-1">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-gray-950/80 border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider font-mono sticky top-0 z-20">
              <th className="p-3 font-bold w-16 text-center">Expand</th>
              <th className="p-3 font-bold w-12 text-center"><input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 cursor-pointer" /></th>
              <th className="p-3 font-bold min-w-[250px]"><div className="flex items-center gap-2 cursor-pointer hover:text-red-400 transition-colors">Tên danh mục <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-2 cursor-pointer hover:text-red-400 transition-colors">Nổi bật <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-2 cursor-pointer hover:text-red-400 transition-colors">Trạng thái <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-2 cursor-pointer hover:text-red-400 transition-colors">Id <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-2 cursor-pointer hover:text-red-400 transition-colors">SP <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-2 cursor-pointer hover:text-red-400 transition-colors">STT(Hiển thị) <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center w-36"><div className="flex items-center justify-center gap-2 cursor-pointer hover:text-red-400 transition-colors">Thao tác <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
            </tr>
          </thead>
          <tbody>
            {categories.map(category => (
              <CategoryRow key={category.id} node={category} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        pageSize={pagination.pageSize}
      />
    </div>
  );
}
