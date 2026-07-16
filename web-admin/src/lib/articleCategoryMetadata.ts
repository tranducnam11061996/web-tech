import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import pool from './db';
import { AdminApiError } from './admin/common';

export const ARTICLE_CATEGORY_METADATA_TABLE = 'web_admin_article_category_meta';

type Db = Pool | PoolConnection;

export function normalizeArticleCategoryFeatured(value: unknown): 0 | 1 {
  if (value === 1 || value === '1' || value === true) return 1;
  if (value === 0 || value === '0' || value === false) return 0;
  throw new AdminApiError(400, 'BAD_REQUEST', 'Gia tri noi bat chi duoc la 0 hoac 1', {
    isFeatured: 'invalid',
  });
}

export async function ensureArticleCategoryMetadataTable(db: Db = pool) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS ${ARTICLE_CATEGORY_METADATA_TABLE} (
      category_id int unsigned NOT NULL,
      is_featured tinyint(1) NOT NULL DEFAULT 0,
      updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (category_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await db.query(`
    INSERT IGNORE INTO ${ARTICLE_CATEGORY_METADATA_TABLE} (category_id, is_featured)
    SELECT id, 0 FROM idv_seller_news_category
  `);
}

async function assertMetadataTableExists(db: Db) {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT 1 FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
    [ARTICLE_CATEGORY_METADATA_TABLE],
  );
  if (!rows[0]) {
    throw new AdminApiError(
      500,
      'INTERNAL_ERROR',
      `Chua co bang ${ARTICLE_CATEGORY_METADATA_TABLE}. Hay chay admin:migrate truoc khi luu.`,
    );
  }
}

export async function saveArticleCategoryFeatured(categoryId: number, value: unknown, db: Db = pool) {
  const isFeatured = normalizeArticleCategoryFeatured(value);
  await assertMetadataTableExists(db);
  await db.query(
    `INSERT INTO ${ARTICLE_CATEGORY_METADATA_TABLE} (category_id, is_featured)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE is_featured = VALUES(is_featured)`,
    [categoryId, isFeatured],
  );
  return isFeatured;
}

export async function deleteArticleCategoryMetadata(categoryId: number, db: Db = pool) {
  await assertMetadataTableExists(db);
  await db.query(`DELETE FROM ${ARTICLE_CATEGORY_METADATA_TABLE} WHERE category_id = ?`, [categoryId]);
}
