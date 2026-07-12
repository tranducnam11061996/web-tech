'use client';

import { Suspense } from 'react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BookOpen, Check, ChevronDown, ChevronRight, ImageIcon, Loader2, Save, Search, Upload, X } from 'lucide-react';
import { RichTextEditor } from '@/components/products/edit/RichTextEditor';
import { BuyingGuideEditor } from '@/components/products/edit/BuyingGuideEditor';

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
type FeatureBoxImageField = 'backgroundImageUrl' | 'mobileBackgroundImageUrl';
type ImageUploadField = CategoryImageField | FeatureBoxImageField;

type CategoryFeatureBoxForm = {
  homepageEnabled: string;
  categoryPageEnabled: string;
  boxPosition: 'left' | 'right';
  renderMode: 'image' | 'hybrid';
  backgroundImageUrl: string;
  mobileBackgroundImageUrl: string;
  targetUrl: string;
  headline: string;
  subheading: string;
  ctaLabel: string;
  textColor: string;
  overlayColor: string;
  buttonStyle: {
    backgroundColor: string;
    textColor: string;
  };
};

const DISPLAY_OPTIONS = [
  { value: 'child_only', label: 'Chỉ hiển thị danh mục con' },
  { value: 'product', label: 'Chỉ hiển thị sản phẩm' },
  { value: 'child_product', label: 'Hiển thị sản phẩm + Danh mục con' },
];

const controlLabelClass = 'flex flex-col text-base text-gray-100';
const requiredClass = 'text-red-500';
const largeControlClass = 'mt-2 h-12 w-full rounded-md border border-gray-700 bg-gray-900 px-5 text-lg text-gray-100 outline-none transition-all focus:border-red-500/50';

const DEFAULT_FEATURE_BOX: CategoryFeatureBoxForm = {
  homepageEnabled: '0',
  categoryPageEnabled: '0',
  boxPosition: 'left',
  renderMode: 'hybrid',
  backgroundImageUrl: '',
  mobileBackgroundImageUrl: '',
  targetUrl: '',
  headline: 'Gói nâng cấp nổi bật',
  subheading: '',
  ctaLabel: 'Xem ngay',
  textColor: '#ffffff',
  overlayColor: '#07111f',
  buttonStyle: {
    backgroundColor: '#ffffff',
    textColor: '#0f172a',
  },
};

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

function normalizeFeatureBoxForForm(value: any): CategoryFeatureBoxForm {
  if (!value || typeof value !== 'object') return { ...DEFAULT_FEATURE_BOX, buttonStyle: { ...DEFAULT_FEATURE_BOX.buttonStyle } };
  const buttonStyle = value.buttonStyle && typeof value.buttonStyle === 'object' ? value.buttonStyle : {};
  return {
    homepageEnabled: value.homepageEnabled ? '1' : '0',
    categoryPageEnabled: value.categoryPageEnabled ? '1' : '0',
    boxPosition: value.boxPosition === 'right' ? 'right' : 'left',
    renderMode: value.renderMode === 'image' ? 'image' : 'hybrid',
    backgroundImageUrl: String(value.backgroundImageUrl || ''),
    mobileBackgroundImageUrl: String(value.mobileBackgroundImageUrl || ''),
    targetUrl: String(value.targetUrl || ''),
    headline: String(value.headline || DEFAULT_FEATURE_BOX.headline),
    subheading: String(value.subheading || ''),
    ctaLabel: String(value.ctaLabel || DEFAULT_FEATURE_BOX.ctaLabel),
    textColor: String(value.textColor || DEFAULT_FEATURE_BOX.textColor),
    overlayColor: String(value.overlayColor || DEFAULT_FEATURE_BOX.overlayColor),
    buttonStyle: {
      backgroundColor: String(buttonStyle.backgroundColor || DEFAULT_FEATURE_BOX.buttonStyle.backgroundColor),
      textColor: String(buttonStyle.textColor || DEFAULT_FEATURE_BOX.buttonStyle.textColor),
    },
  };
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
    featureBox: { ...DEFAULT_FEATURE_BOX, buttonStyle: { ...DEFAULT_FEATURE_BOX.buttonStyle } },
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
  const [uploadingImage, setUploadingImage] = useState<ImageUploadField | ''>('');
  const [imageError, setImageError] = useState('');
  const [buyingGuideOpen, setBuyingGuideOpen] = useState(false);
  const [buyingGuideOpened, setBuyingGuideOpened] = useState(false);

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
          featureBox: normalizeFeatureBoxForForm(row.featureBox),
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

  const updateFeatureBox = (field: keyof CategoryFeatureBoxForm) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setForm((current) => ({
      ...current,
      featureBox: {
        ...current.featureBox,
        [field]: event.target.value,
      },
    }));
  };

  const updateFeatureButtonStyle = (field: keyof CategoryFeatureBoxForm['buttonStyle']) => (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setForm((current) => ({
      ...current,
      featureBox: {
        ...current.featureBox,
        buttonStyle: {
          ...current.featureBox.buttonStyle,
          [field]: event.target.value,
        },
      },
    }));
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

  const uploadFeatureBoxImage = async (field: FeatureBoxImageField, file: File | null) => {
    if (!file || uploadingImage) return;
    setUploadingImage(field);
    setImageError('');
    try {
      const formData = new FormData();
      formData.append('field', field === 'backgroundImageUrl' ? 'feature_background' : 'feature_mobile_background');
      formData.append('file', file);
      const response = await fetch('/api/admin/product-categories/images/upload', {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể tải ảnh box đầu tiên');
      const relativePath = String(payload.data?.relativePath || '');
      setForm((current) => ({
        ...current,
        featureBox: {
          ...current.featureBox,
          [field]: relativePath,
        },
      }));
    } catch (uploadError: any) {
      setImageError(uploadError.message || 'Không thể tải ảnh box đầu tiên');
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

  const renderFeatureBoxImageUpload = (field: FeatureBoxImageField, label: string, hint: string) => {
    const value = form.featureBox[field];
    const previewUrl = buildCategoryImagePreviewUrl(value);
    const isUploading = uploadingImage === field;

    return (
      <div className="rounded-xl border border-gray-800/70 bg-gray-950/40 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-gray-100">{label}</p>
            <p className="mt-1 text-xs text-gray-500">{hint}</p>
          </div>
          <label className={`inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-700 bg-gray-900 px-3 py-2 text-xs font-bold text-gray-300 transition-all hover:border-cyan-400/60 hover:text-cyan-100 ${isUploading ? 'pointer-events-none opacity-60' : ''}`}>
            {isUploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
            {isUploading ? 'Đang tải...' : 'Chọn tệp...'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              disabled={Boolean(uploadingImage)}
              onChange={(event) => {
                uploadFeatureBoxImage(field, event.target.files?.[0] || null);
                event.target.value = '';
              }}
            />
          </label>
        </div>
        <div className="flex h-40 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-700/80 bg-gray-900/70">
          {previewUrl ? (
            <img src={previewUrl} alt={label} className="h-full w-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-600">
              <ImageIcon className="h-8 w-8" aria-hidden="true" />
              <span className="text-xs">Chưa có ảnh</span>
            </div>
          )}
        </div>
        {value && <p className="mt-2 truncate text-xs text-gray-500">{value}</p>}
      </div>
    );
  };

  const renderFeaturePreviewCard = () => {
    const feature = form.featureBox;
    const previewUrl = buildCategoryImagePreviewUrl(feature.backgroundImageUrl);
    const buttonBackground = feature.buttonStyle.backgroundColor || '#ffffff';
    const buttonTextColor = feature.buttonStyle.textColor || '#0f172a';

    return (
      <div className="rounded-2xl border border-cyan-400/20 bg-[#090d16] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-[0.25em] text-cyan-300">Xem trước</span>
          <span className="rounded-full border border-gray-700 px-3 py-1 text-[11px] text-gray-400">
            Box {feature.boxPosition === 'left' ? 'bên trái' : 'bên phải'}
          </span>
        </div>
        <div className={`grid gap-3 ${feature.boxPosition === 'left' ? 'grid-cols-[1.35fr_0.7fr_0.7fr]' : 'grid-cols-[0.7fr_0.7fr_1.35fr]'}`}>
          {feature.boxPosition === 'left' && (
            <div
              className="relative col-span-1 flex min-h-52 overflow-hidden rounded-xl border border-white/10 bg-slate-900"
              style={{ backgroundColor: feature.overlayColor }}
            >
              {previewUrl && <img src={previewUrl} alt="Xem trước box đầu tiên" className="absolute inset-0 h-full w-full object-cover opacity-65" />}
              <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-transparent" />
              {feature.renderMode === 'hybrid' && (
                <div className="relative z-10 flex max-w-[60%] flex-col justify-center p-5" style={{ color: feature.textColor }}>
                  <strong className="text-2xl font-black uppercase leading-none">{feature.headline || 'Gói nâng cấp nổi bật'}</strong>
                  {feature.subheading && <span className="mt-2 text-xs font-semibold opacity-80">{feature.subheading}</span>}
                  <span className="mt-4 w-fit rounded-md px-3 py-2 text-[11px] font-black uppercase tracking-wide" style={{ backgroundColor: buttonBackground, color: buttonTextColor }}>
                    {feature.ctaLabel || 'Xem ngay'} →
                  </span>
                </div>
              )}
            </div>
          )}
          {[0, 1].map((item) => (
            <div key={item} className="min-h-52 rounded-xl border border-gray-800 bg-[#17171b] p-3">
              <div className="mb-3 h-28 rounded-lg border border-dashed border-gray-700 bg-gray-900/80" />
              <div className="h-3 w-2/3 rounded bg-gray-700" />
              <div className="mt-3 h-4 w-1/3 rounded bg-orange-500/80" />
            </div>
          ))}
          {feature.boxPosition === 'right' && (
            <div
              className="relative col-span-1 flex min-h-52 overflow-hidden rounded-xl border border-white/10 bg-slate-900"
              style={{ backgroundColor: feature.overlayColor }}
            >
              {previewUrl && <img src={previewUrl} alt="Xem trước box đầu tiên" className="absolute inset-0 h-full w-full object-cover opacity-65" />}
              <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/20 to-transparent" />
              {feature.renderMode === 'hybrid' && (
                <div className="relative z-10 flex max-w-[60%] flex-col justify-center p-5" style={{ color: feature.textColor }}>
                  <strong className="text-2xl font-black uppercase leading-none">{feature.headline || 'Gói nâng cấp nổi bật'}</strong>
                  {feature.subheading && <span className="mt-2 text-xs font-semibold opacity-80">{feature.subheading}</span>}
                  <span className="mt-4 w-fit rounded-md px-3 py-2 text-[11px] font-black uppercase tracking-wide" style={{ backgroundColor: buttonBackground, color: buttonTextColor }}>
                    {feature.ctaLabel || 'Xem ngay'} →
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const save = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const featureEnabled = form.featureBox.homepageEnabled === '1' || form.featureBox.categoryPageEnabled === '1';
      if (featureEnabled && !form.featureBox.backgroundImageUrl.trim()) {
        throw new Error('Cần chọn ảnh background cho box đầu tiên');
      }
      if (featureEnabled && !form.featureBox.targetUrl.trim()) {
        throw new Error('Cần nhập URL đích cho box đầu tiên');
      }
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

        <div className="glass-panel overflow-hidden rounded-2xl border border-cyan-500/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.12),transparent_34%),linear-gradient(135deg,#0d1320,#0a0d14)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.25)]">
          <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-300">Bố cục trang chủ và danh mục</p>
              <h2 className="mt-2 text-xl font-black text-white">Box đầu tiên trên trang</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-400">
                Cấu hình ô nổi bật dùng chung cho trang chủ và phần đầu trang danh mục. Liên kết luôn mở trong tab mới ở storefront.
              </p>
            </div>
            <div className="flex gap-2 rounded-full border border-gray-800 bg-black/25 p-1">
              <button
                type="button"
                onClick={() => setForm((current) => ({ ...current, featureBox: { ...current.featureBox, boxPosition: 'left' } }))}
                className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide transition ${form.featureBox.boxPosition === 'left' ? 'bg-cyan-400 text-slate-950' : 'text-gray-400 hover:text-white'}`}
              >
                Bên trái
              </button>
              <button
                type="button"
                onClick={() => setForm((current) => ({ ...current, featureBox: { ...current.featureBox, boxPosition: 'right' } }))}
                className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide transition ${form.featureBox.boxPosition === 'right' ? 'bg-cyan-400 text-slate-950' : 'text-gray-400 hover:text-white'}`}
              >
                Bên phải
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,0.95fr)_minmax(520px,1.05fr)]">
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="rounded-xl border border-gray-800 bg-black/20 p-4">
                  <span className="text-sm font-bold text-gray-200">Hiển thị ở trang chủ</span>
                  <select value={form.featureBox.homepageEnabled} onChange={updateFeatureBox('homepageEnabled')} className="mt-3 h-11 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 text-sm text-gray-100 outline-none focus:border-cyan-400/60">
                    <option value="0">Tắt</option>
                    <option value="1">Bật</option>
                  </select>
                </label>
                <label className="rounded-xl border border-gray-800 bg-black/20 p-4">
                  <span className="text-sm font-bold text-gray-200">Hiển thị ở trang danh mục</span>
                  <select value={form.featureBox.categoryPageEnabled} onChange={updateFeatureBox('categoryPageEnabled')} className="mt-3 h-11 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 text-sm text-gray-100 outline-none focus:border-cyan-400/60">
                    <option value="0">Tắt</option>
                    <option value="1">Bật</option>
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-sm font-bold text-gray-200">
                  Kiểu hiển thị
                  <select value={form.featureBox.renderMode} onChange={updateFeatureBox('renderMode')} className="mt-2 h-11 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 text-sm text-gray-100 outline-none focus:border-cyan-400/60">
                    <option value="image">Ảnh nền + liên kết</option>
                    <option value="hybrid">Hybrid: ảnh + chữ + nút</option>
                  </select>
                </label>
                <label className="block text-sm font-bold text-gray-200">
                  URL đích
                  <input value={form.featureBox.targetUrl} onChange={updateFeatureBox('targetUrl')} placeholder="/khuyen-mai hoặc https://..." className="mt-2 h-11 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 text-sm text-gray-100 outline-none focus:border-cyan-400/60" />
                </label>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {renderFeatureBoxImageUpload('backgroundImageUrl', 'Ảnh background desktop', 'Bắt buộc khi hiển thị box')}
                {renderFeatureBoxImageUpload('mobileBackgroundImageUrl', 'Ảnh background mobile', 'Tùy chọn, mobile sẽ dùng ảnh desktop nếu để trống')}
              </div>

              <div className={`grid grid-cols-1 gap-3 ${form.featureBox.renderMode === 'hybrid' ? '' : 'opacity-45'}`}>
                <label className="block text-sm font-bold text-gray-200">
                  Tiêu đề
                  <input value={form.featureBox.headline} onChange={updateFeatureBox('headline')} disabled={form.featureBox.renderMode !== 'hybrid'} className="mt-2 h-11 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 text-sm text-gray-100 outline-none focus:border-cyan-400/60 disabled:cursor-not-allowed" />
                </label>
                <label className="block text-sm font-bold text-gray-200">
                  Mô tả phụ
                  <textarea rows={3} value={form.featureBox.subheading} onChange={updateFeatureBox('subheading')} disabled={form.featureBox.renderMode !== 'hybrid'} className="mt-2 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-100 outline-none focus:border-cyan-400/60 disabled:cursor-not-allowed" />
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <label className="block text-sm font-bold text-gray-200">
                    Nhãn nút
                    <input value={form.featureBox.ctaLabel} onChange={updateFeatureBox('ctaLabel')} disabled={form.featureBox.renderMode !== 'hybrid'} className="mt-2 h-11 w-full rounded-lg border border-gray-700 bg-gray-950 px-3 text-sm text-gray-100 outline-none focus:border-cyan-400/60 disabled:cursor-not-allowed" />
                  </label>
                  <label className="block text-sm font-bold text-gray-200">
                    Màu chữ
                    <input type="color" value={form.featureBox.textColor} onChange={updateFeatureBox('textColor')} className="mt-2 h-11 w-full rounded-lg border border-gray-700 bg-gray-950 p-1" />
                  </label>
                  <label className="block text-sm font-bold text-gray-200">
                    Màu nền/overlay
                    <input type="color" value={form.featureBox.overlayColor} onChange={updateFeatureBox('overlayColor')} className="mt-2 h-11 w-full rounded-lg border border-gray-700 bg-gray-950 p-1" />
                  </label>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block text-sm font-bold text-gray-200">
                    Màu nút
                    <input type="color" value={form.featureBox.buttonStyle.backgroundColor} onChange={updateFeatureButtonStyle('backgroundColor')} className="mt-2 h-11 w-full rounded-lg border border-gray-700 bg-gray-950 p-1" />
                  </label>
                  <label className="block text-sm font-bold text-gray-200">
                    Màu chữ nút
                    <input type="color" value={form.featureBox.buttonStyle.textColor} onChange={updateFeatureButtonStyle('textColor')} className="mt-2 h-11 w-full rounded-lg border border-gray-700 bg-gray-950 p-1" />
                  </label>
                </div>
              </div>
            </div>

            {renderFeaturePreviewCard()}
          </div>
        </div>

        <section className="glass-panel overflow-hidden rounded-lg border border-gray-800/70 bg-[#101521]/90">
          <button
            type="button"
            aria-expanded={buyingGuideOpen}
            aria-controls="category-buying-guide-editor"
            onClick={() => {
              setBuyingGuideOpen((open) => !open);
              setBuyingGuideOpened(true);
            }}
            className="flex min-h-16 w-full items-center justify-between gap-4 px-6 py-4 text-left hover:bg-gray-900/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-300"><BookOpen className="h-5 w-5" aria-hidden="true" /></span>
              <span>
                <span className="block text-base font-black text-white">Lý do nên mua</span>
                <span className="mt-0.5 block text-xs text-gray-500">Quản lý nội dung riêng cho danh mục này</span>
              </span>
            </span>
            <ChevronRight className={`h-5 w-5 text-gray-500 transition-transform ${buyingGuideOpen ? 'rotate-90' : ''}`} aria-hidden="true" />
          </button>
          {buyingGuideOpened ? (
            <div id="category-buying-guide-editor" className={buyingGuideOpen ? 'border-t border-gray-800 p-6' : 'hidden'}>
              <BuyingGuideEditor
                entityId={id ? Number(id) : undefined}
                endpoint={id ? `/api/admin/product-categories/${id}/buying-guide` : ''}
              />
            </div>
          ) : null}
        </section>

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
