import { NextResponse } from 'next/server';
import pool from '@/lib/db';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const publicCacheHeaders = {
  ...corsHeaders,
  'Cache-Control': 'public, max-age=0, s-maxage=300, stale-while-revalidate=600',
};

const unsafeFilterValuePattern = /^(?:javascript\s*:|https?:\/\/|data\s*:|\/\/)/i;

function normalizeAttributeIcon(value: unknown) {
  const icon = String(value || '').trim();
  if (!icon || unsafeFilterValuePattern.test(icon) || icon.length > 16) return null;
  return icon;
}

function isDisplayableFilterValue(value: unknown) {
  const label = String(value || '').trim();
  return label.length > 0 && !unsafeFilterValuePattern.test(label);
}

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

    const attributesPromise = pool.query(`
      SELECT
        a.id as attribute_id,
        a.name as attribute_name,
        a.icon as attribute_icon,
        a.filter_code,
        a.attribute_code,
        v.id as value_id,
        v.value as value_name,
        COALESCE(product_counts.product_count, 0) as product_count
      FROM idv_attribute_category ac
      JOIN idv_attribute a ON ac.attr_id = a.id
      JOIN idv_attribute_value v ON a.id = v.attributeId
      LEFT JOIN (
        SELECT pa.attr_value_id, COUNT(DISTINCT pa.pro_id) as product_count
          FROM idv_product_attribute pa
          JOIN idv_product_category pc ON pa.pro_id = pc.pro_id AND pc.category_id = ?
          JOIN idv_sell_product_price pr ON pa.pro_id = pr.id AND pr.isOn = 1
          GROUP BY pa.attr_value_id
      ) product_counts ON product_counts.attr_value_id = v.id
      WHERE ac.category_id = ?
      ORDER BY ac.ordering DESC, v.ordering ASC
    `, [categoryId, categoryId]);

    const brandsPromise = pool.query(`
      SELECT MIN(b.id) as value_id, MIN(b.name) as value_name, COUNT(DISTINCT p.id) as product_count
      FROM idv_brand b
      JOIN idv_sell_product_store p ON b.id = p.brandId
      JOIN idv_product_category pc ON p.id = pc.pro_id
      JOIN idv_sell_product_price pr ON p.id = pr.id
      WHERE pc.category_id = ? AND pr.isOn = 1
      GROUP BY LOWER(TRIM(b.name))
      ORDER BY product_count DESC
    `, [categoryId]);

    const [[rows], [brandRows]] = await Promise.all([attributesPromise, brandsPromise]);

    // Group the flat results into a nested structure
    const attributesMap = new Map();
    
    (rows as any[]).forEach(row => {
      if (!isDisplayableFilterValue(row.value_name)) return;

      if (!attributesMap.has(row.attribute_id)) {
        attributesMap.set(row.attribute_id, {
          id: row.attribute_id,
          name: row.attribute_name,
          icon: normalizeAttributeIcon(row.attribute_icon),
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

    const attributes = Array.from(attributesMap.values()).filter(attribute => attribute.values.length > 0);

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
