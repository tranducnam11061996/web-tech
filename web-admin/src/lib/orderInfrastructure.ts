import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { PublicRequestError } from '@/lib/publicRequest';
import { sha256 } from '@/lib/performanceInfrastructure';
import type { SendOrderEmailParams } from '@/lib/email';

export function validateIdempotencyKey(value: string | null) {
  const key = String(value || '').trim();
  if (!/^[a-zA-Z0-9._:-]{8,128}$/.test(key)) {
    throw new PublicRequestError(400, 'INVALID_IDEMPOTENCY_KEY', 'Idempotency-Key không hợp lệ.');
  }
  return key;
}

export async function claimOrderRequest(connection: PoolConnection, key: string, payload: unknown) {
  const keyHash = sha256(key);
  const payloadHash = sha256(JSON.stringify(payload));
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT id,payload_hash,status,response_json,updated_at
     FROM web_admin_order_requests WHERE idempotency_key_hash=? LIMIT 1 FOR UPDATE`,
    [keyHash],
  );
  const existing = rows[0];
  if (existing) {
    if (String(existing.payload_hash) !== payloadHash) {
      throw new PublicRequestError(409, 'IDEMPOTENCY_CONFLICT', 'Khóa gửi đơn đã được dùng với dữ liệu khác.');
    }
    if (existing.status === 'completed' && existing.response_json) {
      try { return { id: Number(existing.id), replay: JSON.parse(String(existing.response_json)) }; } catch { /* rebuild below */ }
    }
    throw new PublicRequestError(409, 'ORDER_PROCESSING', 'Đơn hàng đang được xử lý. Vui lòng chờ trong giây lát.');
  }
  const [result] = await connection.query(
    `INSERT INTO web_admin_order_requests(idempotency_key_hash,payload_hash,status,expires_at)
     VALUES(?,?,'processing',DATE_ADD(NOW(),INTERVAL 24 HOUR))`,
    [keyHash, payloadHash],
  );
  return { id: Number((result as { insertId?: number }).insertId || 0), replay: null };
}

export async function completeOrderRequest(connection: PoolConnection, requestId: number, orderId: number, response: unknown) {
  await connection.query(
    `UPDATE web_admin_order_requests SET status='completed',order_id=?,response_json=? WHERE id=?`,
    [orderId, JSON.stringify(response), requestId],
  );
}

export async function enqueueOrderEmail(connection: PoolConnection, payload: SendOrderEmailParams) {
  if (!payload.to) return;
  const eventType = payload.eventType === 'completed' ? 'order_completed' : 'order_confirmation';
  await connection.query(
    `INSERT INTO web_admin_email_outbox(event_type,aggregate_id,payload_json)
     VALUES(?,?,?)
     ON DUPLICATE KEY UPDATE payload_json=VALUES(payload_json),
       status=IF(status='sent',status,'pending'),available_at=NOW()`,
    [eventType, String(payload.orderId), JSON.stringify({ ...payload, eventType: payload.eventType === 'completed' ? 'completed' : 'confirmation' })],
  );
}
