import assert from 'node:assert/strict';
import test from 'node:test';
import mysql from 'mysql2/promise';

const url = process.env.LEGACY_BRAND_IMPORT_TEST_DATABASE_URL || '';
const enabled = process.env.LEGACY_IMPORT_DESTRUCTIVE_TEST === 'true' && Boolean(url);

async function count(db: mysql.Connection, table: string, where = '') {
  const [rows] = await db.query<any[]>(`SELECT COUNT(*) AS total FROM \`${table}\` ${where}`);
  return Number(rows[0]?.total || 0);
}

test('brand sync atomically merges aliases, converts UTF-8 tables and completely rolls back', { skip: !enabled, timeout: 180_000 }, async () => {
  const parsed = new URL(url);
  const database = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
  assert.match(database, /(test|import|disposable)/i);
  process.env.DATABASE_URL = url;
  process.env.ADMIN_WRITE_ENABLED = 'true';
  const db = await mysql.createConnection(url);

  assert.equal(await count(db, 'idv_brand'), 91, 'Fixture must start from product run 3');
  assert.equal(await count(db, 'idv_brand_info'), 0);
  assert.equal(await count(db, 'idv_brand_category'), 1_218);
  assert.equal(await count(db, 'idv_sell_product_store'), 4_712);
  assert.equal(await count(db, 'product_data_search'), 4_712);
  const aliasesBefore = await count(db, 'idv_sell_product_store', 'WHERE brandId IN (34,57)');
  const categoryAliasesBefore = await count(db, 'idv_product_category', 'WHERE brandId IN (34,57)');
  const unassignedBefore = await count(db, 'idv_sell_product_store', 'WHERE brandId=0');
  const unassignedCategoryBefore = await count(db, 'idv_product_category', 'WHERE brandId=0');
  assert.equal(aliasesBefore, 11);
  assert.equal(categoryAliasesBefore, 33);
  assert.equal(unassignedBefore, 2_276);
  assert.equal(unassignedCategoryBefore, 7_442);

  const { fetchPcmarketBrandSnapshot } = await import('../src/lib/legacyImport/productSource');
  const {
    PCM_BRAND_SOURCE,
    canonicalBrandSnapshot,
    normalizePcmarketBrands,
    productCatalogSha256,
  } = await import('../src/lib/legacyImport/pcmarketProducts');
  const { applyBrandImport, rollbackBrandImport } = await import('../src/lib/legacyImport/brandDatabase');
  const first = await fetchPcmarketBrandSnapshot({ endpoint: PCM_BRAND_SOURCE });
  const second = await fetchPcmarketBrandSnapshot({ endpoint: PCM_BRAND_SOURCE });
  const firstCanonical = canonicalBrandSnapshot(first.items);
  const secondCanonical = canonicalBrandSnapshot(second.items);
  assert.equal(productCatalogSha256(firstCanonical), productCatalogSha256(secondCanonical), 'Source snapshot must be stable');
  const [productCounts] = await db.query<any[]>('SELECT CASE brandId WHEN 0 THEN 96 WHEN 34 THEN 25 WHEN 57 THEN 31 ELSE brandId END AS id,COUNT(*) AS total FROM idv_sell_product_store GROUP BY id');
  const normalized = normalizePcmarketBrands(first.items, new Map(productCounts.map((row) => [Number(row.id), Number(row.total)])));
  const snapshotHash = productCatalogSha256(firstCanonical);
  const applied = await applyBrandImport({ ...normalized, snapshotHash, sourceUrl: PCM_BRAND_SOURCE, expectedDatabase: database });

  assert.equal(await count(db, 'idv_brand'), 90);
  assert.equal(await count(db, 'idv_brand_info'), 90);
  assert.equal(await count(db, 'idv_brand_category'), 1_587);
  assert.equal(await count(db, 'product_data_search'), 4_712);
  assert.equal(await count(db, 'idv_brand', 'WHERE id IN (34,57)'), 0);
  assert.equal(await count(db, 'idv_sell_product_store', 'WHERE brandId IN (0,34,57)'), 0);
  assert.equal(await count(db, 'idv_sell_product_price', 'WHERE brandId IN (0,34,57)'), 0);
  assert.equal(await count(db, 'idv_product_category', 'WHERE brandId IN (0,34,57)'), 0);
  assert.equal(await count(db, 'idv_brand', "WHERE id=96 AND brand_index='pcm' AND name='PCM' AND status=1 AND ordering=8388607"), 1);
  assert.equal(await count(db, 'idv_sell_product_store', 'WHERE brandId=96'), 2_276);
  assert.equal(await count(db, 'idv_sell_product_price', 'WHERE brandId=96 AND isOn=1'), 849);
  assert.equal(await count(db, 'idv_brand', "WHERE image LIKE 'https://pcmarket.vn/%'"), 13);
  const [mergedCounts] = await db.query<any[]>('SELECT id,product FROM idv_brand WHERE id IN (25,31) ORDER BY id');
  assert.deepEqual(mergedCounts.map((row) => [Number(row.id), Number(row.product)]), [[25, 63], [31, 7]]);
  assert.equal(await count(db, 'web_admin_import_records', `WHERE run_id=${Number(applied.runId)} AND entity='brand'`), 92);
  const [maps] = await db.query<any[]>("SELECT source_id,target_id FROM web_admin_import_entity_map WHERE source='pcmarket' AND entity='brand' AND source_id IN ('0','34','57') ORDER BY CAST(source_id AS UNSIGNED)");
  assert.deepEqual(maps.map((row) => [String(row.source_id), String(row.target_id)]), [['0', '96'], ['34', '25'], ['57', '31']]);
  const [collations] = await db.query<any[]>("SELECT TABLE_NAME,TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME IN ('idv_brand','idv_brand_info') ORDER BY TABLE_NAME", [database]);
  assert.deepEqual(collations.map((row) => String(row.TABLE_COLLATION)), ['utf8mb4_unicode_ci', 'utf8mb4_unicode_ci']);
  const [teamgroup] = await db.query<any[]>("SELECT i.meta_title,i.meta_description FROM idv_brand_info i WHERE i.id=31 AND i.sellerId=0");
  assert.ok(String(teamgroup[0]?.meta_title || '').trim(), 'TEAMGROUP alias SEO must survive the merge');

  await rollbackBrandImport({ runId: applied.runId, expectedDatabase: database });
  assert.equal(await count(db, 'idv_brand'), 91);
  assert.equal(await count(db, 'idv_brand_info'), 0);
  assert.equal(await count(db, 'idv_brand_category'), 1_218);
  assert.equal(await count(db, 'product_data_search'), 4_712);
  assert.equal(await count(db, 'idv_sell_product_store', 'WHERE brandId IN (34,57)'), aliasesBefore);
  assert.equal(await count(db, 'idv_product_category', 'WHERE brandId IN (34,57)'), categoryAliasesBefore);
  assert.equal(await count(db, 'idv_sell_product_store', 'WHERE brandId=0'), unassignedBefore);
  assert.equal(await count(db, 'idv_product_category', 'WHERE brandId=0'), unassignedCategoryBefore);
  const [restoredCollations] = await db.query<any[]>("SELECT TABLE_NAME,TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME IN ('idv_brand','idv_brand_info') ORDER BY TABLE_NAME", [database]);
  assert.deepEqual(restoredCollations.map((row) => String(row.TABLE_COLLATION)), ['latin1_swedish_ci', 'latin1_swedish_ci']);

  const { default: importPool } = await import('../src/lib/db');
  await importPool.end();
  await db.end();
});
