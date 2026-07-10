'use client';

import { CheckSquare, MinusSquare, PlusSquare, Square } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

export type VoucherCategory = {
  id: number;
  name: string;
  parentId: number;
  status: number;
};

type VisibleNode = VoucherCategory & { children: VisibleNode[] };

function descendantsOf(id: number, childrenByParent: Map<number, number[]>) {
  const result: number[] = [];
  const queue = [...(childrenByParent.get(id) || [])];
  while (queue.length > 0) {
    const current = queue.shift()!;
    result.push(current);
    queue.push(...(childrenByParent.get(current) || []));
  }
  return result;
}

export function VoucherCategorySelector({
  categories,
  selectedIds,
  onChange,
}: {
  categories: VoucherCategory[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}) {
  const normalizedCategories = useMemo(
    () => categories.map((category) => ({ ...category, id: Number(category.id), parentId: Number(category.parentId || 0), status: Number(category.status) })).filter((category) => category.id > 0),
    [categories],
  );
  const categoryById = useMemo(() => new Map(normalizedCategories.map((category) => [category.id, category])), [normalizedCategories]);
  const childrenByParent = useMemo(() => {
    const map = new Map<number, number[]>();
    for (const category of normalizedCategories) {
      const children = map.get(category.parentId) || [];
      children.push(category.id);
      map.set(category.parentId, children);
    }
    return map;
  }, [normalizedCategories]);

  const { roots, expandableIds, selectedAncestorIds } = useMemo(() => {
    const activeCategories = normalizedCategories.filter((category) => category.status === 1);
    const activeNodes = new Map(activeCategories.map((category) => [category.id, { ...category, children: [] as VisibleNode[] }]));
    const nextRoots: VisibleNode[] = [];
    for (const node of activeNodes.values()) {
      const parent = activeNodes.get(node.parentId);
      if (node.parentId === 0) nextRoots.push(node);
      else if (parent && parent.id !== node.id) parent.children.push(node);
    }
    const sortTree = (nodes: VisibleNode[]) => {
      nodes.sort((left, right) => left.name.localeCompare(right.name, 'vi'));
      nodes.forEach((node) => sortTree(node.children));
    };
    sortTree(nextRoots);
    const nextExpandableIds = new Set<number>();
    const walk = (nodes: VisibleNode[]) => nodes.forEach((node) => { if (node.children.length > 0) nextExpandableIds.add(node.id); walk(node.children); });
    walk(nextRoots);

    const ancestors = new Set<number>();
    for (const selectedId of selectedIds) {
      let parentId = categoryById.get(selectedId)?.parentId || 0;
      const visited = new Set<number>();
      while (parentId > 0 && !visited.has(parentId)) {
        visited.add(parentId);
        if (activeNodes.has(parentId)) ancestors.add(parentId);
        parentId = categoryById.get(parentId)?.parentId || 0;
      }
    }
    return { roots: nextRoots, expandableIds: nextExpandableIds, selectedAncestorIds: ancestors };
  }, [categoryById, normalizedCategories, selectedIds]);

  const [openIds, setOpenIds] = useState<Set<number>>(() => new Set());
  useEffect(() => {
    setOpenIds((current) => new Set([...current, ...selectedAncestorIds]));
  }, [selectedAncestorIds]);

  const isAllExpanded = expandableIds.size > 0 && Array.from(expandableIds).every((id) => openIds.has(id));
  const toggleOpen = (id: number) => setOpenIds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const toggleAll = () => setOpenIds(isAllExpanded ? new Set() : new Set(expandableIds));

  const toggleCheck = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      const ancestors: number[] = [];
      let parentId = categoryById.get(id)?.parentId || 0;
      const visited = new Set<number>();
      while (parentId > 0 && !visited.has(parentId)) {
        visited.add(parentId);
        ancestors.push(parentId);
        parentId = categoryById.get(parentId)?.parentId || 0;
      }
      for (const relatedId of [...ancestors, ...descendantsOf(id, childrenByParent)]) next.delete(relatedId);
      next.add(id);
    }
    onChange(Array.from(next));
  };

  const selectedItems = selectedIds.map((id) => {
    const category = categoryById.get(id);
    return category ? { id, name: category.name, missing: category.status !== 1 } : { id, name: `Danh mục #${id} — không còn tồn tại`, missing: true };
  });

  const renderTree = (nodes: VisibleNode[]): ReactNode => nodes.map((node) => {
    const hasChildren = node.children.length > 0;
    const isOpen = openIds.has(node.id);
    const isChecked = selectedIds.includes(node.id);
    return <div key={node.id} className="flex flex-col">
      <div className="flex items-center gap-2 rounded px-1 py-1 transition-colors hover:bg-gray-800/30">
        {hasChildren ? <button type="button" onClick={() => toggleOpen(node.id)} aria-label={`${isOpen ? 'Thu gọn' : 'Mở rộng'} ${node.name}`} className="text-gray-500 hover:text-gray-300">{isOpen ? <MinusSquare className="h-4 w-4" /> : <PlusSquare className="h-4 w-4" />}</button> : <span className="h-4 w-4" />}
        <button type="button" onClick={() => toggleCheck(node.id)} aria-label={`${isChecked ? 'Bỏ chọn' : 'Chọn'} ${node.name}`} className="text-gray-400 transition-colors hover:text-blue-400">{isChecked ? <CheckSquare className="h-4 w-4 text-blue-500 drop-shadow-[0_0_5px_rgba(59,130,246,0.8)]" /> : <Square className="h-4 w-4" />}</button>
        <button type="button" onClick={() => toggleCheck(node.id)} className={isChecked ? 'text-left font-medium text-gray-200' : 'text-left text-gray-400 hover:text-gray-200'}>{node.name}</button>
      </div>
      {isOpen && hasChildren ? <div className="my-1 ml-6 space-y-1 border-l border-gray-800 pl-2">{renderTree(node.children)}</div> : null}
    </div>;
  });

  return <div className="grid grid-cols-1 gap-8 animate-in fade-in duration-300 lg:grid-cols-2">
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-gray-200"><span className="inline-block h-4 w-1 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />Voucher đang áp dụng cho các danh mục sau:</h3>
      <div className="glass-panel custom-scrollbar max-h-[500px] min-h-40 space-y-2 overflow-y-auto rounded-sm border-gray-800 p-4 text-sm">
        {selectedItems.length > 0 ? selectedItems.map((item) => <button key={item.id} type="button" onClick={() => toggleCheck(item.id)} className={`group flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left font-medium transition-colors ${item.missing ? 'border border-amber-900/50 bg-amber-950/20 text-amber-400 hover:text-amber-300' : 'text-blue-400 hover:bg-blue-950/20 hover:text-blue-300'}`}><span>- {item.name}</span><span className="ml-auto text-xs text-gray-600 opacity-0 transition-opacity group-hover:text-red-400 group-hover:opacity-100">(Bỏ)</span></button>) : <div className="italic text-gray-500">Voucher hiện áp dụng cho toàn bộ sản phẩm.</div>}
      </div>
    </div>

    <div className="space-y-4">
      <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-gray-200"><span className="inline-block h-4 w-1 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />Hãy chọn danh mục áp dụng cho voucher</h3>
      <button type="button" onClick={toggleAll} disabled={expandableIds.size === 0} className="mb-2 rounded-sm border border-blue-900 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-blue-400 transition-colors hover:bg-blue-900/30 disabled:cursor-not-allowed disabled:opacity-50">{isAllExpanded ? 'Thu gọn tất cả danh mục con' : 'Hiển thị tất cả danh mục con'}</button>
      <div className="glass-panel custom-scrollbar h-[500px] overflow-y-auto rounded-sm border-gray-800 p-4 text-sm"><div className="space-y-1">{roots.length > 0 ? renderTree(roots) : <p className="italic text-gray-500">Không có danh mục đang hoạt động.</p>}</div></div>
    </div>
  </div>;
}
