import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { AdminApiError, maybeText, requireText, toBoolInt, toInt } from '@/lib/admin/common';

type DbExecutor = Pool | PoolConnection;
type VoucherRow = RowDataPacket & {
  id: number;
  code: string;
  title: string;
  description: string | null;
  status: number;
  quantity_mode: 'limited' | 'unlimited';
  total_quantity: number | null;
  remaining_quantity: number | null;
  discount_type: 'fixed' | 'percent';
  discount_value: number;
  max_discount: number | null;
  minimum_order_value: number;
  starts_at: string | null;
  ends_at: string | null;
};

export type VoucherQuoteItem = {
  productId: number;
  quantity: number;
  price: number;
  available: boolean;
};

export type VoucherQuote = {
  code: string | null;
  status: 'none' | 'applied' | 'invalid';
  reason: 'not_found' | 'inactive' | 'not_started' | 'expired' | 'exhausted' | 'minimum_order' | 'no_eligible_items' | null;
  message: string | null;
  voucherId: number | null;
  title: string | null;
  discount: number;
  eligibleSubtotal: number;
  eligibleItemCount: number;
  categoryNames: string[];
  note: string | null;
};

const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const CATEGORY_TREE_TTL_MS = 5 * 60_000;
let categoryTreeCache: { expiresAt: number; children: Map<number, number[]> } | null = null;
let categoryTreeFlight: Promise<Map<number, number[]>> | null = null;

function normalizeVoucherCode(value: unknown) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
}

function voucherError(
  code: string,
  reason: VoucherQuote['reason'],
  message: string,
): VoucherQuote {
  return {
    code: code || null,
    status: 'invalid',
    reason,
    message,
    voucherId: null,
    title: null,
    discount: 0,
    eligibleSubtotal: 0,
    eligibleItemCount: 0,
    categoryNames: [],
    note: null,
  };
}

function noVoucher(): VoucherQuote {
  return {
    code: null,
    status: 'none',
    reason: null,
    message: null,
    voucherId: null,
    title: null,
    discount: 0,
    eligibleSubtotal: 0,
    eligibleItemCount: 0,
    categoryNames: [],
    note: null,
  };
}

function parseUtcDate(value: string | null) {
  return value ? new Date(`${value.replace(' ', 'T')}Z`) : null;
}

function formatCategoryNote(categoryNames: string[], eligibleItemCount: number) {
  if (categoryNames.length === 0) return null;
  const names = categoryNames.join(', ');
  return `Voucher chỉ áp dụng cho ${eligibleItemCount} sản phẩm thuộc danh mục ${names}.`;
}

export async function ensureVoucherTables(db: DbExecutor = pool) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS web_admin_vouchers (
      id int unsigned NOT NULL AUTO_INCREMENT,
      code varchar(64) CHARACTER SET ascii NOT NULL,
      title varchar(255) CHARACTER SET utf8mb4 NOT NULL,
      description text CHARACTER SET utf8mb4 NULL,
      status tinyint(1) NOT NULL DEFAULT 1,
      quantity_mode enum('limited','unlimited') NOT NULL DEFAULT 'unlimited',
      total_quantity int unsigned NULL,
      remaining_quantity int unsigned NULL,
      discount_type enum('fixed','percent') NOT NULL,
      discount_value int unsigned NOT NULL,
      max_discount int unsigned NULL,
      minimum_order_value int unsigned NOT NULL DEFAULT 0,
      starts_at datetime NULL,
      ends_at datetime NULL,
      created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_web_admin_vouchers_code (code),
      KEY idx_web_admin_vouchers_status_time (status, starts_at, ends_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS web_admin_voucher_categories (
      voucher_id int unsigned NOT NULL,
      category_id int unsigned NOT NULL,
      PRIMARY KEY (voucher_id, category_id),
      KEY idx_web_admin_voucher_categories_category (category_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await db.query(`
    CREATE TABLE IF NOT EXISTS web_admin_voucher_redemptions (
      id bigint unsigned NOT NULL AUTO_INCREMENT,
      voucher_id int unsigned NOT NULL,
      order_id int NOT NULL,
      code_snapshot varchar(64) CHARACTER SET ascii NOT NULL,
      title_snapshot varchar(255) CHARACTER SET utf8mb4 NOT NULL,
      discount_amount int unsigned NOT NULL,
      order_subtotal int unsigned NOT NULL,
      eligible_subtotal int unsigned NOT NULL,
      category_names_json text CHARACTER SET utf8mb4 NULL,
      status enum('redeemed','released') NOT NULL DEFAULT 'redeemed',
      redeemed_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      released_at datetime NULL,
      PRIMARY KEY (id),
      UNIQUE KEY uk_web_admin_voucher_redemptions_order (order_id),
      KEY idx_web_admin_voucher_redemptions_voucher_status (voucher_id, status),
      KEY idx_web_admin_voucher_redemptions_order_status (order_id, status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function getVoucherCategories(db: DbExecutor, voucherId: number) {
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT vc.category_id, c.name
    FROM web_admin_voucher_categories vc
    JOIN idv_seller_category c ON c.id = vc.category_id
    WHERE vc.voucher_id = ?
    ORDER BY c.name ASC
  `, [voucherId]);
  return rows.map((row) => ({ id: Number(row.category_id), name: String(row.name || '').trim() })).filter((row) => row.id > 0);
}

async function getCategoryChildren() {
  if (categoryTreeCache && categoryTreeCache.expiresAt > Date.now()) return categoryTreeCache.children;
  if (categoryTreeFlight) return categoryTreeFlight;
  categoryTreeFlight = pool.query<RowDataPacket[]>('SELECT id, parentId FROM idv_seller_category')
    .then(([categories]) => {
      const children = new Map<number, number[]>();
      for (const category of categories) {
        const parentId = Number(category.parentId || 0);
        const list = children.get(parentId) || [];
        list.push(Number(category.id));
        children.set(parentId, list);
      }
      categoryTreeCache = { children, expiresAt: Date.now() + CATEGORY_TREE_TTL_MS };
      return children;
    })
    .finally(() => { categoryTreeFlight = null; });
  return categoryTreeFlight;
}

export function invalidateVoucherCategoryCache() { categoryTreeCache = null; }

async function getEligibleProductIds(db: DbExecutor, productIds: number[], rootCategoryIds: number[]) {
  if (rootCategoryIds.length === 0) return new Set(productIds);
  const children = await getCategoryChildren();
  const targetCategories = new Set<number>(rootCategoryIds);
  const queue = [...rootCategoryIds];
  while (queue.length > 0) {
    const parentId = queue.shift()!;
    for (const childId of children.get(parentId) || []) {
      if (!targetCategories.has(childId)) {
        targetCategories.add(childId);
        queue.push(childId);
      }
    }
  }
  const [links] = await db.query<RowDataPacket[]>(
    'SELECT DISTINCT pro_id, category_id FROM idv_product_category WHERE pro_id IN (?) AND category_id IN (?)',
    [productIds, Array.from(targetCategories)],
  );
  return new Set(links.map((row) => Number(row.pro_id)));
}

export async function quoteVoucher(
  rawCode: unknown,
  items: VoucherQuoteItem[],
  subtotal: number,
  db: DbExecutor = pool,
  lockVoucher = false,
): Promise<VoucherQuote> {
  const code = normalizeVoucherCode(rawCode);
  if (!code) return noVoucher();

  const [rows] = await db.query<VoucherRow[]>(`
    SELECT id, code, title, description, status, quantity_mode, total_quantity, remaining_quantity,
      discount_type, discount_value, max_discount, minimum_order_value,
      DATE_FORMAT(starts_at, '%Y-%m-%d %H:%i:%s') AS starts_at,
      DATE_FORMAT(ends_at, '%Y-%m-%d %H:%i:%s') AS ends_at
    FROM web_admin_vouchers
    WHERE code = ?
    LIMIT 1 ${lockVoucher ? 'FOR UPDATE' : ''}
  `, [code]);
  const voucher = rows[0];
  if (!voucher) return voucherError(code, 'not_found', 'Voucher không tồn tại.');
  if (Number(voucher.status) !== 1) return voucherError(code, 'inactive', 'Voucher hiện không khả dụng.');

  const now = new Date();
  const startsAt = parseUtcDate(voucher.starts_at);
  const endsAt = parseUtcDate(voucher.ends_at);
  if (startsAt && now < startsAt) return voucherError(code, 'not_started', 'Voucher chưa đến thời gian sử dụng.');
  if (endsAt && now >= endsAt) return voucherError(code, 'expired', 'Voucher đã hết thời gian sử dụng.');
  if (voucher.quantity_mode === 'limited' && Number(voucher.remaining_quantity || 0) <= 0) {
    return voucherError(code, 'exhausted', 'Voucher đã hết lượt sử dụng.');
  }
  if (subtotal < Number(voucher.minimum_order_value || 0)) {
    return voucherError(code, 'minimum_order', `Voucher áp dụng cho đơn hàng từ ${Number(voucher.minimum_order_value || 0).toLocaleString('vi-VN')}đ.`);
  }

  const categories = await getVoucherCategories(db, Number(voucher.id));
  const availableItems = items.filter((item) => item.available && item.price > 0 && item.quantity > 0);
  const eligibleIds = await getEligibleProductIds(db, availableItems.map((item) => item.productId), categories.map((category) => category.id));
  const eligibleItems = availableItems.filter((item) => eligibleIds.has(item.productId));
  const eligibleSubtotal = eligibleItems.reduce((total, item) => total + item.price * item.quantity, 0);
  if (eligibleSubtotal <= 0) return voucherError(code, 'no_eligible_items', 'Voucher không áp dụng cho sản phẩm trong đơn hàng.');

  let discount = voucher.discount_type === 'percent'
    ? Math.round((eligibleSubtotal * Number(voucher.discount_value || 0) / 100) / 1000) * 1000
    : Number(voucher.discount_value || 0);
  if (voucher.discount_type === 'percent' && voucher.max_discount !== null) {
    discount = Math.min(discount, Number(voucher.max_discount));
  }
  discount = Math.max(0, Math.min(discount, eligibleSubtotal, subtotal));
  const categoryNames = categories.map((category) => category.name);
  const eligibleItemCount = eligibleItems.reduce((total, item) => total + item.quantity, 0);

  return {
    code,
    status: 'applied',
    reason: null,
    message: 'Áp dụng voucher thành công.',
    voucherId: Number(voucher.id),
    title: voucher.title,
    discount,
    eligibleSubtotal,
    eligibleItemCount,
    categoryNames,
    note: formatCategoryNote(categoryNames, eligibleItemCount),
  };
}

export async function reserveVoucherForOrder(
  connection: PoolConnection,
  quote: VoucherQuote,
  orderId: number,
  orderSubtotal: number,
) {
  if (quote.status !== 'applied' || !quote.voucherId) return;
  const [result] = await connection.query<ResultSetHeader>(`
    UPDATE web_admin_vouchers
    SET remaining_quantity = CASE WHEN quantity_mode='limited' THEN remaining_quantity - 1 ELSE remaining_quantity END
    WHERE id = ? AND (quantity_mode = 'unlimited' OR remaining_quantity > 0)
  `, [quote.voucherId]);
  if (result.affectedRows !== 1) {
    throw new AdminApiError(409, 'CONFLICT', 'Voucher đã hết lượt sử dụng.');
  }
  await connection.query(`
    INSERT INTO web_admin_voucher_redemptions
      (voucher_id, order_id, code_snapshot, title_snapshot, discount_amount, order_subtotal, eligible_subtotal, category_names_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    quote.voucherId,
    orderId,
    quote.code,
    quote.title || quote.code,
    quote.discount,
    Math.round(orderSubtotal),
    Math.round(quote.eligibleSubtotal),
    JSON.stringify(quote.categoryNames),
  ]);
}

export async function releaseVoucherForOrder(connection: PoolConnection, orderId: number) {
  const [rows] = await connection.query<RowDataPacket[]>(`
    SELECT id, voucher_id
    FROM web_admin_voucher_redemptions
    WHERE order_id = ? AND status = 'redeemed'
    LIMIT 1 FOR UPDATE
  `, [orderId]);
  const redemption = rows[0];
  if (!redemption) return false;
  await connection.query(`
    UPDATE web_admin_vouchers
    SET remaining_quantity = CASE WHEN quantity_mode = 'limited' THEN remaining_quantity + 1 ELSE remaining_quantity END
    WHERE id = ?
  `, [Number(redemption.voucher_id)]);
  await connection.query(
    "UPDATE web_admin_voucher_redemptions SET status = 'released', released_at = UTC_TIMESTAMP() WHERE id = ?",
    [Number(redemption.id)],
  );
  return true;
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

function validateVoucherPayload(payload: any) {
  const code = normalizeVoucherCode(requireText(payload?.code, 'code', 'Mã voucher', 64));
  if (!/^[A-Z0-9_-]{3,64}$/.test(code)) throw new AdminApiError(400, 'BAD_REQUEST', 'Mã voucher chỉ gồm chữ, số, gạch dưới hoặc gạch ngang.');
  const title = requireText(payload?.title, 'title', 'Tên voucher', 255);
  const quantityMode = payload?.quantityMode === 'limited' ? 'limited' : 'unlimited';
  const totalQuantity = toInt(payload?.totalQuantity);
  if (quantityMode === 'limited' && totalQuantity <= 0) throw new AdminApiError(400, 'BAD_REQUEST', 'Số lượng voucher phải lớn hơn 0.');
  const discountType = payload?.discountType === 'percent' ? 'percent' : 'fixed';
  const discountValue = toInt(payload?.discountValue);
  if (discountValue <= 0 || (discountType === 'percent' && discountValue > 100)) throw new AdminApiError(400, 'BAD_REQUEST', 'Giá trị giảm không hợp lệ.');
  const maxDiscount = discountType === 'percent' ? toInt(payload?.maxDiscount) : 0;
  if (discountType === 'percent' && (maxDiscount <= 0 || maxDiscount % 1000 !== 0)) {
    throw new AdminApiError(400, 'BAD_REQUEST', 'Mức giảm tối đa phải lớn hơn 0 và là bội số của 1.000đ.');
  }
  const startsAt = parseVietnamDateTime(payload?.startsAt);
  const endsAt = parseVietnamDateTime(payload?.endsAt);
  if ((startsAt && !endsAt) || (!startsAt && endsAt) || (startsAt && endsAt && startsAt >= endsAt)) {
    throw new AdminApiError(400, 'BAD_REQUEST', 'Thời gian bắt đầu và kết thúc phải đầy đủ, hợp lệ.');
  }
  const categoryIds = Array.from(new Set((Array.isArray(payload?.categoryIds) ? payload.categoryIds : []).map((id: unknown) => toInt(id)).filter((id: number) => id > 0)));
  return { code, title, description: maybeText(payload?.description), status: toBoolInt(payload?.status, 1), quantityMode, totalQuantity, discountType, discountValue, maxDiscount, minimumOrderValue: Math.max(0, toInt(payload?.minimumOrderValue)), startsAt, endsAt, categoryIds };
}

export async function listAdminVouchers() {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT v.id, v.code, v.title, v.description, v.status, v.quantity_mode, v.total_quantity, v.remaining_quantity,
      v.discount_type, v.discount_value, v.max_discount, v.minimum_order_value,
      DATE_FORMAT(DATE_ADD(v.starts_at, INTERVAL 7 HOUR), '%Y-%m-%dT%H:%i') AS startsAt,
      DATE_FORMAT(DATE_ADD(v.ends_at, INTERVAL 7 HOUR), '%Y-%m-%dT%H:%i') AS endsAt,
      COALESCE(SUM(CASE WHEN r.status = 'redeemed' AND o.status = 3 THEN 1 ELSE 0 END), 0) AS usedCount,
      COALESCE(SUM(CASE WHEN r.status = 'redeemed' AND o.status IN (1, 2) THEN 1 ELSE 0 END), 0) AS pendingCount
    FROM web_admin_vouchers v
    LEFT JOIN web_admin_voucher_redemptions r ON r.voucher_id = v.id
    LEFT JOIN build_buy o ON o.id = r.order_id
    GROUP BY v.id
    ORDER BY v.id DESC
  `);
  return rows.map((row) => ({
    id: Number(row.id), code: String(row.code), title: String(row.title), description: row.description ? String(row.description) : '', status: Number(row.status),
    quantityMode: row.quantity_mode, totalQuantity: row.total_quantity === null ? null : Number(row.total_quantity), remainingQuantity: row.remaining_quantity === null ? null : Number(row.remaining_quantity),
    discountType: row.discount_type, discountValue: Number(row.discount_value), maxDiscount: row.max_discount === null ? null : Number(row.max_discount), minimumOrderValue: Number(row.minimum_order_value),
    startsAt: row.startsAt || null, endsAt: row.endsAt || null, usedCount: Number(row.usedCount), pendingCount: Number(row.pendingCount),
  }));
}

export async function getAdminVoucher(id: number) {
  const [rows] = await pool.query<VoucherRow[]>(`
    SELECT id, code, title, description, status, quantity_mode, total_quantity, remaining_quantity, discount_type, discount_value, max_discount, minimum_order_value,
      DATE_FORMAT(DATE_ADD(starts_at, INTERVAL 7 HOUR), '%Y-%m-%dT%H:%i') AS starts_at,
      DATE_FORMAT(DATE_ADD(ends_at, INTERVAL 7 HOUR), '%Y-%m-%dT%H:%i') AS ends_at
    FROM web_admin_vouchers WHERE id = ? LIMIT 1
  `, [id]);
  const row = rows[0];
  if (!row) throw new AdminApiError(404, 'NOT_FOUND', 'Không tìm thấy voucher.');
  const categories = await getVoucherCategories(pool, id);
  const [redemptions] = await pool.query<RowDataPacket[]>(`
    SELECT r.order_id, r.code_snapshot, r.discount_amount, r.status, r.redeemed_at, r.released_at, o.status AS order_status
    FROM web_admin_voucher_redemptions r
    LEFT JOIN build_buy o ON o.id = r.order_id
    WHERE r.voucher_id = ?
    ORDER BY r.id DESC LIMIT 50
  `, [id]);
  return {
    ...row,
    quantityMode: row.quantity_mode,
    totalQuantity: row.total_quantity,
    remainingQuantity: row.remaining_quantity,
    discountType: row.discount_type,
    discountValue: row.discount_value,
    maxDiscount: row.max_discount,
    minimumOrderValue: row.minimum_order_value,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    categoryIds: categories.map((category) => category.id),
    redemptions: redemptions.map((redemption) => ({
      orderId: Number(redemption.order_id),
      discountAmount: Number(redemption.discount_amount),
      status: String(redemption.status),
      orderStatus: Number(redemption.order_status || 0),
      redeemedAt: redemption.redeemed_at ? new Date(redemption.redeemed_at).toISOString() : null,
      releasedAt: redemption.released_at ? new Date(redemption.released_at).toISOString() : null,
    })),
  };
}

export async function saveAdminVoucher(payload: any, voucherId?: number) {
  const value = validateVoucherPayload(payload);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    let id = voucherId || 0;
    if (id > 0) {
      const [currentRows] = await connection.query<VoucherRow[]>('SELECT id, quantity_mode, total_quantity, remaining_quantity FROM web_admin_vouchers WHERE id = ? FOR UPDATE', [id]);
      const current = currentRows[0];
      if (!current) throw new AdminApiError(404, 'NOT_FOUND', 'Không tìm thấy voucher.');
      const [redemptionRows] = await connection.query<RowDataPacket[]>(
        "SELECT COUNT(*) AS consumed FROM web_admin_voucher_redemptions WHERE voucher_id = ? AND status = 'redeemed'",
        [id],
      );
      const consumed = Number(redemptionRows[0]?.consumed || 0);
      if (value.quantityMode === 'limited' && value.totalQuantity < consumed) throw new AdminApiError(400, 'BAD_REQUEST', 'Số lượng mới không được thấp hơn số lượt đã giữ hoặc sử dụng.');
      const remaining = value.quantityMode === 'limited' ? value.totalQuantity - consumed : null;
      await connection.query(`UPDATE web_admin_vouchers SET code=?, title=?, description=?, status=?, quantity_mode=?, total_quantity=?, remaining_quantity=?, discount_type=?, discount_value=?, max_discount=?, minimum_order_value=?, starts_at=?, ends_at=? WHERE id=?`, [value.code, value.title, value.description || null, value.status, value.quantityMode, value.quantityMode === 'limited' ? value.totalQuantity : null, remaining, value.discountType, value.discountValue, value.discountType === 'percent' ? value.maxDiscount : null, value.minimumOrderValue, value.startsAt, value.endsAt, id]);
    } else {
      const [result] = await connection.query<ResultSetHeader>(`INSERT INTO web_admin_vouchers (code,title,description,status,quantity_mode,total_quantity,remaining_quantity,discount_type,discount_value,max_discount,minimum_order_value,starts_at,ends_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`, [value.code, value.title, value.description || null, value.status, value.quantityMode, value.quantityMode === 'limited' ? value.totalQuantity : null, value.quantityMode === 'limited' ? value.totalQuantity : null, value.discountType, value.discountValue, value.discountType === 'percent' ? value.maxDiscount : null, value.minimumOrderValue, value.startsAt, value.endsAt]);
      id = Number(result.insertId);
    }
    if (value.categoryIds.length > 0) {
      const [categoryRows] = await connection.query<RowDataPacket[]>(
        'SELECT COUNT(*) AS total FROM idv_seller_category WHERE id IN (?)',
        [value.categoryIds],
      );
      if (Number(categoryRows[0]?.total || 0) !== value.categoryIds.length) {
        throw new AdminApiError(400, 'BAD_REQUEST', 'Danh mục áp dụng không tồn tại.');
      }
    }
    await connection.query('DELETE FROM web_admin_voucher_categories WHERE voucher_id = ?', [id]);
    if (value.categoryIds.length > 0) await connection.query('INSERT INTO web_admin_voucher_categories (voucher_id, category_id) VALUES ?', [value.categoryIds.map((categoryId) => [id, categoryId])]);
    await connection.commit();
    return getAdminVoucher(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listStorefrontOrders() {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT o.id, o.product_title, o.total_value, o.status, o.create_time, o.last_update,
      r.code_snapshot, r.discount_amount, r.status AS voucher_status
    FROM build_buy o
    LEFT JOIN web_admin_voucher_redemptions r ON r.order_id = o.id
    ORDER BY o.id DESC LIMIT 200
  `);
  return rows.map((row) => ({ id: Number(row.id), productTitle: String(row.product_title || ''), totalValue: Number(row.total_value || 0), status: Number(row.status), createTime: Number(row.create_time || 0), lastUpdate: Number(row.last_update || 0), voucherCode: row.code_snapshot ? String(row.code_snapshot) : null, voucherDiscount: Number(row.discount_amount || 0), voucherStatus: row.voucher_status || null }));
}

export async function updateStorefrontOrderStatus(orderId: number, status: number) {
  if (![1, 2, 3, 4, 5].includes(status)) throw new AdminApiError(400, 'BAD_REQUEST', 'Trạng thái đơn hàng không hợp lệ.');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query<RowDataPacket[]>('SELECT id, status FROM build_buy WHERE id = ? FOR UPDATE', [orderId]);
    const order = rows[0];
    if (!order) throw new AdminApiError(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng.');
    const currentStatus = Number(order.status);
    if ([3, 4, 5].includes(currentStatus) && currentStatus !== status) throw new AdminApiError(409, 'CONFLICT', 'Đơn hàng đã ở trạng thái kết thúc.');
    if ([4, 5].includes(status)) await releaseVoucherForOrder(connection, orderId);
    await connection.query('UPDATE build_buy SET status = ?, last_update = ? WHERE id = ?', [status, Math.floor(Date.now() / 1000), orderId]);
    await connection.commit();
    return { orderId, status };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export { VIETNAM_TIME_ZONE, normalizeVoucherCode };
