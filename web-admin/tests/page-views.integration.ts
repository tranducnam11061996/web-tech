import crypto from 'crypto';
import assert from 'node:assert/strict';
import test from 'node:test';
import type { RowDataPacket } from 'mysql2/promise';
import pool from '../src/lib/db';
import {
  PAGE_VIEW_EVENTS_TABLE,
  PAGE_VIEW_TOTALS_TABLE,
  insertPageViewEvent,
  processPageViewBatch,
  resolvePageViewEntity,
} from '../src/lib/pageViews';

test.after(async () => {
  await pool.end();
});

async function pageViewTablesExist() {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT COUNT(*) AS total
    FROM information_schema.tables
    WHERE table_schema=DATABASE()
      AND table_name IN (?,?)
  `, [PAGE_VIEW_EVENTS_TABLE, PAGE_VIEW_TOTALS_TABLE]);
  return Number(rows[0]?.total || 0) === 2;
}

test('page-view resolver follows the four current public route contracts', async (context) => {
  if (!await pageViewTablesExist()) {
    context.skip('page-view migration is not applied');
    return;
  }

  const [catalogRows] = await pool.query<RowDataPacket[]>(`
    SELECT u.request_path
    FROM idv_url u
    WHERE u.request_path<>'' AND (
      u.id_path LIKE 'module:product/view:product-detail/view_id:%'
      OR u.id_path LIKE 'module:product/view:category/view_id:%'
    )
    ORDER BY u.id LIMIT 20
  `);
  let resolvedCatalog = null;
  for (const row of catalogRows) {
    resolvedCatalog = await resolvePageViewEntity(String(row.request_path));
    if (resolvedCatalog) break;
  }
  assert.ok(resolvedCatalog);
  assert.equal(['product', 'product_category'].includes(resolvedCatalog.entityType), true);

  const [articleRows] = await pool.query<RowDataPacket[]>(
    'SELECT id,url FROM idv_seller_news WHERE status=1 AND url<>\'\' ORDER BY id LIMIT 1',
  );
  if (articleRows[0]) {
    assert.deepEqual(await resolvePageViewEntity(`/tin-tuc/${encodeURIComponent(String(articleRows[0].url))}`), {
      entityType: 'article',
      entityId: Number(articleRows[0].id),
    });
  }

  const [categoryRows] = await pool.query<RowDataPacket[]>(
    'SELECT id,url FROM idv_seller_news_category WHERE status=1 AND url<>\'\' ORDER BY id LIMIT 1',
  );
  if (categoryRows[0]) {
    assert.deepEqual(await resolvePageViewEntity(`/tin-tuc/${encodeURIComponent(String(categoryRows[0].url))}`), {
      entityType: 'article_category',
      entityId: Number(categoryRows[0].id),
    });
  }

  assert.equal(await resolvePageViewEntity('/tin-tuc'), null);
  assert.equal(await resolvePageViewEntity('/gio-hang'), null);
});

test('page-view UUID is idempotent and worker aggregation is exactly once inside a rollback-safe transaction', async (context) => {
  if (!await pageViewTablesExist()) {
    context.skip('page-view migration is not applied');
    return;
  }
  const [pendingRows] = await pool.query<RowDataPacket[]>(
    `SELECT COUNT(*) AS total FROM ${PAGE_VIEW_EVENTS_TABLE} WHERE processed_at IS NULL`,
  );
  if (Number(pendingRows[0]?.total || 0) > 4_000) {
    context.skip('page-view queue is too large for an isolated batch assertion');
    return;
  }

  const connection = await pool.getConnection();
  const syntheticEntityId = 2_147_483_647;
  try {
    await connection.beginTransaction();
    const firstId = crypto.randomUUID();
    const secondId = crypto.randomUUID();
    assert.equal(await insertPageViewEvent(firstId, { entityType: 'product', entityId: syntheticEntityId }, connection), true);
    assert.equal(await insertPageViewEvent(firstId, { entityType: 'product', entityId: syntheticEntityId }, connection), false);
    assert.equal(await insertPageViewEvent(secondId, { entityType: 'product', entityId: syntheticEntityId }, connection), true);

    await processPageViewBatch(connection, 5_000);
    const [totalRows] = await connection.query<RowDataPacket[]>(
      `SELECT view_count FROM ${PAGE_VIEW_TOTALS_TABLE} WHERE entity_type='product' AND entity_id=?`,
      [syntheticEntityId],
    );
    assert.equal(Number(totalRows[0]?.view_count || 0), 2);
    const [eventRows] = await connection.query<RowDataPacket[]>(
      `SELECT COUNT(*) AS total FROM ${PAGE_VIEW_EVENTS_TABLE}
       WHERE entity_type='product' AND entity_id=? AND processed_at IS NOT NULL`,
      [syntheticEntityId],
    );
    assert.equal(Number(eventRows[0]?.total || 0), 2);
    await connection.rollback();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
});
