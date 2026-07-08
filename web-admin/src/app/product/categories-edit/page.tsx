'use client';

import { Suspense } from 'react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, ChevronDown, ImageIcon, Loader2, Save, Search, Upload, X } from 'lucide-react';
import { RichTextEditor } from '@/components/products/edit/RichTextEditor';

type CategoryOption = {
  id: number;
  name: string;
  url?: string;
  parentId: number;
  ordering?: number;
};

type FlattenedCategoryOption = CategoryOption & {
  level: number;
};

type CategoryImageField = 'imgUrl' | 'imgBig';

const DISPLAY_OPTIONS = [
  { value: 'child_only', label: 'Chỉ hiển thị danh mục con' },
  { value: 'product', label: 'Chỉ hiển thị sản phẩm' },
  { value: 'child_product', label: 'Hiển thị sản phẩm + Danh mục con' },
];

const controlLabelClass = 'flex flex-col text-base text-gray-100';
const requiredClass = 'text-red-500';
const largeControlClass = 'mt-2 h-12 w-full rounded-md border border-gray-700 bg-gray-900 px-5 text-lg text-gray-100 outline-none transition-all focus:border-red-500/50';

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function normalizeCategoryUrl(value: string) {
  return normalizeText(value.trim())
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
}

function isEmptyImage(value: string) {
  const trimmed = String(value || '').trim();
  return !trimmed || trimmed === '0';
}

function buildCategoryImagePreviewUrl(value: string) {
  const trimmed = String(value || '').trim();
  if (isEmptyImage(trimmed)) return '';
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) return trimmed;
  if (trimmed.includes('/')) return `/api/media/${trimmed.split('/').map(encodeURIComponent).join('/')}`;
  return `https://hacom.vn/media/category/${encodeURIComponent(trimmed)}`;
}

function CategoryEditInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const parentListId = useId();
  const parentDropdownRef = useRef<HTMLDivElement>(null);
  const parentSearchRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    parentId: '0',
    status: '1',
    ordering: '0',
    isFeatured: '0',
    displayOption: 'child_product',
    imgUrl: '',
    imgBig: '',
    priceRange: '',
    summary: '',
    staticHtml: '',
    metaTitle: '',
    metaKeyword: '',
    metaDescription: '',
  });
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [urlEdited, setUrlEdited] = useState(false);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState('');
  const [parentOpen, setParentOpen] = useState(false);
  const [parentQuery, setParentQuery] = useState('');
  const [uploadingImage, setUploadingImage] = useState<CategoryImageField | ''>('');
  const [imageError, setImageError] = useState('');

  useEffect(() => {
    if (!id) return;
    let alive = true;
    fetch(`/api/admin/product-categories/${id}`)
      .then((response) => response.json().then((payload) => ({ response, payload })))
      .then(({ response, payload }) => {
        if (!alive) return;
        if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể tải danh mục');
        const row = payload.data;
        setForm({
          name: row.name || '',
          slug: row.url || '',
          parentId: String(row.parentId ?? 0),
          status: String(row.status ?? 1),
          ordering: String(row.ordering ?? 0),
          isFeatured: String(row.is_featured ?? 0),
          displayOption: DISPLAY_OPTIONS.some((option) => option.value === row.display_option) ? row.display_option : 'child_product',
          imgUrl: row.imgUrl || '',
          imgBig: row.img_big || '',
          priceRange: row.priceRange || '',
          summary: row.summary || row.description || '',
          staticHtml: row.static_html || '',
          metaTitle: row.meta_title || '',
          metaKeyword: row.meta_keyword || '',
          metaDescription: row.meta_description || '',
        });
      })
      .catch((loadError) => setError(loadError.message || 'Không thể tải danh mục'))
      .finally(() => setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    let alive = true;
    setCategoriesLoading(true);
    fetch('/api/admin/product-categories')
      .then((response) => response.json().then((payload) => ({ response, payload })))
      .then(({ response, payload }) => {
        if (!alive) return;
        if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể tải danh mục sản phẩm');
        const items = Array.isArray(payload.data?.items) ? payload.data.items : [];
        setCategories(items.map((item: any) => ({
          id: Number(item.id),
          name: String(item.name || ''),
          url: item.url ? String(item.url) : '',
          parentId: Number(item.parentId || 0),
          ordering: Number(item.ordering || 0),
        })).filter((item: CategoryOption) => item.id > 0));
      })
      .catch((loadError) => setCategoriesError(loadError.message || 'Không thể tải danh mục sản phẩm'))
      .finally(() => {
        if (alive) setCategoriesLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!parentOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!parentDropdownRef.current?.contains(event.target as Node)) {
        setParentOpen(false);
        setParentQuery('');
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setParentOpen(false);
        setParentQuery('');
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    window.setTimeout(() => parentSearchRef.current?.focus(), 0);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [parentOpen]);

  const parentOptions = useMemo(() => {
    const currentId = Number(id || 0);
    const childrenByParent = new Map<number, CategoryOption[]>();
    const categoriesById = new Map<number, CategoryOption>();

    categories.forEach((category) => {
      categoriesById.set(category.id, category);
      const parentId = Number(category.parentId || 0);
      const children = childrenByParent.get(parentId) || [];
      children.push(category);
      childrenByParent.set(parentId, children);
    });

    const excludedIds = new Set<number>();
    const collectDescendants = (categoryId: number) => {
      excludedIds.add(categoryId);
      (childrenByParent.get(categoryId) || []).forEach((child) => collectDescendants(child.id));
    };
    if (currentId > 0) collectDescendants(currentId);

    const flattened: FlattenedCategoryOption[] = [];
    const appendChildren = (parentId: number, level: number) => {
      (childrenByParent.get(parentId) || []).forEach((category) => {
        if (excludedIds.has(category.id)) return;
        flattened.push({ ...category, level });
        appendChildren(category.id, level + 1);
      });
    };

    appendChildren(0, 0);
    categories.forEach((category) => {
      if (category.parentId > 0 && !categoriesById.has(category.parentId) && !excludedIds.has(category.id)) {
        flattened.push({ ...category, level: 0 });
        appendChildren(category.id, 1);
      }
    });

    return flattened;
  }, [categories, id]);

  const filteredParentOptions = useMemo(() => {
    const keyword = normalizeText(parentQuery.trim());
    if (!keyword) return parentOptions;
    return parentOptions.filter((category) => {
      const haystack = normalizeText(`${category.name} ${category.id} ${category.url || ''}`);
      return haystack.includes(keyword);
    });
  }, [parentOptions, parentQuery]);

  const selectedParent = categories.find((category) => category.id === Number(form.parentId));

  const update = (field: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const updateName = (event: React.ChangeEvent<HTMLInputElement>) => {
    const name = event.target.value;
    setForm((current) => ({
      ...current,
      name,
      slug: !id && !urlEdited ? normalizeCategoryUrl(name) : current.slug,
    }));
  };

  const updateSlug = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUrlEdited(true);
    setForm((current) => ({ ...current, slug: event.target.value }));
  };

  const selectParent = (parentId: number) => {
    setForm((current) => ({ ...current, parentId: String(parentId) }));
    setParentOpen(false);
    setParentQuery('');
  };

  const updateRichText = (field: 'summary' | 'staticHtml') => (value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const uploadCategoryImage = async (field: CategoryImageField, file: File | null) => {
    if (!file || uploadingImage) return;
    setUploadingImage(field);
    setImageError('');
    try {
      const formData = new FormData();
      formData.append('field', field === 'imgBig' ? 'img_big' : 'imgUrl');
      formData.append('file', file);
      const response = await fetch('/api/admin/product-categories/images/upload', {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể tải ảnh');
      const relativePath = String(payload.data?.relativePath || '');
      setForm((current) => ({ ...current, [field]: relativePath }));
    } catch (uploadError: any) {
      setImageError(uploadError.message || 'Không thể tải ảnh');
    } finally {
      setUploadingImage('');
    }
  };

  const renderImageUpload = (field: CategoryImageField, label: string, currentLabel: string) => {
    const value = field === 'imgBig' ? form.imgBig : form.imgUrl;
    const previewUrl = buildCategoryImagePreviewUrl(value);
    const isUploading = uploadingImage === field;

    return (
      <div className="space-y-3 rounded-lg border border-gray-800/70 bg-gray-950/40 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-bold text-gray-200">{label}</span>
          <label className={`inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-xs font-bold text-gray-300 transition-all hover:border-red-500/60 hover:text-red-200 ${isUploading ? 'pointer-events-none opacity-60' : ''}`}>
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
            {isUploading ? 'Đang tải...' : 'Chọn tệp...'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              disabled={Boolean(uploadingImage)}
              onChange={(event) => {
                uploadCategoryImage(field, event.target.files?.[0] || null);
                event.target.value = '';
              }}
            />
          </label>
        </div>
        <div className="rounded-lg border border-dashed border-gray-700/80 bg-gray-900/70 p-3">
          <p className="mb-3 text-center text-xs text-gray-500">{currentLabel}</p>
          <div className="flex h-44 items-center justify-center overflow-hidden rounded-md border border-gray-800 bg-gray-950/70">
            {previewUrl ? (
              <img src={previewUrl} alt={currentLabel} className="max-h-full max-w-full object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-600">
                <ImageIcon className="h-8 w-8" aria-hidden="true" />
                <span className="text-xs">Chưa có ảnh</span>
              </div>
            )}
          </div>
          {!isEmptyImage(value) && <p className="mt-2 truncate text-xs text-gray-500">{value}</p>}
        </div>
      </div>
    );
  };

  const save = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch(id ? `/api/admin/product-categories/${id}` : '/api/admin/product-categories', {
        method: id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể lưu danh mục');
      setMessage(payload.message || 'Đã lưu danh mục');
      if (!id && payload.data?.id) router.replace(`/product/categories-edit?id=${payload.data.id}`);
      router.refresh();
    } catch (saveError: any) {
      setError(saveError.message || 'Không thể lưu danh mục');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="w-full h-full p-6 text-gray-400">Đang tải danh mục...</div>;
  }

  return (
    <div className="w-full h-full p-2 animate-in fade-in duration-300 overflow-y-auto custom-scrollbar relative">
      <div className="flex justify-between items-center mb-4 sticky top-0 bg-[#0a0a0f]/90 backdrop-blur-md z-20 py-2 border-b border-gray-800/50">
        <h1 className="text-xl font-bold text-gray-200">{id ? 'Chỉnh sửa danh mục sản phẩm' : 'Thêm danh mục sản phẩm'}</h1>
        <div className="flex gap-3">
          <button onClick={() => router.push('/product/categories')} className="flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-700 hover:border-gray-500 text-gray-300 rounded-md transition-all">
            <X className="w-4 h-4" /> Đóng
          </button>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-all disabled:opacity-60">
            <Save className="w-4 h-4" /> {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>

      {message && <div className="mb-3 px-3 py-2 border border-green-900 bg-green-950/30 text-green-300 text-xs font-bold">{message}</div>}
      {error && <div className="mb-3 px-3 py-2 border border-red-900 bg-red-950/30 text-red-300 text-xs font-bold">{error}</div>}

      <div className="grid grid-cols-1 gap-6 w-full pb-20">
        <div className="glass-panel rounded-lg border border-gray-800/70 bg-[#101521]/90 p-8 space-y-7">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-7 lg:items-start">
            <label className={controlLabelClass}>
              <span>Tên danh mục: <span className={requiredClass}>*</span></span>
              <input value={form.name} onChange={updateName} className={largeControlClass} />
            </label>
            <label className={controlLabelClass}>
              <span>URL</span>
              <input value={form.slug} onChange={updateSlug} className={`${largeControlClass} font-mono`} />
            </label>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-8 gap-y-7 lg:items-start">
            <label className={controlLabelClass}>
              <span>Nổi bật <span className={requiredClass}>*</span></span>
              <select value={form.isFeatured} onChange={update('isFeatured')} className={largeControlClass}>
                <option value="1">Nổi bật</option>
                <option value="0">Không nổi bật</option>
              </select>
            </label>
            <label className={controlLabelClass}>
              <span>Thứ tự hiển thị (cao xếp trước)</span>
              <input type="text" inputMode="numeric" value={form.ordering} onChange={update('ordering')} className={largeControlClass} />
            </label>
            <label className={controlLabelClass}>
              <span>Trạng thái <span className={requiredClass}>*</span></span>
              <select value={form.status} onChange={update('status')} className={largeControlClass}>
                <option value="1">Hiện</option>
                <option value="0">Ẩn</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-7 lg:items-start">
            <div ref={parentDropdownRef} className={`relative ${controlLabelClass}`}>
              <span>Là danh mục con của:</span>
              <button
                type="button"
                role="combobox"
                aria-expanded={parentOpen}
                aria-controls={parentListId}
                onClick={() => setParentOpen((open) => !open)}
                className={`${largeControlClass} flex items-center justify-between text-left`}
              >
                <span className={selectedParent || form.parentId === '0' ? 'truncate' : 'truncate text-gray-500'}>
                  {form.parentId === '0' ? 'Chọn danh mục cha...' : selectedParent?.name || `Danh mục #${form.parentId}`}
                </span>
                <ChevronDown className={`ml-3 h-4 w-4 shrink-0 text-gray-500 transition-transform ${parentOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>

              {parentOpen && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-md border border-gray-700 bg-[#0d111a] shadow-2xl">
                  <div className="relative border-b border-gray-800 p-2">
                    <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" aria-hidden="true" />
                    <input
                      ref={parentSearchRef}
                      type="text"
                      value={parentQuery}
                      onChange={(event) => setParentQuery(event.target.value)}
                      placeholder="Tìm danh mục sản phẩm..."
                      className="w-full rounded-md border border-gray-700 bg-gray-950 py-2 pl-9 pr-3 text-sm text-gray-200 outline-none transition-all focus:border-red-500/50"
                    />
                  </div>
                  <ul id={parentListId} role="listbox" className="max-h-72 overflow-y-auto p-1 custom-scrollbar">
                    <li
                      role="option"
                      aria-selected={form.parentId === '0'}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => selectParent(0)}
                      className="flex cursor-pointer items-center justify-between rounded px-3 py-2 text-base font-semibold text-gray-300 hover:bg-gray-800"
                    >
                      <span>Chọn danh mục cha...</span>
                      {form.parentId === '0' && <Check className="h-4 w-4 text-emerald-400" aria-hidden="true" />}
                    </li>
                    {categoriesLoading ? (
                      <li className="px-3 py-4 text-center text-xs text-gray-500">Đang tải danh mục sản phẩm...</li>
                    ) : categoriesError ? (
                      <li className="px-3 py-4 text-center text-xs text-red-300">{categoriesError}</li>
                    ) : filteredParentOptions.length === 0 ? (
                      <li className="px-3 py-4 text-center text-xs text-gray-500">Không tìm thấy danh mục phù hợp</li>
                    ) : filteredParentOptions.map((category) => (
                      <li
                        key={category.id}
                        role="option"
                        aria-selected={String(category.id) === form.parentId}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectParent(category.id)}
                        className="flex cursor-pointer items-center justify-between rounded px-3 py-2 text-base font-semibold text-gray-300 hover:bg-gray-800"
                      >
                        <span className="truncate" style={{ paddingLeft: `${category.level * 18}px` }}>
                          {category.level > 0 ? '- ' : ''}{category.name}
                        </span>
                        {String(category.id) === form.parentId && <Check className="ml-3 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <label className={controlLabelClass}>
              <span>Loại nội dung hiển thị: <span className={requiredClass}>*</span></span>
              <select value={form.displayOption} onChange={update('displayOption')} className={largeControlClass}>
                {DISPLAY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-lg border border-gray-800/50 space-y-5">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {renderImageUpload('imgUrl', 'Ảnh icon', 'Ảnh icon hiện tại')}
            {renderImageUpload('imgBig', 'Ảnh đại diện', 'Ảnh đại diện hiện tại')}
          </div>
          {imageError && <div className="px-3 py-2 border border-red-900 bg-red-950/30 text-red-300 text-xs font-bold">{imageError}</div>}
          <label className="block text-sm text-gray-300">
            <span className="font-bold text-gray-200">Khoảng lọc giá</span>
            <input
              value={form.priceRange}
              onChange={update('priceRange')}
              placeholder="Nhập khoảng lọc giá..."
              className="mt-2 w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-red-500/50"
            />
          </label>
          <p className="text-xs leading-relaxed text-gray-500">
            Nhập từng giá cách nhau dấu ; ví dụ: 300000;800000;1500000 có nghĩa là tạo ra 4 khoảng giá cho khách hàng lọc sản phẩm.
            Đó là: Dưới 300000, Từ 300000 đến 800000, Từ 800000 đến 1500000 và Trên 1500000.
          </p>
        </div>

        <div className="glass-panel p-6 rounded-lg border border-gray-800/50 space-y-6">
          <RichTextEditor
            id="product-category-summary"
            title="Nhập nội dung"
            value={form.summary}
            onChange={updateRichText('summary')}
            minHeight="320px"
            resizable
          />
          <div className="text-xs font-bold text-gray-400">Số kí tự: {form.summary.replace(/<[^>]*>/g, '').trim().split(/\s+/).filter(Boolean).length} từ</div>
          <RichTextEditor
            id="product-category-static-html"
            title="Nội dung cố định"
            value={form.staticHtml}
            onChange={updateRichText('staticHtml')}
            minHeight="320px"
            resizable
          />
        </div>

        <div className="glass-panel p-6 rounded-lg border border-gray-800/50 space-y-5">
          <h2 className="text-md font-bold text-gray-300">SEO</h2>
          <label className="block space-y-1 text-sm text-gray-300">
            <span>Tiêu đề SEO</span>
            <input value={form.metaTitle} onChange={update('metaTitle')} placeholder="Tiêu đề SEO" className="mt-2 w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-red-500/50" />
          </label>
          <label className="block space-y-1 text-sm text-gray-300">
            <span>Từ khóa SEO</span>
            <input value={form.metaKeyword} onChange={update('metaKeyword')} placeholder="Từ khóa SEO" className="mt-2 w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-red-500/50" />
          </label>
          <label className="block space-y-1 text-sm text-gray-300">
            <span>Mô tả SEO</span>
            <textarea rows={4} value={form.metaDescription} onChange={update('metaDescription')} placeholder="Mô tả SEO" className="mt-2 w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-red-500/50" />
          </label>
        </div>
      </div>
    </div>
  );
}

export default function CategoryEditPage() {
  return (
    <Suspense fallback={<div className="w-full h-full p-6 text-gray-400">Đang tải...</div>}>
      <CategoryEditInner />
    </Suspense>
  );
}
