import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { CustomerAuthError } from '@/lib/customerAccounts';
import { getProductCardBadgesForProductIds, type ProductCardBadge } from '@/lib/productCardAttributes';
import { resolveProductImageUrl } from '@/lib/productImageUrl';

type Db = typeof pool | PoolConnection;

type FavoriteProductRow = RowDataPacket & {
  favorite_id: number;
  id: number;
  storeSKU: string | null;
  proName: string;
  proThum: string | null;
  price: number | null;
  market_price: number | null;
  slug: string;
  brandName: string | null;
};

export type CustomerFavoriteProduct = {
  id: number;
  slug: string;
  name: string;
  sku: string;
  thumbnail: string;
  price: number;
  marketPrice: number;
  savings: number;
  brand: string;
  cardBadges: ProductCardBadge[];
};

export type CustomerFavoriteList = {
  items: CustomerFavoriteProduct[];
  nextCursor: number | null;
};

export const MAX_FAVORITE_STATUS_IDS = 100;
export const MAX_FAVORITE_PAGE_SIZE = 24;

export async function ensureCustomerFavoriteTable(db: Db = pool) {
  await db.query(`CREATE TABLE IF NOT EXISTS web_admin_customer_favorites (
    id bigint unsigned NOT NULL AUTO_INCREMENT,
    customer_id bigint unsigned NOT NULL,
    product_id int unsigned NOT NULL,
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_web_admin_customer_favorite (customer_id, product_id),
    KEY idx_web_admin_customer_favorite_list (customer_id, id),
    KEY idx_web_admin_customer_favorite_product (product_id, customer_id),
    CONSTRAINT fk_web_admin_customer_favorite_customer
      FOREIGN KEY (customer_id) REFERENCES web_admin_storefront_customers(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}

export function parseFavoriteProductId(value: unknown) {
  const normalized = String(value ?? '');
  if (!/^\d+$/.test(normalized)) {
    throw new CustomerAuthError(400, 'INVALID_PRODUCT', 'Mã sản phẩm không hợp lệ.');
  }
  const productId = Number(normalized);
  if (!Number.isSafeInteger(productId) || productId <= 0) {
    throw new CustomerAuthError(400, 'INVALID_PRODUCT', 'Mã sản phẩm không hợp lệ.');
  }
  return productId;
}

export function parseFavoriteStatusIds(rawValue: string | null) {
  if (!rawValue) {
    throw new CustomerAuthError(400, 'INVALID_PRODUCT_IDS', 'Danh sách sản phẩm không hợp lệ.');
  }
  const values = rawValue.split(',').map((value) => value.trim());
  if (values.length === 0 || values.length > MAX_FAVORITE_STATUS_IDS) {
    throw new CustomerAuthError(400, 'INVALID_PRODUCT_IDS', `Chỉ được kiểm tra tối đa ${MAX_FAVORITE_STATUS_IDS} sản phẩm mỗi lần.`);
  }
  const ids = values.map(parseFavoriteProductId);
  if (new Set(ids).size !== ids.length) {
    throw new CustomerAuthError(400, 'INVALID_PRODUCT_IDS', 'Danh sách sản phẩm không được trùng lặp.');
  }
  return ids;
}

export function parseFavoriteListOptions(searchParams: URLSearchParams) {
  const cursorValue = searchParams.get('cursor');
  const limitValue = searchParams.get('limit');
  let cursor: number | null = null;
  if (cursorValue) cursor = parseFavoriteProductId(cursorValue);

  let limit = MAX_FAVORITE_PAGE_SIZE;
  if (limitValue) {
    if (!/^\d+$/.test(limitValue)) {
      throw new CustomerAuthError(400, 'INVALID_LIMIT', 'Giới hạn danh sách không hợp lệ.');
    }
    limit = Number(limitValue);
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_FAVORITE_PAGE_SIZE) {
      throw new CustomerAuthError(400, 'INVALID_LIMIT', `Giới hạn phải từ 1 đến ${MAX_FAVORITE_PAGE_SIZE}.`);
    }
  }
  return { cursor, limit };
}

export async function getCustomerFavoriteProductIds(customerId: number, productIds: number[]) {
  if (productIds.length === 0) return [];
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT product_id
     FROM web_admin_customer_favorites
     WHERE customer_id = ? AND product_id IN (?)`,
    [customerId, productIds],
  );
  return rows.map((row) => Number(row.product_id)).filter((id) => Number.isSafeInteger(id) && id > 0);
}

export async function addCustomerFavorite(customerId: number, productId: number) {
  await pool.query(
    `INSERT INTO web_admin_customer_favorites (customer_id, product_id)
     SELECT ?, p.id
     FROM idv_sell_product_store p
     JOIN idv_sell_product_price pr ON pr.id = p.id AND pr.isOn = 1
     JOIN idv_url u ON u.id_path = CONCAT('module:product/view:product-detail/view_id:', p.id)
       AND u.request_path <> ''
     WHERE p.id = ?
     ON DUPLICATE KEY UPDATE product_id = web_admin_customer_favorites.product_id`,
    [customerId, productId],
  );
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM web_admin_customer_favorites WHERE customer_id = ? AND product_id = ? LIMIT 1',
    [customerId, productId],
  );
  if (!rows[0]) {
    throw new CustomerAuthError(404, 'PRODUCT_UNAVAILABLE', 'Sản phẩm không tồn tại hoặc không còn hiển thị.');
  }
  return { productId, favorited: true };
}

export async function deleteCustomerFavorite(customerId: number, productId: number) {
  await pool.query(
    'DELETE FROM web_admin_customer_favorites WHERE customer_id = ? AND product_id = ?',
    [customerId, productId],
  );
  return { productId, favorited: false };
}

function toCustomerFavoriteProduct(row: FavoriteProductRow, cardBadges: ProductCardBadge[]): CustomerFavoriteProduct {
  const price = Number(row.price || 0);
  const marketPrice = Number(row.market_price || 0);
  return {
    id: Number(row.id),
    slug: String(row.slug || '').replace(/^\/+|\/+$/g, ''),
    name: String(row.proName || '').trim(),
    sku: String(row.storeSKU || ''),
    thumbnail: resolveProductImageUrl(row.proThum, 'https://via.placeholder.com/300'),
    price,
    marketPrice,
    savings: Math.max(0, marketPrice - price),
    brand: String(row.brandName || 'Khác'),
    cardBadges,
  };
}

export async function listCustomerFavorites(
  customerId: number,
  options: { cursor: number | null; limit: number },
): Promise<CustomerFavoriteList> {
  const values: Array<number> = [customerId];
  const cursorClause = options.cursor ? 'AND f.id < ?' : '';
  if (options.cursor) values.push(options.cursor);
  values.push(options.limit + 1);

  const [rows] = await pool.query<FavoriteProductRow[]>(
    `SELECT f.id AS favorite_id, p.id, p.storeSKU, p.proName, p.proThum,
       pr.price, pr.market_price, u.request_path AS slug, b.name AS brandName
     FROM web_admin_customer_favorites f
     JOIN idv_sell_product_store p ON p.id = f.product_id
     JOIN idv_sell_product_price pr ON pr.id = p.id AND pr.isOn = 1
     JOIN idv_url u ON u.id_path = CONCAT('module:product/view:product-detail/view_id:', p.id)
       AND u.request_path <> ''
     LEFT JOIN idv_brand b ON b.id = p.brandId
     WHERE f.customer_id = ? ${cursorClause}
     ORDER BY f.id DESC
     LIMIT ?`,
    values,
  );

  const pageRows = rows.slice(0, options.limit);
  const badgesByProduct = await getProductCardBadgesForProductIds(pageRows.map((row) => Number(row.id)));
  const items = pageRows.map((row) => toCustomerFavoriteProduct(
    row,
    badgesByProduct.get(Number(row.id)) || [],
  ));
  const nextCursor = rows.length > options.limit
    ? Number(pageRows.at(-1)?.favorite_id || 0) || null
    : null;
  return { items, nextCursor };
}
