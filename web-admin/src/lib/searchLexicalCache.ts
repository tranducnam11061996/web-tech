import Fuse from 'fuse.js';
import type { RowDataPacket } from 'mysql2/promise';
import pool from './db';
import { clearPublicProductResponseCache } from './publicProductCache';
import {
  buildFuseQuery,
  containsStandalonePhrase,
  getSearchIntent,
  injectSearchSynonyms,
  normalizeSearchText,
  PRINTER_INTENT_PHRASE,
  rankLexicalResults,
  type LexicalSearchProduct,
} from './searchRules';

const configuredTtl = Number(process.env.SEARCH_LEXICAL_CACHE_TTL_MS || 300_000);
const CACHE_TTL_MS = Number.isFinite(configuredTtl) && configuredTtl >= 30_000 ? configuredTtl : 300_000;

interface LexicalRow extends RowDataPacket {
  id: number;
  storeSKU: string | null;
  proName: string | null;
  data_search: string | null;
}

interface ProductCategoryRow extends RowDataPacket {
  product_id: number;
  category_id: number;
}

interface CategoryRow extends RowDataPacket {
  id: number;
  parentId: number;
  name: string | null;
}

type LexicalCacheState = {
  products: LexicalSearchProduct[] | null;
  shortFuse: Fuse<LexicalSearchProduct> | null;
  longFuse: Fuse<LexicalSearchProduct> | null;
  printerCategoryIds: Set<number>;
  expiresAt: number;
  loadPromise: Promise<void> | null;
};

const lexicalCache: LexicalCacheState = {
  products: null,
  shortFuse: null,
  longFuse: null,
  printerCategoryIds: new Set(),
  expiresAt: 0,
  loadPromise: null,
};

function createFuse(products: LexicalSearchProduct[], threshold: number) {
  return new Fuse(products, {
    keys: ['searchText'],
    threshold,
    distance: 200,
    ignoreLocation: true,
    includeScore: true,
    useExtendedSearch: true,
  });
}

function resolvePrinterCategoryIds(categories: CategoryRow[]) {
  const childrenByParent = new Map<number, number[]>();
  for (const category of categories) {
    const parentId = Number(category.parentId || 0);
    const children = childrenByParent.get(parentId) || [];
    children.push(Number(category.id));
    childrenByParent.set(parentId, children);
  }

  const allowed = new Set<number>();
  const roots = categories
    .filter((category) => normalizeSearchText(String(category.name || '')) === PRINTER_INTENT_PHRASE)
    .map((category) => Number(category.id));
  const queue = [...roots];
  while (queue.length > 0) {
    const categoryId = queue.shift()!;
    if (allowed.has(categoryId)) continue;
    allowed.add(categoryId);
    queue.push(...(childrenByParent.get(categoryId) || []));
  }

  for (const category of categories) {
    const name = normalizeSearchText(String(category.name || ''));
    if (name === 'may in hoa don' || name === 'may in ma vach tem nhan') allowed.add(Number(category.id));
  }

  return allowed;
}

async function loadLexicalCache() {
  const startedAt = Date.now();
  const [productResult, productCategoryResult, categoryResult] = await Promise.all([
    pool.query<LexicalRow[]>(`
      SELECT p.id, p.storeSKU, p.proName, s.data_search
      FROM idv_sell_product_store p
      JOIN idv_sell_product_price pr ON pr.id = p.id AND pr.isOn = 1
      LEFT JOIN product_data_search s ON s.product_id = p.id
      WHERE p.id > 0
    `),
    pool.query<ProductCategoryRow[]>(`
      SELECT pc.pro_id AS product_id, pc.category_id
      FROM idv_product_category pc
      JOIN idv_sell_product_price pr ON pr.id = pc.pro_id AND pr.isOn = 1
    `),
    pool.query<CategoryRow[]>('SELECT id, parentId, name FROM idv_seller_category'),
  ]);
  const rows = productResult[0];
  const categoryIdsByProduct = new Map<number, Set<number>>();
  for (const row of productCategoryResult[0]) {
    const productId = Number(row.product_id);
    const categoryIds = categoryIdsByProduct.get(productId) || new Set<number>();
    categoryIds.add(Number(row.category_id));
    categoryIdsByProduct.set(productId, categoryIds);
  }
  const printerCategoryIds = resolvePrinterCategoryIds(categoryResult[0]);

  const products = rows.map<LexicalSearchProduct>((row) => {
    const storeSKU = String(row.storeSKU || '');
    const normalizedName = normalizeSearchText(String(row.proName || ''));
    const baseText = normalizeSearchText(String(row.data_search || `${storeSKU} ${row.proName || ''}`));
    return {
      id: Number(row.id),
      storeSKU,
      normalizedName,
      searchText: injectSearchSynonyms(baseText),
      categoryIds: categoryIdsByProduct.get(Number(row.id)) || new Set<number>(),
    };
  });

  lexicalCache.products = products;
  lexicalCache.shortFuse = createFuse(products, 0.15);
  lexicalCache.longFuse = createFuse(products, 0.35);
  lexicalCache.printerCategoryIds = printerCategoryIds;
  lexicalCache.expiresAt = Date.now() + CACHE_TTL_MS;
  console.log(`[SearchLexicalCache] Loaded ${products.length} active products and ${printerCategoryIds.size} printer categories in ${Date.now() - startedAt}ms`);
}

async function ensureLexicalCache() {
  if (lexicalCache.products && lexicalCache.expiresAt > Date.now()) return;
  if (!lexicalCache.loadPromise) {
    lexicalCache.loadPromise = loadLexicalCache().finally(() => {
      lexicalCache.loadPromise = null;
    });
  }
  await lexicalCache.loadPromise;
}

export async function rankLexicalSearch(query: string) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];
  await ensureLexicalCache();
  const fuse = normalizedQuery.length <= 4 ? lexicalCache.shortFuse : lexicalCache.longFuse;
  if (!fuse) throw new Error('Search lexical cache is not ready');
  const ranked = rankLexicalResults(fuse.search(buildFuseQuery(normalizedQuery)), normalizedQuery);
  if (getSearchIntent(normalizedQuery) !== 'printer') return ranked;
  return ranked.filter(({ product }) =>
    containsStandalonePhrase(product.normalizedName, PRINTER_INTENT_PHRASE)
    && Array.from(product.categoryIds).some((categoryId) => lexicalCache.printerCategoryIds.has(categoryId)),
  );
}

export function invalidateSearchLexicalCache() {
  lexicalCache.products = null;
  lexicalCache.shortFuse = null;
  lexicalCache.longFuse = null;
  lexicalCache.printerCategoryIds = new Set();
  lexicalCache.expiresAt = 0;
  clearPublicProductResponseCache();
}

export function getSearchLexicalCacheStats() {
  return {
    productCount: lexicalCache.products?.length || 0,
    printerCategoryCount: lexicalCache.printerCategoryIds.size,
    expiresAt: lexicalCache.expiresAt,
    loading: Boolean(lexicalCache.loadPromise),
  };
}
