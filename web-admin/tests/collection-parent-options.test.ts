import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCollectionParentOptions,
  filterCollectionParentOptions,
  type CollectionOption,
} from '../src/app/product/collection-edit/collection-parent-options';

const collections: CollectionOption[] = [
  { id: 1, name: 'PC Gaming', parentId: 0 },
  { id: 2, name: 'Máy tính cao cấp', parentId: 1 },
  { id: 3, name: 'Ryzen chuyên dụng', parentId: 2 },
  { id: 4, name: 'Laptop văn phòng', parentId: 0 },
  { id: 5, name: 'Bộ sưu tập rời', parentId: 999 },
];

test('collection parent options preserve hierarchy and handle orphaned parents', () => {
  const options = buildCollectionParentOptions(collections, 0);

  assert.deepEqual(
    options.map(({ id, level }) => ({ id, level })),
    [
      { id: 1, level: 0 },
      { id: 2, level: 1 },
      { id: 3, level: 2 },
      { id: 4, level: 0 },
      { id: 5, level: 0 },
    ],
  );
});

test('collection parent options exclude the current collection and all descendants', () => {
  const options = buildCollectionParentOptions(collections, 2);

  assert.deepEqual(options.map((option) => option.id), [1, 4, 5]);
});

test('collection parent search ignores Vietnamese accents and matches numeric IDs', () => {
  const options = buildCollectionParentOptions(collections, 0);

  assert.deepEqual(
    filterCollectionParentOptions(options, 'may tinh').map((option) => option.id),
    [2],
  );
  assert.deepEqual(
    filterCollectionParentOptions(options, '3').map((option) => option.id),
    [3],
  );
});
