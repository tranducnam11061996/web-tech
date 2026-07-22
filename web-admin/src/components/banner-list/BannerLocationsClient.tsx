'use client';

import { useEffect, useState, useTransition } from 'react';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { ConfirmDeleteModal } from '@/components/shared/ConfirmDeleteModal';

type BannerLocation = {
  id: number;
  key: string;
  templatePage: string;
  name: string;
  description: string;
  totalBanners: number;
  activeBanners: number;
  isDefault: boolean;
};

function emptyForm() {
  return { id: 0, templatePage: 'homepage', key: '', name: '', description: '' };
}

export function BannerLocationsClient() {
  const [locations, setLocations] = useState<BannerLocation[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [errorText, setErrorText] = useState('');
  const [statusText, setStatusText] = useState('');
  const [pendingDeleteLocation, setPendingDeleteLocation] = useState<BannerLocation | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPending, startTransition] = useTransition();
  const editingDefault = locations.some((location) => location.id === form.id && location.isDefault);

  const loadLocations = () => {
    startTransition(async () => {
      const response = await fetch('/api/admin/banner-locations');
      const payload = await response.json();
      if (payload?.success) setLocations(payload.data.items || []);
    });
  };

  useEffect(() => {
    loadLocations();
  }, []);

  const saveLocation = () => {
    setErrorText('');
    setStatusText('');
    startTransition(async () => {
      try {
        const response = await fetch(form.id ? `/api/admin/banner-locations/${form.id}` : '/api/admin/banner-locations', {
          method: form.id ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể lưu vị trí');
        setStatusText('Đã lưu vị trí banner');
        setForm(emptyForm());
        loadLocations();
      } catch (error: any) {
        setErrorText(error.message || 'Không thể lưu vị trí');
      }
    });
  };

  const deleteLocation = async () => {
    const location = pendingDeleteLocation;
    if (!location || location.isDefault || isDeleting) return;
    setDeleteError('');
    setErrorText('');
    setStatusText('');
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/banner-locations/${location.id}`, { method: 'DELETE' });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể xóa vị trí banner');
      const reassignedCount = Number(payload.data?.reassignedBannerCount || 0);
      setPendingDeleteLocation(null);
      setForm((current) => current.id === location.id ? emptyForm() : current);
      setStatusText(`Đã xóa vị trí banner. ${reassignedCount} banner đã được chuyển sang “Chưa có vị trí” và tự động ẩn.`);
      loadLocations();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Không thể xóa vị trí banner');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-3 p-2 text-gray-100 xl:grid-cols-[minmax(0,1fr)_380px]">
      <main className="min-h-0 rounded-lg border border-gray-800 bg-gray-950/80">
        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
          <div>
            <h1 className="text-lg font-bold text-white">Vị trí banner</h1>
            <p className="mt-1 text-xs text-gray-500">{locations.length} vị trí đang có trong hệ thống</p>
          </div>
          <button type="button" onClick={() => setForm(emptyForm())} className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-500">
            <Plus className="mr-2 inline h-4 w-4" />Thêm vị trí
          </button>
        </div>
        <div className="max-h-[calc(100vh-150px)] overflow-y-auto custom-scrollbar">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="sticky top-0 bg-gray-950 text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3">Tên vị trí</th>
                <th className="px-4 py-3">Mã</th>
                <th className="px-4 py-3">Template</th>
                <th className="px-4 py-3">Banner</th>
                <th className="px-4 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/70">
              {locations.map((location) => (
                <tr key={location.id} className="hover:bg-gray-900/70">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 font-semibold text-gray-100">
                      <span>{location.name || location.key}</span>
                      {location.isDefault ? <span className="rounded-full border border-amber-800/70 bg-amber-950/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">Mặc định</span> : null}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">{location.description}</div>
                  </td>
                  <td className="px-4 py-3 font-mono text-blue-300">{location.key}</td>
                  <td className="px-4 py-3 text-gray-300">{location.templatePage}</td>
                  <td className="px-4 py-3 text-gray-300">{location.activeBanners}/{location.totalBanners}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setForm({ id: location.id, templatePage: location.templatePage, key: location.key, name: location.name, description: location.description })}
                        className="rounded-md border border-gray-700 px-3 py-2 text-sm text-gray-200 hover:border-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                      >
                        Sửa
                      </button>
                      {!location.isDefault ? (
                        <button
                          type="button"
                          onClick={() => { setDeleteError(''); setPendingDeleteLocation(location); }}
                          className="inline-flex items-center gap-1.5 rounded-md border border-red-900 px-3 py-2 text-sm text-red-300 hover:bg-red-950/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
                          aria-label={`Xóa vị trí ${location.name || location.key}`}
                        >
                          <Trash2 aria-hidden="true" className="h-4 w-4" />
                          Xóa
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      <aside className="rounded-lg border border-gray-800 bg-gray-950/80 p-4">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-400">{form.id ? 'Sửa vị trí' : 'Thêm vị trí'}</h2>
        {errorText ? <div role="alert" className="mb-3 rounded-md border border-red-900/70 bg-red-950/50 px-3 py-2 text-sm text-red-200">{errorText}</div> : null}
        {statusText ? <div role="status" aria-live="polite" className="mb-3 rounded-md border border-emerald-900/70 bg-emerald-950/50 px-3 py-2 text-sm text-emerald-200">{statusText}</div> : null}
        <div className="space-y-3">
          <label className="block text-sm text-gray-300">
            <span className="mb-1 block font-semibold">Template page</span>
            <input value={form.templatePage} onChange={(event) => setForm((current) => ({ ...current, templatePage: event.target.value }))} disabled={editingDefault} className="field-input disabled:cursor-not-allowed disabled:opacity-60" />
          </label>
          <label className="block text-sm text-gray-300">
            <span className="mb-1 block font-semibold">Mã vị trí</span>
            <input value={form.key} onChange={(event) => setForm((current) => ({ ...current, key: event.target.value }))} disabled={editingDefault} className="field-input disabled:cursor-not-allowed disabled:opacity-60" />
          </label>
          <label className="block text-sm text-gray-300">
            <span className="mb-1 block font-semibold">Tên vị trí</span>
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} className="field-input" />
          </label>
          <label className="block text-sm text-gray-300">
            <span className="mb-1 block font-semibold">Mô tả</span>
            <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="field-input min-h-28 py-2" />
          </label>
          <button type="button" onClick={saveLocation} disabled={isPending} className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 disabled:opacity-60">
            {isPending ? <Loader2 className="mr-2 inline h-4 w-4 animate-spin" /> : <Save className="mr-2 inline h-4 w-4" />}
            Lưu vị trí
          </button>
        </div>
      </aside>

      <ConfirmDeleteModal
        open={!!pendingDeleteLocation}
        title="Xóa vĩnh viễn vị trí banner?"
        description="Vị trí sẽ bị xóa hoàn toàn khỏi database. Các banner thuộc vị trí này được giữ nguyên, chuyển sang “Chưa có vị trí” và tự động ẩn."
        itemName={pendingDeleteLocation?.name || pendingDeleteLocation?.key}
        details={[
          { label: 'Mã', value: pendingDeleteLocation?.key },
          { label: 'Tổng banner', value: pendingDeleteLocation?.totalBanners },
          { label: 'Đang hiển thị', value: pendingDeleteLocation?.activeBanners },
        ]}
        error={deleteError}
        loading={isDeleting}
        confirmLabel="Xác nhận xóa"
        onCancel={() => { if (!isDeleting) { setDeleteError(''); setPendingDeleteLocation(null); } }}
        onConfirm={deleteLocation}
      />
    </div>
  );
}
