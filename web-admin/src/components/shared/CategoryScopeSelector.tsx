'use client';

import { CheckSquare, MinusSquare, PlusSquare, Search, Square, X } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

export type CategoryScopeItem = {
  id: number;
  name: string;
  parentId: number;
  status: number;
};

type VisibleNode = CategoryScopeItem & { children: VisibleNode[] };

function normalizeCategorySearch(value: string) {
  return value.toLocaleLowerCase('vi-VN').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').trim();
}

function filterTreeForSearch(nodes: VisibleNode[], query: string): VisibleNode[] {
  return nodes.flatMap((node) => {
    const children = filterTreeForSearch(node.children, query);
    const matches = normalizeCategorySearch(`${node.name} ${node.id}`).includes(query);
    return matches || children.length > 0 ? [{ ...node, children }] : [];
  });
}

function collectExpandableNodeIds(nodes: VisibleNode[], result = new Set<number>()) {
  for (const node of nodes) {
    if (node.children.length > 0) result.add(node.id);
    collectExpandableNodeIds(node.children, result);
  }
  return result;
}

function descendantsOf(id: number, childrenByParent: Map<number, number[]>) {
  const result: number[] = [];
  const visited = new Set<number>();
  const queue = [...(childrenByParent.get(id) || [])];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    result.push(current);
    queue.push(...(childrenByParent.get(current) || []));
  }
  return result;
}

export function CategoryScopeSelector({
  categories,
  selectedIds,
  onChange,
  selectedTitle = 'Danh mục đã chọn',
  treeTitle = 'Chọn danh mục áp dụng',
  emptyText = 'Chưa chọn danh mục.',
  helpText = 'Chọn danh mục cha sẽ tự động áp dụng cho toàn bộ danh mục con.',
  searchable = false,
}: {
  categories: CategoryScopeItem[];
  selectedIds: number[];
  onChange: (ids: number[]) => void;
  selectedTitle?: string;
  treeTitle?: string;
  emptyText?: string;
  helpText?: string;
  searchable?: boolean;
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
      if (node.parentId === 0 || !parent) nextRoots.push(node);
      else if (parent.id !== node.id) parent.children.push(node);
    }
    const sortTree = (nodes: VisibleNode[]) => {
      nodes.sort((left, right) => left.name.localeCompare(right.name, 'vi'));
      nodes.forEach((node) => sortTree(node.children));
    };
    sortTree(nextRoots);
    const nextExpandableIds = new Set<number>();
    const walk = (nodes: VisibleNode[], visited = new Set<number>()) => nodes.forEach((node) => {
      if (visited.has(node.id)) return;
      visited.add(node.id);
      if (node.children.length > 0) nextExpandableIds.add(node.id);
      walk(node.children, visited);
    });
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
  const [searchQuery, setSearchQuery] = useState('');
  const normalizedSearchQuery = normalizeCategorySearch(searchQuery);
  const visibleRoots = useMemo(
    () => normalizedSearchQuery ? filterTreeForSearch(roots, normalizedSearchQuery) : roots,
    [normalizedSearchQuery, roots],
  );
  useEffect(() => {
    setOpenIds((current) => new Set([...current, ...selectedAncestorIds]));
  }, [selectedAncestorIds]);
  useEffect(() => {
    if (!normalizedSearchQuery) return;
    const matchingAncestors = collectExpandableNodeIds(visibleRoots);
    setOpenIds((current) => new Set([...current, ...matchingAncestors]));
  }, [normalizedSearchQuery, visibleRoots]);

  const isAllExpanded = expandableIds.size > 0 && Array.from(expandableIds).every((id) => openIds.has(id));
  const toggleOpen = (id: number) => setOpenIds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleAll = () => setOpenIds(isAllExpanded ? new Set() : new Set(expandableIds));
  const toggleCheck = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else {
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

  const renderTree = (nodes: VisibleNode[], visited = new Set<number>()): ReactNode => nodes.map((node) => {
    if (visited.has(node.id)) return null;
    visited.add(node.id);
    const hasChildren = node.children.length > 0;
    const isOpen = openIds.has(node.id);
    const isChecked = selectedIds.includes(node.id);
    return <div key={node.id} className="flex flex-col">
      <div className="flex min-h-10 items-center gap-2 rounded-md px-1 transition-colors hover:bg-gray-800/40">
        {hasChildren ? <button type="button" onClick={() => toggleOpen(node.id)} aria-label={`${isOpen ? 'Thu gọn' : 'Mở rộng'} ${node.name}`} aria-expanded={isOpen} className="grid h-10 w-10 place-items-center text-gray-500 hover:text-gray-200 focus-visible:outline-2 focus-visible:outline-blue-400">{isOpen ? <MinusSquare aria-hidden="true" className="h-4 w-4" /> : <PlusSquare aria-hidden="true" className="h-4 w-4" />}</button> : <span className="h-10 w-10" />}
        <button type="button" onClick={() => toggleCheck(node.id)} aria-pressed={isChecked} className="flex min-h-10 flex-1 items-center gap-2 text-left text-sm text-gray-300 focus-visible:outline-2 focus-visible:outline-blue-400">
          {isChecked ? <CheckSquare aria-hidden="true" className="h-4 w-4 text-blue-400" /> : <Square aria-hidden="true" className="h-4 w-4 text-gray-600" />}
          <span className={isChecked ? 'font-semibold text-white' : ''}>{node.name}</span>
        </button>
      </div>
      {isOpen && hasChildren ? <div className="ml-10 border-l border-gray-800 pl-2">{renderTree(node.children, new Set(visited))}</div> : null}
    </div>;
  });

  return <div className="grid gap-4 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
    <section aria-labelledby="selected-category-title" className="rounded-xl border border-gray-800 bg-gray-950/60 p-4">
      <h3 id="selected-category-title" className="text-sm font-semibold text-white">{selectedTitle}</h3>
      <p className="mt-1 text-xs leading-5 text-gray-500">{helpText}</p>
      <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
        {selectedItems.length > 0 ? selectedItems.map((item) => <div key={item.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${item.missing ? 'border-amber-700/40 bg-amber-950/20 text-amber-200' : 'border-blue-800/40 bg-blue-950/20 text-blue-100'}`}><span className="min-w-0 flex-1 truncate">{item.name}</span><button type="button" onClick={() => toggleCheck(item.id)} aria-label={`Bỏ ${item.name}`} className="grid h-10 w-10 flex-none place-items-center rounded-md text-gray-400 hover:bg-gray-800 hover:text-white focus-visible:outline-2 focus-visible:outline-blue-400"><X aria-hidden="true" className="h-4 w-4" /></button></div>) : <p className="rounded-lg border border-dashed border-gray-800 px-3 py-6 text-center text-sm text-gray-500">{emptyText}</p>}
      </div>
    </section>
    <section aria-labelledby="category-tree-title" className="rounded-xl border border-gray-800 bg-gray-950/60 p-4">
      <div className="flex items-center justify-between gap-3"><h3 id="category-tree-title" className="text-sm font-semibold text-white">{treeTitle}</h3><button type="button" onClick={toggleAll} disabled={expandableIds.size === 0} className="min-h-10 rounded-lg border border-gray-700 px-3 text-xs font-medium text-gray-300 hover:border-blue-600 hover:text-blue-300 focus-visible:outline-2 focus-visible:outline-blue-400 disabled:opacity-50">{isAllExpanded ? 'Thu gọn' : 'Mở tất cả'}</button></div>
      {searchable ? <div className="relative mt-3"><label htmlFor="promotion-category-search" className="sr-only">Tìm danh mục áp dụng</label><Search aria-hidden="true" className="absolute left-3 top-3.5 h-4 w-4 text-gray-500" /><input id="promotion-category-search" type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Tìm theo tên hoặc ID danh mục" className="min-h-11 w-full rounded-lg border border-gray-700 bg-gray-950 pl-10 pr-11 text-sm text-white outline-none focus:border-blue-500" />{searchQuery ? <button type="button" onClick={() => setSearchQuery('')} aria-label="Xóa từ khóa tìm danh mục" className="absolute right-1 top-0.5 grid h-10 w-10 place-items-center rounded-md text-gray-500 hover:bg-gray-800 hover:text-white focus-visible:outline-2 focus-visible:outline-blue-400"><X aria-hidden="true" className="h-4 w-4" /></button> : null}</div> : null}
      <div className="mt-3 max-h-80 overflow-y-auto pr-1">{visibleRoots.length > 0 ? renderTree(visibleRoots) : <p className="py-8 text-center text-sm text-gray-500">{normalizedSearchQuery ? 'Không tìm thấy danh mục phù hợp.' : 'Không có danh mục đang hoạt động.'}</p>}</div>
    </section>
  </div>;
}
