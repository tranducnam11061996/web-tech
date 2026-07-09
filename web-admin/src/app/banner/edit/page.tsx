'use client';

import type { ChangeEvent, ReactNode } from 'react';
import { Suspense, useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Image as ImageIcon, Loader2, Save, Upload, X } from 'lucide-react';

type BannerLocation = {
  id: number;
  key: string;
  templatePage: string;
  name: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function resolveImageUrl(value: string) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value) || value.startsWith('data:')) return value;
  if (value.startsWith('/api/media/')) return `${API_URL}${value}`;
  if (value.startsWith('/media/')) return `https://hanoicomputercdn.com${value}`;
  return value;
}

function initialForm() {
  return {
    name: '',
    locationId: '',
    imageUrl: '',
    mobileImageUrl: '',
    targetUrl: '',
    summary: '',
    altText: '',
    ordering: '0',
    width: '0',
    height: '0',
    status: '1',
    showInMobile: '1',
    fromTime: '',
    toTime: '',
    renderMode: 'image',
    headline: '',
    subheading: '',
    ctaLabel: '',
    backgroundColor: '',
    textColor: '',
    categoryIds: '',
  };
}

function BannerEditInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [locations, setLocations] = useState<BannerLocation[]>([]);
  const [form, setForm] = useState(initialForm);
  const [errorText, setErrorText] = useState('');
  const [statusText, setStatusText] = useState('');
  const [uploadingField, setUploadingField] = useState<'imageUrl' | 'mobileImageUrl' | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    fetch('/api/admin/banner-locations')
      .then((response) => response.json())
      .then((payload) => {
        const items = payload?.data?.items || [];
        setLocations(items);
        setForm((current) => current.locationId ? current : { ...current, locationId: items[0]?.id ? String(items[0].id) : '' });
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    fetch(`/api/admin/banners/${id}`)
      .then((response) => response.json().then((payload) => ({ response, payload })))
      .then(({ response, payload }) => {
        if (!alive) return;
        if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể tải banner');
        const item = payload.data;
        setForm({
          name: item.name || '',
          locationId: String(item.locationId || ''),
          imageUrl: item.imageUrl || '',
          mobileImageUrl: item.mobileImageUrl || '',
          targetUrl: item.targetUrl || '',
          summary: item.summary || item.text?.subheading || '',
          altText: item.altText || '',
          ordering: String(item.ordering ?? 0),
          width: String(item.meta?.width ?? 0),
          height: String(item.meta?.height ?? 0),
          status: String(item.status ?? 1),
          showInMobile: item.display?.showInMobile ? '1' : '0',
          fromTime: item.fromTimeInput || '',
          toTime: item.toTimeInput || '',
          renderMode: item.renderMode || 'image',
          headline: item.text?.headline || '',
          subheading: item.text?.subheading || '',
          ctaLabel: item.text?.ctaLabel || '',
          backgroundColor: item.style?.backgroundColor || '',
          textColor: item.style?.textColor || '',
          categoryIds: Array.isArray(item.categoryIds) ? item.categoryIds.join(',') : '',
        });
      })
      .catch((error) => setErrorText(error.message || 'Không thể tải banner'));
    return () => {
      alive = false;
    };
  }, [id]);

  const update = (field: keyof ReturnType<typeof initialForm>) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const uploadImage = async (field: 'imageUrl' | 'mobileImageUrl', file: File | null) => {
    if (!file) return;
    setUploadingField(field);
    setErrorText('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/admin/banners/images/upload', { method: 'POST', body: formData });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể tải ảnh');
      setForm((current) => ({ ...current, [field]: payload.data?.url || '' }));
    } catch (error: any) {
      setErrorText(error.message || 'Không thể tải ảnh');
    } finally {
      setUploadingField(null);
    }
  };

  const saveBanner = () => {
    setErrorText('');
    setStatusText('');
    startTransition(async () => {
      try {
        const payload = {
          ...form,
          locationId: Number(form.locationId),
          ordering: Number(form.ordering),
          width: Number(form.width),
          height: Number(form.height),
          status: Number(form.status),
          showInMobile: Number(form.showInMobile),
          categoryIds: form.categoryIds,
        };
        const response = await fetch(id ? `/api/admin/banners/${id}` : '/api/admin/banners', {
          method: id ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result?.error?.message || 'Không thể lưu banner');
        setStatusText('Đã lưu banner');
        if (!id && result.data?.id) router.replace(`/banner/edit?id=${result.data.id}`);
        router.refresh();
      } catch (error: any) {
        setErrorText(error.message || 'Không thể lưu banner');
      }
    });
  };

  return (
    <div className="h-full w-full overflow-y-auto p-2 text-gray-100 custom-scrollbar">
      <div className="sticky top-0 z-30 mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-gray-800/80 bg-[#0a0a0f]/95 px-2 py-3 backdrop-blur">
        <div>
          <h1 className="text-xl font-bold text-white">{id ? 'Cập nhật banner' : 'Thêm banner'}</h1>
          <p className="mt-1 text-sm text-gray-500">Quản lý ảnh, vị trí, lịch hiển thị và metadata cho public API.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={saveBanner} disabled={isPending} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
            {isPending ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : <Save className="mr-2 inline h-4 w-4" />}
            Lưu banner
          </button>
          <Link href="/banner/banner-list" className="rounded-md border border-gray-700 px-4 py-2 text-sm text-gray-200 hover:border-gray-500">
            <X className="mr-2 inline h-4 w-4" />Đóng
          </Link>
        </div>
      </div>

      {errorText ? <div className="mb-4 rounded-md border border-red-900/70 bg-red-950/50 px-4 py-2 text-sm text-red-200">{errorText}</div> : null}
      {statusText ? <div className="mb-4 rounded-md border border-emerald-900/70 bg-emerald-950/50 px-4 py-2 text-sm text-emerald-200">{statusText}</div> : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <main className="space-y-4">
          <section className="rounded-lg border border-gray-800 bg-gray-950/80 p-4">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-400">Thông tin chính</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Tên banner">
                <input value={form.name} onChange={update('name')} className="field-input" />
              </Field>
              <Field label="Vị trí">
                <select value={form.locationId} onChange={update('locationId')} className="field-input">
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>{location.templatePage} · {location.name || location.key}</option>
                  ))}
                </select>
              </Field>
              <Field label="URL đích">
                <input value={form.targetUrl} onChange={update('targetUrl')} className="field-input" placeholder="https://hacom.vn/..." />
              </Field>
              <Field label="Alt text">
                <input value={form.altText} onChange={update('altText')} className="field-input" />
              </Field>
              <Field label="Mô tả ngắn">
                <input value={form.summary} onChange={update('summary')} className="field-input" />
              </Field>
              <Field label="Danh mục áp dụng">
                <input value={form.categoryIds} onChange={update('categoryIds')} className="field-input" placeholder="159,160" />
              </Field>
            </div>
          </section>

          <section className="rounded-lg border border-gray-800 bg-gray-950/80 p-4">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-400">Ảnh banner</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <ImageField label="Ảnh desktop" field="imageUrl" value={form.imageUrl} uploading={uploadingField === 'imageUrl'} onChange={update('imageUrl')} onUpload={uploadImage} />
              <ImageField label="Ảnh mobile" field="mobileImageUrl" value={form.mobileImageUrl} uploading={uploadingField === 'mobileImageUrl'} onChange={update('mobileImageUrl')} onUpload={uploadImage} />
            </div>
          </section>

          <section className="rounded-lg border border-gray-800 bg-gray-950/80 p-4">
            <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-400">Hiển thị</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Thứ tự">
                <input type="number" value={form.ordering} onChange={update('ordering')} className="field-input" />
              </Field>
              <Field label="Trạng thái">
                <select value={form.status} onChange={update('status')} className="field-input">
                  <option value="1">Hiển thị</option>
                  <option value="0">Đang ẩn</option>
                </select>
              </Field>
              <Field label="Mobile">
                <select value={form.showInMobile} onChange={update('showInMobile')} className="field-input">
                  <option value="1">Cho phép hiển thị</option>
                  <option value="0">Ẩn trên mobile</option>
                </select>
              </Field>
              <Field label="Từ ngày">
                <input type="datetime-local" value={form.fromTime} onChange={update('fromTime')} className="field-input" />
              </Field>
              <Field label="Đến ngày">
                <input type="datetime-local" value={form.toTime} onChange={update('toTime')} className="field-input" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Rộng">
                  <input type="number" value={form.width} onChange={update('width')} className="field-input" />
                </Field>
                <Field label="Cao">
                  <input type="number" value={form.height} onChange={update('height')} className="field-input" />
                </Field>
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-gray-800 bg-gray-950/80 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-400">Nội dung phủ ảnh</h2>
              <select value={form.renderMode} onChange={update('renderMode')} className="field-input max-w-44">
                <option value="image">Ảnh hoàn chỉnh</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            {form.renderMode === 'hybrid' ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field label="Tiêu đề">
                  <input value={form.headline} onChange={update('headline')} className="field-input" />
                </Field>
                <Field label="Nút CTA">
                  <input value={form.ctaLabel} onChange={update('ctaLabel')} className="field-input" placeholder="Mua ngay" />
                </Field>
                <Field label="Mô tả">
                  <textarea value={form.subheading} onChange={update('subheading')} className="field-input min-h-24 py-2" />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Màu nền">
                    <input value={form.backgroundColor} onChange={update('backgroundColor')} className="field-input" placeholder="474747" />
                  </Field>
                  <Field label="Màu chữ">
                    <input value={form.textColor} onChange={update('textColor')} className="field-input" placeholder="ffffff" />
                  </Field>
                </div>
              </div>
            ) : (
              <p className="rounded-md border border-gray-800 bg-gray-900/40 px-3 py-3 text-sm text-gray-500">Chế độ ảnh hoàn chỉnh chỉ dùng ảnh banner và URL đích.</p>
            )}
          </section>
        </main>

        <aside className="space-y-4">
          <section className="rounded-lg border border-gray-800 bg-gray-950/80 p-4">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-400">Preview desktop</h2>
            <BannerPreview form={form} compact={false} />
          </section>
          <section className="rounded-lg border border-gray-800 bg-gray-950/80 p-4">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-400">Preview mobile</h2>
            <BannerPreview form={{ ...form, imageUrl: form.mobileImageUrl || form.imageUrl }} compact />
          </section>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm text-gray-300">
      <span className="mb-1 block font-semibold">{label}</span>
      {children}
    </label>
  );
}

function ImageField({
  label,
  field,
  value,
  uploading,
  onChange,
  onUpload,
}: {
  label: string;
  field: 'imageUrl' | 'mobileImageUrl';
  value: string;
  uploading: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onUpload: (field: 'imageUrl' | 'mobileImageUrl', file: File | null) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-gray-300">{label}</label>
      <div className="flex gap-2">
        <input value={value} onChange={onChange} className="field-input" placeholder="/api/media/banner/..." />
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-700 px-3 text-sm text-gray-200 hover:border-gray-500">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Tải
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={(event) => onUpload(field, event.target.files?.[0] || null)} />
        </label>
      </div>
    </div>
  );
}

function BannerPreview({ form, compact }: { form: ReturnType<typeof initialForm>; compact: boolean }) {
  const imageUrl = resolveImageUrl(form.imageUrl);
  const backgroundColor = form.backgroundColor ? `#${form.backgroundColor.replace(/^#/, '')}` : '#474747';
  const textColor = form.textColor ? `#${form.textColor.replace(/^#/, '')}` : '#ffffff';

  return (
    <div className="overflow-hidden rounded-lg border border-gray-800 bg-gray-900">
      <div className={compact ? 'relative aspect-square' : 'relative aspect-[24/5]'} style={{ backgroundColor }}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={form.altText || form.name || 'Banner'} className="h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-600">
            <ImageIcon className="h-8 w-8" />
          </div>
        )}
        {form.renderMode === 'hybrid' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 px-6 text-center" style={{ color: textColor }}>
            <h3 className={compact ? 'text-lg font-bold' : 'text-2xl font-bold'}>{form.headline || form.name}</h3>
            <p className="mt-2 text-sm opacity-90">{form.subheading || form.summary}</p>
            {form.ctaLabel ? <span className="mt-4 rounded-full bg-white px-5 py-2 text-xs font-bold text-black">{form.ctaLabel}</span> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function BannerEditPage() {
  return (
    <Suspense fallback={<div className="h-full w-full p-6 text-gray-400">Đang tải...</div>}>
      <BannerEditInner />
    </Suspense>
  );
}
