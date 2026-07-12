import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { ensureVietnamLocationTables, getVietnamProvinces, getVietnamWards, resolveVietnamLocation } from '@/lib/vietnamLocations';
import { hashPassword, passwordNeedsRehash, verifyPassword } from '@/lib/passwordHash';

const LOGIN_WINDOW_SECONDS = 15 * 60;
const LOGIN_LOCK_SECONDS = 15 * 60;
const LOGIN_MAX_FAILURES = 5;
const OTP_TTL_SECONDS = 10 * 60;
const OTP_COOLDOWN_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;
const DEFAULT_SESSION_SECONDS = 24 * 60 * 60;
const REMEMBER_SESSION_SECONDS = 30 * 24 * 60 * 60;
const DEFAULT_IDLE_SECONDS = 8 * 60 * 60;
const REMEMBER_IDLE_SECONDS = 30 * 24 * 60 * 60;
export const CUSTOMER_SESSION_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-customer_session' : 'customer_session';
export const REGISTRATION_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-customer_registration' : 'customer_registration';
const REGISTRATION_WINDOW_SECONDS = 15 * 60;
const REGISTRATION_IP_MAX_REQUESTS = 5;
const REGISTRATION_IDENTIFIER_MAX_REQUESTS = 3;

type Db = typeof pool | PoolConnection;
type CustomerRow = RowDataPacket & {
  id: number; name: string; email: string; email_normalized: string; phone: string; phone_normalized: string;
  gender: string; birthday: string | null; avatar_url: string; status: string; email_verified_at: Date | null;
  password_hash: string; auth_version: number;
};

type RegistrationChallengeRow = RowDataPacket & {
  id: number; registration_token_hash: string; name: string; email: string; email_normalized: string;
  phone: string; phone_normalized: string; password_hash: string; code_hash: string; attempts: number;
  expires_at: Date; resend_available_at: Date;
};

export type CustomerSessionUser = {
  id: number; name: string; email: string; phone: string; gender: string; birthday: string | null;
  emailVerified: boolean; defaultAddress: CustomerAddress | null;
};

export type CustomerAddress = {
  id: number; recipientName: string; phone: string; type: 'home' | 'office' | 'other';
  address: string; provinceCode: string | null; provinceName: string; wardCode: string | null; wardName: string;
  provinceId: number | null; districtId: number | null; districtName: string; wardId: number | null;
  locationSchemaVersion: 'legacy_3tier' | '2025_2tier'; isDefault: boolean;
};

export class CustomerAuthError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: Record<string, unknown>) { super(message); }
}

function tokenHash(token: string) { return crypto.createHash('sha256').update(token).digest('hex'); }
function valueHash(value: string) { return crypto.createHash('sha256').update(value).digest('hex'); }
function requestIp(request: Request) { return String(request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '').split(',')[0].trim().slice(0, 45) || 'unknown'; }
function userAgent(request: Request) { return String(request.headers.get('user-agent') || '').slice(0, 512); }
function getCookie(request: Request, name: string) { return String(request.headers.get('cookie') || '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))?.[1] || ''; }
function registrationToken(request: Request) { return decodeURIComponent(getCookie(request, REGISTRATION_COOKIE)); }
function registrationExpiry(payload: Record<string, unknown>) {
  return { expiresAt: Number(payload.expires_at_epoch || 0) * 1000, resendAvailableAt: Number(payload.resend_available_at_epoch || 0) * 1000 };
}

export function normalizeCustomerEmail(value: unknown) {
  const email = String(value || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) throw new CustomerAuthError(400, 'INVALID_EMAIL', 'Email không hợp lệ.');
  return email;
}

export function normalizeCustomerPhone(value: unknown) {
  let phone = String(value || '').replace(/\D/g, '');
  if (phone.startsWith('84')) phone = `0${phone.slice(2)}`;
  if (!/^0\d{9,10}$/.test(phone)) throw new CustomerAuthError(400, 'INVALID_PHONE', 'Số điện thoại không hợp lệ.');
  return phone;
}

function validatePassword(value: unknown) {
  const password = String(value || '');
  const valid = password.length >= 8 && password.length <= 128
    && /[A-Z]/.test(password) && /[a-z]/.test(password)
    && /\d/.test(password) && /[^A-Za-z0-9\s]/.test(password)
    && !/[\u0000-\u001f\u007f]/.test(password) && password.trim() === password;
  if (!valid) {
    throw new CustomerAuthError(400, 'INVALID_PASSWORD', 'Mật khẩu cần 8–128 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.');
  }
  return password;
}

function customerName(value: unknown) {
  const name = String(value || '').trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 150) throw new CustomerAuthError(400, 'INVALID_NAME', 'Họ và tên cần từ 2 đến 150 ký tự.');
  return name;
}

export function assertCustomerOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const current = new URL(request.url).origin;
  const configured = [process.env.STOREFRONT_ORIGIN, process.env.STOREFRONT_ORIGINS]
    .filter(Boolean)
    .flatMap((value) => String(value).split(','))
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean);
  const originUrl = origin ? (() => { try { return new URL(origin); } catch { return null; } })() : null;
  const localApi = ['localhost', '127.0.0.1'].includes(new URL(request.url).hostname);
  const forwardedHost = String(request.headers.get('x-forwarded-host') || request.headers.get('host') || '');
  const referer = request.headers.get('referer') || '';
  const localStorefront = Boolean(originUrl && ['localhost', '127.0.0.1'].includes(originUrl.hostname) && originUrl.protocol === 'http:' && originUrl.port === '3001');
  const localProxy = localApi && (/(^|:)3001$/.test(forwardedHost) || referer.startsWith('http://localhost:3001') || referer.startsWith('http://127.0.0.1:3001') || !origin);
  const validOrigin = Boolean(origin && (origin === current || configured.includes(origin.replace(/\/$/, '')) || (localApi && localStorefront))) || localProxy;
  if (!validOrigin) {
    throw new CustomerAuthError(403, 'INVALID_ORIGIN', 'Yêu cầu không cùng nguồn gốc.');
  }
}

export async function ensureCustomerAccountTables(db: Db = pool) {
  await db.query(`CREATE TABLE IF NOT EXISTS web_admin_storefront_customers (
    id bigint unsigned NOT NULL AUTO_INCREMENT, name varchar(150) NOT NULL, email varchar(255) NOT NULL,
    email_normalized varchar(255) NOT NULL, phone varchar(32) NOT NULL, phone_normalized varchar(32) NOT NULL,
    gender enum('','male','female','other') NOT NULL DEFAULT '', birthday date NULL, avatar_url varchar(512) NOT NULL DEFAULT '',
    status enum('pending','active','blocked') NOT NULL DEFAULT 'pending', email_verified_at datetime NULL,
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    last_login_at datetime NULL, PRIMARY KEY (id), UNIQUE KEY uq_web_admin_customer_email (email_normalized),
    UNIQUE KEY uq_web_admin_customer_phone (phone_normalized), KEY idx_web_admin_customer_status_created (status, id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await db.query(`CREATE TABLE IF NOT EXISTS web_admin_customer_passwords (
    customer_id bigint unsigned NOT NULL, password_hash varchar(100) NOT NULL, auth_version int unsigned NOT NULL DEFAULT 1,
    password_changed_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (customer_id),
    CONSTRAINT fk_web_admin_customer_password_customer FOREIGN KEY (customer_id) REFERENCES web_admin_storefront_customers(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await db.query(`CREATE TABLE IF NOT EXISTS web_admin_customer_sessions (
    id bigint unsigned NOT NULL AUTO_INCREMENT, customer_id bigint unsigned NOT NULL, token_hash char(64) CHARACTER SET ascii NOT NULL,
    auth_version int unsigned NOT NULL, ip_address varchar(45) NOT NULL DEFAULT '', user_agent varchar(512) NOT NULL DEFAULT '',
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, last_seen_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    idle_window_seconds int unsigned NOT NULL DEFAULT 28800, idle_expires_at datetime NOT NULL, expires_at datetime NOT NULL, revoked_at datetime NULL,
    PRIMARY KEY (id), UNIQUE KEY uq_web_admin_customer_session_token (token_hash),
    KEY idx_web_admin_customer_session_state (customer_id, revoked_at, expires_at),
    CONSTRAINT fk_web_admin_customer_session_customer FOREIGN KEY (customer_id) REFERENCES web_admin_storefront_customers(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const [idleWindowColumn] = await db.query<RowDataPacket[]>(`SELECT 1 FROM information_schema.columns
    WHERE table_schema=DATABASE() AND table_name='web_admin_customer_sessions' AND column_name='idle_window_seconds' LIMIT 1`);
  if (!idleWindowColumn[0]) await db.query('ALTER TABLE web_admin_customer_sessions ADD COLUMN idle_window_seconds int unsigned NOT NULL DEFAULT 28800 AFTER last_seen_at');
  await db.query(`CREATE TABLE IF NOT EXISTS web_admin_customer_auth_codes (
    id bigint unsigned NOT NULL AUTO_INCREMENT, customer_id bigint unsigned NOT NULL, purpose enum('verify_email','password_reset') NOT NULL,
    email_snapshot varchar(255) NOT NULL, code_hash varchar(100) NOT NULL, attempts tinyint unsigned NOT NULL DEFAULT 0,
    requested_ip varchar(45) NOT NULL DEFAULT '', created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, expires_at datetime NOT NULL,
    consumed_at datetime NULL, PRIMARY KEY (id), KEY idx_web_admin_customer_code_lookup (customer_id, purpose, consumed_at, expires_at),
    CONSTRAINT fk_web_admin_customer_code_customer FOREIGN KEY (customer_id) REFERENCES web_admin_storefront_customers(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await db.query(`CREATE TABLE IF NOT EXISTS web_admin_customer_registration_challenges (
    id bigint unsigned NOT NULL AUTO_INCREMENT, registration_token_hash char(64) CHARACTER SET ascii NOT NULL,
    name varchar(150) NOT NULL, email varchar(255) NOT NULL, email_normalized varchar(255) NOT NULL,
    phone varchar(32) NOT NULL, phone_normalized varchar(32) NOT NULL, password_hash varchar(100) NOT NULL,
    code_hash varchar(100) NOT NULL, attempts tinyint unsigned NOT NULL DEFAULT 0, requested_ip varchar(45) NOT NULL DEFAULT '',
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, expires_at datetime NOT NULL, resend_available_at datetime NOT NULL,
    PRIMARY KEY (id), UNIQUE KEY uq_web_admin_registration_token (registration_token_hash),
    UNIQUE KEY uq_web_admin_registration_email (email_normalized), UNIQUE KEY uq_web_admin_registration_phone (phone_normalized),
    KEY idx_web_admin_registration_expires (expires_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await db.query(`CREATE TABLE IF NOT EXISTS web_admin_customer_auth_attempts (
    identifier_hash char(64) CHARACTER SET ascii NOT NULL, ip_address varchar(45) NOT NULL, failed_count tinyint unsigned NOT NULL DEFAULT 0,
    first_failed_at datetime NOT NULL, locked_until datetime NULL, updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (identifier_hash, ip_address), KEY idx_web_admin_customer_attempt_lock (locked_until)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await db.query(`CREATE TABLE IF NOT EXISTS web_admin_customer_abuse_limits (
    scope varchar(40) CHARACTER SET ascii NOT NULL, key_hash char(64) CHARACTER SET ascii NOT NULL,
    request_count smallint unsigned NOT NULL DEFAULT 0, window_started_at datetime NOT NULL,
    blocked_until datetime NULL, updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (scope, key_hash), KEY idx_web_admin_customer_abuse_blocked (blocked_until)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await db.query(`CREATE TABLE IF NOT EXISTS web_admin_customer_addresses (
    id bigint unsigned NOT NULL AUTO_INCREMENT, customer_id bigint unsigned NOT NULL, recipient_name varchar(150) NOT NULL,
    phone varchar(32) NOT NULL, address_type enum('home','office','other') NOT NULL DEFAULT 'home', address_line varchar(255) NOT NULL,
    province_id mediumint NOT NULL, district_id mediumint NULL, ward_id mediumint NULL, is_default tinyint(1) NOT NULL DEFAULT 0,
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id), KEY idx_web_admin_customer_address_default (customer_id, is_default, id),
    CONSTRAINT fk_web_admin_customer_address_customer FOREIGN KEY (customer_id) REFERENCES web_admin_storefront_customers(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await ensureVietnamLocationTables(db);
  await db.query(`CREATE TABLE IF NOT EXISTS web_admin_customer_oauth_identities (
    id bigint unsigned NOT NULL AUTO_INCREMENT, customer_id bigint unsigned NOT NULL, provider varchar(32) NOT NULL,
    provider_subject varchar(255) NOT NULL, provider_email varchar(255) NOT NULL DEFAULT '', created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, PRIMARY KEY (id),
    UNIQUE KEY uq_web_admin_customer_oauth_subject (provider, provider_subject), UNIQUE KEY uq_web_admin_customer_oauth_provider (customer_id, provider),
    CONSTRAINT fk_web_admin_customer_oauth_customer FOREIGN KEY (customer_id) REFERENCES web_admin_storefront_customers(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await db.query(`CREATE TABLE IF NOT EXISTS web_admin_storefront_order_customer (
    order_id int NOT NULL, customer_id bigint unsigned NOT NULL, created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (order_id), KEY idx_web_admin_order_customer_list (customer_id, order_id),
    CONSTRAINT fk_web_admin_order_customer_customer FOREIGN KEY (customer_id) REFERENCES web_admin_storefront_customers(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await db.query(`CREATE TABLE IF NOT EXISTS web_admin_storefront_customer_metrics (
    customer_id bigint unsigned NOT NULL, order_count int unsigned NOT NULL DEFAULT 0,
    completed_order_count int unsigned NOT NULL DEFAULT 0, pending_order_count int unsigned NOT NULL DEFAULT 0,
    total_completed_value bigint unsigned NOT NULL DEFAULT 0, last_order_id int NULL, last_order_at int NULL,
    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (customer_id), KEY idx_web_admin_customer_metrics_orders (order_count, customer_id),
    KEY idx_web_admin_customer_metrics_spend (total_completed_value, customer_id),
    KEY idx_web_admin_customer_metrics_last_order (last_order_id, customer_id),
    CONSTRAINT fk_web_admin_customer_metrics_customer FOREIGN KEY (customer_id) REFERENCES web_admin_storefront_customers(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  const ensureCustomerIndex = async (name: string, statement: string) => {
    const [found] = await db.query<RowDataPacket[]>('SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name=? AND index_name=? LIMIT 1', ['web_admin_storefront_customers', name]);
    if (!found[0]) await db.query(statement);
  };
  await ensureCustomerIndex('idx_web_admin_customer_name_id', 'CREATE INDEX idx_web_admin_customer_name_id ON web_admin_storefront_customers (name, id)');
  await ensureCustomerIndex('idx_web_admin_customer_login_id', 'CREATE INDEX idx_web_admin_customer_login_id ON web_admin_storefront_customers (last_login_at, id)');

  const [blockedPending] = await db.query<RowDataPacket[]>(`
    SELECT c.id
    FROM web_admin_storefront_customers c
    LEFT JOIN web_admin_customer_addresses a ON a.customer_id = c.id
    LEFT JOIN web_admin_customer_sessions s ON s.customer_id = c.id
    LEFT JOIN web_admin_storefront_order_customer o ON o.customer_id = c.id
    WHERE c.status = 'pending' AND c.email_verified_at IS NULL
    GROUP BY c.id
    HAVING COUNT(a.id) > 0 OR COUNT(s.id) > 0 OR COUNT(o.order_id) > 0
    LIMIT 1
  `);
  if (blockedPending[0]) throw new Error(`Cannot clean legacy pending customer ${blockedPending[0].id} because it has related data.`);
  await db.query(`DELETE FROM web_admin_storefront_customers WHERE status = 'pending' AND email_verified_at IS NULL`);

  await db.query(`INSERT INTO web_admin_storefront_customer_metrics (customer_id,order_count,completed_order_count,pending_order_count,total_completed_value,last_order_id,last_order_at)
    SELECT c.id,COUNT(o.id),COALESCE(SUM(o.status=3),0),COALESCE(SUM(o.status IN (1,2)),0),COALESCE(SUM(CASE WHEN o.status=3 THEN o.total_value ELSE 0 END),0),MAX(o.id),MAX(o.create_time)
    FROM web_admin_storefront_customers c
    LEFT JOIN web_admin_storefront_order_customer l ON l.customer_id=c.id
    LEFT JOIN build_buy o ON o.id=l.order_id
    GROUP BY c.id
    ON DUPLICATE KEY UPDATE order_count=VALUES(order_count),completed_order_count=VALUES(completed_order_count),pending_order_count=VALUES(pending_order_count),total_completed_value=VALUES(total_completed_value),last_order_id=VALUES(last_order_id),last_order_at=VALUES(last_order_at)`);
}

async function getDefaultAddress(customerId: number, db: Db = pool) {
  const [rows] = await db.query<RowDataPacket[]>(`SELECT a.*,
    COALESCE(NULLIF(a.province_name_snapshot,''),CONVERT(CAST(p.name AS BINARY) USING utf8mb4),'') province_name,
    CONVERT(CAST(d.name AS BINARY) USING utf8mb4) district_name,
    COALESCE(NULLIF(a.ward_name_snapshot,''),CONVERT(CAST(w.name AS BINARY) USING utf8mb4),'') ward_name FROM web_admin_customer_addresses a
    LEFT JOIN province_list p ON p.id=a.province_id LEFT JOIN province_district_list d ON d.id=a.district_id
    LEFT JOIN province_ward_list w ON w.id=a.ward_id WHERE a.customer_id=? ORDER BY a.is_default DESC,a.id DESC LIMIT 1`, [customerId]);
  return rows[0] ? mapAddress(rows[0]) : null;
}

function mapAddress(row: any): CustomerAddress {
  return { id:Number(row.id), recipientName:String(row.recipient_name), phone:String(row.phone), type:(['home','office','other'].includes(String(row.address_type)) ? row.address_type : 'other') as CustomerAddress['type'], address:String(row.address_line), provinceCode:row.province_code ? String(row.province_code) : null, provinceName:String(row.province_name || row.province_name_snapshot || ''), wardCode:row.ward_code ? String(row.ward_code) : null, wardName:String(row.ward_name || row.ward_name_snapshot || ''), provinceId:row.province_id === null ? null : Number(row.province_id), districtId:row.district_id === null ? null : Number(row.district_id), districtName:String(row.district_name || ''), wardId:row.ward_id === null ? null : Number(row.ward_id), locationSchemaVersion:row.location_schema_version === '2025_2tier' ? '2025_2tier' : 'legacy_3tier', isDefault:Number(row.is_default) === 1 };
}

function mapCustomer(row: CustomerRow, defaultAddress: CustomerAddress | null): CustomerSessionUser {
  return { id:Number(row.id), name:String(row.name), email:String(row.email), phone:String(row.phone), gender:String(row.gender || ''), birthday:row.birthday ? String(row.birthday).slice(0, 10) : null, emailVerified:Boolean(row.email_verified_at), defaultAddress };
}

async function findCustomer(identifier: string, db: Db = pool) {
  const email = identifier.includes('@') ? normalizeCustomerEmail(identifier) : '';
  const phone = email ? '' : normalizeCustomerPhone(identifier);
  const [rows] = await db.query<CustomerRow[]>(`SELECT c.*,p.password_hash,p.auth_version FROM web_admin_storefront_customers c JOIN web_admin_customer_passwords p ON p.customer_id=c.id WHERE ${email ? 'c.email_normalized=?' : 'c.phone_normalized=?'} LIMIT 1`, [email || phone]);
  return rows[0] || null;
}

async function isLocked(identifier: string, ip: string) {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT 1 FROM web_admin_customer_auth_attempts WHERE identifier_hash=? AND ip_address=? AND locked_until>NOW() LIMIT 1', [valueHash(identifier), ip]);
  return Boolean(rows[0]);
}

async function recordLoginFailure(identifier: string, ip: string) {
  const key = valueHash(identifier);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query<RowDataPacket[]>(`SELECT failed_count, first_failed_at > DATE_SUB(NOW(), INTERVAL ? SECOND) AS inside_window FROM web_admin_customer_auth_attempts WHERE identifier_hash=? AND ip_address=? FOR UPDATE`, [LOGIN_WINDOW_SECONDS, key, ip]);
    const failures = (rows[0] && Number(rows[0].inside_window) === 1 ? Number(rows[0].failed_count) : 0) + 1;
    const lockSql = failures >= LOGIN_MAX_FAILURES ? `DATE_ADD(NOW(), INTERVAL ${LOGIN_LOCK_SECONDS} SECOND)` : 'NULL';
    await connection.query(`INSERT INTO web_admin_customer_auth_attempts(identifier_hash,ip_address,failed_count,first_failed_at,locked_until) VALUES(?,?,?,NOW(),${lockSql}) ON DUPLICATE KEY UPDATE failed_count=VALUES(failed_count),first_failed_at=NOW(),locked_until=VALUES(locked_until)`, [key, ip, failures]);
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}

async function clearLoginFailures(identifier: string, ip: string) { await pool.query('DELETE FROM web_admin_customer_auth_attempts WHERE identifier_hash=? AND ip_address=?', [valueHash(identifier), ip]); }

async function createSession(customer: Pick<CustomerRow, 'id' | 'auth_version'>, request: Request, rememberMe: boolean, db: Db = pool) {
  const token = crypto.randomBytes(32).toString('base64url');
  const maxAgeSeconds = rememberMe ? REMEMBER_SESSION_SECONDS : DEFAULT_SESSION_SECONDS;
  const idleSeconds = rememberMe ? REMEMBER_IDLE_SECONDS : DEFAULT_IDLE_SECONDS;
  await db.query(`INSERT INTO web_admin_customer_sessions(customer_id,token_hash,auth_version,ip_address,user_agent,last_seen_at,idle_window_seconds,idle_expires_at,expires_at) VALUES(?,?,?,?,?,NOW(),?,DATE_ADD(NOW(), INTERVAL ? SECOND),DATE_ADD(NOW(), INTERVAL ? SECOND))`, [customer.id, tokenHash(token), customer.auth_version, requestIp(request), userAgent(request), idleSeconds, idleSeconds, maxAgeSeconds]);
  return { token, maxAgeSeconds };
}

async function consumeAbuseLimit(scope: string, key: string, maximum: number) {
  const hashed = valueHash(key);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query<RowDataPacket[]>(`SELECT request_count,
      window_started_at > DATE_SUB(NOW(), INTERVAL ? SECOND) AS inside_window,
      blocked_until > NOW() AS blocked,
      GREATEST(0, TIMESTAMPDIFF(SECOND, NOW(), blocked_until)) AS retry_after
      FROM web_admin_customer_abuse_limits WHERE scope=? AND key_hash=? FOR UPDATE`, [REGISTRATION_WINDOW_SECONDS, scope, hashed]);
    const row = rows[0];
    if (row && Number(row.blocked) === 1) {
      throw new CustomerAuthError(429, 'RATE_LIMITED', 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.', { retryAfter: Math.max(1, Number(row.retry_after) || REGISTRATION_WINDOW_SECONDS) });
    }
    const insideWindow = Boolean(row && Number(row.inside_window) === 1);
    const count = (insideWindow ? Number(row.request_count) : 0) + 1;
    const blocked = count > maximum;
    await connection.query(`INSERT INTO web_admin_customer_abuse_limits(scope,key_hash,request_count,window_started_at,blocked_until)
      VALUES(?,?,?,NOW(),${blocked ? `DATE_ADD(NOW(), INTERVAL ${REGISTRATION_WINDOW_SECONDS} SECOND)` : 'NULL'})
      ON DUPLICATE KEY UPDATE request_count=VALUES(request_count),
      window_started_at=IF(?=1,window_started_at,NOW()),blocked_until=VALUES(blocked_until)`, [scope, hashed, count, insideWindow ? 1 : 0]);
    await connection.commit();
    if (blocked) throw new CustomerAuthError(429, 'RATE_LIMITED', 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.', { retryAfter: REGISTRATION_WINDOW_SECONDS });
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}

async function enforceRegistrationLimits(request: Request, email: string, phone: string) {
  await consumeAbuseLimit('register_ip', requestIp(request), REGISTRATION_IP_MAX_REQUESTS);
  await consumeAbuseLimit('register_email', email, REGISTRATION_IDENTIFIER_MAX_REQUESTS);
  await consumeAbuseLimit('register_phone', phone, REGISTRATION_IDENTIFIER_MAX_REQUESTS);
}

export async function registerCustomer(request: Request, payload: any) {
  const name = customerName(payload?.name); const email = normalizeCustomerEmail(payload?.email); const phone = normalizeCustomerPhone(payload?.phone); const password = validatePassword(payload?.password);
  await enforceRegistrationLimits(request, email, phone);
  const passwordHash = await hashPassword(password);
  const token = crypto.randomBytes(32).toString('base64url');
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  const codeHash = await bcrypt.hash(code, 10);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [existing] = await connection.query<RowDataPacket[]>('SELECT id FROM web_admin_storefront_customers WHERE email_normalized=? OR phone_normalized=? LIMIT 1 FOR UPDATE', [email, phone]);
    if (existing[0]) throw new CustomerAuthError(409, 'IDENTIFIER_EXISTS', 'Email hoặc số điện thoại đã được sử dụng.');
    const [challenges] = await connection.query<RegistrationChallengeRow[]>('SELECT * FROM web_admin_customer_registration_challenges WHERE email_normalized=? OR phone_normalized=? LIMIT 1 FOR UPDATE', [email, phone]);
    const challenge = challenges[0];
    if (challenge && (challenge.email_normalized !== email || challenge.phone_normalized !== phone)) throw new CustomerAuthError(409, 'REGISTRATION_PENDING', 'Email hoặc số điện thoại đang có yêu cầu đăng ký chưa hoàn tất.');
    if (challenge) {
      const [cooldown] = await connection.query<RowDataPacket[]>('SELECT resend_available_at>NOW() AS waiting FROM web_admin_customer_registration_challenges WHERE id=? FOR UPDATE', [challenge.id]);
      if (Number(cooldown[0]?.waiting) === 1) throw new CustomerAuthError(429, 'OTP_COOLDOWN', 'Vui lòng chờ trước khi yêu cầu gửi lại mã.');
      await connection.query(`UPDATE web_admin_customer_registration_challenges SET registration_token_hash=?,name=?,email=?,phone=?,password_hash=?,code_hash=?,attempts=0,requested_ip=?,created_at=NOW(),expires_at=DATE_ADD(NOW(), INTERVAL ? SECOND),resend_available_at=DATE_ADD(NOW(), INTERVAL ? SECOND) WHERE id=?`, [tokenHash(token), name, email, phone, passwordHash, codeHash, requestIp(request), OTP_TTL_SECONDS, OTP_COOLDOWN_SECONDS, challenge.id]);
    } else {
      await connection.query(`INSERT INTO web_admin_customer_registration_challenges(registration_token_hash,name,email,email_normalized,phone,phone_normalized,password_hash,code_hash,requested_ip,expires_at,resend_available_at) VALUES(?,?,?,?,?,?,?,?,?,DATE_ADD(NOW(), INTERVAL ? SECOND),DATE_ADD(NOW(), INTERVAL ? SECOND))`, [tokenHash(token), name, email, email, phone, phone, passwordHash, codeHash, requestIp(request), OTP_TTL_SECONDS, OTP_COOLDOWN_SECONDS]);
    }
    const [times] = await connection.query<RowDataPacket[]>(`SELECT UNIX_TIMESTAMP(expires_at) AS expires_at_epoch, UNIX_TIMESTAMP(resend_available_at) AS resend_available_at_epoch FROM web_admin_customer_registration_challenges WHERE registration_token_hash=? LIMIT 1`, [tokenHash(token)]);
    await connection.commit();
    return { email, token, code, ...registrationExpiry(times[0] || {}) };
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}

async function issueCustomerCode(customerId: number, email: string, purpose: 'verify_email' | 'password_reset', request: Request) {
  const [current] = await pool.query<RowDataPacket[]>(`SELECT 1 FROM web_admin_customer_auth_codes WHERE customer_id=? AND purpose=? AND consumed_at IS NULL AND expires_at>NOW() AND created_at>DATE_SUB(NOW(), INTERVAL ? SECOND) ORDER BY id DESC LIMIT 1`, [customerId, purpose, OTP_COOLDOWN_SECONDS]);
  if (current[0]) throw new CustomerAuthError(429, 'OTP_COOLDOWN', 'Vui lòng chờ trước khi yêu cầu gửi lại mã.');
  await pool.query('UPDATE web_admin_customer_auth_codes SET consumed_at=NOW() WHERE customer_id=? AND purpose=? AND consumed_at IS NULL', [customerId, purpose]);
  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
  await pool.query(`INSERT INTO web_admin_customer_auth_codes(customer_id,purpose,email_snapshot,code_hash,requested_ip,expires_at) VALUES(?,?,?,?,?,DATE_ADD(NOW(), INTERVAL ? SECOND))`, [customerId, purpose, email, await bcrypt.hash(code, 10), requestIp(request), OTP_TTL_SECONDS]);
  return code;
}

async function consumeCustomerCode(connection: PoolConnection, customerId: number, purpose: 'verify_email' | 'password_reset', code: unknown) {
  const [rows] = await connection.query<RowDataPacket[]>(`SELECT *, expires_at<=NOW() AS is_expired FROM web_admin_customer_auth_codes WHERE customer_id=? AND purpose=? AND consumed_at IS NULL ORDER BY id DESC LIMIT 1 FOR UPDATE`, [customerId, purpose]);
  const row = rows[0];
  if (!row || Number(row.is_expired) === 1) throw new CustomerAuthError(400, 'OTP_EXPIRED', 'Mã xác thực đã hết hạn.');
  if (Number(row.attempts) >= OTP_MAX_ATTEMPTS) throw new CustomerAuthError(429, 'OTP_LOCKED', 'Mã xác thực đã vượt quá số lần thử.');
  if (!await bcrypt.compare(String(code || ''), String(row.code_hash))) { await connection.query('UPDATE web_admin_customer_auth_codes SET attempts=attempts+1 WHERE id=?', [row.id]); throw new CustomerAuthError(400, 'INVALID_OTP', 'Mã xác thực không đúng.'); }
  await connection.query('UPDATE web_admin_customer_auth_codes SET consumed_at=NOW() WHERE id=?', [row.id]);
}

export async function verifyCustomerEmail(request: Request, payload: any) {
  const token = registrationToken(request);
  if (!token) throw new CustomerAuthError(400, 'REGISTRATION_EXPIRED', 'Phiên đăng ký đã hết hạn. Vui lòng đăng ký lại.');
  const connection = await pool.getConnection();
  let committed = false;
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query<RegistrationChallengeRow[]>(`SELECT *, expires_at<=NOW() AS is_expired FROM web_admin_customer_registration_challenges WHERE registration_token_hash=? LIMIT 1 FOR UPDATE`, [tokenHash(token)]);
    const challenge = rows[0];
    if (!challenge || Number((challenge as any).is_expired) === 1) throw new CustomerAuthError(400, 'OTP_EXPIRED', 'Mã xác thực đã hết hạn.');
    if (Number(challenge.attempts) >= OTP_MAX_ATTEMPTS) throw new CustomerAuthError(429, 'OTP_LOCKED', 'Mã xác thực đã vượt quá số lần thử.');
    if (!await bcrypt.compare(String(payload?.code || ''), String(challenge.code_hash))) {
      const nextAttempts = Number(challenge.attempts) + 1;
      await connection.query('UPDATE web_admin_customer_registration_challenges SET attempts=? WHERE id=?', [nextAttempts, challenge.id]);
      await connection.commit();
      committed = true;
      if (nextAttempts >= OTP_MAX_ATTEMPTS) throw new CustomerAuthError(429, 'OTP_LOCKED', 'Mã xác thực đã vượt quá số lần thử.');
      throw new CustomerAuthError(400, 'INVALID_OTP', 'Mã xác thực không đúng.');
    }
    const [existing] = await connection.query<RowDataPacket[]>('SELECT id FROM web_admin_storefront_customers WHERE email_normalized=? OR phone_normalized=? LIMIT 1 FOR UPDATE', [challenge.email_normalized, challenge.phone_normalized]);
    if (existing[0]) throw new CustomerAuthError(409, 'IDENTIFIER_EXISTS', 'Email hoặc số điện thoại đã được sử dụng.');
    const [result] = await connection.query<ResultSetHeader>(`INSERT INTO web_admin_storefront_customers(name,email,email_normalized,phone,phone_normalized,status,email_verified_at) VALUES(?,?,?,?,?,'active',NOW())`, [challenge.name, challenge.email, challenge.email_normalized, challenge.phone, challenge.phone_normalized]);
    const customerId = Number(result.insertId);
    await connection.query('INSERT INTO web_admin_customer_passwords(customer_id,password_hash) VALUES(?,?)', [customerId, challenge.password_hash]);
    await connection.query('DELETE FROM web_admin_customer_registration_challenges WHERE id=?', [challenge.id]);
    await connection.commit();
    committed = true;
    return { customerId, email: challenge.email, verified: true };
  } catch (error) { if (!committed) await connection.rollback(); throw error; } finally { connection.release(); }
}

export async function resendCustomerVerification(request: Request) {
  const token = registrationToken(request);
  if (!token) throw new CustomerAuthError(400, 'REGISTRATION_EXPIRED', 'Phiên đăng ký đã hết hạn. Vui lòng đăng ký lại.');
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query<RegistrationChallengeRow[]>(`SELECT *, resend_available_at>NOW() AS waiting, expires_at<=NOW() AS is_expired FROM web_admin_customer_registration_challenges WHERE registration_token_hash=? LIMIT 1 FOR UPDATE`, [tokenHash(token)]);
    const challenge = rows[0];
    if (!challenge || Number((challenge as any).is_expired) === 1) throw new CustomerAuthError(400, 'REGISTRATION_EXPIRED', 'Phiên đăng ký đã hết hạn. Vui lòng đăng ký lại.');
    if (Number((challenge as any).waiting) === 1) throw new CustomerAuthError(429, 'OTP_COOLDOWN', 'Vui lòng chờ trước khi yêu cầu gửi lại mã.');
    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    await connection.query(`UPDATE web_admin_customer_registration_challenges SET code_hash=?,attempts=0,requested_ip=?,created_at=NOW(),expires_at=DATE_ADD(NOW(), INTERVAL ? SECOND),resend_available_at=DATE_ADD(NOW(), INTERVAL ? SECOND) WHERE id=?`, [await bcrypt.hash(code, 10), requestIp(request), OTP_TTL_SECONDS, OTP_COOLDOWN_SECONDS, challenge.id]);
    const [times] = await connection.query<RowDataPacket[]>(`SELECT UNIX_TIMESTAMP(expires_at) AS expires_at_epoch, UNIX_TIMESTAMP(resend_available_at) AS resend_available_at_epoch FROM web_admin_customer_registration_challenges WHERE id=?`, [challenge.id]);
    await connection.commit();
    return { email: challenge.email, code, ...registrationExpiry(times[0] || {}) };
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}

export async function discardRegistrationChallenge(token: string) {
  if (!token) return;
  await pool.query('DELETE FROM web_admin_customer_registration_challenges WHERE registration_token_hash=?', [tokenHash(token)]);
}

export async function releaseRegistrationResendCooldown(request: Request) {
  const token = registrationToken(request);
  if (!token) return;
  await pool.query('UPDATE web_admin_customer_registration_challenges SET resend_available_at=NOW() WHERE registration_token_hash=?', [tokenHash(token)]);
}

export async function loginCustomer(request: Request, payload: any) {
  const identifier = String(payload?.identifier || '').trim().toLowerCase(); if (!identifier) throw new CustomerAuthError(400, 'INVALID_CREDENTIALS', 'Thông tin đăng nhập không hợp lệ.');
  const ip = requestIp(request); if (await isLocked(identifier, ip)) throw new CustomerAuthError(429, 'LOGIN_LOCKED', 'Thông tin đăng nhập tạm thời bị khóa. Vui lòng thử lại sau.');
  let customer: CustomerRow | null = null; try { customer = await findCustomer(identifier); } catch { customer = null; }
  const valid = Boolean(customer && customer.status === 'active' && customer.email_verified_at && await verifyPassword(String(customer.password_hash || ''), String(payload?.password || '')));
  if (!valid || !customer) { await recordLoginFailure(identifier, ip); throw new CustomerAuthError(401, 'INVALID_CREDENTIALS', 'Thông tin đăng nhập không hợp lệ.'); }
  await clearLoginFailures(identifier, ip);
  if (passwordNeedsRehash(String(customer.password_hash || ''))) await pool.query('UPDATE web_admin_customer_passwords SET password_hash=? WHERE customer_id=?', [await hashPassword(String(payload?.password || '')), customer.id]);
  const session = await createSession(customer, request, Boolean(payload?.rememberMe)); await pool.query('UPDATE web_admin_storefront_customers SET last_login_at=NOW() WHERE id=?', [customer.id]);
  return { session, user: mapCustomer(customer, await getDefaultAddress(customer.id)) };
}

export async function requestPasswordReset(request: Request, payload: any) {
  let email = ''; try { email = normalizeCustomerEmail(payload?.email); } catch { return { sent: true, email: '' }; }
  const [rows] = await pool.query<CustomerRow[]>('SELECT c.*,p.password_hash,p.auth_version FROM web_admin_storefront_customers c JOIN web_admin_customer_passwords p ON p.customer_id=c.id WHERE c.email_normalized=? AND c.status=? LIMIT 1', [email, 'active']);
  const customer = rows[0]; if (!customer) return { sent: true, email };
  return { sent: true, email, code: await issueCustomerCode(customer.id, email, 'password_reset', request) };
}

export async function confirmPasswordReset(payload: any) {
  const email = normalizeCustomerEmail(payload?.email); const password = validatePassword(payload?.password); const connection = await pool.getConnection();
  try { await connection.beginTransaction(); const [rows] = await connection.query<CustomerRow[]>('SELECT c.*,p.password_hash,p.auth_version FROM web_admin_storefront_customers c JOIN web_admin_customer_passwords p ON p.customer_id=c.id WHERE c.email_normalized=? LIMIT 1 FOR UPDATE', [email]); const customer = rows[0]; if (!customer) throw new CustomerAuthError(400, 'INVALID_OTP', 'Mã xác thực không đúng.'); await consumeCustomerCode(connection, customer.id, 'password_reset', payload?.code); await connection.query('UPDATE web_admin_customer_passwords SET password_hash=?,auth_version=auth_version+1,password_changed_at=NOW() WHERE customer_id=?', [await hashPassword(password), customer.id]); await connection.query('UPDATE web_admin_customer_sessions SET revoked_at=NOW() WHERE customer_id=? AND revoked_at IS NULL', [customer.id]); await connection.commit(); return { email }; } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
}

export async function resolveCustomerSession(request: Request): Promise<CustomerSessionUser | null> {
  const token = decodeURIComponent(getCookie(request, CUSTOMER_SESSION_COOKIE)); if (!token || token.length < 20) return null;
  const [rows] = await pool.query<CustomerRow[]>(`SELECT c.*,p.password_hash,p.auth_version,s.auth_version session_version,s.last_seen_at,s.idle_expires_at,s.expires_at FROM web_admin_customer_sessions s JOIN web_admin_storefront_customers c ON c.id=s.customer_id JOIN web_admin_customer_passwords p ON p.customer_id=c.id WHERE s.token_hash=? AND s.revoked_at IS NULL AND s.expires_at>NOW() AND s.idle_expires_at>NOW() LIMIT 1`, [tokenHash(token)]);
  const customer = rows[0] as CustomerRow & { session_version?: number } | undefined;
  if (!customer || customer.status !== 'active' || Number(customer.auth_version) !== Number(customer.session_version)) return null;
  const [defaultAddress] = await Promise.all([
    getDefaultAddress(customer.id),
    pool.query(`UPDATE web_admin_customer_sessions SET last_seen_at=NOW(),
      idle_expires_at=LEAST(expires_at,DATE_ADD(NOW(),INTERVAL idle_window_seconds SECOND))
      WHERE token_hash=? AND last_seen_at<=DATE_SUB(NOW(), INTERVAL ? SECOND)`, [tokenHash(token), LOGIN_WINDOW_SECONDS]),
  ]);
  return mapCustomer(customer, defaultAddress);
}

export async function requireCustomerSession(request: Request) { const customer = await resolveCustomerSession(request); if (!customer) throw new CustomerAuthError(401, 'UNAUTHENTICATED', 'Vui lòng đăng nhập để tiếp tục.'); return customer; }
export async function logoutCustomer(request: Request) { const token = decodeURIComponent(getCookie(request, CUSTOMER_SESSION_COOKIE)); if (token) await pool.query('UPDATE web_admin_customer_sessions SET revoked_at=NOW() WHERE token_hash=?', [tokenHash(token)]); }

export async function changeCustomerPassword(request: Request, payload: any) {
  const user = await requireCustomerSession(request); const password = validatePassword(payload?.newPassword); const [rows] = await pool.query<CustomerRow[]>('SELECT c.*,p.password_hash,p.auth_version FROM web_admin_storefront_customers c JOIN web_admin_customer_passwords p ON p.customer_id=c.id WHERE c.id=? LIMIT 1', [user.id]); const customer = rows[0];
  if (!customer || !await verifyPassword(String(customer.password_hash), String(payload?.currentPassword || ''))) throw new CustomerAuthError(400, 'INVALID_CURRENT_PASSWORD', 'Mật khẩu hiện tại không đúng.');
  await pool.query('UPDATE web_admin_customer_passwords SET password_hash=?,auth_version=auth_version+1,password_changed_at=NOW() WHERE customer_id=?', [await hashPassword(password), user.id]); await pool.query('UPDATE web_admin_customer_sessions SET revoked_at=NOW() WHERE customer_id=? AND revoked_at IS NULL', [user.id]);
}

export async function updateCustomerProfile(request: Request, payload: any) {
  const user = await requireCustomerSession(request); const name = customerName(payload?.name); const gender = ['','male','female','other'].includes(String(payload?.gender || '')) ? String(payload?.gender || '') : ''; const birthday = /^\d{4}-\d{2}-\d{2}$/.test(String(payload?.birthday || '')) ? String(payload.birthday) : null;
  await pool.query('UPDATE web_admin_storefront_customers SET name=?,gender=?,birthday=? WHERE id=?', [name, gender, birthday, user.id]); return requireCustomerSession(request);
}

async function normalizeAddressPayload(payload: any) {
  const recipientName = customerName(payload?.recipientName); const phone = normalizeCustomerPhone(payload?.phone); const address = String(payload?.address || '').trim(); if (address.length < 3 || address.length > 255) throw new CustomerAuthError(400, 'INVALID_ADDRESS', 'Địa chỉ cụ thể không hợp lệ.');
  const type = ['home','office','other'].includes(String(payload?.type)) ? String(payload.type) : 'home';
  const location = await resolveVietnamLocation(payload?.provinceCode, payload?.wardCode).catch(() => null);
  if (!location) throw new CustomerAuthError(400, 'INVALID_LOCATION', 'Phường/xã không thuộc tỉnh/thành phố đã chọn.');
  return { recipientName, phone, address, type, ...location };
}

async function setDefaultAddress(connection: PoolConnection, customerId: number, addressId: number) { await connection.query('SELECT id FROM web_admin_storefront_customers WHERE id=? FOR UPDATE', [customerId]); await connection.query('UPDATE web_admin_customer_addresses SET is_default=0 WHERE customer_id=?', [customerId]); await connection.query('UPDATE web_admin_customer_addresses SET is_default=1 WHERE id=? AND customer_id=?', [addressId, customerId]); }

export async function listCustomerAddresses(request: Request) { const user = await requireCustomerSession(request); const [rows] = await pool.query<RowDataPacket[]>(`SELECT a.*,COALESCE(NULLIF(a.province_name_snapshot,''),CONVERT(CAST(p.name AS BINARY) USING utf8mb4),'') province_name,CONVERT(CAST(d.name AS BINARY) USING utf8mb4) district_name,COALESCE(NULLIF(a.ward_name_snapshot,''),CONVERT(CAST(w.name AS BINARY) USING utf8mb4),'') ward_name FROM web_admin_customer_addresses a LEFT JOIN province_list p ON p.id=a.province_id LEFT JOIN province_district_list d ON d.id=a.district_id LEFT JOIN province_ward_list w ON w.id=a.ward_id WHERE a.customer_id=? ORDER BY a.is_default DESC,a.id DESC`, [user.id]); return rows.map(mapAddress); }

export async function createCustomerAddress(request: Request, payload: any) { const user = await requireCustomerSession(request); const value = await normalizeAddressPayload(payload); const connection = await pool.getConnection(); try { await connection.beginTransaction(); const [result] = await connection.query<ResultSetHeader>(`INSERT INTO web_admin_customer_addresses(customer_id,recipient_name,phone,address_type,address_line,province_id,province_code,district_id,ward_id,ward_code,province_name_snapshot,ward_name_snapshot,province_division_type,ward_division_type,location_schema_version,is_default) VALUES(?,?,?,?,?,NULL,?,NULL,NULL,?,?,?,?,?,'2025_2tier',0)`, [user.id,value.recipientName,value.phone,value.type,value.address,value.provinceCode,value.wardCode,value.provinceName,value.wardName,value.provinceDivisionType,value.wardDivisionType]); const id=Number(result.insertId); const [count] = await connection.query<RowDataPacket[]>('SELECT COUNT(*) total FROM web_admin_customer_addresses WHERE customer_id=?', [user.id]); if (payload?.isDefault || Number(count[0].total) === 1) await setDefaultAddress(connection,user.id,id); await connection.commit(); return id; } catch(error) { await connection.rollback(); throw error; } finally { connection.release(); } }

export async function updateCustomerAddress(request: Request, addressId: number, payload: any) { const user=await requireCustomerSession(request); const value=await normalizeAddressPayload(payload); const connection=await pool.getConnection(); try { await connection.beginTransaction(); const [result]=await connection.query<ResultSetHeader>(`UPDATE web_admin_customer_addresses SET recipient_name=?,phone=?,address_type=?,address_line=?,province_id=NULL,province_code=?,district_id=NULL,ward_id=NULL,ward_code=?,province_name_snapshot=?,ward_name_snapshot=?,province_division_type=?,ward_division_type=?,location_schema_version='2025_2tier' WHERE id=? AND customer_id=?`,[value.recipientName,value.phone,value.type,value.address,value.provinceCode,value.wardCode,value.provinceName,value.wardName,value.provinceDivisionType,value.wardDivisionType,addressId,user.id]); if(!result.affectedRows) throw new CustomerAuthError(404,'NOT_FOUND','Không tìm thấy địa chỉ.'); if(payload?.isDefault) await setDefaultAddress(connection,user.id,addressId); await connection.commit(); } catch(error){await connection.rollback();throw error;} finally{connection.release();} }

export async function deleteCustomerAddress(request: Request, addressId: number) { const user=await requireCustomerSession(request); const connection=await pool.getConnection(); try { await connection.beginTransaction(); const [rows]=await connection.query<RowDataPacket[]>('SELECT is_default FROM web_admin_customer_addresses WHERE id=? AND customer_id=? FOR UPDATE',[addressId,user.id]); if(!rows[0]) throw new CustomerAuthError(404,'NOT_FOUND','Không tìm thấy địa chỉ.'); await connection.query('DELETE FROM web_admin_customer_addresses WHERE id=? AND customer_id=?',[addressId,user.id]); if(Number(rows[0].is_default)===1){const [next]=await connection.query<RowDataPacket[]>('SELECT id FROM web_admin_customer_addresses WHERE customer_id=? ORDER BY id DESC LIMIT 1',[user.id]);if(next[0]) await setDefaultAddress(connection,user.id,Number(next[0].id));} await connection.commit(); }catch(error){await connection.rollback();throw error;}finally{connection.release();} }
export async function makeCustomerAddressDefault(request: Request,addressId:number){const user=await requireCustomerSession(request);const c=await pool.getConnection();try{await c.beginTransaction();const [rows]=await c.query<RowDataPacket[]>('SELECT id FROM web_admin_customer_addresses WHERE id=? AND customer_id=? FOR UPDATE',[addressId,user.id]);if(!rows[0])throw new CustomerAuthError(404,'NOT_FOUND','Không tìm thấy địa chỉ.');await setDefaultAddress(c,user.id,addressId);await c.commit();}catch(error){await c.rollback();throw error;}finally{c.release();}}

export async function getCustomerProvinces() { try { return await getVietnamProvinces(); } catch { throw new CustomerAuthError(503, 'LOCATION_UNAVAILABLE', 'Danh mục tỉnh/thành phố tạm thời chưa sẵn sàng.'); } }
export async function getCustomerWards(provinceCode:string){try{return await getVietnamWards(provinceCode);}catch{throw new CustomerAuthError(503,'LOCATION_UNAVAILABLE','Danh mục phường/xã tạm thời chưa sẵn sàng.');}}

export async function refreshCustomerMetrics(db: Db, customerId: number) {
  await db.query(`INSERT INTO web_admin_storefront_customer_metrics (customer_id,order_count,completed_order_count,pending_order_count,total_completed_value,last_order_id,last_order_at)
    SELECT c.id,COUNT(o.id),COALESCE(SUM(o.status=3),0),COALESCE(SUM(o.status IN (1,2)),0),COALESCE(SUM(CASE WHEN o.status=3 THEN o.total_value ELSE 0 END),0),MAX(o.id),MAX(o.create_time)
    FROM web_admin_storefront_customers c
    LEFT JOIN web_admin_storefront_order_customer l ON l.customer_id=c.id
    LEFT JOIN build_buy o ON o.id=l.order_id
    WHERE c.id=? GROUP BY c.id
    ON DUPLICATE KEY UPDATE order_count=VALUES(order_count),completed_order_count=VALUES(completed_order_count),pending_order_count=VALUES(pending_order_count),total_completed_value=VALUES(total_completed_value),last_order_id=VALUES(last_order_id),last_order_at=VALUES(last_order_at)`, [customerId]);
}

export async function linkOrderToCustomer(connection: PoolConnection, orderId:number, customerId:number|null){if(!customerId)return;await connection.query('INSERT IGNORE INTO web_admin_storefront_order_customer(order_id,customer_id) VALUES(?,?)',[orderId,customerId]);await refreshCustomerMetrics(connection,customerId);}

function customerOrderStatus(status:number){return ({1:'Chờ xử lý',2:'Đã xác nhận',3:'Hoàn tất',4:'Thất bại',5:'Đã hủy'} as Record<number,string>)[status]||'Không xác định';}
export async function listCustomerOrders(request:Request, params:URLSearchParams){const user=await requireCustomerSession(request);const cursor=Math.max(0,Number(params.get('cursor')||0));const status=Number(params.get('status')||0);const q=String(params.get('q')||'').trim();const values:any[]=[user.id];const where=['l.customer_id=?'];if(cursor){where.push('o.id<?');values.push(cursor);}if([1,2,3,4,5].includes(status)){where.push('o.status=?');values.push(status);}if(/^\d+$/.test(q)){where.push('o.id=?');values.push(Number(q));}const [rows]=await pool.query<RowDataPacket[]>(`SELECT o.id,o.product_title,o.total_value,o.status,o.create_time,m.shipping_status,r.code_snapshot,r.discount_amount FROM web_admin_storefront_order_customer l JOIN build_buy o ON o.id=l.order_id LEFT JOIN web_admin_storefront_order_meta m ON m.order_id=o.id LEFT JOIN web_admin_voucher_redemptions r ON r.order_id=o.id WHERE ${where.join(' AND ')} ORDER BY o.id DESC LIMIT 21`,[...values]);const hasMore=rows.length>20;const items=rows.slice(0,20).map(x=>({id:Number(x.id),title:String(x.product_title||''),totalValue:Number(x.total_value||0),status:Number(x.status),statusLabel:customerOrderStatus(Number(x.status)),shippingStatus:String(x.shipping_status||'pending'),createTime:Number(x.create_time||0),voucherCode:x.code_snapshot?String(x.code_snapshot):null,voucherDiscount:Number(x.discount_amount||0)}));return {items,nextCursor:hasMore?items.at(-1)?.id||null:null};}
export async function getCustomerOrder(request:Request,id:number){const user=await requireCustomerSession(request);const [orders]=await pool.query<RowDataPacket[]>(`SELECT o.*,m.payment_status,m.shipping_status,m.delivery_method,r.code_snapshot,r.discount_amount FROM web_admin_storefront_order_customer l JOIN build_buy o ON o.id=l.order_id LEFT JOIN web_admin_storefront_order_meta m ON m.order_id=o.id LEFT JOIN web_admin_voucher_redemptions r ON r.order_id=o.id WHERE l.customer_id=? AND o.id=? LIMIT 1`,[user.id,id]);const order=orders[0];if(!order)throw new CustomerAuthError(404,'NOT_FOUND','Không tìm thấy đơn hàng.');const [items]=await pool.query<RowDataPacket[]>('SELECT product_id,title,product_price,quantity FROM build_buy_item WHERE order_id=? ORDER BY id',[id]);let buyer:any={};let config:any={};try{buyer=JSON.parse(String(order.buyer_info||'{}').replace(/\\u/g,'\\u'));config=JSON.parse(String(order.config||'{}').replace(/\\u/g,'\\u'));}catch{}return {id:Number(order.id),title:String(order.product_title||''),totalValue:Number(order.total_value||0),status:Number(order.status),statusLabel:customerOrderStatus(Number(order.status)),createTime:Number(order.create_time||0),delivery:buyer.delivery||{},receiver:buyer.receiver||{},paymentMethod:buyer.paymentMethod||'',shippingStatus:String(order.shipping_status||'pending'),paymentStatus:String(order.payment_status||'unpaid'),voucher:order.code_snapshot?{code:String(order.code_snapshot),discount:Number(order.discount_amount||0)}:null,totals:config.totals||{},items:items.map(x=>({productId:Number(x.product_id),title:String(x.title||''),price:Number(x.product_price||0),quantity:Number(x.quantity||0),lineTotal:Number(x.product_price||0)*Number(x.quantity||0)}))};}
