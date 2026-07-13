import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { PUBLIC_CATEGORY_SCOPE_MAX_DEPTH } from '@/lib/publicCategoryScope';

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
    const parentIdParam = searchParams.get('parentId');

    if (parentIdParam === null) {
      return NextResponse.json({ success: false, message: 'Missing parentId parameter' }, { status: 400, headers: corsHeaders });
    }
    const parentId = Number(parentIdParam);
    if (!Number.isSafeInteger(parentId) || parentId < 0) {
      return NextResponse.json({ success: false, message: 'Invalid parentId parameter' }, { status: 400, headers: corsHeaders });
    }

    const [rows] = await pool.query(`
      WITH RECURSIVE child_scope AS (
        SELECT c.id AS root_id,c.id AS category_id,0 AS depth,
               CAST(CONCAT(',',c.id,',') AS CHAR(12000)) AS visited
        FROM idv_seller_category c
        WHERE c.parentId=? AND c.status=1
        UNION ALL
        SELECT scope.root_id,child.id,scope.depth+1,CONCAT(scope.visited,child.id,',')
        FROM child_scope scope
        JOIN idv_seller_category child
          ON child.parentId=scope.category_id AND child.status=1
        WHERE scope.depth<${PUBLIC_CATEGORY_SCOPE_MAX_DEPTH}
          AND LOCATE(CONCAT(',',child.id,','),scope.visited)=0
      ), product_counts AS (
        SELECT scope.root_id,COUNT(DISTINCT pc.pro_id) AS computedCount
        FROM child_scope scope
        JOIN idv_product_category pc ON pc.category_id=scope.category_id
        JOIN idv_sell_product_price pr ON pr.id=pc.pro_id AND pr.isOn=1
        GROUP BY scope.root_id
      )
      SELECT c.id,c.name,c.url,COALESCE(counts.computedCount,0) AS computedCount
      FROM idv_seller_category c
      LEFT JOIN product_counts counts ON counts.root_id=c.id
      WHERE c.parentId = ? AND c.status = 1
      ORDER BY c.ordering DESC, c.id DESC
    `, [parentId, parentId]);

    // Map rows to friendly output
    const subcategories = (rows as any[]).map(row => ({
      id: row.id,
      name: row.name,
      // If url exists, we prepend a slash, otherwise fallback to id
      slug: row.url ? `/${row.url.replace(/^\/+/, '')}` : `/category?id=${row.id}`,
      productCount: row.computedCount || 0
    }));

    return NextResponse.json({
      success: true,
      data: subcategories
    }, { headers: publicCacheHeaders });

  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
