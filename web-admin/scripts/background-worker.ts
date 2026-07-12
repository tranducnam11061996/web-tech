import type { RowDataPacket } from 'mysql2/promise';
import pool from '../src/lib/db';
import { sendOrderEmail, type SendOrderEmailParams } from '../src/lib/email';
import { cleanupPerformanceInfrastructure } from '../src/lib/performanceInfrastructure';

const POLL_MS = Math.max(500, Number(process.env.BACKGROUND_WORKER_POLL_MS || 2000));
let stopping = false;
let lastCleanup = 0;

async function claimEmail() {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(`UPDATE web_admin_email_outbox SET status='pending',locked_at=NULL
      WHERE status='processing' AND locked_at<DATE_SUB(NOW(),INTERVAL 10 MINUTE)`);
    const [rows] = await connection.query<RowDataPacket[]>(`SELECT id,payload_json,attempts
      FROM web_admin_email_outbox WHERE status IN ('pending','failed') AND available_at<=NOW()
      ORDER BY id LIMIT 1 FOR UPDATE`);
    const row = rows[0];
    if (!row) { await connection.commit(); return null; }
    await connection.query(`UPDATE web_admin_email_outbox SET status='processing',locked_at=NOW(),attempts=attempts+1 WHERE id=?`, [row.id]);
    await connection.commit();
    return { id: Number(row.id), attempts: Number(row.attempts || 0) + 1, payload: JSON.parse(String(row.payload_json)) as SendOrderEmailParams };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally { connection.release(); }
}

async function processEmail() {
  const job = await claimEmail();
  if (!job) return false;
  try {
    const sent = await sendOrderEmail(job.payload);
    if (!sent) throw new Error('SMTP did not accept the message');
    await pool.query(`UPDATE web_admin_email_outbox SET status='sent',sent_at=NOW(),locked_at=NULL,last_error='' WHERE id=?`, [job.id]);
  } catch (error) {
    const delayMinutes = Math.min(60, 2 ** Math.min(job.attempts, 5));
    await pool.query(`UPDATE web_admin_email_outbox SET status=?,available_at=DATE_ADD(NOW(),INTERVAL ? MINUTE),locked_at=NULL,last_error=? WHERE id=?`,
      [job.attempts >= 8 ? 'failed' : 'pending', delayMinutes, String(error instanceof Error ? error.message : error).slice(0, 1000), job.id]);
  }
  return true;
}

async function tick() {
  if (Date.now() - lastCleanup > 5 * 60_000) {
    await cleanupPerformanceInfrastructure();
    lastCleanup = Date.now();
  }
  let processed = 0;
  while (processed < 20 && await processEmail()) processed += 1;
}

async function main() {
  console.log(`[background-worker] started (poll=${POLL_MS}ms)`);
  while (!stopping) {
    try { await tick(); } catch (error) { console.error('[background-worker]', error); }
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
  await pool.end();
}

process.on('SIGINT', () => { stopping = true; });
process.on('SIGTERM', () => { stopping = true; });
void main();
