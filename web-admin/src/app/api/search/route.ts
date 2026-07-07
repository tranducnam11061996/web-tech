import { NextResponse } from 'next/server';
import { searchCache, removeVietnameseTones, type SearchProduct } from '@/lib/searchCache';
import Fuse from 'fuse.js';
import pool from '@/lib/db';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get('q') || '';
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(48, Math.max(1, parseInt(url.searchParams.get('limit') || '24')));

    if (!searchCache.cachedProducts) {
      await searchCache.warmPromise?.catch(() => {});
      if (!searchCache.cachedProducts) {
        return NextResponse.json(
          { success: true, data: [], pagination: { page: 1, limit, total: 0, totalPages: 1 } },
          { headers: { 'Access-Control-Allow-Origin': '*' } }
        );
      }
    }

    const products = searchCache.cachedProducts;

    if (!q.trim()) {
      const total = products.length;
      const totalPages = Math.ceil(total / limit);
      const offset = (page - 1) * limit;
      const paged = products.slice(offset, offset + limit);
      const enriched = await buildResults(paged);
      return NextResponse.json(
        { success: true, data: enriched, pagination: { page, limit, total, totalPages } },
        { headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const normalizedQuery = removeVietnameseTones(q);
    const tokens = normalizedQuery.split(' ').filter((t) => t.trim() !== '');

    const fuseQuery: string | Fuse.Expression =
      tokens.length > 1
        ? { $and: tokens.map((token) => ({ searchText: token })) }
        : normalizedQuery;

    const fuse = new Fuse(products, {
      keys: ['searchText'],
      threshold: 0.3,
      distance: 200,
      ignoreLocation: true,
      includeScore: true,
      useExtendedSearch: true,
    });

    const rawResults = fuse.search(fuseQuery);
    const validResults = rawResults
      .filter((r) => (r.score ?? 1) < 0.4)
      .sort((a, b) => (a.score ?? 1) - (b.score ?? 1));

    const total = validResults.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const pageItems = validResults.slice(offset, offset + limit).map((r) => r.item);
    const enriched = await buildResults(pageItems);

    return NextResponse.json(
      { success: true, data: enriched, pagination: { page, limit, total, totalPages } },
      { headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (err) {
    console.error('[Search API] Error:', err);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

async function buildResults(products: SearchProduct[]): Promise<any[]> {
  if (products.length === 0) return [];
  const ids = products.map((p) => p.id);
  const idList = ids.join(',');

  const [rows]: any[] = await pool.query(`
    SELECT
      p.id,
      p.storeSKU,
      p.proName,
      pr.price,
      pr.market_price,
      p.proThum,
      u.request_path as slug,
      b.name as brandName
    FROM idv_sell_product_store p
    LEFT JOIN idv_sell_product_price pr ON p.id = pr.id AND pr.isOn = 1
    LEFT JOIN idv_url u ON u.id_path = CONCAT('module:product/view:product-detail/view_id:', p.id)
    LEFT JOIN idv_brand b ON p.brandId = b.id
    WHERE p.id IN (${idList})
  `);

  const rowMap = new Map<number, any>();
  for (const row of rows) {
    rowMap.set(row.id, row);
  }

  return products
    .map((p) => {
      const row = rowMap.get(p.id);
      if (!row) return null;
      return {
        id: p.id,
        name: p.proName,
        sku: p.storeSKU,
        price: row.price ?? 0,
        marketPrice: row.market_price ?? 0,
        savings: Math.max(0, (row.market_price ?? 0) - (row.price ?? 0)),
        thumbnail: row.proThum
          ? 'https://hacom.vn/media/product/' + row.proThum
          : 'https://via.placeholder.com/300',
        slug: row.slug ? row.slug.replace(/^\/+/, '') : 'product-' + p.id,
        brand: row.brandName || 'Khác',
      };
    })
    .filter((p): p is any => p !== null);
}
