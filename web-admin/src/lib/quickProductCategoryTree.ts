import type { QuickToolCategorySummary } from '@/lib/admin/quickProductAttributes';

export type QuickToolCategoryTreeNode = QuickToolCategorySummary & {
  children: QuickToolCategoryTreeNode[];
};

export type QuickToolCategoryTree = {
  roots: QuickToolCategoryTreeNode[];
  categoryById: Map<number, QuickToolCategorySummary>;
  expandableIds: Set<number>;
  totalItems: number;
};

function compareCategories(left: QuickToolCategorySummary, right: QuickToolCategorySummary) {
  return right.ordering - left.ordering
    || left.name.localeCompare(right.name, 'vi')
    || left.id - right.id;
}

function parentChainHasCycle(category: QuickToolCategorySummary, categoryById: Map<number, QuickToolCategorySummary>) {
  const visited = new Set<number>([category.id]);
  let parentId = category.parentId;
  while (parentId > 0) {
    if (visited.has(parentId)) return true;
    visited.add(parentId);
    const parent = categoryById.get(parentId);
    if (!parent) return false;
    parentId = parent.parentId;
  }
  return false;
}

function sortTree(nodes: QuickToolCategoryTreeNode[]) {
  nodes.sort(compareCategories);
  for (const node of nodes) sortTree(node.children);
}

function collectExpandableIds(nodes: QuickToolCategoryTreeNode[], result = new Set<number>()) {
  for (const node of nodes) {
    if (node.children.length > 0) result.add(node.id);
    collectExpandableIds(node.children, result);
  }
  return result;
}

export function normalizeQuickCategorySearch(value: string) {
  return value
    .toLocaleLowerCase('vi')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim();
}

export function buildQuickToolCategoryTree(categories: readonly QuickToolCategorySummary[]): QuickToolCategoryTree {
  const categoryById = new Map<number, QuickToolCategorySummary>();
  for (const category of categories) {
    const id = Number(category.id);
    if (id <= 0 || categoryById.has(id)) continue;
    categoryById.set(id, {
      ...category,
      id,
      parentId: Number(category.parentId || 0),
      ordering: Number(category.ordering || 0),
    });
  }

  const nodesById = new Map<number, QuickToolCategoryTreeNode>();
  for (const category of categoryById.values()) nodesById.set(category.id, { ...category, children: [] });
  const roots: QuickToolCategoryTreeNode[] = [];
  for (const category of categoryById.values()) {
    const node = nodesById.get(category.id)!;
    const parent = nodesById.get(category.parentId);
    if (!parent || parent.id === node.id || parentChainHasCycle(category, categoryById)) roots.push(node);
    else parent.children.push(node);
  }
  sortTree(roots);
  return {
    roots,
    categoryById,
    expandableIds: collectExpandableIds(roots),
    totalItems: categoryById.size,
  };
}

export function getQuickCategoryAncestorIds(
  selectedId: number,
  categoryById: ReadonlyMap<number, QuickToolCategorySummary>,
) {
  const ancestors: number[] = [];
  const visited = new Set<number>([selectedId]);
  let parentId = categoryById.get(selectedId)?.parentId || 0;
  while (parentId > 0 && !visited.has(parentId)) {
    visited.add(parentId);
    if (!categoryById.has(parentId)) break;
    ancestors.unshift(parentId);
    parentId = categoryById.get(parentId)?.parentId || 0;
  }
  return ancestors;
}

export function filterQuickToolCategoryTree(nodes: readonly QuickToolCategoryTreeNode[], search: string) {
  const query = normalizeQuickCategorySearch(search);
  if (!query) {
    return {
      roots: nodes as QuickToolCategoryTreeNode[],
      visibleItems: countQuickCategoryTreeItems(nodes),
      expandedIds: new Set<number>(),
    };
  }
  const expandedIds = new Set<number>();
  const filter = (source: readonly QuickToolCategoryTreeNode[]): QuickToolCategoryTreeNode[] => source.flatMap((node) => {
    const children = filter(node.children);
    const matches = normalizeQuickCategorySearch(`${node.name} ${node.breadcrumb} ${node.id}`).includes(query);
    if (!matches && children.length === 0) return [];
    if (children.length > 0) expandedIds.add(node.id);
    return [{ ...node, children }];
  });
  const roots = filter(nodes);
  return { roots, visibleItems: countQuickCategoryTreeItems(roots), expandedIds };
}

export function countQuickCategoryTreeItems(nodes: readonly QuickToolCategoryTreeNode[]) {
  let count = 0;
  const visited = new Set<number>();
  const walk = (items: readonly QuickToolCategoryTreeNode[]) => {
    for (const item of items) {
      if (visited.has(item.id)) continue;
      visited.add(item.id);
      count += 1;
      walk(item.children);
    }
  };
  walk(nodes);
  return count;
}
