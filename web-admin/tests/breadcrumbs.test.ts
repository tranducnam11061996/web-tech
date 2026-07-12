import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeCategoryTrailRows,
  parseLegacyCategoryIds,
  pickNewsCategoryId,
  pickProductCategoryId,
} from '../src/lib/publicBreadcrumbs';

test('parses legacy category CSV values safely and preserves order', () => {
  assert.deepEqual(parseLegacyCategoryIds('0,1087,1280,1280,,bad,-1,1295,'), [1087, 1280, 1295]);
  assert.deepEqual(parseLegacyCategoryIds(null), []);
});

test('selects the deepest valid product category and uses a fallback', () => {
  assert.equal(pickProductCategoryId([1087, 1280, 1295], new Set([1087, 1280, 1295]), 99), 1295);
  assert.equal(pickProductCategoryId([1087, 1280], new Set(), 99), 99);
});

test('selects primary or first valid legacy news category deterministically', () => {
  assert.equal(pickNewsCategoryId(57, [4, 56], new Set([4, 56, 57]), 99), 57);
  assert.equal(pickNewsCategoryId(0, [4, 56, 55], new Set([55, 56]), 99), 56);
  assert.equal(pickNewsCategoryId(0, [4], new Set(), 99), 99);
});

test('normalizes partial and cyclic category rows into a unique root-to-leaf trail', () => {
  const trail = normalizeCategoryTrailRows([
    { id: 1295, name: ' Leaf ', url: '/leaf/', depth: 0 },
    { id: 1280, name: 'Parent', url: 'parent', depth: 1 },
    { id: 1087, name: 'Root', url: 'root', depth: 2 },
    { id: 1295, name: 'Leaf duplicate', url: 'leaf', depth: 3 },
    { id: 9999, name: '', url: 'missing-name', depth: 4 },
  ]);

  assert.deepEqual(trail, [
    { id: 1087, name: 'Root', slug: 'root' },
    { id: 1280, name: 'Parent', slug: 'parent' },
    { id: 1295, name: 'Leaf', slug: 'leaf' },
  ]);
  assert.deepEqual(normalizeCategoryTrailRows([{ id: 5, name: 'Only leaf', url: 'only-leaf', depth: 0 }]), [
    { id: 5, name: 'Only leaf', slug: 'only-leaf' },
  ]);
});
