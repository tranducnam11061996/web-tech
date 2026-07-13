import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PUBLIC_CATEGORY_SCOPE_MAX_IDS,
  effectivePublicCategoryScope,
  loadEnabledPublicCategoryScope,
  normalizePublicCategoryScopeRows,
} from '../src/lib/publicCategoryScope';

test('normalizes category scope rows into bounded unique sorted IDs', () => {
  assert.deepEqual(normalizePublicCategoryScopeRows([{ id: 9 }, { id: '3' }, { id: 9 }, { id: 0 }, { id: 'bad' }]), [3, 9]);
  assert.deepEqual(effectivePublicCategoryScope([]), [0]);
  assert.deepEqual(effectivePublicCategoryScope([3, 9]), [3, 9]);
  assert.throws(
    () => normalizePublicCategoryScopeRows(Array.from({ length: PUBLIC_CATEGORY_SCOPE_MAX_IDS + 1 }, (_, index) => ({ id: index + 1 }))),
    /exceeds/,
  );
});

test('loads an enabled recursive category scope through the supplied read-only DB', async () => {
  const calls: Array<{ sql: string; values: unknown[] }> = [];
  const db = {
    async query(sql: string, values: unknown[]) {
      calls.push({ sql, values });
      return [[{ id: 521 }, { id: 554 }, { id: 521 }], []];
    },
  };
  assert.deepEqual(await loadEnabledPublicCategoryScope(521, db as never), [521, 554]);
  assert.match(calls[0].sql, /WITH RECURSIVE category_scope/);
  assert.equal(calls[0].values[0], 521);
  await assert.rejects(loadEnabledPublicCategoryScope(0, db as never), /Invalid category scope root/);
});
