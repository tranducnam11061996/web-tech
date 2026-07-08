'use client';

import { Edit, Trash2, ArrowUpDown, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import ProgressiveImage from '@/components/shared/ProgressiveImage';
import { useState } from 'react';
import { ConfirmDeleteModal } from '@/components/shared/ConfirmDeleteModal';

export type ArticleNode = {
  id: string;
  thumbnail?: string;
  title: string;
  url: string;
  publishDate: string;
  author: string;
  views: number;
  updatedAt: string;
  updater: string;
  status: 'Hoạt động' | 'Tạm khóa';
};

interface Props {
  initialData: ArticleNode[];
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
  limit?: number;
}

export function ArticleListTable({ 
  initialData, 
  currentPage = 1, 
  totalPages = 1, 
  totalItems = 0, 
  limit = 20 
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingDeleteArticle, setPendingDeleteArticle] = useState<ArticleNode | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const createPageURL = (pageNumber: number | string, limitValue?: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', pageNumber.toString());
    if (limitValue) {
      params.set('limit', limitValue.toString());
    }
    return `${pathname}?${params.toString()}`;
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    router.push(createPageURL(1, Number(e.target.value)));
  };

  const closeDeleteModal = () => {
    if (busyId !== null) return;
    setPendingDeleteArticle(null);
    setDeleteError('');
  };

  const deleteArticle = async () => {
    const row = pendingDeleteArticle;
    if (!row) return;
    setBusyId(row.id);
    setDeleteError('');
    try {
      const response = await fetch(`/api/admin/articles/${row.id}?mode=permanent`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể xóa bài viết');
      setPendingDeleteArticle(null);
      router.refresh();
    } catch (error: any) {
      setDeleteError(error.message || 'Không thể xóa bài viết');
    } finally {
      setBusyId(null);
    }
  };

  // Generate page numbers for pagination
  const renderPaginationButtons = () => {
    const buttons = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <Link 
          key={i} 
          href={createPageURL(i)}
          className={`w-8 h-8 flex items-center justify-center border rounded-sm font-medium transition-colors ${
            currentPage === i 
              ? 'border-blue-500 bg-blue-500/20 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.2)]' 
              : 'border-gray-800 bg-gray-900 text-gray-400 hover:text-white hover:border-gray-600'
          }`}
        >
          {i}
        </Link>
      );
    }

    return buttons;
  };

  return (
    <div className="glass-panel border-gray-800 rounded-lg shadow-sm overflow-hidden text-sm relative z-10 flex flex-col h-full">
      <div className="overflow-x-auto custom-scrollbar flex-1">
        <table className="w-full text-left border-collapse min-w-[1600px]">
          <thead>
            <tr className="bg-gray-950/80 border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider font-mono sticky top-0 z-20">
              <th className="p-3 font-bold w-12 text-center"><input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 cursor-pointer" /></th>
              <th className="p-3 font-bold text-center w-24"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Ảnh <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold min-w-[250px]"><div className="flex items-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Tiêu đề <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold"><div className="flex items-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Đường dẫn</div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Ngày đăng tải <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Người viết <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Lượt xem <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Ngày cập nhật <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Người cập nhật <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Trạng thái <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center w-28">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {initialData.length > 0 ? (
              initialData.map((row) => (
                <tr key={row.id} className="hover:bg-gray-800/30 transition-colors group">
                  <td className="p-3 text-center align-middle">
                    <input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500 checked:border-blue-500 focus:ring-blue-500/30 transition-all cursor-pointer" />
                  </td>
                  <td className="p-3 text-center align-middle">
                    <div className="w-16 h-10 bg-gray-900 border border-gray-700 rounded overflow-hidden relative mx-auto group-hover:border-blue-500/50 transition-colors">
                      <ProgressiveImage
                        src={row.thumbnail || "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mN8/x8AAuMB8DtXNJsAAAAASUVORK5CYII="} 
                        alt={row.title} 
                        className="absolute inset-0 w-full h-full object-cover" 
                      />
                    </div>
                  </td>
                  <td className="p-3 font-medium text-gray-200 group-hover:text-blue-400 transition-colors cursor-pointer leading-relaxed align-middle">{row.title}</td>
                  <td className="p-3 align-middle">
                    <a href={row.url} className="text-blue-400 hover:text-blue-300 hover:underline transition-colors text-xs whitespace-nowrap" target="_blank" rel="noopener noreferrer">Xem trang bài viết</a>
                  </td>
                  <td className="p-3 text-center font-mono text-gray-400 align-middle whitespace-nowrap">{row.publishDate}</td>
                  <td className="p-3 text-center text-gray-300 align-middle">{row.author}</td>
                  <td className="p-3 text-center align-middle">
                     <span className="font-bold text-red-500">{row.views > 0 ? row.views : ''}</span>
                  </td>
                  <td className="p-3 text-center font-mono text-gray-400 align-middle whitespace-nowrap">{row.updatedAt}</td>
                  <td className="p-3 text-center text-gray-300 align-middle">{row.updater}</td>
                  <td className="p-3 text-center align-middle">
                     <div className="flex items-center justify-center gap-2">
                       <div className="relative inline-block w-8 h-4 cursor-pointer">
                          <input type="checkbox" className="peer sr-only" defaultChecked={row.status === 'Hoạt động'} />
                          <div className="w-8 h-4 bg-gray-700 rounded-full peer peer-checked:bg-blue-500 transition-colors"></div>
                          <div className="absolute left-1 top-0.5 w-3 h-3 bg-white rounded-full peer-checked:translate-x-4 transition-transform"></div>
                       </div>
                       <span className="text-gray-300 text-xs">{row.status}</span>
                     </div>
                  </td>
                  <td className="p-3 text-center align-middle">
                    <div className="flex items-center justify-center gap-1.5">
                      <a href={row.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-blue-400 hover:text-white hover:bg-blue-600 bg-blue-950/30 border border-blue-900/50 rounded-sm transition-all hover:shadow-[0_0_10px_rgba(59,130,246,0.5)]" title="Xem trên web">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <Link href={`/news/edit?id=${row.id}`}>
                        <button className="p-1.5 text-green-400 hover:text-white hover:bg-green-600 bg-green-950/30 border border-green-900/50 rounded-sm transition-all hover:shadow-[0_0_10px_rgba(34,197,94,0.5)]" title="Chỉnh sửa"><Edit className="w-3.5 h-3.5" /></button>
                      </Link>
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => {
                          setPendingDeleteArticle(row);
                          setDeleteError('');
                        }}
                        className="p-1.5 text-red-400 hover:text-white hover:bg-red-600 bg-red-950/30 border border-red-900/50 rounded-sm transition-all hover:shadow-[0_0_10px_rgba(239,68,68,0.5)] disabled:opacity-50"
                        title="Xóa"
                        aria-label={`Xóa bài viết ${row.title}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={11} className="p-8 text-center text-gray-500">
                  Không có dữ liệu bài viết.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-4 bg-gray-950/50 border-t border-gray-800 flex flex-wrap items-center justify-between gap-4 text-sm mt-auto">
        <div className="flex items-center gap-2">
          <span className="text-gray-500 font-mono text-xs uppercase tracking-wider">Số hàng hiển thị</span>
          <select 
            value={limit} 
            onChange={handleLimitChange}
            className="bg-gray-900 border border-gray-700 rounded-sm px-2 py-1 text-gray-300 focus:outline-none focus:border-blue-500/50"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-gray-500 ml-2">Tổng số: {totalItems}</span>
        </div>
        
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Link 
              href={createPageURL(1)}
              className={`w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm transition-colors ${currentPage <= 1 ? 'text-gray-700 pointer-events-none' : 'text-gray-500 hover:text-white hover:border-gray-600'}`}
            >
              |&lt;
            </Link>
            <Link 
              href={createPageURL(currentPage - 1)}
              className={`w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm transition-colors ${currentPage <= 1 ? 'text-gray-700 pointer-events-none' : 'text-gray-500 hover:text-white hover:border-gray-600'}`}
            >
              &lt;
            </Link>
            
            {renderPaginationButtons()}
            
            <Link 
              href={createPageURL(currentPage + 1)}
              className={`w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm transition-colors ${currentPage >= totalPages ? 'text-gray-700 pointer-events-none' : 'text-gray-500 hover:text-white hover:border-gray-600'}`}
            >
              &gt;
            </Link>
            <Link 
              href={createPageURL(totalPages)}
              className={`w-8 h-8 flex items-center justify-center border border-gray-800 bg-gray-900 rounded-sm transition-colors ${currentPage >= totalPages ? 'text-gray-700 pointer-events-none' : 'text-gray-500 hover:text-white hover:border-gray-600'}`}
            >
              &gt;|
            </Link>
          </div>
        )}
      </div>

      <ConfirmDeleteModal
        open={!!pendingDeleteArticle}
        title="Xóa vĩnh viễn bài viết?"
        description="Hành động này sẽ xóa vĩnh viễn bài viết cùng dữ liệu nội dung, liên kết danh mục và URL SEO liên quan. Vui lòng xác nhận trước khi thực hiện."
        itemName={pendingDeleteArticle?.title}
        details={[
          { label: 'ID', value: pendingDeleteArticle?.id },
          { label: 'Đường dẫn', value: pendingDeleteArticle?.url },
        ]}
        error={deleteError}
        loading={busyId !== null}
        onCancel={closeDeleteModal}
        onConfirm={deleteArticle}
      />
    </div>
  );
}
