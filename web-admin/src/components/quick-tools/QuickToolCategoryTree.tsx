'use client';

import clsx from 'clsx';
import { Check, ChevronDown, ChevronRight } from 'lucide-react';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import type { QuickToolCategorySummary } from '@/lib/admin/quickProductAttributes';
import {
  buildQuickToolCategoryTree,
  filterQuickToolCategoryTree,
  getQuickCategoryAncestorIds,
  normalizeQuickCategorySearch,
  type QuickToolCategoryTreeNode,
} from '@/lib/quickProductCategoryTree';

export function QuickToolCategoryTree({
  categories,
  selectedId,
  searchQuery,
  onSelect,
}: {
  categories: QuickToolCategorySummary[];
  selectedId: number;
  searchQuery: string;
  onSelect: (categoryId: number) => void;
}) {
  const tree = useMemo(() => buildQuickToolCategoryTree(categories), [categories]);
  const filteredTree = useMemo(
    () => filterQuickToolCategoryTree(tree.roots, searchQuery),
    [searchQuery, tree.roots],
  );
  const selectedAncestors = useMemo(
    () => getQuickCategoryAncestorIds(selectedId, tree.categoryById),
    [selectedId, tree.categoryById],
  );
  const selectedPathKey = `${selectedId}:${selectedAncestors.join(',')}`;
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const lastAutoExpandedPathRef = useRef('');

  useEffect(() => {
    if (lastAutoExpandedPathRef.current === selectedPathKey) return;
    lastAutoExpandedPathRef.current = selectedPathKey;
    if (!selectedId || selectedAncestors.length === 0) return;
    setExpandedIds((current) => new Set([...current, ...selectedAncestors]));
  }, [selectedAncestors, selectedId, selectedPathKey]);

  const hasSearch = Boolean(normalizeQuickCategorySearch(searchQuery));
  const effectiveExpandedIds = useMemo(
    () => hasSearch ? new Set([...expandedIds, ...filteredTree.expandedIds]) : expandedIds,
    [expandedIds, filteredTree.expandedIds, hasSearch],
  );
  const isAllExpanded = tree.expandableIds.size > 0
    && Array.from(tree.expandableIds).every((id) => expandedIds.has(id));

  const toggleExpanded = (id: number) => setExpandedIds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });
  const toggleAll = () => setExpandedIds(isAllExpanded ? new Set() : new Set(tree.expandableIds));

  const renderNodes = (nodes: QuickToolCategoryTreeNode[], depth = 0): ReactNode => (
    <ul className={clsx(depth > 0 && 'ml-4 border-l border-gray-800/80 pl-1')}>
      {nodes.map((node) => {
        const hasChildren = node.children.length > 0;
        const expanded = hasChildren && effectiveExpandedIds.has(node.id);
        const selected = node.id === selectedId;
        const childrenId = `quick-category-children-${node.id}`;
        return (
          <li key={node.id} className="relative">
            <div className={clsx(
              'group my-1 flex min-h-16 items-stretch overflow-hidden rounded-xl border transition-colors focus-within:ring-2 focus-within:ring-blue-400/70',
              selected
                ? 'border-blue-500/45 bg-blue-500/10'
                : 'border-transparent hover:border-gray-800 hover:bg-gray-900/65',
            )}>
              {hasChildren ? (
                <button
                  type="button"
                  aria-label={`${expanded ? 'Thu gọn' : 'Mở rộng'} ${node.name}`}
                  aria-expanded={expanded}
                  aria-controls={childrenId}
                  onClick={() => toggleExpanded(node.id)}
                  className="grid min-h-16 w-10 shrink-0 place-items-center text-gray-600 outline-none transition-colors hover:bg-gray-800/55 hover:text-gray-200"
                >
                  {expanded
                    ? <ChevronDown className="h-4 w-4" aria-hidden="true" />
                    : <ChevronRight className="h-4 w-4" aria-hidden="true" />}
                </button>
              ) : <span className="w-10 shrink-0" aria-hidden="true" />}
              <button
                type="button"
                aria-current={selected ? 'page' : undefined}
                onClick={() => onSelect(node.id)}
                className="min-w-0 flex-1 px-1 py-2.5 pr-3 text-left outline-none"
              >
                <span className="flex items-start justify-between gap-2">
                  <span className={clsx(
                    'line-clamp-2 text-sm font-semibold leading-5',
                    selected ? 'text-blue-100' : depth === 0 ? 'text-gray-100' : 'text-gray-300',
                  )}>{node.name}</span>
                  <span className={clsx(
                    'inline-flex min-w-7 shrink-0 items-center justify-center rounded-md px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
                    node.complete ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-300',
                  )}>
                    {node.complete ? <Check className="h-3 w-3" aria-label="Đã hoàn tất" /> : node.missingCellCount}
                  </span>
                </span>
                <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[11px] tabular-nums text-gray-600">
                  <span>{node.incompleteProductCount} SKU</span>
                  <span>{node.attributeCount} thuộc tính</span>
                </span>
              </button>
            </div>
            {expanded ? <div id={childrenId}>{renderNodes(node.children, depth + 1)}</div> : null}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex min-h-11 items-center justify-between gap-3 border-b border-gray-900 px-3 py-2 text-[11px] text-gray-600">
        <span className="tabular-nums">
          {hasSearch
            ? `${filteredTree.visibleItems}/${tree.totalItems} danh mục`
            : `${tree.totalItems} danh mục · ${tree.roots.length} nhánh gốc`}
        </span>
        {!hasSearch && tree.expandableIds.size > 0 ? (
          <button
            type="button"
            onClick={toggleAll}
            className="min-h-9 rounded-md border border-gray-800 px-2.5 font-medium text-gray-400 outline-none transition-colors hover:border-blue-500/40 hover:text-blue-300 focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            {isAllExpanded ? 'Thu gọn tất cả' : 'Mở tất cả'}
          </button>
        ) : null}
      </div>
      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
        {filteredTree.roots.length > 0
          ? renderNodes(filteredTree.roots)
          : <p className="px-4 py-14 text-center text-sm text-gray-600">Không có danh mục phù hợp.</p>}
      </div>
    </div>
  );
}
