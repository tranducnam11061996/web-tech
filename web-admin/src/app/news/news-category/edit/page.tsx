'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Save, X } from 'lucide-react';
import { RichTextEditor } from '@/components/products/edit/RichTextEditor';

function ArticleCategoryEditInner() {
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
    fetch(`/api/admin/article-categories/${id}`)
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
      const response = await fetch(id ? `/api/admin/article-categories/${id}` : '/api/admin/article-categories', {
        method: id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Khong the luu danh muc');
      setMessage(payload.message || 'Da luu danh muc');
      if (!id && payload.data?.id) router.replace(`/news/news-category/edit?id=${payload.data.id}`);
      router.refresh();
    } catch (saveError: any) {
      setError(saveError.message || 'Khong the luu danh muc');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="w-full h-full p-6 text-gray-400">Dang tai danh muc...</div>;

  return (
    <div className="w-full h-full p-2 animate-in fade-in duration-300 overflow-y-auto custom-scrollbar relative">
      <div className="flex justify-between items-center mb-4 sticky top-0 bg-[#0a0a0f]/90 backdrop-blur-md z-20 py-2 border-b border-gray-800/50">
        <h1 className="text-xl font-bold text-gray-200">{id ? 'Chinh sua danh muc bai viet' : 'Them danh muc bai viet'}</h1>
        <div className="flex gap-3">
          <button onClick={() => router.push('/news/news-category')} className="flex items-center gap-2 px-4 py-2 bg-gray-900 border border-gray-700 hover:border-gray-500 text-gray-300 rounded-md transition-all">
            <X className="w-4 h-4" /> Dong
          </button>
          <button onClick={save} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-all disabled:opacity-60">
            <Save className="w-4 h-4" /> {saving ? 'Dang luu...' : 'Luu'}
          </button>
        </div>
      </div>

      {message && <div className="mb-3 px-3 py-2 border border-green-900 bg-green-950/30 text-green-300 text-xs font-bold">{message}</div>}
      {error && <div className="mb-3 px-3 py-2 border border-red-900 bg-red-950/30 text-red-300 text-xs font-bold">{error}</div>}

      <div className="grid grid-cols-1 gap-6 w-full h-full pb-20 mt-6">
        <div className="glass-panel p-8 rounded-lg border border-gray-800/50 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <input value={form.name} onChange={update('name')} placeholder="Ten danh muc" className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500/50" />
            <select value={form.status} onChange={update('status')} className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500/50">
              <option value={1}>Dang hoat dong</option>
              <option value={0}>Khong hoat dong</option>
            </select>
          </div>

          <input value={form.slug} onChange={update('slug')} placeholder="Slug" className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500/50 font-mono" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <input type="number" value={form.parentId} onChange={update('parentId')} placeholder="Parent ID" className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500/50" />
            <input type="number" value={form.ordering} onChange={update('ordering')} placeholder="Thu tu" className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500/50" />
          </div>

          <RichTextEditor id="article-category-description" title="Mo ta chi tiet" value={form.description} onChange={(value) => setForm((current) => ({ ...current, description: value }))} minHeight="250px" />

          <div className="pt-6 border-t border-gray-800/50 space-y-5">
            <h3 className="text-md font-bold text-gray-200">SEO</h3>
            <input value={form.metaTitle} onChange={update('metaTitle')} placeholder="Meta title" className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500/50" />
            <input value={form.metaKeyword} onChange={update('metaKeyword')} placeholder="Meta keyword" className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500/50" />
            <input value={form.metaDescription} onChange={update('metaDescription')} placeholder="Meta description" className="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-200 focus:outline-none focus:border-blue-500/50" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ArticleCategoryEditPage() {
  return (
    <Suspense fallback={<div className="w-full h-full p-6 text-gray-400">Dang tai...</div>}>
      <ArticleCategoryEditInner />
    </Suspense>
  );
}
