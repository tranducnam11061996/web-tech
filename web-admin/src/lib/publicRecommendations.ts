import Fuse from 'fuse.js';
import type { RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { getProductCardBadgesForProductIds, type ProductCardBadge } from '@/lib/productCardAttributes';
import type { CategoryTrailItem } from '@/lib/publicBreadcrumbs';
import { resolveProductImageUrl } from '@/lib/productImageUrl';

export type PublicProductCard = {
  id: number;
  slug: string;
  name: string;
  sku: string;
  thumbnail: string;
  price: number;
  marketPrice: number;
  savings: number;
  brand: string;
  cardBadges: ProductCardBadge[];
};

export type RelatedPost = {
  id: number;
  title: string;
  slug: string;
  thumbnail: string;
  summary: string;
  publishedAt: string | Date | null;
};

type ProductCardRow = RowDataPacket & {
  id: number;
  storeSKU: string | null;
  proName: string;
  proThum: string | null;
  price: number | null;
  market_price: number | null;
  slug: string;
  brandName: string | null;
};

type NewsRow = RowDataPacket & {
  id: number;
  title: string;
  url: string;
  thumnail: string | null;
  summary: string | null;
  createDate: string | Date | null;
  visit: number | null;
};

type RankedNewsRow = NewsRow & {
  normalizedTitle: string;
  tokens: Set<string>;
};

type NewsCorpus = {
  rows: RankedNewsRow[];
  fuse: Fuse<RankedNewsRow>;
  documentFrequency: Map<string, number>;
};

export type ProductIdsParseResult =
  | { ok: true; ids: number[] }
  | { ok: false; message: string };

const MAX_RELATED_PRODUCTS = 15;
const MAX_RELATED_POSTS = 5;
const NEWS_CACHE_TTL_MS = 5 * 60_000;
const htmlEntityPattern = /&(?:amp|lt|gt|quot|apos|#39|#x27|#60|#x3c|#62|#x3e);/gi;
let newsCorpusCache: { value: NewsCorpus; expiresAt: number } | null = null;
let newsCorpusFlight: Promise<NewsCorpus> | null = null;

function decodeHtmlEntities(value: unknown) {
  return String(value || '').replace(htmlEntityPattern, (entity) => {
    switch (entity.toLowerCase()) {
      case '&amp;': return '&';
      case '&lt;':
      case '&#60;':
      case '&#x3c;': return '<';
      case '&gt;':
      case '&#62;':
      case '&#x3e;': return '>';
      case '&quot;': return '"';
      case '&apos;':
      case '&#39;':
      case '&#x27;': return "'";
      default: return entity;
    }
  });
}

export function normalizeRecommendationText(value: unknown) {
  return decodeHtmlEntities(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function extractProductKeyword(productName: unknown) {
  const decodedName = decodeHtmlEntities(productName).trim().replace(/\s+/g, ' ');
  if (!decodedName) return '';
  const prefix = decodedName.split('(', 1)[0].trim();
  return prefix || decodedName;
}

function tokenize(value: string) {
  return Array.from(new Set(normalizeRecommendationText(value).split(' ').filter((token) => token.length >= 2)));
}

export function parseProductIdsParam(rawValue: string | null): ProductIdsParseResult {
  if (!rawValue) return { ok: false, message: 'Missing ids parameter' };
  const parts = rawValue.split(',').map((part) => part.trim());
  if (parts.length === 0 || parts.length > MAX_RELATED_PRODUCTS || parts.some((part) => !/^\d+$/.test(part))) {
    return { ok: false, message: 'ids must contain 1 to 15 positive integers' };
  }

  const ids = parts.map(Number);
  if (ids.some((id) => !Number.isSafeInteger(id) || id <= 0) || new Set(ids).size !== ids.length) {
    return { ok: false, message: 'ids must contain unique positive integers' };
  }
  return { ok: true, ids };
}

export function mergeRelatedProductGroups(
  sameCategory: PublicProductCard[],
  parentCategory: PublicProductCard[],
  currentProductId: number,
) {
  const seen = new Set<number>([currentProductId]);
  const merged: PublicProductCard[] = [];
  for (const product of [...sameCategory, ...parentCategory]) {
    if (seen.has(product.id)) continue;
    seen.add(product.id);
    merged.push(product);
    if (merged.length === MAX_RELATED_PRODUCTS) break;
  }
  return merged;
}

export function shouldSupplementFromParent(sameCategoryCount: number) {
  return sameCategoryCount < 5;
}

export function mergeRankedAndNewestIds(rankedIds: number[], newestIds: number[], limit = MAX_RELATED_POSTS) {
  const selected: number[] = [];
  const seen = new Set<number>();
  for (const id of [...rankedIds, ...newestIds]) {
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    selected.push(id);
    if (selected.length === limit) break;
  }
  return selected;
}

function toPublicProductCard(row: ProductCardRow, cardBadges: ProductCardBadge[]): PublicProductCard {
  const price = Number(row.price || 0);
  const marketPrice = Number(row.market_price || 0);
  return {
    id: Number(row.id),
    slug: String(row.slug || '').replace(/^\/+|\/+$/g, ''),
    name: decodeHtmlEntities(row.proName).trim(),
    sku: String(row.storeSKU || ''),
    thumbnail: resolveProductImageUrl(row.proThum, 'https://via.placeholder.com/300'),
    price,
    marketPrice,
    savings: Math.max(0, marketPrice - price),
    brand: String(row.brandName || 'Khác'),
    cardBadges,
  };
}

async function addProductCardBadges(rows: ProductCardRow[]) {
  const badgesByProduct = await getProductCardBadgesForProductIds(rows.map((row) => Number(row.id)));
  return rows.map((row) => toPublicProductCard(row, badgesByProduct.get(Number(row.id)) || []));
}

async function listProductsInCategory(categoryId: number, currentProductId: number, limit: number) {
  if (!Number.isInteger(categoryId) || categoryId <= 0 || limit <= 0) return [];
  const [rows] = await pool.query<ProductCardRow[]>(
    `SELECT DISTINCT p.id, p.storeSKU, p.proName, p.proThum,
       pr.price, pr.market_price, u.request_path AS slug, b.name AS brandName, pc.ordering
     FROM idv_product_category pc
     JOIN idv_sell_product_store p ON p.id = pc.pro_id
     JOIN idv_sell_product_price pr ON pr.id = p.id AND pr.isOn = 1
     JOIN idv_url u ON u.id_path = CONCAT('module:product/view:product-detail/view_id:', p.id)
       AND u.request_path <> ''
     LEFT JOIN idv_brand b ON b.id = p.brandId
     WHERE pc.category_id = ? AND pc.status = 1 AND p.id <> ?
     ORDER BY pc.ordering DESC, p.id DESC
     LIMIT ?`,
    [categoryId, currentProductId, limit],
  );
  return addProductCardBadges(rows);
}

export async function getSimilarProducts(
  currentProductId: number,
  categoryTrail: CategoryTrailItem[],
): Promise<PublicProductCard[]> {
  const leafCategory = categoryTrail.at(-1);
  if (!leafCategory) return [];

  const sameCategory = await listProductsInCategory(leafCategory.id, currentProductId, MAX_RELATED_PRODUCTS);
  if (!shouldSupplementFromParent(sameCategory.length)) {
    return mergeRelatedProductGroups(sameCategory, [], currentProductId);
  }

  const parentCategory = categoryTrail.at(-2);
  if (!parentCategory) return mergeRelatedProductGroups(sameCategory, [], currentProductId);
  const parentProducts = await listProductsInCategory(parentCategory.id, currentProductId, MAX_RELATED_PRODUCTS);
  return mergeRelatedProductGroups(sameCategory, parentProducts, currentProductId);
}

export async function getProductsByIds(ids: number[]): Promise<PublicProductCard[]> {
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const [rows] = await pool.query<ProductCardRow[]>(
    `SELECT DISTINCT p.id, p.storeSKU, p.proName, p.proThum,
       pr.price, pr.market_price, u.request_path AS slug, b.name AS brandName
     FROM idv_sell_product_store p
     JOIN idv_sell_product_price pr ON pr.id = p.id AND pr.isOn = 1
     JOIN idv_url u ON u.id_path = CONCAT('module:product/view:product-detail/view_id:', p.id)
       AND u.request_path <> ''
     LEFT JOIN idv_brand b ON b.id = p.brandId
     WHERE p.id IN (${placeholders})
     ORDER BY FIELD(p.id, ${placeholders})`,
    [...ids, ...ids],
  );
  return addProductCardBadges(rows);
}

async function loadNewsCorpus(): Promise<NewsCorpus> {
  const [rows] = await pool.query<NewsRow[]>(
    `SELECT id, title, url, thumnail, summary, createDate, visit
     FROM idv_seller_news
     WHERE status = 1 AND type = 'article' AND url <> ''`,
  );
  const rankedRows: RankedNewsRow[] = rows.map((row) => {
    const normalizedTitle = normalizeRecommendationText(row.title);
    return { ...row, normalizedTitle, tokens: new Set(tokenize(normalizedTitle)) };
  }).filter((row) => row.normalizedTitle);
  const documentFrequency = new Map<string, number>();
  for (const row of rankedRows) {
    for (const token of row.tokens) documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1);
  }
  return {
    rows: rankedRows,
    documentFrequency,
    fuse: new Fuse(rankedRows, {
      keys: ['normalizedTitle'],
      includeScore: true,
      ignoreLocation: true,
      threshold: 0.6,
    }),
  };
}

async function getNewsCorpus() {
  if (newsCorpusCache && newsCorpusCache.expiresAt > Date.now()) return newsCorpusCache.value;
  if (newsCorpusFlight) return newsCorpusFlight;
  newsCorpusFlight = loadNewsCorpus()
    .then((value) => {
      newsCorpusCache = { value, expiresAt: Date.now() + NEWS_CACHE_TTL_MS };
      return value;
    })
    .finally(() => {
      newsCorpusFlight = null;
    });
  return newsCorpusFlight;
}

export function scoreRelatedTitle(
  normalizedKeyword: string,
  keywordTokens: string[],
  normalizedTitle: string,
  titleTokens: ReadonlySet<string>,
  documentFrequency: ReadonlyMap<string, number>,
  documentCount: number,
  fuseScore: number | undefined,
) {
  let matchedCount = 0;
  let matchedWeight = 0;
  let totalWeight = 0;
  for (const token of keywordTokens) {
    const weight = Math.log((documentCount + 1) / ((documentFrequency.get(token) || 0) + 1)) + 1;
    totalWeight += weight;
    if (titleTokens.has(token)) {
      matchedCount += 1;
      matchedWeight += weight;
    }
  }
  const coverage = totalWeight > 0 ? matchedWeight / totalWeight : 0;
  const similarity = typeof fuseScore === 'number' ? Math.max(0, 1 - fuseScore) : 0;
  const phraseMatch = normalizedKeyword.length > 0
    && (normalizedTitle.includes(normalizedKeyword) || normalizedKeyword.includes(normalizedTitle));
  return {
    matchedCount,
    score: coverage * 0.6 + similarity * 0.25 + (phraseMatch ? 0.15 : 0),
  };
}

function toRelatedPost(row: NewsRow): RelatedPost {
  return {
    id: Number(row.id),
    title: decodeHtmlEntities(row.title).trim(),
    slug: String(row.url || '').replace(/^\/+|\/+$/g, ''),
    thumbnail: row.thumnail ? `https://hacom.vn/media/news/${row.thumnail}` : '',
    summary: decodeHtmlEntities(row.summary).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
    publishedAt: row.createDate,
  };
}

export async function getRelatedPosts(productName: string): Promise<RelatedPost[]> {
  const corpus = await getNewsCorpus();
  const normalizedKeyword = normalizeRecommendationText(extractProductKeyword(productName));
  const keywordTokens = tokenize(normalizedKeyword);
  const fuseScores = new Map<number, number>();
  if (normalizedKeyword) {
    for (const result of corpus.fuse.search(normalizedKeyword)) {
      fuseScores.set(Number(result.item.id), result.score ?? 1);
    }
  }

  const ranked = corpus.rows.flatMap((row) => {
    const result = scoreRelatedTitle(
      normalizedKeyword,
      keywordTokens,
      row.normalizedTitle,
      row.tokens,
      corpus.documentFrequency,
      corpus.rows.length,
      fuseScores.get(Number(row.id)),
    );
    return result.matchedCount > 0 || result.score >= 0.45 ? [{ row, ...result }] : [];
  }).sort((left, right) =>
    right.score - left.score
    || right.matchedCount - left.matchedCount
    || Number(right.row.visit || 0) - Number(left.row.visit || 0)
    || Number(right.row.id) - Number(left.row.id),
  );

  const newest = [...corpus.rows].sort((left, right) => {
    const dateDifference = new Date(right.createDate || 0).getTime() - new Date(left.createDate || 0).getTime();
    return dateDifference || Number(right.id) - Number(left.id);
  });
  const selectedIds = mergeRankedAndNewestIds(
    ranked.map((item) => Number(item.row.id)),
    newest.map((row) => Number(row.id)),
  );
  const rowsById = new Map(corpus.rows.map((row) => [Number(row.id), row]));
  return selectedIds.flatMap((id) => {
    const row = rowsById.get(id);
    return row ? [toRelatedPost(row)] : [];
  });
}
