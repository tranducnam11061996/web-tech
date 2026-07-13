import { NextRequest, NextResponse } from 'next/server';
import { jsonWithEtag } from '@/lib/httpCache';
import { withPublicProductResponseCache } from '@/lib/publicProductCache';
import { loadProductSupplementalPayload } from '@/lib/publicProductDetail';
import { recordRouteMetric } from '@/lib/runtimeMetrics';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=900',
};

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const startedAt = performance.now();
  try {
    const { slug } = await params;
    const payload = await withPublicProductResponseCache(
      `product-supplemental:${slug}`,
      () => loadProductSupplementalPayload(slug),
      300_000,
      900_000,
      { negativeTtlMs: 10_000, isNegative: (value) => !value.success },
    );
    const status = 'status' in payload ? Number(payload.status || 200) : 200;
    const { status: _status, ...body } = payload as Record<string, unknown>;
    const duration = performance.now() - startedAt;
    recordRouteMetric('GET /api/products/[slug]/supplemental', duration, status);
    return jsonWithEtag(request, body, { status, headers: { ...headers, 'Server-Timing': `app;dur=${duration.toFixed(1)}` } });
  } catch (error) {
    console.error('API /products/[slug]/supplemental Error:', error);
    recordRouteMetric('GET /api/products/[slug]/supplemental', performance.now() - startedAt, 500);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500, headers },
    );
  }
}
