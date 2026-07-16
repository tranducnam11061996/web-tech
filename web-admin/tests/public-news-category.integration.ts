import assert from 'node:assert/strict';
import test from 'node:test';
import type { RowDataPacket } from 'mysql2/promise';
import pool from '../src/lib/db';
import { ARTICLE_CATEGORY_METADATA_TABLE } from '../src/lib/articleCategoryMetadata';
import { loadPublicNewsCategory } from '../src/lib/publicNews';

test.after(async () => {
  await pool.end();
});

test('public category payload includes navigation, featured flags, counts and global popular news', async (context) => {
  const [categoryRows] = await pool.query<RowDataPacket[]>(`
    SELECT c.id,c.url
    FROM idv_seller_news_category c
    WHERE c.status=1
    ORDER BY c.id LIMIT 1
  `);
  if (!categoryRows[0]) {
    context.skip('requires one public news category');
    return;
  }

  const categoryId = Number(categoryRows[0].id);
  const payload = await loadPublicNewsCategory(String(categoryRows[0].url), {
    page: 1,
    limit: 21,
    sort: 'latest',
  });
  assert.ok(payload);
  assert.equal(payload.pagination.limit, 21);
  assert.equal(payload.totalNews, payload.pagination.total);
  assert.equal(payload.news.length <= 21, true);
  assert.equal(payload.popularNews.length <= 4, true);
  assert.equal('status' in payload.data, false);
  assert.equal('ordering' in payload.data, false);

  const [expectedCategoryRows] = await pool.query<RowDataPacket[]>(`
    SELECT COALESCE(meta.is_featured,0) AS is_featured
    FROM idv_seller_news_category c
    LEFT JOIN ${ARTICLE_CATEGORY_METADATA_TABLE} meta ON meta.category_id=c.id
    WHERE c.id=?
  `, [categoryId]);
  const currentCategory = payload.categories.find((entry) => entry.id === categoryId);
  assert.ok(currentCategory);
  assert.equal(currentCategory.isFeatured, Number(expectedCategoryRows[0]?.is_featured || 0) === 1);
  assert.equal(currentCategory.totalNews, payload.totalNews);

  const [expectedPopularRows] = await pool.query<RowDataPacket[]>(`
    SELECT n.id FROM idv_seller_news n
    LEFT JOIN web_admin_page_view_totals pv ON pv.entity_type='article' AND pv.entity_id=n.id
    WHERE n.status=1
    ORDER BY COALESCE(pv.view_count,n.visit,0) DESC,n.createDate DESC,n.id DESC LIMIT 4
  `);
  assert.deepEqual(payload.popularNews.map((entry) => entry.id), expectedPopularRows.map((entry) => Number(entry.id)));
});

test('popular category sort is deterministic and preserves membership pagination', async (context) => {
  const [categoryRows] = await pool.query<RowDataPacket[]>(`
    SELECT c.url
    FROM idv_seller_news_category c
    WHERE c.status=1
    ORDER BY c.id LIMIT 1
  `);
  if (!categoryRows[0]) {
    context.skip('requires one public news category');
    return;
  }

  const payload = await loadPublicNewsCategory(String(categoryRows[0].url), {
    page: 1,
    limit: 21,
    sort: 'popular',
  });
  assert.ok(payload);
  for (let index = 1; index < payload.news.length; index += 1) {
    const previous = payload.news[index - 1] as { id: number; visit: number; createDate: string };
    const current = payload.news[index] as { id: number; visit: number; createDate: string };
    const previousDate = new Date(previous.createDate).getTime();
    const currentDate = new Date(current.createDate).getTime();
    assert.equal(
      previous.visit > current.visit
        || (previous.visit === current.visit && previousDate > currentDate)
        || (previous.visit === current.visit && previousDate === currentDate && previous.id > current.id),
      true,
    );
  }
});
