import { NextResponse } from 'next/server';
import { loadHomepageProductSections, parseHomepageCategoryIds, parseHomepageProductLimit } from '@/lib/homepageProductSections';
import { withPublicProductResponseCache } from '@/lib/publicProductCache';

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
    const categoryIds = parseHomepageCategoryIds(searchParams.get('categoryIds'));
    const productLimit = parseHomepageProductLimit(searchParams.get('productLimit'));
    const cacheKey = `homepage-product-sections:${categoryIds.join(',')}:limit:${productLimit}`;

    const data = await withPublicProductResponseCache(cacheKey, () => loadHomepageProductSections(categoryIds, productLimit));

    return NextResponse.json({ success: true, data }, { headers: publicCacheHeaders });
  } catch (error) {
    console.error('Failed to load homepage product sections:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
