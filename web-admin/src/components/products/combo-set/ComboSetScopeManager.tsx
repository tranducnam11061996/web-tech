'use client';

import { FolderTree, PackagePlus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CatalogProductPickerModal,
  type CatalogBrandChoice,
  type CatalogProductChoice,
} from '@/components/shared/CatalogProductPickerModal';
import {
  CategoryScopeSelector,
  type CategoryScopeItem,
} from '@/components/shared/CategoryScopeSelector';
import {
  ComboSetProductTable,
  type ComboProductNode,
} from './ComboSetProductTable';

type PaginationData = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
};

function CategoryScopeModal({
  open,
  categories,
  selectedIds,
  saving,
  error,
  onChange,
  onClose,
  onSave,
}: {
  open: boolean;
  categories: CategoryScopeItem[];
  selectedIds: number[];
  saving: boolean;
  error: string;
  onChange: (ids: number[]) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const generatedId = useId().replace(/:/g, '');
  const titleId = `${generatedId}-combo-category-title`;
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.setTimeout(() => dialogRef.current?.querySelector<HTMLElement>('input:not([disabled]),button:not([disabled])')?.focus(), 0);
    return () => {
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus();
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div
      className="fixed inset-0 z-50 isolate flex items-center justify-center p-3 sm:p-6"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          onClose();
          return;
        }
        if (event.key !== 'Tab' || !dialogRef.current) return;
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ));
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
    >
      {/* Keep the backdrop compositor-free and the panel overflow clipped. `hidden` still creates
          a scroll container that Chrome focus-scrolls when a visually hidden checkbox is selected. */}
      <button data-category-modal-backdrop type="button" tabIndex={-1} aria-label="Đóng hộp chọn danh mục" onClick={onClose} className="absolute inset-0 z-0 bg-black/80" />
      <div data-category-modal-panel ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="relative z-10 grid h-[92vh] max-h-[760px] w-full max-w-[1200px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-clip rounded-xl border border-gray-800 bg-gray-950 shadow-2xl">
        <header className="flex items-center justify-between border-b border-gray-800 bg-violet-950/25 p-4">
          <div>
            <h2 id={titleId} className="text-lg font-bold text-white">Add danh mục áp dụng</h2>
            <p className="mt-1 text-xs text-gray-400">Danh mục cha tự động bao gồm toàn bộ danh mục con hiện tại và tương lai.</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Đóng" className="rounded p-2 text-gray-400 hover:bg-gray-800 hover:text-white focus-visible:outline-2 focus-visible:outline-violet-400 disabled:opacity-50"><X className="h-5 w-5" aria-hidden="true" /></button>
        </header>
        <div data-category-modal-body className="min-h-0 overflow-y-auto overscroll-contain p-4 [overflow-anchor:none] custom-scrollbar">
          {error ? <div role="alert" className="mb-4 rounded-md border border-red-900 bg-red-950/30 p-3 text-sm text-red-300">{error}</div> : null}
          <CategoryScopeSelector
            categories={categories}
            selectedIds={selectedIds}
            onChange={onChange}
            selectedTitle="Danh mục combo đã chọn"
            treeTitle="Chọn danh mục áp dụng combo"
            emptyText="Chưa chọn danh mục áp dụng."
            helpText="Chọn danh mục cha sẽ tự động áp dụng combo cho sản phẩm thuộc toàn bộ nhánh."
            searchable
          />
        </div>
        <footer className="flex items-center justify-end gap-3 border-t border-gray-800 bg-gray-950 p-4">
          <button type="button" onClick={onClose} disabled={saving} className="min-h-10 rounded-md border border-gray-700 px-4 text-sm font-semibold text-gray-300 hover:border-gray-500 focus-visible:outline-2 focus-visible:outline-gray-400 disabled:opacity-50">Hủy</button>
          <button type="button" onClick={onSave} disabled={saving} className="min-h-10 rounded-md border border-violet-500 bg-violet-600 px-4 text-sm font-bold text-white shadow-lg shadow-violet-950/40 hover:bg-violet-500 focus-visible:outline-2 focus-visible:outline-violet-300 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Đang lưu…' : 'Lưu danh mục'}</button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}

export function ComboSetScopeManager({
  comboSetId,
  products,
  pagination,
  directProductIds: initialDirectProductIds,
  selectedCategoryIds,
  categories,
  brands,
  effectiveProductCount,
}: {
  comboSetId: number;
  products: ComboProductNode[];
  pagination: PaginationData;
  directProductIds: number[];
  selectedCategoryIds: number[];
  categories: CategoryScopeItem[];
  brands: CatalogBrandChoice[];
  effectiveProductCount: number;
}) {
  const router = useRouter();
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [directProductIds, setDirectProductIds] = useState(initialDirectProductIds);
  const [categoryDraft, setCategoryDraft] = useState(selectedCategoryIds);
  const [selectingProductId, setSelectingProductId] = useState<number | null>(null);
  const [removingProductId, setRemovingProductId] = useState<number | null>(null);
  const [savingCategories, setSavingCategories] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const closeProductModal = useCallback(() => setProductModalOpen(false), []);
  const closeCategoryModal = useCallback(() => {
    if (!savingCategories) setCategoryModalOpen(false);
  }, [savingCategories]);

  useEffect(() => {
    setDirectProductIds(initialDirectProductIds);
  }, [initialDirectProductIds]);
  useEffect(() => {
    if (!categoryModalOpen) setCategoryDraft(selectedCategoryIds);
  }, [categoryModalOpen, selectedCategoryIds]);

  const patchScope = async (body: Record<string, unknown>) => {
    const response = await fetch(`/api/admin/combo-sets/${comboSetId}/scope`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể cập nhật phạm vi combo.');
    return payload;
  };

  const addProduct = async (product: CatalogProductChoice) => {
    setSelectingProductId(product.id);
    setError('');
    setMessage('');
    try {
      const payload = await patchScope({ action: 'add-product', productId: product.id });
      setDirectProductIds((current) => current.includes(product.id) ? current : [...current, product.id]);
      setMessage(payload.message || `Đã thêm ${product.proName}.`);
      router.refresh();
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : 'Không thể thêm sản phẩm.');
    } finally {
      setSelectingProductId(null);
    }
  };

  const removeProduct = async (productId: number) => {
    if (!window.confirm('Gỡ quan hệ áp dụng trực tiếp của sản phẩm này?')) return;
    setRemovingProductId(productId);
    setError('');
    setMessage('');
    try {
      const payload = await patchScope({ action: 'remove-product', productId });
      setDirectProductIds((current) => current.filter((id) => id !== productId));
      setMessage(payload.message || 'Đã gỡ sản phẩm khỏi phạm vi trực tiếp.');
      router.refresh();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Không thể gỡ sản phẩm.');
    } finally {
      setRemovingProductId(null);
    }
  };

  const openCategories = () => {
    setCategoryDraft(selectedCategoryIds);
    setError('');
    setCategoryModalOpen(true);
  };

  const saveCategories = async () => {
    setSavingCategories(true);
    setError('');
    setMessage('');
    try {
      const payload = await patchScope({ action: 'replace-categories', categoryIds: categoryDraft });
      setMessage(payload.message || 'Đã cập nhật danh mục áp dụng.');
      setCategoryModalOpen(false);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể lưu danh mục.');
    } finally {
      setSavingCategories(false);
    }
  };

  return (
    <section className="flex h-full min-h-[400px] flex-col gap-4" aria-busy={selectingProductId !== null || removingProductId !== null || savingCategories}>
      <div className="flex flex-col gap-3 rounded-lg border border-gray-800 bg-gray-900/40 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-200">Phạm vi áp dụng</h2>
          <p className="mt-1 text-xs text-gray-400">{effectiveProductCount.toLocaleString('vi-VN')} sản phẩm hiệu lực · {directProductIds.length.toLocaleString('vi-VN')} sản phẩm trực tiếp · {selectedCategoryIds.length.toLocaleString('vi-VN')} danh mục gốc</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => { setError(''); setProductModalOpen(true); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-blue-500 bg-blue-600 px-4 text-sm font-bold text-white shadow-lg shadow-blue-950/40 hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-blue-300">
            <PackagePlus className="h-5 w-5" aria-hidden="true" /> Add sản phẩm áp dụng
          </button>
          <button type="button" onClick={openCategories} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-violet-500 bg-violet-600 px-4 text-sm font-bold text-white shadow-lg shadow-violet-950/40 hover:bg-violet-500 focus-visible:outline-2 focus-visible:outline-violet-300">
            <FolderTree className="h-5 w-5" aria-hidden="true" /> Add danh mục áp dụng
          </button>
        </div>
      </div>

      {message ? <div role="status" className="rounded-md border border-emerald-900 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">{message}</div> : null}
      {error && !productModalOpen && !categoryModalOpen ? <div role="alert" className="rounded-md border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</div> : null}

      <div className="min-h-0 flex-1">
        <ComboSetProductTable
          products={products}
          pagination={pagination}
          removingProductId={removingProductId}
          onRemoveDirect={removeProduct}
          onManageCategories={openCategories}
        />
      </div>

      <CatalogProductPickerModal
        isOpen={productModalOpen}
        onClose={closeProductModal}
        selectedProductIds={directProductIds}
        onSelect={addProduct}
        title="Add sản phẩm áp dụng"
        description="Tìm theo SKU, ID hoặc tên sản phẩm. Mỗi lựa chọn được lưu ngay và hộp thoại vẫn mở."
        emptyText="Không tìm thấy sản phẩm phù hợp."
        brands={brands}
        selectingProductId={selectingProductId}
        selectionError={productModalOpen ? error : ''}
      />
      <CategoryScopeModal
        open={categoryModalOpen}
        categories={categories}
        selectedIds={categoryDraft}
        saving={savingCategories}
        error={categoryModalOpen ? error : ''}
        onChange={setCategoryDraft}
        onClose={closeCategoryModal}
        onSave={saveCategories}
      />
    </section>
  );
}
