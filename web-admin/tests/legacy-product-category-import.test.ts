import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canonicalCategorySnapshot,
  normalizePcmarketCategories,
  pcmarketCategoryEnvelopeSchema,
  resolveDuplicateCategoryPaths,
  sanitizeLegacyCategoryHtml,
  sha256,
} from '../src/lib/legacyImport/pcmarketProductCategories';
import { fetchPcmarketCategorySnapshot } from '../src/lib/legacyImport/source';
import { normalizeLegacyProductCategoryPath } from '../src/lib/admin/common';

function category(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id,
    url_index: `category-${id}`,
    url: `https://pcmarket.vn/category-${id}.html`,
    name: `Category ${id}`,
    tags: '',
    summary: '',
    description: '',
    image: '',
    parentId: 0,
    status: 'on',
    ordering: 0,
    price_range: '',
    create_time: '2026-01-01 00:00:00',
    last_update: '2026-01-02 00:00:00',
    meta_title: '',
    meta_keyword: '',
    meta_description: '',
    attributes: [],
    ...overrides,
  };
}

test('validates and normalizes category hierarchy, state, derived paths and pending attributes', () => {
  const result = normalizePcmarketCategories([
    category(10, { ordering: 2, attributes: [{ id: 5, name: 'CPU', status: 1 }] }),
    category(11, { parentId: 10, status: 'off', ordering: 3 }),
    category(12, { parentId: 11, ordering: 4, price_range: '1;2;' }),
  ]);
  assert.equal(result.report.total, 3);
  assert.equal(result.report.roots, 1);
  assert.equal(result.report.maxDepth, 2);
  assert.deepEqual(result.report.enabledUnderDisabled, [12]);
  assert.equal(result.report.pendingAttributeLinks, 1);
  assert.equal(result.report.pendingAttributeDefinitions, 1);
  assert.equal(result.categories[0].childListId, '11');
  assert.equal(result.categories[0].isParent, 1);
  assert.equal(result.categories[2].catPath, ':12:11:10');
  assert.equal(result.categories[2].priceRange, '1;2;');
});

test('rejects missing parents and cycles', () => {
  assert.throws(() => normalizePcmarketCategories([category(1, { parentId: 99 })]), /missing parent/);
  assert.throws(() => normalizePcmarketCategories([
    category(1, { parentId: 2 }),
    category(2, { parentId: 1 }),
  ]), /cycle/);
});

test('resolves duplicate paths deterministically while preserving legacy html extension', () => {
  const input = [
    category(447, { url: 'https://pcmarket.vn/ban-phim-varmilo.html' }),
    category(158, { url: 'https://pcmarket.vn/ban-phim-varmilo.html' }),
  ] as any[];
  const { paths, collisions } = resolveDuplicateCategoryPaths(input);
  assert.equal(paths.get(158), 'ban-phim-varmilo.html');
  assert.equal(paths.get(447), 'ban-phim-varmilo-category-447.html');
  assert.deepEqual(collisions[0].categoryIds, [158, 447]);
});

test('rewrites relative HTML URLs and removes active content while converting YouTube iframe', () => {
  const html = sanitizeLegacyCategoryHtml(`
    <p onclick="steal()"><img src="/media/a.jpg"><a href="javascript:bad()">bad</a></p>
    <script>alert(1)</script><iframe src="https://www.youtube.com/embed/abc"></iframe>
  `);
  assert.match(html, /https:\/\/pcmarket\.vn\/media\/a\.jpg/);
  assert.doesNotMatch(html, /onclick|javascript:|script/i);
  assert.match(html, /<a href="https:\/\/www\.youtube\.com\/embed\/abc"/);
  assert.match(html, /Xem video YouTube/);
});

test('validates envelope limits and produces order-independent snapshot hashes', () => {
  assert.throws(() => pcmarketCategoryEnvelopeSchema.parse({ current_page: 1, size: 501, total_page: 1, total_item: 0, items: [] }));
  const a = category(1) as any;
  const b = category(2) as any;
  assert.equal(sha256(canonicalCategorySnapshot([a, b])), sha256(canonicalCategorySnapshot([b, a])));
  assert.notEqual(sha256(canonicalCategorySnapshot([a])), sha256(canonicalCategorySnapshot([a, b])));
});

test('rejects malformed timestamps, status and price ranges', () => {
  assert.throws(() => normalizePcmarketCategories([category(1, { create_time: '2026/01/01' })]), /timestamp/);
  assert.throws(() => normalizePcmarketCategories([category(1, { status: 'yes' })]));
  assert.throws(() => normalizePcmarketCategories([category(1, { price_range: '100;abc' })]), /price range/);
});

test('fetches bounded pagination and rejects changing metadata', async () => {
  let call = 0;
  const mockFetch = (async () => {
    call += 1;
    const payload = call === 1
      ? { current_page: 1, size: 1, total_page: 2, total_item: 2, items: [category(1)] }
      : { current_page: 2, size: 1, total_page: 2, total_item: 3, items: [category(2)] };
    return new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  await assert.rejects(
    fetchPcmarketCategorySnapshot({ endpoint: 'https://pcmarket.vn/export/product_category.php', pageSize: 1, retries: 0, fetchImpl: mockFetch }),
    /metadata changed/,
  );
});

test('rejects non-HTTPS or non-PCMarket source hosts', async () => {
  await assert.rejects(
    fetchPcmarketCategorySnapshot({ endpoint: 'https://example.com/export.json' }),
    /HTTPS on pcmarket\.vn/,
  );
});

test('preserves safe legacy category paths during later admin saves', () => {
  assert.equal(normalizeLegacyProductCategoryPath('/laptop.html'), 'laptop.html');
  assert.equal(normalizeLegacyProductCategoryPath('laptop.html-1'), 'laptop.html-1');
  assert.equal(normalizeLegacyProductCategoryPath('Máy tính xách tay'), 'may-tinh-xach-tay');
  assert.equal(normalizeLegacyProductCategoryPath('../admin'), 'admin');
});
