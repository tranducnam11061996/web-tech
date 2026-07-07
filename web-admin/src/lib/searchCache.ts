import Fuse from 'fuse.js';
import type { RowDataPacket } from 'mysql2/promise';
import pool from './db';

const CACHE_TTL_MS = 60_000;
const unsafeFilterTextPattern = /^(?:javascript\s*:|https?:\/\/|data\s*:|\/\/)/i;
const htmlEntityPattern = /&(?:amp|lt|gt|quot|apos|#39|#x27|#60|#x3c|#62|#x3e);/gi;

export const SYNONYM_GROUPS: string[][] = [
  ['laptop', 'may tinh xach tay'],
  ['vga', 'card do hoa', 'card man hinh'],
  ['chuot', 'mouse'],
  ['ban phim', 'keyboard'],
  ['man hinh', 'monitor', 'lcd', 'display'],
  ['cpu', 'chip', 'bo vi xu ly', 'vi xu ly'],
  ['ram', 'bo nho trong', 'bo nho ram'],
  ['ssd', 'o cung', 'hdd', 'o cung the ran'],
];

const SYNONYM_REGEXES = SYNONYM_GROUPS.map((group) =>
  group.map((word) => ({
    word,
    regex: new RegExp(`(^|\\s)${word}($|\\s)`),
  })),
);

export interface SearchWebhookProduct {
  SKU?: string;
  ten_san_pham?: string;
  data_search?: string;
}

export interface SearchFilterValue {
  id: number;
  name: string;
  slug: string;
  ordering: number;
}

export interface SearchFilterDefinition {
  id: number;
  name: string;
  icon: string | null;
  filterCode: string;
  attributeCode: string;
  values: Map<string, SearchFilterValue>;
}

export interface SearchProduct {
  id: number;
  storeSKU: string;
  proName: string;
  searchText: string;
  normalizedName: string;
  price: number;
  marketPrice: number;
  thumbnail: string;
  slug: string;
  brand: string;
  filterValues: Map<string, Set<string>>;
}

interface ProductRow extends RowDataPacket {
  id: number;
  storeSKU: string;
  proName: string;
  data_search: string | null;
  price: number | null;
  market_price: number | null;
  proThum: string | null;
  slug: string | null;
  brandId: number | null;
  brandName: string | null;
}

interface AttributeRow extends RowDataPacket {
  product_id: number;
  attribute_id: number;
  attribute_name: string;
  attribute_icon: string | null;
  filter_code: string | null;
  attribute_code: string | null;
  value_id: number;
  value_name: string;
  value_ordering: number | null;
}

interface SearchCacheState {
  cachedProducts: SearchProduct[] | null;
  filters: Map<string, SearchFilterDefinition>;
  shortFuse: Fuse<SearchProduct> | null;
  longFuse: Fuse<SearchProduct> | null;
  expiresAt: number;
  warmPromise: Promise<void> | null;
}

export const searchCache: SearchCacheState = {
  cachedProducts: null,
  filters: new Map(),
  shortFuse: null,
  longFuse: null,
  expiresAt: 0,
  warmPromise: null,
};

let cacheMutationQueue: Promise<void> = Promise.resolve();

export function removeVietnameseTones(value: string): string {
  if (!value) return '';

  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function decodeHtmlEntities(value: unknown): string {
  const text = String(value || '');
  if (!text || !htmlEntityPattern.test(text)) return text;

  htmlEntityPattern.lastIndex = 0;
  return text.replace(htmlEntityPattern, (entity) => {
    switch (entity.toLowerCase()) {
      case '&amp;':
        return '&';
      case '&lt;':
      case '&#60;':
      case '&#x3c;':
        return '<';
      case '&gt;':
      case '&#62;':
      case '&#x3e;':
        return '>';
      case '&quot;':
        return '"';
      case '&apos;':
      case '&#39;':
      case '&#x27;':
        return "'";
      default:
        return entity;
    }
  });
}

export function injectSynonyms(text: string): string {
  if (!text) return text;
  const appendedSynonyms: string[] = [];

  for (const group of SYNONYM_REGEXES) {
    let hasMatch = false;
    for (const item of group) {
      if (item.regex.test(text)) {
        hasMatch = true;
        break;
      }
    }

    if (!hasMatch) continue;
    for (const item of group) {
      if (!item.regex.test(text)) appendedSynonyms.push(item.word);
    }
  }

  return appendedSynonyms.length > 0 ? `${text} ${appendedSynonyms.join(' ')}` : text;
}

export function slugifySearchFilter(value: string): string {
  return removeVietnameseTones(value).replace(/\s+/g, '-');
}

function normalizeAttributeIcon(value: unknown) {
  const icon = decodeHtmlEntities(value).trim();
  if (!icon || unsafeFilterTextPattern.test(icon) || icon.length > 16) return null;
  return icon;
}

function isDisplayableSearchFilterValue(value: unknown) {
  const label = decodeHtmlEntities(value).trim();
  return label.length > 0 && !unsafeFilterTextPattern.test(label);
}

function addFilterValue(product: SearchProduct, key: string, slug: string) {
  const values = product.filterValues.get(key) || new Set<string>();
  values.add(slug);
  product.filterValues.set(key, values);
}

function createFuse(products: SearchProduct[], threshold: number) {
  return new Fuse(products, {
    keys: ['searchText'],
    threshold,
    distance: 200,
    ignoreLocation: true,
    includeScore: true,
    useExtendedSearch: true,
  });
}

function createSearchProduct(row: ProductRow, override?: SearchWebhookProduct): SearchProduct {
  const storeSKU = decodeHtmlEntities(override?.SKU ?? row.storeSKU ?? '');
  const proName = decodeHtmlEntities(override?.ten_san_pham ?? row.proName ?? '');
  const normalizedText = removeVietnameseTones(`${storeSKU} ${proName}`);
  const rawSearchText = decodeHtmlEntities(override?.data_search || row.data_search || normalizedText);
  const brandName = decodeHtmlEntities(row.brandName || 'Khác');
  const product: SearchProduct = {
    id: Number(row.id),
    storeSKU,
    proName,
    searchText: injectSynonyms(rawSearchText),
    normalizedName: injectSynonyms(removeVietnameseTones(proName)),
    price: Number(row.price || 0),
    marketPrice: Number(row.market_price || 0),
    thumbnail: row.proThum
      ? `https://hacom.vn/media/product/${row.proThum}`
      : 'https://via.placeholder.com/300',
    slug: row.slug ? row.slug.replace(/^\/+/, '') : `product-${row.id}`,
    brand: brandName,
    filterValues: new Map(),
  };

  if (row.brandId && row.brandName) {
    addFilterValue(product, 'brand', slugifySearchFilter(brandName));
  }
  return product;
}

function ensureBrandFilter(filters: Map<string, SearchFilterDefinition>) {
  if (!filters.has('brand')) {
    filters.set('brand', {
      id: 0,
      name: 'Thương hiệu',
      icon: null,
      filterCode: 'brand',
      attributeCode: 'brand',
      values: new Map(),
    });
  }
  return filters.get('brand')!;
}

function registerBrandFilter(row: ProductRow, filters: Map<string, SearchFilterDefinition>) {
  if (!row.brandId || !row.brandName) return;
  const brandName = decodeHtmlEntities(row.brandName);
  const slug = slugifySearchFilter(brandName);
  ensureBrandFilter(filters).values.set(slug, {
    id: Number(row.brandId),
    name: brandName,
    slug,
    ordering: 0,
  });
}

function registerAttribute(
  product: SearchProduct,
  row: AttributeRow,
  filters: Map<string, SearchFilterDefinition>,
) {
  const valueName = decodeHtmlEntities(row.value_name).trim();
  if (!isDisplayableSearchFilterValue(valueName)) return;

  const attributeName = decodeHtmlEntities(row.attribute_name).trim();
  const key = String(row.filter_code || slugifySearchFilter(attributeName));
  const valueSlug = slugifySearchFilter(valueName);
  if (!key || !valueSlug) return;

  addFilterValue(product, key, valueSlug);
  let filter = filters.get(key);
  if (!filter) {
    filter = {
      id: Number(row.attribute_id),
      name: attributeName,
      icon: normalizeAttributeIcon(row.attribute_icon),
      filterCode: key,
      attributeCode: row.attribute_code || '',
      values: new Map(),
    };
    filters.set(key, filter);
  }
  filter.values.set(valueSlug, {
    id: Number(row.value_id),
    name: valueName,
    slug: valueSlug,
    ordering: Number(row.value_ordering || 0),
  });
}

function rebuildFuseIndexes() {
  const products = searchCache.cachedProducts || [];
  searchCache.shortFuse = createFuse(products, 0.15);
  searchCache.longFuse = createFuse(products, 0.35);
}

async function refreshSearchCache() {
  const [productRowsResult, attributeRowsResult] = await Promise.all([
    pool.query<ProductRow[]>(`
      SELECT
        p.id,
        p.storeSKU,
        p.proName,
        s.data_search,
        pr.price,
        pr.market_price,
        p.proThum,
        u.request_path AS slug,
        p.brandId,
        b.name AS brandName
      FROM idv_sell_product_store p
      LEFT JOIN product_data_search s ON s.product_id = p.id
      LEFT JOIN idv_sell_product_price pr ON pr.id = p.id AND pr.isOn = 1
      LEFT JOIN idv_url u ON u.id_path = CONCAT('module:product/view:product-detail/view_id:', p.id)
      LEFT JOIN idv_brand b ON b.id = p.brandId
      WHERE p.id > 0
    `),
    pool.query<AttributeRow[]>(`
      SELECT
        pa.pro_id AS product_id,
        a.id AS attribute_id,
        a.name AS attribute_name,
        a.icon AS attribute_icon,
        a.filter_code,
        a.attribute_code,
        v.id AS value_id,
        v.value AS value_name,
        v.ordering AS value_ordering
      FROM idv_product_attribute pa
      JOIN idv_attribute a ON a.id = pa.attr_id
      JOIN idv_attribute_value v ON v.id = pa.attr_value_id AND v.attributeId = a.id
    `),
  ]);

  const productRows = productRowsResult[0];
  const attributeRows = attributeRowsResult[0];
  const products = productRows.map<SearchProduct>((row) => createSearchProduct(row));

  const productById = new Map(products.map((product) => [product.id, product]));
  const filters = new Map<string, SearchFilterDefinition>();
  ensureBrandFilter(filters);

  for (const row of productRows) {
    registerBrandFilter(row, filters);
  }

  for (const row of attributeRows) {
    const product = productById.get(Number(row.product_id));
    if (product) registerAttribute(product, row, filters);
  }

  searchCache.cachedProducts = products;
  searchCache.filters = filters;
  rebuildFuseIndexes();
  searchCache.expiresAt = Date.now() + CACHE_TTL_MS;
  console.log(`[SearchCache] Loaded ${products.length} products for 60 seconds`);
}

export async function ensureSearchCacheFresh(): Promise<void> {
  await cacheMutationQueue;
  if (searchCache.cachedProducts && Date.now() < searchCache.expiresAt) return;
  if (searchCache.warmPromise) return searchCache.warmPromise;

  searchCache.warmPromise = refreshSearchCache()
    .catch((error) => {
      if (!searchCache.cachedProducts) throw error;
      searchCache.expiresAt = Date.now() + CACHE_TTL_MS;
      console.error('[SearchCache] Refresh failed; serving stale data:', error);
    })
    .finally(() => {
      searchCache.warmPromise = null;
    });

  return searchCache.warmPromise;
}

async function loadProductForCache(id: number) {
  const [productResult, attributeResult] = await Promise.all([
    pool.query<ProductRow[]>(`
      SELECT
        p.id,
        p.storeSKU,
        p.proName,
        s.data_search,
        pr.price,
        pr.market_price,
        p.proThum,
        u.request_path AS slug,
        p.brandId,
        b.name AS brandName
      FROM idv_sell_product_store p
      LEFT JOIN product_data_search s ON s.product_id = p.id
      LEFT JOIN idv_sell_product_price pr ON pr.id = p.id AND pr.isOn = 1
      LEFT JOIN idv_url u ON u.id_path = CONCAT('module:product/view:product-detail/view_id:', p.id)
      LEFT JOIN idv_brand b ON b.id = p.brandId
      WHERE p.id = ?
      LIMIT 1
    `, [id]),
    pool.query<AttributeRow[]>(`
      SELECT
        pa.pro_id AS product_id,
        a.id AS attribute_id,
        a.name AS attribute_name,
        a.icon AS attribute_icon,
        a.filter_code,
        a.attribute_code,
        v.id AS value_id,
        v.value AS value_name,
        v.ordering AS value_ordering
      FROM idv_product_attribute pa
      JOIN idv_attribute a ON a.id = pa.attr_id
      JOIN idv_attribute_value v ON v.id = pa.attr_value_id AND v.attributeId = a.id
      WHERE pa.pro_id = ?
    `, [id]),
  ]);

  return { row: productResult[0][0], attributes: attributeResult[0] };
}

export function mutateSearchCache(
  id: number,
  action: 'ADD' | 'UPDATE' | 'DELETE',
  webhookProduct?: SearchWebhookProduct,
) {
  const operation = cacheMutationQueue.then(async () => {
    if (searchCache.warmPromise) await searchCache.warmPromise;
    if (!searchCache.cachedProducts) return { skipped: true };

    if (action === 'DELETE') {
      searchCache.cachedProducts = searchCache.cachedProducts.filter((product) => product.id !== id);
      rebuildFuseIndexes();
      searchCache.expiresAt = Date.now() + CACHE_TTL_MS;
      return { skipped: false };
    }

    const existing = searchCache.cachedProducts.find((product) => product.id === id);
    const { row, attributes } = await loadProductForCache(id);
    let nextProduct: SearchProduct;

    if (row) {
      nextProduct = createSearchProduct(row, webhookProduct);
      registerBrandFilter(row, searchCache.filters);
      for (const attribute of attributes) {
        registerAttribute(nextProduct, attribute, searchCache.filters);
      }
    } else if (existing) {
      const storeSKU = decodeHtmlEntities(webhookProduct?.SKU ?? existing.storeSKU);
      const proName = decodeHtmlEntities(webhookProduct?.ten_san_pham ?? existing.proName);
      const rawSearchText = decodeHtmlEntities(webhookProduct?.data_search || removeVietnameseTones(`${storeSKU} ${proName}`));
      nextProduct = {
        ...existing,
        storeSKU,
        proName,
        searchText: injectSynonyms(rawSearchText),
        normalizedName: injectSynonyms(removeVietnameseTones(proName)),
      };
    } else {
      const storeSKU = decodeHtmlEntities(webhookProduct?.SKU || '');
      const proName = decodeHtmlEntities(webhookProduct?.ten_san_pham || '');
      const rawSearchText = decodeHtmlEntities(webhookProduct?.data_search || removeVietnameseTones(`${storeSKU} ${proName}`));
      nextProduct = {
        id,
        storeSKU,
        proName,
        searchText: injectSynonyms(rawSearchText),
        normalizedName: injectSynonyms(removeVietnameseTones(proName)),
        price: 0,
        marketPrice: 0,
        thumbnail: 'https://via.placeholder.com/300',
        slug: `product-${id}`,
        brand: 'Khác',
        filterValues: new Map(),
      };
    }

    const existingIndex = searchCache.cachedProducts.findIndex((product) => product.id === id);
    if (existingIndex >= 0) searchCache.cachedProducts[existingIndex] = nextProduct;
    else searchCache.cachedProducts.push(nextProduct);

    rebuildFuseIndexes();
    searchCache.expiresAt = Date.now() + CACHE_TTL_MS;
    return { skipped: false };
  });

  cacheMutationQueue = operation.then(() => undefined, () => undefined);
  return operation;
}

export function getSearchFuse(queryLength: number): Fuse<SearchProduct> {
  const fuse = queryLength <= 4 ? searchCache.shortFuse : searchCache.longFuse;
  if (!fuse) throw new Error('Search cache is not ready');
  return fuse;
}

function shouldPrewarmSearchCache() {
  return (
    typeof window === 'undefined' &&
    process.env.NEXT_PHASE !== 'phase-production-build' &&
    process.env.npm_lifecycle_event !== 'build'
  );
}

if (shouldPrewarmSearchCache()) {
  ensureSearchCacheFresh().catch((error) => {
    console.error('[SearchCache] Initial warm failed:', error);
  });
}
