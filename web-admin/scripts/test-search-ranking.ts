import assert from 'node:assert/strict';
import pool from '../src/lib/db';
import { loadPublicSearchPayload } from '../src/lib/publicSearch';
import {
  getSearchIntent,
  matchesStrictIntentProductName,
  matchesStrictPcProductName,
  SEARCH_EXCLUSIONS,
  normalizeSearchText,
  type SearchIntent,
} from '../src/lib/searchRules';

type SearchPayload = Awaited<ReturnType<typeof loadPublicSearchPayload>> & {
  data?: Array<{ id: number; name: string | null; brand?: string | null }>;
  pagination?: { page: number; limit: number; total: number; totalPages: number };
  attributes?: Array<{ filter_code: string; values: Array<{ name: string; productCount: number }> }>;
  priceBounds?: { min: number; max: number };
};

async function loadSearch(query: string, page = 1, sort?: 'price_desc' | 'newest') {
  const params = new URLSearchParams({ q: query, page: String(page), limit: '96' });
  if (sort) params.set('sort', sort);
  const payload = await loadPublicSearchPayload(params) as SearchPayload;
  assert.equal(payload.success, true, `Search failed for "${query}"`);
  assert.ok(payload.pagination && payload.pagination.total > 0, `Expected results for "${query}"`);
  return payload;
}

async function search(query: string, sort?: 'price_desc' | 'newest') {
  return (await loadSearch(query, 1, sort)).data || [];
}

async function searchAll(query: string, sort?: 'price_desc' | 'newest') {
  const first = await loadSearch(query, 1, sort);
  const products = [...(first.data || [])];
  const totalPages = first.pagination?.totalPages || 1;
  for (let page = 2; page <= totalPages; page += 1) {
    products.push(...((await loadSearch(query, page, sort)).data || []));
  }
  assert.equal(products.length, first.pagination?.total, `All pages must cover every result for "${query}"`);
  return { first, products };
}

function assertPrinterResults(query: string, names: Array<{ name: string | null }>) {
  const disallowedPhrases = ['laptop', 'day nguon', 'khay lap', 'cap', 'bao hanh', 'muc may in', 'phu kien'];
  for (const product of names) {
    const normalizedName = normalizeSearchText(product.name || '');
    assert.ok(/(^|\s)may in(\s|$)/.test(normalizedName), `Expected printer result for "${query}": ${product.name}`);
    for (const phrase of disallowedPhrases) {
      assert.equal(new RegExp(`(^|\\s)${phrase}(\\s|$)`).test(normalizedName), false, `Unexpected "${phrase}" result for "${query}": ${product.name}`);
    }
  }
}

function assertNoExcludedNames(query: string, names: Array<{ name: string | null }>) {
  const normalizedQuery = normalizeSearchText(query);
  const exclusions = Object.entries(SEARCH_EXCLUSIONS)
    .filter(([trigger]) => new RegExp(`(^|\\s)${trigger}($|\\s)`).test(normalizedQuery))
    .flatMap(([, words]) => words)
    .filter((word) => !new RegExp(`(^|\\s)${word}($|\\s)`).test(normalizedQuery));

  for (const product of names) {
    const normalizedName = normalizeSearchText(product.name || '');
    for (const excluded of exclusions) {
      assert.equal(
        new RegExp(`(^|\\s)${excluded}($|\\s)`).test(normalizedName),
        false,
        `Unexpected "${excluded}" result for "${query}": ${product.name}`,
      );
    }
  }
}

function assertStrictPcResults(query: string, products: Array<{ name: string | null }>) {
  for (const product of products) {
    const normalizedName = normalizeSearchText(product.name || '');
    assert.equal(
      matchesStrictPcProductName(normalizedName),
      true,
      `Expected a complete PC result for "${query}": ${product.name}`,
    );
  }
}

function assertStrictIntentResults(
  query: string,
  intent: Exclude<SearchIntent, 'printer'>,
  products: Array<{ name: string | null }>,
) {
  assert.ok(products.length > 0, `Expected strict-intent results for "${query}"`);
  for (const product of products) {
    const normalizedName = normalizeSearchText(product.name || '');
    assert.equal(
      matchesStrictIntentProductName(intent, normalizedName),
      true,
      `Unexpected ${intent} result for "${query}": ${product.name}`,
    );
  }
}

function sortedIds(products: Array<{ id: number }>) {
  return products.map((product) => product.id).sort((left, right) => left - right);
}

function assertFacetBounds(query: string, payload: SearchPayload) {
  const total = payload.pagination?.total || 0;
  for (const attribute of payload.attributes || []) {
    for (const value of attribute.values) {
      assert.ok(value.productCount > 0, `Facet counts must be positive for "${query}"`);
      assert.ok(value.productCount <= total, `Facet count cannot exceed strict candidate total for "${query}"`);
    }
  }
  assert.ok((payload.priceBounds?.min || 0) >= 0, `Minimum price must be non-negative for "${query}"`);
  assert.ok((payload.priceBounds?.max || 0) >= (payload.priceBounds?.min || 0), `Price bounds must be ordered for "${query}"`);
}

const strictAliasGroups: Array<{
  intent: Exclude<SearchIntent, 'printer'>;
  queries: string[];
}> = [
  { intent: 'windows11', queries: ['win 11', 'win11', 'windows 11'] },
  { intent: 'microphone', queries: ['mic', 'micro'] },
  { intent: 'hdd', queries: ['hdd'] },
  { intent: 'speaker', queries: ['loa'] },
];

async function main() {
  const laptopResults = await search('laptop');
  assertNoExcludedNames('laptop', laptopResults);
  assert.ok(laptopResults.every((product) => /(^|\s)laptop(\s|$)/.test(normalizeSearchText(product.name || ''))), 'Laptop results must be laptop products');

  const synonymResults = await search('may tinh xach tay');
  assert.ok(synonymResults.some((product) => /(^|\s)laptop(\s|$)/.test(normalizeSearchText(product.name || ''))), 'Laptop synonym must return laptop products');

  const pcGamingResults = await search('pc gaming');
  assertNoExcludedNames('pc gaming', pcGamingResults);
  assert.ok(pcGamingResults.every((product) => /(^|\s)pc(\s|$)/.test(normalizeSearchText(product.name || ''))), 'PC Gaming results must be PCs');

  for (const sort of [undefined, 'price_desc', 'newest'] as const) {
    const pcResults = await searchAll('PC', sort);
    assertStrictPcResults(`PC${sort ? ` (${sort})` : ''}`, pcResults.products);
  }

  const pcLastPage = await loadSearch('PC', 1_000);
  assert.equal(pcLastPage.pagination?.page, pcLastPage.pagination?.totalPages, 'Out-of-range PC page must clamp to the final page');
  assertStrictPcResults('PC (out-of-range page)', pcLastPage.data || []);

  for (const { intent, queries } of strictAliasGroups) {
    let expectedIds: number[] | null = null;
    for (const sort of [undefined, 'price_desc', 'newest'] as const) {
      for (const query of queries) {
        assert.equal(getSearchIntent(query), intent, `Unexpected intent for "${query}"`);
        const result = await searchAll(query, sort);
        const label = `${query}${sort ? ` (${sort})` : ''}`;
        assertStrictIntentResults(label, intent, result.products);
        assertFacetBounds(label, result.first);
        const ids = sortedIds(result.products);
        if (!expectedIds) expectedIds = ids;
        else assert.deepEqual(ids, expectedIds, `Aliases and sort modes must keep the same candidate IDs for "${label}"`);
      }
    }
  }

  const printerProbe = await loadPublicSearchPayload(new URLSearchParams({ q: 'may in', page: '1', limit: '24' })) as SearchPayload;
  if ((printerProbe.pagination?.total || 0) > 0) {
    for (const sort of [undefined, 'price_desc', 'newest'] as const) {
      assertPrinterResults(`may in${sort ? ` (${sort})` : ''}`, await search('may in', sort));
    }

    assertPrinterResults('may in hoa don', await search('may in hoa don'));
    assertPrinterResults('may in ma vach', await search('may in ma vach'));

    const inkResults = await search('muc may in');
    assert.ok(inkResults.some((product) => /(^|\s)muc(\s|$)/.test(normalizeSearchText(product.name || ''))), 'Explicit printer-ink query must keep ink products');

    const brandFacet = printerProbe.attributes?.find((attribute) => attribute.filter_code === 'brand');
    assert.ok(brandFacet && brandFacet.values.length > 0, 'Search results must include a brand facet');
    assert.equal(printerProbe.attributes?.[0]?.filter_code, 'brand', 'Brand facet must be first');

    const canonPayload = await loadPublicSearchPayload(new URLSearchParams({ q: 'may in', brand: 'canon', page: '1', limit: '24' })) as SearchPayload;
    assert.ok(canonPayload.data?.length, 'Canon brand filter must return matching printer products');
    assert.ok(canonPayload.data?.every((product) => normalizeSearchText(product.brand || '') === 'canon'), 'Brand filter must only return Canon products');
  } else {
    console.warn('Skipped live printer ranking checks because the active catalog has no matching sellable printer fixture.');
  }

  console.log('Search ranking regression checks passed.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
