'use client';

import { Pagination } from '@/components/shared/Pagination';
import { SafeImage } from '@/components/shared/SafeImage';

export type ComboProductNode = {
  id: number;
  sku: string;
  name: string;
  price: number;
  marketPrice: number;
  imageUrl: string;
  status: string;
  direct: boolean;
  categorySources: Array<{ id: number; name: string }>;
};

type PaginationData = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
};

export function ComboSetProductTable({
  products,
  pagination,
  removingProductId,
  onRemoveDirect,
  onManageCategories,
}: {
  products: ComboProductNode[];
  pagination: PaginationData;
  removingProductId: number | null;
  onRemoveDirect: (productId: number) => void;
  onManageCategories: () => void;
}) {
  return (
    <div className="flex flex-col h-full bg-gray-900/30 rounded-lg border border-gray-800/80 overflow-hidden shadow-xl">
      <div className="overflow-x-auto flex-1 custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-950/80 border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider font-mono sticky top-0 z-10 backdrop-blur-md">
              <th className="p-4 font-bold w-16 text-center">ID</th>
              <th className="p-4 font-bold w-24 text-center">Ảnh</th>
              <th className="p-4 font-bold w-32">Mã SP</th>
              <th className="p-4 font-bold min-w-[300px]">Tên sản phẩm</th>
              <th className="p-4 font-bold min-w-[220px]">Nguồn áp dụng</th>
              <th className="p-4 font-bold w-40 text-right">Giá bán</th>
              <th className="p-4 font-bold w-32 text-center">Trạng thái</th>
              <th className="p-4 font-bold w-40 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {products.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-10 text-center text-gray-500 font-mono">
                  Combo Set này chưa được cấu hình sử dụng cho sản phẩm nào!
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-800/40 transition-colors group">
                  <td className="p-4 text-center text-gray-500 font-mono text-sm">{product.id}</td>
                  <td className="p-4">
                    <div className="w-12 h-12 rounded bg-gray-900 overflow-hidden border border-gray-800 flex items-center justify-center mx-auto relative">
                      <SafeImage
                        src={product.imageUrl}
                        alt={product.name}
                        fill
                        className="object-cover"
                        placeholderType="product"
                      />
                    </div>
                  </td>
                  <td className="p-4 text-gray-400 font-mono text-sm">{product.sku || '-'}</td>
                  <td className="p-4 font-medium text-gray-200 group-hover:text-blue-400 transition-colors">
                    {product.name}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1.5">
                      {product.direct ? <span className="rounded-full border border-blue-600/50 bg-blue-950/50 px-2 py-1 text-xs font-semibold text-blue-200">Trực tiếp</span> : null}
                      {product.categorySources.map((category) => (
                        <span key={category.id} className="rounded-full border border-violet-600/40 bg-violet-950/40 px-2 py-1 text-xs font-semibold text-violet-200">
                          {category.name}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex flex-col">
                      <span className="text-red-400 font-bold">{product.price.toLocaleString('vi-VN')} đ</span>
                      {product.marketPrice > product.price && (
                        <span className="text-gray-500 text-xs line-through">{product.marketPrice.toLocaleString('vi-VN')} đ</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    {product.status === '1' ? (
                      <span className="px-2.5 py-1 text-xs text-green-400 bg-green-500/10 border border-green-500/30 rounded-full font-medium shadow-[0_0_8px_rgba(34,197,94,0.15)]">
                        HIỂN THỊ
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 text-xs text-gray-400 bg-gray-500/10 border border-gray-500/30 rounded-full font-medium">
                        ẨN
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {product.direct ? (
                      <button
                        type="button"
                        onClick={() => onRemoveDirect(product.id)}
                        disabled={removingProductId !== null}
                        className="min-h-10 rounded-md border border-red-800/70 bg-red-950/30 px-3 text-xs font-semibold text-red-300 hover:border-red-600 hover:bg-red-950/50 focus-visible:outline-2 focus-visible:outline-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {removingProductId === product.id ? 'Đang gỡ…' : 'Gỡ trực tiếp'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={onManageCategories}
                        className="min-h-10 rounded-md border border-violet-700/60 bg-violet-950/30 px-3 text-xs font-semibold text-violet-200 hover:border-violet-500 focus-visible:outline-2 focus-visible:outline-violet-400"
                      >
                        Quản lý danh mục
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {products.length > 0 && (
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
