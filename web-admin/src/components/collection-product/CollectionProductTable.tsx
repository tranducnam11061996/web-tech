'use client';

import { Eye, Trash2, ArrowUpDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ConfirmDeleteModal } from '@/components/shared/ConfirmDeleteModal';
import { Pagination } from '@/components/shared/Pagination';
import { SafeImage } from '@/components/shared/SafeImage';

type CollectionProductNode = {
  linkId: number;
  collectionId: number;
  productId: number;
  ordering: number;
  linkedAt: string;
  product: {
    id: number;
    name: string;
    sku: string;
    brand: string;
    price: number;
    marketPrice: number;
    status: number;
    imageUrl: string;
  };
};

type PaginationData = {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
};

function OrderingInput({
  collectionId,
  row,
  onError,
}: {
  collectionId: number;
  row: CollectionProductNode;
  onError: (message: string) => void;
}) {
  const router = useRouter();
  const [value, setValue] = useState(String(row.ordering));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (saving || Number(value) === row.ordering) return;
    setSaving(true);
    onError('');
    try {
      const response = await fetch(`/api/admin/collections/${collectionId}/products/${row.linkId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ordering: Number(value) || 0 }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể cập nhật STT');
      router.refresh();
    } catch (error: any) {
      onError(error.message || 'Không thể cập nhật STT');
      setValue(String(row.ordering));
    } finally {
      setSaving(false);
    }
  };

  return (
    <input
      type="number"
      value={value}
      disabled={saving}
      onChange={(event) => setValue(event.target.value)}
      onBlur={save}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
      }}
      className="w-20 bg-gray-900 border border-gray-700 rounded-sm px-2 py-1 text-center mx-auto block text-sm text-blue-400 focus:outline-none focus:border-blue-500/50 disabled:opacity-60"
      aria-label={`STT sản phẩm ${row.product.name || row.productId}`}
    />
  );
}

export function CollectionProductTable({
  collectionId,
  products,
  pagination,
}: {
  collectionId: number;
  products: CollectionProductNode[];
  pagination: PaginationData;
}) {
  const router = useRouter();
  const [pendingDeleteProduct, setPendingDeleteProduct] = useState<CollectionProductNode | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const closeDeleteModal = () => {
    if (busyId !== null) return;
    setPendingDeleteProduct(null);
    setError('');
  };

  const deleteProduct = async () => {
    const row = pendingDeleteProduct;
    if (!row) return;
    setBusyId(row.linkId);
    setError('');
    try {
      const response = await fetch(`/api/admin/collections/${collectionId}/products/${row.linkId}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể xóa sản phẩm khỏi bộ sưu tập');
      setPendingDeleteProduct(null);
      router.refresh();
    } catch (deleteError: any) {
      setError(deleteError.message || 'Không thể xóa sản phẩm khỏi bộ sưu tập');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="glass-panel border-gray-800 rounded-lg shadow-sm overflow-hidden text-sm relative z-10 flex flex-col h-full">
      {error && <div className="border-b border-red-900/70 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</div>}
      <div className="overflow-x-auto custom-scrollbar flex-1">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-gray-950/80 border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider font-mono sticky top-0 z-20">
              <th className="p-4 font-bold w-12 text-center">#</th>
              <th className="p-4 font-bold min-w-[280px]"><div className="flex items-center gap-1">Tên sản phẩm <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-4 font-bold text-center"><div className="flex items-center justify-center gap-1">Mã sản phẩm <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-4 font-bold text-center"><div className="flex items-center justify-center gap-1">Ảnh <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-4 font-bold text-center"><div className="flex items-center justify-center gap-1">Giá bán <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-4 font-bold text-center"><div className="flex items-center justify-center gap-1">Ngày thêm <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-4 font-bold text-center w-24"><div className="flex items-center justify-center gap-1">STT <ArrowUpDown className="w-3 h-3 text-gray-600" /></div></th>
              <th className="p-4 font-bold text-center w-24">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {products.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-10 text-center text-gray-500 font-mono">
                  Bộ sưu tập này chưa có sản phẩm nào.
                </td>
              </tr>
            ) : (
              products.map((row, index) => (
                <tr key={row.linkId} className="hover:bg-gray-800/30 transition-colors group">
                  <td className="p-4 text-center font-mono text-gray-500 align-middle">
                    {(pagination.page - 1) * pagination.limit + index + 1}
                  </td>
                  <td className="p-4 font-medium text-gray-200 group-hover:text-blue-400 transition-colors align-middle">
                    {row.product.name || `Sản phẩm #${row.productId} không còn tồn tại`}
                    {row.product.brand && <div className="mt-1 text-xs font-bold uppercase tracking-wider text-purple-400">{row.product.brand}</div>}
                  </td>
                  <td className="p-4 text-center font-mono text-gray-400 align-middle">{row.product.sku || row.productId}</td>
                  <td className="p-4 text-center align-middle">
                    <div className="w-16 h-16 border border-gray-800 rounded bg-gray-950 overflow-hidden relative mx-auto group-hover:border-blue-500/50 transition-colors">
                      <SafeImage src={row.product.imageUrl} alt={row.product.name || String(row.productId)} fill className="object-contain p-1" placeholderType="product" />
                    </div>
                  </td>
                  <td className="p-4 text-center align-middle">
                    <div className="font-bold text-blue-400">{row.product.price ? `${row.product.price.toLocaleString('vi-VN')} đ` : 'Liên hệ'}</div>
                    {row.product.marketPrice > row.product.price && (
                      <div className="text-xs text-gray-500 line-through">{row.product.marketPrice.toLocaleString('vi-VN')} đ</div>
                    )}
                  </td>
                  <td className="p-4 text-center font-mono text-gray-400 align-middle">{row.linkedAt}</td>
                  <td className="p-4 text-center align-middle">
                    <OrderingInput collectionId={collectionId} row={row} onError={setError} />
                  </td>
                  <td className="p-4 text-center align-middle">
                    <div className="flex items-center justify-center gap-2">
                      <a
                        href={`/product/edit?id=${row.productId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-blue-400 hover:text-white hover:bg-blue-600 bg-blue-950/30 border border-blue-900/50 rounded-sm transition-all hover:shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                        title="Xem sản phẩm"
                      >
                        <Eye className="w-4 h-4" />
                      </a>
                      <button
                        type="button"
                        disabled={busyId === row.linkId}
                        onClick={() => {
                          setPendingDeleteProduct(row);
                          setError('');
                        }}
                        className="p-1.5 text-red-400 hover:text-white hover:bg-red-600 bg-red-950/30 border border-red-900/50 rounded-sm transition-all hover:shadow-[0_0_10px_rgba(239,68,68,0.5)] disabled:opacity-50"
                        title="Xóa"
                        aria-label={`Xóa sản phẩm khỏi bộ sưu tập ${row.product.name || row.productId}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.total}
        pageSize={pagination.limit}
      />

      <ConfirmDeleteModal
        open={!!pendingDeleteProduct}
        title="Xóa sản phẩm khỏi bộ sưu tập?"
        description="Hành động này chỉ xóa liên kết sản phẩm khỏi bộ sưu tập, không xóa sản phẩm gốc."
        itemName={pendingDeleteProduct?.product.name}
        details={[
          { label: 'Product ID', value: pendingDeleteProduct?.productId },
          { label: 'SKU', value: pendingDeleteProduct?.product.sku },
        ]}
        error={error}
        loading={busyId !== null}
        onCancel={closeDeleteModal}
        onConfirm={deleteProduct}
      />
    </div>
  );
}
