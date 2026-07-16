import { createHash } from 'crypto';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { classifyPublicCatalogRoute } from '@/lib/publicCatalogRoute';

export const PAGE_VIEW_EVENTS_TABLE = 'web_admin_page_view_events';
export const PAGE_VIEW_TOTALS_TABLE = 'web_admin_page_view_totals';

export const PAGE_VIEW_ENTITY_TYPES = [
  'product',
  'product_category',
  'article',
  'article_category',
] as const;

export type PageViewEntityType = (typeof PAGE_VIEW_ENTITY_TYPES)[number];

export type PageViewEntity = {
  entityType: PageViewEntityType;
  entityId: number;
};

type Db = typeof pool | PoolConnection;

type PageViewEventRow = RowDataPacket & {
  id: number;
  entity_type: PageViewEntityType;
  entity_id: number;
};

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NEWS_PATH = /^\/tin-tuc\/([^/?#]+)$/;
const CATALOG_PATH = /^\/([^/?#]+)$/;

export function pageViewTrackingEnabled() {
  return process.env.PAGE_VIEW_TRACKING_ENABLED !== 'false';
}

export function normalizePageViewPath(value: unknown) {
  const path = String(value || '').trim();
  if (!path || path.length > 300 || !path.startsWith('/') || path.startsWith('//')) return null;
  if (path.includes('?') || path.includes('#') || path.endsWith('/')) return null;
  try {
    const parsed = new URL(path, 'https://page-view.invalid');
    return parsed.pathname === path ? path : null;
  } catch {
    return null;
  }
}

export function pageViewEventIdBuffer(value: string) {
  if (!UUID_V4.test(value)) return null;
  return Buffer.from(value.replaceAll('-', ''), 'hex');
}

export function pageViewSourceMatches(input: {
  origin: string | null;
  referer: string | null;
  fetchSite: string | null;
  path: string;
}) {
  const origin = String(input.origin || '').replace(/\/$/, '');
  if (!origin || !input.referer) return false;
  const fetchSite = String(input.fetchSite || '').toLowerCase();
  if (fetchSite && fetchSite !== 'same-origin') return false;
  try {
    const referer = new URL(input.referer);
    return referer.origin === origin && referer.pathname === input.path;
  } catch {
    return false;
  }
}

function decodeSlug(value: string) {
  try {
    const decoded = decodeURIComponent(value).trim();
    return decoded && decoded.length <= 250 && !decoded.includes('/') ? decoded : null;
  } catch {
    return null;
  }
}

export async function resolvePageViewEntity(pathValue: unknown, db: Db = pool): Promise<PageViewEntity | null> {
  const path = normalizePageViewPath(pathValue);
  if (!path) return null;

  const newsMatch = path.match(NEWS_PATH);
  if (newsMatch) {
    const slug = decodeSlug(newsMatch[1]);
    if (!slug) return null;
    const [articleRows] = await db.query<RowDataPacket[]>(
      'SELECT id FROM idv_seller_news WHERE url=? AND status=1 LIMIT 1',
      [slug],
    );
    if (articleRows[0]) return { entityType: 'article', entityId: Number(articleRows[0].id) };
    const [categoryRows] = await db.query<RowDataPacket[]>(
      'SELECT id FROM idv_seller_news_category WHERE url=? AND status=1 LIMIT 1',
      [slug],
    );
    return categoryRows[0]
      ? { entityType: 'article_category', entityId: Number(categoryRows[0].id) }
      : null;
  }

  const catalogMatch = path.match(CATALOG_PATH);
  if (!catalogMatch) return null;
  const slug = decodeSlug(catalogMatch[1]);
  if (!slug) return null;
  const requestPath = `/${slug}`;
  const requestPathIndex = createHash('md5').update(requestPath).digest('hex');
  const [urlRows] = await db.query<RowDataPacket[]>(
    'SELECT id_path,url_type FROM idv_url WHERE request_path_index=? AND request_path=? LIMIT 1',
    [requestPathIndex, requestPath],
  );
  const classified = classifyPublicCatalogRoute(urlRows[0]?.id_path, urlRows[0]?.url_type);
  if (!classified) return null;

  if (classified.type === 'category') {
    const [rows] = await db.query<RowDataPacket[]>(
      'SELECT id FROM idv_seller_category WHERE id=? AND status=1 LIMIT 1',
      [classified.entityId],
    );
    return rows[0]
      ? { entityType: 'product_category', entityId: classified.entityId }
      : null;
  }

  const [rows] = await db.query<RowDataPacket[]>(
    'SELECT id FROM idv_sell_product_store WHERE id=? LIMIT 1',
    [classified.entityId],
  );
  return rows[0] ? { entityType: 'product', entityId: classified.entityId } : null;
}

export async function insertPageViewEvent(
  eventId: string,
  entity: PageViewEntity,
  db: Db = pool,
) {
  const eventUuid = pageViewEventIdBuffer(eventId);
  if (!eventUuid) throw new Error('Invalid page-view event UUID');
  try {
    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO ${PAGE_VIEW_EVENTS_TABLE}(event_uuid,entity_type,entity_id) VALUES(?,?,?)`,
      [eventUuid, entity.entityType, entity.entityId],
    );
    return result.affectedRows === 1;
  } catch (error: unknown) {
    if ((error as { code?: string })?.code === 'ER_DUP_ENTRY') return false;
    throw error;
  }
}

export function aggregatePageViewRows(rows: Array<Pick<PageViewEventRow, 'entity_type' | 'entity_id'>>) {
  const counts = new Map<string, { entityType: PageViewEntityType; entityId: number; count: number }>();
  for (const row of rows) {
    const entityId = Number(row.entity_id);
    const key = `${row.entity_type}:${entityId}`;
    const current = counts.get(key);
    if (current) current.count += 1;
    else counts.set(key, { entityType: row.entity_type, entityId, count: 1 });
  }
  return [...counts.values()];
}

export async function processPageViewBatch(connection: PoolConnection, batchSize = 1_000) {
  const limit = Math.min(5_000, Math.max(1, Math.trunc(batchSize)));
  const [rows] = await connection.query<PageViewEventRow[]>(`
    SELECT id,entity_type,entity_id
    FROM ${PAGE_VIEW_EVENTS_TABLE}
    WHERE processed_at IS NULL
    ORDER BY id
    LIMIT ${limit}
    FOR UPDATE SKIP LOCKED
  `);
  if (rows.length === 0) return 0;

  const aggregates = aggregatePageViewRows(rows);
  const valueSql = aggregates.map(() => '(?,?,?)').join(',');
  await connection.query(
    `INSERT INTO ${PAGE_VIEW_TOTALS_TABLE}(entity_type,entity_id,view_count)
     VALUES ${valueSql}
     ON DUPLICATE KEY UPDATE view_count=view_count+VALUES(view_count),updated_at=CURRENT_TIMESTAMP(3)`,
    aggregates.flatMap((entry) => [entry.entityType, entry.entityId, entry.count]),
  );

  const ids = rows.map((row) => Number(row.id));
  await connection.query(
    `UPDATE ${PAGE_VIEW_EVENTS_TABLE} SET processed_at=CURRENT_TIMESTAMP(3)
     WHERE id IN (${ids.map(() => '?').join(',')}) AND processed_at IS NULL`,
    ids,
  );
  return rows.length;
}

export async function flushPageViewEvents(batchSize = 1_000) {
  if (!pageViewTrackingEnabled()) return 0;
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const processed = await processPageViewBatch(connection, batchSize);
    await connection.commit();
    return processed;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function cleanupProcessedPageViewEvents(batchSize = 1_000) {
  if (!pageViewTrackingEnabled()) return 0;
  const limit = Math.min(5_000, Math.max(10, Math.trunc(batchSize)));
  const [result] = await pool.query<ResultSetHeader>(`
    DELETE FROM ${PAGE_VIEW_EVENTS_TABLE}
    WHERE processed_at IS NOT NULL
      AND processed_at<DATE_SUB(CURRENT_TIMESTAMP(3),INTERVAL 1 HOUR)
    ORDER BY id
    LIMIT ${limit}
  `);
  return result.affectedRows;
}

export async function loadPageViewQueueMetrics() {
  const [queueRows, totalRows] = await Promise.all([
    pool.query<RowDataPacket[]>(`
      SELECT COUNT(*) AS pending,MIN(created_at) AS oldest_created_at
      FROM ${PAGE_VIEW_EVENTS_TABLE}
      WHERE processed_at IS NULL
    `),
    pool.query<RowDataPacket[]>(`
      SELECT MAX(updated_at) AS last_flush_at
      FROM ${PAGE_VIEW_TOTALS_TABLE}
    `),
  ]);
  const queue = queueRows[0][0];
  const oldest = queue?.oldest_created_at ? new Date(queue.oldest_created_at).getTime() : 0;
  return {
    pending: Number(queue?.pending || 0),
    oldestPendingSeconds: oldest ? Math.max(0, Math.round((Date.now() - oldest) / 1_000)) : 0,
    lastFlushAt: totalRows[0][0]?.last_flush_at || null,
  };
}

export async function ensurePageViewInfrastructure(db: Db = pool) {
  await db.query(`CREATE TABLE IF NOT EXISTS ${PAGE_VIEW_TOTALS_TABLE} (
    entity_type enum('product','product_category','article','article_category') CHARACTER SET ascii NOT NULL,
    entity_id int NOT NULL,
    view_count bigint unsigned NOT NULL DEFAULT 0,
    updated_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    PRIMARY KEY (entity_type,entity_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await db.query(`CREATE TABLE IF NOT EXISTS ${PAGE_VIEW_EVENTS_TABLE} (
    id bigint unsigned NOT NULL AUTO_INCREMENT,
    event_uuid binary(16) NOT NULL,
    entity_type enum('product','product_category','article','article_category') CHARACTER SET ascii NOT NULL,
    entity_id int NOT NULL,
    created_at datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    processed_at datetime(3) NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_web_admin_page_view_event_uuid (event_uuid),
    KEY idx_web_admin_page_view_events_work (processed_at,id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  const sources: Array<{ entityType: PageViewEntityType; table: string }> = [
    { entityType: 'product', table: 'idv_sell_product_store' },
    { entityType: 'product_category', table: 'idv_seller_category' },
    { entityType: 'article', table: 'idv_seller_news' },
    { entityType: 'article_category', table: 'idv_seller_news_category' },
  ];
  for (const source of sources) {
    await db.query(`
      INSERT INTO ${PAGE_VIEW_TOTALS_TABLE}(entity_type,entity_id,view_count)
      SELECT ?,id,GREATEST(0,CAST(visit AS SIGNED)) FROM ${source.table}
      ON DUPLICATE KEY UPDATE view_count=GREATEST(view_count,VALUES(view_count))
    `, [source.entityType]);
  }
}
