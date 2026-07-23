'use client';

import { Check, Upload, X } from 'lucide-react';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { RichTextEditor } from '@/components/products/edit/RichTextEditor';
import type { BrandNode } from './BrandTable';

type BrandDetails = {
  id: number;
  name: string;
  slug: string;
  image: string;
  summary: string;
  description: string;
  ordering: number;
  status: boolean;
  featured: boolean;
  metaTitle: string;
  metaKeywords: string;
  metaDescription: string;
};

type BrandFormState = {
  name: string;
  summary: string;
  description: string;
  ordering: string;
  status: boolean;
  featured: boolean;
  metaTitle: string;
  metaKeywords: string;
  metaDescription: string;
  image: string;
  slug: string;
};

type BrandModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
  brand?: BrandNode | null;
  isEdit?: boolean;
};

const EMPTY_FORM: BrandFormState = {
  name: '',
  summary: '',
  description: '',
  ordering: '0',
  status: true,
  featured: false,
  metaTitle: '',
  metaKeywords: '',
  metaDescription: '',
  image: '',
  slug: '',
};

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const BRAND_LOGO_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif';
const MAX_BRAND_LOGO_SIZE = 10 * 1024 * 1024;

function detailsToForm(details: BrandDetails): BrandFormState {
  return {
    name: details.name,
    summary: details.summary,
    description: details.description,
    ordering: String(details.ordering),
    status: details.status,
    featured: details.featured,
    metaTitle: details.metaTitle,
    metaKeywords: details.metaKeywords,
    metaDescription: details.metaDescription,
    image: details.image,
    slug: details.slug,
  };
}

export function BrandModal({ isOpen, onClose, onSaved, brand = null, isEdit = Boolean(brand) }: BrandModalProps) {
  const reactId = useId().replace(/:/g, '');
  const titleId = `brand-modal-title-${reactId}`;
  const errorId = `brand-modal-error-${reactId}`;
  const dialogRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const savingRef = useRef(false);
  const [form, setForm] = useState<BrandFormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pendingLogoFile, setPendingLogoFile] = useState<File | null>(null);
  const [pendingLogoPreview, setPendingLogoPreview] = useState('');
  const [logoError, setLogoError] = useState('');

  const requestClose = () => {
    if (!savingRef.current) onCloseRef.current();
  };

  useEffect(() => {
    onCloseRef.current = onClose;
    savingRef.current = saving;
  }, [onClose, saving]);

  useEffect(() => {
    if (!isOpen) return;
    triggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => dialogRef.current?.focus(), 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      const isTinyMceOverlay = Boolean(activeElement?.closest('.tox-tinymce-aux, .tox-dialog-wrap, .tox-menu'));
      if (event.key === 'Escape') {
        if (isTinyMceOverlay) return;
        event.preventDefault();
        if (!savingRef.current) onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || isTinyMceOverlay || !dialogRef.current) return;

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
        .filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      triggerRef.current?.focus();
    };
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (pendingLogoPreview) URL.revokeObjectURL(pendingLogoPreview);
    };
  }, [pendingLogoPreview]);

  useEffect(() => {
    if (!isOpen) return;
    if (!brand) {
      setLoading(false);
      setError('');
      setFieldErrors({});
      setForm(EMPTY_FORM);
      setPendingLogoFile(null);
      setPendingLogoPreview('');
      setLogoError('');
      window.setTimeout(() => nameRef.current?.focus(), 0);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setFieldErrors({});
    setForm({ ...EMPTY_FORM, name: brand.name });
    setPendingLogoFile(null);
    setPendingLogoPreview('');
    setLogoError('');

    fetch(`/api/admin/brands/${brand.id}`, { signal: controller.signal })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error?.message || 'Không thể tải dữ liệu thương hiệu');
        }
        setForm(detailsToForm(payload.data as BrandDetails));
        window.setTimeout(() => nameRef.current?.focus(), 0);
      })
      .catch((fetchError) => {
        if (!(fetchError instanceof DOMException && fetchError.name === 'AbortError')) {
          setError(fetchError instanceof Error ? fetchError.message : 'Không thể tải dữ liệu thương hiệu');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [brand, isOpen]);

  const setField = <Key extends keyof BrandFormState>(key: Key, value: BrandFormState[Key]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const selectLogo = (file: File | undefined) => {
    if (!file) return;
    if (!BRAND_LOGO_ACCEPT.split(',').includes(file.type)) {
      setPendingLogoFile(null);
      setPendingLogoPreview('');
      setLogoError('Chỉ hỗ trợ ảnh JPG, PNG, WebP hoặc GIF.');
      if (logoInputRef.current) logoInputRef.current.value = '';
      return;
    }
    if (file.size <= 0 || file.size > MAX_BRAND_LOGO_SIZE) {
      setPendingLogoFile(null);
      setPendingLogoPreview('');
      setLogoError('Dung lượng logo phải lớn hơn 0 và không vượt quá 10MB.');
      if (logoInputRef.current) logoInputRef.current.value = '';
      return;
    }

    setLogoError('');
    setPendingLogoFile(file);
    setPendingLogoPreview(URL.createObjectURL(file));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading || saving) return;
    if (!brand) {
      setError('Chức năng thêm mới thương hiệu chưa được hỗ trợ trong luồng này.');
      return;
    }

    const nextFieldErrors: Record<string, string> = {};
    const name = form.name.trim();
    const orderingText = form.ordering.trim();
    const ordering = Number(orderingText);
    if (!name) nextFieldErrors.name = 'Tên thương hiệu là bắt buộc.';
    else if (name.length > 100) nextFieldErrors.name = 'Tên thương hiệu tối đa 100 ký tự.';
    if (!/^-?\d+$/.test(orderingText) || !Number.isSafeInteger(ordering) || ordering < -8_388_608 || ordering > 8_388_607) {
      nextFieldErrors.ordering = 'Thứ tự hiển thị phải là số nguyên hợp lệ.';
    }
    if (form.description.length > 65_535) {
      nextFieldErrors.description = 'Mô tả tối đa 65.535 ký tự.';
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError('Vui lòng kiểm tra lại các trường được đánh dấu.');
      const firstField = Object.keys(nextFieldErrors)[0];
      document.getElementById(`brand-${firstField}-${reactId}`)?.focus();
      return;
    }

    setSaving(true);
    setError('');
    setFieldErrors({});
    try {
      let image = form.image;
      if (pendingLogoFile) {
        const uploadBody = new FormData();
        uploadBody.set('file', pendingLogoFile);
        const uploadResponse = await fetch('/api/admin/brands/images/upload', {
          method: 'POST',
          body: uploadBody,
        });
        const uploadPayload = await uploadResponse.json().catch(() => null);
        if (!uploadResponse.ok || !uploadPayload?.success || typeof uploadPayload?.data?.url !== 'string') {
          throw new Error(uploadPayload?.error?.message || 'Không thể tải logo thương hiệu');
        }
        image = uploadPayload.data.url;
        setForm((current) => ({ ...current, image }));
        setPendingLogoFile(null);
        setPendingLogoPreview('');
        if (logoInputRef.current) logoInputRef.current.value = '';
      }

      const response = await fetch(`/api/admin/brands/${brand.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          image,
          summary: form.summary,
          description: form.description,
          ordering,
          status: form.status,
          featured: form.featured,
          metaTitle: form.metaTitle,
          metaKeywords: form.metaKeywords,
          metaDescription: form.metaDescription,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        const apiFields = payload?.error?.fields;
        if (apiFields && typeof apiFields === 'object') {
          setFieldErrors(Object.fromEntries(
            Object.keys(apiFields).map((key) => [key, 'Giá trị không hợp lệ.']),
          ));
        }
        throw new Error(payload?.error?.message || 'Không thể lưu thương hiệu');
      }
      await onSaved?.();
      onClose();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể lưu thương hiệu');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const fieldClass = (field: string) => (
    `w-full rounded-md border bg-gray-900/80 px-4 py-2 text-gray-100 shadow-inner transition-colors focus:outline-none focus:ring-1 ${
      fieldErrors[field]
        ? 'border-red-500 focus:border-red-400 focus:ring-red-500/40'
        : 'border-gray-700 focus:border-blue-500 focus:ring-blue-500/50'
    }`
  );

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
        aria-label="Đóng cửa sổ chỉnh sửa thương hiệu"
        tabIndex={-1}
        onClick={requestClose}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={error ? errorId : undefined}
        tabIndex={-1}
        className="relative flex max-h-[calc(100vh-24px)] w-full max-w-[1200px] flex-col overflow-hidden rounded-xl border border-gray-800 bg-[#0a0a0f] shadow-[0_24px_80px_rgba(0,0,0,0.65)] sm:max-h-[calc(100vh-48px)]"
      >
        <header className="flex shrink-0 items-center justify-between border-b border-gray-800 bg-gradient-to-r from-blue-900/50 to-blue-950 px-4 py-3 sm:px-6">
          <div>
            <h2 id={titleId} className="flex items-center gap-2 text-lg font-bold text-white">
              <span className="h-5 w-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]" aria-hidden="true" />
              {isEdit ? 'Chỉnh sửa thương hiệu' : 'Thêm mới thương hiệu'}
            </h2>
            <p className="mt-1 text-xs text-gray-400">
              {brand ? `ID ${brand.id} · Chỉnh sửa nội dung và logo thương hiệu` : 'Nhập thông tin thương hiệu mới'}
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            disabled={saving}
            aria-label="Đóng cửa sổ chỉnh sửa"
            className="rounded-md border border-transparent p-2 text-gray-400 transition-colors hover:border-red-500/50 hover:bg-red-500/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-50"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="custom-scrollbar flex-1 overflow-y-auto p-4 sm:p-6">
            {error ? (
              <div id={errorId} role="alert" className="mb-5 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className="flex min-h-[420px] items-center justify-center" role="status" aria-live="polite">
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" aria-hidden="true" />
                <span className="ml-3 text-sm text-gray-300">Đang tải dữ liệu thương hiệu…</span>
              </div>
            ) : (
              <div className="space-y-7">
                <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]" aria-labelledby={`brand-basic-${reactId}`}>
                  <div className="space-y-4">
                    <h3 id={`brand-basic-${reactId}`} className="text-base font-bold text-white">Thông tin thương hiệu</h3>
                    <div className="space-y-1.5">
                      <label htmlFor={`brand-name-${reactId}`} className="text-sm font-medium text-gray-300">
                        Tên thương hiệu <span className="text-red-500" aria-hidden="true">*</span>
                      </label>
                      <input
                        ref={nameRef}
                        id={`brand-name-${reactId}`}
                        value={form.name}
                        maxLength={100}
                        required
                        aria-invalid={Boolean(fieldErrors.name)}
                        aria-describedby={fieldErrors.name ? `brand-name-error-${reactId}` : undefined}
                        onChange={(event) => setField('name', event.target.value)}
                        className={fieldClass('name')}
                      />
                      {fieldErrors.name ? <p id={`brand-name-error-${reactId}`} className="text-xs text-red-400">{fieldErrors.name}</p> : null}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <label htmlFor={`brand-ordering-${reactId}`} className="text-sm font-medium text-gray-300">Thứ tự hiển thị</label>
                        <input
                          id={`brand-ordering-${reactId}`}
                          type="text"
                          inputMode="numeric"
                          pattern="-?[0-9]*"
                          value={form.ordering}
                          aria-invalid={Boolean(fieldErrors.ordering)}
                          aria-describedby={fieldErrors.ordering ? `brand-ordering-error-${reactId}` : undefined}
                          onChange={(event) => {
                            if (/^-?\d*$/.test(event.target.value)) {
                              setField('ordering', event.target.value);
                            }
                          }}
                          className={fieldClass('ordering')}
                        />
                        {fieldErrors.ordering ? <p id={`brand-ordering-error-${reactId}`} className="text-xs text-red-400">{fieldErrors.ordering}</p> : null}
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor={`brand-featured-${reactId}`} className="text-sm font-medium text-gray-300">Nổi bật</label>
                        <select
                          id={`brand-featured-${reactId}`}
                          value={form.featured ? '1' : '0'}
                          onChange={(event) => setField('featured', event.target.value === '1')}
                          className={`${fieldClass('featured')} cursor-pointer`}
                        >
                          <option value="1">Có</option>
                          <option value="0">Không</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label htmlFor={`brand-status-${reactId}`} className="text-sm font-medium text-gray-300">Trạng thái</label>
                        <select
                          id={`brand-status-${reactId}`}
                          value={form.status ? '1' : '0'}
                          onChange={(event) => setField('status', event.target.value === '1')}
                          className={`${fieldClass('status')} cursor-pointer`}
                        >
                          <option value="1">Hoạt động</option>
                          <option value="0">Tạm khóa</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor={`brand-summary-${reactId}`} className="text-sm font-medium text-gray-300">Mô tả tóm tắt</label>
                      <textarea
                        id={`brand-summary-${reactId}`}
                        rows={3}
                        maxLength={65_535}
                        value={form.summary}
                        onChange={(event) => setField('summary', event.target.value)}
                        className={`${fieldClass('summary')} custom-scrollbar resize-y`}
                      />
                    </div>
                  </div>

                  <aside className="rounded-lg border border-gray-800 bg-gray-950/60 p-4" aria-label="Logo thương hiệu">
                    <p className="text-sm font-semibold text-gray-300">Logo thương hiệu</p>
                    <div className="mt-3 flex h-28 items-center justify-center overflow-hidden rounded-lg border border-gray-800 bg-white p-3">
                      {(pendingLogoPreview || form.image) && (pendingLogoPreview || form.image) !== '0' ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={pendingLogoPreview || form.image} alt={`Logo ${form.name || brand?.name || 'thương hiệu'}`} className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-center text-xs font-medium text-gray-500">Chưa có logo</span>
                      )}
                    </div>
                    <input
                      ref={logoInputRef}
                      id={`brand-logo-${reactId}`}
                      type="file"
                      accept={BRAND_LOGO_ACCEPT}
                      className="sr-only"
                      onChange={(event) => selectLogo(event.target.files?.[0])}
                    />
                    <button
                      type="button"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={saving}
                      aria-describedby={logoError ? `brand-logo-error-${reactId}` : undefined}
                      className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-blue-400/70 bg-blue-600 px-4 text-sm font-bold text-white shadow-[0_6px_18px_rgba(37,99,235,0.25)] transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-950 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Upload className="h-4 w-4" aria-hidden="true" />
                      Tải logo
                    </button>
                    <p className="mt-2 text-xs leading-relaxed text-gray-500">
                      JPG, PNG, WebP hoặc GIF. Tối đa 10MB.
                    </p>
                    {logoError ? (
                      <p id={`brand-logo-error-${reactId}`} role="alert" className="mt-2 text-xs text-red-400">
                        {logoError}
                      </p>
                    ) : pendingLogoFile ? (
                      <p className="mt-2 break-all text-xs text-emerald-400" aria-live="polite">
                        Đã chọn: {pendingLogoFile.name}
                      </p>
                    ) : null}
                    <dl className="mt-4 space-y-2 text-xs">
                      <div>
                        <dt className="text-gray-500">Slug</dt>
                        <dd className="mt-0.5 break-all font-mono text-gray-300">{form.slug || '—'}</dd>
                      </div>
                    </dl>
                  </aside>
                </section>

                <section className="border-t border-gray-800 pt-6" aria-labelledby={`brand-description-heading-${reactId}`}>
                  <h3 id={`brand-description-heading-${reactId}`} className="sr-only">Mô tả</h3>
                  <RichTextEditor
                    id={`brand-description-${reactId}`}
                    title="Mô tả"
                    value={form.description}
                    onChange={(value) => setField('description', value)}
                    minHeight="420px"
                    resizable
                    imageUploadScope="brands"
                  />
                  {fieldErrors.description ? (
                    <p id={`brand-description-error-${reactId}`} className="mt-2 text-xs text-red-400">
                      {fieldErrors.description}
                    </p>
                  ) : null}
                </section>

                <section className="space-y-4 border-t border-gray-800 pt-6" aria-labelledby={`brand-seo-${reactId}`}>
                  <h3 id={`brand-seo-${reactId}`} className="flex items-center gap-2 text-base font-bold text-white">
                    <span className="h-4 w-1 rounded-full bg-emerald-500" aria-hidden="true" />
                    Dùng cho SEO
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label htmlFor={`brand-metaTitle-${reactId}`} className="text-sm font-medium text-gray-300">Tiêu đề</label>
                      <input
                        id={`brand-metaTitle-${reactId}`}
                        value={form.metaTitle}
                        maxLength={250}
                        onChange={(event) => setField('metaTitle', event.target.value)}
                        className={fieldClass('metaTitle')}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label htmlFor={`brand-metaKeywords-${reactId}`} className="text-sm font-medium text-gray-300">Từ khóa</label>
                      <input
                        id={`brand-metaKeywords-${reactId}`}
                        value={form.metaKeywords}
                        maxLength={65_535}
                        onChange={(event) => setField('metaKeywords', event.target.value)}
                        className={fieldClass('metaKeywords')}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor={`brand-metaDescription-${reactId}`} className="text-sm font-medium text-gray-300">Mô tả SEO</label>
                    <textarea
                      id={`brand-metaDescription-${reactId}`}
                      rows={3}
                      value={form.metaDescription}
                      maxLength={65_535}
                      onChange={(event) => setField('metaDescription', event.target.value)}
                      className={`${fieldClass('metaDescription')} resize-y`}
                    />
                  </div>
                </section>
              </div>
            )}
          </div>

          <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-gray-800 bg-gray-950/95 px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={requestClose}
              disabled={saving}
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-5 text-sm font-medium text-red-300 transition-colors hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-50"
            >
              <X className="h-4 w-4" aria-hidden="true" /> Đóng
            </button>
            <button
              type="submit"
              disabled={loading || saving}
              className="inline-flex min-h-10 items-center gap-2 rounded-md border border-blue-400/60 bg-blue-600 px-6 text-sm font-bold text-white shadow-[0_6px_20px_rgba(37,99,235,0.3)] transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" />
              ) : (
                <Check className="h-4 w-4" aria-hidden="true" />
              )}
              {saving ? 'Đang lưu…' : 'Lưu'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : null;
}
