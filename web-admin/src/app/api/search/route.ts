import { NextResponse } from 'next/server';
import { ensureSearchCacheFresh } from '@/lib/searchCache';
import {
  applySearchPriceFilter,
  applySearchFilters,
  buildSearchFacets,
  formatSearchProduct,
  getSearchPriceBounds,
  parseSearchFilters,
  rankSearchProducts,
  sortSearchProducts,
} from '@/lib/productSearch';

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
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(96, Math.max(1, parseInt(searchParams.get('limit') || '24', 10) || 24));
    const minPriceParam = searchParams.get('min-price');
    const maxPriceParam = searchParams.get('max-price');
    const minPrice = minPriceParam === null ? null : Number(minPriceParam);
    const maxPrice = maxPriceParam === null ? null : Number(maxPriceParam);

    if (minPriceParam !== null && (!Number.isFinite(minPrice) || (minPrice ?? 0) < 0)) {
      return NextResponse.json(
        { success: false, message: 'Invalid min-price parameter' },
        { status: 400, headers: corsHeaders },
      );
    }

    if (maxPriceParam !== null && (!Number.isFinite(maxPrice) || (maxPrice ?? 0) < 0)) {
      return NextResponse.json(
        { success: false, message: 'Invalid max-price parameter' },
        { status: 400, headers: corsHeaders },
      );
    }

    await ensureSearchCacheFresh();

    const ranked = rankSearchProducts(q);
    const activeFilters = parseSearchFilters(searchParams);
    const filtered = applySearchFilters(ranked, activeFilters);
    const priceBounds = getSearchPriceBounds(filtered);
    const priceFiltered = applySearchPriceFilter(filtered, minPrice, maxPrice);
    const attributes = buildSearchFacets(priceFiltered);
    const sorted = sortSearchProducts(priceFiltered, searchParams.get('sort'));
    const total = sorted.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * limit;
    const data = sorted
      .slice(offset, offset + limit)
      .map(({ product }) => formatSearchProduct(product));

    return NextResponse.json(
      {
        success: true,
        data,
        attributes,
        priceBounds,
        pagination: { page: safePage, limit, total, totalPages },
      },
      { headers: publicCacheHeaders },
    );
  } catch (error) {
    console.error('[Search API] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
}
