import { NextResponse } from 'next/server';
import pool from '@/lib/db';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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
    const productIdsParam = searchParams.get('productIds');
    const categoryIdParam = searchParams.get('category_id');

    if (!productIdsParam) {
      return NextResponse.json(
        { success: true, data: [] },
        { headers: corsHeaders }
      );
    }

    // Parse product IDs
    const productIds = productIdsParam
      .split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => Number.isInteger(n) && n > 0);

    if (productIds.length === 0) {
      return NextResponse.json(
        { success: true, data: [] },
        { headers: corsHeaders }
      );
    }

    // Batch query (max 500 IDs per query for MySQL performance)
    const BATCH_SIZE = 500;
    const allRows: any[] = [];

    for (let i = 0; i < productIds.length; i += BATCH_SIZE) {
      const batch = productIds.slice(i, i + BATCH_SIZE);
      const placeholders = batch.map(() => '?').join(',');
      const params = [...batch];

      // Nếu có categoryId, thêm join để chỉ lấy attributes thuộc category đó
      const categoryJoin = categoryIdParam
        ? 'JOIN idv_attribute_category ac ON ac.attr_id = a.id AND ac.category_id = ?'
        : '';
      if (categoryIdParam) params.push(parseInt(categoryIdParam, 10));

      const [rows]: any[] = await pool.query(`
        SELECT
          a.id as attribute_id,
          a.name as attribute_name,
          a.icon as attribute_icon,
          a.filter_code,
          a.attribute_code,
          v.id as value_id,
          v.value as value_name,
          COUNT(DISTINCT pa.pro_id) as product_count
        FROM idv_product_attribute pa
        JOIN idv_attribute a ON pa.attr_id = a.id
        JOIN idv_attribute_value v ON a.id = v.attributeId
        ${categoryJoin}
        WHERE pa.pro_id IN (${placeholders})
        GROUP BY v.id
        ORDER BY a.id, v.ordering ASC
      `, params);

      allRows.push(...rows);
    }

    // Brand query (optional, nếu có categoryId)
    let brandRows: any[] = [];
    if (categoryIdParam) {
      const catId = parseInt(categoryIdParam, 10);
      const [bRows]: any[] = await pool.query(`
        SELECT MIN(b.id) as value_id, MIN(b.name) as value_name, COUNT(DISTINCT p.id) as product_count
        FROM idv_brand b
        JOIN idv_sell_product_store p ON b.id = p.brandId
        WHERE p.id IN (${productIds.slice(0, BATCH_SIZE).map(() => '?').join(',')})
          AND EXISTS (
            SELECT 1 FROM idv_product_category pc WHERE pc.pro_id = p.id AND pc.category_id = ?
          )
        GROUP BY LOWER(TRIM(b.name))
        ORDER BY product_count DESC
      `, [...productIds.slice(0, BATCH_SIZE), catId]);
      brandRows = bRows;
    }

    // Group flat rows into nested structure
    const attributesMap = new Map<number, {
      id: number;
      name: string;
      icon: string | null;
      filter_code: string;
      attribute_code: string;
      values: { id: number; name: string; productCount: number }[];
    }>();

    const processedValueIds = new Set<number>();

    for (const row of allRows) {
      if (!isDisplayableFilterValue(row.value_name)) continue;

      // Deduplicate: mỗi value_id chỉ xử lý 1 lần (vì batch query có thể overlap)
      if (processedValueIds.has(row.value_id)) continue;
      processedValueIds.add(row.value_id);

      if (!attributesMap.has(row.attribute_id)) {
        attributesMap.set(row.attribute_id, {
          id: row.attribute_id,
          name: row.attribute_name,
          icon: normalizeAttributeIcon(row.attribute_icon),
          filter_code: row.filter_code,
          attribute_code: row.attribute_code,
          values: [],
        });
      }

      const attr = attributesMap.get(row.attribute_id)!;
      // Kiểm tra xem value đã tồn tại chưa (tránh duplicate từ batch overlap)
      const existingValue = attr.values.find(v => v.id === row.value_id);
      if (!existingValue) {
        attr.values.push({
          id: row.value_id,
          name: row.value_name,
          productCount: row.product_count || 0,
        });
      }
    }

    const attributes = Array.from(attributesMap.values()).filter(attr => attr.values.length > 0);

    // Thêm brand vào đầu nếu có
    if (brandRows.length > 0) {
      attributes.unshift({
        id: 0,
        name: 'Thương Hiệu',
        icon: '🏷️',
        filter_code: 'brand',
        attribute_code: 'brand',
        values: brandRows.map(r => ({
          id: r.value_id,
          name: r.value_name,
          productCount: r.product_count || 0,
        })),
      });
    }

    return NextResponse.json(
      { success: true, data: attributes },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Failed to fetch search attributes:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
