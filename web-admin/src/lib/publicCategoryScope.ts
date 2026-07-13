import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';

type Db = Pool | PoolConnection;

export const PUBLIC_CATEGORY_SCOPE_MAX_DEPTH = 32;
export const PUBLIC_CATEGORY_SCOPE_MAX_IDS = 1_000;

export function normalizePublicCategoryScopeRows(rows: Array<{ id?: unknown }>) {
  const ids = Array.from(new Set(rows.map((row) => Number(row.id || 0))
    .filter((id) => Number.isSafeInteger(id) && id > 0))).sort((left, right) => left - right);
  if (ids.length > PUBLIC_CATEGORY_SCOPE_MAX_IDS) {
    throw new Error(`Category scope exceeds ${PUBLIC_CATEGORY_SCOPE_MAX_IDS} rows`);
  }
  return ids;
}

export function effectivePublicCategoryScope(ids: number[]) {
  return ids.length ? ids : [0];
}

export async function loadEnabledPublicCategoryScope(categoryId: number, db: Db = pool) {
  if (!Number.isSafeInteger(categoryId) || categoryId <= 0) throw new Error('Invalid category scope root');
  const [rows] = await db.query<RowDataPacket[]>(`
    WITH RECURSIVE category_scope AS (
      SELECT c.id,0 AS depth,CAST(CONCAT(',',c.id,',') AS CHAR(12000)) AS visited
      FROM idv_seller_category c
      WHERE c.id=? AND c.status=1
      UNION ALL
      SELECT child.id,scope.depth+1,CONCAT(scope.visited,child.id,',')
      FROM category_scope scope
      JOIN idv_seller_category child
        ON child.parentId=scope.id AND child.status=1
      WHERE scope.depth<?
        AND LOCATE(CONCAT(',',child.id,','),scope.visited)=0
    )
    SELECT DISTINCT id FROM category_scope ORDER BY id LIMIT ${PUBLIC_CATEGORY_SCOPE_MAX_IDS + 1}
  `, [categoryId, PUBLIC_CATEGORY_SCOPE_MAX_DEPTH]);
  return normalizePublicCategoryScopeRows(rows as Array<{ id?: unknown }>);
}
