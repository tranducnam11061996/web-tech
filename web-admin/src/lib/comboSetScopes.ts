import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { AdminApiError, withTransaction } from '@/lib/admin/common';
import { buildPagination } from '@/lib/admin/pagination';
import {
  canonicalizeCategoryRoots,
  collectCategoryAncestors,
  collectCategoryDescendants,
  getProductCategoryHierarchy,
} from '@/lib/categoryHierarchy';
import { parseLegacyCategoryIds } from '@/lib/publicBreadcrumbs';
import { clearPublicCatalogDetailCache } from '@/lib/publicProductCache';
import { resolveProductImageUrl } from '@/lib/productImageUrl';

type DbExecutor = Pool | PoolConnection;

export type ComboSetScopeCategory = {
  id: number;
  name: string;
  parentId: number;
  status: number;
};

export type ComboSetScopeProduct = {
  id: number;
  sku: string;
  name: string;
  price: number;
  marketPrice: number;
  imageUrl: string;
  status: string;
  direct: boolean;
  categorySources: Array<{ id: number; name: string }>;
};

const MAX_CATEGORY_ROOTS = 100;

export async function ensureComboSetCategoryTable(db: DbExecutor = pool) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS web_admin_combo_set_categories (
      combo_set_id int NOT NULL,
      category_id int unsigned NOT NULL,
      created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by varchar(50) CHARACTER SET utf8mb4 NOT NULL DEFAULT '',
      PRIMARY KEY (combo_set_id, category_id),
      KEY idx_combo_set_categories_category (category_id, combo_set_id),
      CONSTRAINT fk_combo_set_categories_combo_set
        FOREIGN KEY (combo_set_id) REFERENCES combo_set(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function assertComboSet(connection: PoolConnection, comboSetId: number) {
  const [rows] = await connection.query<RowDataPacket[]>('SELECT id FROM combo_set WHERE id=? LIMIT 1 FOR UPDATE', [comboSetId]);
  if (!rows[0]) throw new AdminApiError(404, 'NOT_FOUND', 'Không tìm thấy combo set.');
}

function normalizePositiveId(value: unknown, field: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AdminApiError(400, 'BAD_REQUEST', `${field} không hợp lệ.`, { [field]: 'invalid' });
  }
  return id;
}

export async function getProductCategoryAncestors(db: DbExecutor, productId: number) {
  const [[productRows], hierarchy] = await Promise.all([
    db.query<RowDataPacket[]>(`
      SELECT p.product_cat, pc.category_id
      FROM idv_sell_product_store p
      LEFT JOIN idv_product_category pc ON pc.pro_id=p.id AND pc.status=1
      WHERE p.id=?
    `, [productId]),
    getProductCategoryHierarchy(db),
  ]);
  if (productRows.length === 0) return [];
  const directIds = new Set<number>(parseLegacyCategoryIds(String(productRows[0].product_cat || '')));
  for (const row of productRows) {
    const categoryId = Number(row.category_id || 0);
    if (categoryId > 0) directIds.add(categoryId);
  }
  return collectCategoryAncestors([...directIds], hierarchy.parentById);
}

export async function isProductInComboSetScope(db: DbExecutor, comboSetId: number, productId: number) {
  const [directRows] = await db.query<RowDataPacket[]>(
    'SELECT id FROM combo_set_product WHERE set_id=? AND product_id=? LIMIT 1',
    [comboSetId, productId],
  );
  if (directRows[0]) return true;
  const ancestors = await getProductCategoryAncestors(db, productId);
  if (ancestors.length === 0) return false;
  const [categoryRows] = await db.query<RowDataPacket[]>(
    'SELECT category_id FROM web_admin_combo_set_categories WHERE combo_set_id=? AND category_id IN (?) LIMIT 1',
    [comboSetId, ancestors],
  );
  return Boolean(categoryRows[0]);
}

export async function getApplicableComboSetIds(db: DbExecutor, productId: number) {
  const ancestors = await getProductCategoryAncestors(db, productId);
  const categorySql = ancestors.length > 0
    ? 'UNION SELECT combo_set_id AS set_id FROM web_admin_combo_set_categories WHERE category_id IN (?)'
    : '';
  const bindings: unknown[] = [productId];
  if (ancestors.length > 0) bindings.push(ancestors);
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT DISTINCT applicable.set_id
    FROM (
      SELECT set_id FROM combo_set_product WHERE product_id=?
      ${categorySql}
    ) applicable
  `, bindings);
  return rows.map((row) => Number(row.set_id)).filter((id) => id > 0);
}

function buildEffectiveScopeSql(descendantIds: number[]) {
  const categoryBranch = descendantIds.length > 0
    ? `UNION ALL
       SELECT pc.pro_id AS product_id, 0 AS is_direct, 0 AS relation_id
       FROM idv_product_category pc
       WHERE pc.status=1 AND pc.category_id IN (?)`
    : '';
  return `
    SELECT scoped.product_id, MAX(scoped.is_direct) AS is_direct, MAX(scoped.relation_id) AS relation_id
    FROM (
      SELECT csp.product_id, 1 AS is_direct, csp.id AS relation_id
      FROM combo_set_product csp
      WHERE csp.set_id=?
      ${categoryBranch}
    ) scoped
    GROUP BY scoped.product_id
  `;
}

export async function getAdminComboSetScope(comboSetId: number, page: number, limit: number) {
  if (!Number.isInteger(comboSetId) || comboSetId <= 0) throw new AdminApiError(404, 'NOT_FOUND', 'Không tìm thấy combo set.');
  const safeLimit = Math.min(100, Math.max(1, Math.floor(limit || 20)));
  const safePage = Math.max(1, Math.floor(page || 1));
  const [[comboRows], [categoryRows], [directRows], [allCategoryRows], [brandRows], hierarchy] = await Promise.all([
    pool.query<RowDataPacket[]>('SELECT id,title FROM combo_set WHERE id=? LIMIT 1', [comboSetId]),
    pool.query<RowDataPacket[]>(`
      SELECT scope.category_id AS id,c.name,c.parentId,c.status
      FROM web_admin_combo_set_categories scope
      LEFT JOIN idv_seller_category c ON c.id=scope.category_id
      WHERE scope.combo_set_id=?
      ORDER BY c.name ASC,scope.category_id ASC
    `, [comboSetId]),
    pool.query<RowDataPacket[]>('SELECT product_id FROM combo_set_product WHERE set_id=? ORDER BY id DESC', [comboSetId]),
    pool.query<RowDataPacket[]>('SELECT id,name,parentId,status FROM idv_seller_category ORDER BY parentId ASC,ordering DESC,id DESC'),
    pool.query<RowDataPacket[]>(`
      SELECT b.id,b.name,COUNT(p.id) AS productCount
      FROM idv_brand b JOIN idv_sell_product_store p ON p.brandId=b.id
      GROUP BY b.id,b.name ORDER BY b.name ASC LIMIT 1000
    `),
    getProductCategoryHierarchy(),
  ]);
  const combo = comboRows[0];
  if (!combo) throw new AdminApiError(404, 'NOT_FOUND', 'Không tìm thấy combo set.');

  const selectedCategories: ComboSetScopeCategory[] = categoryRows.map((row) => ({
    id: Number(row.id),
    name: String(row.name || ''),
    parentId: Number(row.parentId || 0),
    status: Number(row.status || 0),
  }));
  const selectedIds = selectedCategories.map((category) => category.id);
  const descendantIds = collectCategoryDescendants(selectedIds, hierarchy.rows);
  const effectiveSql = buildEffectiveScopeSql(descendantIds);
  const bindings: unknown[] = [comboSetId];
  if (descendantIds.length > 0) bindings.push(descendantIds);
  const [[countRows], [scopeRows]] = await Promise.all([
    pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM (${effectiveSql}) effective`, bindings),
    pool.query<RowDataPacket[]>(`
      SELECT effective.product_id,effective.is_direct,effective.relation_id
      FROM (${effectiveSql}) effective
      ORDER BY effective.is_direct DESC,effective.relation_id DESC,effective.product_id DESC
      LIMIT ? OFFSET ?
    `, [...bindings, safeLimit, (safePage - 1) * safeLimit]),
  ]);
  const productIds = scopeRows.map((row) => Number(row.product_id));
  const directByProduct = new Map(scopeRows.map((row) => [Number(row.product_id), Boolean(row.is_direct)]));
  let products: ComboSetScopeProduct[] = [];
  if (productIds.length > 0) {
    const [[productRows], [productCategoryRows]] = await Promise.all([
      pool.query<RowDataPacket[]>(`
        SELECT p.id,p.storeSKU,p.proName,p.proThum,p.product_cat,pr.price,pr.market_price,pr.isOn
        FROM idv_sell_product_store p
        LEFT JOIN idv_sell_product_price pr ON pr.id=p.id
        WHERE p.id IN (?)
      `, [productIds]),
      pool.query<RowDataPacket[]>('SELECT pro_id,category_id FROM idv_product_category WHERE status=1 AND pro_id IN (?)', [productIds]),
    ]);
    const linkedByProduct = new Map<number, Set<number>>();
    for (const row of productCategoryRows) {
      const productSet = linkedByProduct.get(Number(row.pro_id)) || new Set<number>();
      productSet.add(Number(row.category_id));
      linkedByProduct.set(Number(row.pro_id), productSet);
    }
    const sourceById = new Map(selectedCategories.map((category) => [category.id, category]));
    const rowById = new Map(productRows.map((row) => [Number(row.id), row]));
    products = productIds.flatMap((productId) => {
      const row = rowById.get(productId);
      if (!row) return [];
      const directCategoryIds = linkedByProduct.get(productId) || new Set<number>();
      for (const id of parseLegacyCategoryIds(String(row.product_cat || ''))) directCategoryIds.add(id);
      const ancestors = new Set(collectCategoryAncestors([...directCategoryIds], hierarchy.parentById));
      const categorySources = selectedIds
        .filter((categoryId) => ancestors.has(categoryId))
        .map((categoryId) => sourceById.get(categoryId))
        .filter((category): category is ComboSetScopeCategory => Boolean(category))
        .map((category) => ({ id: category.id, name: category.name || `Danh mục #${category.id}` }));
      return [{
        id: productId,
        sku: String(row.storeSKU || ''),
        name: String(row.proName || ''),
        price: Number(row.price || 0),
        marketPrice: Number(row.market_price || 0),
        imageUrl: resolveProductImageUrl(row.proThum, 'https://placehold.co/60x60/111115/71717a?text=SP'),
        status: String(row.isOn || 0),
        direct: Boolean(directByProduct.get(productId)),
        categorySources,
      }];
    });
  }
  const total = Number(countRows[0]?.total || 0);
  return {
    combo: { id: comboSetId, title: String(combo.title || '') },
    products,
    pagination: buildPagination(total, safePage, safeLimit),
    effectiveProductCount: total,
    directProductIds: directRows.map((row) => Number(row.product_id)),
    selectedCategories,
    categories: allCategoryRows.map((row) => ({
      id: Number(row.id),
      name: String(row.name || ''),
      parentId: Number(row.parentId || 0),
      status: Number(row.status || 0),
    })),
    brands: brandRows.map((row) => ({
      id: Number(row.id),
      name: String(row.name || ''),
      productCount: Number(row.productCount || 0),
    })),
  };
}

export async function updateAdminComboSetScope(comboSetIdValue: unknown, payload: unknown, actorName: string) {
  const comboSetId = normalizePositiveId(comboSetIdValue, 'comboSetId');
  const source = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  const action = String(source.action || '');
  if (!['add-product', 'remove-product', 'replace-categories'].includes(action)) {
    throw new AdminApiError(400, 'BAD_REQUEST', 'Thao tác phạm vi combo không hợp lệ.');
  }
  const unixTime = Math.floor(Date.now() / 1000);
  const result = await withTransaction(async (connection) => {
    await assertComboSet(connection, comboSetId);
    if (action === 'add-product') {
      const productId = normalizePositiveId(source.productId, 'productId');
      const [productRows] = await connection.query<RowDataPacket[]>('SELECT id FROM idv_sell_product_store WHERE id=? LIMIT 1', [productId]);
      if (!productRows[0]) throw new AdminApiError(400, 'BAD_REQUEST', 'Sản phẩm không tồn tại.', { productId: 'invalid' });
      await connection.query(`
        INSERT INTO combo_set_product
          (product_id,set_id,ordering,create_time,create_by,last_update,last_update_by)
        VALUES (?, ?, (SELECT COALESCE(MAX(existing.ordering),-1)+1 FROM combo_set_product existing WHERE existing.product_id=?), ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE product_id=VALUES(product_id)
      `, [productId, comboSetId, productId, unixTime, actorName.slice(0, 50), unixTime, actorName.slice(0, 50)]);
      await connection.query(
        'UPDATE combo_set SET product_count=(SELECT COUNT(*) FROM combo_set_product WHERE set_id=?),last_update=?,last_update_by=? WHERE id=?',
        [comboSetId, unixTime, actorName.slice(0, 50), comboSetId],
      );
      return { action, productId };
    }
    if (action === 'remove-product') {
      const productId = normalizePositiveId(source.productId, 'productId');
      await connection.query('DELETE FROM combo_set_product WHERE set_id=? AND product_id=?', [comboSetId, productId]);
      await connection.query(
        'UPDATE combo_set SET product_count=(SELECT COUNT(*) FROM combo_set_product WHERE set_id=?),last_update=?,last_update_by=? WHERE id=?',
        [comboSetId, unixTime, actorName.slice(0, 50), comboSetId],
      );
      return { action, productId };
    }
    const rawCategoryIds = Array.isArray(source.categoryIds) ? source.categoryIds : [];
    const categoryIds = Array.from(new Set(rawCategoryIds.map(Number).filter((id) => Number.isInteger(id) && id > 0)));
    if (categoryIds.length > MAX_CATEGORY_ROOTS) {
      throw new AdminApiError(400, 'BAD_REQUEST', `Chỉ hỗ trợ tối đa ${MAX_CATEGORY_ROOTS} danh mục gốc.`, { categoryIds: 'too_many' });
    }
    const [[categoryRows], [existingScopeRows]] = await Promise.all([
      connection.query<RowDataPacket[]>('SELECT id,parentId FROM idv_seller_category'),
      connection.query<RowDataPacket[]>('SELECT category_id FROM web_admin_combo_set_categories WHERE combo_set_id=? FOR UPDATE', [comboSetId]),
    ]);
    const categoryById = new Map(categoryRows.map((row) => [Number(row.id), Number(row.parentId || 0)]));
    const existingScopeIds = new Set(existingScopeRows.map((row) => Number(row.category_id)));
    const missingIds = categoryIds.filter((id) => !categoryById.has(id) && !existingScopeIds.has(id));
    if (missingIds.length > 0) {
      throw new AdminApiError(400, 'BAD_REQUEST', `Danh mục không tồn tại: ${missingIds.slice(0, 10).join(', ')}.`, { categoryIds: 'invalid' });
    }
    for (const legacyId of categoryIds) {
      if (!categoryById.has(legacyId)) categoryById.set(legacyId, 0);
    }
    const canonicalIds = canonicalizeCategoryRoots(categoryIds, categoryById);
    await connection.query('DELETE FROM web_admin_combo_set_categories WHERE combo_set_id=?', [comboSetId]);
    if (canonicalIds.length > 0) {
      await connection.query<ResultSetHeader>(
        'INSERT INTO web_admin_combo_set_categories (combo_set_id,category_id,created_by) VALUES ?',
        [canonicalIds.map((categoryId) => [comboSetId, categoryId, actorName.slice(0, 50)])],
      );
    }
    await connection.query('UPDATE combo_set SET last_update=?,last_update_by=? WHERE id=?', [unixTime, actorName.slice(0, 50), comboSetId]);
    return { action, categoryIds: canonicalIds };
  });
  clearPublicCatalogDetailCache();
  return result;
}
