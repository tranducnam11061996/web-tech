import assert from 'node:assert/strict';
import test from 'node:test';
import mysql from 'mysql2/promise';

const url = process.env.LEGACY_ARTICLE_IMPORT_TEST_DATABASE_URL || '';
const enabled = process.env.LEGACY_IMPORT_DESTRUCTIVE_TEST === 'true' && Boolean(url);

test('article import applies exact runtime inventory and fully restores a run-6 clone', { skip: !enabled }, async () => {
  const parsed = new URL(url);
  const database = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
  assert.match(database, /(test|import|disposable)/i, 'Disposable database name must contain test/import/disposable');
  process.env.DATABASE_URL = url;
  process.env.ADMIN_WRITE_ENABLED = 'true';
  const db = await mysql.createConnection(url);
  const [baseline] = await db.query<any[]>(`
    SELECT (SELECT COUNT(*) FROM idv_seller_news) articles,
           (SELECT COUNT(*) FROM idv_seller_news_content) content_rows,
           (SELECT COUNT(*) FROM idv_article_category) links,
           (SELECT COUNT(*) FROM idv_seller_news_category) categories
  `);
  assert.deepEqual(baseline[0], { articles: 0, content_rows: 0, links: 0, categories: 4 });

  const { PCM_ARTICLE_SOURCE, articleSha256, canonicalArticleSnapshot, normalizePcmarketArticles } = await import('../src/lib/legacyImport/pcmarketArticles');
  const { fetchPcmarketArticleSnapshot } = await import('../src/lib/legacyImport/articleSource');
  const { applyArticleImport, rollbackArticleImport } = await import('../src/lib/legacyImport/articleDatabase');
  const snapshot = await fetchPcmarketArticleSnapshot({ endpoint: PCM_ARTICLE_SOURCE });
  const normalized = normalizePcmarketArticles(snapshot.items);
  const result = await applyArticleImport({
    ...normalized,
    snapshotHash: articleSha256(canonicalArticleSnapshot(snapshot.items)),
    sourceUrl: PCM_ARTICLE_SOURCE,
    expectedDatabase: database,
  });
  const [applied] = await db.query<any[]>(`
    SELECT (SELECT COUNT(*) FROM idv_seller_news) articles,
           (SELECT COUNT(*) FROM idv_seller_news_content) content_rows,
           (SELECT COUNT(*) FROM idv_article_category) links,
           (SELECT COUNT(*) FROM idv_url WHERE id_path LIKE 'module:article/view:detail/view_id:%') routes,
           (SELECT COUNT(*) FROM web_admin_import_records WHERE run_id=?) records
  `, [result.runId]);
  assert.deepEqual(applied[0], { articles: 668, content_rows: 668, links: 705, routes: 668, records: 669 });
  await assert.rejects(() => applyArticleImport({
    ...normalized,
    snapshotHash: articleSha256(canonicalArticleSnapshot(snapshot.items)),
    sourceUrl: PCM_ARTICLE_SOURCE,
    expectedDatabase: database,
  }), /not empty/i);
  await rollbackArticleImport({ runId: result.runId, expectedDatabase: database });
  const [restored] = await db.query<any[]>(`
    SELECT (SELECT COUNT(*) FROM idv_seller_news) articles,
           (SELECT COUNT(*) FROM idv_seller_news_content) content_rows,
           (SELECT COUNT(*) FROM idv_article_category) links,
           (SELECT COUNT(*) FROM idv_seller_news_category) categories,
           (SELECT COUNT(*) FROM idv_url WHERE id_path LIKE 'module:news/view:category/view_id:%') category_routes
  `);
  assert.deepEqual(restored[0], { articles: 0, content_rows: 0, links: 0, categories: 4, category_routes: 4 });
  const { default: importPool } = await import('../src/lib/db');
  await importPool.end();
  await db.end();
});
