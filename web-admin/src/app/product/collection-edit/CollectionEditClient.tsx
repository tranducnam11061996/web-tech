'use client';

import { RichTextEditor } from '@/components/products/edit/RichTextEditor';
import { Save, X } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { CollectionParentCombobox } from './CollectionParentCombobox';
import { buildCollectionParentOptions, type CollectionOption } from './collection-parent-options';

type CollectionForm = {
  name: string;
  url: string;
  parentId: string;
  ordering: string;
  status: string;
  homePage: string;
  description: string;
  metaTitle: string;
  metaKeyword: string;
  metaDescription: string;
};

const emptyForm: CollectionForm = {
  name: '',
  url: '',
  parentId: '0',
  ordering: '0',
  status: '0',
  homePage: '0',
  description: '',
  metaTitle: '',
  metaKeyword: '',
  metaDescription: '',
};

function normalizeCollectionUrl(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
}

const controlClass =
  'w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/30 transition-all shadow-inner';

export default function CollectionEditClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [form, setForm] = useState<CollectionForm>(emptyForm);
  const [collections, setCollections] = useState<CollectionOption[]>([]);
  const [urlEdited, setUrlEdited] = useState(Boolean(id));
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [collectionsError, setCollectionsError] = useState('');

  const parentOptions = useMemo(
    () => buildCollectionParentOptions(collections, Number(id || 0)),
    [collections, id],
  );

  useEffect(() => {
    let alive = true;
    fetch('/api/admin/collections?mode=options')
      .then((response) => response.json().then((payload) => ({ response, payload })))
      .then(({ response, payload }) => {
        if (!alive) return;
        if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể tải bộ sưu tập cha');
        setCollections(payload.data.items || []);
      })
      .catch((loadError) => {
        if (alive) setCollectionsError(loadError.message || 'Không thể tải bộ sưu tập cha');
      })
      .finally(() => {
        if (alive) setCollectionsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    setLoading(true);
    fetch(`/api/admin/collections/${id}`)
      .then((response) => response.json().then((payload) => ({ response, payload })))
      .then(({ response, payload }) => {
        if (!alive) return;
        if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể tải bộ sưu tập');
        const row = payload.data;
        setForm({
          name: row.name || '',
          url: row.url || '',
          parentId: String(row.parentId ?? 0),
          ordering: String(row.ordering ?? 0),
          status: Number(row.status) === 1 ? '1' : '0',
          homePage: String(row.homePage) === '1' ? '1' : '0',
          description: row.description || '',
          metaTitle: row.metaTitle || '',
          metaKeyword: row.metaKeyword || '',
          metaDescription: row.metaDescription || '',
        });
      })
      .catch((loadError) => {
        if (alive) setError(loadError.message || 'Không thể tải bộ sưu tập');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id]);

  const update = (field: keyof CollectionForm) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const updateName = (event: React.ChangeEvent<HTMLInputElement>) => {
    const name = event.target.value;
    setForm((current) => ({
      ...current,
      name,
      url: !id && !urlEdited ? normalizeCollectionUrl(name) : current.url,
    }));
  };

  const updateUrl = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUrlEdited(true);
    setForm((current) => ({ ...current, url: event.target.value }));
  };

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      if (!form.name.trim()) throw new Error('Tên bộ sưu tập là bắt buộc');
      if (!form.url.trim()) throw new Error('Link bộ sưu tập là bắt buộc');
      const ordering = form.ordering.trim();
      if (ordering && !/^-?\d+$/.test(ordering)) {
        throw new Error('Thứ tự bộ sưu tập phải là số nguyên');
      }
      const response = await fetch(id ? `/api/admin/collections/${id}` : '/api/admin/collections', {
        method: id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          url: normalizeCollectionUrl(form.url),
          parentId: Number(form.parentId) || 0,
          ordering: ordering ? Number.parseInt(ordering, 10) : 0,
          status: form.status === '1' ? 1 : 0,
          homePage: form.homePage === '1' ? 1 : 0,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể lưu bộ sưu tập');
      router.push('/product/collection');
      router.refresh();
    } catch (saveError: any) {
      setError(saveError.message || 'Không thể lưu bộ sưu tập');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full h-full p-2 animate-in fade-in duration-300 overflow-y-auto custom-scrollbar relative">
      <div className="flex justify-between items-center mb-4 sticky top-0 bg-[#0a0a0f]/90 backdrop-blur-md z-20 py-2 border-b border-gray-800/50">
        <h1 className="text-xl font-bold text-gray-200 flex items-center gap-3">
          <span className="w-1.5 h-6 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span>
          {id ? 'Chỉnh sửa Bộ sưu tập' : 'Thêm Bộ sưu tập'}
        </h1>
        <div className="flex gap-3">
          <button onClick={() => router.push('/product/collection')} className="flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-700 hover:border-gray-500 text-gray-300 rounded-md transition-all">
            <X className="w-4 h-4" /> Đóng
          </button>
          <button onClick={save} disabled={saving || loading} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-all disabled:opacity-60">
            <Save className="w-4 h-4" /> {saving ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </div>

      {error && <div className="mb-4 rounded border border-red-900/70 bg-red-950/30 px-4 py-3 text-sm text-red-300">{error}</div>}

      {loading ? (
        <div className="glass-panel p-6 rounded-lg border border-gray-800/50 text-gray-400">Đang tải bộ sưu tập...</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 w-full h-full pb-20">
          <div className="glass-panel p-6 rounded-lg border border-gray-800/50 space-y-5">
            <h2 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-blue-500 rounded-full"></span> Thông tin cơ bản
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-300">Tên bộ sưu tập <span className="text-red-500">*</span></span>
                <input type="text" value={form.name} onChange={updateName} className={controlClass} />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-300">Link <span className="text-red-500">*</span></span>
                <input type="text" value={form.url} onChange={updateUrl} className={`${controlClass} font-mono`} />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CollectionParentCombobox
                collections={collections}
                options={parentOptions}
                value={form.parentId}
                onChange={(parentId) => setForm((current) => ({ ...current, parentId: String(parentId) }))}
                loading={collectionsLoading}
                error={collectionsError}
                controlClassName={controlClass}
              />
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-300">Thứ tự bộ sưu tập</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="-?[0-9]*"
                  value={form.ordering}
                  onChange={update('ordering')}
                  className={`${controlClass} tabular-nums`}
                />
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-300">Trạng thái Ẩn / Hiện</span>
                <select value={form.status} onChange={update('status')} className={controlClass}>
                  <option value="0">Ẩn</option>
                  <option value="1">Hiển thị</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-sm font-medium text-gray-300">Hiện thị tại Homepage</span>
                <select value={form.homePage} onChange={update('homePage')} className={controlClass}>
                  <option value="0">Không</option>
                  <option value="1">Có</option>
                </select>
              </label>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-lg border border-gray-800/50 space-y-5">
            <h2 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-green-500 rounded-full"></span> Nội dung
            </h2>
            <RichTextEditor
              title=""
              value={form.description}
              onChange={(value) => setForm((current) => ({ ...current, description: value }))}
              minHeight="400px"
              id="collection-content"
              imageUploadScope="collections"
              resizable
            />
          </div>

          <div className="glass-panel p-6 rounded-lg border border-gray-800/50 space-y-5">
            <h2 className="text-lg font-bold text-gray-200 mb-4 flex items-center gap-2">
              <span className="w-1 h-4 bg-yellow-500 rounded-full"></span> Dùng cho SEO
            </h2>
            <label className="block space-y-1 text-sm text-gray-300">
              <span>Tiêu đề Meta</span>
              <input value={form.metaTitle} onChange={update('metaTitle')} className={controlClass} />
            </label>
            <label className="block space-y-1 text-sm text-gray-300">
              <span>Từ khóa Meta</span>
              <textarea value={form.metaKeyword} onChange={update('metaKeyword')} className={`${controlClass} min-h-[80px]`} />
            </label>
            <label className="block space-y-1 text-sm text-gray-300">
              <span>Mô tả Meta</span>
              <textarea value={form.metaDescription} onChange={update('metaDescription')} className={`${controlClass} min-h-[100px]`} />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
