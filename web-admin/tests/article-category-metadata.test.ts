import assert from 'node:assert/strict';
import test from 'node:test';
import { AdminApiError } from '../src/lib/admin/common';
import {
  ensureArticleCategoryMetadataTable,
  normalizeArticleCategoryFeatured,
} from '../src/lib/articleCategoryMetadata';

test('article-category featured accepts only the supported 0/1 representations', () => {
  for (const value of [0, '0', false]) assert.equal(normalizeArticleCategoryFeatured(value), 0);
  for (const value of [1, '1', true]) assert.equal(normalizeArticleCategoryFeatured(value), 1);

  for (const value of [undefined, null, '', 2, 'true', 'false']) {
    assert.throws(
      () => normalizeArticleCategoryFeatured(value),
      (error) => error instanceof AdminApiError
        && error.status === 400
        && error.fields?.isFeatured === 'invalid',
    );
  }
});

test('article-category metadata migration is additive, idempotent, and backfills existing categories', async () => {
  const statements: string[] = [];
  const db = {
    query: async (sql: string) => {
      statements.push(sql.replace(/\s+/g, ' ').trim());
      return [[], []];
    },
  };

  await ensureArticleCategoryMetadataTable(db as never);
  await ensureArticleCategoryMetadataTable(db as never);

  assert.equal(statements.length, 4);
  assert.ok(statements[0].startsWith('CREATE TABLE IF NOT EXISTS web_admin_article_category_meta'));
  assert.match(statements[0], /PRIMARY KEY \(category_id\)/);
  assert.match(statements[0], /is_featured tinyint\(1\) NOT NULL DEFAULT 0/);
  assert.ok(statements[1].includes('INSERT IGNORE INTO web_admin_article_category_meta'));
  assert.ok(statements[1].includes('SELECT id, 0 FROM idv_seller_news_category'));
  assert.equal(statements[0], statements[2]);
  assert.equal(statements[1], statements[3]);
});
