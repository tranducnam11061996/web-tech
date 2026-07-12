import type { RowDataPacket } from 'mysql2';
import pool from '@/lib/db';

export type CategoryTrailItem = {
  id: number;
  name: string;
  slug: string;
};

type CategoryKind = 'product' | 'news';

type CategoryTrailRow = RowDataPacket & {
  id: number;
  name: string | null;
  url: string | null;
  parentId: number;
  depth: number;
};

const CATEGORY_TABLES: Record<CategoryKind, string> = {
  product: 'idv_seller_category',
  news: 'idv_seller_news_category',
};

export function parseLegacyCategoryIds(value: unknown): number[] {
  if (typeof value !== 'string') return [];

  const seen = new Set<number>();
  const ids: number[] = [];
  for (const part of value.split(',')) {
    const id = Number(part.trim());
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

export function pickProductCategoryId(
  legacyIds: number[],
  validIds: ReadonlySet<number>,
  fallbackId: number | null = null,
) {
  for (let index = legacyIds.length - 1; index >= 0; index -= 1) {
    if (validIds.has(legacyIds[index])) return legacyIds[index];
  }
  return fallbackId;
}

export function pickNewsCategoryId(
  primaryId: number,
  legacyIds: number[],
  validIds: ReadonlySet<number>,
  fallbackId: number | null = null,
) {
  if (primaryId > 0 && validIds.has(primaryId)) return primaryId;
  for (const id of legacyIds) {
    if (validIds.has(id)) return id;
  }
  return fallbackId;
}

export function normalizeCategoryTrailRows(
  rows: Array<Pick<CategoryTrailRow, 'id' | 'name' | 'url' | 'depth'>>,
): CategoryTrailItem[] {
  const uniqueRows = new Map<number, { id: number; name: string; slug: string; depth: number }>();
  for (const row of rows) {
    const id = Number(row.id);
    const name = String(row.name || '').trim();
    const slug = String(row.url || '').trim().replace(/^\/+|\/+$/g, '');
    const depth = Number(row.depth);
    if (!Number.isInteger(id) || id <= 0 || !name || !slug || !Number.isFinite(depth)) continue;
    const existing = uniqueRows.get(id);
    if (!existing || depth < existing.depth) uniqueRows.set(id, { id, name, slug, depth });
  }

  return [...uniqueRows.values()]
    .sort((left, right) => right.depth - left.depth)
    .map(({ id, name, slug }) => ({ id, name, slug }));
}

async function listValidCategoryIds(kind: CategoryKind, ids: number[]) {
  if (ids.length === 0) return new Set<number>();
  const table = CATEGORY_TABLES[kind];
  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await pool.query<Array<RowDataPacket & { id: number }>>(
    `SELECT id FROM ${table} WHERE status = 1 AND id IN (${placeholders})`,
    ids,
  );
  return new Set(rows.map((row) => Number(row.id)).filter((id) => Number.isInteger(id) && id > 0));
}

export async function getCategoryTrail(kind: CategoryKind, leafId: number): Promise<CategoryTrailItem[]> {
  if (!Number.isInteger(leafId) || leafId <= 0) return [];

  const table = CATEGORY_TABLES[kind];
  const [rows] = await pool.query<CategoryTrailRow[]>(
    `WITH RECURSIVE category_ancestors AS (
       SELECT id, name, url, parentId, 0 AS depth,
         CAST(CONCAT(',', id, ',') AS CHAR(2048)) AS visited
       FROM ${table}
       WHERE id = ?
       UNION ALL
       SELECT parent.id, parent.name, parent.url, parent.parentId,
         child.depth + 1 AS depth,
         CONCAT(child.visited, parent.id, ',') AS visited
       FROM ${table} parent
       JOIN category_ancestors child ON parent.id = child.parentId
       WHERE child.depth < 9
         AND LOCATE(CONCAT(',', parent.id, ','), child.visited) = 0
     )
     SELECT id, name, url, parentId, depth
     FROM category_ancestors`,
    [leafId],
  );

  return normalizeCategoryTrailRows(rows);
}

async function findProductFallbackCategoryId(productId: number) {
  const [rows] = await pool.query<Array<RowDataPacket & { id: number }>>(
    `SELECT c.id
     FROM idv_product_category pc
     JOIN idv_seller_category c ON c.id = pc.category_id
     WHERE pc.pro_id = ? AND pc.status = 1 AND c.status = 1
     ORDER BY (LENGTH(c.catPath) - LENGTH(REPLACE(c.catPath, ':', ''))) DESC,
       pc.ordering DESC, c.ordering DESC, c.id DESC
     LIMIT 1`,
    [productId],
  );
  return rows[0] ? Number(rows[0].id) : null;
}

export async function getProductCategoryTrail(productId: number, productCategoryCsv: unknown) {
  const legacyIds = parseLegacyCategoryIds(productCategoryCsv);
  const validIds = await listValidCategoryIds('product', legacyIds);
  const legacyLeafId = pickProductCategoryId(legacyIds, validIds);
  const leafId = legacyLeafId || await findProductFallbackCategoryId(productId);
  return leafId ? getCategoryTrail('product', leafId) : [];
}

async function findNewsFallbackCategoryId(articleId: number) {
  const [rows] = await pool.query<Array<RowDataPacket & { id: number }>>(
    `SELECT c.id
     FROM idv_article_category ac
     JOIN idv_seller_news_category c ON c.id = ac.category_id
     WHERE ac.article_id = ? AND ac.status = 1 AND c.status = 1
     ORDER BY ac.ordering DESC, c.ordering DESC, c.id ASC
     LIMIT 1`,
    [articleId],
  );
  return rows[0] ? Number(rows[0].id) : null;
}

export async function getNewsCategoryTrailForArticle(
  articleId: number,
  primaryCategoryId: unknown,
  articleCategoryCsv: unknown,
) {
  const primaryId = Number(primaryCategoryId || 0);
  const legacyIds = parseLegacyCategoryIds(articleCategoryCsv);
  const candidateIds = primaryId > 0 ? [primaryId, ...legacyIds] : legacyIds;
  const validIds = await listValidCategoryIds('news', candidateIds);
  const legacyLeafId = pickNewsCategoryId(primaryId, legacyIds, validIds);
  const leafId = legacyLeafId || await findNewsFallbackCategoryId(articleId);
  return leafId ? getCategoryTrail('news', leafId) : [];
}
