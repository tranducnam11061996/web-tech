'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Save, X } from 'lucide-react';
import { RichTextEditor } from '@/components/products/edit/RichTextEditor';

function ArticleEditInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState<Record<string, any>>({
    title: '',
    slug: '',
    summary: '',
    content: '',
    thumbnail: '',
    categoryIds: [],
    catId: 0,
    status: 1,
    ordering: 0,
    metaTitle: '',
    metaKeyword: '',
    metaDescription: '',
  });
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/article-categories')
      .then((response) => response.json())
      .then((payload) => {
        if (payload.success) setCategories(payload.data.items || []);
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
        if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Khong the tai bai viet');
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
          categoryIds: categoryIds.length ? categoryIds : [Number(row.catId || 0)].filter(Boolean),
          catId: Number(row.catId || categoryIds[0] || 0),
          status: Number(row.status ?? 1),
          ordering: Number(row.ordering || 0),
          metaTitle: row.meta_title || '',
          metaKeyword: row.meta_keyword || '',
          metaDescription: row.meta_description || '',
        });
      })
      .catch((loadError) => setError(loadError.message || 'Khong the tai bai viet'))
      .finally(() => setLoading(false));
    return () => {
      alive = false;
    };
  }, [id]);

  const update = (field: string) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const toggleCategory = (categoryId: number) => {
    setForm((current) => {
      const set = new Set<number>(current.categoryIds || []);
      if (set.has(categoryId)) set.delete(categoryId);
      else set.add(categoryId);
      const categoryIds = Array.from(set);
      return { ...current, categoryIds, catId: current.catId || categoryIds[0] || 0 };
    });
  };

  const save = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const response = await fetch(id ? `/api/admin/articles/${id}` : '/api/admin/articles', {
        method: id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Khong the luu bai viet');
      setMessage(payload.message || 'Da luu bai viet');
      if (!id && payload.data?.id) router.replace(`/news/edit?id=${payload.data.id}`);
      router.refresh();
    } catch (saveError: any) {
      setError(saveError.message || 'Khong the luu bai viet');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="w-full h-full p-6 text-gray-400">Dang tai bai viet...</div>;

  return (
    <div className="w-full h-full p-2 animate-in fade-in duration-300 overflow-y-auto custom-scrollbar relative">
      <div className="flex justify-between items-center sticky top-0 bg-[#0a0a0f]/95 backdrop-blur-md z-30 py-4 border-b border-gray-800/80 mb-6">
        <h1 className="text-2xl font-bold text-gray-200">{id ? 'Cap nhat bai viet' : 'Them bai viet'}</h1>
        <div className="flex gap-3">
          <button onClick={save} disabled={saving} className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition-all font-bold disabled:opacity-60">
            <Save className="w-4 h-4" /> {saving ? 'Dang luu...' : 'Luu'}
          </button>
          <button onClick={() => router.push('/news/news-list')} className="flex items-center gap-2 px-6 py-2 bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20 rounded-md transition-all font-medium">
            <X className="w-4 h-4" /> Dong
          </button>
        </div>
      </div>

      {message && <div className="mb-3 px-3 py-2 border border-green-900 bg-green-950/30 text-green-300 text-xs font-bold">{message}</div>}
      {error && <div className="mb-3 px-3 py-2 border border-red-900 bg-red-950/30 text-red-300 text-xs font-bold">{error}</div>}

      <div className="w-full h-full pb-24 space-y-6">
        <div className="glass-panel p-6 rounded-xl border border-gray-800/80">
          <h2 className="text-sm font-bold text-white mb-4">Danh muc</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-3 gap-x-6 text-sm text-gray-300">
            {categories.map((category) => (
              <label key={category.id} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={(form.categoryIds || []).includes(Number(category.id))} onChange={() => toggleCategory(Number(category.id))} className="rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500" />
                <span>{category.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="glass-panel p-6 rounded-xl border border-gray-800/80 space-y-5">
          <input value={form.title} onChange={update('title')} placeholder="Tieu de" className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <input value={form.slug} onChange={update('slug')} placeholder="Slug" className="bg-gray-900/80 border border-gray-700 rounded-md px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500 font-mono" />
            <input value={form.thumbnail} onChange={update('thumbnail')} placeholder="Thumbnail file" className="bg-gray-900/80 border border-gray-700 rounded-md px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500" />
            <select value={form.status} onChange={update('status')} className="bg-gray-900/80 border border-gray-700 rounded-md px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500">
              <option value={1}>Hien</option>
              <option value={0}>An</option>
            </select>
            <input type="number" value={form.ordering} onChange={update('ordering')} placeholder="Thu tu" className="bg-gray-900/80 border border-gray-700 rounded-md px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500" />
          </div>
          <textarea rows={3} value={form.summary} onChange={update('summary')} placeholder="Tom tat" className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-4 py-3 text-gray-100 focus:outline-none focus:border-blue-500 resize-none custom-scrollbar" />
        </div>

        <div className="glass-panel p-6 rounded-xl border border-gray-800/80">
          <RichTextEditor title="Noi dung" value={form.content} onChange={(value) => setForm((current) => ({ ...current, content: value }))} minHeight="500px" />
        </div>

        <div className="glass-panel p-6 rounded-xl border border-gray-800/80 space-y-4">
          <h2 className="text-sm font-bold text-white">SEO</h2>
          <input value={form.metaTitle} onChange={update('metaTitle')} placeholder="Meta title" className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500" />
          <input value={form.metaKeyword} onChange={update('metaKeyword')} placeholder="Meta keyword" className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-4 py-2 text-gray-100 focus:outline-none focus:border-blue-500" />
          <textarea rows={3} value={form.metaDescription} onChange={update('metaDescription')} placeholder="Meta description" className="w-full bg-gray-900/80 border border-gray-700 rounded-md px-4 py-3 text-gray-100 focus:outline-none focus:border-blue-500 resize-none custom-scrollbar" />
        </div>
      </div>
    </div>
  );
}

export default function ArticleEditPage() {
  return (
    <Suspense fallback={<div className="w-full h-full p-6 text-gray-400">Dang tai...</div>}>
      <ArticleEditInner />
    </Suspense>
  );
}
