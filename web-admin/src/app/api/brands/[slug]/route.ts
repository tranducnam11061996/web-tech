import { NextRequest, NextResponse } from 'next/server';
import { jsonWithEtag } from '@/lib/httpCache';
import { loadPublicBrandCatalog, type BrandCatalogQuery } from '@/lib/publicBrands';
import { withPublicProductResponseCache } from '@/lib/publicProductCache';
import { recordRouteMetric } from '@/lib/runtimeMetrics';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
};

function parseQuery(searchParams: URLSearchParams): { ok: true; query: BrandCatalogQuery } | { ok: false; message: string } {
  const page = Number(searchParams.get('page') || 1);
  const limit = Number(searchParams.get('limit') || 24);
  const sortInput = searchParams.get('sort') || 'newest';
  const minInput = searchParams.get('min-price');
  const maxInput = searchParams.get('max-price');
  const minPrice = minInput === null ? null : Number(minInput);
  const maxPrice = maxInput === null ? null : Number(maxInput);
  if (!Number.isInteger(page) || page < 1 || page > 1_000) return { ok: false, message: 'Invalid page' };
  if (!Number.isInteger(limit) || limit < 1 || limit > 96) return { ok: false, message: 'Invalid limit' };
  if (!['newest', 'price_asc', 'price_desc'].includes(sortInput)) return { ok: false, message: 'Invalid sort' };
  if (minPrice !== null && (!Number.isFinite(minPrice) || minPrice < 0)) return { ok: false, message: 'Invalid min-price' };
  if (maxPrice !== null && (!Number.isFinite(maxPrice) || maxPrice < 0)) return { ok: false, message: 'Invalid max-price' };
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) return { ok: false, message: 'min-price cannot exceed max-price' };
  return { ok: true, query: { page, limit, sort: sortInput as BrandCatalogQuery['sort'], minPrice, maxPrice } };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const startedAt = performance.now();
  const parsed = parseQuery(request.nextUrl.searchParams);
  if (!parsed.ok) return NextResponse.json({ success: false, message: parsed.message }, { status: 400, headers });
  try {
    const { slug } = await params;
    const cacheKey = `brand-detail:${slug}:${request.nextUrl.searchParams.toString()}`;
    const payload = await withPublicProductResponseCache(cacheKey, () => loadPublicBrandCatalog(slug, parsed.query), 60_000, 300_000, {
      negativeTtlMs: 10_000,
      isNegative: (value) => !value.success,
    });
    const status = payload.status;
    const body = payload.success ? { success: true, data: payload.data } : { success: false, message: payload.message };
    const duration = performance.now() - startedAt;
    recordRouteMetric('GET /api/brands/[slug]', duration, status);
    return jsonWithEtag(request, body, { status, headers: { ...headers, 'Server-Timing': `app;dur=${duration.toFixed(1)}` } });
  } catch (error) {
    console.error('Failed to load public brand:', error);
    recordRouteMetric('GET /api/brands/[slug]', performance.now() - startedAt, 500);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500, headers });
  }
}
