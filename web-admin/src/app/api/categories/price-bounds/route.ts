import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { effectivePublicCategoryScope, loadEnabledPublicCategoryScope } from '@/lib/publicCategoryScope';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const publicCacheHeaders = {
  ...corsHeaders,
  'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = Number(searchParams.get('categoryId'));

    if (!Number.isSafeInteger(categoryId) || categoryId <= 0) {
      return NextResponse.json({ success: false, message: 'Missing categoryId' }, { status: 400, headers: corsHeaders });
    }
    const categoryScope = effectivePublicCategoryScope(await loadEnabledPublicCategoryScope(categoryId));

    const [rows] = await pool.query(`
      SELECT MIN(pr.price) as minPrice, MAX(pr.price) as maxPrice
      FROM idv_product_category pc
      JOIN idv_sell_product_price pr ON pc.pro_id = pr.id
      WHERE pc.category_id IN (?) AND pr.isOn = 1 AND pr.price > 0
    `, [categoryScope]);

    return NextResponse.json({
      success: true,
      data: {
        min: (rows as any)[0]?.minPrice || 0,
        max: (rows as any)[0]?.maxPrice || 0
      }
    }, { headers: publicCacheHeaders });

  } catch {
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
