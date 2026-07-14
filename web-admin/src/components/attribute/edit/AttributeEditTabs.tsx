'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TabBasic } from './TabBasic';
import { TabCategories } from './TabCategories';
import clsx from 'clsx';
import { Save, X } from 'lucide-react';
import Link from 'next/link';
import { ConfirmDeleteModal } from '@/components/shared/ConfirmDeleteModal';
import type { AttributeCategoryNode, AttributeFormData, AttributeValueForm } from '@/lib/admin/attributeTypes';

type Props = { initialData: AttributeFormData; categories: AttributeCategoryNode[] };

export function AttributeEditTabs({ initialData, categories }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'basic' | 'categories'>('basic');
  const [form, setForm] = useState<AttributeFormData>(initialData);
  const [pendingValue, setPendingValue] = useState<AttributeValueForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const isEdit = Boolean(form.id);
  const categoryNameById = useMemo(() => new Map(categories.map((category) => [category.id, category.name])), [categories]);

  const save = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch(isEdit ? `/api/admin/attributes/${form.id}` : '/api/admin/attributes', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error?.message || 'Không thể lưu thuộc tính');
      setForm(payload.data);
      setSuccess(isEdit ? 'Đã cập nhật thuộc tính.' : 'Đã tạo thuộc tính.');
      if (!isEdit && payload.data?.id) router.replace(`/product/attribute/edit?id=${payload.data.id}`);
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể lưu thuộc tính');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-end px-4 pt-2 border-b border-gray-800/80 bg-gray-950/50 backdrop-blur-md sticky top-0 z-20">
        <button type="button" onClick={() => setActiveTab('basic')} className={clsx('px-6 py-3 text-sm font-bold tracking-wide uppercase transition-all border-b-2 relative', activeTab === 'basic' ? 'text-blue-400 border-blue-500 bg-blue-500/10' : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-gray-800/50')}>
          Cơ bản
          {activeTab === 'basic' && <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-400/50 to-transparent"></div>}
        </button>
        <button type="button" onClick={() => setActiveTab('categories')} className={clsx('px-6 py-3 text-sm font-bold tracking-wide uppercase transition-all border-b-2 relative', activeTab === 'categories' ? 'text-blue-400 border-blue-500 bg-blue-500/10' : 'text-gray-500 border-transparent hover:text-gray-300 hover:bg-gray-800/50')}>
          Danh mục
          {activeTab === 'categories' && <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-400/50 to-transparent"></div>}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
        {(error || success) && <div role="status" className={`mx-auto mb-4 max-w-5xl rounded border px-4 py-3 text-sm ${error ? 'border-red-500/40 bg-red-500/10 text-red-300' : 'border-green-500/40 bg-green-500/10 text-green-300'}`}>{error || success}</div>}
        <div className={clsx('transition-opacity duration-300', activeTab === 'basic' ? 'block opacity-100' : 'hidden opacity-0')}>
          <TabBasic form={form} onChange={setForm} onRequestDeleteValue={setPendingValue} />
        </div>
        <div className={clsx('transition-opacity duration-300', activeTab === 'categories' ? 'block opacity-100' : 'hidden opacity-0')}>
          <TabCategories form={form} categories={categories} categoryNameById={categoryNameById} onChange={setForm} />
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 p-4 border-t border-gray-800/80 bg-gray-950/80 backdrop-blur-md sticky bottom-0 z-20">
        <button type="button" onClick={save} disabled={saving} className="flex items-center gap-2 px-6 py-2 bg-green-500/10 text-green-400 border border-green-500/50 rounded hover:bg-green-500/20 hover:shadow-[0_0_15px_rgba(34,197,94,0.2)] transition-all font-bold uppercase tracking-wider text-sm disabled:opacity-50">
          <Save className="w-4 h-4" />
          {saving ? 'Đang lưu...' : 'Lưu'}
        </button>
        <Link href="/product/attribute-list">
          <button type="button" className="flex items-center gap-2 px-6 py-2 bg-red-500/10 text-red-400 border border-red-500/50 rounded hover:bg-red-500/20 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)] transition-all font-bold uppercase tracking-wider text-sm">
            <X className="w-4 h-4" /> Đóng
          </button>
        </Link>
      </div>

      <ConfirmDeleteModal
        open={!!pendingValue}
        title="Xóa giá trị thuộc tính?"
        description="Giá trị này và các liên kết sản phẩm đang sử dụng nó sẽ bị xóa khi bạn bấm Lưu thuộc tính."
        itemName={pendingValue?.value}
        details={[{ label: 'Số sản phẩm', value: pendingValue?.productCount || 0 }]}
        onCancel={() => setPendingValue(null)}
        onConfirm={() => {
          if (pendingValue) setForm((current) => ({ ...current, values: current.values.filter((value) => value !== pendingValue) }));
          setPendingValue(null);
        }}
      />
    </div>
  );
}
