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
    const categoryId = searchParams.get('categoryId');

    if (!categoryId) {
      return NextResponse.json({ success: false, message: 'Missing categoryId parameter' }, { status: 400, headers: corsHeaders });
    }

    // Query both attributes and their values in one go
    const [rows] = await pool.query(`
      SELECT 
        a.id as attribute_id, a.name as attribute_name, a.icon as attribute_icon, a.filter_code, a.attribute_code, 
        v.id as value_id, v.value as value_name,
        (
          SELECT COUNT(DISTINCT pa.pro_id) 
          FROM idv_product_attribute pa
          JOIN idv_product_category pc ON pa.pro_id = pc.pro_id
          JOIN idv_sell_product_price pr ON pa.pro_id = pr.id
          WHERE pa.attr_value_id = v.id AND pc.category_id = ? AND pr.isOn = 1
        ) as product_count
      FROM idv_attribute_category ac
      JOIN idv_attribute a ON ac.attr_id = a.id
      JOIN idv_attribute_value v ON a.id = v.attributeId
      WHERE ac.category_id = ?
      ORDER BY ac.ordering DESC, v.ordering ASC
    `, [parseInt(categoryId, 10), parseInt(categoryId, 10)]);

    // Group the flat results into a nested structure
    const attributesMap = new Map();
    
    (rows as any[]).forEach(row => {
      if (!attributesMap.has(row.attribute_id)) {
        attributesMap.set(row.attribute_id, {
          id: row.attribute_id,
          name: row.attribute_name,
          icon: row.attribute_icon,
          filter_code: row.filter_code,
          attribute_code: row.attribute_code,
          values: []
        });
      }
      attributesMap.get(row.attribute_id).values.push({
        id: row.value_id,
        name: row.value_name,
        productCount: row.product_count
      });
    });

    const attributes = Array.from(attributesMap.values());

    // Fetch brands for this category
    const [brandRows] = await pool.query(`
      SELECT b.id as value_id, b.name as value_name, COUNT(DISTINCT p.id) as product_count
      FROM idv_brand b
      JOIN idv_sell_product_store p ON b.id = p.brandId
      JOIN idv_product_category pc ON p.id = pc.pro_id
      JOIN idv_sell_product_price pr ON p.id = pr.id
      WHERE pc.category_id = ? AND pr.isOn = 1
      GROUP BY b.id, b.name
      ORDER BY product_count DESC
    `, [parseInt(categoryId, 10)]);

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
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Failed to fetch category attributes:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
