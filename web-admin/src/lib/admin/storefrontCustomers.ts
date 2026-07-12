import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { AdminApiError, toInt, withTransaction } from '@/lib/admin/common';
import { writeAdminAudit, type AdminSessionUser } from '@/lib/admin/auth';
import { resolveVietnamLocation } from '@/lib/vietnamLocations';

type Db = typeof pool | PoolConnection;
type CustomerStatus = 'active' | 'blocked';

const MAX_PAGE_SIZE = 100;
const LIST_PAGE_SIZE = 50;

function parseDate(value: string | null, field: string) {
  if (!value) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new AdminApiError(400, 'BAD_REQUEST', `${field} không hợp lệ.`);
  return value;
}

function customerId(value: unknown) {
  const id = toInt(value);
  if (id <= 0) throw new AdminApiError(400, 'BAD_REQUEST', 'Mã khách hàng không hợp lệ.');
  return id;
}

function text(value: unknown, label: string, min: number, max: number) {
  const output = String(value || '').trim().replace(/\s+/g, ' ');
  if (output.length < min || output.length > max) throw new AdminApiError(400, 'BAD_REQUEST', `${label} phải từ ${min} đến ${max} ký tự.`);
  return output;
}

function phone(value: unknown) {
  let output = String(value || '').replace(/\D/g, '');
  if (output.startsWith('84')) output = `0${output.slice(2)}`;
  if (!/^0\d{9,10}$/.test(output)) throw new AdminApiError(400, 'BAD_REQUEST', 'Số điện thoại không hợp lệ.');
  return output;
}

function mapAddress(row: RowDataPacket) {
  return {
    id: Number(row.id), recipientName: String(row.recipient_name), phone: String(row.phone),
    type: ['home', 'office', 'other'].includes(String(row.address_type)) ? String(row.address_type) : 'other',
    address: String(row.address_line), provinceId: row.province_id === null ? null : Number(row.province_id), provinceCode: row.province_code ? String(row.province_code) : null, provinceName: String(row.province_name || row.province_name_snapshot || ''),
    districtId: row.district_id === null ? null : Number(row.district_id), districtName: String(row.district_name || ''),
    wardId: row.ward_id === null ? null : Number(row.ward_id), wardCode: row.ward_code ? String(row.ward_code) : null, wardName: String(row.ward_name || row.ward_name_snapshot || ''), locationSchemaVersion: row.location_schema_version === '2025_2tier' ? '2025_2tier' : 'legacy_3tier',
    isDefault: Number(row.is_default) === 1,
  };
}

async function requireCustomer(db: Db, id: number, lock = false) {
  const [rows] = await db.query<RowDataPacket[]>(`SELECT c.* FROM web_admin_storefront_customers c WHERE c.id=? LIMIT 1${lock ? ' FOR UPDATE' : ''}`, [id]);
  if (!rows[0]) throw new AdminApiError(404, 'NOT_FOUND', 'Không tìm thấy khách hàng.');
  return rows[0];
}

async function setDefaultAddress(db: Db, id: number, addressId: number) {
  await db.query('UPDATE web_admin_customer_addresses SET is_default=0 WHERE customer_id=?', [id]);
  await db.query('UPDATE web_admin_customer_addresses SET is_default=1 WHERE id=? AND customer_id=?', [addressId, id]);
}

async function addressPayload(value: any) {
  const addressType = ['home', 'office', 'other'].includes(String(value?.type || '')) ? String(value.type) : 'home';
  const location = await resolveVietnamLocation(value?.provinceCode, value?.wardCode).catch(() => null);
  if (!location) throw new AdminApiError(400, 'BAD_REQUEST', 'Phường/xã không thuộc tỉnh/thành phố đã chọn.');
  return {
    recipientName: text(value?.recipientName, 'Tên người nhận', 2, 150), phone: phone(value?.phone), addressType,
    addressLine: text(value?.address, 'Địa chỉ chi tiết', 4, 255), ...location,
    isDefault: Boolean(value?.isDefault),
  };
}

function statusLabel(status: number) {
  return ({ 1: 'Chờ xử lý', 2: 'Đã xác nhận', 3: 'Hoàn tất', 4: 'Thất bại', 5: 'Đã hủy' } as Record<number, string>)[status] || 'Không xác định';
}

export async function listAdminStorefrontCustomers(params: URLSearchParams) {
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, toInt(params.get('limit'), LIST_PAGE_SIZE)));
  const cursor = Math.max(0, toInt(params.get('cursor')));
  const q = String(params.get('q') || '').trim().slice(0, 100);
  const status = String(params.get('status') || '');
  const verified = String(params.get('verified') || '');
  const purchased = String(params.get('purchased') || '');
  const createdFrom = parseDate(params.get('createdFrom'), 'Ngày tạo từ');
  const createdTo = parseDate(params.get('createdTo'), 'Ngày tạo đến');
  const lastLoginFrom = parseDate(params.get('lastLoginFrom'), 'Đăng nhập từ');
  const lastLoginTo = parseDate(params.get('lastLoginTo'), 'Đăng nhập đến');
  const where: string[] = [];
  const values: unknown[] = [];
  if (cursor) { where.push('c.id < ?'); values.push(cursor); }
  if (['active', 'blocked', 'pending'].includes(status)) { where.push('c.status=?'); values.push(status); }
  if (verified === 'yes') where.push('c.email_verified_at IS NOT NULL');
  if (verified === 'no') where.push('c.email_verified_at IS NULL');
  if (purchased === 'yes') where.push('COALESCE(m.order_count,0)>0');
  if (purchased === 'no') where.push('COALESCE(m.order_count,0)=0');
  if (createdFrom) { where.push('c.created_at>=?'); values.push(`${createdFrom} 00:00:00`); }
  if (createdTo) { where.push('c.created_at<DATE_ADD(?, INTERVAL 1 DAY)'); values.push(createdTo); }
  if (lastLoginFrom) { where.push('c.last_login_at>=?'); values.push(`${lastLoginFrom} 00:00:00`); }
  if (lastLoginTo) { where.push('c.last_login_at<DATE_ADD(?, INTERVAL 1 DAY)'); values.push(lastLoginTo); }
  if (q) {
    const digits = q.replace(/\D/g, '');
    if (/^\d+$/.test(q)) {
      where.push('(c.id=? OR c.phone_normalized LIKE ?)'); values.push(Number(q), `${digits}%`);
    } else if (q.includes('@')) {
      where.push('c.email_normalized LIKE ?'); values.push(`${q.toLowerCase()}%`);
    } else {
      where.push('(c.name LIKE ? OR c.email_normalized LIKE ? OR c.phone_normalized LIKE ?)');
      values.push(`${q}%`, `${q.toLowerCase()}%`, `${digits}%`);
    }
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [rows, summaryRows] = await Promise.all([
    pool.query<RowDataPacket[]>(`SELECT c.id,c.name,c.email,c.phone,c.status,c.email_verified_at,c.created_at,c.last_login_at,
      COALESCE(m.order_count,0) order_count,COALESCE(m.completed_order_count,0) completed_order_count,
      COALESCE(m.total_completed_value,0) total_completed_value,m.last_order_id,m.last_order_at
      FROM web_admin_storefront_customers c LEFT JOIN web_admin_storefront_customer_metrics m ON m.customer_id=c.id
      ${whereSql} ORDER BY c.id DESC LIMIT ?`, [...values, limit + 1]),
    pool.query<RowDataPacket[]>(`SELECT COUNT(*) total,COALESCE(SUM(c.status='active'),0) active,COALESCE(SUM(c.status='blocked'),0) blocked,
      COALESCE(SUM(COALESCE(m.order_count,0)>0),0) purchasers
      FROM web_admin_storefront_customers c LEFT JOIN web_admin_storefront_customer_metrics m ON m.customer_id=c.id`),
  ]);
  const result = rows[0];
  const hasMore = result.length > limit;
  const items = result.slice(0, limit).map((row) => ({
    id: Number(row.id), name: String(row.name), email: String(row.email), phone: String(row.phone), status: String(row.status),
    verified: Boolean(row.email_verified_at), createdAt: row.created_at, lastLoginAt: row.last_login_at,
    orderCount: Number(row.order_count), completedOrderCount: Number(row.completed_order_count), totalCompletedValue: Number(row.total_completed_value),
    lastOrderId: row.last_order_id ? Number(row.last_order_id) : null, lastOrderAt: row.last_order_at ? Number(row.last_order_at) : null,
  }));
  const summary = summaryRows[0][0] || {};
  return { items, nextCursor: hasMore ? items.at(-1)?.id || null : null, hasMore, summary: { total: Number(summary.total || 0), active: Number(summary.active || 0), blocked: Number(summary.blocked || 0), purchasers: Number(summary.purchasers || 0) } };
}

export async function getAdminStorefrontCustomer(idInput: unknown, params = new URLSearchParams()) {
  const id = customerId(idInput);
  const orderCursor = Math.max(0, toInt(params.get('orderCursor')));
  const [headers] = await pool.query<RowDataPacket[]>(`SELECT c.*,COALESCE(m.order_count,0) order_count,COALESCE(m.completed_order_count,0) completed_order_count,
    COALESCE(m.pending_order_count,0) pending_order_count,COALESCE(m.total_completed_value,0) total_completed_value,m.last_order_id,m.last_order_at
    FROM web_admin_storefront_customers c LEFT JOIN web_admin_storefront_customer_metrics m ON m.customer_id=c.id WHERE c.id=? LIMIT 1`, [id]);
  const customer = headers[0];
  if (!customer) throw new AdminApiError(404, 'NOT_FOUND', 'Không tìm thấy khách hàng.');
  const orderWhere = ['l.customer_id=?']; const orderValues: unknown[] = [id];
  if (orderCursor) { orderWhere.push('o.id<?'); orderValues.push(orderCursor); }
  const [addresses, orderRows, sessionRows, auditRows] = await Promise.all([
    pool.query<RowDataPacket[]>(`SELECT a.*,COALESCE(NULLIF(a.province_name_snapshot,''),CONVERT(CAST(p.name AS BINARY) USING utf8mb4),'') province_name,CONVERT(CAST(d.name AS BINARY) USING utf8mb4) district_name,COALESCE(NULLIF(a.ward_name_snapshot,''),CONVERT(CAST(w.name AS BINARY) USING utf8mb4),'') ward_name FROM web_admin_customer_addresses a
      LEFT JOIN province_list p ON p.id=a.province_id LEFT JOIN province_district_list d ON d.id=a.district_id
      LEFT JOIN province_ward_list w ON w.id=a.ward_id WHERE a.customer_id=? ORDER BY a.is_default DESC,a.id DESC`, [id]),
    pool.query<RowDataPacket[]>(`SELECT o.id,o.product_title,o.total_value,o.status,o.create_time,m.payment_status,m.shipping_status,r.code_snapshot,r.discount_amount
      FROM web_admin_storefront_order_customer l JOIN build_buy o ON o.id=l.order_id
      LEFT JOIN web_admin_storefront_order_meta m ON m.order_id=o.id LEFT JOIN web_admin_voucher_redemptions r ON r.order_id=o.id
      WHERE ${orderWhere.join(' AND ')} ORDER BY o.id DESC LIMIT 21`, orderValues),
    pool.query<RowDataPacket[]>('SELECT COUNT(*) active_sessions,MAX(last_seen_at) last_seen_at FROM web_admin_customer_sessions WHERE customer_id=? AND revoked_at IS NULL AND expires_at>NOW() AND idle_expires_at>NOW()', [id]),
    pool.query<RowDataPacket[]>(`SELECT l.id,l.action,l.metadata,l.created_at,u.name actor_name FROM admin_audit_logs l
      LEFT JOIN admin_users u ON u.id=l.actor_user_id WHERE l.resource='crm.customers' AND l.resource_id=? ORDER BY l.id DESC LIMIT 30`, [id]),
  ]);
  const orders = orderRows[0]; const hasMoreOrders = orders.length > 20;
  return {
    customer: {
      id: Number(customer.id), name: String(customer.name), email: String(customer.email), phone: String(customer.phone), status: String(customer.status),
      verified: Boolean(customer.email_verified_at), verifiedAt: customer.email_verified_at, gender: String(customer.gender || ''), birthday: customer.birthday ? String(customer.birthday).slice(0, 10) : '',
      createdAt: customer.created_at, updatedAt: customer.updated_at, lastLoginAt: customer.last_login_at,
    },
    metrics: { orderCount: Number(customer.order_count), completedOrderCount: Number(customer.completed_order_count), pendingOrderCount: Number(customer.pending_order_count), totalCompletedValue: Number(customer.total_completed_value), lastOrderId: customer.last_order_id ? Number(customer.last_order_id) : null, lastOrderAt: customer.last_order_at ? Number(customer.last_order_at) : null },
    security: { activeSessions: Number(sessionRows[0][0]?.active_sessions || 0), lastSessionAt: sessionRows[0][0]?.last_seen_at || null },
    addresses: addresses[0].map(mapAddress),
    orders: orders.slice(0, 20).map((row) => ({ id: Number(row.id), title: String(row.product_title || ''), totalValue: Number(row.total_value || 0), status: Number(row.status), statusLabel: statusLabel(Number(row.status)), createTime: Number(row.create_time || 0), paymentStatus: String(row.payment_status || 'unpaid'), shippingStatus: String(row.shipping_status || 'pending'), voucherCode: row.code_snapshot ? String(row.code_snapshot) : null, voucherDiscount: Number(row.discount_amount || 0) })),
    nextOrderCursor: hasMoreOrders ? Number(orders[19]?.id || 0) || null : null,
    audit: auditRows[0].map((row) => ({ id: Number(row.id), action: String(row.action), actor: String(row.actor_name || 'Hệ thống'), metadata: row.metadata ? (() => { try { return JSON.parse(String(row.metadata)); } catch { return null; } })() : null, createdAt: row.created_at })),
  };
}

export async function updateAdminStorefrontCustomer(idInput: unknown, payload: any) {
  const id = customerId(idInput);
  const action = String(payload?.action || 'profile');
  if (!['profile', 'status', 'revoke_sessions'].includes(action)) throw new AdminApiError(400, 'BAD_REQUEST', 'Thao tác khách hàng không hợp lệ.');
  return withTransaction(async (connection) => {
    const customer = await requireCustomer(connection, id, true);
    if (action === 'profile') {
      const name = text(payload?.name, 'Họ và tên', 2, 150);
      const gender = ['', 'male', 'female', 'other'].includes(String(payload?.gender || '')) ? String(payload.gender || '') : '';
      const birthday = String(payload?.birthday || '');
      if (birthday && !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) throw new AdminApiError(400, 'BAD_REQUEST', 'Ngày sinh không hợp lệ.');
      await connection.query('UPDATE web_admin_storefront_customers SET name=?,gender=?,birthday=? WHERE id=?', [name, gender, birthday || null, id]);
      return { id, event: 'customer.profile_updated', metadata: { fields: ['name', 'gender', 'birthday'] } };
    }
    if (action === 'status') {
      const next = String(payload?.status || '') as CustomerStatus;
      if (!['active', 'blocked'].includes(next)) throw new AdminApiError(400, 'BAD_REQUEST', 'Trạng thái khách hàng không hợp lệ.');
      await connection.query('UPDATE web_admin_storefront_customers SET status=? WHERE id=?', [next, id]);
      if (next === 'blocked') await connection.query('UPDATE web_admin_customer_sessions SET revoked_at=NOW() WHERE customer_id=? AND revoked_at IS NULL', [id]);
      return { id, event: next === 'blocked' ? 'customer.blocked' : 'customer.unblocked', metadata: { from: customer.status, to: next } };
    }
    const [result] = await connection.query<any>('UPDATE web_admin_customer_sessions SET revoked_at=NOW() WHERE customer_id=? AND revoked_at IS NULL', [id]);
    return { id, event: 'customer.sessions_revoked', metadata: { revoked: Number(result.affectedRows || 0) } };
  });
}

export async function saveAdminCustomerAddress(customerIdInput: unknown, payload: any, addressIdInput?: unknown) {
  const id = customerId(customerIdInput); const value = await addressPayload(payload); const addressId = addressIdInput === undefined ? 0 : customerId(addressIdInput);
  return withTransaction(async (connection) => {
    await requireCustomer(connection, id, true);
    let savedId = addressId;
    if (addressId) {
      const [result] = await connection.query<any>(`UPDATE web_admin_customer_addresses SET recipient_name=?,phone=?,address_type=?,address_line=?,province_id=NULL,province_code=?,district_id=NULL,ward_id=NULL,ward_code=?,province_name_snapshot=?,ward_name_snapshot=?,province_division_type=?,ward_division_type=?,location_schema_version='2025_2tier' WHERE id=? AND customer_id=?`, [value.recipientName, value.phone, value.addressType, value.addressLine, value.provinceCode, value.wardCode, value.provinceName, value.wardName, value.provinceDivisionType, value.wardDivisionType, addressId, id]);
      if (!result.affectedRows) throw new AdminApiError(404, 'NOT_FOUND', 'Không tìm thấy địa chỉ.');
    } else {
      const [result] = await connection.query<any>(`INSERT INTO web_admin_customer_addresses(customer_id,recipient_name,phone,address_type,address_line,province_id,province_code,district_id,ward_id,ward_code,province_name_snapshot,ward_name_snapshot,province_division_type,ward_division_type,location_schema_version,is_default) VALUES(?,?,?,?,?,NULL,?,NULL,NULL,?,?,?,?,?,'2025_2tier',0)`, [id, value.recipientName, value.phone, value.addressType, value.addressLine, value.provinceCode, value.wardCode, value.provinceName, value.wardName, value.provinceDivisionType, value.wardDivisionType]);
      savedId = Number(result.insertId);
      const [countRows] = await connection.query<RowDataPacket[]>('SELECT COUNT(*) total FROM web_admin_customer_addresses WHERE customer_id=?', [id]);
      if (Number(countRows[0]?.total || 0) === 1) value.isDefault = true;
    }
    if (value.isDefault) await setDefaultAddress(connection, id, savedId);
    return { id, addressId: savedId, event: addressId ? 'customer.address_updated' : 'customer.address_created', metadata: { addressId: savedId, isDefault: value.isDefault } };
  });
}

export async function setAdminCustomerDefaultAddress(customerIdInput: unknown, addressIdInput: unknown) {
  const id = customerId(customerIdInput); const addressId = customerId(addressIdInput);
  return withTransaction(async (connection) => {
    await requireCustomer(connection, id, true);
    const [rows] = await connection.query<RowDataPacket[]>('SELECT id FROM web_admin_customer_addresses WHERE id=? AND customer_id=? FOR UPDATE', [addressId, id]);
    if (!rows[0]) throw new AdminApiError(404, 'NOT_FOUND', 'Không tìm thấy địa chỉ.');
    await setDefaultAddress(connection, id, addressId);
    return { id, addressId, event: 'customer.default_address_updated', metadata: { addressId } };
  });
}

export async function deleteAdminCustomerAddress(customerIdInput: unknown, addressIdInput: unknown) {
  const id = customerId(customerIdInput); const addressId = customerId(addressIdInput);
  return withTransaction(async (connection) => {
    await requireCustomer(connection, id, true);
    const [rows] = await connection.query<RowDataPacket[]>('SELECT is_default FROM web_admin_customer_addresses WHERE id=? AND customer_id=? FOR UPDATE', [addressId, id]);
    if (!rows[0]) throw new AdminApiError(404, 'NOT_FOUND', 'Không tìm thấy địa chỉ.');
    await connection.query('DELETE FROM web_admin_customer_addresses WHERE id=? AND customer_id=?', [addressId, id]);
    if (Number(rows[0].is_default) === 1) {
      const [next] = await connection.query<RowDataPacket[]>('SELECT id FROM web_admin_customer_addresses WHERE customer_id=? ORDER BY id DESC LIMIT 1', [id]);
      if (next[0]) await setDefaultAddress(connection, id, Number(next[0].id));
    }
    return { id, event: 'customer.address_deleted', metadata: { addressId } };
  });
}

export async function deleteAdminStorefrontCustomer(idInput: unknown) {
  const id = customerId(idInput);
  return withTransaction(async (connection) => {
    const customer = await requireCustomer(connection, id, true);
    const [orders] = await connection.query<RowDataPacket[]>('SELECT 1 FROM web_admin_storefront_order_customer WHERE customer_id=? LIMIT 1 FOR UPDATE', [id]);
    if (orders[0]) throw new AdminApiError(409, 'CONFLICT', 'Khách hàng đã có đơn hàng, chỉ có thể khóa tài khoản để lưu trữ dữ liệu.');
    await connection.query('DELETE FROM web_admin_storefront_customers WHERE id=?', [id]);
    return { id, event: 'customer.deleted', metadata: { email: String(customer.email) } };
  });
}

export async function writeCustomerAdminAudit(result: { id: number; event: string; metadata: Record<string, unknown> }, actor: AdminSessionUser, request: Request) {
  await writeAdminAudit({ actorUserId: actor.id, action: result.event, resource: 'crm.customers', resourceId: result.id, request, metadata: result.metadata });
}
