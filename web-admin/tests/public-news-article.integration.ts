import assert from 'node:assert/strict';
import test from 'node:test';
import type { RowDataPacket } from 'mysql2/promise';
import pool from '../src/lib/db';
import { loadPublicNewsArticle } from '../src/lib/publicNews';

test.after(async () => {
  await pool.end();
});

test('public article payload includes reusable sidebar data and six newest articles from the displayed category', async (context) => {
  const [articleRows] = await pool.query<RowDataPacket[]>(`
    SELECT n.id,n.url
    FROM idv_seller_news n
    JOIN idv_seller_news_category c ON c.id=n.catId AND c.status=1
    WHERE n.status=1
    ORDER BY n.id DESC LIMIT 1
  `);
  const source = articleRows[0];
  if (!source) {
    context.skip('requires one public article with an active primary category');
    return;
  }

  const payload = await loadPublicNewsArticle(String(source.url));
  assert.ok(payload);
  const displayedCategoryId = Number(payload.data.categoryTrail.at(-1)?.id || 0);
  assert.equal(displayedCategoryId > 0, true);
  assert.equal(payload.categories.every((category) => typeof category.isFeatured === 'boolean'), true);
  assert.equal(payload.popularNews.length <= 4, true);

  const [expectedPopularRows] = await pool.query<RowDataPacket[]>(`
    SELECT n.id FROM idv_seller_news n
    LEFT JOIN web_admin_page_view_totals pv ON pv.entity_type='article' AND pv.entity_id=n.id
    WHERE n.status=1
    ORDER BY COALESCE(pv.view_count,n.visit,0) DESC,n.createDate DESC,n.id DESC LIMIT 4
  `);
  assert.deepEqual(payload.popularNews.map((article) => article.id), expectedPopularRows.map((article) => Number(article.id)));

  const [expectedRelatedRows] = await pool.query<RowDataPacket[]>(`
    SELECT n.id
    FROM (
      SELECT n.id AS article_id FROM idv_seller_news n WHERE n.catId=?
      UNION DISTINCT
      SELECT ac.article_id FROM idv_article_category ac FORCE INDEX (idx_webtech_news_category_article)
      WHERE ac.category_id=? AND ac.status=1 AND ac.article_type='article'
    ) membership
    JOIN idv_seller_news n ON n.id=membership.article_id
    WHERE n.status=1 AND n.id<>?
    ORDER BY n.createDate DESC,n.id DESC LIMIT 6
  `, [displayedCategoryId, displayedCategoryId, source.id]);
  assert.deepEqual(payload.data.relatedNews.map((article) => article.id), expectedRelatedRows.map((article) => Number(article.id)));
  assert.equal(payload.data.relatedNews.length <= 6, true);
  assert.equal(payload.data.relatedNews.some((article) => article.id === Number(source.id)), false);
});

test('an uncategorized public article has no global related-news fallback', async (context) => {
  const [articleRows] = await pool.query<RowDataPacket[]>(`
    SELECT n.id,n.url
    FROM idv_seller_news n
    LEFT JOIN idv_seller_news_category primary_category ON primary_category.id=n.catId AND primary_category.status=1
    LEFT JOIN idv_article_category ac ON ac.article_id=n.id AND ac.status=1 AND ac.article_type='article'
    LEFT JOIN idv_seller_news_category linked_category ON linked_category.id=ac.category_id AND linked_category.status=1
    WHERE n.status=1 AND primary_category.id IS NULL AND linked_category.id IS NULL
    GROUP BY n.id,n.url
    ORDER BY n.id DESC LIMIT 1
  `);
  const source = articleRows[0];
  if (!source) {
    context.skip('requires one uncategorized public article');
    return;
  }

  const payload = await loadPublicNewsArticle(String(source.url));
  assert.ok(payload);
  assert.deepEqual(payload.data.categoryTrail, []);
  assert.deepEqual(payload.data.relatedNews, []);
});
