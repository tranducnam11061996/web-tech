import crypto from 'crypto';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { hashPassword, passwordNeedsRehash, verifyPassword } from '@/lib/passwordHash';
import {
  getEffectivePermissions,
  hasPermission,
  normalizeOverrides,
  normalizePermissions,
  SYSTEM_ROLE_TEMPLATES,
  type AdminPermission,
} from './permissions';

const SESSION_IDLE_MS = 8 * 60 * 60 * 1000;
const SESSION_ABSOLUTE_MS = 24 * 60 * 60 * 1000;
const SESSION_TOUCH_MS = 15 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LOCK_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = 5;
export const ADMIN_SESSION_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-admin_session' : 'admin_session';

type AdminUserRow = RowDataPacket & {
  id: number;
  email: string;
  password: string;
  name: string;
  role: string;
  permissions: unknown;
  status: number;
  must_change_password: number;
  auth_version: number;
  role_permissions: unknown;
  role_status: number | null;
};

export type AdminSessionUser = {
  id: number;
  email: string;
  name: string;
  role: string;
  permissions: AdminPermission[];
  mustChangePassword: boolean;
};

export type AdminRole = {
  id: number;
  code: string;
  name: string;
  description: string;
  permissions: AdminPermission[];
  isSystem: boolean;
  status: number;
  createdAt: string;
  updatedAt: string;
};

export class AdminAuthError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

function toMysqlDate(value: Date) {
  return value.toISOString().slice(0, 19).replace('T', ' ');
}

function parseJson(value: unknown) {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value;
}

function normalizeEmail(value: unknown) {
  const email = String(value || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255) {
    throw new AdminAuthError(400, 'INVALID_EMAIL', 'Email khong hop le');
  }
  return email;
}

function validatePassword(value: unknown) {
  const password = String(value || '');
  if (password.length < 12 || password.length > 128) {
    throw new AdminAuthError(400, 'INVALID_PASSWORD', 'Mat khau phai co tu 12 den 128 ky tu');
  }
  return password;
}

function tokenHash(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getRequestIp(request: Request) {
  return String(request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '')
    .split(',')[0]
    .trim()
    .slice(0, 45) || 'unknown';
}

function getUserAgent(request: Request) {
  return String(request.headers.get('user-agent') || '').slice(0, 512);
}

function getCookieValue(request: Request, name: string) {
  const match = String(request.headers.get('cookie') || '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : '';
}

async function columnExists(connection: PoolConnection, table: string, column: string) {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ? LIMIT 1`,
    [table, column],
  );
  return rows.length > 0;
}

async function addColumnIfMissing(connection: PoolConnection, table: string, column: string, definition: string) {
  if (!await columnExists(connection, table, column)) {
    await connection.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  }
}

export async function ensureAdminAccessTables() {
  const connection = await pool.getConnection();
  try {
    await connection.query('ALTER TABLE admin_users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
    await addColumnIfMissing(connection, 'admin_users', 'must_change_password', 'tinyint(1) NOT NULL DEFAULT 1');
    await addColumnIfMissing(connection, 'admin_users', 'password_changed_at', 'datetime NULL');
    await addColumnIfMissing(connection, 'admin_users', 'last_login_at', 'datetime NULL');
    await addColumnIfMissing(connection, 'admin_users', 'auth_version', 'int unsigned NOT NULL DEFAULT 1');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS admin_roles (
        id int unsigned NOT NULL AUTO_INCREMENT,
        code varchar(64) NOT NULL,
        name varchar(150) NOT NULL,
        description varchar(500) NOT NULL DEFAULT '',
        permissions json NOT NULL,
        is_system tinyint(1) NOT NULL DEFAULT 0,
        status tinyint(1) NOT NULL DEFAULT 1,
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_admin_roles_code (code),
        KEY idx_admin_roles_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admin_sessions (
        id bigint unsigned NOT NULL AUTO_INCREMENT,
        user_id int NOT NULL,
        token_hash char(64) NOT NULL,
        auth_version int unsigned NOT NULL,
        ip_address varchar(45) NOT NULL DEFAULT '',
        user_agent varchar(512) NOT NULL DEFAULT '',
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_seen_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at datetime NOT NULL,
        revoked_at datetime NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_admin_sessions_token_hash (token_hash),
        KEY idx_admin_sessions_user_state (user_id, revoked_at, expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id bigint unsigned NOT NULL AUTO_INCREMENT,
        actor_user_id int NULL,
        action varchar(100) NOT NULL,
        resource varchar(100) NOT NULL DEFAULT '',
        resource_id varchar(100) NOT NULL DEFAULT '',
        request_method varchar(10) NOT NULL DEFAULT '',
        request_path varchar(500) NOT NULL DEFAULT '',
        ip_address varchar(45) NOT NULL DEFAULT '',
        user_agent varchar(512) NOT NULL DEFAULT '',
        metadata json NULL,
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_admin_audit_actor_time (actor_user_id, created_at),
        KEY idx_admin_audit_resource_time (resource, resource_id, created_at),
        KEY idx_admin_audit_time (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS admin_login_attempts (
        id bigint unsigned NOT NULL AUTO_INCREMENT,
        email varchar(255) NOT NULL,
        ip_address varchar(45) NOT NULL,
        failed_count tinyint unsigned NOT NULL DEFAULT 0,
        first_failed_at datetime NOT NULL,
        locked_until datetime NULL,
        updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_admin_login_attempt (email, ip_address),
        KEY idx_admin_login_locked (locked_until)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    for (const role of SYSTEM_ROLE_TEMPLATES) {
      await connection.query(
        `INSERT INTO admin_roles (code, name, description, permissions, is_system, status)
         VALUES (?, ?, ?, ?, 1, 1)
         ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), is_system = 1`,
        [role.code, role.name, role.description, JSON.stringify(role.permissions)],
      );
    }

    await connection.query(`
      UPDATE admin_roles
      SET permissions = JSON_ARRAY_APPEND(permissions, '$', 'crm.customers.read')
      WHERE code = 'viewer' AND JSON_CONTAINS(permissions, JSON_QUOTE('crm.customers.read')) = 0
    `);

    for (const [roleCode, permissions] of [
      ['marketing_manager', ['marketing.product_promotions.read', 'marketing.product_promotions.create', 'marketing.product_promotions.update', 'marketing.product_promotions.delete']],
      ['viewer', ['marketing.product_promotions.read']],
      ['marketing_manager', ['marketing.flash_sales.read', 'marketing.flash_sales.create', 'marketing.flash_sales.update', 'marketing.flash_sales.delete', 'marketing.flash_sales.publish']],
      ['viewer', ['marketing.flash_sales.read']],
    ] as const) {
      for (const permission of permissions) {
        await connection.query(`
          UPDATE admin_roles
          SET permissions = JSON_ARRAY_APPEND(permissions, '$', ?)
          WHERE code = ? AND JSON_CONTAINS(permissions, JSON_QUOTE(?)) = 0
        `, [permission, roleCode, permission]);
      }
    }

    await connection.query(`
      UPDATE admin_users
      SET must_change_password = 0, password_changed_at = COALESCE(password_changed_at, NOW())
      WHERE role = 'superadmin' AND password_changed_at IS NULL
    `);
  } finally {
    connection.release();
  }
}

function mapSessionUser(row: AdminUserRow): AdminSessionUser {
  const rolePermissions = parseJson(row.role_permissions);
  return {
    id: Number(row.id),
    email: String(row.email),
    name: String(row.name),
    role: String(row.role),
    permissions: getEffectivePermissions(rolePermissions, parseJson(row.permissions), String(row.role)),
    mustChangePassword: Number(row.must_change_password) === 1,
  };
}

async function getUserWithRoleByEmail(email: string) {
  const [rows] = await pool.query<AdminUserRow[]>(`
    SELECT u.*, r.permissions AS role_permissions, r.status AS role_status
    FROM admin_users u
    LEFT JOIN admin_roles r ON r.code = u.role
    WHERE u.email = ?
    LIMIT 1
  `, [email]);
  return rows[0] || null;
}

async function getUserWithRoleById(id: number) {
  const [rows] = await pool.query<AdminUserRow[]>(`
    SELECT u.*, r.permissions AS role_permissions, r.status AS role_status
    FROM admin_users u
    LEFT JOIN admin_roles r ON r.code = u.role
    WHERE u.id = ?
    LIMIT 1
  `, [id]);
  return rows[0] || null;
}

async function getLockedAttempt(email: string, ipAddress: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT locked_until FROM admin_login_attempts WHERE email = ? AND ip_address = ? LIMIT 1',
    [email, ipAddress],
  );
  const lockedUntil = rows[0]?.locked_until ? new Date(rows[0].locked_until).getTime() : 0;
  return lockedUntil > Date.now();
}

async function recordFailedAttempt(email: string, ipAddress: string) {
  const now = new Date();
  const firstAllowed = new Date(Date.now() - LOGIN_WINDOW_MS);
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT failed_count, first_failed_at FROM admin_login_attempts WHERE email = ? AND ip_address = ? LIMIT 1',
    [email, ipAddress],
  );
  const current = rows[0];
  const withinWindow = current?.first_failed_at && new Date(current.first_failed_at).getTime() >= firstAllowed.getTime();
  const failures = (withinWindow ? Number(current.failed_count || 0) : 0) + 1;
  const lockedUntil = failures >= LOGIN_MAX_FAILURES ? new Date(Date.now() + LOGIN_LOCK_MS) : null;
  await pool.query(
    `INSERT INTO admin_login_attempts (email, ip_address, failed_count, first_failed_at, locked_until)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE failed_count = VALUES(failed_count), first_failed_at = VALUES(first_failed_at), locked_until = VALUES(locked_until)`,
    [email, ipAddress, failures, toMysqlDate(now), lockedUntil ? toMysqlDate(lockedUntil) : null],
  );
}

async function clearFailedAttempts(email: string, ipAddress: string) {
  await pool.query('DELETE FROM admin_login_attempts WHERE email = ? AND ip_address = ?', [email, ipAddress]);
}

export async function writeAdminAudit(input: {
  actorUserId?: number | null;
  action: string;
  resource?: string;
  resourceId?: string | number;
  request?: Request;
  metadata?: Record<string, unknown>;
}) {
  await pool.query(
    `INSERT INTO admin_audit_logs (actor_user_id, action, resource, resource_id, request_method, request_path, ip_address, user_agent, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.actorUserId || null,
      input.action.slice(0, 100),
      String(input.resource || '').slice(0, 100),
      String(input.resourceId || '').slice(0, 100),
      String(input.request?.method || '').slice(0, 10),
      String(input.request ? new URL(input.request.url).pathname : '').slice(0, 500),
      input.request ? getRequestIp(input.request) : '',
      input.request ? getUserAgent(input.request) : '',
      input.metadata ? JSON.stringify(input.metadata) : null,
    ],
  );
}

export async function loginAdmin(request: Request, emailInput: unknown, passwordInput: unknown) {
  const email = normalizeEmail(emailInput);
  const password = String(passwordInput || '');
  const ipAddress = getRequestIp(request);
  if (await getLockedAttempt(email, ipAddress)) {
    throw new AdminAuthError(429, 'LOGIN_LOCKED', 'Thong tin dang nhap khong hop le');
  }

  const user = await getUserWithRoleByEmail(email);
  const valid = Boolean(user && Number(user.status) === 1 && (user.role === 'superadmin' || Number(user.role_status) === 1))
    && await verifyPassword(String(user?.password || ''), password);
  if (!valid || !user) {
    await recordFailedAttempt(email, ipAddress);
    await writeAdminAudit({ action: 'auth.login_failed', resource: 'auth', request, metadata: { email } });
    throw new AdminAuthError(401, 'INVALID_CREDENTIALS', 'Thong tin dang nhap khong hop le');
  }

  await clearFailedAttempts(email, ipAddress);
  if (passwordNeedsRehash(String(user.password || ''))) await pool.query('UPDATE admin_users SET password=? WHERE id=?', [await hashPassword(password), user.id]);
  const token = crypto.randomBytes(32).toString('base64url');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_ABSOLUTE_MS);
  await pool.query(
    `INSERT INTO admin_sessions (user_id, token_hash, auth_version, ip_address, user_agent, created_at, last_seen_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [user.id, tokenHash(token), Number(user.auth_version || 1), ipAddress, getUserAgent(request), toMysqlDate(now), toMysqlDate(now), toMysqlDate(expiresAt)],
  );
  await pool.query('UPDATE admin_users SET last_login_at = NOW() WHERE id = ?', [user.id]);
  const sessionUser = mapSessionUser(user);
  await writeAdminAudit({ actorUserId: user.id, action: 'auth.login', resource: 'auth', request });
  return { token, expiresAt, user: sessionUser };
}

export async function resolveAdminSessionToken(token: string): Promise<AdminSessionUser | null> {
  if (!token || token.length < 20) return null;
  const [rows] = await pool.query<AdminUserRow[]>(`
    SELECT u.*, r.permissions AS role_permissions, r.status AS role_status,
           s.auth_version AS session_auth_version, s.last_seen_at, s.expires_at
    FROM admin_sessions s
    JOIN admin_users u ON u.id = s.user_id
    LEFT JOIN admin_roles r ON r.code = u.role
    WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > NOW()
    LIMIT 1
  `, [tokenHash(token)]);
  const row = rows[0] as (AdminUserRow & { session_auth_version: number; last_seen_at: Date }) | undefined;
  if (!row || Number(row.status) !== 1 || Number(row.auth_version) !== Number(row.session_auth_version)) return null;
  if (row.role !== 'superadmin' && Number(row.role_status) !== 1) return null;
  if (Date.now() - new Date(row.last_seen_at).getTime() > SESSION_IDLE_MS) return null;
  if (Date.now() - new Date(row.last_seen_at).getTime() > SESSION_TOUCH_MS) {
    await pool.query('UPDATE admin_sessions SET last_seen_at = NOW() WHERE token_hash = ?', [tokenHash(token)]);
  }
  return mapSessionUser(row);
}

export async function getAdminSessionFromRequest(request: Request) {
  return resolveAdminSessionToken(getCookieValue(request, ADMIN_SESSION_COOKIE));
}

export async function requireAdminSession(request: Request, allowPasswordChange = false) {
  const user = await getAdminSessionFromRequest(request);
  if (!user) throw new AdminAuthError(401, 'UNAUTHENTICATED', 'Can dang nhap de tiep tuc');
  if (user.mustChangePassword && !allowPasswordChange) {
    throw new AdminAuthError(403, 'PASSWORD_CHANGE_REQUIRED', 'Can doi mat khau truoc khi tiep tuc');
  }
  return user;
}

export async function requireAdminPermission(request: Request, permission: AdminPermission) {
  const user = await requireAdminSession(request);
  if (!hasPermission(user.permissions, permission)) {
    throw new AdminAuthError(403, 'FORBIDDEN', 'Ban khong co quyen thuc hien thao tac nay');
  }
  return user;
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin || origin !== new URL(request.url).origin) {
    throw new AdminAuthError(403, 'INVALID_ORIGIN', 'Yeu cau khong cung nguon goc');
  }
}

export async function revokeAdminSessions(userId: number, keepToken?: string) {
  const values: unknown[] = [userId];
  let where = 'user_id = ? AND revoked_at IS NULL';
  if (keepToken) {
    where += ' AND token_hash <> ?';
    values.push(tokenHash(keepToken));
  }
  await pool.query(`UPDATE admin_sessions SET revoked_at = NOW() WHERE ${where}`, values);
}

export async function logoutAdmin(request: Request) {
  const token = getCookieValue(request, ADMIN_SESSION_COOKIE);
  const user = await resolveAdminSessionToken(token);
  if (token) await pool.query('UPDATE admin_sessions SET revoked_at = NOW() WHERE token_hash = ?', [tokenHash(token)]);
  if (user) await writeAdminAudit({ actorUserId: user.id, action: 'auth.logout', resource: 'auth', request });
}

export async function listAdminRoles() {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM admin_roles ORDER BY is_system DESC, name ASC, id ASC',
  );
  return rows.map((row) => ({
    id: Number(row.id),
    code: String(row.code),
    name: String(row.name),
    description: String(row.description || ''),
    permissions: normalizePermissions(parseJson(row.permissions), true),
    isSystem: Number(row.is_system) === 1,
    status: Number(row.status),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  })) as AdminRole[];
}

async function assertRoleCanBeAssigned(roleCode: string) {
  if (roleCode === 'superadmin') return;
  const [rows] = await pool.query<RowDataPacket[]>('SELECT code FROM admin_roles WHERE code = ? AND status = 1 LIMIT 1', [roleCode]);
  if (!rows[0]) throw new AdminAuthError(400, 'INVALID_ROLE', 'Vai tro khong hop le');
}

export async function listAdminUsers() {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT id, email, name, role, permissions, status, must_change_password, last_login_at, created_at, updated_at FROM admin_users ORDER BY id ASC',
  );
  return rows.map((row) => ({
    id: Number(row.id), email: String(row.email), name: String(row.name), role: String(row.role),
    overrides: normalizeOverrides(parseJson(row.permissions)), status: Number(row.status) === 1,
    mustChangePassword: Number(row.must_change_password) === 1,
    lastLoginAt: row.last_login_at ? String(row.last_login_at) : null,
    createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  }));
}

export async function createAdminUser(input: Record<string, unknown>, actor: AdminSessionUser, request?: Request) {
  const email = normalizeEmail(input.email);
  const name = String(input.name || '').trim().slice(0, 255);
  if (!name) throw new AdminAuthError(400, 'INVALID_NAME', 'Ten la bat buoc');
  const password = validatePassword(input.password);
  const role = String(input.role || 'viewer');
  await assertRoleCanBeAssigned(role);
  const overrides = normalizeOverrides(input.overrides);
  const hash = await hashPassword(password);
  try {
    const [result] = await pool.query(
      `INSERT INTO admin_users (email, password, name, role, permissions, status, must_change_password, password_changed_at, auth_version)
       VALUES (?, ?, ?, ?, ?, 1, 1, NOW(), 1)`,
      [email, hash, name, role, JSON.stringify(overrides)],
    );
    const id = Number((result as { insertId?: number }).insertId || 0);
    await writeAdminAudit({ actorUserId: actor.id, action: 'admin.user_created', resource: 'admin.users', resourceId: id, request, metadata: { email, role } });
    return { id };
  } catch (error: any) {
    if (error?.code === 'ER_DUP_ENTRY') throw new AdminAuthError(409, 'EMAIL_EXISTS', 'Email da ton tai');
    throw error;
  }
}

async function activeSuperadminCount() {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM admin_users WHERE role = ? AND status = 1', ['superadmin']);
  return Number(rows[0]?.total || 0);
}

export async function updateAdminUser(id: number, input: Record<string, unknown>, actor: AdminSessionUser, request?: Request) {
  const target = await getUserWithRoleById(id);
  if (!target) throw new AdminAuthError(404, 'USER_NOT_FOUND', 'Khong tim thay tai khoan');
  const name = String(input.name ?? target.name).trim().slice(0, 255);
  const role = String(input.role ?? target.role);
  const status = input.status === undefined ? Number(target.status) : (input.status ? 1 : 0);
  if (!name) throw new AdminAuthError(400, 'INVALID_NAME', 'Ten la bat buoc');
  await assertRoleCanBeAssigned(role);
  if (target.role === 'superadmin' && (role !== 'superadmin' || status !== 1) && await activeSuperadminCount() <= 1) {
    throw new AdminAuthError(409, 'LAST_SUPERADMIN', 'Khong the khoa hoac ha quyen superadmin cuoi cung');
  }
  const overrides = normalizeOverrides(input.overrides ?? parseJson(target.permissions));
  const sensitiveChange = role !== target.role || status !== Number(target.status) || JSON.stringify(overrides) !== JSON.stringify(normalizeOverrides(parseJson(target.permissions)));
  await pool.query(
    `UPDATE admin_users SET name = ?, role = ?, status = ?, permissions = ?, auth_version = auth_version + ? WHERE id = ?`,
    [name, role, status, JSON.stringify(overrides), sensitiveChange ? 1 : 0, id],
  );
  if (sensitiveChange) await revokeAdminSessions(id);
  await writeAdminAudit({ actorUserId: actor.id, action: 'admin.user_updated', resource: 'admin.users', resourceId: id, request, metadata: { role, status } });
  return { id };
}

export async function resetAdminPassword(id: number, passwordInput: unknown, actor: AdminSessionUser, request?: Request) {
  const target = await getUserWithRoleById(id);
  if (!target) throw new AdminAuthError(404, 'USER_NOT_FOUND', 'Khong tim thay tai khoan');
  const password = validatePassword(passwordInput);
  await pool.query(
    `UPDATE admin_users SET password = ?, must_change_password = 1, password_changed_at = NOW(), auth_version = auth_version + 1 WHERE id = ?`,
    [await hashPassword(password), id],
  );
  await revokeAdminSessions(id);
  await writeAdminAudit({ actorUserId: actor.id, action: 'admin.password_reset', resource: 'admin.users', resourceId: id, request });
}

export async function changeOwnPassword(request: Request, currentPassword: unknown, newPassword: unknown) {
  const user = await requireAdminSession(request, true);
  const row = await getUserWithRoleById(user.id);
  if (!row || !await verifyPassword(row.password, String(currentPassword || ''))) {
    throw new AdminAuthError(400, 'INVALID_CURRENT_PASSWORD', 'Mat khau hien tai khong dung');
  }
  const password = validatePassword(newPassword);
  await pool.query(
    `UPDATE admin_users SET password = ?, must_change_password = 0, password_changed_at = NOW(), auth_version = auth_version + 1 WHERE id = ?`,
    [await hashPassword(password), user.id],
  );
  await revokeAdminSessions(user.id);
  await writeAdminAudit({ actorUserId: user.id, action: 'auth.password_changed', resource: 'auth', request });
}

export async function saveCustomRole(input: Record<string, unknown>, actor: AdminSessionUser, request?: Request, id?: number) {
  const code = String(input.code || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 64);
  const name = String(input.name || '').trim().slice(0, 150);
  const description = String(input.description || '').trim().slice(0, 500);
  if (!code || !name) throw new AdminAuthError(400, 'INVALID_ROLE', 'Ma va ten vai tro la bat buoc');
  const permissions = normalizePermissions(input.permissions);
  if (id) {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT is_system FROM admin_roles WHERE id = ? LIMIT 1', [id]);
    if (!rows[0]) throw new AdminAuthError(404, 'ROLE_NOT_FOUND', 'Khong tim thay vai tro');
    if (Number(rows[0].is_system) === 1) throw new AdminAuthError(409, 'SYSTEM_ROLE', 'Khong the sua vai tro he thong');
    await pool.query('UPDATE admin_roles SET code = ?, name = ?, description = ?, permissions = ? WHERE id = ?', [code, name, description, JSON.stringify(permissions), id]);
    await writeAdminAudit({ actorUserId: actor.id, action: 'admin.role_updated', resource: 'admin.roles', resourceId: id, request, metadata: { code } });
    return { id };
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO admin_roles (code, name, description, permissions, is_system, status) VALUES (?, ?, ?, ?, 0, 1)',
      [code, name, description, JSON.stringify(permissions)],
    );
    const roleId = Number((result as { insertId?: number }).insertId || 0);
    await writeAdminAudit({ actorUserId: actor.id, action: 'admin.role_created', resource: 'admin.roles', resourceId: roleId, request, metadata: { code } });
    return { id: roleId };
  } catch (error: any) {
    if (error?.code === 'ER_DUP_ENTRY') throw new AdminAuthError(409, 'ROLE_EXISTS', 'Ma vai tro da ton tai');
    throw error;
  }
}

export async function listAdminAuditLogs(limit = 100) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT l.*, u.email AS actor_email, u.name AS actor_name FROM admin_audit_logs l LEFT JOIN admin_users u ON u.id = l.actor_user_id ORDER BY l.id DESC LIMIT ?`,
    [Math.min(Math.max(limit, 1), 200)],
  );
  return rows.map((row) => ({
    id: Number(row.id), action: String(row.action), resource: String(row.resource), resourceId: String(row.resource_id),
    actor: row.actor_user_id ? { id: Number(row.actor_user_id), email: String(row.actor_email || ''), name: String(row.actor_name || '') } : null,
    method: String(row.request_method), path: String(row.request_path), ipAddress: String(row.ip_address),
    metadata: parseJson(row.metadata), createdAt: String(row.created_at),
  }));
}
