import { NextResponse } from 'next/server';
import { getPublicSearchPayload } from '@/lib/publicSearch';
import { jsonWithEtag } from '@/lib/httpCache';
import { recordRouteMetric } from '@/lib/runtimeMetrics';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const publicCacheHeaders = {
  ...corsHeaders,
  'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: Request) {
  const startedAt = performance.now();
  try {
    const { searchParams } = new URL(request.url);
    const payload = await getPublicSearchPayload(searchParams);
    const status = 'status' in payload ? Number(payload.status || 200) : 200;
    const { status: _status, ...body } = payload as Record<string, unknown>;

    const duration = performance.now() - startedAt;
    recordRouteMetric('GET /api/search', duration, status);
    return jsonWithEtag(request, body, { status, headers: { ...publicCacheHeaders, 'Server-Timing': `app;dur=${duration.toFixed(1)}` } });
  } catch (error) {
    console.error('[Search API] Error:', error);
    recordRouteMetric('GET /api/search', performance.now() - startedAt, 500);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
}
