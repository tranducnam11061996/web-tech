import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canonicalProductCatalogSnapshot,
  normalizePcmarketProductCatalog,
  pcmarketProductEnvelopeSchema,
  productCatalogSha256,
  resolveDuplicateProductPaths,
  sanitizeLegacyProductHtml,
} from '../src/lib/legacyImport/pcmarketProducts';
import { fetchPcmarketProductSnapshot } from '../src/lib/legacyImport/productSource';
import { resolveProductImageUrl } from '../src/lib/productImageUrl';

function brand(id = 2) {
  return { id, url: `https://pcmarket.vn/brand/brand-${id}`, name: `Brand ${id}`, summary: '', description: '', image: '', status: 'on', ordering: 0, last_update: '2026-01-01 00:00:00', meta_title: '', meta_keyword: '', meta_description: '' };
}

function attribute(id = 5) {
  return { id, name: 'CPU', code: 'cpu', description: '', status: 'on', ordering: 1, scope: 'local', options: { is_display: 1, is_header: 0, in_summary: 1 }, last_update: '2026-01-01 00:00:00', values: [{ id: 10, title: 'Intel', description: '', ordering: 1 }] };
}

function product(id: number, overrides: Record<string, unknown> = {}) {
  return {
    id, categories: [{ id: 30, name: 'Laptop', url: 'https://pcmarket.vn/laptop.html' }], price: 100, market_price: 120, purchase_price: 80,
    warranty: '12 thang', special_offer: '', product_title: `Product ${id}`, product_summary: '', sku: `SKU${id}`,
    url: `https://pcmarket.vn/product-${id}.html`, main_image: `https://pcmarket.vn/media/product-${id}.jpg`,
    image_collection: [`https://pcmarket.vn/media/product-${id}.jpg`], description: '', spec: '', vat: 1, brandId: 2, status: 'on',
    meta_title: '', meta_keyword: '', meta_description: '', url_canonical: '', order_number: 1,
    spec_attributes: [{ attribute_code: 'cpu', name: 'CPU', value_list: [{ id: 10, name: 'Intel' }] }],
    promotion: { promotion: [], promotion_group: [] }, tags: [], related_products: [], related_articles: [], variants: [], config_group: null, addons: [], comboset: [], component_list: null,
    ...overrides,
  };
}

test('normalizes the core product catalog, fallback SKU, VAT, images and pending payloads', () => {
  const result = normalizePcmarketProductCatalog({
    products: [product(100, { sku: '', vat: 2, image_collection: ['https://pcmarket.vn/media/product-100.jpg', 'https://pcmarket.vn/media/second.jpg'], variants: [{ id: 999 }], comboset: [{ id: 7 }] })],
    brands: [brand()], attributes: [attribute()], categoryAttributes: [{ categoryId: 30, attributes: [{ id: 5, name: 'CPU', status: 1 }] }],
  });
  assert.equal(result.products[0].sku, 'PCM-100');
  assert.equal(result.products[0].hasVat, 0);
  assert.equal(result.products[0].imageCount, 2);
  assert.equal(result.products[0].mainImage, 'https://pcmarket.vn/media/product-100.jpg');
  assert.equal(result.report.productCategoryLinks, 1);
  assert.equal(result.report.productAttributeLinks, 1);
  assert.equal(result.report.categoryAttributeLinks, 1);
  assert.equal(result.report.pendingVariantLinks, 1);
  assert.equal(result.report.pendingComboOccurrences, 1);
});

test('resolves duplicate product paths deterministically and keeps html', () => {
  const input = [product(20, { url: 'https://pcmarket.vn/same.html' }), product(10, { url: 'https://pcmarket.vn/same.html' })] as any[];
  const { paths, collisions } = resolveDuplicateProductPaths(input);
  assert.equal(paths.get(10), 'same.html');
  assert.equal(paths.get(20), 'same-product-20.html');
  assert.deepEqual(collisions[0].productIds, [10, 20]);
});

test('sanitizes active HTML and normalizes PCMarket HTTP resources', () => {
  const html = sanitizeLegacyProductHtml('<script>alert(1)</script><p style="color:red" onclick="x()"><img src="http://pcmarket.vn/a.jpg"><iframe src="https://youtube.com/embed/a"></iframe></p>');
  assert.doesNotMatch(html, /script|onclick|style=/i);
  assert.match(html, /https:\/\/pcmarket\.vn\/a\.jpg/);
  assert.match(html, /Xem video YouTube/);
});

test('rejects missing brand, mismatched attribute values and off-domain images', () => {
  assert.throws(() => normalizePcmarketProductCatalog({ products: [product(1, { brandId: 99 })], brands: [brand()], attributes: [attribute()], categoryAttributes: [] }), /missing brand/);
  assert.throws(() => normalizePcmarketProductCatalog({ products: [product(1, { spec_attributes: [{ attribute_code: 'cpu', name: 'CPU', value_list: [{ id: 99, name: 'Bad' }] }] })], brands: [brand()], attributes: [attribute()], categoryAttributes: [] }), /invalid attribute value/);
  assert.throws(() => normalizePcmarketProductCatalog({ products: [product(1, { main_image: 'https://example.com/a.jpg' })], brands: [brand()], attributes: [attribute()], categoryAttributes: [] }), /HTTPS on pcmarket/);
});

test('maps the PCMarket unassigned brand sentinel to the managed PCM brand', () => {
  const result = normalizePcmarketProductCatalog({
    products: [product(1, { brandId: 0 })],
    brands: [brand()],
    attributes: [attribute()],
    categoryAttributes: [],
  });
  assert.equal(result.products[0].brandId, 96);
  const pcm = result.brands.find((item) => item.id === 96);
  assert.ok(pcm);
  assert.equal(pcm.name, 'PCM');
  assert.equal(pcm.productCount, 1);
  assert.deepEqual(pcm.sourceIds, [0]);
});

test('validates envelope limits and canonical hash ordering', () => {
  assert.throws(() => pcmarketProductEnvelopeSchema.parse({ current_page: 1, size: 501, total_page: 1, total_item: 0, items: [] }));
  const a = product(1) as any;
  const b = product(2) as any;
  const left = canonicalProductCatalogSnapshot({ products: [a, b], brands: [brand()] as any[], attributes: [attribute()] as any[] });
  const right = canonicalProductCatalogSnapshot({ products: [b, a], brands: [brand()] as any[], attributes: [attribute()] as any[] });
  assert.equal(productCatalogSha256(left), productCatalogSha256(right));
});

test('rejects changing product pagination metadata', async () => {
  let call = 0;
  const mockFetch = (async () => {
    call += 1;
    return new Response(JSON.stringify(call === 1
      ? { current_page: 1, size: 1, total_page: 2, total_item: 2, items: [product(1)] }
      : { current_page: 2, size: 1, total_page: 2, total_item: 3, items: [product(2)] }), { status: 200 });
  }) as typeof fetch;
  await assert.rejects(fetchPcmarketProductSnapshot({ endpoint: 'https://pcmarket.vn/export/product.php', pageSize: 1, retries: 0, fetchImpl: mockFetch }), /metadata changed/);
});

test('keeps absolute HTTPS product images and prefixes only legacy file names', () => {
  assert.equal(resolveProductImageUrl('https://pcmarket.vn/media/a.jpg'), 'https://pcmarket.vn/media/a.jpg');
  assert.equal(resolveProductImageUrl('legacy.jpg'), 'https://hacom.vn/media/product/legacy.jpg');
  assert.equal(resolveProductImageUrl('http://unsafe.test/a.jpg', 'fallback'), 'fallback');
});
