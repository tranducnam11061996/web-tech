'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Save, X } from 'lucide-react';

function CategoryEditInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [form, setForm] = useState({
    name: '',
    slug: '',
    parentId: 0,
    status: 1,
    ordering: 0,
    description: '',
    metaTitle: '',
    metaKeyword: '',
    metaDescription: '',
  });
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    let alive = true;
    fetch(`/api/admin/product-categories/${id}`)
      .then((response) => response.json().then((payload) => ({ response, payload })))
      .then(({ response, payload }) => {
        if (!alive) return;
        if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Khong the tai danh muc');
        const row = payload.data;
        setForm({
          name: row.name || '',
          slug: row.url || '',
          parentId: Number(row.parentId || 0),
          status: Number(row.status ?? 1),
          ordering: Number(row.ordering || 0),
          description: row.description || '',
          metaTitle: row.meta_title || '',
          metaKeyword: row.meta_keyword || '',
          metaDescription: row.meta_description || '',
        });
      })
      .catch((loadError) => setError(loadError.message || 'Khong the tai danh muc'))
      .finally(() => setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  const update = (field: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const save = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch(id ? `/api/admin/product-categories/${id}` : '/api/admin/product-categories', {
        method: id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Khong the luu danh muc');
      setMessage(payload.message || 'Da luu danh muc');
      if (!id && payload.data?.id) router.replace(`/product/categories-edit?id=${payload.data.id}`);
      router.refresh();
    } catch (saveError: any) {
      setError(saveError.message || 'Khong the luu danh muc');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="w-full h-full p-6 text-gray-400">Dang tai danh muc...</div>;
  }

  return (
    <div className="w-full h-full p-2 animate-in fade-in duration-300 overflow-y-auto custom-scrollbar relative">
      <div className="flex justify-between items-center mb-4 sticky top-0 bg-[#0a0a0f]/90 backdrop-blur-md z-20 py-2 border-b border-gray-800/50">
        <h1 className="text-xl font-bold text-gray-200">{id ? 'Chinh sua danh muc san pham' : 'Them danh muc san pham'}</h1>
        <div className="flex gap-3">
          <button onClick={() => router.push('/product/categories')} className="flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-700 hover:border-gray-500 text-gray-300 rounded-md transition-all">
            <X className="w-4 h-4" /> Dong
          </button>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-all disabled:opacity-60">
            <Save className="w-4 h-4" /> {saving ? 'Dang luu...' : 'Luu'}
          </button>
        </div>
      </div>

      {message && <div className="mb-3 px-3 py-2 border border-green-900 bg-green-950/30 text-green-300 text-xs font-bold">{message}</div>}
      {error && <div className="mb-3 px-3 py-2 border border-red-900 bg-red-950/30 text-red-300 text-xs font-bold">{error}</div>}

      <div className="grid grid-cols-1 gap-6 w-full pb-20">
        <div className="glass-panel p-6 rounded-lg border border-gray-800/50 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <label className="space-y-1 text-sm text-gray-300">Ten danh muc
              <input value={form.name} onChange={update('name')} className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-red-500/50" />
            </label>
            <label className="space-y-1 text-sm text-gray-300">Slug
              <input value={form.slug} onChange={update('slug')} className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-red-500/50 font-mono" />
            </label>
            <label className="space-y-1 text-sm text-gray-300">Parent ID
              <input type="number" value={form.parentId} onChange={update('parentId')} className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-red-500/50" />
            </label>
            <label className="space-y-1 text-sm text-gray-300">Trang thai
              <select value={form.status} onChange={update('status')} className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-red-500/50">
                <option value={1}>Hien</option>
                <option value={0}>An</option>
              </select>
            </label>
            <label className="space-y-1 text-sm text-gray-300">Thu tu
              <input type="number" value={form.ordering} onChange={update('ordering')} className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-red-500/50" />
            </label>
          </div>
          <label className="space-y-1 text-sm text-gray-300 block">Mo ta
            <textarea rows={5} value={form.description} onChange={update('description')} className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-red-500/50" />
          </label>
        </div>

        <div className="glass-panel p-6 rounded-lg border border-gray-800/50 space-y-5">
          <h2 className="text-md font-bold text-gray-300">SEO</h2>
          <input value={form.metaTitle} onChange={update('metaTitle')} placeholder="Meta title" className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-red-500/50" />
          <input value={form.metaKeyword} onChange={update('metaKeyword')} placeholder="Meta keyword" className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-red-500/50" />
          <textarea rows={4} value={form.metaDescription} onChange={update('metaDescription')} placeholder="Meta description" className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-red-500/50" />
        </div>
      </div>
    </div>
  );
}

export default function CategoryEditPage() {
  return (
    <Suspense fallback={<div className="w-full h-full p-6 text-gray-400">Dang tai...</div>}>
      <CategoryEditInner />
    </Suspense>
  );
}
