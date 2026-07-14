import assert from 'node:assert/strict';
import test from 'node:test';
import { CustomerAuthError } from '../src/lib/customerAccounts';
import {
  MAX_FAVORITE_PAGE_SIZE,
  MAX_FAVORITE_STATUS_IDS,
  ensureCustomerFavoriteTable,
  parseFavoriteListOptions,
  parseFavoriteProductId,
  parseFavoriteStatusIds,
} from '../src/lib/customerFavorites';

test('customer favorite migration is additive and idempotent at the caller boundary', async () => {
  const statements: string[] = [];
  const db = {
    query: async (statement: string) => {
      statements.push(statement);
      return [[], []];
    },
  };
  await ensureCustomerFavoriteTable(db as never);
  await ensureCustomerFavoriteTable(db as never);
  assert.equal(statements.length, 2);
  assert.ok(statements.every((statement) => statement.includes('CREATE TABLE IF NOT EXISTS web_admin_customer_favorites')));
  assert.match(statements[0], /UNIQUE KEY uq_web_admin_customer_favorite \(customer_id, product_id\)/);
  assert.match(statements[0], /KEY idx_web_admin_customer_favorite_list \(customer_id, id\)/);
  assert.match(statements[0], /ON DELETE CASCADE/);
});

test('customer favorite product ids require positive safe integers', () => {
  assert.equal(parseFavoriteProductId('42'), 42);
  for (const value of ['', '0', '-1', '1.5', 'abc', String(Number.MAX_SAFE_INTEGER + 1)]) {
    assert.throws(
      () => parseFavoriteProductId(value),
      (error: unknown) => error instanceof CustomerAuthError && error.status === 400,
    );
  }
});

test('customer favorite status ids are unique and bounded', () => {
  assert.deepEqual(parseFavoriteStatusIds('3,1,2'), [3, 1, 2]);
  assert.throws(() => parseFavoriteStatusIds('1,1'));
  assert.throws(() => parseFavoriteStatusIds(null));
  assert.throws(() => parseFavoriteStatusIds(
    Array.from({ length: MAX_FAVORITE_STATUS_IDS + 1 }, (_, index) => index + 1).join(','),
  ));
});

test('customer favorite list uses a bounded cursor contract', () => {
  assert.deepEqual(parseFavoriteListOptions(new URLSearchParams()), {
    cursor: null,
    limit: MAX_FAVORITE_PAGE_SIZE,
  });
  assert.deepEqual(parseFavoriteListOptions(new URLSearchParams('cursor=99&limit=12')), {
    cursor: 99,
    limit: 12,
  });
  for (const query of ['limit=0', `limit=${MAX_FAVORITE_PAGE_SIZE + 1}`, 'limit=nope', 'cursor=0']) {
    assert.throws(() => parseFavoriteListOptions(new URLSearchParams(query)));
  }
});
