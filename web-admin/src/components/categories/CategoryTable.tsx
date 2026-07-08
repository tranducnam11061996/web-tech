'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  Edit,
  Eye,
  EyeOff,
  FileText,
  Globe,
  Star,
  Trash2,
  X,
} from 'lucide-react';
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

type CategoryRowProps = {
  node: CategoryNode;
  level?: number;
  busyId: string | null;
  onDelete: (node: CategoryNode) => void;
};

function CategoryRow({ node, level = 0, busyId, onDelete }: CategoryRowProps) {
  const [isExpanded, setIsExpanded] = useState(level === 0 && node.children && node.children.length > 0);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <>
      <tr className="hover:bg-gray-800/30 transition-colors group">
        <td className="p-3 border-b border-gray-800/50">
          <div className="flex justify-center" style={{ paddingLeft: `${level * 1.5}rem` }}>
            {hasChildren ? (
              <button
                type="button"
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
          <button
            type="button"
            className={clsx(
              'flex items-center justify-center gap-1.5 mx-auto px-2 py-0.5 rounded-sm text-xs font-bold uppercase tracking-wider transition-all',
              node.isFeatured
                ? 'text-red-400 hover:bg-red-500/10'
                : 'text-blue-400 hover:bg-blue-500/10',
            )}
          >
            <Star className={clsx('w-3.5 h-3.5', node.isFeatured ? 'fill-red-400' : '')} />
            {node.isFeatured ? 'Cho nổi bật' : 'Hạ nổi bật'}
          </button>
        </td>
        <td className="p-3 border-b border-gray-800/50 text-center">
          <button
            type="button"
            className={clsx(
              'flex items-center justify-center gap-1.5 mx-auto px-2 py-0.5 rounded-sm text-xs font-bold uppercase tracking-wider transition-all',
              node.isVisible
                ? 'text-green-400 hover:bg-green-500/10'
                : 'text-gray-500 hover:bg-gray-800',
            )}
          >
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
                <button type="button" className="p-1 text-green-400 hover:text-white hover:bg-green-600 bg-green-950/30 border border-green-900/50 rounded-sm transition-all hover:shadow-[0_0_10px_rgba(34,197,94,0.5)]">
                  <Edit className="w-3.5 h-3.5" />
                </button>
              </Link>
              <button
                type="button"
                disabled={busyId === node.id}
                onClick={() => onDelete(node)}
                title="Xóa danh mục"
                aria-label={`Xóa danh mục ${node.name}`}
                className="p-1 text-red-400 hover:text-white hover:bg-red-600 bg-red-950/30 border border-red-900/50 rounded-sm transition-all hover:shadow-[0_0_10px_rgba(239,68,68,0.5)] disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button type="button" className="p-1 text-teal-400 hover:text-white hover:bg-teal-600 bg-teal-950/30 border border-teal-900/50 rounded-sm transition-all hover:shadow-[0_0_10px_rgba(20,184,166,0.5)]">
                <FileText className="w-3.5 h-3.5" />
              </button>
              <button type="button" className="p-1 text-blue-400 hover:text-white hover:bg-blue-600 bg-blue-950/30 border border-blue-900/50 rounded-sm transition-all hover:shadow-[0_0_10px_rgba(59,130,246,0.5)]">
                <Globe className="w-3.5 h-3.5" />
              </button>
            </div>
            <a href={node.frontEndUrl || '#'} target="_blank" rel="noopener noreferrer">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-500 hover:text-blue-400 cursor-pointer">Xem tại web</span>
            </a>
          </div>
        </td>
      </tr>

      {isExpanded && hasChildren && node.children!.map((child) => (
        <CategoryRow key={child.id} node={child} level={level + 1} busyId={busyId} onDelete={onDelete} />
      ))}
    </>
  );
}

export function CategoryTable({ categories, pagination }: CategoryTableProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingDeleteCategory, setPendingDeleteCategory] = useState<CategoryNode | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const closeDeleteModal = () => {
    if (busyId !== null) return;
    setPendingDeleteCategory(null);
    setDeleteError('');
  };

  const deleteCategory = async () => {
    const category = pendingDeleteCategory;
    if (!category) return;

    setBusyId(category.id);
    setDeleteError('');

    try {
      const response = await fetch(`/api/admin/product-categories/${category.id}?mode=permanent`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload?.error?.message || 'Không thể xóa danh mục');
      }
      setPendingDeleteCategory(null);
      router.refresh();
    } catch (error: any) {
      setDeleteError(error.message || 'Không thể xóa danh mục');
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
              <th className="p-3 font-bold w-16 text-center">Expand</th>
              <th className="p-3 font-bold w-12 text-center"><input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 cursor-pointer" /></th>
              <th className="p-3 font-bold min-w-[250px]"><div className="flex items-center gap-2 cursor-pointer hover:text-red-400 transition-colors">Tên danh mục <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-2 cursor-pointer hover:text-red-400 transition-colors">Nổi bật <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-2 cursor-pointer hover:text-red-400 transition-colors">Trạng thái <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-2 cursor-pointer hover:text-red-400 transition-colors">ID <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-2 cursor-pointer hover:text-red-400 transition-colors">SP <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-2 cursor-pointer hover:text-red-400 transition-colors">STT(Hiển thị) <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center w-36"><div className="flex items-center justify-center gap-2 cursor-pointer hover:text-red-400 transition-colors">Thao tác <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <CategoryRow
                key={category.id}
                node={category}
                busyId={busyId}
                onDelete={(node) => {
                  setPendingDeleteCategory(node);
                  setDeleteError('');
                }}
              />
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        pageSize={pagination.pageSize}
      />

      {pendingDeleteCategory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-category-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDeleteModal();
          }}
        >
          <div className="w-full max-w-md rounded-lg border border-red-900/70 bg-gray-950 p-5 shadow-[0_0_40px_rgba(239,68,68,0.25)]">
            <div className="flex items-start gap-3">
              <div className="rounded-full border border-red-800 bg-red-950/60 p-2 text-red-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <h2 id="delete-category-title" className="text-base font-bold text-gray-100">
                    Xóa vĩnh viễn danh mục?
                  </h2>
                  <button
                    type="button"
                    onClick={closeDeleteModal}
                    disabled={busyId !== null}
                    className="rounded-sm p-1 text-gray-500 transition hover:bg-gray-800 hover:text-gray-200 disabled:opacity-50"
                    aria-label="Đóng modal"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-2 text-sm leading-6 text-gray-300">
                  Hành động này sẽ xóa vĩnh viễn danh mục cùng các dữ liệu liên quan như liên kết sản phẩm, thuộc tính áp dụng, URL SEO và metadata quản trị. Vui lòng xác nhận trước khi thực hiện.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-md border border-gray-800 bg-gray-900/70 p-4">
              <div className="text-sm font-semibold text-gray-100">{pendingDeleteCategory.name}</div>
              <div className="mt-1 text-xs text-gray-400">ID: {pendingDeleteCategory.id}</div>
            </div>

            {deleteError && (
              <div className="mt-4 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
                {deleteError}
              </div>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={busyId !== null}
                className="rounded-md border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-gray-500 hover:text-white disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={deleteCategory}
                disabled={busyId !== null}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
              >
                {busyId === pendingDeleteCategory.id ? 'Đang xóa...' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
