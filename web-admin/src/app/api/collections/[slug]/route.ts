import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { getProductCardBadgesForProductIds } from '@/lib/productCardAttributes';
import { withPublicProductResponseCache } from '@/lib/publicProductCache';
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

type CollectionRow = RowDataPacket & {
  id: number;
  name: string;
  url: string;
  description: string | null;
  meta_title: string | null;
  meta_description: string | null;
};

type ProductRow = RowDataPacket & {
  id: number;
  storeSKU: string;
  proName: string;
  proThum: string | null;
  price: number;
  market_price: number;
  slug: string | null;
  brandName: string | null;
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

function normalizePage(value: string | null) {
  const page = Number(value || 1);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function normalizeLimit(value: string | null) {
  const limit = Number(value || 24);
  return Number.isInteger(limit) ? Math.min(96, Math.max(1, limit)) : 24;
}

function numberParam(value: string | null) {
  if (value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : NaN;
}

function buildCacheKey(slug: string, searchParams: URLSearchParams) {
  const params = Array.from(searchParams.entries())
    .map(([key, value]) => [key.toLowerCase(), value] as const)
    .sort(([leftKey, leftValue], [rightKey, rightValue]) => leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  return `collections:${encodeURIComponent(slug)}:${params}`;
}

function orderBy(sort: string | null) {
  if (sort === 'price_asc') return 'ORDER BY pr.price = 0, pr.price ASC, p.id DESC';
  if (sort === 'price_desc') return 'ORDER BY pr.price = 0, pr.price DESC, p.id DESC';
  if (sort === 'newest') return 'ORDER BY p.id DESC';
  return 'ORDER BY MIN(csp.ordering) ASC, MAX(csp.id) DESC';
}

async function loadCollectionPayload(slug: string, searchParams: URLSearchParams) {
  const [collectionRows] = await pool.query<CollectionRow[]>(
    `
      SELECT id, name, url, description, meta_title, meta_description
      FROM idv_category_special
      WHERE url = ?
      LIMIT 1
    `,
    [slug],
  );

  const collection = collectionRows[0];
  if (!collection) {
    return { success: false, message: 'Collection not found', status: 404 };
  }

  const page = normalizePage(searchParams.get('page'));
  const limit = normalizeLimit(searchParams.get('limit'));
  const offset = (page - 1) * limit;
  const minPrice = numberParam(searchParams.get('min-price'));
  const maxPrice = numberParam(searchParams.get('max-price'));

  if (Number.isNaN(minPrice)) {
    return { success: false, message: 'Invalid min-price parameter', status: 400 };
  }
  if (Number.isNaN(maxPrice)) {
    return { success: false, message: 'Invalid max-price parameter', status: 400 };
  }

  const baseWhere = ['csp.special_cat_id = ?', 'pr.isOn = 1'];
  const baseValues: unknown[] = [collection.id];
  const filteredWhere = [...baseWhere];
  const filteredValues = [...baseValues];

  if (minPrice !== null) {
    filteredWhere.push('pr.price >= ?');
    filteredValues.push(minPrice);
  }
  if (maxPrice !== null) {
    filteredWhere.push('pr.price <= ?');
    filteredValues.push(maxPrice);
  }

  const baseFrom = `
    FROM idv_category_special_product csp
    JOIN idv_sell_product_store p ON p.id = csp.product_id
    JOIN idv_sell_product_price pr ON pr.id = p.id
  `;
  const listFrom = `
    ${baseFrom}
    LEFT JOIN idv_url u ON u.id_path = CONCAT('module:product/view:product-detail/view_id:', p.id)
    LEFT JOIN idv_brand b ON b.id = p.brandId
  `;

  const [baseCountResult, priceBoundsResult, countResult, listResult] = await Promise.all([
    pool.query<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT p.id) AS total ${baseFrom} WHERE ${baseWhere.join(' AND ')}`,
      baseValues,
    ),
    pool.query<RowDataPacket[]>(
      `SELECT COALESCE(MIN(pr.price), 0) AS min, COALESCE(MAX(pr.price), 0) AS max ${baseFrom} WHERE ${baseWhere.join(' AND ')} AND pr.price > 0`,
      baseValues,
    ),
    pool.query<RowDataPacket[]>(
      `SELECT COUNT(DISTINCT p.id) AS total ${baseFrom} WHERE ${filteredWhere.join(' AND ')}`,
      filteredValues,
    ),
    pool.query<ProductRow[]>(
      `
        SELECT
          p.id,
          p.storeSKU,
          p.proName,
          p.proThum,
          pr.price,
          pr.market_price,
          u.request_path AS slug,
          b.name AS brandName,
          MIN(csp.ordering) AS collection_ordering,
          MAX(csp.id) AS collection_link_id
        ${listFrom}
        WHERE ${filteredWhere.join(' AND ')}
        GROUP BY p.id, p.storeSKU, p.proName, p.proThum, pr.price, pr.market_price, u.request_path, b.name
        ${orderBy(searchParams.get('sort'))}
        LIMIT ? OFFSET ?
      `,
      [...filteredValues, limit, offset],
    ),
  ]);

  const total = Number(countResult[0][0]?.total || 0);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const badgesByProduct = await getProductCardBadgesForProductIds(listResult[0].map((row) => Number(row.id)));

  const data = listResult[0].map((row) => ({
    id: Number(row.id),
    name: String(row.proName || ''),
    sku: String(row.storeSKU || ''),
    price: Number(row.price || 0),
    marketPrice: Number(row.market_price || 0),
    savings: Math.max(0, Number(row.market_price || 0) - Number(row.price || 0)),
    thumbnail: resolveProductImageUrl(row.proThum, 'https://via.placeholder.com/300'),
    slug: row.slug ? String(row.slug).replace('/', '') : `product-${row.id}`,
    brand: String(row.brandName || 'Khac'),
    cardBadges: badgesByProduct.get(Number(row.id)) || [],
  }));

  return {
    success: true,
    collection: {
      id: Number(collection.id),
      name: String(collection.name || ''),
      url: String(collection.url || ''),
      description: String(collection.description || ''),
      metaTitle: String(collection.meta_title || collection.name || ''),
      metaDescription: String(collection.meta_description || ''),
      productCount: Number(baseCountResult[0][0]?.total || 0),
    },
    data,
    priceBounds: {
      min: Number(priceBoundsResult[0][0]?.min || 0),
      max: Number(priceBoundsResult[0][0]?.max || 0),
    },
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
}

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await context.params;
    const { searchParams } = new URL(request.url);
    const payload = await withPublicProductResponseCache(buildCacheKey(slug, searchParams), () => loadCollectionPayload(slug, searchParams));
    const status = 'status' in payload ? Number(payload.status || 200) : 200;
    const { status: _status, ...body } = payload as Record<string, unknown>;
    return NextResponse.json(body, { status, headers: status === 200 ? publicCacheHeaders : corsHeaders });
  } catch (error) {
    console.error('Failed to fetch collection:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
