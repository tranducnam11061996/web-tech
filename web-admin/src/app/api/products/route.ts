import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getProductCardBadgesForProductIds } from '@/lib/productCardAttributes';
import { withPublicProductResponseCache } from '@/lib/publicProductCache';
import { getPublicCategoryFeatureBox } from '@/lib/categoryFeatureBoxes';
import { jsonWithEtag } from '@/lib/httpCache';
import { getCategoryTrail } from '@/lib/publicBreadcrumbs';
import { getProductsByIds, parseProductIdsParam } from '@/lib/publicRecommendations';
import { recordRouteMetric } from '@/lib/runtimeMetrics';
import { resolveProductImageUrl } from '@/lib/productImageUrl';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const publicCacheHeaders = {
  ...corsHeaders,
  'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
};

const reservedFilterKeys = new Set(['category_id', 'limit', 'page', 'id', 'ids', 'min-price', 'max-price', 'brand', 'sort', 'feature_scope']);
const attributeRowsCache = new Map<string, { expiresAt: number; rows: any[] }>();
const attributeRowsFlights = new Map<string, Promise<any[]>>();

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

function slugify(str: string) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .replace(/[^a-z0-9\- ]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

async function getAttributeRows(categoryId: number | null) {
  const key = String(categoryId || 0);
  const cached = attributeRowsCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.rows;
  const running = attributeRowsFlights.get(key);
  if (running) return running;
  const flight = pool.query(
    `SELECT a.id AS attr_id,a.name AS attr_name,a.filter_code,a.attribute_code,v.id AS val_id,v.value AS val_name
     FROM idv_attribute a
     ${categoryId ? 'JOIN idv_attribute_category ac ON ac.attr_id=a.id AND ac.category_id=?' : ''}
     JOIN idv_attribute_value v ON a.id=v.attributeId`,
    categoryId ? [categoryId] : [],
  ).then(([rows]) => {
    const value = rows as any[];
    attributeRowsCache.set(key, { rows: value, expiresAt: Date.now() + 5 * 60_000 });
    while (attributeRowsCache.size > 50) attributeRowsCache.delete(attributeRowsCache.keys().next().value!);
    return value;
  }).finally(() => attributeRowsFlights.delete(key));
  attributeRowsFlights.set(key, flight);
  return flight;
}

function buildProductsCacheKey(searchParams: URLSearchParams) {
  return Array.from(searchParams.entries())
    .map(([key, value]) => [key.toLowerCase(), value] as const)
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
}

async function loadProductsPayload(searchParams: URLSearchParams) {
  if (searchParams.toString().length > 2_048) return { success: false, message: 'Query string is too long', status: 414 };
  const categoryIdParam = searchParams.get('category_id');
  const categoryId = categoryIdParam ? Number(categoryIdParam) : null;
  const featureScope = searchParams.get('feature_scope') === 'homepage' ? 'homepage' : 'category';
  const limit = Math.min(96, Math.max(1, parseInt(searchParams.get('limit') || '24', 10) || 24));
  const page = Math.min(1_000, Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1));
  const offset = (page - 1) * limit;

  if (categoryIdParam && (!Number.isInteger(categoryId) || Number(categoryId) <= 0)) {
    return { success: false, message: 'Invalid category_id parameter', status: 400 };
  }

  const joins = [
    'FROM idv_sell_product_store p',
    'JOIN idv_sell_product_price pr ON p.id = pr.id',
  ];
  const whereParts = ['pr.isOn = 1'];
  const queryParams: any[] = [];

  if (categoryId) {
    joins.push('JOIN idv_product_category pc ON pc.pro_id = p.id AND pc.category_id = ?');
    queryParams.push(categoryId);
  }

  const minPrice = searchParams.get('min-price');
  const maxPrice = searchParams.get('max-price');
  const minPriceValue = minPrice ? Number(minPrice) : null;
  const maxPriceValue = maxPrice ? Number(maxPrice) : null;

  if (minPrice && (!Number.isFinite(minPriceValue) || Number(minPriceValue) < 0)) {
    return { success: false, message: 'Invalid min-price parameter', status: 400 };
  }
  if (maxPrice && (!Number.isFinite(maxPriceValue) || Number(maxPriceValue) < 0)) {
    return { success: false, message: 'Invalid max-price parameter', status: 400 };
  }
  if (minPriceValue !== null) {
    whereParts.push('pr.price >= ?');
    queryParams.push(minPriceValue);
  }
  if (maxPriceValue !== null) {
    whereParts.push('pr.price <= ?');
    queryParams.push(maxPriceValue);
  }

  const brandParam = searchParams.get('brand');
  if (brandParam) {
    const brandSlugs = brandParam
      .split(',')
      .map((value) => value.trim().toLowerCase().replace(/-/g, ' '))
      .filter(Boolean);

    if (brandSlugs.length > 0) {
      joins.push('JOIN idv_brand brand_filter ON brand_filter.id = p.brandId');
      whereParts.push('LOWER(brand_filter.name) IN (?)');
      queryParams.push(brandSlugs);
    }
  }

  const filterKeys = Array.from(searchParams.keys()).filter((key) => !reservedFilterKeys.has(key));
  if (filterKeys.length > 8) return { success: false, message: 'Too many filters', status: 400 };
  if (filterKeys.length > 0) {
    const attrRows = await getAttributeRows(categoryId);

    const attributesByKey = new Map<string, { attrId: number; valuesBySlug: Map<string, number[]> }>();

    for (const row of attrRows) {
      const rowKey = row.filter_code || row.attribute_code || slugify(row.attr_name);
      if (!rowKey) continue;

      let entry = attributesByKey.get(rowKey);
      if (!entry) {
        entry = { attrId: Number(row.attr_id), valuesBySlug: new Map() };
        attributesByKey.set(rowKey, entry);
      }

      const valueSlug = slugify(row.val_name);
      const valueIds = entry.valuesBySlug.get(valueSlug) || [];
      valueIds.push(Number(row.val_id));
      entry.valuesBySlug.set(valueSlug, valueIds);
    }

    for (const key of filterKeys) {
      const urlValues = (searchParams.get(key)?.split(',') || []).slice(0, 20);
      if (urlValues.length === 0) continue;

      const attribute = attributesByKey.get(key);
      if (!attribute) continue;

      const matchedVals: number[] = [];
      for (const valueSlug of urlValues) {
        matchedVals.push(...(attribute.valuesBySlug.get(valueSlug) || []));
      }

      if (matchedVals.length > 0) {
        whereParts.push('p.id IN (SELECT pro_id FROM idv_product_attribute WHERE attr_id = ? AND attr_value_id IN (?))');
        queryParams.push(attribute.attrId, matchedVals);
      }
    }
  }

  const sortParam = searchParams.get('sort');
  let orderBy = 'ORDER BY p.id DESC';

  if (sortParam === 'price_asc') {
    orderBy = 'ORDER BY pr.price = 0, pr.price ASC';
  } else if (sortParam === 'price_desc') {
    orderBy = 'ORDER BY pr.price = 0, pr.price DESC';
  } else if (sortParam === 'newest') {
    orderBy = 'ORDER BY p.id DESC';
  }

  const countFrom = `${joins.join('\n')} WHERE ${whereParts.join(' AND ')}`;
  const listFrom = `${[
    ...joins,
    "LEFT JOIN idv_url u ON u.id_path = CONCAT('module:product/view:product-detail/view_id:', p.id)",
    'LEFT JOIN idv_brand b ON p.brandId = b.id',
  ].join('\n')} WHERE ${whereParts.join(' AND ')}`;
  const countQuery = `SELECT COUNT(DISTINCT p.id) AS total ${countFrom}`;
  const listQuery = `
    SELECT DISTINCT
      p.id, p.storeSKU, p.proName, p.warranty, p.proThum,
      pr.price, pr.market_price,
      u.request_path AS slug,
      b.name AS brandName
    ${listFrom}
    ${orderBy} LIMIT ? OFFSET ?
  `;

  const [countResult, listResult] = await Promise.all([
    pool.query(countQuery, queryParams),
    pool.query(listQuery, [...queryParams, limit, offset]),
  ]);

  const countRows = countResult[0] as any[];
  const rows = listResult[0] as any[];
  const total = Number(countRows[0]?.total || 0);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const badgesByProduct = await getProductCardBadgesForProductIds(rows.map((row) => Number(row.id)));

  const [featureBox, categoryTrail] = await Promise.all([
    categoryId ? getPublicCategoryFeatureBox(Number(categoryId), featureScope) : Promise.resolve(null),
    categoryId ? getCategoryTrail('product', Number(categoryId)) : Promise.resolve([]),
  ]);

  const products = rows.map((row) => ({
    id: row.id,
    name: row.proName,
    sku: row.storeSKU,
    price: row.price || 0,
    marketPrice: row.market_price || 0,
    savings: Math.max(0, (row.market_price || 0) - (row.price || 0)),
    thumbnail: resolveProductImageUrl(row.proThum, 'https://via.placeholder.com/300'),
    slug: row.slug ? row.slug.replace('/', '') : `product-${row.id}`,
    brand: row.brandName || 'Khac',
    cardBadges: badgesByProduct.get(Number(row.id)) || [],
  }));

  return {
    success: true,
    data: products,
    layoutMeta: {
      featureBox,
      categoryTrail,
    },
    pagination: {
      total,
      page,
      limit,
      totalPages,
    },
  };
}

export async function GET(request: Request) {
  const startedAt = performance.now();
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.has('ids')) {
      const parsedIds = parseProductIdsParam(searchParams.get('ids'));
      if (!parsedIds.ok) {
        return NextResponse.json(
          { success: false, message: parsedIds.message },
          { status: 400, headers: { ...corsHeaders, 'Cache-Control': 'private, no-store' } },
        );
      }
      const products = await getProductsByIds(parsedIds.ids);
      const duration = performance.now() - startedAt;
      recordRouteMetric('GET /api/products', duration, 200);
      return NextResponse.json(
        {
          success: true,
          data: products,
          layoutMeta: { featureBox: null, categoryTrail: [] },
          pagination: { total: products.length, page: 1, limit: 15, totalPages: 1 },
        },
        { headers: { ...corsHeaders, 'Cache-Control': 'private, max-age=60' } },
      );
    }
    const cacheKey = buildProductsCacheKey(searchParams);
    const payload = await withPublicProductResponseCache(`products:${cacheKey}`, () => loadProductsPayload(searchParams));
    const status = 'status' in payload ? Number(payload.status || 200) : 200;
    const { status: _status, ...body } = payload as Record<string, unknown>;
    const duration = performance.now() - startedAt;
    recordRouteMetric('GET /api/products', duration, status);
    return jsonWithEtag(request, body, { status, headers: { ...publicCacheHeaders, 'Server-Timing': `app;dur=${duration.toFixed(1)}` } });
  } catch (error) {
    console.error('Failed to fetch products:', error);
    recordRouteMetric('GET /api/products', performance.now() - startedAt, 500);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
