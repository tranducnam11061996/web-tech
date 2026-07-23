import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';

type DbExecutor = Pool | PoolConnection;

export type ProductCategoryHierarchyRow = {
  id: number;
  parentId: number;
};

const CATEGORY_TREE_TTL_MS = 5 * 60_000;
type CachedProductCategoryHierarchy = {
  expiresAt: number;
  rows: ProductCategoryHierarchyRow[];
  parentById: Map<number, number>;
};
let hierarchyCache: CachedProductCategoryHierarchy | null = null;
let hierarchyFlight: Promise<CachedProductCategoryHierarchy> | null = null;

function normalizeRows(rows: RowDataPacket[]): ProductCategoryHierarchyRow[] {
  return rows
    .map((row) => ({ id: Number(row.id), parentId: Number(row.parentId || 0) }))
    .filter((row) => Number.isInteger(row.id) && row.id > 0);
}

export async function getProductCategoryHierarchy(db: DbExecutor = pool) {
  if (db !== pool) {
    const [rows] = await db.query<RowDataPacket[]>('SELECT id, parentId FROM idv_seller_category');
    const normalized = normalizeRows(rows);
    return {
      rows: normalized,
      parentById: new Map(normalized.map((row) => [row.id, row.parentId])),
    };
  }
  if (hierarchyCache && hierarchyCache.expiresAt > Date.now()) return hierarchyCache;
  if (hierarchyFlight) return hierarchyFlight;
  hierarchyFlight = pool.query<RowDataPacket[]>('SELECT id, parentId FROM idv_seller_category')
    .then(([rows]) => {
      const normalized = normalizeRows(rows);
      hierarchyCache = {
        expiresAt: Date.now() + CATEGORY_TREE_TTL_MS,
        rows: normalized,
        parentById: new Map(normalized.map((row) => [row.id, row.parentId])),
      };
      return hierarchyCache;
    })
    .finally(() => { hierarchyFlight = null; });
  return hierarchyFlight;
}

export function collectCategoryAncestors(categoryIds: number[], parentById: Map<number, number>) {
  const ancestors = new Set<number>();
  for (const categoryId of categoryIds) {
    let current = Number(categoryId);
    const visited = new Set<number>();
    while (current > 0 && !visited.has(current)) {
      visited.add(current);
      ancestors.add(current);
      current = Number(parentById.get(current) || 0);
    }
  }
  return [...ancestors];
}

export function collectCategoryDescendants(categoryIds: number[], rows: ProductCategoryHierarchyRow[]) {
  const childrenByParent = new Map<number, number[]>();
  for (const row of rows) {
    const children = childrenByParent.get(row.parentId) || [];
    children.push(row.id);
    childrenByParent.set(row.parentId, children);
  }
  const descendants = new Set<number>();
  const queue = categoryIds.map(Number).filter((id) => Number.isInteger(id) && id > 0);
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (descendants.has(current)) continue;
    descendants.add(current);
    queue.push(...(childrenByParent.get(current) || []));
  }
  return [...descendants];
}

export function canonicalizeCategoryRoots(categoryIds: number[], parentById: Map<number, number>) {
  const unique = Array.from(new Set(categoryIds.map(Number).filter((id) => Number.isInteger(id) && id > 0)));
  const selected = new Set(unique);
  return unique.filter((categoryId) => {
    let parentId = Number(parentById.get(categoryId) || 0);
    const visited = new Set<number>([categoryId]);
    while (parentId > 0 && !visited.has(parentId)) {
      if (selected.has(parentId)) return false;
      visited.add(parentId);
      parentId = Number(parentById.get(parentId) || 0);
    }
    return true;
  });
}

export function invalidateProductCategoryHierarchyCache() {
  hierarchyCache = null;
}
