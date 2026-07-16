'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ExternalLink, ImageIcon, Loader2, Save, Upload, X } from 'lucide-react';
import { RichTextEditor, type RichTextEditorHandle } from '@/components/products/edit/RichTextEditor';

type ArticleCategory = {
  id: number;
  name: string;
};

type UploadedContentImage = {
  id: string;
  name: string;
  url: string;
  relativePath: string;
};

const labelClass = 'flex flex-col text-sm text-gray-200';
const inputClass = 'mt-2 h-11 w-full rounded-md border border-gray-700 bg-gray-900/80 px-4 text-base text-gray-100 outline-none transition-all focus:border-blue-500';
const textareaClass = 'mt-2 w-full rounded-md border border-gray-700 bg-gray-900/80 px-4 py-3 text-base text-gray-100 outline-none transition-all focus:border-blue-500 resize-none custom-scrollbar';
const requiredClass = 'text-red-500';

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function normalizeSlug(value: string) {
  return normalizeText(value.trim())
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
}

function toDatetimeLocal(value: unknown) {
  if (!value) return '';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function unixToDatetimeLocal(value: unknown) {
  const timestamp = Number(value || 0);
  if (!timestamp) return '';
  const date = new Date(timestamp * 1000);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function datetimeLocalToUnix(value: string) {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : Math.floor(date.getTime() / 1000);
}

function wordCount(value: string) {
  return value.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
}

function isEmptyImage(value: string) {
  const trimmed = String(value || '').trim();
  return !trimmed || trimmed === '0';
}

function newsImagePreview(value: string) {
  const trimmed = String(value || '').trim();
  if (isEmptyImage(trimmed)) return '';
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) return trimmed;
  return `/api/media/news/${trimmed.split('/').map(encodeURIComponent).join('/')}`;
}

function ArticleEditInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [categories, setCategories] = useState<ArticleCategory[]>([]);
  const [form, setForm] = useState({
    title: '',
    slug: '',
    summary: '',
    content: '',
    thumbnail: '',
    imageBackground: '',
    categoryIds: [] as number[],
    catId: 0,
    status: '1',
    ordering: '0',
    isFeatured: '0',
    tags: '',
    createDateInput: '',
    articleTimeSet: '0',
    articleTimeInput: '',
    articleDisplayTimeSet: '0',
    articleDisplayTimeInput: '',
    metaTitle: '',
    metaKeyword: '',
    metaDescription: '',
  });
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [uploadingField, setUploadingField] = useState('');
  const [uploadedContentImages, setUploadedContentImages] = useState<UploadedContentImage[]>([]);
  const [imageError, setImageError] = useState('');
  const [headerCompact, setHeaderCompact] = useState(false);
  const contentEditorRef = useRef<RichTextEditorHandle | null>(null);
  const contentUploadInputRef = useRef<HTMLInputElement | null>(null);

  const selectedCategoryIds = useMemo(() => new Set(form.categoryIds), [form.categoryIds]);

  const openContentImagePicker = () => {
    if (uploadingField) return;
    contentUploadInputRef.current?.click();
  };

  const handlePageScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const nextCompact = event.currentTarget.scrollTop > 128;
    setHeaderCompact((current) => (current === nextCompact ? current : nextCompact));
  };

  useEffect(() => {
    fetch('/api/admin/article-categories')
      .then((response) => response.json())
      .then((payload) => {
        if (payload.success) {
          setCategories((payload.data.items || []).map((category: any) => ({
            id: Number(category.id),
            name: String(category.name || ''),
          })));
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    fetch(`/api/admin/articles/${id}`)
      .then((response) => response.json().then((payload) => ({ response, payload })))
      .then(({ response, payload }) => {
        if (!alive) return;
        if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể tải bài viết');
        const row = payload.data;
        const categoryIds = String(row.article_category || '')
          .split(',')
          .map((item) => Number(item))
          .filter((value) => value > 0);
        setForm({
          title: row.title || '',
          slug: row.url || '',
          summary: row.summary || '',
          content: row.content || '',
          thumbnail: row.thumnail || '',
          imageBackground: row.image_background || '',
          categoryIds: categoryIds.length ? categoryIds : [Number(row.catId || 0)].filter(Boolean),
          catId: Number(row.catId || categoryIds[0] || 0),
          status: String(row.status ?? 1),
          ordering: String(row.ordering ?? 0),
          isFeatured: String(row.is_featured ?? 0),
          tags: row.tags || '',
          createDateInput: toDatetimeLocal(row.createDate),
          articleTimeSet: String(row.article_time_set ?? 0),
          articleTimeInput: unixToDatetimeLocal(row.article_time),
          articleDisplayTimeSet: String(row.article_display_time_set ?? 0),
          articleDisplayTimeInput: unixToDatetimeLocal(row.article_display_time),
          metaTitle: row.meta_title || '',
          metaKeyword: row.meta_keywords || row.meta_keyword || '',
          metaDescription: row.meta_description || '',
        });
      })
      .catch((loadError) => setError(loadError.message || 'Không thể tải bài viết'))
      .finally(() => setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  const update = (field: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const updateTitle = (event: React.ChangeEvent<HTMLInputElement>) => {
    const title = event.target.value;
    setForm((current) => ({
      ...current,
      title,
      slug: !id && !slugEdited ? normalizeSlug(title) : current.slug,
    }));
  };

  const updateSlug = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSlugEdited(true);
    setForm((current) => ({ ...current, slug: event.target.value }));
  };

  const toggleCategory = (categoryId: number) => {
    setForm((current) => {
      const set = new Set<number>(current.categoryIds || []);
      if (set.has(categoryId)) set.delete(categoryId);
      else set.add(categoryId);
      const categoryIds = Array.from(set);
      return {
        ...current,
        categoryIds,
        catId: categoryIds.includes(current.catId) ? current.catId : categoryIds[0] || 0,
      };
    });
  };

  const uploadImage = async (target: 'thumbnail' | 'imageBackground' | 'content', file: File | null) => {
    if (!file || uploadingField) return;
    setUploadingField(target);
    setImageError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/admin/articles/images/upload', {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể tải ảnh');
      const relativePath = String(payload.data?.relativePath || '');
      const url = String(payload.data?.url || '');
      if (target === 'content') {
        setUploadedContentImages((current) => [{ id: `${Date.now()}-${relativePath}`, name: file.name, url, relativePath }, ...current]);
      } else {
        setForm((current) => ({ ...current, [target]: relativePath }));
      }
    } catch (uploadError: any) {
      setImageError(uploadError.message || 'Không thể tải ảnh');
    } finally {
      setUploadingField('');
    }
  };

  const insertContentImage = (image: UploadedContentImage) => {
    const publicUrl = `https://hacom.vn/media/news/${image.relativePath}`;
    const html = `<p><img src="${publicUrl}" alt="${image.name.replace(/"/g, '&quot;')}" /></p>`;
    if (contentEditorRef.current) {
      contentEditorRef.current.insertHtmlAtCursor(html);
      return;
    }
    setForm((current) => ({ ...current, content: `${current.content || ''}${html}` }));
  };

  const save = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const body = {
        ...form,
        status: Number(form.status),
        ordering: Number(form.ordering || 0),
        isFeatured: Number(form.isFeatured),
        articleTimeSet: Number(form.articleTimeSet),
        articleTime: datetimeLocalToUnix(form.articleTimeInput),
        articleDisplayTimeSet: Number(form.articleDisplayTimeSet),
        articleDisplayTime: datetimeLocalToUnix(form.articleDisplayTimeInput),
      };
      const response = await fetch(id ? `/api/admin/articles/${id}` : '/api/admin/articles', {
        method: id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể lưu bài viết');
      setMessage(payload.message || 'Đã lưu bài viết');
      if (!id && payload.data?.id) router.replace(`/news/edit?id=${payload.data.id}`);
      router.refresh();
    } catch (saveError: any) {
      setError(saveError.message || 'Không thể lưu bài viết');
    } finally {
      setSaving(false);
    }
  };

  const openArticle = () => {
    if (!form.slug) return;
    window.open(`/tin-tuc/${form.slug}`, '_blank', 'noopener,noreferrer');
  };

  const renderImageBox = (field: 'thumbnail' | 'imageBackground', label: string, currentLabel: string) => {
    const value = field === 'thumbnail' ? form.thumbnail : form.imageBackground;
    const preview = newsImagePreview(value);
    const uploading = uploadingField === field;
    return (
      <section className="glass-panel rounded-xl border border-gray-800/80 p-5">
        <label className={labelClass}>
          <span>{label}</span>
          <span className="mt-2 flex h-11 items-center overflow-hidden rounded-md border border-gray-700 bg-gray-900/80 text-gray-100">
            <span className="flex h-full items-center gap-2 border-r border-gray-700 px-4 text-sm text-gray-300">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Chọn ảnh
            </span>
            <span className="truncate px-4 text-sm text-gray-400">{value || 'Chưa chọn ảnh'}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              disabled={Boolean(uploadingField)}
              onChange={(event) => {
                uploadImage(field, event.target.files?.[0] || null);
                event.target.value = '';
              }}
            />
          </span>
        </label>
        <div className="mt-4 rounded-lg border border-dashed border-gray-700/80 bg-gray-950/50 p-4">
          <p className="mb-3 text-center text-xs text-gray-500">{currentLabel}</p>
          <div className="flex h-36 items-center justify-center overflow-hidden rounded-md bg-gray-900/70">
            {preview ? (
              <img src={preview} alt={currentLabel} className="max-h-full max-w-full object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-600">
                <ImageIcon className="h-8 w-8" />
                <span className="text-xs">Chưa có ảnh</span>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  };

  if (loading) return <div className="w-full h-full p-6 text-gray-400">Đang tải bài viết...</div>;

  return (
    <div className="w-full h-full min-h-[calc(100vh-8rem)] overflow-y-auto custom-scrollbar p-4 animate-in fade-in duration-300" onScroll={handlePageScroll}>
      <header className={`${headerCompact ? 'sticky top-0 z-40 -mt-4 mb-3 gap-2 py-2 shadow-md animate-in fade-in slide-in-from-top-2 duration-200' : 'relative mb-5 gap-4 pb-4'} -mx-4 flex flex-col border-b border-gray-800/80 bg-[#080b12]/95 px-4 lg:flex-row lg:items-center lg:justify-between`}>
        <div className={`border-l-4 border-blue-500 pl-3 ${headerCompact ? 'py-0.5' : ''}`}>
          <h1 className={`${headerCompact ? 'text-lg leading-6' : 'text-2xl'} text-blue-300`}>{id ? 'Cập nhật bài viết' : 'Thêm bài viết'}</h1>
          <p className={`${headerCompact ? 'hidden' : 'mt-1 text-sm'} text-gray-500`}>Quản lý thông tin chi tiết và nội dung của bài viết</p>
        </div>
        <div className={`flex flex-wrap ${headerCompact ? 'gap-2' : 'gap-3'}`}>
          <button type="button" onClick={openArticle} disabled={!form.slug} className={`inline-flex items-center gap-2 rounded-md border border-blue-700 bg-blue-950/40 text-sm text-blue-200 transition hover:border-blue-400 disabled:opacity-40 ${headerCompact ? 'px-3 py-1.5' : 'px-4 py-2'}`}>
            <ExternalLink className="h-4 w-4" /> Mở trang tab
          </button>
          <button type="button" onClick={save} disabled={saving} className={`inline-flex items-center gap-2 rounded-md bg-blue-600 text-sm text-white transition hover:bg-blue-500 disabled:opacity-60 ${headerCompact ? 'px-4 py-1.5' : 'px-5 py-2'}`}>
            <Save className="h-4 w-4" /> {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
          <button type="button" onClick={() => router.push('/news/news-list')} className={`inline-flex items-center gap-2 rounded-md border border-red-500/50 bg-red-500/10 text-sm text-red-300 transition hover:bg-red-500/20 ${headerCompact ? 'px-4 py-1.5' : 'px-5 py-2'}`}>
            <X className="h-4 w-4" /> Đóng
          </button>
        </div>
      </header>

      {message && <div className="mb-3 rounded border border-green-900 bg-green-950/30 px-3 py-2 text-sm text-green-300">{message}</div>}
      {error && <div className="mb-3 rounded border border-red-900 bg-red-950/30 px-3 py-2 text-sm text-red-300">{error}</div>}
      {imageError && <div className="mb-3 rounded border border-red-900 bg-red-950/30 px-3 py-2 text-sm text-red-300">{imageError}</div>}

      <div className="space-y-6 pb-24">
        <section className="glass-panel rounded-xl border border-gray-800/80 p-5">
          <h2 className="mb-4 text-sm text-gray-100">Danh mục <span className={requiredClass}>*</span></h2>
          <div className="grid grid-cols-1 gap-x-8 gap-y-3 text-sm text-gray-300 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <label key={category.id} className="flex cursor-pointer items-center gap-2">
                <input type="checkbox" checked={selectedCategoryIds.has(Number(category.id))} onChange={() => toggleCategory(Number(category.id))} className="rounded-sm border-gray-700 bg-gray-900 checked:bg-blue-500" />
                <span>{category.name}</span>
              </label>
            ))}
          </div>
        </section>

        <section className="glass-panel rounded-xl border border-gray-800/80 p-5 space-y-5">
          <label className={labelClass}>
            <span>Tiêu đề <span className={requiredClass}>*</span></span>
            <input value={form.title} onChange={updateTitle} className={inputClass} />
          </label>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
            <label className={labelClass}>
              <span>Url <span className={requiredClass}>*</span></span>
              <input value={form.slug} onChange={updateSlug} className={`${inputClass} font-mono`} />
            </label>
            <label className={labelClass}>
              <span>Trạng thái</span>
              <select value={form.status} onChange={update('status')} className={inputClass}>
                <option value="1">Cho hiển thị</option>
                <option value="0">Ẩn</option>
              </select>
            </label>
            <label className={labelClass}>
              <span>Thời gian của bài viết</span>
              <select value={form.articleTimeSet} onChange={update('articleTimeSet')} className={inputClass}>
                <option value="0">Theo thời gian tạo</option>
                <option value="1">Thay đổi thời gian</option>
              </select>
            </label>
            <label className={labelClass}>
              <span>Thời gian ban đầu</span>
              <input value={form.createDateInput} readOnly className={`${inputClass} text-gray-400`} />
            </label>
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
            <label className={labelClass}>
              <span>Thứ tự</span>
              <input type="text" inputMode="numeric" value={form.ordering} onChange={update('ordering')} placeholder="Nhập thứ tự" className={inputClass} />
            </label>
            <label className={labelClass}>
              <span>Nổi bật</span>
              <select value={form.isFeatured} onChange={update('isFeatured')} className={inputClass}>
                <option value="0">Không nổi bật</option>
                <option value="1">Nổi bật</option>
              </select>
            </label>
            <label className={labelClass}>
              <span>Thời gian hiển thị</span>
              <input type="datetime-local" value={form.articleTimeInput} onChange={update('articleTimeInput')} disabled={form.articleTimeSet !== '1'} className={`${inputClass} disabled:opacity-45`} />
            </label>
            <label className={labelClass}>
              <span>Thời gian bắt đầu hiển thị</span>
              <input type="datetime-local" value={form.articleDisplayTimeInput} onChange={(event) => setForm((current) => ({ ...current, articleDisplayTimeInput: event.target.value, articleDisplayTimeSet: event.target.value ? '1' : '0' }))} className={inputClass} />
            </label>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {renderImageBox('thumbnail', 'Hình tin nhỏ', 'Ảnh thu nhỏ hiện tại')}
          {renderImageBox('imageBackground', 'Hình nền', 'Hình nền hiện tại')}
        </div>

        <section className="glass-panel rounded-xl border border-gray-800/80 p-5">
          <label className={labelClass}>
            <span>Tóm tắt <span className={requiredClass}>*</span></span>
            <textarea rows={4} value={form.summary} onChange={update('summary')} className={textareaClass} />
          </label>
          <p className="mt-2 text-xs text-gray-500">Số từ: {wordCount(form.summary)}</p>
        </section>

        <section className="glass-panel overflow-hidden rounded-xl border border-gray-800/80 p-5">
          <h2 className="mb-4 text-sm text-gray-100">Nội dung</h2>
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[20%_minmax(0,1fr)]">
            <aside className="min-w-0 space-y-3">
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={openContentImagePicker}
                disabled={Boolean(uploadingField)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-blue-700 bg-blue-950/40 px-3 py-2 text-sm text-blue-200 transition hover:border-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploadingField === 'content' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Tải ảnh lên
              </button>
              <input
                ref={contentUploadInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                disabled={Boolean(uploadingField)}
                onChange={(event) => {
                  uploadImage('content', event.target.files?.[0] || null);
                  event.target.value = '';
                }}
              />
              <div className="max-h-[420px] min-h-[280px] overflow-y-auto rounded-md border border-gray-700 bg-gray-900/60 p-3 custom-scrollbar">
                {uploadedContentImages.length === 0 ? (
                  <div className="flex h-56 items-center justify-center text-center text-xs text-gray-500">Bạn chưa tải ảnh nào.</div>
                ) : uploadedContentImages.map((image) => (
                  <div key={image.id} className="mb-3 rounded border border-gray-800 bg-gray-950/70 p-2">
                    <img src={image.url} alt={image.name} className="mb-2 h-24 w-full object-contain" />
                    <p className="truncate text-xs text-gray-400">{image.name}</p>
                    <div className="mt-2 flex gap-2">
                      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => insertContentImage(image)} className="rounded bg-blue-600 px-2 py-1 text-xs text-white">Chèn</button>
                      <button type="button" onClick={() => setUploadedContentImages((current) => current.filter((item) => item.id !== image.id))} className="rounded border border-red-500/40 px-2 py-1 text-xs text-red-300">Xóa</button>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
            <div className="min-w-0 overflow-hidden">
              <RichTextEditor id="article-content-editor" value={form.content} onChange={(value) => setForm((current) => ({ ...current, content: value }))} minHeight="360px" editorHandleRef={contentEditorRef} imageUploadScope="articles" resizable />
              <p className="mt-2 text-right text-xs text-gray-500">Số từ: {wordCount(form.content)}</p>
            </div>
          </div>
        </section>

        <section className="glass-panel rounded-xl border border-gray-800/80 p-5">
          <label className={labelClass}>
            <span>Tags (Mỗi tag một dòng)</span>
            <textarea rows={4} value={form.tags} onChange={update('tags')} placeholder="Nhập tags" className={textareaClass} />
          </label>
        </section>

        <section className="glass-panel rounded-xl border border-gray-800/80 p-5 space-y-5">
          <h2 className="flex items-center gap-2 text-sm text-gray-100"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Dùng cho SEO</h2>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <label className={labelClass}>
              <span>Tiêu đề Meta <span className={requiredClass}>*</span></span>
              <input value={form.metaTitle} onChange={update('metaTitle')} className={inputClass} />
            </label>
            <label className={labelClass}>
              <span>Từ khóa Meta <span className={requiredClass}>*</span></span>
              <input value={form.metaKeyword} onChange={update('metaKeyword')} className={inputClass} />
            </label>
          </div>
          <label className={labelClass}>
            <span>Mô tả Meta <span className={requiredClass}>*</span></span>
            <textarea rows={4} value={form.metaDescription} onChange={update('metaDescription')} className={textareaClass} />
          </label>
        </section>
      </div>
    </div>
  );
}

export default function ArticleEditPage() {
  return (
    <Suspense fallback={<div className="w-full h-full p-6 text-gray-400">Đang tải...</div>}>
      <ArticleEditInner />
    </Suspense>
  );
}
