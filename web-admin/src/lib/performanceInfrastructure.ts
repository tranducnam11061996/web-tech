import crypto from 'crypto';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';

type Db = typeof pool | PoolConnection;

export async function ensurePerformanceInfrastructure(db: Db = pool) {
  await db.query(`CREATE TABLE IF NOT EXISTS web_admin_request_limits (
    scope varchar(64) CHARACTER SET ascii NOT NULL,
    key_hash char(64) CHARACTER SET ascii NOT NULL,
    request_count int unsigned NOT NULL DEFAULT 0,
    window_started_at datetime NOT NULL,
    blocked_until datetime NULL,
    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (scope, key_hash),
    KEY idx_web_admin_request_limits_cleanup (blocked_until, window_started_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await db.query(`CREATE TABLE IF NOT EXISTS web_admin_order_requests (
    id bigint unsigned NOT NULL AUTO_INCREMENT,
    idempotency_key_hash char(64) CHARACTER SET ascii NOT NULL,
    payload_hash char(64) CHARACTER SET ascii NOT NULL,
    status enum('processing','completed','failed') NOT NULL DEFAULT 'processing',
    order_id int NULL,
    response_json text CHARACTER SET utf8mb4 NULL,
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at datetime NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_web_admin_order_request_key (idempotency_key_hash),
    KEY idx_web_admin_order_requests_cleanup (expires_at, status)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await db.query(`CREATE TABLE IF NOT EXISTS web_admin_email_outbox (
    id bigint unsigned NOT NULL AUTO_INCREMENT,
    event_type varchar(64) CHARACTER SET ascii NOT NULL,
    aggregate_id varchar(100) CHARACTER SET ascii NOT NULL,
    payload_json text CHARACTER SET utf8mb4 NOT NULL,
    status enum('pending','processing','sent','failed') NOT NULL DEFAULT 'pending',
    attempts smallint unsigned NOT NULL DEFAULT 0,
    available_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    locked_at datetime NULL,
    last_error varchar(1000) CHARACTER SET utf8mb4 NOT NULL DEFAULT '',
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at datetime NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_web_admin_email_event (event_type, aggregate_id),
    KEY idx_web_admin_email_outbox_work (status, available_at, id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await db.query(`CREATE TABLE IF NOT EXISTS web_admin_cache_versions (
    cache_key varchar(100) CHARACTER SET ascii NOT NULL,
    version bigint unsigned NOT NULL DEFAULT 1,
    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (cache_key)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await db.query(`CREATE TABLE IF NOT EXISTS web_admin_webhook_nonces (
    nonce_hash char(64) CHARACTER SET ascii NOT NULL,
    expires_at datetime NOT NULL,
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (nonce_hash),
    KEY idx_web_admin_webhook_nonces_cleanup (expires_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}

export function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function requestIp(request: Request) {
  return String(request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '')
    .split(',')[0].trim().slice(0, 45) || 'unknown';
}

export class RateLimitError extends Error {
  constructor(public retryAfter: number) {
    super('Bạn thao tác quá nhanh. Vui lòng thử lại sau.');
  }
}

export type RateLimitInput = {
  scope: string;
  key: string;
  limit: number;
  windowSeconds: number;
  blockSeconds?: number;
};

export function rateLimitSetting(name: string, fallback: number, min = 1, max = 100_000) {
  const value = Number(process.env[name] || fallback);
  return Math.min(max, Math.max(min, Number.isFinite(value) ? Math.trunc(value) : fallback));
}

async function consumeRateLimitOnConnection(connection: PoolConnection, input: RateLimitInput) {
  const scope = input.scope.replace(/[^a-z0-9:_-]/gi, '').slice(0, 64);
  const keyHash = sha256(input.key);
  const blockSeconds = Math.max(1, input.blockSeconds || input.windowSeconds);
  const [rows] = await connection.query<RowDataPacket[]>(`SELECT request_count,
      window_started_at > DATE_SUB(NOW(), INTERVAL ? SECOND) AS inside_window,
      blocked_until > NOW() AS blocked,
      GREATEST(0, TIMESTAMPDIFF(SECOND, NOW(), blocked_until)) AS retry_after
      FROM web_admin_request_limits WHERE scope=? AND key_hash=? FOR UPDATE`,
    [input.windowSeconds, scope, keyHash]);
  const row = rows[0];
  if (Number(row?.blocked) === 1) throw new RateLimitError(Math.max(1, Number(row.retry_after) || blockSeconds));
  const insideWindow = Number(row?.inside_window) === 1;
  const count = (insideWindow ? Number(row?.request_count || 0) : 0) + 1;
  const blocked = count > input.limit;
  await connection.query(`INSERT INTO web_admin_request_limits
      (scope,key_hash,request_count,window_started_at,blocked_until)
      VALUES(?,?,?,NOW(),${blocked ? 'DATE_ADD(NOW(), INTERVAL ? SECOND)' : 'NULL'})
      ON DUPLICATE KEY UPDATE request_count=VALUES(request_count),
      window_started_at=IF(?=1,window_started_at,NOW()),blocked_until=VALUES(blocked_until)`,
  blocked
    ? [scope, keyHash, count, blockSeconds, insideWindow ? 1 : 0]
    : [scope, keyHash, count, insideWindow ? 1 : 0]);
  return blocked ? new RateLimitError(blockSeconds) : null;
}

export async function consumeRateLimits(inputs: RateLimitInput[]) {
  if (inputs.length === 0) return;
  const ordered = [...inputs].sort((left, right) =>
    `${left.scope}:${sha256(left.key)}`.localeCompare(`${right.scope}:${sha256(right.key)}`),
  );

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      let blocked: RateLimitError | null = null;
      for (const input of ordered) {
        const inputBlock = await consumeRateLimitOnConnection(connection, input);
        blocked ||= inputBlock;
      }
      await connection.commit();
      if (blocked) throw blocked;
      return;
    } catch (error) {
      try { await connection.rollback(); } catch { /* connection may already be committed */ }
      const code = String((error as { code?: unknown } | null)?.code || '');
      const retryable = code === 'ER_LOCK_DEADLOCK' || code === 'ER_LOCK_WAIT_TIMEOUT';
      if (!retryable || attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 10 * (attempt + 1) + Math.floor(Math.random() * 15)));
    } finally {
      connection.release();
    }
  }
}

export async function consumeRateLimit(input: RateLimitInput) {
  return consumeRateLimits([input]);
}

export async function claimWebhookNonce(nonce: string, ttlSeconds = 300) {
  try {
    await pool.query<ResultSetHeader>(
      'INSERT INTO web_admin_webhook_nonces(nonce_hash,expires_at) VALUES(?,DATE_ADD(NOW(),INTERVAL ? SECOND))',
      [sha256(nonce), ttlSeconds],
    );
    return true;
  } catch (error: any) {
    if (error?.code === 'ER_DUP_ENTRY') return false;
    throw error;
  }
}

export async function cleanupPerformanceInfrastructure(batchSize = 500) {
  const limit = Math.min(2000, Math.max(10, Math.trunc(batchSize)));
  await pool.query(`DELETE FROM web_admin_request_limits WHERE window_started_at<DATE_SUB(NOW(),INTERVAL 2 DAY) LIMIT ${limit}`);
  await pool.query(`DELETE FROM web_admin_order_requests WHERE expires_at<NOW() LIMIT ${limit}`);
  await pool.query(`DELETE FROM web_admin_webhook_nonces WHERE expires_at<NOW() LIMIT ${limit}`);
  await pool.query(`DELETE FROM web_admin_customer_registration_challenges WHERE expires_at<NOW() LIMIT ${limit}`);
  await pool.query(`DELETE FROM web_admin_customer_auth_codes WHERE expires_at<DATE_SUB(NOW(),INTERVAL 1 DAY) LIMIT ${limit}`);
  await pool.query(`DELETE FROM web_admin_customer_sessions WHERE (expires_at<NOW() OR revoked_at<DATE_SUB(NOW(),INTERVAL 7 DAY)) LIMIT ${limit}`);
}
