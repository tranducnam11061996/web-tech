import assert from 'node:assert/strict';
import test from 'node:test';
import type { QuickToolCategorySummary } from '../src/lib/admin/quickProductAttributes';
import {
  buildQuickToolCategoryTree,
  filterQuickToolCategoryTree,
  getQuickCategoryAncestorIds,
} from '../src/lib/quickProductCategoryTree';

function category(
  id: number,
  name: string,
  parentId = 0,
  ordering = 0,
  overrides: Partial<QuickToolCategorySummary> = {},
): QuickToolCategorySummary {
  return {
    id,
    parentId,
    ordering,
    name,
    breadcrumb: name,
    depth: 0,
    productCount: 1,
    incompleteProductCount: 1,
    missingCellCount: 1,
    attributeCount: 1,
    complete: false,
    ...overrides,
  };
}

function flattenIds(nodes: ReturnType<typeof buildQuickToolCategoryTree>['roots']): number[] {
  return nodes.flatMap((node) => [node.id, ...flattenIds(node.children)]);
}

test('builds a stable hierarchy and safely promotes orphan and cyclic nodes to roots', () => {
  const tree = buildQuickToolCategoryTree([
    category(1, 'Root thấp', 0, 1),
    category(2, 'Root cao', 0, 10),
    category(3, 'Bàn phím', 2, 5),
    category(4, 'Âm thanh', 2, 5),
    category(5, 'Con sâu', 3, 2),
    category(6, 'Mồ côi', 999, 0),
    category(7, 'Chu kỳ A', 8, 0),
    category(8, 'Chu kỳ B', 7, 0),
    category(3, 'Bản trùng phải bị bỏ', 0, 99),
  ]);

  assert.deepEqual(tree.roots.slice(0, 2).map((node) => node.id), [2, 1]);
  assert.deepEqual(tree.roots.find((node) => node.id === 2)?.children.map((node) => node.id), [4, 3]);
  assert.deepEqual(tree.roots.find((node) => node.id === 2)?.children.find((node) => node.id === 3)?.children.map((node) => node.id), [5]);
  assert.ok(tree.roots.some((node) => node.id === 6));
  assert.ok(tree.roots.some((node) => node.id === 7));
  assert.ok(tree.roots.some((node) => node.id === 8));
  assert.equal(new Set(flattenIds(tree.roots)).size, 8);
  assert.deepEqual(getQuickCategoryAncestorIds(5, tree.categoryById), [2, 3]);
  assert.deepEqual(getQuickCategoryAncestorIds(7, tree.categoryById), [8], 'cycle traversal must stop without repeating nodes');
});

test('search is accent-insensitive, keeps only matching paths and expands their ancestors', () => {
  const tree = buildQuickToolCategoryTree([
    category(10, 'LAPTOP', 0, 3, { breadcrumb: 'LAPTOP' }),
    category(11, 'LAPTOP THEO NHU CẦU', 10, 2, { breadcrumb: 'LAPTOP / LAPTOP THEO NHU CẦU' }),
    category(12, 'Laptop Đồ Họa', 11, 1, { breadcrumb: 'LAPTOP / LAPTOP THEO NHU CẦU / Laptop Đồ Họa' }),
    category(13, 'Laptop Gaming', 11, 0, { breadcrumb: 'LAPTOP / LAPTOP THEO NHU CẦU / Laptop Gaming' }),
    category(20, 'Màn hình', 0, 2, { breadcrumb: 'Màn hình' }),
  ]);

  const byName = filterQuickToolCategoryTree(tree.roots, 'do hoa');
  assert.deepEqual(flattenIds(byName.roots), [10, 11, 12]);
  assert.deepEqual([...byName.expandedIds].sort((a, b) => a - b), [10, 11]);
  assert.equal(byName.visibleItems, 3);

  const byId = filterQuickToolCategoryTree(tree.roots, '13');
  assert.deepEqual(flattenIds(byId.roots), [10, 11, 13]);
  assert.ok(!flattenIds(byId.roots).includes(12), 'unrelated sibling must stay hidden');

  const cleared = filterQuickToolCategoryTree(tree.roots, '');
  assert.deepEqual(flattenIds(cleared.roots), [10, 11, 12, 13, 20]);
  assert.equal(cleared.expandedIds.size, 0, 'search must not mutate manual expansion state');
});
