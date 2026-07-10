import assert from 'node:assert/strict';
import pool from '../src/lib/db';
import { loadPublicSearchPayload } from '../src/lib/publicSearch';
import { SEARCH_EXCLUSIONS, normalizeSearchText } from '../src/lib/searchRules';

type SearchPayload = Awaited<ReturnType<typeof loadPublicSearchPayload>> & {
  data?: Array<{ name: string | null; brand?: string | null }>;
  pagination?: { total: number };
  attributes?: Array<{ filter_code: string; values: Array<{ name: string; productCount: number }> }>;
};

async function search(query: string, sort?: 'price_desc' | 'newest') {
  const params = new URLSearchParams({ q: query, page: '1', limit: '24' });
  if (sort) params.set('sort', sort);
  const payload = await loadPublicSearchPayload(params) as SearchPayload;
  assert.equal(payload.success, true, `Search failed for "${query}"`);
  assert.ok(payload.pagination && payload.pagination.total > 0, `Expected results for "${query}"`);
  return payload.data || [];
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

async function main() {
  const laptopResults = await search('laptop');
  assertNoExcludedNames('laptop', laptopResults);
  assert.ok(laptopResults.every((product) => /(^|\s)laptop(\s|$)/.test(normalizeSearchText(product.name || ''))), 'Laptop results must be laptop products');

  const synonymResults = await search('may tinh xach tay');
  assert.ok(synonymResults.some((product) => /(^|\s)laptop(\s|$)/.test(normalizeSearchText(product.name || ''))), 'Laptop synonym must return laptop products');

  const pcGamingResults = await search('pc gaming');
  assertNoExcludedNames('pc gaming', pcGamingResults);
  assert.ok(pcGamingResults.every((product) => /(^|\s)pc(\s|$)/.test(normalizeSearchText(product.name || ''))), 'PC Gaming results must be PCs');

  const laptopBagResults = await search('cap laptop');
  assert.ok(laptopBagResults.some((product) => /(^|\s)cap(\s|$)/.test(normalizeSearchText(product.name || ''))), 'Explicit laptop bag query must keep bags');

  for (const sort of [undefined, 'price_desc', 'newest'] as const) {
    assertPrinterResults(`may in${sort ? ` (${sort})` : ''}`, await search('may in', sort));
  }

  assertPrinterResults('may in hoa don', await search('may in hoa don'));
  assertPrinterResults('may in ma vach', await search('may in ma vach'));

  const inkResults = await search('muc may in');
  assert.ok(inkResults.some((product) => /(^|\s)muc(\s|$)/.test(normalizeSearchText(product.name || ''))), 'Explicit printer-ink query must keep ink products');

  const printerPayload = await loadPublicSearchPayload(new URLSearchParams({ q: 'may in', page: '1', limit: '24' })) as SearchPayload;
  const brandFacet = printerPayload.attributes?.find((attribute) => attribute.filter_code === 'brand');
  assert.ok(brandFacet && brandFacet.values.length > 0, 'Search results must include a brand facet');
  assert.equal(printerPayload.attributes?.[0]?.filter_code, 'brand', 'Brand facet must be first');

  const canonPayload = await loadPublicSearchPayload(new URLSearchParams({ q: 'may in', brand: 'canon', page: '1', limit: '24' })) as SearchPayload;
  assert.ok(canonPayload.data?.length, 'Canon brand filter must return matching printer products');
  assert.ok(canonPayload.data?.every((product) => normalizeSearchText(product.brand || '') === 'canon'), 'Brand filter must only return Canon products');

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
