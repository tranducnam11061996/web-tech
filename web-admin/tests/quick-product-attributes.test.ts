import assert from 'node:assert/strict';
import test from 'node:test';
import pool from '../src/lib/db';
import {
  createAttributeSelectionRevision,
  parseIncompleteProductQuery,
  parseReplaceAttributeSelectionPayload,
} from '../src/lib/admin/quickProductAttributes';

test('normalizes pagination, status, sort and bounded search parameters', () => {
  assert.deepEqual(parseIncompleteProductQuery({
    categoryId: '12', attributeId: '7', page: '-9', limit: '31', status: 'unknown', sort: 'unsafe', q: 'x'.repeat(150),
  }), {
    categoryId: 12,
    attributeId: 7,
    page: 1,
    limit: 20,
    status: 'all',
    sort: 'id-desc',
    q: 'x'.repeat(100),
  });
  const accepted = parseIncompleteProductQuery(new URLSearchParams('categoryId=2&attributeId=3&page=4&limit=100&status=hidden&sort=sku-asc'));
  assert.equal(accepted.page, 4);
  assert.equal(accepted.limit, 100);
  assert.equal(accepted.status, 'hidden');
  assert.equal(accepted.sort, 'sku-asc');
});

test('revision is stable for duplicate and unordered value IDs', () => {
  assert.equal(createAttributeSelectionRevision([9, 2, 9, 4]), createAttributeSelectionRevision([2, 4, 9]));
  assert.notEqual(createAttributeSelectionRevision([]), createAttributeSelectionRevision([2]));
  assert.match(createAttributeSelectionRevision([]), /^[a-f0-9]{64}$/);
});

test('autosave payload deduplicates IDs and validates limits and revision', () => {
  const expectedRevision = createAttributeSelectionRevision([]);
  assert.deepEqual(parseReplaceAttributeSelectionPayload({
    categoryId: 4,
    attributeId: 5,
    attributeValueIds: [8, 8, '9', -1],
    expectedRevision,
  }), {
    categoryId: 4,
    attributeId: 5,
    attributeValueIds: [8, 9],
    expectedRevision,
  });
  assert.throws(() => parseReplaceAttributeSelectionPayload({ categoryId: 4, attributeId: 5, attributeValueIds: [], expectedRevision: 'bad' }), /expectedRevision/);
  assert.throws(() => parseReplaceAttributeSelectionPayload({ categoryId: 4, attributeId: 5, attributeValueIds: Array.from({ length: 101 }, (_, index) => index + 1), expectedRevision }), /100/);
  assert.throws(() => parseReplaceAttributeSelectionPayload({ categoryId: 0, attributeId: 5, attributeValueIds: [], expectedRevision }), /categoryId/);
});

test.after(async () => {
  await pool.end();
});
