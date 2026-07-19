'use client';

import clsx from 'clsx';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  LoaderCircle,
  PackageSearch,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { QuickToolCategoryTree } from '@/components/quick-tools/QuickToolCategoryTree';
import { SafeImage } from '@/components/shared/SafeImage';
import { hasPermission, type AdminPermission } from '@/lib/admin/permissions';
import type {
  IncompleteProductRow,
  QuickAttributeValue,
  QuickToolAttributeSummary,
  QuickToolCategorySummary,
} from '@/lib/admin/quickProductAttributes';

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: { message?: string; code?: string; requestId?: string };
};

type ProductResult = {
  items: IncompleteProductRow[];
  values: QuickAttributeValue[];
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

type SaveResult = {
  changed: boolean;
  productId: number;
  previousValueIds: number[];
  attributeValueIds: number[];
  revision: string;
};

type SelectionState = {
  desiredIds: number[];
  persistedIds: number[];
  revision: string;
  saving: boolean;
  saved: boolean;
  error: string;
  errorCode: string;
};

class QuickToolApiError extends Error {
  code: string;

  constructor(message: string, code = '') {
    super(message);
    this.code = code;
  }
}

const EMPTY_PRODUCT_RESULT: ProductResult = {
  items: [],
  values: [],
  page: 1,
  limit: 20,
  totalItems: 0,
  totalPages: 1,
};

function arraysEqual(left: readonly number[], right: readonly number[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function sortedIds(ids: readonly number[]) {
  return Array.from(new Set(ids)).sort((a, b) => a - b);
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('vi-VN').format(Math.max(0, Math.round(value || 0)));
}

function plainText(value: string) {
  return value.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/\s+/g, ' ').trim();
}

async function readApi<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({})) as ApiEnvelope<T>;
  if (!response.ok || !body.success || body.data === undefined) {
    throw new QuickToolApiError(body.error?.message || 'Không thể xử lý yêu cầu', body.error?.code);
  }
  return body.data;
}

function StepRail({ categoryReady, attributeReady }: { categoryReady: boolean; attributeReady: boolean }) {
  const steps = [
    { number: 1, label: 'Chọn danh mục', done: categoryReady, active: !categoryReady },
    { number: 2, label: 'Chọn thuộc tính', done: attributeReady, active: categoryReady && !attributeReady },
    { number: 3, label: 'Xử lý SKU', done: false, active: attributeReady },
  ];
  return (
    <ol aria-label="Tiến trình cập nhật thuộc tính" className="grid overflow-hidden rounded-xl border border-gray-800 bg-gray-950/75 sm:grid-cols-3">
      {steps.map((step, index) => (
        <li key={step.number} aria-current={step.active ? 'step' : undefined} className={clsx('relative flex items-center gap-3 px-4 py-3', index > 0 && 'border-t border-gray-800 sm:border-l sm:border-t-0', step.active && 'bg-blue-500/10')}>
          <span className={clsx('grid h-8 w-8 shrink-0 place-items-center rounded-full border text-xs font-semibold', step.done ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300' : step.active ? 'border-blue-400/50 bg-blue-500/15 text-blue-200' : 'border-gray-700 bg-gray-900 text-gray-500')}>
            {step.done ? <Check className="h-4 w-4" aria-hidden="true" /> : step.number}
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-600">Bước 0{step.number}</p>
            <p className={clsx('text-sm font-medium', step.active ? 'text-white' : step.done ? 'text-gray-300' : 'text-gray-500')}>{step.label}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function IncompleteProductAttributesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryId = Number(searchParams.get('categoryId') || 0);
  const attributeId = Number(searchParams.get('attributeId') || 0);
  const categoryQuery = searchParams.get('categoryQ') || '';
  const productQuery = searchParams.get('q') || '';
  const status = searchParams.get('status') || 'all';
  const sort = searchParams.get('sort') || 'id-desc';
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const limit = [20, 50, 100].includes(Number(searchParams.get('limit'))) ? Number(searchParams.get('limit')) : 20;
  const includeComplete = searchParams.get('includeComplete') === '1';
  const deferredProductQuery = useDeferredValue(productQuery);

  const [categories, setCategories] = useState<QuickToolCategorySummary[]>([]);
  const [attributes, setAttributes] = useState<QuickToolAttributeSummary[]>([]);
  const [products, setProducts] = useState<ProductResult>(EMPTY_PRODUCT_RESULT);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [attributesLoading, setAttributesLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [activeProductId, setActiveProductId] = useState<number | null>(null);
  const [valueQuery, setValueQuery] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [canUpdate, setCanUpdate] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [selectionSnapshot, setSelectionSnapshot] = useState(new Map<number, SelectionState>());
  const selectionRef = useRef(new Map<number, SelectionState>());
  const pendingHideRef = useRef(new Set<number>());

  const updateUrl = useCallback((patch: Record<string, string | number | boolean | null>, push = false) => {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(patch).forEach(([key, value]) => {
      if (value === null || value === '' || value === false) next.delete(key);
      else next.set(key, value === true ? '1' : String(value));
    });
    const url = `/quick-tools/incomplete-product-attributes${next.size ? `?${next.toString()}` : ''}`;
    if (push) router.push(url, { scroll: false });
    else router.replace(url, { scroll: false });
  }, [router, searchParams]);

  const touchSelection = useCallback((productId: number, updater: (current: SelectionState) => SelectionState) => {
    const current = selectionRef.current.get(productId);
    if (!current) return;
    selectionRef.current.set(productId, updater(current));
    setSelectionSnapshot(new Map(selectionRef.current));
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/auth/me')
      .then((response) => readApi<{ permissions: AdminPermission[] }>(response))
      .then((session) => {
        if (!cancelled) setCanUpdate(hasPermission(session.permissions, 'catalog.attributes.update'));
      })
      .catch(() => {
        if (!cancelled) setCanUpdate(false);
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setCategoriesLoading(true);
    const params = new URLSearchParams();
    if (includeComplete) params.set('includeComplete', '1');
    if (categoryId > 0) params.set('selectedCategoryId', String(categoryId));
    fetch(`/api/admin/quick-tools/incomplete-product-attributes/categories?${params}`, { signal: controller.signal })
      .then((response) => readApi<QuickToolCategorySummary[]>(response))
      .then((data) => {
        setCategories(data);
        setLoadError('');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setLoadError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setCategoriesLoading(false);
    });
    return () => controller.abort();
  }, [categoryId, includeComplete, refreshToken]);

  useEffect(() => {
    if (!categoryId) {
      setAttributes([]);
      return;
    }
    const controller = new AbortController();
    setAttributesLoading(true);
    fetch(`/api/admin/quick-tools/incomplete-product-attributes/attributes?categoryId=${categoryId}`, { signal: controller.signal })
      .then((response) => readApi<QuickToolAttributeSummary[]>(response))
      .then((data) => {
        setAttributes(data);
        setLoadError('');
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setLoadError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setAttributesLoading(false);
      });
    return () => controller.abort();
  }, [categoryId, refreshToken]);

  useEffect(() => {
    setActiveProductId(null);
    setValueQuery('');
    selectionRef.current.clear();
    pendingHideRef.current.clear();
    setSelectionSnapshot(new Map());
  }, [categoryId, attributeId]);

  useEffect(() => {
    if (!categoryId || !attributeId) {
      setProducts(EMPTY_PRODUCT_RESULT);
      return;
    }
    const controller = new AbortController();
    const params = new URLSearchParams({
      categoryId: String(categoryId),
      attributeId: String(attributeId),
      page: String(page),
      limit: String(limit),
      status,
      sort,
    });
    if (deferredProductQuery) params.set('q', deferredProductQuery);
    setProductsLoading(true);
    fetch(`/api/admin/quick-tools/incomplete-product-attributes/products?${params}`, { signal: controller.signal })
      .then((response) => readApi<ProductResult>(response))
      .then((data) => {
        data.items.forEach((product) => {
          if (!selectionRef.current.has(product.id)) {
            selectionRef.current.set(product.id, {
              desiredIds: product.selectedValueIds,
              persistedIds: product.selectedValueIds,
              revision: product.selectionRevision,
              saving: false,
              saved: false,
              error: '',
              errorCode: '',
            });
          }
        });
        setProducts((current) => {
          const sticky = activeProductId ? current.items.find((product) => product.id === activeProductId) : undefined;
          const stickySelection = sticky ? selectionRef.current.get(sticky.id) : undefined;
          if (sticky && stickySelection?.persistedIds.length && !data.items.some((product) => product.id === sticky.id)) {
            return { ...data, items: [sticky, ...data.items] };
          }
          return data;
        });
        setLoadError('');
        setSelectionSnapshot(new Map(selectionRef.current));
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setLoadError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setProductsLoading(false);
      });
    return () => controller.abort();
  }, [activeProductId, attributeId, categoryId, deferredProductQuery, limit, page, sort, status]);

  const removeCompletedProduct = useCallback((productId: number) => {
    setProducts((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== productId),
      totalItems: Math.max(0, current.totalItems - 1),
    }));
    pendingHideRef.current.delete(productId);
    if (activeProductId === productId) setActiveProductId(null);
    setRefreshToken((token) => token + 1);
  }, [activeProductId]);

  const flushProduct = useCallback(async (productId: number) => {
    const initial = selectionRef.current.get(productId);
    if (!initial || initial.saving) return;
    touchSelection(productId, (current) => ({ ...current, saving: true, saved: false, error: '', errorCode: '' }));
    while (true) {
      const current = selectionRef.current.get(productId);
      if (!current) return;
      if (arraysEqual(current.desiredIds, current.persistedIds)) {
        touchSelection(productId, (state) => ({ ...state, saving: false, saved: true }));
        if (pendingHideRef.current.has(productId) && current.persistedIds.length > 0) removeCompletedProduct(productId);
        return;
      }
      const submittedIds = [...current.desiredIds];
      try {
        const response = await fetch(`/api/admin/quick-tools/incomplete-product-attributes/products/${productId}/values`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            categoryId,
            attributeId,
            attributeValueIds: submittedIds,
            expectedRevision: current.revision,
          }),
        });
        const saved = await readApi<SaveResult>(response);
        touchSelection(productId, (state) => ({
          ...state,
          persistedIds: sortedIds(saved.attributeValueIds),
          revision: saved.revision,
          saving: true,
          saved: true,
          error: '',
          errorCode: '',
        }));
        setAnnouncement(`Đã lưu ${saved.attributeValueIds.length} giá trị cho SKU ${products.items.find((item) => item.id === productId)?.sku || productId}.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Không thể lưu thuộc tính';
        touchSelection(productId, (state) => ({
          ...state,
          saving: false,
          saved: false,
          error: message,
          errorCode: error instanceof QuickToolApiError ? error.code : '',
        }));
        setAnnouncement(`Lưu thất bại: ${message}`);
        return;
      }
    }
  }, [attributeId, categoryId, products.items, removeCompletedProduct, touchSelection]);

  const toggleValue = useCallback((productId: number, valueId: number) => {
    if (!canUpdate) return;
    touchSelection(productId, (current) => {
      const desired = new Set(current.desiredIds);
      if (desired.has(valueId)) desired.delete(valueId);
      else desired.add(valueId);
      return { ...current, desiredIds: sortedIds(Array.from(desired)), saved: false, error: '', errorCode: '' };
    });
    void flushProduct(productId);
  }, [canUpdate, flushProduct, touchSelection]);

  const openProduct = useCallback((productId: number) => {
    if (activeProductId === productId) {
      setActiveProductId(null);
      return;
    }
    if (activeProductId) {
      const previous = selectionRef.current.get(activeProductId);
      if (previous?.persistedIds.length && arraysEqual(previous.desiredIds, previous.persistedIds) && !previous.saving && !previous.error) {
        removeCompletedProduct(activeProductId);
      } else if (previous?.desiredIds.length || previous?.saving) {
        pendingHideRef.current.add(activeProductId);
      }
    }
    setValueQuery('');
    setActiveProductId(productId);
  }, [activeProductId, removeCompletedProduct]);

  const selectedCategory = categories.find((category) => category.id === categoryId);
  const selectedAttribute = attributes.find((attribute) => attribute.id === attributeId);
  const visibleValues = useMemo(() => {
    const query = valueQuery.trim().toLocaleLowerCase('vi');
    return products.values.filter((value) => !query || `${value.name} ${value.description}`.toLocaleLowerCase('vi').includes(query));
  }, [products.values, valueQuery]);

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 pb-12">
      <header className="flex flex-col gap-4 rounded-2xl border border-gray-800/80 bg-gray-950/70 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link href="/quick-tools" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Công cụ nhanh
          </Link>
          <div className="mt-3 flex items-center gap-3">
            <span className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-2 text-blue-300"><Sparkles className="h-5 w-5" aria-hidden="true" /></span>
            <div>
              <h1 className="text-xl font-semibold text-white">Cập nhật sản phẩm chưa đủ thuộc tính</h1>
              <p className="mt-1 text-sm text-gray-500">Chọn theo 3 bước. Mỗi checkbox được lưu ngay vào database.</p>
            </div>
          </div>
        </div>
        <div className={clsx('inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium', canUpdate ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/30 bg-amber-500/10 text-amber-300')}>
          {canUpdate ? <CircleDot className="h-3.5 w-3.5" aria-hidden="true" /> : <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />}
          {canUpdate ? 'Autosave đang bật' : 'Chế độ chỉ xem'}
        </div>
      </header>

      <StepRail categoryReady={categoryId > 0} attributeReady={categoryId > 0 && attributeId > 0} />

      {loadError && (
        <div role="alert" className="flex items-center justify-between gap-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />{loadError}</span>
          <button type="button" onClick={() => setRefreshToken((token) => token + 1)} className="rounded-md border border-red-400/30 px-3 py-1.5 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300">Thử lại</button>
        </div>
      )}

      <div className="grid min-h-[640px] gap-4 xl:grid-cols-[330px_minmax(0,1fr)]">
        <section aria-labelledby="category-heading" className="flex min-h-0 flex-col rounded-2xl border border-gray-800/80 bg-gray-950/65">
          <div className="border-b border-gray-800 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-400">Bước 01</p>
                <h2 id="category-heading" className="mt-1 font-semibold text-gray-100">Danh mục cần xử lý</h2>
              </div>
              {categoriesLoading && categories.length > 0 ? <LoaderCircle className="h-4 w-4 animate-spin text-blue-400" aria-label="Đang làm mới danh mục" /> : null}
            </div>
            <label className="relative mt-4 block">
              <span className="sr-only">Tìm danh mục</span>
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-600" aria-hidden="true" />
              <input value={categoryQuery} onChange={(event) => updateUrl({ categoryQ: event.target.value })} placeholder="Tìm không phân biệt dấu..." className="w-full rounded-lg border border-gray-800 bg-black/30 py-2 pl-9 pr-3 text-sm text-gray-200 outline-none placeholder:text-gray-700 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20" />
            </label>
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-gray-500">
              <input type="checkbox" checked={includeComplete} onChange={(event) => updateUrl({ includeComplete: event.target.checked, page: 1 })} className="h-4 w-4 rounded border-gray-700 bg-gray-900 text-blue-500 focus:ring-blue-400" />
              Hiện cả danh mục đã hoàn tất
            </label>
          </div>
          {categoriesLoading && categories.length === 0 ? (
            <div className="flex flex-1 items-start justify-center gap-2 py-16 text-sm text-gray-600"><LoaderCircle className="h-4 w-4 animate-spin" />Đang thống kê...</div>
          ) : (
            <QuickToolCategoryTree
              categories={categories}
              selectedId={categoryId}
              searchQuery={categoryQuery}
              onSelect={(selectedCategoryId) => updateUrl({ categoryId: selectedCategoryId, attributeId: null, page: 1 }, true)}
            />
          )}
        </section>

        <div className="flex min-w-0 flex-col gap-4">
          <section aria-labelledby="attribute-heading" className="rounded-2xl border border-gray-800/80 bg-gray-950/65 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-400">Bước 02</p>
                <h2 id="attribute-heading" className="mt-1 font-semibold text-gray-100">Thuộc tính trong phạm vi danh mục</h2>
                {selectedCategory && <p className="mt-1 text-xs text-gray-600">{selectedCategory.breadcrumb}</p>}
              </div>
              {attributesLoading && <LoaderCircle className="h-4 w-4 animate-spin text-blue-400" aria-label="Đang tải thuộc tính" />}
            </div>
            {!categoryId ? (
              <p className="mt-4 rounded-xl border border-dashed border-gray-800 px-4 py-8 text-center text-sm text-gray-600">Chọn một danh mục ở bước 01.</p>
            ) : attributes.length === 0 && !attributesLoading ? (
              <p className="mt-4 rounded-xl border border-dashed border-gray-800 px-4 py-8 text-center text-sm text-gray-600">Danh mục này chưa có thuộc tính active được mapping.</p>
            ) : (
              <div className="custom-scrollbar mt-4 flex gap-2 overflow-x-auto pb-2" role="list" aria-label="Thuộc tính có thể xử lý">
                {attributes.map((attribute) => (
                  <button key={attribute.id} type="button" onClick={() => updateUrl({ attributeId: attribute.id, page: 1 }, true)} className={clsx('min-w-[150px] rounded-xl border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400', attributeId === attribute.id ? 'border-red-500/50 bg-red-500/10' : 'border-gray-800 bg-black/20 hover:border-gray-700')}>
                    <span className={clsx('block min-h-10 line-clamp-2 text-sm font-semibold leading-5', attributeId === attribute.id ? 'text-red-200' : 'text-gray-300')}>{attribute.name}</span>
                    <span className="mt-1 flex items-center justify-between gap-3 text-[11px] text-gray-600"><span>{attribute.valueCount} giá trị</span><span className="text-amber-300">{attribute.incompleteProductCount} thiếu</span></span>
                  </button>
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="products-heading" className="flex min-h-[480px] min-w-0 flex-1 flex-col rounded-2xl border border-gray-800/80 bg-gray-950/65">
            <div className="border-b border-gray-800 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-400">Bước 03</p>
                  <h2 id="products-heading" className="mt-1 font-semibold text-gray-100">SKU chưa có {selectedAttribute?.name || 'thuộc tính đã chọn'}</h2>
                  {attributeId > 0 && <p className="mt-1 text-xs text-gray-600">{products.totalItems} sản phẩm còn thiếu trong phạm vi mapping hợp lệ.</p>}
                </div>
                <div className="grid gap-2 sm:grid-cols-[minmax(180px,1fr)_140px_160px_88px]">
                  <label className="relative">
                    <span className="sr-only">Tìm SKU hoặc tên sản phẩm</span>
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-600" aria-hidden="true" />
                    <input value={productQuery} onChange={(event) => updateUrl({ q: event.target.value, page: 1 })} placeholder="Tìm SKU / tên..." className="w-full rounded-lg border border-gray-800 bg-black/30 py-2 pl-9 pr-3 text-sm text-gray-200 outline-none placeholder:text-gray-700 focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20" />
                  </label>
                  <label>
                    <span className="sr-only">Lọc trạng thái</span>
                    <select value={status} onChange={(event) => updateUrl({ status: event.target.value, page: 1 })} className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-300 outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20">
                      <option value="all">Tất cả trạng thái</option><option value="visible">Đang hiện</option><option value="hidden">Đang ẩn</option>
                    </select>
                  </label>
                  <label>
                    <span className="sr-only">Sắp xếp sản phẩm</span>
                    <select value={sort} onChange={(event) => updateUrl({ sort: event.target.value, page: 1 })} className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-300 outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20">
                      <option value="id-desc">ID mới nhất</option><option value="id-asc">ID cũ nhất</option><option value="sku-asc">SKU A–Z</option><option value="sku-desc">SKU Z–A</option><option value="name-asc">Tên A–Z</option><option value="name-desc">Tên Z–A</option>
                    </select>
                  </label>
                  <label>
                    <span className="sr-only">Số sản phẩm mỗi trang</span>
                    <select value={limit} onChange={(event) => updateUrl({ limit: event.target.value, page: 1 })} className="w-full rounded-lg border border-gray-800 bg-gray-950 px-3 py-2 text-sm text-gray-300 outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20">
                      <option value="20">20 / trang</option><option value="50">50 / trang</option><option value="100">100 / trang</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>

            <div className="custom-scrollbar min-h-0 flex-1 overflow-auto p-3">
              {!attributeId ? (
                <div className="grid min-h-80 place-items-center rounded-xl border border-dashed border-gray-800 text-center"><div><PackageSearch className="mx-auto h-8 w-8 text-gray-700" /><p className="mt-3 text-sm text-gray-600">Chọn thuộc tính ở bước 02 để lọc SKU còn thiếu.</p></div></div>
              ) : productsLoading && products.items.length === 0 ? (
                <div className="grid min-h-80 place-items-center text-sm text-gray-600"><span className="flex items-center gap-2"><LoaderCircle className="h-4 w-4 animate-spin" />Đang lọc sản phẩm...</span></div>
              ) : products.items.length === 0 ? (
                <div className="grid min-h-80 place-items-center rounded-xl border border-emerald-500/15 bg-emerald-500/[0.03] text-center"><div><Check className="mx-auto h-9 w-9 rounded-full border border-emerald-500/30 p-2 text-emerald-400" /><p className="mt-3 font-medium text-emerald-200">Không còn SKU phù hợp</p><p className="mt-1 text-sm text-gray-600">Phạm vi và bộ lọc hiện tại đã hoàn tất.</p></div></div>
              ) : (
                <div className="space-y-2" aria-busy={productsLoading}>
                  {products.items.map((product) => {
                    const open = activeProductId === product.id;
                    const selection = selectionSnapshot.get(product.id);
                    const selectedCount = selection?.desiredIds.length || 0;
                    return (
                      <article key={product.id} className={clsx('overflow-hidden rounded-xl border transition', open ? 'border-blue-500/45 bg-blue-500/[0.04]' : selection?.error ? 'border-red-500/35 bg-red-500/[0.03]' : 'border-gray-800 bg-black/20')}>
                        <button type="button" aria-expanded={open} aria-controls={`values-${product.id}`} onClick={() => openProduct(product.id)} className="grid w-full grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-400 md:grid-cols-[64px_minmax(240px,1.2fr)_minmax(180px,.8fr)_auto]">
                          <div className="h-14 w-14 overflow-hidden rounded-lg border border-gray-800 bg-gray-900 md:h-16 md:w-16"><SafeImage src={product.thumbnail} alt="" width={64} height={64} placeholderType="product" className="h-full w-full object-contain" /></div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-200">{product.name}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs"><span className="rounded bg-gray-900 px-2 py-0.5 font-mono text-blue-300">{product.sku || `ID ${product.id}`}</span><span className={product.isOn ? 'text-emerald-400' : 'text-gray-600'}>{product.isOn ? 'Đang hiện' : 'Đang ẩn'}</span><span className="text-gray-600">{formatPrice(product.price)}đ</span></div>
                          </div>
                          <div className="col-span-2 min-w-0 md:col-span-1"><p className="truncate text-xs text-gray-500">{product.categoryNames.join(' • ')}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-600">{plainText(product.summary) || 'Chưa có tóm tắt cấu hình.'}</p></div>
                          <div className="flex items-center gap-2 justify-self-end">
                            {selection?.saving && <span className="hidden items-center gap-1 text-xs text-blue-300 sm:flex"><LoaderCircle className="h-3.5 w-3.5 animate-spin" />Đang lưu</span>}
                            {!selection?.saving && selection?.saved && !selection.error && <span className="hidden items-center gap-1 text-xs text-emerald-400 sm:flex"><Check className="h-3.5 w-3.5" />Đã lưu</span>}
                            {selection?.error && <AlertCircle className="h-4 w-4 text-red-400" aria-label="Lưu thất bại" />}
                            {selectedCount > 0 && <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-xs font-semibold text-blue-200">{selectedCount}</span>}
                            <ChevronDown className={clsx('h-4 w-4 text-gray-600 transition-transform', open && 'rotate-180')} aria-hidden="true" />
                          </div>
                        </button>
                        {open && (
                          <div id={`values-${product.id}`} className="border-t border-gray-800 bg-gray-950/75 p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div><p className="text-sm font-semibold text-gray-200">Chọn giá trị {selectedAttribute?.name}</p><p className="mt-1 text-xs text-gray-600">Có thể chọn nhiều giá trị. Thay đổi được autosave tuần tự.</p></div>
                              {products.values.length > 12 && <label className="relative"><span className="sr-only">Tìm giá trị thuộc tính</span><Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-600" /><input autoFocus value={valueQuery} onChange={(event) => setValueQuery(event.target.value)} placeholder="Tìm trong giá trị..." className="w-full rounded-lg border border-gray-800 bg-black/30 py-2 pl-9 pr-3 text-sm text-gray-200 outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/20 sm:w-64" /></label>}
                            </div>
                            {!canUpdate && <p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">Tài khoản cần quyền <code>catalog.attributes.update</code> để autosave.</p>}
                            {selection?.error && <div role="alert" className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200"><span>{selection.error}</span><button type="button" onClick={() => selection.errorCode === 'CONFLICT' ? window.location.reload() : void flushProduct(product.id)} className="inline-flex items-center gap-1 rounded border border-red-400/30 px-2 py-1 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300"><RefreshCw className="h-3 w-3" />{selection.errorCode === 'CONFLICT' ? 'Tải lại dữ liệu' : 'Thử lưu lại'}</button></div>}
                            <fieldset className="mt-4"><legend className="sr-only">Giá trị {selectedAttribute?.name}</legend><div className="grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                              {visibleValues.map((value) => {
                                const checked = selection?.desiredIds.includes(value.id) || false;
                                return <label key={value.id} className={clsx('flex cursor-pointer items-start gap-2 rounded-lg border p-3 transition focus-within:ring-2 focus-within:ring-blue-400', checked ? 'border-blue-500/45 bg-blue-500/10 text-blue-100' : 'border-gray-800 bg-black/20 text-gray-400 hover:border-gray-700', !canUpdate && 'cursor-not-allowed opacity-60')}><input type="checkbox" disabled={!canUpdate} checked={checked} onChange={() => toggleValue(product.id, value.id)} className="mt-0.5 h-4 w-4 rounded border-gray-700 bg-gray-900 text-blue-500 focus:ring-blue-400" /><span className="min-w-0"><span className="block text-sm font-medium">{value.name}</span>{value.description && <span className="mt-0.5 block text-xs text-gray-600">{value.description}</span>}</span></label>;
                              })}
                            </div></fieldset>
                            {visibleValues.length === 0 && <p className="py-8 text-center text-sm text-gray-600">Không tìm thấy giá trị phù hợp.</p>}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            {attributeId > 0 && products.totalItems > 0 && (
              <footer className="flex flex-col gap-3 border-t border-gray-800 px-4 py-3 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                <span>Trang {products.page}/{products.totalPages} · {products.totalItems} SKU</span>
                <div className="flex items-center gap-2">
                  <button type="button" aria-label="Trang trước" disabled={page <= 1} onClick={() => updateUrl({ page: page - 1 }, true)} className="rounded-md border border-gray-800 p-2 text-gray-400 hover:border-gray-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"><ChevronLeft className="h-4 w-4" /></button>
                  <span className="min-w-16 text-center text-gray-400">{page} / {products.totalPages}</span>
                  <button type="button" aria-label="Trang sau" disabled={page >= products.totalPages} onClick={() => updateUrl({ page: page + 1 }, true)} className="rounded-md border border-gray-800 p-2 text-gray-400 hover:border-gray-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </footer>
            )}
          </section>
        </div>
      </div>
      <p className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</p>
    </div>
  );
}
