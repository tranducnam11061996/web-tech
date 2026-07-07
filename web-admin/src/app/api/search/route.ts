import { NextResponse } from 'next/server';
import { ensureSearchCacheFresh } from '@/lib/searchCache';
import {
  applySearchFilters,
  buildSearchFacets,
  formatSearchProduct,
  parseSearchFilters,
  rankSearchProducts,
  sortSearchProducts,
} from '@/lib/productSearch';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

    await ensureSearchCacheFresh();

    const ranked = rankSearchProducts(q);
    const activeFilters = parseSearchFilters(searchParams);
    const filtered = applySearchFilters(ranked, activeFilters);
    const attributes = buildSearchFacets(filtered);
    const sorted = sortSearchProducts(filtered, searchParams.get('sort'));
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
        pagination: { page: safePage, limit, total, totalPages },
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error('[Search API] Error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500, headers: corsHeaders },
    );
  }
}
