import { NextResponse } from 'next/server';
import { getHomepageCategoryFeatureSections } from '@/lib/categoryFeatureBoxes';

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
    const limit = Number(searchParams.get('limit') || 3);
    const productLimit = Number(searchParams.get('productLimit') || 9);
    return NextResponse.json(
      { success: true, data: await getHomepageCategoryFeatureSections(limit, productLimit) },
      { headers: publicCacheHeaders },
    );
  } catch (error) {
    console.error('Failed to load homepage category feature sections:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
