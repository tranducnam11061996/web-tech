'use client';

import { useState } from 'react';
import { SafeImage } from '@/components/shared/SafeImage';
import { RefreshCw, Edit, ExternalLink, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import clsx from 'clsx';
import { Pagination } from '@/components/shared/Pagination';
import { useRouter } from 'next/navigation';


export type Product = {
  id: number;
  sku: string;
  name: string;
  brand: string;
  price: number;
  marketPrice: number;
  warranty: string;
  createdAt: string;
  creator: string;
  updatedAt: string;
  updater: string;
  status: 'HIỂN THỊ' | 'ẨN';
  sequence: number;
  imageUrl: string;
  frontEndUrl?: string;
};

type ProductTableProps = {
  products: Product[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
  };
};

export function ProductTable({ products, pagination }: ProductTableProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<number | null>(null);

  const hideProduct = async (product: Product) => {
    if (!confirm(`An san pham #${product.id}?`)) return;
    setBusyId(product.id);
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Khong the an san pham');
      router.refresh();
    } catch (error: any) {
      alert(error.message || 'Khong the an san pham');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="glass-panel rounded-lg shadow-sm overflow-hidden text-sm relative z-10">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-950/80 border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider font-mono">
              <th className="p-4 font-bold whitespace-nowrap"><div className="flex items-center gap-2 group cursor-pointer hover:text-red-400 transition-colors">STT <ArrowUpDown className="w-3 h-3 text-gray-600 group-hover:text-red-400" /></div></th>
              <th className="p-4 font-bold whitespace-nowrap"><div className="flex items-center gap-2 group cursor-pointer hover:text-red-400 transition-colors">Ảnh <ArrowUpDown className="w-3 h-3 text-gray-600 group-hover:text-red-400" /></div></th>
              <th className="p-4 font-bold min-w-[300px]"><div className="flex items-center gap-2 group cursor-pointer hover:text-red-400 transition-colors">Tên Sản Phẩm <ArrowUpDown className="w-3 h-3 text-gray-600 group-hover:text-red-400" /></div></th>
              <th className="p-4 font-bold whitespace-nowrap"><div className="flex items-center gap-2 group cursor-pointer hover:text-red-400 transition-colors">Thông Tin Bán Hàng <ArrowUpDown className="w-3 h-3 text-gray-600 group-hover:text-red-400" /></div></th>
              <th className="p-4 font-bold whitespace-nowrap"><div className="flex items-center gap-2 group cursor-pointer hover:text-red-400 transition-colors">Thông Tin Quản Trị <ArrowUpDown className="w-3 h-3 text-gray-600 group-hover:text-red-400" /></div></th>
              <th className="p-4 font-bold whitespace-nowrap text-center"><div className="flex items-center justify-center gap-2 group cursor-pointer hover:text-red-400 transition-colors">Trạng thái <ArrowUpDown className="w-3 h-3 text-gray-600 group-hover:text-red-400" /></div></th>
              <th className="p-4 font-bold whitespace-nowrap text-center"><div className="flex items-center justify-center gap-2 group cursor-pointer hover:text-red-400 transition-colors">Thao tác <ArrowUpDown className="w-3 h-3 text-gray-600 group-hover:text-red-400" /></div></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {products.map((product, index) => (
              <tr key={product.id} className="hover:bg-gray-800/30 transition-colors group">
                <td className="p-4 align-top">
                  <div className="font-bold text-gray-200">#{index + 1}</div>
                  <div className="text-xs font-mono text-gray-500">#{product.id}</div>
                </td>
                <td className="p-4 align-top">
                  <div className="w-16 h-16 border border-gray-800 rounded bg-gray-950 overflow-hidden relative group-hover:border-red-500/50 transition-colors">
                    <SafeImage
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      className="object-contain p-1"
                      placeholderType="product"
                    />
                  </div>
                </td>
                <td className="p-4 align-top">
                  <div className="font-medium text-gray-200 mb-3 leading-tight group-hover:text-red-400 transition-colors cursor-pointer">
                    {product.name}
                  </div>
                  <div className="flex gap-2 text-xs font-mono">
                    <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-sm border border-blue-500/20 font-medium">● {product.sku}</span>
                    <span className="bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-sm border border-purple-500/20 font-bold uppercase tracking-wider">{product.brand}</span>
                  </div>
                </td>
                <td className="p-4 align-top text-xs text-gray-400 space-y-1.5">
                  <div className="flex justify-between w-40"><span>Giá bán:</span> <span className="text-red-400 font-bold drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">{product.price ? product.price.toLocaleString('vi-VN') + ' đ' : 'Liên hệ'}</span></div>
                  <div className="flex justify-between w-40"><span>Thị trường:</span> <span className="font-mono text-gray-400 line-through">{product.marketPrice ? product.marketPrice.toLocaleString('vi-VN') + ' đ' : ''}</span></div>
                  <div className="pt-1 mt-1 border-t border-gray-800">Bảo hành: <span className="text-gray-300">{product.warranty}</span></div>
                </td>
                <td className="p-4 align-top text-xs text-gray-500 space-y-1">
                  <div>Tạo: <span className="text-gray-300">{product.createdAt}</span></div>
                  <div>Hoàn thiện: {product.creator && <span className="text-blue-400">{product.creator}</span>}</div>
                  <div>Cập nhật: <span className="text-gray-300">{product.updatedAt}</span></div>
                  <div>Update: {product.updater && <span className="text-green-400">{product.updater}</span>}</div>
                </td>
                <td className="p-4 align-top text-center">
                  <input
                    type="number"
                    defaultValue={product.sequence}
                    className="w-14 bg-gray-900 border border-gray-700 rounded-sm px-2 py-1 text-center mb-3 mx-auto block text-sm text-gray-300 focus:outline-none focus:border-red-500/50"
                  />
                  <div className={clsx(
                    "inline-block px-3 py-1 rounded-sm text-xs font-bold text-white cursor-pointer transition-all shadow-sm uppercase tracking-wider",
                    product.status === 'ẨN'
                      ? "bg-red-950/50 text-red-400 border border-red-900 hover:bg-red-900/50 hover:shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                      : "bg-blue-950/50 text-blue-400 border border-blue-900 hover:bg-blue-900/50 hover:shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                  )}>
                    {product.status}
                  </div>
                </td>
                <td className="p-4 align-top text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <button disabled={busyId === product.id} onClick={() => hideProduct(product)} className="p-1.5 text-blue-400 hover:text-white hover:bg-blue-600 bg-blue-950/30 border border-blue-900/50 rounded-sm transition-all hover:shadow-[0_0_10px_rgba(59,130,246,0.5)] disabled:opacity-50"><RefreshCw className="w-4 h-4" /></button>
                    <Link href={`/product/edit?id=${product.id}`}>
                      <button className="p-1.5 text-green-400 hover:text-white hover:bg-green-600 bg-green-950/30 border border-green-900/50 rounded-sm transition-all hover:shadow-[0_0_10px_rgba(34,197,94,0.5)]"><Edit className="w-4 h-4" /></button>
                    </Link>
                    <a href={product.frontEndUrl || '#'} target="_blank" rel="noopener noreferrer" className="p-1.5 text-purple-400 hover:text-white hover:bg-purple-600 bg-purple-950/30 border border-purple-900/50 rounded-sm transition-all hover:shadow-[0_0_10px_rgba(168,85,247,0.5)]"><ExternalLink className="w-4 h-4" /></a>
                  </div>
                  <a href={product.frontEndUrl || '#'} target="_blank" rel="noopener noreferrer" className="text-xs font-bold uppercase tracking-wider text-red-500 hover:text-red-400 transition-colors hover:underline decoration-red-500/50 underline-offset-4 block mt-2">Xem tại web</a>
                </td>
              </tr>
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

export function ProductSkeleton() {
  return (
    <div className="glass-panel border-gray-800 rounded-lg shadow-sm p-5 animate-pulse">
      <div className="h-10 bg-gray-800/50 rounded-sm mb-6 border border-gray-700/30"></div>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="flex gap-5 mb-5 border-b border-gray-800/50 pb-5">
          <div className="w-16 h-16 bg-gray-800/50 rounded-sm border border-gray-700/30"></div>
          <div className="flex-1 space-y-3 mt-1">
            <div className="h-4 bg-gray-800/80 rounded-sm w-3/4"></div>
            <div className="flex gap-2">
              <div className="h-5 bg-gray-800/50 rounded-sm w-20"></div>
              <div className="h-5 bg-gray-800/50 rounded-sm w-16"></div>
            </div>
          </div>
          <div className="w-32 space-y-3 mt-1">
            <div className="h-3 bg-gray-800/80 rounded-sm"></div>
            <div className="h-3 bg-gray-800/50 rounded-sm w-2/3"></div>
            <div className="h-3 bg-gray-800/50 rounded-sm"></div>
          </div>
        </div>
      ))}
    </div>
  );
}
