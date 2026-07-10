import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import pool from '@/lib/db';
import { getProductCardBadgesForProductIds } from '@/lib/productCardAttributes';
import { withPublicProductResponseCache } from '@/lib/publicProductCache';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const publicCacheHeaders = {
  ...corsHeaders,
  'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
};

type CategoryRow = RowDataPacket & {
  id: number;
  name: string | null;
  slug: string | null;
};

type ProductRow = RowDataPacket & {
  categoryId: number;
  id: number;
  storeSKU: string | null;
  proName: string | null;
  proThum: string | null;
  price: number | null;
  market_price: number | null;
  slug: string | null;
  brandName: string | null;
};

function parseCategoryIds(value: string | null) {
  if (!value) return [];

  const ids: number[] = [];
  const seen = new Set<number>();

  for (const rawPart of value.split(',')) {
    const categoryId = Number(rawPart.trim());
    if (!Number.isInteger(categoryId) || categoryId <= 0 || seen.has(categoryId)) continue;

    seen.add(categoryId);
    ids.push(categoryId);
    if (ids.length >= 12) break;
  }

  return ids;
}

function parseProductLimit(value: string | null) {
  const productLimit = Number(value || 8);
  if (!Number.isFinite(productLimit)) return 8;
  return Math.min(24, Math.max(1, Math.trunc(productLimit)));
}

function normalizeSlug(value: unknown) {
  return String(value || '').replace(/^\/+/, '');
}

export async function loadHomepageProductSections(categoryIds: number[], productLimit: number) {
  if (categoryIds.length === 0) {
    return { sections: [], meta: { generatedAt: new Date().toISOString() } };
  }

  const [categoryRows] = await pool.query<CategoryRow[]>(
    `
      SELECT id, name, COALESCE(NULLIF(request_path, ''), url) AS slug
      FROM idv_seller_category
      WHERE id IN (?) AND status = 1
    `,
    [categoryIds],
  );

  const categoriesById = new Map(
    categoryRows.map((row) => [
      Number(row.id),
      {
        id: Number(row.id),
        name: String(row.name || ''),
        slug: normalizeSlug(row.slug || `category?id=${row.id}`),
      },
    ]),
  );

  const productRowGroups = await Promise.all(
    categoryIds.map(async (categoryId) => {
      if (!categoriesById.has(categoryId)) return [] as ProductRow[];

      const [rows] = await pool.query<ProductRow[]>(
        `
          SELECT DISTINCT
            ? AS categoryId,
            p.id, p.storeSKU, p.proName, p.proThum,
            pr.price, pr.market_price,
            u.request_path AS slug,
            b.name AS brandName
          FROM idv_sell_product_store p
          JOIN idv_sell_product_price pr ON p.id = pr.id
          JOIN idv_product_category pc ON pc.pro_id = p.id AND pc.category_id = ?
          LEFT JOIN idv_url u ON u.id_path = CONCAT('module:product/view:product-detail/view_id:', p.id)
          LEFT JOIN idv_brand b ON p.brandId = b.id
          WHERE pr.isOn = 1
          ORDER BY p.id DESC
          LIMIT ?
        `,
        [categoryId, categoryId, productLimit],
      );

      return rows;
    }),
  );

  const productRows = productRowGroups.flat();
  const badgesByProduct = await getProductCardBadgesForProductIds(productRows.map((product) => Number(product.id)));
  const productsByCategoryId = new Map<number, ProductRow[]>();

  for (const product of productRows) {
    const categoryProducts = productsByCategoryId.get(Number(product.categoryId)) || [];
    categoryProducts.push(product);
    productsByCategoryId.set(Number(product.categoryId), categoryProducts);
  }

  return {
    sections: categoryIds
      .map((categoryId) => {
        const category = categoriesById.get(categoryId);
        if (!category) return null;

        return {
          category,
          products: (productsByCategoryId.get(categoryId) || []).map((product) => ({
            id: Number(product.id),
            name: String(product.proName || ''),
            sku: String(product.storeSKU || ''),
            price: Number(product.price || 0),
            marketPrice: Number(product.market_price || 0),
            savings: Math.max(0, Number(product.market_price || 0) - Number(product.price || 0)),
            thumbnail: product.proThum ? `https://hacom.vn/media/product/${product.proThum}` : '',
            slug: product.slug ? normalizeSlug(product.slug) : `product-${product.id}`,
            brand: String(product.brandName || 'HACOM'),
            cardBadges: badgesByProduct.get(Number(product.id)) || [],
          })),
        };
      })
      .filter(Boolean),
    meta: { generatedAt: new Date().toISOString() },
  };
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryIds = parseCategoryIds(searchParams.get('categoryIds'));
    const productLimit = parseProductLimit(searchParams.get('productLimit'));
    const cacheKey = `homepage-product-sections:${categoryIds.join(',')}:limit:${productLimit}`;

    const data = await withPublicProductResponseCache(cacheKey, () => loadHomepageProductSections(categoryIds, productLimit));

    return NextResponse.json({ success: true, data }, { headers: publicCacheHeaders });
  } catch (error) {
    console.error('Failed to load homepage product sections:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
