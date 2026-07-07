'use client';

import { useMemo, useRef, useState } from 'react';
import { FileImage, ImageOff, Loader2, Save, Star, Trash2, Upload } from 'lucide-react';

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
            type="number"
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
          title={isCustomer ? 'Ảnh khách hàng không đặt làm ảnh chính sản phẩm' : 'Chọn ảnh chính'}
        >
          <Star className={`w-3.5 h-3.5 ${image.isMain && !isCustomer ? 'fill-yellow-500' : ''}`} /> Ảnh chính
        </button>
      </div>
    </div>
  );
}

export function TabImages({ productId, initialImages = [] }: { productId?: number; initialImages?: ProductImage[] }) {
  const [images, setImages] = useState<ProductImage[]>(() => normalizeImages(initialImages));
  const [selectedType, setSelectedType] = useState<ProductImageType>('product');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const groupedImages = useMemo(
    () =>
      ALBUMS.map((album) => ({
        ...album,
        images: images.filter((image) => image.type === album.id).sort((a, b) => a.ordering - b.ordering || a.id - b.id),
      })),
    [images],
  );
  const selectedSize = selectedFiles.reduce((sum, file) => sum + file.size, 0);
  const selectedSizeMb = selectedSize / (1024 * 1024);
  const remainingMb = Math.max(0, 50 - selectedSizeMb);

  const applyPayload = (payload: ImagePayload) => {
    setImages(normalizeImages(payload.items || []));
  };

  const updateImage = (id: number, patch: Partial<ProductImage>) => {
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
    if (!productId) {
      setError('Cần lưu sản phẩm trước khi cập nhật ảnh.');
      return;
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
      setMessage(payload.message || 'Đã lưu thay đổi ảnh.');
    } catch (saveError: any) {
      setError(saveError.message || 'Không thể lưu ảnh.');
    } finally {
      setSaving(false);
    }
  };

  const uploadImages = async () => {
    if (!productId) {
      setError('Cần lưu sản phẩm trước khi upload ảnh.');
      return;
    }
    if (selectedFiles.length === 0) {
      setError('Vui lòng chọn ít nhất một ảnh.');
      return;
    }
    setUploading(true);
    setMessage('');
    setError('');
    try {
      const formData = new FormData();
      formData.set('type', selectedType);
      selectedFiles.forEach((file) => formData.append('files', file));
      const response = await fetch(`/api/admin/products/${productId}/images/upload`, {
        method: 'POST',
        body: formData,
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể upload ảnh.');
      applyPayload(payload.data);
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setMessage(payload.message || 'Tải ảnh thành công.');
    } catch (uploadError: any) {
      setError(uploadError.message || 'Không thể upload ảnh.');
    } finally {
      setUploading(false);
    }
  };

  const deleteImage = async (imageId: number) => {
    if (!productId || !window.confirm('Xóa ảnh này khỏi sản phẩm?')) return;
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch(`/api/admin/products/${productId}/images/${imageId}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể xóa ảnh.');
      applyPayload(payload.data);
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
        <button
          type="button"
          onClick={saveImages}
          disabled={saving || uploading || !productId}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold text-green-400 bg-green-950/20 border border-green-900 rounded-sm hover:border-green-500 hover:text-green-300 hover:shadow-[0_0_15px_rgba(34,197,94,0.35)] transition-all uppercase tracking-wider disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Lưu thay đổi ảnh
        </button>
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
        {groupedImages.map((album) => (
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
                    onDelete={() => deleteImage(image.id)}
                  />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      <div className="mt-8 border border-gray-800 border-dashed rounded-lg p-6 bg-gray-950/30">
        <h3 className="text-sm font-bold text-gray-200 uppercase tracking-widest mb-4">Thêm ảnh cho sản phẩm</h3>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {ALBUMS.map((album) => (
            <button
              key={album.id}
              type="button"
              onClick={() => setSelectedType(album.id)}
              className={`px-4 py-2 text-xs font-bold border rounded-sm uppercase tracking-wider transition-colors ${
                selectedType === album.id ? album.active : 'text-gray-400 bg-gray-900 border-gray-800 hover:text-gray-200'
              }`}
            >
              {album.uploadLabel}
            </button>
          ))}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(event) => setSelectedFiles(Array.from(event.target.files || []))}
        />

        <div className="flex flex-wrap items-center gap-4 mb-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !productId}
            className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-gray-300 bg-gray-900 border border-gray-700 rounded-sm hover:border-red-500/50 hover:text-red-400 transition-colors uppercase tracking-wider group disabled:opacity-60"
          >
            <Upload className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" /> Chọn tệp...
          </button>
          <span className="text-gray-500 italic text-sm">hoặc</span>
          <button
            type="button"
            disabled
            className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-blue-400/60 bg-blue-950/20 border border-blue-900/60 rounded-sm uppercase tracking-wider cursor-not-allowed"
            title="Kho ảnh có sẵn sẽ được nối ở bước sau"
          >
            <FileImage className="w-4 h-4" /> Kho ảnh có sẵn
          </button>
          <button
            type="button"
            onClick={uploadImages}
            disabled={uploading || selectedFiles.length === 0 || !productId}
            className="flex items-center gap-2 px-6 py-3 text-sm font-bold text-green-400 bg-green-950/20 border border-green-900 rounded-sm hover:border-green-500 hover:text-green-300 transition-colors uppercase tracking-wider disabled:opacity-60"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Tải lên
          </button>
        </div>

        <div className="text-xs text-gray-500 space-y-1 font-mono">
          <div>
            Bạn đã chọn <strong className="text-blue-400">{selectedSizeMb.toFixed(2)}MB / 50MB</strong>. Dung lượng còn lại{' '}
            <strong className="text-green-400">{remainingMb.toFixed(2)}MB</strong>.
          </div>
          {selectedFiles.length > 0 && (
            <div className="text-gray-400">
              {selectedFiles.length} tệp đang chờ tải lên vào album{' '}
              <strong className="text-gray-200">{ALBUMS.find((album) => album.id === selectedType)?.label}</strong>.
            </div>
          )}
          <div className="text-yellow-500/80">Lưu ý: Tổng dung lượng ảnh tải lên tối đa là 50MB.</div>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Ảnh upload sẽ được lưu theo thư mục ngày trong media và tự tránh trùng tên file.</li>
            <li>Chỉ dùng file ảnh đuôi .jpg, .png, .webp hoặc .gif.</li>
            <li>Ảnh sản phẩm và ảnh tự chụp sẽ nằm trong tab ảnh sản phẩm ngoài website; ảnh khách hàng nằm ở tab riêng.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

