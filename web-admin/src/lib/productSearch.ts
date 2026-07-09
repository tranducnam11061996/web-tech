import type { Expression } from 'fuse.js';
import {
  getSearchFuse,
  removeVietnameseTones,
  searchCache,
  type SearchProduct,
} from './searchCache';

export interface RankedSearchProduct {
  product: SearchProduct;
  score: number;
  customRank: number;
}

export interface SearchFacet {
  id: number;
  name: string;
  icon: string | null;
  filter_code: string;
  attribute_code: string;
  values: Array<{ id: number; name: string; productCount: number }>;
}

export interface SearchPriceBounds {
  min: number;
  max: number;
}

const RESERVED_PARAMS = new Set(['q', 'page', 'limit', 'sort', 'min-price', 'max-price']);
const unsafeFilterValuePattern = /^(?:javascript\s*:|https?:\/\/|data\s*:|\/\/)/i;

export const SEARCH_EXCLUSIONS: Record<string, string[]> = {
  pc: [
    'tay cam',
    'lot chuot',
    'ban di',
    'vo case',
    'balo',
    'tui',
    'phu kien',
    'linh kien',
    'nguon',
    'vo lang',
    'laptop',
    'hop o cung',
    'o cung gan ngoai',
    'tai nghe',
  ],
  laptop: [
    'balo',
    'tui',
    'quat',
    'ban phim',
    'vo laptop',
    'ban di',
    'phu kien',
    'pin',
    'nguon',
    'vo lang',
    'tai nghe',
  ],
  gaming: ['tay cam', 'lot chuot', 'ban di', 'vo lang'],
};

function standalonePattern(value: string) {
  return new RegExp(`(^|\\s)${value}($|\\s)`);
}

function startsWithPattern(value: string) {
  return new RegExp(`^${value}($|\\s)`);
}

export function getActiveExclusions(normalizedQuery: string) {
  const activeExclusions: string[] = [];

  for (const [key, badWords] of Object.entries(SEARCH_EXCLUSIONS)) {
    if (!standalonePattern(key).test(normalizedQuery)) continue;
    const filteredBadWords = badWords.filter((badWord) => !normalizedQuery.includes(badWord));
    if (filteredBadWords.length > 0) activeExclusions.push(...filteredBadWords);
  }

  return activeExclusions;
}

export function rankSearchProducts(query: string): RankedSearchProduct[] {
  const products = searchCache.cachedProducts || [];
  const normalizedQuery = removeVietnameseTones(query);
  if (!normalizedQuery) {
    return products.map((product) => ({ product, score: 0, customRank: 1 }));
  }

  const tokens = normalizedQuery.split(' ').filter(Boolean);
  const fuseQuery: Expression =
    tokens.length > 1
      ? {
          $and: tokens.map((token) => ({
            searchText: `${token.length <= 4 ? "'" : ''}${token}`,
          })),
        }
      : `${normalizedQuery.length <= 4 ? "'" : ''}${normalizedQuery}`;

  const rawResults = getSearchFuse(normalizedQuery.length).search(fuseQuery);
  const specTokens = tokens.filter((token) => /\d/.test(token));
  const activeExclusions = getActiveExclusions(normalizedQuery);
  const ranked: RankedSearchProduct[] = [];

  for (const result of rawResults) {
    const score = result.score ?? 1;
    if (score >= 0.4) continue;

    const product = result.item;
    const hasSuffixOnlyMatch = tokens.some((token) => {
      const name = product.normalizedName;
      return name.includes(token) && !new RegExp(`(^|\\s)${token}`).test(name);
    });
    if (hasSuffixOnlyMatch) continue;

    const hasInvalidSpec = specTokens.some(
      (token) => !new RegExp(`(^|\\s)${token}`, 'i').test(product.searchText),
    );
    if (hasInvalidSpec) continue;

    if (activeExclusions.some((badWord) => product.normalizedName.includes(badWord))) {
      continue;
    }

    const name = product.normalizedName;
    let customRank = 5;
    if (startsWithPattern(normalizedQuery).test(name)) {
      customRank = 1;
    } else if (standalonePattern(normalizedQuery).test(name)) {
      customRank = 2;
    } else if (tokens.length > 1 && tokens.every((token) => standalonePattern(token).test(name))) {
      customRank = 3;
    } else if (tokens.some((token) => standalonePattern(token).test(name))) {
      customRank = 4;
    }

    ranked.push({ product, score, customRank });
  }

  return ranked.sort((left, right) => {
    if (left.customRank !== right.customRank) return left.customRank - right.customRank;
    return left.score - right.score;
  });
}

export function parseSearchFilters(searchParams: URLSearchParams) {
  const activeFilters = new Map<string, Set<string>>();

  for (const [key, rawValue] of searchParams.entries()) {
    if (RESERVED_PARAMS.has(key)) continue;
    const definition = searchCache.filters.get(key);
    if (!definition) continue;

    const values = rawValue
      .split(',')
      .map((value) => value.trim())
      .filter((value) => definition.values.has(value));
    if (values.length > 0) activeFilters.set(key, new Set(values));
  }

  return activeFilters;
}

export function applySearchFilters(
  rankedProducts: RankedSearchProduct[],
  activeFilters: Map<string, Set<string>>,
) {
  if (activeFilters.size === 0) return rankedProducts;

  return rankedProducts.filter(({ product }) => {
    for (const [key, requestedValues] of activeFilters) {
      const productValues = product.filterValues.get(key);
      if (!productValues) return false;

      let matches = false;
      for (const value of requestedValues) {
        if (productValues.has(value)) {
          matches = true;
          break;
        }
      }
      if (!matches) return false;
    }
    return true;
  });
}

export function getSearchPriceBounds(rankedProducts: RankedSearchProduct[]): SearchPriceBounds {
  let min = Number.POSITIVE_INFINITY;
  let max = 0;

  for (const { product } of rankedProducts) {
    if (product.price <= 0) continue;
    if (product.price < min) min = product.price;
    if (product.price > max) max = product.price;
  }

  if (!Number.isFinite(min) || max <= 0) {
    return { min: 0, max: 0 };
  }

  return { min, max };
}

export function applySearchPriceFilter(
  rankedProducts: RankedSearchProduct[],
  minPrice: number | null,
  maxPrice: number | null,
) {
  if (minPrice === null && maxPrice === null) return rankedProducts;

  return rankedProducts.filter(({ product }) => {
    if (product.price <= 0) return false;
    if (minPrice !== null && product.price < minPrice) return false;
    if (maxPrice !== null && product.price > maxPrice) return false;
    return true;
  });
}

export function sortSearchProducts(rankedProducts: RankedSearchProduct[], sort: string | null) {
  if (!['price_asc', 'price_desc', 'newest'].includes(sort || '')) return rankedProducts;

  return rankedProducts
    .map((item, relevanceIndex) => ({ item, relevanceIndex }))
    .sort((left, right) => {
      const a = left.item.product;
      const b = right.item.product;
      let comparison = 0;

      if (sort === 'newest') {
        comparison = b.id - a.id;
      } else {
        const aHasPrice = a.price > 0;
        const bHasPrice = b.price > 0;
        if (aHasPrice !== bHasPrice) comparison = aHasPrice ? -1 : 1;
        else if (sort === 'price_asc') comparison = a.price - b.price;
        else comparison = b.price - a.price;
      }

      return comparison || left.relevanceIndex - right.relevanceIndex;
    })
    .map(({ item }) => item);
}

export function buildSearchFacets(rankedProducts: RankedSearchProduct[]): SearchFacet[] {
  const counts = new Map<string, Map<string, number>>();

  for (const { product } of rankedProducts) {
    for (const [key, values] of product.filterValues) {
      const valueCounts = counts.get(key) || new Map<string, number>();
      for (const value of values) {
        valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
      }
      counts.set(key, valueCounts);
    }
  }

  const facets: SearchFacet[] = [];
  for (const [key, definition] of searchCache.filters) {
    const valueCounts = counts.get(key);
    if (!valueCounts) continue;

    const values = Array.from(definition.values.values())
      .filter((value) => {
        const label = value.name.trim();
        return label.length > 0 && !unsafeFilterValuePattern.test(label) && (valueCounts.get(value.slug) || 0) > 0;
      })
      .sort((left, right) => left.ordering - right.ordering || left.name.localeCompare(right.name, 'vi'))
      .map((value) => ({
        id: value.id,
        name: value.name,
        productCount: valueCounts.get(value.slug) || 0,
      }));

    if (values.length === 0) continue;
    facets.push({
      id: definition.id,
      name: definition.name,
      icon: definition.icon,
      filter_code: definition.filterCode,
      attribute_code: definition.attributeCode,
      values,
    });
  }

  return facets;
}

export function formatSearchProduct(product: SearchProduct) {
  return {
    id: product.id,
    name: product.proName,
    sku: product.storeSKU,
    price: product.price,
    marketPrice: product.marketPrice,
    savings: Math.max(0, product.marketPrice - product.price),
    thumbnail: product.thumbnail,
    slug: product.slug,
    brand: product.brand,
    cardBadges: product.cardBadges,
  };
}
