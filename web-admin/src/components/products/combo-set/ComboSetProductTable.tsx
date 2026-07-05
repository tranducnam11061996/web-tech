'use client';

import { Pagination } from '@/components/shared/Pagination';
import { SafeImage } from '@/components/shared/SafeImage';
import Link from 'next/link';

type ComboProductNode = {
  id: number;
  sku: string;
  name: string;
  price: number;
  marketPrice: number;
  imageUrl: string;
  status: string;
};

type PaginationData = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
};

export function ComboSetProductTable({ products, pagination }: { products: ComboProductNode[], pagination: PaginationData }) {
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
              <th className="p-4 font-bold w-40 text-right">Giá bán</th>
              <th className="p-4 font-bold w-32 text-center">Trạng thái</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {products.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-10 text-center text-gray-500 font-mono">
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
