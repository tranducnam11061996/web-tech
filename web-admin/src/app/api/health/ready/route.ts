import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { getRuntimePrewarmState } from '@/lib/runtimeReadiness';

export const dynamic = 'force-dynamic';
export async function GET() {
  const started = performance.now();
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT
      (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='web_admin_order_requests') order_requests,
      (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='web_admin_request_limits') request_limits,
      (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='web_admin_email_outbox') email_outbox`);
    const databaseReady = Number(rows[0]?.order_requests) === 1 && Number(rows[0]?.request_limits) === 1 && Number(rows[0]?.email_outbox) === 1;
    const prewarm = getRuntimePrewarmState();
    const ready = databaseReady && prewarm.ready;
    const status = !databaseReady ? 'migration_required' : prewarm.ready ? 'ready' : 'warming';
    return NextResponse.json({ status, database: 'ok', prewarm: { ready: prewarm.ready, error: prewarm.error } }, {
      status: ready ? 200 : 503,
      headers: { 'Cache-Control': 'no-store', 'Server-Timing': `db;dur=${(performance.now() - started).toFixed(1)}` },
    });
  } catch (error) {
    console.error('[readiness]', error);
    return NextResponse.json({ status: 'unavailable', database: 'error' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
