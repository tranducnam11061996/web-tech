import assert from 'node:assert/strict';
import test from 'node:test';
import mysql from 'mysql2/promise';

const url = process.env.LEGACY_PRODUCT_IMPORT_TEST_DATABASE_URL || '';
const enabled = process.env.LEGACY_IMPORT_DESTRUCTIVE_TEST === 'true' && Boolean(url);

test('product import applies core relations, pending audit and complete rollback', { skip: !enabled }, async () => {
  const parsed = new URL(url);
  const database = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
  assert.match(database, /(test|import|disposable)/i);
  process.env.DATABASE_URL = url;
  process.env.ADMIN_WRITE_ENABLED = 'true';
  const db = await mysql.createConnection(url);
  const [categoryCount] = await db.query<any[]>('SELECT COUNT(*) total FROM idv_seller_category');
  const [routeCount] = await db.query<any[]>("SELECT COUNT(*) total FROM idv_url WHERE id_path LIKE 'module:product/view:category/view_id:%'");
  assert.equal(Number(categoryCount[0].total), 788, 'Fixture must clone the applied category database');
  assert.equal(Number(routeCount[0].total), 788);
  for (const table of ['idv_sell_product_store', 'idv_brand', 'idv_attribute', 'idv_product_category']) {
    const [rows] = await db.query<any[]>(`SELECT COUNT(*) total FROM ${table}`);
    assert.equal(Number(rows[0].total), 0, `${table} must start empty`);
  }

  const { normalizePcmarketProductCatalog, productCatalogSha256 } = await import('../src/lib/legacyImport/pcmarketProducts');
  const { applyProductImport, rollbackProductImport } = await import('../src/lib/legacyImport/productDatabase');
  const rawBrand = { id: 2, url: 'https://pcmarket.vn/brand/intel', name: 'Intel', summary: '', description: '', image: '', status: 'on', ordering: 0, last_update: '2026-01-01 00:00:00', meta_title: '', meta_keyword: '', meta_description: '' };
  const rawAttribute = { id: 5, name: 'CPU', code: 'cpu', description: '', status: 'on', ordering: 1, scope: 'local', options: { is_display: 1, is_header: 0, in_summary: 1 }, last_update: '2026-01-01 00:00:00', values: [{ id: 10, title: 'Intel Core', description: '', ordering: 1 }] };
  const rawProduct = {
    id: 90001, categories: [{ id: 30, name: 'Laptop', url: 'https://pcmarket.vn/laptop.html' }], price: 1000000, market_price: 1200000, purchase_price: 800000,
    warranty: '12 thang', special_offer: '<b>Offer</b>', product_title: 'Disposable product', product_summary: '', sku: '',
    url: 'https://pcmarket.vn/disposable-product.html', main_image: 'https://pcmarket.vn/media/disposable.jpg', image_collection: [],
    description: '<p>Safe</p>', spec: '<table><tr><td>CPU</td></tr></table>', vat: 1, brandId: 2, status: 'on', meta_title: '', meta_keyword: '', meta_description: '', url_canonical: '', order_number: 1,
    spec_attributes: [{ attribute_code: 'cpu', name: 'CPU', value_list: [{ id: 10, name: 'Intel Core' }] }],
    promotion: { promotion: [], promotion_group: [] }, tags: [], related_products: [], related_articles: [], variants: [{ id: 1 }], config_group: null, addons: [], comboset: [{ id: 7 }], component_list: null,
  };
  const categoryAttributes = [{ categoryId: 30, attributes: [{ id: 5, name: 'CPU', status: 1 }] }];
  const normalized = normalizePcmarketProductCatalog({ products: [rawProduct], brands: [rawBrand], attributes: [rawAttribute], categoryAttributes });
  const applied = await applyProductImport({ ...normalized, categoryAttributes, snapshotHash: productCatalogSha256(JSON.stringify(rawProduct)), sourceUrl: 'https://pcmarket.vn/export/product.php', expectedDatabase: database });
  assert.equal((await db.query<any[]>('SELECT COUNT(*) total FROM idv_sell_product_store'))[0][0].total, 1);
  assert.equal((await db.query<any[]>('SELECT storeSKU,proThum FROM idv_sell_product_store WHERE id=90001'))[0][0].storeSKU, 'PCM-90001');
  assert.equal((await db.query<any[]>('SELECT COUNT(*) total FROM idv_product_category'))[0][0].total, 1);
  assert.equal((await db.query<any[]>('SELECT COUNT(*) total FROM idv_product_attribute'))[0][0].total, 1);
  assert.equal((await db.query<any[]>('SELECT COUNT(*) total FROM idv_attribute_category'))[0][0].total, 1);
  assert.equal((await db.query<any[]>('SELECT COUNT(*) total FROM product_data_search'))[0][0].total, 1);
  assert.equal((await db.query<any[]>("SELECT relation_status FROM web_admin_import_records WHERE run_id=? AND entity='product-variants'", [applied.runId]))[0][0].relation_status, 'pending');
  await rollbackProductImport({ runId: applied.runId, expectedDatabase: database });
  assert.equal((await db.query<any[]>('SELECT COUNT(*) total FROM idv_sell_product_store'))[0][0].total, 0);
  assert.equal((await db.query<any[]>('SELECT COUNT(*) total FROM idv_attribute_category'))[0][0].total, 0);
  assert.equal((await db.query<any[]>("SELECT COUNT(*) total FROM web_admin_import_records WHERE entity='product-category' AND relation_status='pending'"))[0][0].total, 37);
  const { default: importPool } = await import('../src/lib/db');
  await importPool.end();
  await db.end();
});
