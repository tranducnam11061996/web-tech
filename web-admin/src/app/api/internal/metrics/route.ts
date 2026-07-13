import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { getPublicProductCacheStats } from '@/lib/publicProductCache';
import { getRuntimeMetricsSnapshot } from '@/lib/runtimeMetrics';

export const dynamic = 'force-dynamic';

function authorized(request: NextRequest) {
  const expected = process.env.INTERNAL_METRICS_TOKEN?.trim();
  if (!expected) return process.env.NODE_ENV !== 'production';
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  if (supplied.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ success: false }, { status: 404 });
  const dbStartedAt = performance.now();
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT
    SUM(status='pending') pending,
    SUM(status='processing') processing,
    SUM(status='failed') failed
    FROM web_admin_email_outbox`);
  return NextResponse.json({
    success: true,
    generatedAt: new Date().toISOString(),
    runtime: getRuntimeMetricsSnapshot(),
    cache: getPublicProductCacheStats(),
    database: {
      probeMs: Math.round((performance.now() - dbStartedAt) * 10) / 10,
      outbox: {
        pending: Number(rows[0]?.pending || 0),
        processing: Number(rows[0]?.processing || 0),
        failed: Number(rows[0]?.failed || 0),
      },
    },
  }, { headers: { 'Cache-Control': 'no-store' } });
}
