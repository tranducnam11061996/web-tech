'use client';

import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, ImageOff, ImagePlus, Loader2, Star, Trash2, Upload, X } from 'lucide-react';
import { ConfirmDeleteModal } from '@/components/shared/ConfirmDeleteModal';

type ProductImageType = 'product' | 'self' | 'customer';

type ProductImage = {
  id: number;
  productId?: number;
  type: ProductImageType;
  fileName?: string;
  url: string;
  alt: string;
  ordering: number;
  isMain: boolean;
};

type ImagePayload = {
  items: ProductImage[];
};

export type TabImagesHandle = {
  isDirty: () => boolean;
  saveChanges: () => Promise<void>;
};

type TabImagesProps = {
  productId?: number;
  initialImages?: ProductImage[];
  onBusyChange?: (busy: boolean) => void;
  onDirtyChange?: (dirty: boolean) => void;
};

type QueuedFile = {
  id: string;
  file: File;
  previewUrl: string;
  error: string;
};

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function fileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10240 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

const ALBUMS: Array<{
  id: ProductImageType;
  label: string;
  uploadLabel: string;
  accent: string;
  active: string;
}> = [
  {
    id: 'product',
    label: 'Ảnh sản phẩm',
    uploadLabel: 'Hình sản phẩm',
    accent: 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]',
    active: 'bg-blue-600 text-white border-blue-500 shadow-[0_0_12px_rgba(37,99,235,0.45)]',
  },
  {
    id: 'self',
    label: 'Ảnh tự chụp',
    uploadLabel: 'Hacom tự chụp',
    accent: 'bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]',
    active: 'bg-purple-600 text-white border-purple-500 shadow-[0_0_12px_rgba(147,51,234,0.45)]',
  },
  {
    id: 'customer',
    label: 'Ảnh khách hàng',
    uploadLabel: 'Khách hàng chụp',
    accent: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]',
    active: 'bg-emerald-600 text-white border-emerald-500 shadow-[0_0_12px_rgba(5,150,105,0.45)]',
  },
];

const FALLBACK_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Crect width='150' height='150' fill='%23111827'/%3E%3Cpath d='M55 55h40v35H55z' fill='none' stroke='%234B5563' stroke-width='2'/%3E%3Ccircle cx='75' cy='72' r='10' fill='none' stroke='%234B5563' stroke-width='2'/%3E%3Cpath d='M62 55l5-8h16l5 8' fill='none' stroke='%234B5563' stroke-width='2'/%3E%3Ctext x='75' y='105' text-anchor='middle' fill='%236B7280' font-size='10' font-family='monospace'%3ENo Image%3C/text%3E%3C/svg%3E";

function normalizeImages(images: ProductImage[]) {
  return images.map((image, index) => ({
    ...image,
    type: ALBUMS.some((album) => album.id === image.type) ? image.type : 'product',
    ordering: Number.isFinite(Number(image.ordering)) ? Number(image.ordering) : index,
    alt: image.alt || '',
    isMain: Boolean(image.isMain),
  }));
}

function ImageCard({
  image,
  onChange,
  onDelete,
  disabled,
}: {
  image: ProductImage;
  onChange: (patch: Partial<ProductImage>) => void;
  onDelete: () => void;
  disabled: boolean;
}) {
  const [imgSrc, setImgSrc] = useState(image.url || FALLBACK_IMAGE);
  const isCustomer = image.type === 'customer';

  return (
    <div className="glass-panel border-gray-800 rounded-md overflow-hidden flex flex-col group shadow-md hover:border-red-500/50 transition-colors">
      <div className="relative h-32 w-full bg-gray-950 p-2 flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imgSrc}
          alt={image.alt || image.fileName || 'Product image'}
          className="w-full h-full object-contain"
          onError={() => setImgSrc(FALLBACK_IMAGE)}
          loading="lazy"
        />
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          className="absolute top-2 right-2 p-1.5 bg-red-950/80 text-red-500 rounded hover:bg-red-600 hover:text-white transition-colors opacity-0 group-hover:opacity-100 backdrop-blur-sm disabled:opacity-40"
          title="Xóa ảnh"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-2 space-y-2 bg-gray-900/50 border-t border-gray-800">
        <div className="grid grid-cols-[44px_1fr] items-center gap-2">
          <label className="text-[10px] text-gray-500 uppercase">STT</label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={image.ordering}
            onChange={(event) => onChange({ ordering: Number(event.target.value) })}
            className="w-full bg-gray-950 border border-gray-700 rounded-sm px-1.5 py-1 text-xs text-gray-300 focus:outline-none focus:border-red-500/50"
          />
        </div>
        <div className="grid grid-cols-[44px_1fr] items-center gap-2">
          <label className="text-[10px] text-gray-500 uppercase">Alt</label>
          <input
            type="text"
            value={image.alt}
            onChange={(event) => onChange({ alt: event.target.value })}
            className="w-full bg-gray-950 border border-gray-700 rounded-sm px-1.5 py-1 text-[10px] font-mono text-gray-400 focus:outline-none focus:border-red-500/50"
          />
        </div>
        <select
          value={image.type}
          onChange={(event) => {
            const type = event.target.value as ProductImageType;
            onChange({ type, isMain: type === 'customer' ? false : image.isMain });
          }}
          className="w-full bg-gray-950 border border-gray-700 rounded-sm px-1.5 py-1.5 text-[11px] font-bold text-gray-300 focus:outline-none focus:border-red-500/50"
        >
          {ALBUMS.map((album) => (
            <option key={album.id} value={album.id}>
              {album.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onChange({ isMain: true })}
          disabled={disabled || isCustomer}
          className={`w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold uppercase rounded-sm transition-colors border disabled:cursor-not-allowed disabled:opacity-50 ${
            image.isMain && !isCustomer
              ? 'border-yellow-500/50 text-yellow-500 bg-yellow-500/10 shadow-[0_0_10px_rgba(234,179,8,0.2)]'
              : 'border-gray-700 text-gray-400 hover:border-blue-500/50 hover:text-blue-400'
          }`}
          title={isCustomer ? 'Ảnh khách hàng không thể đặt làm thumbnail' : 'Chọn làm ảnh thumbnail'}
        >
          <Star className={`w-3.5 h-3.5 ${image.isMain && !isCustomer ? 'fill-yellow-500' : ''}`} /> Ảnh thumbnail
        </button>
      </div>
    </div>
  );
}

export const TabImages = forwardRef<TabImagesHandle, TabImagesProps>(function TabImages(
  { productId, initialImages = [], onBusyChange, onDirtyChange },
  ref,
) {
  const [images, setImages] = useState<ProductImage[]>(() => normalizeImages(initialImages));
  const [selectedType, setSelectedType] = useState<ProductImageType>('product');
  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [pendingDeleteImage, setPendingDeleteImage] = useState<ProductImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queueRef = useRef<QueuedFile[]>([]);

  useEffect(() => {
    queueRef.current = queuedFiles;
  }, [queuedFiles]);

  useEffect(() => () => {
    queueRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
  }, []);

  useEffect(() => {
    onBusyChange?.(saving || uploading);
  }, [onBusyChange, saving, uploading]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const groupedImages = useMemo(
    () =>
      ALBUMS.map((album) => ({
        ...album,
        images: images.filter((image) => image.type === album.id).sort((a, b) => a.ordering - b.ordering || a.id - b.id),
      })),
    [images],
  );
  const selectedSize = queuedFiles.reduce((sum, item) => sum + item.file.size, 0);
  const selectedSizeMb = selectedSize / (1024 * 1024);
  const remainingMb = Math.max(0, 50 - selectedSizeMb);
  const hasInvalidFiles = queuedFiles.some((item) => Boolean(item.error));
  const exceedsLimit = selectedSize > MAX_UPLOAD_BYTES;
  const canUpload = Boolean(productId && queuedFiles.length > 0 && !hasInvalidFiles && !exceedsLimit && !uploading);
  const capacityPercent = Math.min(100, (selectedSize / MAX_UPLOAD_BYTES) * 100);

  const applyPayload = (payload: ImagePayload) => {
    setImages(normalizeImages(payload.items || []));
    setIsDirty(false);
  };

  const addFilesToQueue = (files: File[]) => {
    if (uploading || files.length === 0) return;
    setQueuedFiles((current) => {
      const existing = new Set(current.map((item) => fileKey(item.file)));
      const additions = files
        .filter((file) => !existing.has(fileKey(file)))
        .map((file) => ({
          id: fileKey(file),
          file,
          previewUrl: URL.createObjectURL(file),
          error: ALLOWED_IMAGE_TYPES.has(file.type) ? '' : 'Định dạng không được hỗ trợ',
        }));
      return [...current, ...additions];
    });
    setError('');
  };

  const removeQueuedFile = (id: string) => {
    if (uploading) return;
    setQueuedFiles((current) => {
      const removed = current.find((item) => item.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  };

  const clearQueue = () => {
    if (uploading) return;
    setQueuedFiles((current) => {
      current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return [];
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
    setUploadProgress(0);
  };

  const updateImage = (id: number, patch: Partial<ProductImage>) => {
    setIsDirty(true);
    setImages((current) =>
      current.map((image) => {
        if (image.id !== id) {
          return patch.isMain ? { ...image, isMain: false } : image;
        }
        return { ...image, ...patch };
      }),
    );
  };

  const saveImages = async () => {
    if (!isDirty) return;
    if (!productId) {
      throw new Error('Cần lưu sản phẩm trước khi cập nhật ảnh.');
    }
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch(`/api/admin/products/${productId}/images`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: images.map((image) => ({
            id: image.id,
            type: image.type,
            alt: image.alt,
            ordering: image.ordering,
            isMain: image.isMain,
          })),
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể lưu ảnh.');
      applyPayload(payload.data);
    } catch (saveError: any) {
      setError(saveError.message || 'Không thể lưu ảnh.');
      throw saveError;
    } finally {
      setSaving(false);
    }
  };

  useImperativeHandle(ref, () => ({
    isDirty: () => isDirty,
    saveChanges: saveImages,
  }));

  const uploadImages = async () => {
    if (!productId) {
      setError('Cần lưu sản phẩm trước khi upload ảnh.');
      return;
    }
    if (queuedFiles.length === 0) {
      setError('Vui lòng chọn ít nhất một ảnh.');
      return;
    }
    if (hasInvalidFiles || exceedsLimit) {
      setError(exceedsLimit ? 'Tổng dung lượng hàng chờ vượt quá 50MB.' : 'Hãy loại bỏ các file không hợp lệ trước khi tải lên.');
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    setMessage('');
    setError('');
    try {
      const formData = new FormData();
      formData.set('type', selectedType);
      queuedFiles.forEach((item) => formData.append('files', item.file));
      const payload = await new Promise<any>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open('POST', `/api/admin/products/${productId}/images/upload`);
        request.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) setUploadProgress(Math.round((event.loaded / event.total) * 100));
        });
        request.addEventListener('load', () => {
          let responsePayload: any = null;
          try { responsePayload = JSON.parse(request.responseText); } catch { /* handled below */ }
          if (request.status >= 200 && request.status < 300 && responsePayload?.success) resolve(responsePayload);
          else reject(new Error(responsePayload?.error?.message || 'Không thể tải ảnh lên.'));
        });
        request.addEventListener('error', () => reject(new Error('Mất kết nối khi tải ảnh lên.')));
        request.addEventListener('abort', () => reject(new Error('Đã hủy tải ảnh.')));
        request.send(formData);
      });
      applyPayload(payload.data);
      queuedFiles.forEach((item) => URL.revokeObjectURL(item.previewUrl));
      setQueuedFiles([]);
      setUploadProgress(100);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setMessage(payload.message || 'Tải ảnh thành công.');
    } catch (uploadError: any) {
      setError(uploadError.message || 'Không thể upload ảnh.');
    } finally {
      setUploading(false);
    }
  };

  const closeDeleteModal = () => {
    if (saving) return;
    setPendingDeleteImage(null);
    setError('');
  };

  const deleteImage = async () => {
    if (!productId || !pendingDeleteImage) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch(`/api/admin/products/${productId}/images/${pendingDeleteImage.id}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể xóa ảnh.');
      applyPayload(payload.data);
      setPendingDeleteImage(null);
      setMessage(payload.message || 'Đã xóa ảnh.');
    } catch (deleteError: any) {
      setError(deleteError.message || 'Không thể xóa ảnh.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-bold text-gray-200 uppercase tracking-widest flex items-center gap-2">
          <span className="w-1 h-4 bg-red-500 rounded-full inline-block shadow-[0_0_8px_rgba(239,68,68,0.8)]"></span>
          Ảnh sản phẩm ({images.length})
        </h3>
      </div>

      {message && <div className="px-3 py-2 border border-green-900 bg-green-950/30 text-green-300 text-xs font-bold">{message}</div>}
      {error && <div className="px-3 py-2 border border-red-900 bg-red-950/30 text-red-300 text-xs font-bold">{error}</div>}

      {images.length === 0 && (
        <div className="p-8 text-center text-gray-500 border border-dashed border-gray-800 rounded-lg bg-gray-950/30">
          <ImageOff className="w-10 h-10 mx-auto mb-2 text-gray-600" />
          <p className="font-mono text-sm">Chưa có ảnh nào cho sản phẩm này.</p>
        </div>
      )}

      <div className="space-y-8">
        {groupedImages
          .filter((album) => album.id === 'product' || album.images.length > 0)
          .map((album) => (
          <section key={album.id} className="space-y-3">
            <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
              <span className={`w-1 h-4 rounded-full inline-block ${album.accent}`}></span>
              <h4 className="text-xs font-bold text-gray-200 uppercase tracking-widest">
                {album.label} ({album.images.length})
              </h4>
            </div>
            {album.images.length === 0 ? (
              <div className="border border-dashed border-gray-800 rounded-md bg-gray-950/20 p-6 text-center text-xs text-gray-500 font-mono">
                Chưa có ảnh trong album này.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                {album.images.map((image) => (
                  <ImageCard
                    key={image.id}
                    image={image}
                    disabled={saving || uploading}
                    onChange={(patch) => updateImage(image.id, patch)}
                    onDelete={() => {
                      setPendingDeleteImage(image);
                      setError('');
                    }}
                  />
                ))}
              </div>
            )}
          </section>
          ))}
      </div>

      <section className="mt-8 border-t border-slate-800/80 pt-5" aria-busy={uploading}>
        <div className="mb-5 flex flex-col gap-2 px-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-blue-400">Upload console</p>
            <h3 className="mt-1 text-sm font-bold uppercase tracking-widest text-slate-100">Thêm ảnh cho sản phẩm</h3>
          </div>
          {queuedFiles.length > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-400 queue-file-enter">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,.8)]" />
              {queuedFiles.length} ảnh trong hàng chờ
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(event) => {
            addFilesToQueue(Array.from(event.target.files || []));
            event.target.value = '';
          }}
        />

        <div className="space-y-5">
          {queuedFiles.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/45 queue-file-enter">
              <div className="flex flex-col gap-3 border-b border-slate-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-200">Đang chờ upload</h4>
                    <span className="rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-300">{queuedFiles.length}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">Đích đến: {ALBUMS.find((album) => album.id === selectedType)?.label}</p>
                </div>
                <button type="button" onClick={clearQueue} disabled={uploading} className="inline-flex items-center gap-1.5 self-start text-[11px] font-bold text-slate-500 transition-colors hover:text-red-400 disabled:opacity-40 sm:self-auto">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Xóa tất cả
                </button>
              </div>

              <ul className="grid grid-cols-1 gap-3 p-3 lg:grid-cols-2 xl:grid-cols-3" aria-label="Ảnh đang chờ tải lên">
                {queuedFiles.map((item) => (
                  <li key={item.id} className={`relative flex min-w-0 gap-3 overflow-hidden rounded-md border bg-[#0d111a] p-2.5 queue-file-enter ${item.error ? 'border-red-900/70' : 'border-slate-800'}`}>
                    <span className={`absolute inset-y-0 left-0 w-1 ${item.error ? 'bg-red-500' : uploading ? 'bg-blue-400' : 'bg-emerald-400'}`} aria-hidden="true" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.previewUrl} alt="" className="h-16 w-16 shrink-0 rounded object-cover bg-slate-900" />
                    <div className="min-w-0 flex-1 py-0.5">
                      <p className="truncate text-xs font-semibold text-slate-200" title={item.file.name}>{item.file.name}</p>
                      <p className="mt-1 text-[10px] text-slate-500">{formatFileSize(item.file.size)} · {ALBUMS.find((album) => album.id === selectedType)?.label}</p>
                      <div className={`mt-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${item.error ? 'text-red-400' : uploading ? 'text-blue-300' : 'text-emerald-400'}`}>
                        {item.error ? <AlertCircle className="h-3 w-3" /> : uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                        {item.error || (uploading ? `Đang tải ${uploadProgress}%` : 'Đang chờ')}
                      </div>
                    </div>
                    <button type="button" onClick={() => removeQueuedFile(item.id)} disabled={uploading} aria-label={`Loại bỏ ${item.file.name}`} className="grid h-7 w-7 shrink-0 place-items-center rounded border border-slate-700 text-slate-500 transition-colors hover:border-red-500/60 hover:text-red-400 disabled:opacity-30">
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>

              <div className="border-t border-slate-800 px-4 py-3">
                <div className="mb-2 flex items-center justify-between text-[11px]">
                  <span className={exceedsLimit ? 'font-bold text-red-400' : 'text-slate-400'}>{formatFileSize(selectedSize)} / 50 MB</span>
                  <span className={exceedsLimit ? 'text-red-400' : remainingMb < 10 ? 'text-amber-400' : 'text-emerald-400'}>{exceedsLimit ? 'Đã vượt giới hạn' : `Còn ${remainingMb.toFixed(2)} MB`}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                  <div className={`h-full rounded-full transition-[width] duration-300 ${exceedsLimit ? 'bg-red-500' : remainingMb < 10 ? 'bg-amber-400' : 'bg-gradient-to-r from-blue-500 to-emerald-400'}`} style={{ width: `${capacityPercent}%` }} />
                </div>
                {uploading && <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-blue-400 transition-[width]" style={{ width: `${uploadProgress}%` }} /></div>}
              </div>
            </div>
          )}

          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">1. Chọn album đích</p>
            <div className="flex flex-wrap items-center gap-2">
              {ALBUMS.map((album) => (
                <button
                  key={album.id}
                  type="button"
                  onClick={() => setSelectedType(album.id)}
                  disabled={uploading}
                  className={`px-4 py-2 text-xs font-bold border rounded-sm uppercase tracking-wider transition-colors ${
                    selectedType === album.id ? album.active : 'text-gray-400 bg-gray-900 border-gray-800 hover:text-gray-200'
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {album.uploadLabel}
                </button>
              ))}
              {queuedFiles.length > 0 && (
                <button
                  type="button"
                  onClick={uploadImages}
                  disabled={!canUpload}
                  className="inline-flex min-h-9 items-center justify-center gap-2 rounded-sm border border-emerald-500/50 bg-emerald-500/10 px-5 text-xs font-bold uppercase tracking-wider text-emerald-300 transition-[background-color,border-color,box-shadow] hover:border-emerald-400 hover:bg-emerald-500/15 hover:shadow-[0_0_22px_rgba(52,211,153,.14)] disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900 disabled:text-slate-600 disabled:shadow-none queue-file-enter"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
                  {uploading ? `Đang tải ${uploadProgress}%` : `Tải lên ${queuedFiles.length} ảnh`}
                </button>
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">2. Chọn ảnh</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragEnter={(event) => { event.preventDefault(); if (!uploading) setIsDragging(true); }}
              onDragOver={(event) => { event.preventDefault(); }}
              onDragLeave={(event) => {
                event.preventDefault();
                if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsDragging(false);
              }}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                addFilesToQueue(Array.from(event.dataTransfer.files));
              }}
              disabled={uploading || !productId}
              className={`group flex min-h-36 w-full flex-col items-center justify-center rounded-lg border border-dashed px-5 py-6 text-center transition-[border-color,background-color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-50 ${
                isDragging
                  ? 'scale-[1.01] border-blue-400 bg-blue-500/10'
                  : 'border-slate-700 bg-slate-950/60 hover:border-blue-500/70 hover:bg-blue-950/15'
              }`}
              aria-describedby="upload-help"
            >
              <span className="mb-3 grid h-11 w-11 place-items-center rounded-xl border border-blue-500/30 bg-blue-500/10 text-blue-400 group-hover:border-blue-400/60">
                <ImagePlus className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-sm font-bold text-slate-200">Kéo thả ảnh vào đây hoặc nhấn để chọn</span>
              <span id="upload-help" className="mt-1.5 text-xs text-slate-500">JPG, PNG, WebP hoặc GIF · Có thể chọn nhiều lần · Tối đa 50MB</span>
            </button>
          </div>

          <p className="sr-only" aria-live="polite">
            {uploading ? `Đang tải lên ${queuedFiles.length} ảnh, tiến độ ${uploadProgress} phần trăm.` : `${queuedFiles.length} ảnh đang chờ tải lên.`}
          </p>
        </div>
      </section>

      <ConfirmDeleteModal
        open={!!pendingDeleteImage}
        title="Xóa ảnh sản phẩm?"
        description="Hành động này sẽ xóa ảnh khỏi sản phẩm và dọn metadata ảnh liên quan. Vui lòng xác nhận trước khi thực hiện."
        itemName={pendingDeleteImage?.fileName || pendingDeleteImage?.alt || pendingDeleteImage?.url}
        details={[
          { label: 'ID', value: pendingDeleteImage?.id },
          { label: 'Album', value: pendingDeleteImage?.type },
        ]}
        error=""
        loading={saving}
        onCancel={closeDeleteModal}
        onConfirm={deleteImage}
      />
    </div>
  );
});

