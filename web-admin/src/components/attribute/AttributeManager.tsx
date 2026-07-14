'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AttributeFilter } from './AttributeFilter';
import { AttributeListTable } from './AttributeListTable';
import { ConfirmDeleteModal } from '@/components/shared/ConfirmDeleteModal';
import type { AttributeListItem } from '@/lib/admin/attributeTypes';

type Props = {
  attributes: AttributeListItem[];
  pagination: { currentPage: number; totalPages: number; totalItems: number; pageSize: number };
  initialQuery: string;
};

export function AttributeManager({ attributes, pagination, initialQuery }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<AttributeListItem[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => setSelectedIds(new Set()), [attributes]);

  const updateQuery = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value); else next.delete(key);
    }
    router.push(`/product/attribute-list${next.size ? `?${next.toString()}` : ''}`);
  };

  const toggleOne = (id: number) => setSelectedIds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleAll = () => setSelectedIds((current) => current.size === attributes.length
    ? new Set()
    : new Set(attributes.map((attribute) => attribute.id)));

  const runAction = async (action: 'activate' | 'hide' | 'delete-permanent', ids: number[]) => {
    if (!ids.length) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/attributes', {
        method: action === 'delete-permanent' ? 'DELETE' : 'PATCH',
        headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ids }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) throw new Error(payload?.error?.message || 'Không thể cập nhật thuộc tính');
      setPendingDelete(null);
      setSelectedIds(new Set());
      router.refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Không thể cập nhật thuộc tính');
    } finally {
      setBusy(false);
    }
  };

  const selectedRows = attributes.filter((attribute) => selectedIds.has(attribute.id));
  const deleteRows = pendingDelete || [];
  const deleteSummary = deleteRows.reduce((summary, row) => ({
    values: summary.values + row.valueCount,
    categories: summary.categories + row.categoryCount,
    products: summary.products + row.productCount,
  }), { values: 0, categories: 0, products: 0 });

  return (
    <>
      <AttributeFilter
        initialQuery={initialQuery}
        selectedCount={selectedIds.size}
        busy={busy}
        onSearch={(q) => updateQuery({ q: q || null, page: null })}
        onDeleteSelected={() => setPendingDelete(selectedRows)}
        onBulkAction={(action) => runAction(action, Array.from(selectedIds))}
      />
      <div className="flex-1 min-h-0">
        <AttributeListTable
          attributes={attributes}
          pagination={pagination}
          selectedIds={selectedIds}
          busy={busy}
          onToggleOne={toggleOne}
          onToggleAll={toggleAll}
          onDelete={(attribute) => setPendingDelete([attribute])}
          onSort={(sort) => {
            const currentSort = searchParams.get('sort');
            const currentDirection = searchParams.get('direction') || 'desc';
            updateQuery({ sort, direction: currentSort === sort && currentDirection === 'asc' ? 'desc' : 'asc', page: null });
          }}
        />
      </div>
      <ConfirmDeleteModal
        open={deleteRows.length > 0}
        title={deleteRows.length > 1 ? `Xóa vĩnh viễn ${deleteRows.length} thuộc tính?` : 'Xóa vĩnh viễn thuộc tính?'}
        description="Hành động này sẽ xóa thuộc tính, các giá trị, liên kết danh mục và dữ liệu thuộc tính trên sản phẩm liên quan."
        itemName={deleteRows.length === 1 ? deleteRows[0].name : undefined}
        details={[
          { label: 'Số giá trị', value: deleteSummary.values },
          { label: 'Số danh mục', value: deleteSummary.categories },
          { label: 'Số sản phẩm', value: deleteSummary.products },
        ]}
        error={error}
        loading={busy}
        onCancel={() => { if (!busy) { setPendingDelete(null); setError(''); } }}
        onConfirm={() => runAction('delete-permanent', deleteRows.map((row) => row.id))}
      />
    </>
  );
}
