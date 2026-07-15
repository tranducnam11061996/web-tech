import type { RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { getProductCardBadgesForProductIds, type ProductCardBadge } from '@/lib/productCardAttributes';
import { resolveProductImageUrl } from '@/lib/productImageUrl';

const MAX_HOMEPAGE_COLLECTION_LIMIT = 24;
const COLLECTION_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export type HomepageFeaturedCollectionRequest = {
  collectionId: number;
  collectionSlug: string;
  collectionLimit: number;
};

export type HomepageFeaturedCollectionProduct = {
  id: number;
  name: string;
  sku: string;
  price: number;
  marketPrice: number;
  thumbnail: string;
  slug: string;
  brand: string;
  cardBadges: ProductCardBadge[];
};

export type HomepageFeaturedCollection = {
  collection: {
    id: number;
    name: string;
    url: string;
  };
  products: HomepageFeaturedCollectionProduct[];
};

type CollectionRow = RowDataPacket & {
  id: number;
  name: string | null;
  url: string | null;
};

type ProductRow = RowDataPacket & {
  id: number;
  storeSKU: string | null;
  proName: string | null;
  proThum: string | null;
  price: number | null;
  market_price: number | null;
  slug: string | null;
  brandName: string | null;
};

function positiveInteger(value: string | null, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 0;
}

export function parseHomepageFeaturedCollectionRequest(searchParams: URLSearchParams): HomepageFeaturedCollectionRequest | null {
  const collectionId = positiveInteger(searchParams.get('collectionId'));
  const collectionSlug = String(searchParams.get('collectionSlug') || '').trim().toLowerCase();
  const requestedLimit = positiveInteger(searchParams.get('collectionLimit'), 10);

  if (!collectionId || !collectionSlug || collectionSlug.length > 200 || !COLLECTION_SLUG_PATTERN.test(collectionSlug)) {
    return null;
  }

  return {
    collectionId,
    collectionSlug,
    collectionLimit: Math.min(MAX_HOMEPAGE_COLLECTION_LIMIT, requestedLimit || 10),
  };
}

export function buildHomepageBootstrapCacheKey(request: HomepageFeaturedCollectionRequest | null) {
  if (!request) return 'homepage:bootstrap:v2:no-featured-collection';
  return `homepage:bootstrap:v2:collection:${request.collectionId}:${encodeURIComponent(request.collectionSlug)}:${request.collectionLimit}`;
}

export async function loadHomepageFeaturedCollection(
  request: HomepageFeaturedCollectionRequest,
): Promise<HomepageFeaturedCollection | null> {
  const [collectionRows] = await pool.query<CollectionRow[]>(
    `
      SELECT id, name, url
      FROM idv_category_special
      WHERE id = ? AND url = ? AND status = 1
      LIMIT 1
    `,
    [request.collectionId, request.collectionSlug],
  );
  const collection = collectionRows[0];
  if (!collection) return null;

  const [productRows] = await pool.query<ProductRow[]>(
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
      FROM idv_category_special_product csp
      JOIN idv_sell_product_store p ON p.id = csp.product_id
      JOIN idv_sell_product_price pr ON pr.id = p.id
      LEFT JOIN idv_url u ON u.id_path = CONCAT('module:product/view:product-detail/view_id:', p.id)
      LEFT JOIN idv_brand b ON b.id = p.brandId
      WHERE csp.special_cat_id = ? AND pr.isOn = 1
      GROUP BY p.id, p.storeSKU, p.proName, p.proThum, pr.price, pr.market_price, u.request_path, b.name
      ORDER BY collection_ordering ASC, collection_link_id DESC
      LIMIT ?
    `,
    [collection.id, request.collectionLimit],
  );
  const badgesByProduct = await getProductCardBadgesForProductIds(productRows.map((row) => Number(row.id)));

  return {
    collection: {
      id: Number(collection.id),
      name: String(collection.name || ''),
      url: String(collection.url || ''),
    },
    products: productRows.map((row) => ({
      id: Number(row.id),
      name: String(row.proName || ''),
      sku: String(row.storeSKU || ''),
      price: Number(row.price || 0),
      marketPrice: Number(row.market_price || 0),
      thumbnail: resolveProductImageUrl(row.proThum, '/placeholder.svg'),
      slug: row.slug ? String(row.slug).replace(/^\/+/, '') : `product-${row.id}`,
      brand: String(row.brandName || ''),
      cardBadges: badgesByProduct.get(Number(row.id)) || [],
    })),
  };
}
