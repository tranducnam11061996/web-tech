'use client';

import { Edit, Trash2, ArrowUpDown, Star, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { BrandModal } from './BrandModal';
import { Pagination } from '@/components/shared/Pagination';

type BrandNode = {
  id: number;
  name: string;
  logo: string | null;
  message: string | null;
  productCount: number;
  description: string | null;
  displayOrder: number | null;
  status: 'Hoạt động' | 'Tạm khóa';
  featured: boolean;
};


type BrandTableProps = {
  brands: BrandNode[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
  };
};

export function BrandTable({ brands, pagination }: BrandTableProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandNode | null>(null);

  const handleEdit = (brand: BrandNode) => {
    setEditingBrand(brand);
    setIsModalOpen(true);
  };

  return (
    <div className="glass-panel border-gray-800 rounded-lg shadow-sm overflow-hidden text-sm relative z-10 flex flex-col h-full">
      <div className="overflow-x-auto custom-scrollbar flex-1">
        <table className="w-full text-left border-collapse min-w-[1400px]">
          <thead>
            <tr className="bg-gray-950/80 border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider font-mono sticky top-0 z-20">
              <th className="p-3 font-bold w-12 text-center"><input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 cursor-pointer" /></th>
              <th className="p-3 font-bold text-center w-16">#</th>
              <th className="p-3 font-bold min-w-[200px]"><div className="flex items-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Tên thương hiệu <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Logo thương hiệu <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Lời nhắn <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Số sản phẩm <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Mô tả tóm tắt <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Thứ tự hiển thị <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Trạng thái <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center"><div className="flex items-center justify-center gap-1 cursor-pointer hover:text-blue-400 transition-colors">Nổi bật <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-3 font-bold text-center w-24">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {brands.map((row) => (
              <tr key={row.id} className="hover:bg-gray-800/30 transition-colors group">
                <td className="p-3 text-center">
                  <input type="checkbox" className="rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500 checked:border-blue-500 focus:ring-blue-500/30 transition-all cursor-pointer" />
                </td>
                <td className="p-3 text-center font-mono font-bold text-gray-400">{row.id}</td>
                <td className="p-3 font-bold text-gray-200 group-hover:text-blue-400 transition-colors cursor-pointer">{row.name}</td>
                <td className="p-3 text-center">
                  {row.logo ? (
                    <div className="h-6 w-20 relative mx-auto opacity-80 group-hover:opacity-100 transition-opacity">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mN8/x8AAuMB8DtXNJsAAAAASUVORK5CYII=" alt="logo" className="absolute inset-0 w-full h-full object-contain" />
                    </div>
                  ) : null}
                </td>
                <td className="p-3 text-center font-medium text-gray-300">{row.message || ''}</td>
                <td className="p-3 text-center">
                   <span className="font-mono font-bold text-blue-500">{row.productCount} </span>
                   <span className="text-gray-400">(Sản phẩm)</span>
                </td>
                <td className="p-3 text-center text-gray-500 italic">{row.description || ''}</td>
                <td className="p-3 text-center text-gray-500">{row.displayOrder || ''}</td>
                <td className="p-3 text-center">
                   <span className="flex items-center justify-center gap-1.5 text-green-400">
                     <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
                     {row.status}
                   </span>
                </td>
                <td className="p-3 text-center">
                   <span className="flex items-center justify-center gap-1.5 text-gray-400 hover:text-yellow-400 transition-colors cursor-pointer">
                     <Star className="w-4 h-4 fill-transparent" /> Không nổi bật
                   </span>
                </td>
                <td className="p-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button 
                      onClick={() => handleEdit(row)}
                      className="p-1.5 text-green-400 hover:text-white hover:bg-green-600 bg-green-950/30 border border-green-900/50 rounded-sm transition-all hover:shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-1.5 text-red-400 hover:text-white hover:bg-red-600 bg-red-950/30 border border-red-900/50 rounded-sm transition-all hover:shadow-[0_0_10px_rgba(239,68,68,0.5)]"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
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

      <BrandModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        isEdit={true} 
        initialData={editingBrand} 
      />
    </div>
  );
}
