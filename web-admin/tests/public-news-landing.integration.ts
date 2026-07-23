import assert from 'node:assert/strict';
import test from 'node:test';
import type { RowDataPacket } from 'mysql2/promise';
import pool from '../src/lib/db';
import {
  loadHomepageFeaturedNews,
  loadPublicNewsLanding,
  NEWS_LANDING_CATEGORY_SLUGS,
  NEWS_LANDING_REVIEW_SLUG,
  resolveLandingCategoryScopes,
} from '../src/lib/publicNews';

test.after(async () => {
  await pool.end();
});

async function expectedArticles(categoryIds: number[], limit: number) {
  if (categoryIds.length === 0) return [];
  const placeholders = categoryIds.map(() => '?').join(',');
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT n.id
    FROM (
      SELECT n.id AS article_id
      FROM idv_seller_news n
      WHERE n.catId IN (${placeholders})
      UNION DISTINCT
      SELECT ac.article_id
      FROM idv_article_category ac FORCE INDEX (idx_webtech_news_category_article)
      WHERE ac.category_id IN (${placeholders}) AND ac.status=1 AND ac.article_type='article'
    ) membership
    JOIN idv_seller_news n ON n.id=membership.article_id
    WHERE n.status=1
    ORDER BY n.createDate DESC,n.id DESC
    LIMIT ?
  `, [...categoryIds, ...categoryIds, limit]);
  return rows.map((row) => Number(row.id));
}

test('public news landing returns bounded deduplicated news and review groups', async () => {
  const slugs = [...NEWS_LANDING_CATEGORY_SLUGS, NEWS_LANDING_REVIEW_SLUG];
  const [scopeRows] = await pool.query<RowDataPacket[]>(`
    SELECT id,name,url FROM idv_seller_news_category
    WHERE status=1 AND url IN (${slugs.map(() => '?').join(',')})
  `, slugs);
  const scopes = resolveLandingCategoryScopes(scopeRows);
  const payload = await loadPublicNewsLanding();

  const expectedNewsIds = await expectedArticles(scopes.newsCategories.map((category) => category.id), 11);
  const expectedReviewIds = await expectedArticles(scopes.reviewCategory ? [scopes.reviewCategory.id] : [], 6);
  assert.deepEqual(payload.news.map((article) => article.id), expectedNewsIds);
  assert.deepEqual(payload.reviews.map((article) => article.id), expectedReviewIds);
  assert.equal(payload.news.length <= 11, true);
  assert.equal(payload.reviews.length <= 6, true);
  assert.equal(new Set(payload.news.map((article) => article.id)).size, payload.news.length);
  assert.equal(payload.categories.every((category) => typeof category.isFeatured === 'boolean'), true);

  const allowedNewsCategoryIds = new Set(scopes.newsCategories.map((category) => category.id));
  assert.equal(payload.news.every((article) => allowedNewsCategoryIds.has(article.category_id)), true);
  if (scopes.reviewCategory) {
    assert.equal(payload.reviews.every((article) => article.category_id === scopes.reviewCategory?.id), true);
  }
});

test('homepage featured news returns the ten newest unique public articles from featured categories', async () => {
  const payload = await loadHomepageFeaturedNews(10);
  const [expectedRows] = await pool.query<RowDataPacket[]>(`
    WITH featured_categories AS (
      SELECT c.id
      FROM idv_seller_news_category c
      JOIN web_admin_article_category_meta meta
        ON meta.category_id=c.id AND meta.is_featured=1
      WHERE c.status=1
    ), membership AS (
      SELECT n.id AS article_id
      FROM idv_seller_news n
      JOIN featured_categories featured ON featured.id=n.catId
      WHERE n.status=1
      UNION DISTINCT
      SELECT ac.article_id
      FROM idv_article_category ac FORCE INDEX (idx_webtech_news_category_article)
      JOIN featured_categories featured ON featured.id=ac.category_id
      JOIN idv_seller_news n ON n.id=ac.article_id AND n.status=1
      WHERE ac.status=1 AND ac.article_type='article'
    )
    SELECT n.id
    FROM membership
    JOIN idv_seller_news n ON n.id=membership.article_id AND n.status=1
    ORDER BY n.createDate DESC,n.id DESC
    LIMIT 10
  `);

  assert.deepEqual(payload.map((article) => article.id), expectedRows.map((row) => Number(row.id)));
  assert.equal(payload.length <= 10, true);
  assert.equal(new Set(payload.map((article) => article.id)).size, payload.length);
  assert.equal(payload.every((article) => article.category_id > 0 && article.category_name), true);

  if (payload.length === 0) return;
  const placeholders = payload.map(() => '?').join(',');
  const [primaryRows] = await pool.query<RowDataPacket[]>(`
    SELECT n.id,n.catId,COALESCE(meta.is_featured,0) AS primary_is_featured,c.status AS primary_status
    FROM idv_seller_news n
    LEFT JOIN idv_seller_news_category c ON c.id=n.catId
    LEFT JOIN web_admin_article_category_meta meta ON meta.category_id=c.id
    WHERE n.id IN (${placeholders})
  `, payload.map((article) => article.id));
  const primaryByArticle = new Map(primaryRows.map((row) => [Number(row.id), row]));
  for (const article of payload) {
    const primary = primaryByArticle.get(article.id);
    if (Number(primary?.primary_status) === 1 && Number(primary?.primary_is_featured) === 1) {
      assert.equal(article.category_id, Number(primary?.catId));
    }
  }
});
