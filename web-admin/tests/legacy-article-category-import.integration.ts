import assert from 'node:assert/strict';
import test from 'node:test';
import mysql from 'mysql2/promise';

const url = process.env.LEGACY_IMPORT_TEST_DATABASE_URL || '';
const enabled = process.env.LEGACY_IMPORT_DESTRUCTIVE_TEST === 'true' && Boolean(url);

test('article-category import applies exact IDs/routes and completely rolls back', { skip: !enabled }, async () => {
  const parsed = new URL(url);
  const database = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
  assert.match(database, /(test|import|disposable)/i, 'Disposable database name must contain test/import/disposable');
  process.env.DATABASE_URL = url;
  process.env.ADMIN_WRITE_ENABLED = 'true';
  const db = await mysql.createConnection(url);
  await db.query('SET FOREIGN_KEY_CHECKS=0');
  const [existing] = await db.query<any[]>("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND (TABLE_NAME LIKE 'web_admin_import_%' OR TABLE_NAME IN ('idv_seller_news_category','idv_seller_news','idv_article_category','idv_url','web_admin_menu_items','web_admin_entity_registry','idv_seller_category','idv_brand','idv_sell_product_store','product_data_search'))", [database]);
  for (const row of existing) await db.query(`DROP TABLE \`${String(row.TABLE_NAME).replace(/`/g, '``')}\``);
  await db.query('SET FOREIGN_KEY_CHECKS=1');
  await db.query(`CREATE TABLE idv_seller_news_category (
    id int unsigned NOT NULL AUTO_INCREMENT,type enum('article','video','photo') NOT NULL DEFAULT 'article',catPath varchar(250) NOT NULL DEFAULT '0',
    childListId text,sellerId int NOT NULL DEFAULT 0,url varchar(200) NOT NULL DEFAULT '0',url_hash varchar(50) NOT NULL DEFAULT '0',name varchar(150) NOT NULL,
    summary varchar(250) NOT NULL DEFAULT '0',description text,isParent tinyint NOT NULL DEFAULT 0,imgUrl varchar(150) NOT NULL DEFAULT '0',parentId int NOT NULL DEFAULT 0,
    status tinyint NOT NULL DEFAULT 1,ordering smallint NOT NULL DEFAULT 0,item_count mediumint NOT NULL DEFAULT 0,display_option varchar(15) NOT NULL DEFAULT 'article',
    createDate datetime NULL,createBy int NOT NULL DEFAULT 0,lastUpdate datetime NULL,lastUpdateBy int NOT NULL DEFAULT 0,meta_title varchar(200) NOT NULL DEFAULT '0',
    meta_keyword varchar(200) NOT NULL DEFAULT '0',meta_description text,request_path varchar(250) NOT NULL DEFAULT '0',relate_product text,visit int NOT NULL DEFAULT 0,
    PRIMARY KEY(id)
  ) ENGINE=InnoDB AUTO_INCREMENT=76 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await db.query('CREATE TABLE idv_seller_news(id int NOT NULL PRIMARY KEY) ENGINE=InnoDB');
  await db.query('CREATE TABLE idv_article_category(article_id int NOT NULL,category_id int NOT NULL) ENGINE=InnoDB');
  await db.query(`CREATE TABLE idv_url (
    id int NOT NULL AUTO_INCREMENT,url_type varchar(50) NOT NULL DEFAULT '0',target_path varchar(250) NOT NULL DEFAULT '0',request_path varchar(400) NOT NULL DEFAULT '0',
    request_path_index varchar(50) NOT NULL DEFAULT '0',id_path varchar(250) NOT NULL DEFAULT '0',redirect_code varchar(6) NOT NULL DEFAULT '0',create_time int NOT NULL DEFAULT 0,
    create_by varchar(50) NOT NULL DEFAULT '0',last_update int NOT NULL DEFAULT 0,last_update_by varchar(50) NOT NULL DEFAULT '0',PRIMARY KEY(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await db.query("CREATE TABLE web_admin_menu_items(id bigint NOT NULL PRIMARY KEY,entity_type varchar(100) NOT NULL DEFAULT '',entity_id bigint NULL) ENGINE=InnoDB");
  await db.query('CREATE TABLE web_admin_entity_registry(entity_type varchar(100) NOT NULL,entity_id bigint NOT NULL,PRIMARY KEY(entity_type,entity_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
  await db.query('CREATE TABLE idv_seller_category(id int NOT NULL PRIMARY KEY) ENGINE=InnoDB');
  await db.query('CREATE TABLE idv_brand(id int NOT NULL PRIMARY KEY) ENGINE=InnoDB');
  await db.query('CREATE TABLE idv_sell_product_store(id int NOT NULL PRIMARY KEY) ENGINE=InnoDB');
  await db.query('CREATE TABLE product_data_search(product_id int NOT NULL PRIMARY KEY) ENGINE=InnoDB');
  await db.query('INSERT INTO idv_seller_category VALUES(10)');
  await db.query('INSERT INTO idv_brand VALUES(20)');
  await db.query('INSERT INTO idv_sell_product_store VALUES(30)');
  await db.query('INSERT INTO product_data_search VALUES(30)');

  const { normalizePcmarketArticleCategories, articleCategorySha256 } = await import('../src/lib/legacyImport/pcmarketArticleCategories');
  const { applyArticleCategoryImport, rollbackArticleCategoryImport } = await import('../src/lib/legacyImport/articleCategoryDatabase');
  const raw = [{
    id: 1, url: 'https://pcmarket.vn/tin-cong-nghe.html', name: 'Tin Công Nghệ', summary: '', description: '', image: '',
    parentId: 0, status: 'on', ordering: 0, create_time: '2018-10-02 14:50:57', last_update: '2018-10-02 14:50:57',
    meta_title: '', meta_keyword: '', meta_description: '',
  }];
  const normalized = normalizePcmarketArticleCategories(raw);
  const result = await applyArticleCategoryImport({
    ...normalized,
    snapshotHash: articleCategorySha256(JSON.stringify(raw)),
    sourceUrl: 'https://pcmarket.vn/export/article_category.php',
    expectedDatabase: database,
  });
  const [categoryRows] = await db.query<any[]>('SELECT id,name,url,request_path FROM idv_seller_news_category');
  assert.deepEqual(categoryRows, [{ id: 1, name: 'Tin Công Nghệ', url: 'tin-cong-nghe.html', request_path: '/tin-cong-nghe.html' }]);
  assert.equal((await db.query<any[]>("SELECT COUNT(*) total FROM idv_url WHERE id_path='module:news/view:category/view_id:1'"))[0][0].total, 1);
  assert.equal((await db.query<any[]>("SELECT COUNT(*) total FROM web_admin_import_entity_map WHERE entity='article-category'"))[0][0].total, 1);
  await assert.rejects(() => applyArticleCategoryImport({
    ...normalized,
    snapshotHash: articleCategorySha256(JSON.stringify(raw)),
    sourceUrl: 'https://pcmarket.vn/export/article_category.php',
    expectedDatabase: database,
  }), /not empty/i);
  await rollbackArticleCategoryImport({ runId: result.runId, expectedDatabase: database });
  assert.equal((await db.query<any[]>('SELECT COUNT(*) total FROM idv_seller_news_category'))[0][0].total, 0);
  assert.equal((await db.query<any[]>("SELECT COUNT(*) total FROM idv_url WHERE id_path LIKE 'module:news/view:category/view_id:%'"))[0][0].total, 0);
  assert.equal((await db.query<any[]>("SELECT COUNT(*) total FROM web_admin_import_entity_map WHERE entity='article-category'"))[0][0].total, 0);
  assert.equal((await db.query<any[]>('SELECT COUNT(*) total FROM idv_seller_category'))[0][0].total, 1);
  const { default: importPool } = await import('../src/lib/db');
  await importPool.end();
  await db.end();
});
