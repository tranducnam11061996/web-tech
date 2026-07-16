import assert from 'node:assert/strict';
import test from 'node:test';
import type { RowDataPacket } from 'mysql2/promise';
import pool from '../src/lib/db';
import {
  ARTICLE_CATEGORY_METADATA_TABLE,
  saveArticleCategoryFeatured,
} from '../src/lib/articleCategoryMetadata';

test.after(async () => {
  await pool.end();
});

test('article-category metadata covers every current category with a valid 0/1 value', async () => {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT
      (SELECT COUNT(*) FROM idv_seller_news_category) AS category_count,
      (SELECT COUNT(*) FROM ${ARTICLE_CATEGORY_METADATA_TABLE}) AS metadata_count,
      (SELECT COUNT(*) FROM ${ARTICLE_CATEGORY_METADATA_TABLE} WHERE is_featured NOT IN (0, 1)) AS invalid_count
  `);
  assert.equal(Number(rows[0]?.metadata_count), Number(rows[0]?.category_count));
  assert.equal(Number(rows[0]?.invalid_count), 0);
});

test('article-category featured upsert is transactional', async (context) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [categories] = await connection.query<RowDataPacket[]>(
      `SELECT c.id, COALESCE(meta.is_featured, 0) AS is_featured
       FROM idv_seller_news_category c
       LEFT JOIN ${ARTICLE_CATEGORY_METADATA_TABLE} meta ON meta.category_id = c.id
       ORDER BY c.id LIMIT 1 FOR UPDATE`,
    );
    if (!categories[0]) {
      context.skip('requires one article category');
      await connection.rollback();
      return;
    }

    const categoryId = Number(categories[0].id);
    const nextValue = Number(categories[0].is_featured) === 1 ? 0 : 1;
    await saveArticleCategoryFeatured(categoryId, nextValue, connection);
    const [savedRows] = await connection.query<RowDataPacket[]>(
      `SELECT is_featured FROM ${ARTICLE_CATEGORY_METADATA_TABLE} WHERE category_id = ?`,
      [categoryId],
    );
    assert.equal(Number(savedRows[0]?.is_featured), nextValue);
    await connection.rollback();
  } finally {
    connection.release();
  }
});
