import { NextRequest, NextResponse } from 'next/server';
import { withPublicProductResponseCache } from '@/lib/publicProductCache';
import { jsonWithEtag } from '@/lib/httpCache';
import { loadFullProductPayload, loadProductCorePayload } from '@/lib/publicProductDetail';
import { recordRouteMetric } from '@/lib/runtimeMetrics';

const publicCacheHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const startedAt = performance.now();
  try {
    const { slug } = await params;
    const include = request.nextUrl.searchParams.get('include') === 'core' ? 'core' : 'full';
    const loader = include === 'core' ? loadProductCorePayload : loadFullProductPayload;
    const payload = await withPublicProductResponseCache(
      `product-detail:${include}:${slug}`,
      () => loader(slug),
      60_000,
      300_000,
      { negativeTtlMs: 10_000, isNegative: (value) => !value.success },
    );
    const status = 'status' in payload ? Number(payload.status || 200) : 200;
    const { status: _status, ...body } = payload as Record<string, unknown>;
    const duration = performance.now() - startedAt;
    recordRouteMetric('GET /api/products/[slug]', duration, status);
    return jsonWithEtag(request, body, { status, headers: { ...publicCacheHeaders, 'Server-Timing': `app;dur=${duration.toFixed(1)}` } });
  } catch (error) {
    console.error('API /products/[slug] Error:', error);
    recordRouteMetric('GET /api/products/[slug]', performance.now() - startedAt, 500);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500, headers: publicCacheHeaders });
  }
}
