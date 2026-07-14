import type { RowDataPacket } from 'mysql2/promise';
import pool from './db';
import { getProductCardBadgesForProductIds } from './productCardAttributes';
import { withPublicProductResponseCache } from './publicProductCache';
import { rankLexicalSearch } from './searchLexicalCache';
import { resolveProductImageUrl } from './productImageUrl';
import { isAttributeValueApiKey } from './attributeValueApiKey';

export interface SearchFacet {
  id: number;
  name: string;
  icon: string | null;
  filter_code: string;
  attribute_code: string;
  values: Array<{ id: number; name: string; apiKey?: string; productCount: number }>;
}

type FilterValue = { id: number; name: string; apiKey: string; ordering: number };
type FilterDefinition = { id: number; name: string; icon: string | null; filterCode: string; attributeCode: string; values: FilterValue[] };
type SearchMetadata = { filters: Map<string, FilterDefinition> };
type CandidateRow = RowDataPacket & { id: number; price: number | null; market_price: number | null };
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
type BrandFacetRow = RowDataPacket & { id: number; name: string | null; productCount: number };

const METADATA_TTL_MS = 5 * 60_000;
const reservedParams = new Set(['q', 'page', 'limit', 'sort', 'min-price', 'max-price', 'brand']);
let metadataCache: { value: SearchMetadata; expiresAt: number } | null = null;
let metadataFlight: Promise<SearchMetadata> | null = null;
let metadataSharedVersion = 0;
let nextMetadataVersionCheckAt = 0;

function normalizeText(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd')
    .replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

function slugify(value: string) {
  return normalizeText(value).replace(/\s+/g, '-');
}

async function getSearchMetadata() {
  if (Date.now() >= nextMetadataVersionCheckAt) {
    nextMetadataVersionCheckAt = Date.now() + 5_000;
    try {
      const [versionRows] = await pool.query<RowDataPacket[]>(
        "SELECT version FROM web_admin_cache_versions WHERE cache_key = 'search' LIMIT 1",
      );
      const version = Number(versionRows[0]?.version || 0);
      if (metadataSharedVersion && version && version !== metadataSharedVersion) metadataCache = null;
      metadataSharedVersion = version;
    } catch { /* performance infrastructure may not have run yet */ }
  }
  if (metadataCache && metadataCache.expiresAt > Date.now()) return metadataCache.value;
  if (metadataFlight) return metadataFlight;

  metadataFlight = pool.query<RowDataPacket[]>(`
    SELECT a.id AS attribute_id, a.name AS attribute_name, a.icon AS attribute_icon,
      a.filter_code, a.attribute_code, v.id AS value_id, v.value AS value_name,
      v.api_key AS value_api_key, v.ordering AS value_ordering
    FROM idv_attribute a
    JOIN idv_attribute_value v ON v.attributeId = a.id
    WHERE a.status = 1 AND a.isSearch = 1
    ORDER BY a.ordering ASC, a.id ASC, v.ordering ASC, v.id ASC
  `).then(([rows]) => {
    const filters = new Map<string, FilterDefinition>();
    for (const row of rows) {
      const name = String(row.attribute_name || '').trim();
      const key = String(row.filter_code || row.attribute_code || slugify(name));
      const valueName = String(row.value_name || '').trim();
      const apiKey = String(row.value_api_key || '').trim();
      if (!key || !name || !valueName || !isAttributeValueApiKey(apiKey)) continue;
      let filter = filters.get(key);
      if (!filter) {
        filter = { id: Number(row.attribute_id), name, icon: row.attribute_icon ? String(row.attribute_icon) : null, filterCode: key, attributeCode: String(row.attribute_code || ''), values: [] };
        filters.set(key, filter);
      }
      filter.values.push({ id: Number(row.value_id), name: valueName, apiKey, ordering: Number(row.value_ordering || 0) });
    }
    const value = { filters };
    metadataCache = { value, expiresAt: Date.now() + METADATA_TTL_MS };
    return value;
  }).finally(() => { metadataFlight = null; });
  return metadataFlight;
}

function parsePrice(value: string | null) {
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : Number.NaN;
}

function buildCacheKey(params: URLSearchParams) {
  return Array.from(params.entries()).sort(([a, av], [b, bv]) => a.localeCompare(b) || av.localeCompare(bv))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&');
}

function buildFilteredCandidateQuery(
  candidateIds: number[],
  searchParams: URLSearchParams,
  metadata: SearchMetadata,
  minPrice: number | null,
  maxPrice: number | null,
) {
  const whereParts = [`p.id IN (${candidateIds.map(() => '?').join(',')})`];
  const params: unknown[] = [...candidateIds];
  if (minPrice !== null) { whereParts.push('pr.price >= ?'); params.push(minPrice); }
  if (maxPrice !== null) { whereParts.push('pr.price <= ?'); params.push(maxPrice); }

  const brandValues = (searchParams.get('brand') || '').split(',').map((value) => value.trim()).filter(Boolean);
  if (brandValues.length > 0) {
    whereParts.push("LOWER(REPLACE(COALESCE(b.name, ''), ' ', '-')) IN (?)");
    params.push(brandValues);
  }

  for (const [key, rawValue] of searchParams.entries()) {
    if (reservedParams.has(key)) continue;
    const filter = metadata.filters.get(key);
    if (!filter) continue;
    const wanted = new Set(rawValue.split(',').map((value) => value.trim()).filter(Boolean));
    const valueIds = filter.values.filter((value) => wanted.has(value.apiKey)).map((value) => value.id);
    if (valueIds.length === 0) continue;
    whereParts.push('EXISTS (SELECT 1 FROM idv_product_attribute pa_filter WHERE pa_filter.pro_id = p.id AND pa_filter.attr_id = ? AND pa_filter.attr_value_id IN (?))');
    params.push(filter.id, valueIds);
  }

  return {
    fromWhere: `
      FROM idv_sell_product_store p
      JOIN idv_sell_product_price pr ON pr.id = p.id AND pr.isOn = 1
      LEFT JOIN idv_brand b ON b.id = p.brandId
      WHERE ${whereParts.join(' AND ')}
    `,
    params,
  };
}

export async function loadPublicSearchPayload(searchParams: URLSearchParams) {
  if (searchParams.toString().length > 2_048) return { success: false, message: 'Query string is too long', status: 414 };
  const customFilterCount = Array.from(searchParams.keys()).filter((key) => !reservedParams.has(key)).length;
  if (customFilterCount > 8) return { success: false, message: 'Too many filters', status: 400 };
  const page = Math.min(1_000, Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1));
  const limit = Math.min(96, Math.max(1, Number.parseInt(searchParams.get('limit') || '24', 10) || 24));
  const minPrice = parsePrice(searchParams.get('min-price'));
  const maxPrice = parsePrice(searchParams.get('max-price'));
  if (Number.isNaN(minPrice) || Number.isNaN(maxPrice)) return { success: false, message: 'Invalid price parameter', status: 400 };

  const query = (searchParams.get('q') || '').trim();
  if (query.length > 100) return { success: false, message: 'Search query is too long', status: 400 };
  const [rankedCandidates, metadata] = await Promise.all([rankLexicalSearch(query), getSearchMetadata()]);
  if (rankedCandidates.length === 0) {
    return {
      success: true,
      data: [],
      attributes: [],
      priceBounds: { min: 0, max: 0 },
      pagination: { page: 1, limit, total: 0, totalPages: 1 },
    };
  }

  const boundedCandidates = rankedCandidates.slice(0, 2_000);
  const candidateIds = boundedCandidates.map(({ product }) => product.id);
  const candidateQuery = buildFilteredCandidateQuery(candidateIds, searchParams, metadata, minPrice, maxPrice);
  const [candidateRowsResult] = await pool.query<CandidateRow[]>(
    `SELECT p.id, pr.price, pr.market_price ${candidateQuery.fromWhere}`,
    candidateQuery.params,
  );
  const candidateById = new Map(candidateRowsResult.map((row) => [Number(row.id), row]));
  let matched = boundedCandidates.filter(({ product }) => candidateById.has(product.id));
  const sort = searchParams.get('sort');

  if (sort === 'newest') {
    matched = matched.toSorted((left, right) =>
      left.customRank - right.customRank
      || right.product.id - left.product.id
      || left.score - right.score,
    );
  } else if (sort === 'price_asc' || sort === 'price_desc') {
    matched = matched.toSorted((left, right) => {
      const relevanceComparison = left.customRank - right.customRank;
      if (relevanceComparison !== 0) return relevanceComparison;
      const leftPrice = Number(candidateById.get(left.product.id)?.price || 0);
      const rightPrice = Number(candidateById.get(right.product.id)?.price || 0);
      const leftHasPrice = leftPrice > 0;
      const rightHasPrice = rightPrice > 0;
      if (leftHasPrice !== rightHasPrice) return leftHasPrice ? -1 : 1;
      const comparison = sort === 'price_asc' ? leftPrice - rightPrice : rightPrice - leftPrice;
      return comparison || left.score - right.score || right.product.id - left.product.id;
    });
  }

  const matchedIds = matched.map(({ product }) => product.id);
  const total = matchedIds.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const pageIds = matchedIds.slice((safePage - 1) * limit, safePage * limit);
  const priceBounds = candidateRowsResult.reduce((bounds, row) => {
    const price = Number(row.price || 0);
    if (price <= 0) return bounds;
    return { min: Math.min(bounds.min, price), max: Math.max(bounds.max, price) };
  }, { min: Number.POSITIVE_INFINITY, max: 0 });

  const [detailResult, facetResult, brandFacetResult] = await Promise.all([
    pageIds.length === 0
      ? Promise.resolve([[] as ProductRow[]] as [ProductRow[]])
      : pool.query<ProductRow[]>(`
          SELECT p.id, p.storeSKU, p.proName, p.proThum, pr.price, pr.market_price,
                 u.request_path AS slug, b.name AS brandName
          FROM idv_sell_product_store p
          JOIN idv_sell_product_price pr ON pr.id = p.id AND pr.isOn = 1
          LEFT JOIN idv_url u ON u.id_path = CONCAT('module:product/view:product-detail/view_id:', p.id)
          LEFT JOIN idv_brand b ON b.id = p.brandId
          WHERE p.id IN (${pageIds.map(() => '?').join(',')})
        `, pageIds),
    matchedIds.length === 0
      ? Promise.resolve([[] as RowDataPacket[]] as [RowDataPacket[]])
      : pool.query<RowDataPacket[]>(`
          SELECT pa.attr_id, pa.attr_value_id, COUNT(DISTINCT pa.pro_id) AS productCount
          FROM idv_product_attribute pa
          WHERE pa.pro_id IN (${matchedIds.map(() => '?').join(',')})
          GROUP BY pa.attr_id, pa.attr_value_id
        `, matchedIds),
    matchedIds.length === 0
      ? Promise.resolve([[] as BrandFacetRow[]] as [BrandFacetRow[]])
      : pool.query<BrandFacetRow[]>(`
          SELECT MIN(b.id) AS id, MIN(b.name) AS name, COUNT(DISTINCT p.id) AS productCount
          FROM idv_sell_product_store p
          JOIN idv_brand b ON b.id = p.brandId
          WHERE p.id IN (${matchedIds.map(() => '?').join(',')})
            AND TRIM(COALESCE(b.name, '')) <> ''
          GROUP BY LOWER(TRIM(b.name))
          ORDER BY productCount DESC, name ASC
        `, matchedIds),
  ]);

  const rowsById = new Map(detailResult[0].map((row) => [Number(row.id), row]));
  const rows = pageIds.map((id) => rowsById.get(id)).filter((row): row is ProductRow => Boolean(row));
  const badges = await getProductCardBadgesForProductIds(rows.map((row) => Number(row.id)));
  const facetCounts = new Map<string, number>();
  for (const row of facetResult[0]) facetCounts.set(`${Number(row.attr_id)}:${Number(row.attr_value_id)}`, Number(row.productCount || 0));
  const attributes: SearchFacet[] = [];
  const brandValues = brandFacetResult[0]
    .map((row) => ({ id: Number(row.id), name: String(row.name || '').trim(), productCount: Number(row.productCount || 0) }))
    .filter((brand) => brand.name.length > 0 && brand.productCount > 0);
  if (brandValues.length > 0) {
    attributes.push({
      id: 0,
      name: 'Thương hiệu',
      icon: '🏷️',
      filter_code: 'brand',
      attribute_code: 'brand',
      values: brandValues,
    });
  }
  for (const filter of metadata.filters.values()) {
    const values = filter.values
      .map((value) => ({ id: value.id, name: value.name, apiKey: value.apiKey, productCount: facetCounts.get(`${filter.id}:${value.id}`) || 0, ordering: value.ordering }))
      .filter((value) => value.productCount > 0)
      .sort((a, b) => a.ordering - b.ordering || a.name.localeCompare(b.name, 'vi'))
      .map(({ ordering: _ordering, ...value }) => value);
    if (values.length > 0) attributes.push({ id: filter.id, name: filter.name, icon: filter.icon, filter_code: filter.filterCode, attribute_code: filter.attributeCode, values });
  }

  return {
    success: true,
    data: rows.map((row) => ({
      id: Number(row.id), name: row.proName, sku: row.storeSKU, price: Number(row.price || 0), marketPrice: Number(row.market_price || 0),
      savings: Math.max(0, Number(row.market_price || 0) - Number(row.price || 0)),
      thumbnail: resolveProductImageUrl(row.proThum, 'https://via.placeholder.com/300'),
      slug: row.slug ? String(row.slug).replace(/^\/+/, '') : `product-${row.id}`,
      brand: row.brandName || 'Khac', cardBadges: badges.get(Number(row.id)) || [],
    })),
    attributes,
    priceBounds: {
      min: Number.isFinite(priceBounds.min) ? priceBounds.min : 0,
      max: priceBounds.max,
    },
    pagination: { page: safePage, limit, total, totalPages },
  };
}

export async function getPublicSearchPayload(searchParams: URLSearchParams) {
  return withPublicProductResponseCache(`search:${buildCacheKey(searchParams)}`, () => loadPublicSearchPayload(searchParams));
}

export function invalidatePublicSearchMetadata() {
  metadataCache = null;
}
