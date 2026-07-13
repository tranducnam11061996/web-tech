import { NextResponse } from 'next/server';
import { getPublicProductCacheStats } from '@/lib/publicProductCache';

export async function GET(request: Request) {
  const expected = process.env.INTERNAL_METRICS_TOKEN?.trim();
  const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  if (process.env.NODE_ENV === 'production' && (!expected || supplied !== expected)) {
    return NextResponse.json({ success: false }, { status: 404 });
  }
  try {
    return NextResponse.json({
      success: true,
      cache: getPublicProductCacheStats(),
      rssMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
    });
  } catch {
    return NextResponse.json({
      success: false,
      error: 'Diagnostics unavailable',
    }, { status: 503 });
  }
}
