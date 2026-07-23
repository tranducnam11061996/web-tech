'use client';

import { AlertTriangle, ArrowDown, ArrowUp, Plus, Save, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AddVariantProductModal } from './AddVariantProductModal';
import {
  assignQuickValueToProduct,
  normalizeProductGroupOrdering,
  prependProductGroupAttribute,
  PRODUCT_GROUP_VALUE_LIMIT,
} from './productGroupEditorState';
import type { ProductCatalogChoice, ProductGroupAttributeForm, ProductGroupDetails, ProductGroupProductForm, ProductGroupValueForm } from './types';

const EMPTY_GROUP: ProductGroupDetails = { name: '', description: '', attributes: [], products: [] };
const CREATE_VALUE_OPTION = '__create-product-group-value__';
const money = (value: number) => `${new Intl.NumberFormat('vi-VN').format(Math.max(0, Number(value || 0)))}đ`;

type QuickValueDraft = {
  attributeKey: string;
  productId: number;
  name: string;
  error: string;
};

function randomKey(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function newValue(index = 0): ProductGroupValueForm {
  return { key: randomKey('value'), name: '', description: '', ordering: index };
}

function newAttribute(index = 0): ProductGroupAttributeForm {
  return { key: randomKey('attribute'), name: '', ordering: index, values: [newValue()] };
}

export function ProductGroupEditor({ groupId }: { groupId?: number }) {
  const router = useRouter();
  const [group, setGroup] = useState<ProductGroupDetails>(EMPTY_GROUP);
  const [initialSnapshot, setInitialSnapshot] = useState(JSON.stringify(EMPTY_GROUP));
  const [loading, setLoading] = useState(Boolean(groupId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [quickValueDraft, setQuickValueDraft] = useState<QuickValueDraft | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const dirty = useMemo(() => JSON.stringify(group) !== initialSnapshot, [group, initialSnapshot]);

  useEffect(() => {
    if (!groupId) return;
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch(`/api/admin/product-groups/${groupId}`, { cache: 'no-store', signal: controller.signal });
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể tải group sản phẩm');
        setGroup(payload.data);
        setInitialSnapshot(JSON.stringify(payload.data));
      } catch (loadError) {
        if ((loadError as Error).name !== 'AbortError') setError((loadError as Error).message || 'Không thể tải group sản phẩm');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [groupId]);

  useEffect(() => {
    if (!dirty) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', beforeUnload);
    return () => window.removeEventListener('beforeunload', beforeUnload);
  }, [dirty]);

  const closePicker = useCallback(() => setPickerOpen(false), []);
  const updateAttributes = (updater: (attributes: ProductGroupAttributeForm[]) => ProductGroupAttributeForm[]) => {
    setGroup((current) => ({ ...current, attributes: normalizeProductGroupOrdering(updater(current.attributes)) }));
  };
  const focusLater = (id: string, scroll = false) => {
    window.requestAnimationFrame(() => {
      const element = document.getElementById(id);
      if (scroll) element?.scrollIntoView({ block: 'center' });
      element?.focus();
    });
  };
  const addAttributeAtTop = () => {
    const attribute = newAttribute();
    setQuickValueDraft(null);
    setGroup((current) => ({
      ...current,
      attributes: prependProductGroupAttribute(current.attributes, attribute),
    }));
    focusLater(`product-group-attribute-name-${attribute.key}`, true);
  };
  const updateAttribute = (attributeKey: string, patch: Partial<ProductGroupAttributeForm>) => updateAttributes((attributes) => attributes.map((attribute) => attribute.key === attributeKey ? { ...attribute, ...patch } : attribute));
  const removeAttribute = (attributeKey: string) => {
    setQuickValueDraft((current) => current?.attributeKey === attributeKey ? null : current);
    setGroup((current) => ({
      ...current,
      attributes: normalizeProductGroupOrdering(current.attributes.filter((attribute) => attribute.key !== attributeKey)),
      products: current.products.map((product) => ({ ...product, selections: product.selections.filter((selection) => selection.attributeKey !== attributeKey) })),
    }));
  };
  const moveAttribute = (index: number, delta: number) => updateAttributes((attributes) => {
    const target = index + delta;
    if (target < 0 || target >= attributes.length) return attributes;
    const next = [...attributes];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
  const updateValues = (attributeKey: string, updater: (values: ProductGroupValueForm[]) => ProductGroupValueForm[]) => updateAttributes((attributes) => attributes.map((attribute) => attribute.key === attributeKey ? { ...attribute, values: updater(attribute.values) } : attribute));
  const removeValue = (attributeKey: string, valueKey: string) => setGroup((current) => ({
    ...current,
    attributes: normalizeProductGroupOrdering(current.attributes.map((attribute) => attribute.key === attributeKey ? { ...attribute, values: attribute.values.filter((value) => value.key !== valueKey) } : attribute)),
    products: current.products.map((product) => ({ ...product, selections: product.selections.filter((selection) => selection.valueKey !== valueKey) })),
  }));
  const moveValue = (attributeKey: string, index: number, delta: number) => updateValues(attributeKey, (values) => {
    const target = index + delta;
    if (target < 0 || target >= values.length) return values;
    const next = [...values];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });

  const addProduct = useCallback((product: ProductCatalogChoice) => {
    setGroup((current) => {
      if (current.products.some((item) => item.productId === Number(product.id))) return current;
      const next: ProductGroupProductForm = {
        productId: Number(product.id), sku: String(product.storeSKU || ''), name: String(product.proName || ''),
        brandId: Number(product.brandId || 0), brandName: String(product.brandName || ''), thumbnail: String(product.proThum || ''),
        price: Number(product.price || 0), marketPrice: Number(product.market_price || 0), status: Number(product.isOn || 0), selections: [],
      };
      return { ...current, products: [...current.products, next] };
    });
    setPickerOpen(false);
  }, []);

  const selectValue = (productId: number, attributeKey: string, valueKey: string) => setGroup((current) => ({
    ...current,
    products: current.products.map((product) => {
      if (product.productId !== productId) return product;
      const withoutAttribute = product.selections.filter((selection) => selection.attributeKey !== attributeKey);
      return { ...product, selections: valueKey ? [...withoutAttribute, { attributeKey, valueKey }] : withoutAttribute };
    }),
  }));
  const quickValueInputId = (attributeKey: string, productId: number) => `quick-product-group-value-${attributeKey}-${productId}`;
  const valueSelectId = (attributeKey: string, productId: number) => `product-group-value-select-${attributeKey}-${productId}`;
  const startQuickValue = (attributeKey: string, productId: number) => {
    setQuickValueDraft({ attributeKey, productId, name: '', error: '' });
    focusLater(quickValueInputId(attributeKey, productId));
  };
  const cancelQuickValue = () => {
    if (!quickValueDraft) return;
    const selectId = valueSelectId(quickValueDraft.attributeKey, quickValueDraft.productId);
    setQuickValueDraft(null);
    focusLater(selectId);
  };
  const commitQuickValue = () => {
    if (!quickValueDraft) return;
    try {
      const next = assignQuickValueToProduct(group, {
        attributeKey: quickValueDraft.attributeKey,
        productId: quickValueDraft.productId,
        name: quickValueDraft.name,
        createKey: () => randomKey('value'),
      });
      const selectId = valueSelectId(quickValueDraft.attributeKey, quickValueDraft.productId);
      setGroup(next);
      setQuickValueDraft(null);
      focusLater(selectId);
    } catch (quickValueError) {
      setQuickValueDraft((current) => current ? {
        ...current,
        error: (quickValueError as Error).message || 'Không thể tạo value.',
      } : current);
    }
  };
  const handleValueSelection = (productId: number, attributeKey: string, valueKey: string) => {
    if (valueKey === CREATE_VALUE_OPTION) {
      startQuickValue(attributeKey, productId);
      return;
    }
    setQuickValueDraft(null);
    selectValue(productId, attributeKey, valueKey);
  };
  const removeProduct = (productId: number) => {
    setQuickValueDraft((current) => current?.productId === productId ? null : current);
    setGroup((current) => ({
      ...current,
      products: current.products.filter((product) => product.productId !== productId),
    }));
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      if (!group.name.trim()) throw new Error('Vui lòng nhập tên group.');
      if (group.attributes.some((attribute) => !attribute.name.trim() || attribute.values.length === 0 || attribute.values.some((value) => !value.name.trim()))) throw new Error('Mỗi thuộc tính cần tên và ít nhất một giá trị có tên.');
      if (group.products.some((product) => product.selections.length === 0)) throw new Error('Mỗi SKU đã chọn cần ít nhất một giá trị phân loại.');
      const response = await fetch(groupId ? `/api/admin/product-groups/${groupId}` : '/api/admin/product-groups', {
        method: groupId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: group.name, description: group.description, attributes: group.attributes, products: group.products.map(({ productId, selections }) => ({ productId, selections })) }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể lưu group sản phẩm');
      setGroup(payload.data);
      setInitialSnapshot(JSON.stringify(payload.data));
      setSuccess(groupId ? 'Đã cập nhật group sản phẩm.' : 'Đã tạo group sản phẩm.');
      if (!groupId && payload.data.id) router.replace(`/product/product-group/edit?id=${payload.data.id}`);
    } catch (saveError) {
      setError((saveError as Error).message || 'Không thể lưu group sản phẩm');
      window.setTimeout(() => errorRef.current?.focus(), 0);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-12 text-center text-gray-400" role="status">Đang tải group sản phẩm…</div>;

  return (
    <div className="h-full w-full overflow-y-auto p-3 pb-24 custom-scrollbar">
      <header className="sticky top-0 z-30 mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 bg-[#0a0a0f]/95 py-3 backdrop-blur-md">
        <div><h1 className="text-2xl font-bold text-white">{groupId ? 'Chỉnh sửa Group sản phẩm' : 'Tạo Group sản phẩm'}</h1><p className="mt-1 text-sm text-gray-400">Mỗi SKU có thể chọn tối đa một value trên mỗi thuộc tính.</p></div>
        <div className="flex items-center gap-3"><Link href="/product/product-group" onClick={(event) => { if (dirty && !window.confirm('Bạn có thay đổi chưa lưu. Rời trang?')) event.preventDefault(); }} className="inline-flex items-center gap-2 rounded-md border border-gray-700 bg-gray-900 px-4 py-2 text-gray-300 hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-gray-400"><X className="h-4 w-4" aria-hidden="true" /> Đóng</Link><button type="button" disabled={saving} onClick={save} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2 font-bold text-white hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-blue-400 disabled:cursor-wait disabled:opacity-60"><Save className="h-4 w-4" aria-hidden="true" />{saving ? 'Đang lưu…' : 'Lưu group'}</button></div>
      </header>

      <div ref={errorRef} tabIndex={-1}>{error ? <div role="alert" className="mb-5 rounded-lg border border-red-900 bg-red-950/30 p-4 text-red-200">{error}</div> : null}{success ? <div role="status" className="mb-5 rounded-lg border border-emerald-900 bg-emerald-950/30 p-4 text-emerald-200">{success}</div> : null}</div>
      {group.diagnostics && (group.diagnostics.orphanProductCount > 0 || group.diagnostics.invalidConfigCount > 0) ? <div className="mb-5 flex gap-3 rounded-lg border border-amber-800 bg-amber-950/25 p-4 text-amber-200"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /><div><strong>Dữ liệu legacy cần chú ý</strong><p className="mt-1 text-sm">{group.diagnostics.orphanProductCount} liên kết product mồ côi và {group.diagnostics.invalidConfigCount} cấu hình không hợp lệ sẽ không xuất hiện trên storefront. Khi lưu, danh sách SKU hợp lệ trên form sẽ trở thành dữ liệu của group.</p></div></div> : null}

      <div className="space-y-6">
        <section className="rounded-xl border border-gray-800 bg-gray-950/45 p-5" aria-labelledby="group-info-title"><h2 id="group-info-title" className="mb-4 text-lg font-bold text-white">Thông tin group</h2><div className="grid gap-4 md:grid-cols-2"><label className="space-y-1.5 text-sm text-gray-300">Tên group <span className="text-red-400">*</span><input value={group.name} onChange={(event) => setGroup((current) => ({ ...current, name: event.target.value }))} required maxLength={150} aria-invalid={!group.name.trim()} className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2.5 text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30" /></label><label className="space-y-1.5 text-sm text-gray-300">Mô tả<input value={group.description} onChange={(event) => setGroup((current) => ({ ...current, description: event.target.value }))} maxLength={255} className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2.5 text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30" /></label></div></section>

        <section className="rounded-xl border border-gray-800 bg-gray-950/45 p-5" aria-labelledby="attributes-title">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="attributes-title" className="text-balance text-lg font-bold text-white">Thuộc tính, giá trị và SKU</h2>
              <p className="mt-1 text-pretty text-sm text-gray-400">Mỗi thuộc tính là một section riêng. Tối đa 4 thuộc tính, 50 value mỗi thuộc tính và 50 SKU.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" disabled={group.attributes.length >= 4} onClick={addAttributeAtTop} className="inline-flex items-center gap-2 rounded-md border border-blue-800 bg-blue-950/30 px-3 py-2 text-sm font-semibold text-blue-300 hover:bg-blue-900/40 focus-visible:outline-2 focus-visible:outline-blue-400 disabled:opacity-40"><Plus className="h-4 w-4" aria-hidden="true" /> Thêm thuộc tính</button>
            </div>
          </div>
          {group.attributes.length === 0 ? <div className="rounded-lg border border-dashed border-gray-700 p-8 text-center"><p className="text-pretty text-gray-400">Thêm thuộc tính như “Màu sắc”, “Dung lượng RAM” để cấu hình value và SKU.</p><button type="button" onClick={addAttributeAtTop} className="mt-4 inline-flex items-center gap-2 rounded-md border border-blue-800 bg-blue-950/30 px-3 py-2 text-sm font-semibold text-blue-300 hover:bg-blue-900/40 focus-visible:outline-2 focus-visible:outline-blue-400"><Plus className="h-4 w-4" aria-hidden="true" /> Thêm thuộc tính đầu tiên</button></div> : null}
          <div className="space-y-5">
            {group.attributes.map((attribute, attributeIndex) => {
              const attributeTitleId = `product-group-attribute-${attribute.key}`;
              const skuTitleId = `product-group-attribute-skus-${attribute.key}`;
              return <article key={attribute.key} aria-labelledby={attributeTitleId} className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/45">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 px-4 py-3">
                  <div>
                    <h3 id={attributeTitleId} className="text-balance font-semibold text-white">Thuộc tính {attributeIndex + 1}: {attribute.name || 'Chưa đặt tên'}</h3>
                    <p className="mt-1 text-xs text-gray-500">{attribute.values.length} value · {group.products.length} SKU trong group</p>
                  </div>
                  <div className="flex gap-1">
                    <button type="button" disabled={attributeIndex === 0} onClick={() => moveAttribute(attributeIndex, -1)} aria-label={`Đưa ${attribute.name || 'thuộc tính'} lên`} className="rounded border border-gray-700 p-2 text-gray-300 focus-visible:outline-2 focus-visible:outline-blue-400 disabled:opacity-30"><ArrowUp className="h-4 w-4" aria-hidden="true" /></button>
                    <button type="button" disabled={attributeIndex === group.attributes.length - 1} onClick={() => moveAttribute(attributeIndex, 1)} aria-label={`Đưa ${attribute.name || 'thuộc tính'} xuống`} className="rounded border border-gray-700 p-2 text-gray-300 focus-visible:outline-2 focus-visible:outline-blue-400 disabled:opacity-30"><ArrowDown className="h-4 w-4" aria-hidden="true" /></button>
                    <button type="button" onClick={() => removeAttribute(attribute.key)} aria-label={`Xóa ${attribute.name || 'thuộc tính'}`} className="rounded border border-red-900 p-2 text-red-400 hover:bg-red-950/40 focus-visible:outline-2 focus-visible:outline-red-400"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                  </div>
                </div>
                <div className="grid gap-4 p-4 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
                  <section aria-label={`Tên và value của ${attribute.name || `thuộc tính ${attributeIndex + 1}`}`} className="rounded-lg border border-gray-800 bg-gray-950/55 p-4">
                    <label className="block space-y-1.5 text-sm text-gray-300">Tên thuộc tính
                      <input id={`product-group-attribute-name-${attribute.key}`} value={attribute.name} onChange={(event) => updateAttribute(attribute.key, { name: event.target.value })} maxLength={150} required className="w-full rounded-md border border-gray-700 bg-gray-900 px-3 py-2.5 text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30" />
                    </label>
                    <div className="mt-4 space-y-2">
                      {attribute.values.map((value, valueIndex) => <div key={value.key} className="grid gap-2 rounded-md border border-gray-800/70 bg-gray-900/70 p-3 xl:grid-cols-[minmax(160px,1fr)_auto]">
                        <label className="text-xs text-gray-400">Tên value
                          <input value={value.name} onChange={(event) => updateValues(attribute.key, (values) => values.map((item) => item.key === value.key ? { ...item, name: event.target.value } : item))} maxLength={150} required className="mt-1 w-full rounded border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500" />
                        </label>
                        <div className="flex items-end gap-1">
                          <button type="button" disabled={valueIndex === 0} onClick={() => moveValue(attribute.key, valueIndex, -1)} aria-label={`Đưa ${value.name || 'value'} lên`} className="rounded border border-gray-700 p-2 text-gray-300 focus-visible:outline-2 focus-visible:outline-blue-400 disabled:opacity-30"><ArrowUp className="h-4 w-4" aria-hidden="true" /></button>
                          <button type="button" disabled={valueIndex === attribute.values.length - 1} onClick={() => moveValue(attribute.key, valueIndex, 1)} aria-label={`Đưa ${value.name || 'value'} xuống`} className="rounded border border-gray-700 p-2 text-gray-300 focus-visible:outline-2 focus-visible:outline-blue-400 disabled:opacity-30"><ArrowDown className="h-4 w-4" aria-hidden="true" /></button>
                          <button type="button" disabled={attribute.values.length <= 1} onClick={() => removeValue(attribute.key, value.key)} aria-label={`Xóa ${value.name || 'value'}`} className="rounded border border-red-900 p-2 text-red-400 hover:bg-red-950/40 focus-visible:outline-2 focus-visible:outline-red-400 disabled:opacity-30"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                        </div>
                      </div>)}
                    </div>
                    <button type="button" disabled={attribute.values.length >= 50} onClick={() => updateValues(attribute.key, (values) => [...values, newValue(values.length)])} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-md border border-blue-500 bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:cursor-not-allowed disabled:opacity-40"><Plus className="h-4 w-4" aria-hidden="true" /> Thêm value</button>
                  </section>

                  <section aria-labelledby={skuTitleId} className="overflow-hidden rounded-lg border border-gray-800 bg-gray-950/55">
                    <div className="border-b border-gray-800 px-4 py-3">
                      <h4 id={skuTitleId} className="font-semibold text-white">SKU trong group ({group.products.length})</h4>
                      <p className="mt-1 text-pretty text-xs text-gray-500">Chọn value của “{attribute.name || 'thuộc tính này'}” cho từng SKU.</p>
                    </div>
                    <div className="overflow-auto custom-scrollbar">
                      <table className="w-full min-w-[680px] text-left text-sm">
                        <thead className="bg-gray-900 text-xs text-gray-400">
                          <tr><th className="p-3 font-medium">Sản phẩm</th><th className="p-3 font-medium">Value</th><th className="p-3 font-medium">Giá</th><th className="w-16 p-3 text-center font-medium">Xóa</th></tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/60">
                          {group.products.length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-gray-400">Chưa chọn SKU cho group. Dùng nút “Thêm sản phẩm” bên dưới để bắt đầu.</td></tr> : null}
                          {group.products.map((product) => {
                            const selected = product.selections.find((selection) => selection.attributeKey === attribute.key)?.valueKey || '';
                            const quickCreateActive = quickValueDraft?.attributeKey === attribute.key && quickValueDraft.productId === product.productId;
                            const canCreateValue = attribute.values.length < PRODUCT_GROUP_VALUE_LIMIT || attribute.values.some((value) => !value.name.trim());
                            const quickValueErrorId = `quick-product-group-value-error-${attribute.key}-${product.productId}`;
                            return <tr key={product.productId} className="hover:bg-gray-800/20">
                              <td className="max-w-[320px] p-3"><div className="line-clamp-2 font-medium text-gray-100">{product.name}</div><div className="mt-1 font-mono text-xs text-blue-300">{product.sku} · ID {product.productId}</div>{product.status !== 1 ? <div className="mt-1 text-xs text-amber-300">SKU đang ẩn</div> : null}</td>
                              <td className="p-3">
                                {quickCreateActive ? <form onSubmit={(event) => { event.preventDefault(); commitQuickValue(); }} className="min-w-[260px] space-y-2">
                                  <label htmlFor={quickValueInputId(attribute.key, product.productId)} className="sr-only">Tên value mới cho {attribute.name || 'thuộc tính'} của {product.name}</label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      id={quickValueInputId(attribute.key, product.productId)}
                                      value={quickValueDraft.name}
                                      onChange={(event) => setQuickValueDraft((current) => current ? { ...current, name: event.target.value, error: '' } : current)}
                                      onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); cancelQuickValue(); } }}
                                      maxLength={150}
                                      required
                                      aria-invalid={Boolean(quickValueDraft.error)}
                                      aria-describedby={quickValueDraft.error ? quickValueErrorId : undefined}
                                      className="min-h-10 min-w-0 flex-1 rounded border border-blue-500 bg-gray-900 px-3 py-2 text-gray-100 outline-none focus:ring-2 focus:ring-blue-500/35"
                                      placeholder="Nhập tên value mới"
                                    />
                                    <button type="submit" className="min-h-10 rounded-md bg-blue-600 px-3 py-2 font-semibold text-white hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400">Thêm</button>
                                    <button type="button" onClick={cancelQuickValue} className="min-h-10 rounded-md border border-gray-700 px-3 py-2 text-gray-300 hover:bg-gray-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-400">Hủy</button>
                                  </div>
                                  {quickValueDraft.error ? <p id={quickValueErrorId} role="alert" className="text-xs text-red-300">{quickValueDraft.error}</p> : null}
                                </form> : <label>
                                  <span className="sr-only">{attribute.name || 'Thuộc tính'} cho {product.name}</span>
                                  <select
                                    id={valueSelectId(attribute.key, product.productId)}
                                    value={selected}
                                    onChange={(event) => handleValueSelection(product.productId, attribute.key, event.target.value)}
                                    className="w-full min-w-[160px] rounded border border-gray-700 bg-gray-900 px-2 py-2 text-gray-200 outline-none focus:border-blue-500"
                                  >
                                    <option value="">— Không chọn —</option>
                                    {attribute.values.map((value) => <option key={value.key} value={value.key}>{value.name || '— Chưa đặt tên —'}</option>)}
                                    <option value={CREATE_VALUE_OPTION} disabled={!canCreateValue}>{canCreateValue ? '＋ Tạo value mới…' : `Đã đạt giới hạn ${PRODUCT_GROUP_VALUE_LIMIT} value`}</option>
                                  </select>
                                </label>}
                              </td>
                              <td className="p-3 font-semibold tabular-nums text-red-300">{money(product.price)}</td>
                              <td className="p-3 text-center"><button type="button" onClick={() => removeProduct(product.productId)} aria-label={`Bỏ ${product.name} khỏi group`} className="rounded border border-red-900 p-2 text-red-400 hover:bg-red-950/40 focus-visible:outline-2 focus-visible:outline-red-400"><Trash2 className="h-4 w-4" aria-hidden="true" /></button></td>
                            </tr>;
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="border-t border-gray-800 px-4 py-3">
                      <button type="button" disabled={group.products.length >= 50} onClick={() => setPickerOpen(true)} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-blue-500 bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:cursor-not-allowed disabled:opacity-40"><Plus className="h-4 w-4" aria-hidden="true" /> Thêm sản phẩm</button>
                    </div>
                  </section>
                </div>
              </article>;
            })}
          </div>
        </section>
      </div>

      <AddVariantProductModal isOpen={pickerOpen} onClose={closePicker} groupId={groupId} selectedProductIds={group.products.map((product) => product.productId)} onSelect={addProduct} />
    </div>
  );
}
