import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { effectivePublicCategoryScope, loadEnabledPublicCategoryScope } from '@/lib/publicCategoryScope';
import { getPublicCategoryAttributeRows, groupPublicCategoryAttributeRows } from '@/lib/publicCategoryAttributes';

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

    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return NextResponse.json({ success: false, message: 'Missing categoryId parameter' }, { status: 400, headers: corsHeaders });
    }
    const categoryScope = effectivePublicCategoryScope(await loadEnabledPublicCategoryScope(categoryId));

    const attributesPromise = getPublicCategoryAttributeRows(categoryScope);

    const brandsPromise = pool.query(`
      SELECT MIN(b.id) as value_id, MIN(b.name) as value_name, COUNT(DISTINCT p.id) as product_count
      FROM idv_brand b
      JOIN idv_sell_product_store p ON b.id = p.brandId
      JOIN idv_product_category pc ON p.id = pc.pro_id
      JOIN idv_sell_product_price pr ON p.id = pr.id
      WHERE pc.category_id IN (?) AND pr.isOn = 1
      GROUP BY LOWER(TRIM(b.name))
      ORDER BY product_count DESC
    `, [categoryScope]);

    const [rows, [brandRows]] = await Promise.all([attributesPromise, brandsPromise]);
    const attributes = groupPublicCategoryAttributeRows(rows);

    if ((brandRows as any[]).length > 0) {
      attributes.unshift({
        id: "brand",
        name: "Thương Hiệu",
        icon: "🏷️",
        filter_code: "brand",
        attribute_code: "brand",
        values: (brandRows as any[]).map(r => ({
          id: r.value_id,
          name: r.value_name,
          productCount: r.product_count
        }))
      });
    }

    return NextResponse.json({
      success: true,
      data: attributes
    }, { headers: publicCacheHeaders });

  } catch (error) {
    console.error('Failed to fetch category attributes:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
