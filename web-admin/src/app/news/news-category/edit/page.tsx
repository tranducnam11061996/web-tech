'use client';

import { Suspense, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, Check, CheckCircle2, ChevronDown, Info, Save, Search, X, XCircle } from 'lucide-react';
import { RichTextEditor } from '@/components/products/edit/RichTextEditor';

type ArticleCategoryOption = {
  id: number;
  name: string;
  url?: string;
  parentId: number;
  ordering?: number;
};

type FlattenedArticleCategoryOption = ArticleCategoryOption & {
  level: number;
};

type FeedbackState = {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  details?: string;
};
const DISPLAY_OPTIONS = [
  { value: 'article', label: 'Chỉ hiển thị bài' },
  { value: 'child_article', label: 'Hiển thị bài + Danh mục con' },
];

const labelClass = 'flex flex-col text-sm text-gray-200';
const controlClass = 'mt-2 h-11 w-full rounded-md border border-gray-700 bg-gray-900/80 px-4 text-base text-gray-100 outline-none transition-all focus:border-blue-500/50';
const textareaClass = 'mt-2 w-full rounded-md border border-gray-700 bg-gray-900/80 px-4 py-3 text-base text-gray-100 outline-none transition-all focus:border-blue-500/50 custom-scrollbar';
const requiredClass = 'text-red-500';

const feedbackConfig = {
  success: {
    icon: CheckCircle2,
    panel: 'border-emerald-800/70 bg-emerald-950/95',
    iconWrap: 'border-emerald-700 bg-emerald-900/70 text-emerald-300',
    title: 'text-emerald-100',
    message: 'text-emerald-50/90',
    details: 'border-emerald-800/60 bg-emerald-900/40 text-emerald-100/80',
    button: 'bg-emerald-600 hover:bg-emerald-500',
  },
  error: {
    icon: XCircle,
    panel: 'border-red-900/80 bg-red-950/95',
    iconWrap: 'border-red-800 bg-red-900/70 text-red-300',
    title: 'text-red-100',
    message: 'text-red-50/90',
    details: 'border-red-900/60 bg-red-900/40 text-red-100/80',
    button: 'bg-red-600 hover:bg-red-500',
  },
  warning: {
    icon: AlertTriangle,
    panel: 'border-amber-800/80 bg-amber-950/95',
    iconWrap: 'border-amber-700 bg-amber-900/70 text-amber-300',
    title: 'text-amber-100',
    message: 'text-amber-50/90',
    details: 'border-amber-800/60 bg-amber-900/40 text-amber-100/80',
    button: 'bg-amber-600 hover:bg-amber-500',
  },
  info: {
    icon: Info,
    panel: 'border-blue-800/80 bg-blue-950/95',
    iconWrap: 'border-blue-700 bg-blue-900/70 text-blue-300',
    title: 'text-blue-100',
    message: 'text-blue-50/90',
    details: 'border-blue-800/60 bg-blue-900/40 text-blue-100/80',
    button: 'bg-blue-600 hover:bg-blue-500',
  },
};

function StatusFeedbackModal({ feedback, onClose }: { feedback: FeedbackState | null; onClose: () => void }) {
  useEffect(() => {
    if (!feedback) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [feedback, onClose]);

  if (!feedback) return null;

  const config = feedbackConfig[feedback.type];
  const Icon = config.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="article-category-feedback-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className={`w-full max-w-md rounded-lg border p-5 shadow-xl ${config.panel}`}>
        <div className="flex items-start gap-3">
          <div className={`rounded-full border p-2 ${config.iconWrap}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h2 id="article-category-feedback-title" className={`text-base font-bold ${config.title}`}>
                {feedback.title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-sm p-1 text-white/60 transition hover:bg-white/10 hover:text-white"
                aria-label="Đóng thông báo"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <p className={`mt-2 text-sm leading-6 ${config.message}`}>{feedback.message}</p>
          </div>
        </div>

        {feedback.details && (
          <div className={`mt-4 rounded-md border px-3 py-2 text-sm ${config.details}`}>
            {feedback.details}
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className={`rounded-md px-4 py-2 text-sm font-semibold text-white transition ${config.button}`}
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
}
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

function wordCount(value: string) {
  return value.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
}

function ArticleCategoryEditInner() {
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
    displayOption: 'article',
    status: '1',
    isFeatured: '0',
    ordering: '0',
    summary: '',
    description: '',
    metaTitle: '',
    metaKeyword: '',
    metaDescription: '',
  });
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [slugEdited, setSlugEdited] = useState(Boolean(id));
  const [categories, setCategories] = useState<ArticleCategoryOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState('');
  const [parentOpen, setParentOpen] = useState(false);
  const [parentQuery, setParentQuery] = useState('');

  useEffect(() => {
    if (!id) return;
    let alive = true;
    fetch(`/api/admin/article-categories/${id}`)
      .then((response) => response.json().then((payload) => ({ response, payload })))
      .then(({ response, payload }) => {
        if (!alive) return;
        if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể tải danh mục');
        const row = payload.data;
        setForm({
          name: row.name || '',
          slug: row.url || '',
          parentId: String(row.parentId ?? 0),
          displayOption: DISPLAY_OPTIONS.some((option) => option.value === row.display_option) ? row.display_option : 'article',
          status: String(row.status ?? 1),
          isFeatured: String(row.is_featured ?? 0),
          ordering: String(row.ordering ?? 0),
          summary: row.summary || '',
          description: row.description || '',
          metaTitle: row.meta_title || '',
          metaKeyword: row.meta_keyword || '',
          metaDescription: row.meta_description || '',
        });
      })
      .catch((loadError) => setFeedback({ type: 'error', title: 'Không thể tải danh mục', message: loadError.message || 'Không thể tải danh mục' }))
      .finally(() => setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    let alive = true;
    setCategoriesLoading(true);
    fetch('/api/admin/article-categories')
      .then((response) => response.json().then((payload) => ({ response, payload })))
      .then(({ response, payload }) => {
        if (!alive) return;
        if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể tải danh mục bài viết');
        const items = Array.isArray(payload.data?.items) ? payload.data.items : [];
        setCategories(items.map((item: any) => ({
          id: Number(item.id),
          name: String(item.name || ''),
          url: item.url ? String(item.url) : '',
          parentId: Number(item.parentId || 0),
          ordering: Number(item.ordering || 0),
        })).filter((item: ArticleCategoryOption) => item.id > 0));
      })
      .catch((loadError) => setCategoriesError(loadError.message || 'Không thể tải danh mục bài viết'))
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
    const childrenByParent = new Map<number, ArticleCategoryOption[]>();
    const categoriesById = new Map<number, ArticleCategoryOption>();

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

    const flattened: FlattenedArticleCategoryOption[] = [];
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
      slug: !id && !slugEdited ? normalizeCategoryUrl(name) : current.slug,
    }));
  };

  const updateSlug = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSlugEdited(true);
    setForm((current) => ({ ...current, slug: event.target.value }));
  };

  const selectParent = (parentId: number) => {
    setForm((current) => ({ ...current, parentId: String(parentId) }));
    setParentOpen(false);
    setParentQuery('');
  };

  const save = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const response = await fetch(id ? `/api/admin/article-categories/${id}` : '/api/admin/article-categories', {
        method: id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể lưu danh mục');
      setFeedback({ type: 'success', title: 'Lưu thành công', message: payload.message || 'Đã lưu danh mục bài viết.' });
      if (!id && payload.data?.id) router.replace(`/news/news-category/edit?id=${payload.data.id}`);
      router.refresh();
    } catch (saveError: any) {
      setFeedback({ type: 'error', title: 'Không thể lưu danh mục', message: saveError.message || 'Không thể lưu danh mục' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="w-full h-full p-6 text-gray-400">Đang tải danh mục...</div>;

  return (
    <div className="w-full h-full p-2 animate-in fade-in duration-300 overflow-y-auto custom-scrollbar relative">
      <header className="mb-4 border-b border-gray-800/50 py-3">
        <h1 className="text-xl font-bold text-gray-200">{id ? 'Chỉnh sửa danh mục bài viết' : 'Thêm danh mục bài viết'}</h1>
      </header>

      <div className="grid grid-cols-1 gap-6 w-full pb-20">
        <div className="glass-panel p-8 rounded-lg border border-gray-800/50 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <label className={labelClass}>
              <span>Tên danh mục bài viết <span className={requiredClass}>*</span></span>
              <input value={form.name} onChange={updateName} className={controlClass} />
            </label>
            <label className={labelClass}>
              <span>Link danh mục bài viết <span className={requiredClass}>*</span></span>
              <input value={form.slug} onChange={updateSlug} className={`${controlClass} font-mono`} />
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div ref={parentDropdownRef} className={`relative ${labelClass}`}>
              <span>Là danh mục con của :</span>
              <button
                type="button"
                role="combobox"
                aria-expanded={parentOpen}
                aria-controls={parentListId}
                onClick={() => setParentOpen((open) => !open)}
                className={`${controlClass} flex items-center justify-between text-left`}
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
                      placeholder="Tìm danh mục bài viết..."
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
                      <li className="px-3 py-4 text-center text-xs text-gray-500">Đang tải danh mục bài viết...</li>
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

            <label className={labelClass}>
              <span>Loại nội dung hiển thị</span>
              <select value={form.displayOption} onChange={update('displayOption')} className={controlClass}>
                {DISPLAY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <label className={labelClass}>
              <span>Trạng thái</span>
              <select value={form.status} onChange={update('status')} className={controlClass}>
                <option value="1">Hoạt động</option>
                <option value="0">Không hoạt động</option>
              </select>
            </label>
            <label className={labelClass}>
              <span>Nổi bật</span>
              <select value={form.isFeatured} onChange={update('isFeatured')} className={controlClass}>
                <option value="0">Không</option>
                <option value="1">Nổi bật</option>
              </select>
            </label>
            <label className={labelClass}>
              <span>Thứ tự xuất hiện (cao xếp trước)</span>
              <input type="text" inputMode="numeric" value={form.ordering} onChange={update('ordering')} className={controlClass} />
            </label>
          </div>

          <label className={labelClass}>
            <span>Tóm tắt</span>
            <textarea rows={4} value={form.summary} onChange={update('summary')} className={textareaClass} />
          </label>

          <div>
            <RichTextEditor
              id="article-category-description"
              title="Mô tả chi tiết (nếu có)"
              value={form.description}
              onChange={(value) => setForm((current) => ({ ...current, description: value }))}
              minHeight="300px"
              imageUploadScope="article-categories"
              resizable
            />
            <div className="mt-2 text-xs font-bold text-gray-400">Số kí tự: {wordCount(form.description)} từ</div>
          </div>

          <div className="pt-4 border-t border-gray-800/50 space-y-5">
            <h3 className="text-md font-bold text-gray-200">Dùng cho SEO</h3>
            <label className={labelClass}>
              <span>Meta Title <span className={requiredClass}>*</span></span>
              <input value={form.metaTitle} onChange={update('metaTitle')} className={controlClass} />
            </label>
            <label className={labelClass}>
              <span>Meta Keyword <span className={requiredClass}>*</span></span>
              <input value={form.metaKeyword} onChange={update('metaKeyword')} className={controlClass} />
            </label>
            <label className={labelClass}>
              <span>Meta Description <span className={requiredClass}>*</span></span>
              <input value={form.metaDescription} onChange={update('metaDescription')} className={controlClass} />
            </label>
          </div>

          <div className="flex justify-center gap-4 pt-2">
            <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2 text-sm text-white transition-all hover:bg-blue-500 disabled:opacity-60">
              <Save className="w-4 h-4" /> {saving ? 'Đang lưu...' : 'Lưu'}
            </button>
            <button type="button" onClick={() => router.push('/news/news-category')} className="inline-flex items-center gap-2 rounded-md border border-red-500/50 bg-red-500/10 px-5 py-2 text-sm text-red-300 transition-all hover:bg-red-500/20">
              <X className="w-4 h-4" /> Đóng
            </button>
          </div>
        </div>
      </div>
      <StatusFeedbackModal feedback={feedback} onClose={() => setFeedback(null)} />
    </div>
  );
}

export default function ArticleCategoryEditPage() {
  return (
    <Suspense fallback={<div className="w-full h-full p-6 text-gray-400">Đang tải...</div>}>
      <ArticleCategoryEditInner />
    </Suspense>
  );
}
