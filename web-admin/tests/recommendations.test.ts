import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractProductKeyword,
  mergeRelatedProductGroups,
  mergeRankedAndNewestIds,
  normalizeRecommendationText,
  parseProductIdsParam,
  scoreRelatedTitle,
  shouldSupplementFromParent,
  type PublicProductCard,
} from '../src/lib/publicRecommendations';

function product(id: number): PublicProductCard {
  return {
    id,
    slug: `product-${id}`,
    name: `Product ${id}`,
    sku: '',
    thumbnail: '',
    price: 0,
    marketPrice: 0,
    savings: 0,
    brand: '',
    cardBadges: [],
  };
}

test('parses a bounded, ordered product id list', () => {
  assert.deepEqual(parseProductIdsParam('9,7,5'), { ok: true, ids: [9, 7, 5] });
  assert.equal(parseProductIdsParam('9,9').ok, false);
  assert.equal(parseProductIdsParam('9,nope').ok, false);
  assert.equal(parseProductIdsParam(Array.from({ length: 16 }, (_, index) => index + 1).join(',')).ok, false);
});

test('merges leaf products before parent products and removes duplicates/current product', () => {
  const merged = mergeRelatedProductGroups(
    [product(1), product(2), product(3)],
    [product(3), product(4), product(1)],
    1,
  );
  assert.deepEqual(merged.map((item) => item.id), [2, 3, 4]);
  assert.equal(shouldSupplementFromParent(4), true);
  assert.equal(shouldSupplementFromParent(5), false);
});

test('fills related posts from newest items only after ranked items without duplicates', () => {
  assert.deepEqual(mergeRankedAndNewestIds([8, 3], [3, 10, 9, 8], 4), [8, 3, 10, 9]);
});

test('extracts a normalized product keyword before the first parenthesis', () => {
  const keyword = extractProductKeyword('  Laptop MSI Crosshair &amp; Pulse (RTX 4060)  ');
  assert.equal(keyword, 'Laptop MSI Crosshair & Pulse');
  assert.equal(normalizeRecommendationText(keyword), 'laptop msi crosshair pulse');
  assert.equal(extractProductKeyword('(RTX 4060)'), '(RTX 4060)');
});

test('scores a model-specific title above a generic title', () => {
  const keyword = 'laptop msi crosshair 16 hx';
  const tokens = keyword.split(' ');
  const frequencies = new Map(tokens.map((token) => [token, token === 'laptop' ? 90 : 5]));
  const exact = scoreRelatedTitle(
    keyword,
    tokens,
    'danh gia laptop msi crosshair 16 hx',
    new Set('danh gia laptop msi crosshair 16 hx'.split(' ')),
    frequencies,
    100,
    0.08,
  );
  const generic = scoreRelatedTitle(
    keyword,
    tokens,
    'top laptop gaming dang mua',
    new Set('top laptop gaming dang mua'.split(' ')),
    frequencies,
    100,
    0.45,
  );
  assert.ok(exact.score > generic.score);
  assert.ok(exact.matchedCount > generic.matchedCount);
});
