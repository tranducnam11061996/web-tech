'use client';

import { useState, useEffect } from 'react';
import { Search, X, Check, Loader2 } from 'lucide-react';
import { searchProducts } from '@/actions/product';

type Product = {
  id: number;
  proName: string;
  storeSKU: string;
};

export function ProductSelectModal({
  isOpen,
  onClose,
  onSelect,
  multiple = true
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (products: Product[]) => void;
  multiple?: boolean;
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState(''); // Only update search on Enter or button click
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0, pageSize: 20 });
  const [selectedProducts, setSelectedProducts] = useState<Map<number, Product>>(new Map());

  // Fetch products
  useEffect(() => {
    if (!isOpen) return;

    const fetchDatas = async () => {
      setLoading(true);
      const res = await searchProducts(searchTerm, page, 20);
      setProducts(res.data);
      setPagination(res.pagination);
      setLoading(false);
    };
    
    fetchDatas();
  }, [isOpen, searchTerm, page]);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSearchInput('');
      setPage(1);
      setSelectedProducts(new Map());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSearch = () => {
    setSearchTerm(searchInput);
    setPage(1);
  };

  const toggleSelect = (product: Product) => {
    const newMap = new Map(selectedProducts);
    if (newMap.has(product.id)) {
      newMap.delete(product.id);
    } else {
      if (!multiple) newMap.clear(); // If single select, clear others
      newMap.set(product.id, product);
    }
    setSelectedProducts(newMap);
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!multiple) return;
    const newMap = new Map(selectedProducts);
    if (e.target.checked) {
      products.forEach(p => newMap.set(p.id, p));
    } else {
      products.forEach(p => newMap.delete(p.id));
    }
    setSelectedProducts(newMap);
  };

  const handleConfirm = () => {
    onSelect(Array.from(selectedProducts.values()));
    onClose();
  };

  const allCurrentPageSelected = products.length > 0 && products.every(p => selectedProducts.has(p.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0a0a0f] border border-gray-800 rounded-lg shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/50">
          <h2 className="text-lg font-bold text-gray-200 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-5 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span>
            Tìm kiếm & Thêm Sản Phẩm
          </h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-gray-800 bg-gray-950 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Nhập tên, mã sản phẩm hoặc ID..." 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-sm text-sm text-gray-200 focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <button 
            onClick={handleSearch}
            className="px-6 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/50 font-bold uppercase tracking-wider text-sm rounded-sm hover:bg-blue-600 hover:text-white transition-all whitespace-nowrap"
          >
            Tìm kiếm
          </button>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto custom-scrollbar p-0 bg-gray-950/30 relative">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-950/50 backdrop-blur-sm z-10">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : null}

          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-gray-900 border-b border-gray-800 shadow-md z-10">
              <tr className="text-gray-400 text-[11px] uppercase tracking-wider font-mono">
                <th className="p-3 w-12 text-center">
                  {multiple && (
                    <input 
                      type="checkbox" 
                      checked={allCurrentPageSelected}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded bg-gray-900 border-gray-700 text-blue-500 focus:ring-blue-500/30 focus:ring-offset-gray-900"
                    />
                  )}
                </th>
                <th className="p-3 w-40">Mã Sản Phẩm</th>
                <th className="p-3 min-w-[300px]">Tên sản phẩm</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/30">
              {products.length === 0 && !loading ? (
                <tr>
                  <td colSpan={3} className="p-10 text-center text-gray-500 font-mono">
                    Không tìm thấy sản phẩm nào!
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr 
                    key={product.id} 
                    className={`hover:bg-gray-800/50 transition-colors cursor-pointer ${selectedProducts.has(product.id) ? 'bg-blue-900/10' : ''}`}
                    onClick={() => toggleSelect(product)}
                  >
                    <td className="p-3 text-center">
                      <input 
                        type="checkbox" 
                        checked={selectedProducts.has(product.id)}
                        readOnly
                        className="w-4 h-4 rounded bg-gray-900 border-gray-700 text-blue-500 focus:ring-blue-500/30 focus:ring-offset-gray-900 cursor-pointer"
                      />
                    </td>
                    <td className="p-3 text-gray-400 font-mono text-sm">{product.storeSKU || '-'}</td>
                    <td className="p-3 text-gray-200 font-medium text-sm">{product.proName}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer & Pagination */}
        <div className="p-4 border-t border-gray-800 bg-gray-950 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-400 font-mono">
              Đã chọn: <span className="text-blue-400 text-base">{selectedProducts.size}</span>
            </span>
          </div>

          <div className="flex-1 flex justify-center">
            {/* Custom mini pagination to not rely on URL params like the main Pagination component does */}
            <div className="flex items-center gap-1 font-mono text-sm">
              <button 
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 bg-gray-800 border border-gray-700 text-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
              >
                Prev
              </button>
              <span className="px-4 text-gray-500 text-xs">
                {page} / {pagination.totalPages}
              </span>
              <button 
                disabled={page >= pagination.totalPages}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 bg-gray-800 border border-gray-700 text-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
              >
                Next
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-transparent text-gray-400 font-bold uppercase tracking-wider text-sm rounded-sm hover:text-white transition-all"
            >
              Hủy
            </button>
            <button 
              onClick={handleConfirm}
              disabled={selectedProducts.size === 0}
              className="px-6 py-2 bg-blue-600 text-white font-bold uppercase tracking-wider text-sm rounded-sm hover:bg-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-[0_0_15px_rgba(37,99,235,0.3)]"
            >
              <Check className="w-4 h-4" /> Xác nhận thêm
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
