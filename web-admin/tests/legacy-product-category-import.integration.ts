import assert from 'node:assert/strict';
import test from 'node:test';
import mysql from 'mysql2/promise';

const url = process.env.LEGACY_IMPORT_TEST_DATABASE_URL || '';
const enabled = process.env.LEGACY_IMPORT_DESTRUCTIVE_TEST === 'true' && Boolean(url);

test('category staging swap, guarded dependency cleanup and complete rollback', { skip: !enabled }, async () => {
  const parsed = new URL(url);
  const database = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
  assert.match(database, /(test|import|disposable)/i, 'Disposable database name must contain test/import/disposable');
  process.env.DATABASE_URL = url;
  process.env.ADMIN_WRITE_ENABLED = 'true';
  const db = await mysql.createConnection(url);
  const tables = [
    'web_admin_import_records', 'web_admin_import_entity_map', 'web_admin_import_runs', 'web_admin_cache_versions',
    'web_admin_voucher_products', 'web_admin_voucher_categories', 'web_admin_vouchers', 'idv_attribute_category', 'idv_product_category',
    'idv_sell_product_store', 'idv_url', 'idv_seller_category',
  ];
  await db.query('SET FOREIGN_KEY_CHECKS=0');
  for (const table of tables) await db.query(`DROP TABLE IF EXISTS \`${table}\``);
  const [backupRows] = await db.query<any[]>("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME LIKE 'web_admin_import_b_%'", [database]);
  for (const row of backupRows) await db.query(`DROP TABLE \`${String(row.TABLE_NAME).replace(/`/g, '``')}\``);
  await db.query('SET FOREIGN_KEY_CHECKS=1');
  await db.query(`CREATE TABLE idv_seller_category (
    id int unsigned NOT NULL, name varchar(255) NOT NULL, parentId int NOT NULL DEFAULT 0,
    url varchar(180) NOT NULL, request_path varchar(181) NOT NULL, status tinyint NOT NULL DEFAULT 1,
    ordering int NOT NULL DEFAULT 0, summary text, imgUrl varchar(255) NOT NULL DEFAULT '', img_big varchar(255) NOT NULL DEFAULT '',
    priceRange varchar(255) NOT NULL DEFAULT '', static_html longtext, is_featured tinyint NOT NULL DEFAULT 0,
    display_option varchar(30) NOT NULL DEFAULT 'child_product', image_background varchar(255) NOT NULL DEFAULT '',
    meta_title varchar(255) NOT NULL DEFAULT '', meta_keyword varchar(255) NOT NULL DEFAULT '', meta_description varchar(512) NOT NULL DEFAULT '',
    isParent tinyint NOT NULL DEFAULT 0, childListId text, catPath varchar(255) NOT NULL DEFAULT '', tags text,
    create_time datetime NULL, last_update datetime NULL, PRIMARY KEY(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await db.query(`CREATE TABLE idv_url (
    id int unsigned NOT NULL AUTO_INCREMENT, request_path varchar(255) NOT NULL, request_path_index char(32) NOT NULL,
    id_path varchar(255) NOT NULL, target_path varchar(255) NOT NULL DEFAULT '', redirect_code varchar(10) NOT NULL DEFAULT '',
    url_type varchar(50) NOT NULL DEFAULT '0', PRIMARY KEY(id), UNIQUE KEY uq_path(request_path)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await db.query('CREATE TABLE idv_product_category(category_id int NOT NULL,pro_id int NOT NULL) ENGINE=MyISAM');
  await db.query('CREATE TABLE idv_attribute_category(category_id int NOT NULL,attributeId int NOT NULL) ENGINE=MyISAM');
  await db.query("CREATE TABLE idv_sell_product_store(id int NOT NULL PRIMARY KEY,product_cat varchar(255) NOT NULL DEFAULT '') ENGINE=MyISAM");
  await db.query('CREATE TABLE web_admin_vouchers(id int NOT NULL PRIMARY KEY,status tinyint NOT NULL) ENGINE=InnoDB');
  await db.query('CREATE TABLE web_admin_voucher_categories(voucher_id int NOT NULL,category_id int NOT NULL,PRIMARY KEY(voucher_id,category_id)) ENGINE=InnoDB');
  await db.query('CREATE TABLE web_admin_voucher_products(voucher_id int NOT NULL,product_id int NOT NULL,PRIMARY KEY(voucher_id,product_id)) ENGINE=InnoDB');
  await db.query('CREATE TABLE web_admin_cache_versions(cache_key varchar(100) NOT NULL PRIMARY KEY,version bigint unsigned NOT NULL DEFAULT 1) ENGINE=InnoDB');
  await db.query("INSERT INTO idv_seller_category(id,name,parentId,url,request_path) VALUES(900,'Old',0,'old.html','/old.html')");
  await db.query("INSERT INTO idv_url(request_path,request_path_index,id_path) VALUES('/old.html',MD5('/old.html'),'module:product/view:category/view_id:900')");
  await db.query('INSERT INTO idv_product_category VALUES(900,1)');
  await db.query('INSERT INTO idv_attribute_category VALUES(900,5)');
  await db.query("INSERT INTO idv_sell_product_store VALUES(1,'900')");
  await db.query('INSERT INTO web_admin_vouchers VALUES(7,1),(8,1)');
  await db.query('INSERT INTO web_admin_voucher_categories VALUES(7,900),(8,900)');
  await db.query('INSERT INTO web_admin_voucher_products VALUES(8,1)');

  const { normalizePcmarketCategories, sha256 } = await import('../src/lib/legacyImport/pcmarketProductCategories');
  const { applyProductCategoryImport, rollbackProductCategoryImport } = await import('../src/lib/legacyImport/productCategoryDatabase');
  const raw = [{
    id: 30, url_index: 'laptop', url: 'https://pcmarket.vn/laptop.html', name: 'Laptop', tags: '', summary: '', description: '', image: '',
    parentId: 0, status: 'on', ordering: 1, price_range: '', create_time: '2026-01-01 00:00:00', last_update: '2026-01-02 00:00:00',
    meta_title: '', meta_keyword: '', meta_description: '', attributes: [{ id: 5, name: 'CPU', status: 1 }],
  }];
  const normalized = normalizePcmarketCategories(raw);
  const applied = await applyProductCategoryImport({
    ...normalized, snapshotHash: sha256(JSON.stringify(raw)), sourceUrl: 'https://pcmarket.vn/export/product_category.php', expectedDatabase: database,
  });
  const [afterApply] = await db.query<any[]>('SELECT id FROM idv_seller_category');
  assert.deepEqual(afterApply.map((row) => row.id), [30]);
  const [routeAfterApply] = await db.query<any[]>("SELECT url_type,request_path_index=MD5(request_path) AS valid_hash FROM idv_url WHERE id_path='module:product/view:category/view_id:30'");
  assert.deepEqual(routeAfterApply[0], { url_type: 'product:category', valid_hash: 1 });
  const [voucherAfterApply] = await db.query<any[]>('SELECT status FROM web_admin_vouchers WHERE id=7');
  assert.equal(voucherAfterApply[0].status, 0, 'Scoped voucher must not become active and global');
  const [mixedVoucherAfterApply] = await db.query<any[]>('SELECT status FROM web_admin_vouchers WHERE id=8');
  assert.equal(mixedVoucherAfterApply[0].status, 1, 'Voucher with a direct product scope must remain active');
  assert.equal((await db.query<any[]>('SELECT * FROM web_admin_voucher_categories'))[0].length, 0);
  assert.equal((await db.query<any[]>('SELECT * FROM idv_product_category'))[0].length, 0);
  assert.equal((await db.query<any[]>('SELECT product_cat FROM idv_sell_product_store WHERE id=1'))[0][0].product_cat, '');

  await rollbackProductCategoryImport({ runId: applied.runId, expectedDatabase: database });
  assert.equal((await db.query<any[]>('SELECT id FROM idv_seller_category'))[0][0].id, 900);
  assert.equal((await db.query<any[]>('SELECT status FROM web_admin_vouchers WHERE id=7'))[0][0].status, 1);
  assert.equal((await db.query<any[]>('SELECT status FROM web_admin_vouchers WHERE id=8'))[0][0].status, 1);
  assert.equal((await db.query<any[]>('SELECT category_id FROM idv_product_category'))[0][0].category_id, 900);
  assert.equal((await db.query<any[]>('SELECT product_cat FROM idv_sell_product_store WHERE id=1'))[0][0].product_cat, '900');
  assert.equal((await db.query<any[]>("SELECT url_type FROM idv_url WHERE id_path='module:product/view:category/view_id:900'"))[0][0].url_type, '0');
  const { default: importPool } = await import('../src/lib/db');
  await importPool.end();
  await db.end();
});
