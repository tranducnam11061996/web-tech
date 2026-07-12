import crypto from 'crypto';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { AdminAuthError, assertSameOrigin, requireAdminPermission, writeAdminAudit } from './auth';
import { getApiPermission } from './permissions';

export type AdminEntityType =
  | 'product'
  | 'product-category'
  | 'article'
  | 'article-category'
  | 'brand'
  | 'attribute'
  | 'combo-set'
  | 'collection'
  | 'banner'
  | 'product-group';

export type AdminApiErrorCode =
  | 'BAD_REQUEST'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'WRITE_DISABLED'
  | 'INTERNAL_ERROR';

export class AdminApiError extends Error {
  status: number;
  code: AdminApiErrorCode;
  fields?: Record<string, string>;

  constructor(status: number, code: AdminApiErrorCode, message: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export function ok(data: unknown, message?: string, status = 200) {
  return NextResponse.json({ success: true, data, ...(message ? { message } : {}) }, { status, headers: { 'X-Request-ID': crypto.randomUUID() } });
}

export function fail(error: unknown) {
  const requestId = crypto.randomUUID();
  if (error instanceof AdminAuthError) {
    return NextResponse.json(
      { success: false, error: { code: error.code, message: error.message, requestId } },
      { status: error.status, headers: { 'X-Request-ID': requestId } },
    );
  }
  if (error instanceof AdminApiError) {
    return NextResponse.json(
      { success: false, error: { code: error.code, message: error.message, ...(error.fields ? { fields: error.fields } : {}), requestId } },
      { status: error.status, headers: { 'X-Request-ID': requestId } },
    );
  }

  console.error('Admin API internal error:', error);
  return NextResponse.json(
    { success: false, error: { code: 'INTERNAL_ERROR', message: 'Không thể xử lý yêu cầu quản trị', requestId } },
    { status: 500, headers: { 'X-Request-ID': requestId } },
  );
}

export async function requireAdminWrite(request: Request) {
  if (process.env.ADMIN_WRITE_ENABLED !== 'true') {
    throw new AdminApiError(403, 'WRITE_DISABLED', 'Admin write API dang bi khoa. Dat ADMIN_WRITE_ENABLED=true de cho phep ghi.');
  }
  const databaseUrl = process.env.DATABASE_URL || '';
  if (!databaseUrl || databaseUrl.includes('username:password') || databaseUrl.includes('database_name')) {
    throw new AdminApiError(403, 'WRITE_DISABLED', 'Can cau hinh DATABASE_URL that truoc khi cho phep Admin write API.');
  }
  assertSameOrigin(request);
  const permission = getApiPermission(new URL(request.url).pathname, request.method);
  if (!permission) throw new AdminApiError(403, 'WRITE_DISABLED', 'Chuc nang ghi chua co policy phan quyen.');
  const user = await requireAdminPermission(request, permission);
  await writeAdminAudit({
    actorUserId: user.id,
    action: 'admin.api_write_authorized',
    resource: permission,
    request,
  });
  return user;
}

export function normalizeSlug(input: unknown) {
  const raw = String(input || '').trim().toLowerCase();
  const withoutAccent = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
  return withoutAccent
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
}

export function md5(value: string) {
  return crypto.createHash('md5').update(value).digest('hex');
}

export function toInt(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
}

export function toBoolInt(value: unknown, fallback = 0) {
  if (value === true || value === 1 || value === '1' || value === 'true' || value === 'on') return 1;
  if (value === false || value === 0 || value === '0' || value === 'false' || value === 'off') return 0;
  return fallback;
}

export function parseIdList(value: unknown, max = 100) {
  const source = Array.isArray(value) ? value : String(value || '').split(',');
  const ids = Array.from(new Set(source.map((item) => toInt(item)).filter((id) => id > 0)));
  if (ids.length === 0) throw new AdminApiError(400, 'BAD_REQUEST', 'Danh sach ID khong hop le');
  if (ids.length > max) throw new AdminApiError(400, 'BAD_REQUEST', `Chi ho tro toi da ${max} ID moi lan`);
  return ids;
}

export function requireText(value: unknown, field: string, label: string, maxLength = 255) {
  const text = String(value || '').trim();
  if (!text) throw new AdminApiError(400, 'BAD_REQUEST', `${label} la bat buoc`, { [field]: 'required' });
  if (text.length > maxLength) {
    throw new AdminApiError(400, 'BAD_REQUEST', `${label} vuot qua ${maxLength} ky tu`, { [field]: 'max_length' });
  }
  return text;
}

export function maybeText(value: unknown, maxLength = 65535) {
  const text = String(value || '').trim();
  return text.slice(0, maxLength);
}

export async function withTransaction<T>(handler: (connection: PoolConnection) => Promise<T>) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await handler(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function ensureAdminTables(connection?: PoolConnection) {
  const db = connection || pool;

  await db.query(`
    CREATE TABLE IF NOT EXISTS web_admin_sequence (
      name varchar(64) NOT NULL PRIMARY KEY,
      next_id int unsigned NOT NULL,
      updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=latin1
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS web_admin_entity_registry (
      entity_type varchar(64) NOT NULL,
      entity_id int unsigned NOT NULL,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (entity_type, entity_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=latin1
  `);

  await db.query(`
    INSERT INTO web_admin_sequence (name, next_id)
    SELECT 'product', COALESCE(MAX(id), 0) + 1 FROM idv_sell_product_store
    ON DUPLICATE KEY UPDATE next_id = GREATEST(next_id, VALUES(next_id))
  `);
}

export async function allocateProductId(connection: PoolConnection) {
  await ensureAdminTables(connection);
  const [rows] = await connection.query<RowDataPacket[]>(
    'SELECT next_id FROM web_admin_sequence WHERE name = ? FOR UPDATE',
    ['product'],
  );
  const nextId = Number(rows[0]?.next_id || 0);
  if (!nextId) throw new AdminApiError(500, 'INTERNAL_ERROR', 'Khong the cap product id');
  await connection.query('UPDATE web_admin_sequence SET next_id = next_id + 1 WHERE name = ?', ['product']);
  return nextId;
}

export async function markRegistry(connection: PoolConnection, entityType: AdminEntityType, entityId: number) {
  await ensureAdminTables(connection);
  await connection.query(
    'INSERT IGNORE INTO web_admin_entity_registry (entity_type, entity_id) VALUES (?, ?)',
    [entityType, entityId],
  );
}

export async function isRegistered(connection: PoolConnection, entityType: AdminEntityType, entityId: number) {
  await ensureAdminTables(connection);
  const [rows] = await connection.query<RowDataPacket[]>(
    'SELECT entity_id FROM web_admin_entity_registry WHERE entity_type = ? AND entity_id = ? LIMIT 1',
    [entityType, entityId],
  );
  return rows.length > 0;
}

export function csvCategoryIds(ids: number[]) {
  return Array.from(new Set(ids.map((id) => toInt(id)).filter((id) => id > 0))).join(',');
}

export function csvArticleIds(ids: number[]) {
  return `,${ids.join(',')},`;
}

export function requestPathIndex(slug: string) {
  return md5(`/${slug}`);
}

export function resultId(result: unknown) {
  return Number((result as ResultSetHeader).insertId || 0);
}
