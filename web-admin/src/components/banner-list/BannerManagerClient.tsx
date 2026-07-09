'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { Edit, Eye, EyeOff, Image as ImageIcon, Loader2, Plus, RefreshCcw, Search, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { ConfirmDeleteModal } from '@/components/shared/ConfirmDeleteModal';

type BannerLocation = {
  id: number;
  key: string;
  templatePage: string;
  name: string;
  description: string;
  totalBanners: number;
  activeBanners: number;
};

type BannerItem = {
  id: number;
  name: string;
  imageUrl: string;
  mobileImageUrl: string;
  targetUrl: string;
  ordering: number;
  renderMode: 'image' | 'hybrid';
  status: number;
  templatePage: string;
  locationId: number;
  locationKey: string;
  locationName: string;
  display: { showInMobile: boolean; fromTime: number; toTime: number };
  text: { headline: string; subheading: string; ctaLabel: string };
  style: { backgroundColor: string; textColor: string };
  meta: { width: number; height: number; click: number };
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

function resolveImageUrl(value: string) {
  if (!value) return '';
  if (/^https?:\/\//i.test(value) || value.startsWith('data:')) return value;
  if (value.startsWith('/api/media/')) return `${API_URL}${value}`;
  if (value.startsWith('/media/')) return `https://hanoicomputercdn.com${value}`;
  return value;
}

function formatDate(seconds: number) {
  if (!seconds) return '';
  return new Date(seconds * 1000).toLocaleString('vi-VN');
}

export function BannerManagerClient() {
  const router = useRouter();
  const [locations, setLocations] = useState<BannerLocation[]>([]);
  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [selectedLocation, setSelectedLocation] = useState('');
  const [query, setQuery] = useState('');
  const [templatePage, setTemplatePage] = useState('');
  const [status, setStatus] = useState('');
  const [previewBanner, setPreviewBanner] = useState<BannerItem | null>(null);
  const [pendingDeleteBanner, setPendingDeleteBanner] = useState<BannerItem | null>(null);
  const [errorText, setErrorText] = useState('');
  const [isPending, startTransition] = useTransition();

  const selectedLocationInfo = useMemo(
    () => locations.find((item) => item.key === selectedLocation) || null,
    [locations, selectedLocation],
  );

  const loadLocations = () => {
    startTransition(async () => {
      const response = await fetch('/api/admin/banner-locations');
      const payload = await response.json();
      if (payload?.success) setLocations(payload.data.items || []);
    });
  };

  const loadBanners = () => {
    setErrorText('');
    startTransition(async () => {
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set('q', query.trim());
        if (templatePage) params.set('templatePage', templatePage);
        if (selectedLocation) params.set('locationKey', selectedLocation);
        if (status) params.set('status', status);
        params.set('limit', '100');
        const response = await fetch(`/api/admin/banners?${params.toString()}`);
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể tải banner');
        const items = payload.data.items || [];
        setBanners(items);
        setPreviewBanner((current) => current && items.some((item: BannerItem) => item.id === current.id) ? current : items[0] || null);
      } catch (error: any) {
        setErrorText(error.message || 'Không thể tải banner');
      }
    });
  };

  useEffect(() => {
    loadLocations();
  }, []);

  useEffect(() => {
    loadBanners();
  }, [selectedLocation, templatePage, status]);

  const deleteBanner = () => {
    const banner = pendingDeleteBanner;
    if (!banner) return;
    setErrorText('');
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/banners/${banner.id}?mode=hide`, { method: 'DELETE' });
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể ẩn banner');
        setPendingDeleteBanner(null);
        loadLocations();
        loadBanners();
      } catch (error: any) {
        setErrorText(error.message || 'Không thể ẩn banner');
      }
    });
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-3 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
      <aside className="min-h-0 rounded-lg border border-gray-800 bg-gray-950/80 p-3">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Vị trí banner</h2>
            <p className="text-xs text-gray-500">{locations.length} vị trí</p>
          </div>
          <Link href="/banner/locations" className="rounded-md border border-gray-700 px-2 py-1 text-xs text-gray-200 hover:border-gray-500">
            Quản lý
          </Link>
        </div>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTemplatePage(templatePage === 'homepage' ? '' : 'homepage')}
            className={clsx('rounded-md border px-2 py-2 text-xs', templatePage === 'homepage' ? 'border-blue-600 bg-blue-950/50 text-blue-200' : 'border-gray-800 text-gray-400')}
          >
            Homepage
          </button>
          <button
            type="button"
            onClick={() => setTemplatePage(templatePage === 'header' ? '' : 'header')}
            className={clsx('rounded-md border px-2 py-2 text-xs', templatePage === 'header' ? 'border-blue-600 bg-blue-950/50 text-blue-200' : 'border-gray-800 text-gray-400')}
          >
            Global
          </button>
        </div>
        <div className="max-h-[calc(100vh-220px)] overflow-y-auto pr-1 custom-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedLocation('')}
            className={clsx('mb-2 w-full rounded-md border px-3 py-2 text-left text-sm', !selectedLocation ? 'border-emerald-700 bg-emerald-950/30 text-white' : 'border-gray-800 bg-gray-900/40 text-gray-400')}
          >
            Tất cả vị trí
          </button>
          {locations
            .filter((location) => !templatePage || location.templatePage === templatePage)
            .map((location) => (
              <button
                key={location.id}
                type="button"
                onClick={() => setSelectedLocation(location.key)}
                className={clsx(
                  'mb-2 w-full rounded-md border px-3 py-2 text-left transition',
                  selectedLocation === location.key ? 'border-emerald-700 bg-emerald-950/30' : 'border-gray-800 bg-gray-900/40 hover:border-gray-700',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-gray-100">{location.name || location.key}</span>
                  <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-300">{location.activeBanners}/{location.totalBanners}</span>
                </div>
                <div className="mt-1 truncate text-xs text-gray-500">{location.templatePage} · {location.key}</div>
              </button>
            ))}
        </div>
      </aside>

      <main className="min-h-0 rounded-lg border border-gray-800 bg-gray-950/80 p-3">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-white">Quản lý banner</h1>
            <p className="mt-1 text-xs text-gray-500">{selectedLocationInfo ? selectedLocationInfo.name : 'Toàn bộ vị trí'} · {banners.length} banner đang xem</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') loadBanners();
                }}
                placeholder="Tìm banner"
                className="h-9 w-56 rounded-md border border-gray-700 bg-gray-900 pl-9 pr-3 text-sm text-gray-200 outline-none focus:border-blue-500/60"
              />
            </div>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-9 rounded-md border border-gray-700 bg-gray-900 px-3 text-sm text-gray-300 outline-none">
              <option value="">Tất cả trạng thái</option>
              <option value="active">Đang active</option>
              <option value="1">Hiển thị</option>
              <option value="0">Đang ẩn</option>
              <option value="scheduled">Theo lịch</option>
            </select>
            <button type="button" onClick={loadBanners} className="h-9 rounded-md border border-gray-700 px-3 text-sm text-gray-200 hover:border-gray-500">
              <RefreshCcw className="mr-2 inline h-4 w-4" />Tải lại
            </button>
            <Link href="/banner/edit" className="h-9 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500">
              <Plus className="mr-2 inline h-4 w-4" />Thêm
            </Link>
          </div>
        </div>

        {errorText ? <div className="mb-3 rounded-md border border-red-900/70 bg-red-950/50 px-3 py-2 text-sm text-red-200">{errorText}</div> : null}

        <div className="max-h-[calc(100vh-205px)] overflow-y-auto rounded-md border border-gray-800 custom-scrollbar">
          <table className="w-full min-w-[920px] text-left text-sm">
            <thead className="sticky top-0 z-10 bg-gray-950 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-3 py-3">Banner</th>
                <th className="px-3 py-3">Vị trí</th>
                <th className="px-3 py-3">Thứ tự</th>
                <th className="px-3 py-3">Lịch</th>
                <th className="px-3 py-3">Trạng thái</th>
                <th className="px-3 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/70">
              {banners.map((banner) => (
                <tr key={banner.id} className={clsx('cursor-pointer transition hover:bg-gray-900/70', previewBanner?.id === banner.id && 'bg-blue-950/20')} onClick={() => setPreviewBanner(banner)}>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-14 w-24 overflow-hidden rounded-md border border-gray-800 bg-gray-900">
                        {banner.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={resolveImageUrl(banner.imageUrl)} alt={banner.name} className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon className="m-auto mt-4 h-5 w-5 text-gray-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-gray-100">{banner.name || `Banner #${banner.id}`}</div>
                        <div className="mt-1 truncate text-xs text-gray-500">ID {banner.id} · {banner.renderMode}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-400">
                    <div className="font-semibold text-gray-200">{banner.locationName || banner.locationKey}</div>
                    <div>{banner.templatePage} · {banner.locationKey}</div>
                  </td>
                  <td className="px-3 py-3 font-mono text-blue-300">{banner.ordering}</td>
                  <td className="px-3 py-3 text-xs text-gray-400">
                    <div>{formatDate(banner.display.fromTime) || 'Không giới hạn'}</div>
                    <div>{formatDate(banner.display.toTime) || 'Không giới hạn'}</div>
                  </td>
                  <td className="px-3 py-3">
                    <span className={clsx('inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold', banner.status === 1 ? 'bg-emerald-950 text-emerald-300' : 'bg-red-950 text-red-300')}>
                      {banner.status === 1 ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                      {banner.status === 1 ? 'Hiển thị' : 'Đang ẩn'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Link href={`/banner/edit?id=${banner.id}`} className="mr-2 inline-flex rounded-md border border-green-900 px-2 py-2 text-green-300 hover:bg-green-950/60" onClick={(event) => event.stopPropagation()}>
                      <Edit className="h-4 w-4" />
                    </Link>
                    <button type="button" onClick={(event) => { event.stopPropagation(); setPendingDeleteBanner(banner); }} className="inline-flex rounded-md border border-red-900 px-2 py-2 text-red-300 hover:bg-red-950/60">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {banners.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-12 text-center text-sm text-gray-500">
                    Chưa có banner phù hợp bộ lọc.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </main>

      <aside className="min-h-0 rounded-lg border border-gray-800 bg-gray-950/80 p-3">
        <h2 className="mb-3 text-sm font-bold text-white">Preview</h2>
        {previewBanner ? (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-lg border border-gray-800 bg-[#111]">
              <div className="relative aspect-[24/5] bg-gray-900">
                {previewBanner.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={resolveImageUrl(previewBanner.imageUrl)} alt={previewBanner.name} className="h-full w-full object-cover" />
                ) : null}
                {previewBanner.renderMode === 'hybrid' ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 px-6 text-center">
                    <h3 className="text-lg font-bold text-white">{previewBanner.text.headline || previewBanner.name}</h3>
                    <p className="mt-1 text-xs text-gray-200">{previewBanner.text.subheading}</p>
                    {previewBanner.text.ctaLabel ? <span className="mt-3 rounded-full bg-white px-4 py-1 text-xs font-bold text-black">{previewBanner.text.ctaLabel}</span> : null}
                  </div>
                ) : null}
              </div>
            </div>
            <div className="rounded-md border border-gray-800 bg-gray-900/40 p-3 text-xs text-gray-400">
              <div className="font-semibold text-gray-200">{previewBanner.name || `Banner #${previewBanner.id}`}</div>
              <div className="mt-1 break-all">{previewBanner.targetUrl || 'Chưa có URL đích'}</div>
              <div className="mt-2">Desktop: {previewBanner.meta.width || '?'} x {previewBanner.meta.height || '?'}</div>
              <div>Mobile: {previewBanner.mobileImageUrl ? 'Có ảnh riêng' : 'Dùng ảnh desktop'}</div>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-gray-800 p-8 text-center text-sm text-gray-500">Chọn một banner để xem trước.</div>
        )}
      </aside>

      <ConfirmDeleteModal
        open={!!pendingDeleteBanner}
        title="Ẩn banner?"
        description="Banner sẽ không còn xuất hiện trên public API nhưng vẫn giữ dữ liệu để có thể bật lại."
        itemName={pendingDeleteBanner?.name}
        details={[{ label: 'ID', value: pendingDeleteBanner?.id }, { label: 'Vị trí', value: pendingDeleteBanner?.locationKey }]}
        error={errorText}
        loading={isPending}
        onCancel={() => setPendingDeleteBanner(null)}
        onConfirm={deleteBanner}
      />
    </div>
  );
}
