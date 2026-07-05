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
        const categoryId = searchParams.get('category_id');
    const limit = parseInt(searchParams.get('limit') || '24', 10);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const offset = (page - 1) * limit;

    const slugify = (str: string) => {
      if (!str) return '';
      return str.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d").replace(/Đ/g, "d")
        .replace(/[^a-z0-9\- ]/g, '')
        .trim()
        .replace(/\s+/g, '-');
    };

    let baseQuery = `
      FROM idv_sell_product_store p
      LEFT JOIN idv_sell_product_price pr ON p.id = pr.id
      LEFT JOIN idv_url u ON u.id_path = CONCAT('module:product/view:product-detail/view_id:', p.id)
      LEFT JOIN idv_brand b ON p.brandId = b.id
      WHERE pr.isOn = 1
    `;
    
    const queryParams: any[] = [];

    if (categoryId) {
      baseQuery += ` AND p.id IN (SELECT pro_id FROM idv_product_category WHERE category_id = ?)`;
      queryParams.push(categoryId);
    }

    // Handle attribute filters
    const minPrice = searchParams.get('min-price');
    const maxPrice = searchParams.get('max-price');
    if (minPrice) {
      baseQuery += " AND pr.price >= ?";
      queryParams.push(parseInt(minPrice, 10));
    }
    if (maxPrice) {
      baseQuery += " AND pr.price <= ?";
      queryParams.push(parseInt(maxPrice, 10));
    }

    const filterKeys = Array.from(searchParams.keys()).filter(k => !['category_id', 'limit', 'page', 'id', 'min-price', 'max-price', 'brand', 'sort'].includes(k));
    
    const brandParam = searchParams.get('brand');
    if (brandParam) {
      const brandSlugs = brandParam.split(',');
      baseQuery += ` AND LOWER(b.name) IN (?)`;
      // We pass the raw lowercase slugs to match against lowercase brand name
      queryParams.push(brandSlugs.map(s => s.toLowerCase().replace(/-/g, ' ')));
    }
    if (filterKeys.length > 0) {
      const [attrRows] = await pool.query(`
        SELECT a.id as attr_id, a.name as attr_name, a.filter_code, v.id as val_id, v.value as val_name
        FROM idv_attribute a 
        JOIN idv_attribute_value v ON a.id = v.attributeId
      `);

      for (const key of filterKeys) {
        const urlValues = searchParams.get(key)?.split(',') || [];
        if (urlValues.length === 0) continue;

        // Find attr_id
        let targetAttrId = null;
        let matchedVals: any[] = [];

        for (const row of (attrRows as any[])) {
          const rowKey = row.filter_code || slugify(row.attr_name);
          if (rowKey === key) {
            targetAttrId = row.attr_id;
            if (urlValues.includes(slugify(row.val_name))) {
              matchedVals.push(row.val_id);
            }
          }
        }

        if (targetAttrId && matchedVals.length > 0) {
          baseQuery += ` AND p.id IN (SELECT pro_id FROM idv_product_attribute WHERE attr_id = ? AND attr_value_id IN (?))`;
          queryParams.push(targetAttrId, matchedVals);
        }
      }
    }

    // Get total count
    const [countRows] = await pool.query(`SELECT COUNT(p.id) as total ${baseQuery}`, queryParams);
    const total = (countRows as any)[0].total;
    const totalPages = Math.ceil(total / limit);

    const sortParam = searchParams.get('sort');
    let orderBy = 'ORDER BY p.id DESC';

    if (sortParam === 'price_asc') {
      orderBy = 'ORDER BY pr.price = 0, pr.price ASC';
    } else if (sortParam === 'price_desc') {
      orderBy = 'ORDER BY pr.price = 0, pr.price DESC';
    } else if (sortParam === 'newest') {
      orderBy = 'ORDER BY p.id DESC';
    }

    // Get paginated data
    const [rows] = await pool.query(`
      SELECT 
        p.id, p.storeSKU, p.proName, p.warranty, p.proThum,
        pr.price, pr.market_price,
        u.request_path as slug,
        b.name as brandName
      ${baseQuery}
      ${orderBy} LIMIT ? OFFSET ?
    `, [...queryParams, limit, offset]);

    const products = (rows as any[]).map(row => ({
      id: row.id,
      name: row.proName,
      sku: row.storeSKU,
      price: row.price || 0,
      marketPrice: row.market_price || 0,
      savings: Math.max(0, (row.market_price || 0) - (row.price || 0)),
      thumbnail: row.proThum ? `https://hacom.vn/media/product/${row.proThum}` : 'https://via.placeholder.com/300',
      slug: row.slug ? row.slug.replace('/', '') : `product-${row.id}`,
      brand: row.brandName || 'Khác'
    }));

    return NextResponse.json({
      success: true,
      data: products,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Failed to fetch products:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
