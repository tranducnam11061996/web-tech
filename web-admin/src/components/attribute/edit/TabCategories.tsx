'use client';

import { useMemo, useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import clsx from 'clsx';
import type { AttributeCategoryNode, AttributeFormData } from '@/lib/admin/attributeTypes';

type Props = {
  form: AttributeFormData;
  categories: AttributeCategoryNode[];
  categoryNameById: Map<number, string>;
  onChange: React.Dispatch<React.SetStateAction<AttributeFormData>>;
};

export function TabCategories({ form, categories, categoryNameById, onChange }: Props) {
  const childrenByParent = useMemo(() => {
    const map = new Map<number, AttributeCategoryNode[]>();
    for (const category of categories) {
      const children = map.get(category.parentId) || [];
      children.push(category);
      map.set(category.parentId, children);
    }
    return map;
  }, [categories]);
  const parentIds = useMemo(() => new Set(categories.filter((category) => (childrenByParent.get(category.id) || []).length > 0).map((category) => category.id)), [categories, childrenByParent]);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const selectedIds = new Set(form.categoryIds);
  const roots = childrenByParent.get(0) || categories.filter((category) => !categories.some((candidate) => candidate.id === category.parentId));

  const toggleCategory = (id: number) => onChange((current) => ({
    ...current,
    categoryIds: current.categoryIds.includes(id) ? current.categoryIds.filter((categoryId) => categoryId !== id) : [...current.categoryIds, id],
  }));
  const toggleExpanded = (id: number) => setExpandedIds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const renderCategory = (category: AttributeCategoryNode, depth = 0): React.ReactNode => {
    const children = childrenByParent.get(category.id) || [];
    const expanded = expandedIds.has(category.id);
    const selected = selectedIds.has(category.id);
    return (
      <div key={category.id}>
        <div style={{ paddingLeft: `${depth * 20 + 8}px` }} className="flex items-center gap-2 py-1 hover:bg-gray-800/40 rounded px-2 transition-colors">
          <button type="button" disabled={!children.length} onClick={() => toggleExpanded(category.id)} className="w-4 h-4 flex items-center justify-center text-gray-500 hover:text-white transition-colors disabled:opacity-30">
            {children.length ? (expanded ? <Minus className="w-3 h-3" /> : <Plus className="w-3 h-3" />) : null}
          </button>
          <input type="checkbox" disabled={form.scope === 1} checked={form.scope === 1 || selected} onChange={() => toggleCategory(category.id)} className="w-4 h-4 rounded-sm bg-gray-900 border-gray-700 checked:bg-blue-500 focus:ring-blue-500/30 cursor-pointer disabled:opacity-50" />
          <span onClick={() => form.scope === 0 && toggleCategory(category.id)} className={clsx('text-sm cursor-pointer hover:underline', selected || form.scope === 1 ? 'text-blue-400' : 'text-gray-300 hover:text-blue-400')}>{category.name}</span>
        </div>
        {expanded ? children.map((child) => renderCategory(child, depth + 1)) : null}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h3 className="font-bold text-gray-200 mb-2">Danh mục được chọn cho thuộc tính:</h3>
        <div className="whitespace-pre-line text-blue-400 font-medium bg-blue-950/20 p-3 rounded-lg border border-blue-900/30">
          {form.scope === 1
            ? '- Tất cả danh mục (Global)'
            : form.categoryIds.length
              ? form.categoryIds.map((id) => `- ${categoryNameById.get(id) || `#${id}`}`).join('\n')
              : '- Chưa chọn danh mục'}
        </div>
      </div>
      <div>
        <h3 className="font-bold text-gray-200 mb-3">Hãy chọn danh mục cho thuộc tính</h3>
        <button type="button" onClick={() => setExpandedIds((current) => current.size === parentIds.size ? new Set() : new Set(parentIds))} className="px-4 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-md text-sm hover:bg-blue-500/20 hover:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all mb-4">
          Hiển thị tất cả danh mục con
        </button>
        <div className="space-y-1 mt-4 p-4 border border-gray-800/80 rounded-lg bg-gray-900/30">
          {roots.map((category) => renderCategory(category))}
        </div>
      </div>
    </div>
  );
}
