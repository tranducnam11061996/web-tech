import { NextResponse } from 'next/server';
import pool from '@/lib/db';

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
    const parentId = searchParams.get('parentId');

    if (!parentId) {
      return NextResponse.json({ success: false, message: 'Missing parentId parameter' }, { status: 400, headers: corsHeaders });
    }

    const [rows] = await pool.query(`
      SELECT 
        c.id, c.name, c.url,
        (SELECT COUNT(DISTINCT pc.pro_id) 
         FROM idv_product_category pc 
         JOIN idv_sell_product_price pr ON pc.pro_id = pr.id 
         WHERE pc.category_id = c.id AND pr.isOn = 1) as computedCount
      FROM idv_seller_category c
      WHERE c.parentId = ?
      ORDER BY c.ordering DESC, c.id DESC
    `, [parseInt(parentId, 10)]);

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
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Failed to fetch categories:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
