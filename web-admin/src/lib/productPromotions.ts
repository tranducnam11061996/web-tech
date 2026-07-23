import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { AdminApiError, requireText, toBoolInt, toInt } from '@/lib/admin/common';
import { buildPagination, parsePaginationParams } from '@/lib/admin/pagination';
import { clearPublicCatalogDetailCache } from '@/lib/publicProductCache';
import { parseLegacyCategoryIds } from '@/lib/publicBreadcrumbs';
import {
  collectCategoryAncestors,
  getProductCategoryHierarchy,
  invalidateProductCategoryHierarchyCache,
} from '@/lib/categoryHierarchy';
export { collectCategoryAncestors } from '@/lib/categoryHierarchy';

type DbExecutor = Pool | PoolConnection;

export type ProductPromotionState = 'disabled' | 'scheduled' | 'active' | 'expired';

export type ProductPromotionInput = {
  displayText: string;
  detailUrl: string;
  status: number;
  displayOrder: number;
  startsAt: string | null;
  endsAt: string | null;
  productIds: number[];
  categoryIds: number[];
};

export type PublicProductPromotion = {
  id: number;
  text: string;
  detailUrl: string;
};

const MAX_PRODUCT_IDS = 500;
const MAX_CATEGORY_IDS = 100;

export async function ensureProductPromotionTables(db: DbExecutor = pool) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS web_admin_product_promotions (
      id int unsigned NOT NULL AUTO_INCREMENT,
      display_text varchar(1000) CHARACTER SET utf8mb4 NOT NULL,
      detail_url varchar(1024) CHARACTER SET utf8mb4 NOT NULL,
      status tinyint(1) NOT NULL DEFAULT 1,
      display_order smallint unsigned NOT NULL DEFAULT 0,
      starts_at datetime NULL,
      ends_at datetime NULL,
      created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_product_promotions_active_order (status, display_order, id),
      KEY idx_product_promotions_schedule (status, starts_at, ends_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS web_admin_product_promotion_products (
      promotion_id int unsigned NOT NULL,
      product_id int unsigned NOT NULL,
      PRIMARY KEY (promotion_id, product_id),
      KEY idx_product_promotion_products_product (product_id, promotion_id),
      CONSTRAINT fk_product_promotion_products_promotion
        FOREIGN KEY (promotion_id) REFERENCES web_admin_product_promotions(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS web_admin_product_promotion_categories (
      promotion_id int unsigned NOT NULL,
      category_id int unsigned NOT NULL,
      PRIMARY KEY (promotion_id, category_id),
      KEY idx_product_promotion_categories_category (category_id, promotion_id),
      CONSTRAINT fk_product_promotion_categories_promotion
        FOREIGN KEY (promotion_id) REFERENCES web_admin_product_promotions(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

export function normalizePromotionDetailUrl(value: unknown) {
  const input = String(value ?? '').trim();
  if (!input) return '';
  const url = requireText(input, 'detailUrl', 'Đường dẫn chi tiết', 1024);
  if (/[\u0000-\u001F\u007F]/.test(url)) {
    throw new AdminApiError(400, 'BAD_REQUEST', 'Đường dẫn chứa ký tự không hợp lệ.', { detailUrl: 'invalid' });
  }
  if (url.startsWith('/') && !url.startsWith('//') && !url.includes('\\') && !/\s/.test(url)) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' && parsed.username === '' && parsed.password === '') return parsed.toString();
  } catch { /* handled below */ }
  throw new AdminApiError(400, 'BAD_REQUEST', 'Đường dẫn phải là đường dẫn nội bộ hoặc URL HTTPS hợp lệ.', { detailUrl: 'invalid' });
}

function parseVietnamDateTime(value: unknown) {
  const text = String(value || '').trim();
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)) {
    throw new AdminApiError(400, 'BAD_REQUEST', 'Thời gian áp dụng không hợp lệ.');
  }
  const utc = new Date(`${text}:00+07:00`);
  if (Number.isNaN(utc.getTime())) throw new AdminApiError(400, 'BAD_REQUEST', 'Thời gian áp dụng không hợp lệ.');
  return utc.toISOString().slice(0, 19).replace('T', ' ');
}

function optionalIds(value: unknown, max: number, field: string) {
  const source = Array.isArray(value) ? value : [];
  const ids = Array.from(new Set(source.map((item) => toInt(item)).filter((id) => id > 0)));
  if (ids.length > max) throw new AdminApiError(400, 'BAD_REQUEST', `${field} chỉ hỗ trợ tối đa ${max} mục.`);
  return ids;
}

export function parseProductPromotionPayload(payload: unknown): ProductPromotionInput {
  const source = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  const displayText = requireText(source.displayText, 'displayText', 'Nội dung hiển thị', 1000);
  const detailUrl = normalizePromotionDetailUrl(source.detailUrl);
  const displayOrderText = String(source.displayOrder ?? '').trim();
  const displayOrder = displayOrderText ? Number(displayOrderText) : 0;
  if ((displayOrderText && !/^\d+$/.test(displayOrderText)) || !Number.isSafeInteger(displayOrder) || displayOrder < 0 || displayOrder > 65_535) {
    throw new AdminApiError(400, 'BAD_REQUEST', 'Thứ tự ưu tiên phải từ 0 đến 65.535.', { displayOrder: 'invalid' });
  }
  const startsAt = parseVietnamDateTime(source.startsAt);
  const endsAt = parseVietnamDateTime(source.endsAt);
  if ((startsAt && !endsAt) || (!startsAt && endsAt) || (startsAt && endsAt && startsAt >= endsAt)) {
    throw new AdminApiError(400, 'BAD_REQUEST', 'Thời gian bắt đầu và kết thúc phải đầy đủ, hợp lệ.');
  }
  const productIds = optionalIds(source.productIds, MAX_PRODUCT_IDS, 'Danh sách SKU');
  const categoryIds = optionalIds(source.categoryIds, MAX_CATEGORY_IDS, 'Danh sách danh mục');
  if (productIds.length === 0 && categoryIds.length === 0) {
    throw new AdminApiError(400, 'BAD_REQUEST', 'Cần chọn ít nhất một SKU hoặc danh mục.', { scope: 'required' });
  }
  return {
    displayText,
    detailUrl,
    status: toBoolInt(source.status, 1),
    displayOrder,
    startsAt,
    endsAt,
    productIds,
    categoryIds,
  };
}

export function resolveProductPromotionState(
  status: number,
  startsAt: Date | string | null,
  endsAt: Date | string | null,
  now = new Date(),
): ProductPromotionState {
  if (Number(status) !== 1) return 'disabled';
  if (startsAt && new Date(startsAt).getTime() > now.getTime()) return 'scheduled';
  if (endsAt && new Date(endsAt).getTime() <= now.getTime()) return 'expired';
  return 'active';
}

function stateSql() {
  return `CASE
    WHEN p.status = 0 THEN 'disabled'
    WHEN p.starts_at IS NOT NULL AND p.starts_at > UTC_TIMESTAMP() THEN 'scheduled'
    WHEN p.ends_at IS NOT NULL AND p.ends_at <= UTC_TIMESTAMP() THEN 'expired'
    ELSE 'active'
  END`;
}

export async function listAdminProductPromotions(url: string) {
  const searchParams = new URL(url).searchParams;
  const { page, limit, offset } = parsePaginationParams(searchParams);
  const search = String(searchParams.get('search') || searchParams.get('q') || '').trim().slice(0, 200);
  const state = String(searchParams.get('state') || '').trim();
  const scope = String(searchParams.get('scope') || '').trim();
  const filters: string[] = [];
  const bindings: unknown[] = [];
  if (search) {
    filters.push('(p.display_text LIKE ? OR p.detail_url LIKE ?)');
    bindings.push(`%${search}%`, `%${search}%`);
  }
  if (['disabled', 'scheduled', 'active', 'expired'].includes(state)) {
    filters.push(`${stateSql()} = ?`);
    bindings.push(state);
  }
  if (scope === 'sku') filters.push('EXISTS (SELECT 1 FROM web_admin_product_promotion_products pp WHERE pp.promotion_id=p.id) AND NOT EXISTS (SELECT 1 FROM web_admin_product_promotion_categories pc WHERE pc.promotion_id=p.id)');
  if (scope === 'category') filters.push('NOT EXISTS (SELECT 1 FROM web_admin_product_promotion_products pp WHERE pp.promotion_id=p.id) AND EXISTS (SELECT 1 FROM web_admin_product_promotion_categories pc WHERE pc.promotion_id=p.id)');
  if (scope === 'mixed') filters.push('EXISTS (SELECT 1 FROM web_admin_product_promotion_products pp WHERE pp.promotion_id=p.id) AND EXISTS (SELECT 1 FROM web_admin_product_promotion_categories pc WHERE pc.promotion_id=p.id)');
  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
  const [countResult, listResult] = await Promise.all([
    pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM web_admin_product_promotions p ${where}`, bindings),
    pool.query<RowDataPacket[]>(`
      SELECT p.id, p.display_text, p.detail_url, p.status, p.display_order,
        DATE_FORMAT(DATE_ADD(p.starts_at, INTERVAL 7 HOUR), '%Y-%m-%dT%H:%i') AS starts_at,
        DATE_FORMAT(DATE_ADD(p.ends_at, INTERVAL 7 HOUR), '%Y-%m-%dT%H:%i') AS ends_at,
        ${stateSql()} AS state,
        (SELECT COUNT(*) FROM web_admin_product_promotion_products pp WHERE pp.promotion_id=p.id) AS product_count,
        (SELECT COUNT(*) FROM web_admin_product_promotion_categories pc WHERE pc.promotion_id=p.id) AS category_count
      FROM web_admin_product_promotions p
      ${where}
      ORDER BY p.display_order ASC, (p.ends_at IS NULL) ASC, p.ends_at ASC, p.id DESC
      LIMIT ? OFFSET ?
    `, [...bindings, limit, offset]),
  ]);
  return {
    items: listResult[0].map((row) => ({
      id: Number(row.id), displayText: String(row.display_text), detailUrl: String(row.detail_url),
      status: Number(row.status), displayOrder: Number(row.display_order), state: String(row.state) as ProductPromotionState,
      startsAt: row.starts_at ? String(row.starts_at) : null, endsAt: row.ends_at ? String(row.ends_at) : null,
      productCount: Number(row.product_count), categoryCount: Number(row.category_count),
    })),
    pagination: buildPagination(Number(countResult[0][0]?.total || 0), page, limit),
  };
}

export async function getAdminProductPromotion(id: number) {
  if (!Number.isInteger(id) || id <= 0) throw new AdminApiError(404, 'NOT_FOUND', 'Không tìm thấy chương trình khuyến mãi.');
  const [[rows], [products], [categories]] = await Promise.all([
    pool.query<RowDataPacket[]>(`
      SELECT p.id, p.display_text, p.detail_url, p.status, p.display_order,
        DATE_FORMAT(DATE_ADD(p.starts_at, INTERVAL 7 HOUR), '%Y-%m-%dT%H:%i') AS starts_at,
        DATE_FORMAT(DATE_ADD(p.ends_at, INTERVAL 7 HOUR), '%Y-%m-%dT%H:%i') AS ends_at,
        ${stateSql()} AS state
      FROM web_admin_product_promotions p WHERE p.id=? LIMIT 1
    `, [id]),
    pool.query<RowDataPacket[]>(`
      SELECT pp.product_id AS id, p.storeSKU AS sku, p.proName AS name, COALESCE(pr.isOn,0) AS status
      FROM web_admin_product_promotion_products pp
      LEFT JOIN idv_sell_product_store p ON p.id=pp.product_id
      LEFT JOIN idv_sell_product_price pr ON pr.id=p.id
      WHERE pp.promotion_id=? ORDER BY p.proName ASC, pp.product_id ASC
    `, [id]),
    pool.query<RowDataPacket[]>(`
      SELECT pc.category_id AS id, c.name, c.parentId AS parent_id, c.status
      FROM web_admin_product_promotion_categories pc
      LEFT JOIN idv_seller_category c ON c.id=pc.category_id
      WHERE pc.promotion_id=? ORDER BY c.name ASC, pc.category_id ASC
    `, [id]),
  ]);
  const row = rows[0];
  if (!row) throw new AdminApiError(404, 'NOT_FOUND', 'Không tìm thấy chương trình khuyến mãi.');
  return {
    id: Number(row.id), displayText: String(row.display_text), detailUrl: String(row.detail_url),
    status: Number(row.status), displayOrder: Number(row.display_order), state: String(row.state) as ProductPromotionState,
    startsAt: row.starts_at ? String(row.starts_at) : null, endsAt: row.ends_at ? String(row.ends_at) : null,
    products: products.map((product) => ({ id: Number(product.id), sku: String(product.sku || ''), name: String(product.name || ''), status: Number(product.status) })),
    categories: categories.map((category) => ({ id: Number(category.id), name: String(category.name || ''), parentId: Number(category.parent_id || 0), status: Number(category.status || 0) })),
  };
}

async function assertScopeExists(connection: PoolConnection, value: ProductPromotionInput) {
  const checks: Promise<[RowDataPacket[], unknown]>[] = [];
  if (value.productIds.length > 0) checks.push(connection.query<RowDataPacket[]>('SELECT id FROM idv_sell_product_store WHERE id IN (?)', [value.productIds]));
  if (value.categoryIds.length > 0) checks.push(connection.query<RowDataPacket[]>('SELECT id FROM idv_seller_category WHERE id IN (?)', [value.categoryIds]));
  const results = await Promise.all(checks);
  let index = 0;
  if (value.productIds.length > 0 && results[index++][0].length !== value.productIds.length) {
    throw new AdminApiError(400, 'BAD_REQUEST', 'Danh sách SKU chứa sản phẩm không tồn tại.', { productIds: 'invalid' });
  }
  if (value.categoryIds.length > 0 && results[index][0].length !== value.categoryIds.length) {
    throw new AdminApiError(400, 'BAD_REQUEST', 'Danh sách danh mục chứa mục không tồn tại.', { categoryIds: 'invalid' });
  }
}

export async function saveAdminProductPromotion(payload: unknown, promotionId?: number) {
  const value = parseProductPromotionPayload(payload);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await assertScopeExists(connection, value);
    let id = Number(promotionId || 0);
    if (id > 0) {
      const [current] = await connection.query<RowDataPacket[]>('SELECT id FROM web_admin_product_promotions WHERE id=? FOR UPDATE', [id]);
      if (!current[0]) throw new AdminApiError(404, 'NOT_FOUND', 'Không tìm thấy chương trình khuyến mãi.');
      await connection.query(`UPDATE web_admin_product_promotions
        SET display_text=?, detail_url=?, status=?, display_order=?, starts_at=?, ends_at=? WHERE id=?`,
      [value.displayText, value.detailUrl, value.status, value.displayOrder, value.startsAt, value.endsAt, id]);
    } else {
      const [result] = await connection.query<ResultSetHeader>(`INSERT INTO web_admin_product_promotions
        (display_text,detail_url,status,display_order,starts_at,ends_at) VALUES (?,?,?,?,?,?)`,
      [value.displayText, value.detailUrl, value.status, value.displayOrder, value.startsAt, value.endsAt]);
      id = Number(result.insertId);
    }
    await connection.query('DELETE FROM web_admin_product_promotion_products WHERE promotion_id=?', [id]);
    await connection.query('DELETE FROM web_admin_product_promotion_categories WHERE promotion_id=?', [id]);
    if (value.productIds.length > 0) await connection.query('INSERT INTO web_admin_product_promotion_products (promotion_id,product_id) VALUES ?', [value.productIds.map((productId) => [id, productId])]);
    if (value.categoryIds.length > 0) await connection.query('INSERT INTO web_admin_product_promotion_categories (promotion_id,category_id) VALUES ?', [value.categoryIds.map((categoryId) => [id, categoryId])]);
    await connection.commit();
    clearPublicCatalogDetailCache();
    return getAdminProductPromotion(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteAdminProductPromotion(id: number) {
  if (!Number.isInteger(id) || id <= 0) throw new AdminApiError(404, 'NOT_FOUND', 'Không tìm thấy chương trình khuyến mãi.');
  const [result] = await pool.query<ResultSetHeader>('DELETE FROM web_admin_product_promotions WHERE id=?', [id]);
  if (result.affectedRows === 0) throw new AdminApiError(404, 'NOT_FOUND', 'Không tìm thấy chương trình khuyến mãi.');
  clearPublicCatalogDetailCache();
  return { id };
}

export async function getPublicProductPromotions(productId: number): Promise<PublicProductPromotion[]> {
  if (!Number.isInteger(productId) || productId <= 0) return [];
  const [[productRows], parentById] = await Promise.all([
    pool.query<RowDataPacket[]>(`SELECT p.product_cat, pc.category_id
      FROM idv_sell_product_store p
      LEFT JOIN idv_product_category pc ON pc.pro_id=p.id AND pc.status=1
      WHERE p.id=?`, [productId]),
    getProductCategoryHierarchy().then((hierarchy) => hierarchy.parentById),
  ]);
  if (productRows.length === 0) return [];
  const directCategoryIds = new Set<number>(parseLegacyCategoryIds(String(productRows[0].product_cat || '')));
  for (const row of productRows) {
    const categoryId = Number(row.category_id || 0);
    if (categoryId > 0) directCategoryIds.add(categoryId);
  }
  const ancestors = collectCategoryAncestors([...directCategoryIds], parentById);
  const categoryClause = ancestors.length > 0
    ? 'OR EXISTS (SELECT 1 FROM web_admin_product_promotion_categories pc WHERE pc.promotion_id=p.id AND pc.category_id IN (?))'
    : '';
  const bindings: unknown[] = [productId];
  if (ancestors.length > 0) bindings.push(ancestors);
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT p.id, p.display_text, p.detail_url
    FROM web_admin_product_promotions p
    WHERE p.status=1
      AND (p.starts_at IS NULL OR p.starts_at <= UTC_TIMESTAMP())
      AND (p.ends_at IS NULL OR p.ends_at > UTC_TIMESTAMP())
      AND (
        EXISTS (SELECT 1 FROM web_admin_product_promotion_products pp WHERE pp.promotion_id=p.id AND pp.product_id=?)
        ${categoryClause}
      )
    ORDER BY p.display_order ASC, (p.ends_at IS NULL) ASC, p.ends_at ASC, p.id DESC
    LIMIT 50
  `, bindings);
  return rows.flatMap((row) => {
    try {
      return [{ id: Number(row.id), text: String(row.display_text), detailUrl: normalizePromotionDetailUrl(row.detail_url) }];
    } catch {
      return [];
    }
  });
}

export function invalidateProductPromotionCategoryCache() {
  invalidateProductCategoryHierarchyCache();
}
