'use client';

import { X, Search, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { SafeImage } from '@/components/shared/SafeImage';

type ProductModalNode = {
  id: number;
  proName: string;
  storeSKU: string;
  brandName: string;
  price: number;
  market_price: number;
  proThum: string;
};

function productImageUrl(value: unknown) {
  const raw = String(value || '').trim();
  if (!raw || raw === '0') return '';
  if (/^https?:\/\//i.test(raw) || raw.startsWith('/')) return raw;
  return `https://hacom.vn/media/product/${raw}`;
}

export function AddProductModal({
  collectionId,
  isOpen,
  onClose,
}: {
  collectionId: number;
  isOpen: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<ProductModalNode[]>([]);
  const [orderings, setOrderings] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const loadProducts = async (keyword = search) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: '20', page: '1' });
      if (keyword.trim()) params.set('search', keyword.trim());
      const response = await fetch(`/api/admin/products?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể tải sản phẩm');
      setProducts(payload.data.items || []);
    } catch (loadError: any) {
      setError(loadError.message || 'Không thể tải sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    loadProducts('');
    return () => {
      document.body.style.overflow = 'unset';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    loadProducts(search);
  };

  const addProduct = async (productId: number) => {
    setBusyId(productId);
    setError('');
    try {
      const response = await fetch(`/api/admin/collections/${collectionId}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          ordering: Number(orderings[productId]) || 0,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể thêm sản phẩm');
      router.refresh();
      onClose();
    } catch (addError: any) {
      setError(addError.message || 'Không thể thêm sản phẩm');
    } finally {
      setBusyId(null);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-6xl max-h-[90vh] bg-gray-950 border border-gray-800 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gradient-to-r from-blue-900/50 to-blue-950">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="w-1.5 h-5 bg-blue-400 rounded-full shadow-[0_0_10px_rgba(96,165,250,0.8)]"></span>
            Chọn sản phẩm vào bộ sưu tập
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/50 rounded border border-transparent transition-all"
            aria-label="Đóng modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submitSearch} className="p-4 bg-gray-900/50 border-b border-gray-800">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nhập ID, SKU hoặc tên sản phẩm"
                className="w-full bg-gray-950 border border-gray-800 rounded-md pl-9 pr-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <button className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-all text-sm font-medium shadow-[0_0_10px_rgba(37,99,235,0.2)]">
              <Search className="w-4 h-4" /> Tìm kiếm
            </button>
          </div>
          {error && <div className="mt-3 rounded border border-red-900/70 bg-red-950/30 px-3 py-2 text-sm text-red-300">{error}</div>}
        </form>

        <div className="flex-1 overflow-auto custom-scrollbar bg-gray-950/30">
          <table className="w-full text-left border-collapse min-w-[1000px] text-sm">
            <thead className="bg-gray-900/80 sticky top-0 z-10 backdrop-blur-sm shadow-sm border-b border-gray-800">
              <tr className="text-gray-400 text-xs uppercase tracking-wider font-mono">
                <th className="p-3 font-bold w-16 text-center">ID</th>
                <th className="p-3 font-bold w-20 text-center">Ảnh</th>
                <th className="p-3 font-bold min-w-[300px]">Tên sản phẩm</th>
                <th className="p-3 font-bold">Mã SP</th>
                <th className="p-3 font-bold text-center">Thương hiệu</th>
                <th className="p-3 font-bold text-right">Giá bán</th>
                <th className="p-3 font-bold text-center w-28">STT</th>
                <th className="p-3 font-bold text-center w-36">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-gray-500 font-mono">Đang tải sản phẩm...</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-gray-500 font-mono">Không tìm thấy sản phẩm.</td>
                </tr>
              ) : (
                products.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-800/40 transition-colors group">
                    <td className="p-3 text-center font-mono font-bold text-gray-500 group-hover:text-gray-300">{row.id}</td>
                    <td className="p-3 text-center">
                      <div className="w-14 h-12 border border-gray-700 rounded bg-gray-900 overflow-hidden relative mx-auto group-hover:border-blue-500/50 transition-colors">
                        <SafeImage src={productImageUrl(row.proThum)} alt={row.proName} fill className="object-contain p-1" placeholderType="product" />
                      </div>
                    </td>
                    <td className="p-3 font-medium text-blue-400 leading-relaxed">{row.proName}</td>
                    <td className="p-3 font-mono text-gray-400">{row.storeSKU}</td>
                    <td className="p-3 text-center font-bold text-blue-500 uppercase tracking-wider text-xs">{row.brandName || '-'}</td>
                    <td className="p-3 text-right font-bold text-red-400">
                      {row.price ? `${Number(row.price).toLocaleString('vi-VN')} đ` : 'Liên hệ'}
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        value={orderings[row.id] ?? '0'}
                        onChange={(event) => setOrderings((current) => ({ ...current, [row.id]: event.target.value }))}
                        className="w-20 bg-gray-950 border border-gray-800 rounded-md px-2 py-1 text-center text-sm text-gray-200 focus:outline-none focus:border-blue-500/50"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => addProduct(row.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/30 text-emerald-400 border border-emerald-900 hover:bg-emerald-900/50 hover:border-emerald-500/50 rounded transition-all text-xs font-bold shadow-sm mx-auto disabled:opacity-60"
                      >
                        <Plus className="w-3.5 h-3.5" /> {busyId === row.id ? 'Đang thêm...' : 'Chọn'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
