import crypto from 'crypto';
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import type { CategoryImportReport, NormalizedCategory } from './pcmarketProductCategories';
import { sha256 } from './pcmarketProductCategories';
import { ensureLegacyImportTables } from './tables';

const LOCK_NAME = 'web_admin:legacy_import:product_categories';
const CATEGORY_ID_PATH_PREFIX = 'module:product/view:category/view_id:';

type Db = Pool | PoolConnection;
type Column = RowDataPacket & {
  COLUMN_NAME: string;
  DATA_TYPE: string;
  COLUMN_TYPE: string;
  IS_NULLABLE: 'YES' | 'NO';
  COLUMN_DEFAULT: string | null;
  EXTRA: string;
  CHARACTER_MAXIMUM_LENGTH: number | null;
};

export type ProductCategoryPreflight = {
  database: string;
  categoryEngine: string;
  currentCategories: number;
  currentCategoryRoutes: number;
  currentProductRelations: number;
  currentAttributeRelations: number;
  routeConflicts: Array<{ requestPath: string; idPath: string }>;
  categoryColumns: string[];
  optionalTables: string[];
};

function quote(identifier: string) {
  if (!/^[a-zA-Z0-9_]+$/.test(identifier)) throw new Error(`Unsafe SQL identifier: ${identifier}`);
  return `\`${identifier}\``;
}

async function databaseName(db: Db) {
  const [rows] = await db.query<RowDataPacket[]>('SELECT DATABASE() AS name');
  const name = String(rows[0]?.name || '');
  if (!name) throw new Error('No MySQL database is selected');
  return name;
}

async function tableNames(db: Db, database: string) {
  const [rows] = await db.query<RowDataPacket[]>(
    'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ?',
    [database],
  );
  return new Set(rows.map((row) => String(row.TABLE_NAME)));
}

async function columnsFor(db: Db, database: string, table: string) {
  const [rows] = await db.query<Column[]>(
    `SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA, CHARACTER_MAXIMUM_LENGTH
     FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION`,
    [database, table],
  );
  return rows;
}

async function count(db: Db, table: string, where = '', values: unknown[] = []) {
  const [rows] = await db.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM ${quote(table)} ${where}`, values);
  return Number(rows[0]?.total || 0);
}

export async function preflightProductCategoryImport(categories: NormalizedCategory[], db: Db = pool): Promise<ProductCategoryPreflight> {
  const database = await databaseName(db);
  const tables = await tableNames(db, database);
  const requiredTables = ['idv_seller_category', 'idv_url', 'idv_product_category', 'idv_attribute_category', 'idv_sell_product_store'];
  const missing = requiredTables.filter((table) => !tables.has(table));
  if (missing.length) throw new Error(`Missing required tables: ${missing.join(', ')}`);

  const [engineRows] = await db.query<RowDataPacket[]>(
    'SELECT ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
    [database, 'idv_seller_category'],
  );
  const categoryEngine = String(engineRows[0]?.ENGINE || '');
  if (!categoryEngine) throw new Error('Cannot determine idv_seller_category engine');

  const categoryColumns = await columnsFor(db, database, 'idv_seller_category');
  const columnNames = new Set(categoryColumns.map((column) => column.COLUMN_NAME));
  const requiredColumns = ['id', 'name', 'parentId', 'url', 'request_path', 'status', 'ordering'];
  const missingColumns = requiredColumns.filter((column) => !columnNames.has(column));
  if (missingColumns.length) throw new Error(`idv_seller_category is missing columns: ${missingColumns.join(', ')}`);

  const mappedColumns = new Set([
    'id', 'name', 'parentId', 'url', 'request_path', 'status', 'ordering', 'summary', 'imgUrl', 'img_big',
    'priceRange', 'static_html', 'is_featured', 'display_option', 'image_background', 'meta_title', 'meta_keyword',
    'meta_description', 'isParent', 'childListId', 'catPath', 'tags', 'create_time', 'last_update', 'sellerId',
    'seller_id', 'productCount', 'product_count', 'visit', 'create_by', 'last_update_by', 'url_hash', 'useImg',
    'toUrl', 'proCount', 'attr_count', 'keyword', 'createDate', 'createBy', 'lastUpdate', 'lastUpdateBy',
    'url_canonical', 'live_support', 'like_count', 'redirect_url', 'template', 'number_display', 'extend',
  ]);
  const unsupportedRequired = categoryColumns.filter((column) =>
    column.IS_NULLABLE === 'NO' && column.COLUMN_DEFAULT === null && !column.EXTRA.toLowerCase().includes('auto_increment') && !mappedColumns.has(column.COLUMN_NAME));
  if (unsupportedRequired.length) {
    throw new Error(`Unsupported required category columns: ${unsupportedRequired.map((column) => column.COLUMN_NAME).join(', ')}`);
  }

  const [dependencyRows] = await db.query<RowDataPacket[]>(
    `SELECT TABLE_NAME, CONSTRAINT_NAME, 'outbound' AS direction
       FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'idv_seller_category' AND REFERENCED_TABLE_NAME IS NOT NULL
     UNION ALL
     SELECT TABLE_NAME, CONSTRAINT_NAME, 'inbound' AS direction
       FROM information_schema.KEY_COLUMN_USAGE
      WHERE REFERENCED_TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME = 'idv_seller_category'`,
    [database, database],
  );
  if (dependencyRows.length) throw new Error(`Foreign keys block atomic category swap: ${dependencyRows.map((row) => `${row.TABLE_NAME}.${row.CONSTRAINT_NAME}`).join(', ')}`);
  const [triggerRows] = await db.query<RowDataPacket[]>(
    'SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = ? AND EVENT_OBJECT_TABLE = ?',
    [database, 'idv_seller_category'],
  );
  if (triggerRows.length) throw new Error(`Triggers block atomic category swap: ${triggerRows.map((row) => row.TRIGGER_NAME).join(', ')}`);

  const routeConflicts: ProductCategoryPreflight['routeConflicts'] = [];
  for (let offset = 0; offset < categories.length; offset += 200) {
    const paths = categories.slice(offset, offset + 200).map((category) => category.requestPath);
    const placeholders = paths.map(() => '?').join(',');
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT request_path, id_path FROM idv_url
       WHERE request_path IN (${placeholders}) AND id_path NOT LIKE ?`,
      [...paths, `${CATEGORY_ID_PATH_PREFIX}%`],
    );
    routeConflicts.push(...rows.map((row) => ({ requestPath: String(row.request_path), idPath: String(row.id_path) })));
  }

  return {
    database,
    categoryEngine,
    currentCategories: await count(db, 'idv_seller_category'),
    currentCategoryRoutes: await count(db, 'idv_url', 'WHERE id_path LIKE ?', [`${CATEGORY_ID_PATH_PREFIX}%`]),
    currentProductRelations: await count(db, 'idv_product_category'),
    currentAttributeRelations: await count(db, 'idv_attribute_category'),
    routeConflicts,
    categoryColumns: categoryColumns.map((column) => column.COLUMN_NAME),
    optionalTables: [...tables].filter((table) => [
      'web_admin_voucher_categories', 'web_admin_vouchers', 'web_admin_product_promotion_categories',
      'web_admin_product_promotions', 'idv_seller_ad_category', 'idv_seller_ad', 'web_admin_menu_items',
      'web_admin_category_feature_boxes', 'web_admin_product_card_attribute_rules', 'web_admin_buying_guides',
      'web_admin_buying_guide_items', 'web_admin_entity_registry', 'web_admin_cache_versions',
    ].includes(table)).sort(),
  };
}

function backupName(runId: number, suffix: string) {
  return `web_admin_import_b_${runId}_${suffix}`;
}

async function createBackupFrom(connection: PoolConnection, name: string, selectSql: string, values: unknown[] = []) {
  await connection.query(`CREATE TABLE ${quote(name)} ENGINE=InnoDB AS ${selectSql}`, values);
}

async function backupWhole(connection: PoolConnection, runId: number, table: string, suffix = table.replace(/^web_admin_|^idv_/, '')) {
  const name = backupName(runId, suffix);
  await connection.query(`CREATE TABLE ${quote(name)} LIKE ${quote(table)}`);
  await connection.query(`INSERT INTO ${quote(name)} SELECT * FROM ${quote(table)}`);
  return name;
}

function valueForColumn(category: NormalizedCategory, column: Column): unknown {
  const source: Record<string, unknown> = {
    id: category.id,
    name: category.name,
    parentId: category.parentId,
    url: category.url,
    request_path: category.requestPath,
    url_hash: crypto.createHash('md5').update(category.url).digest('hex'),
    status: category.status,
    ordering: category.ordering,
    summary: category.summary,
    imgUrl: category.imgUrl,
    useImg: category.imgUrl ? 1 : 0,
    img_big: '',
    priceRange: category.priceRange,
    static_html: category.staticHtml,
    is_featured: 0,
    display_option: 'child_product',
    image_background: '',
    meta_title: category.metaTitle,
    meta_keyword: category.metaKeyword,
    meta_description: category.metaDescription,
    isParent: category.isParent,
    childListId: category.childListId,
    catPath: category.catPath,
    tags: category.tags,
    create_time: category.createTime,
    last_update: category.lastUpdate,
    createDate: category.createTime,
    lastUpdate: category.lastUpdate,
    sellerId: 0,
    seller_id: 0,
    productCount: 0,
    product_count: 0,
    visit: 0,
    toUrl: '',
    proCount: 0,
    attr_count: 0,
    keyword: '',
    createBy: 0,
    lastUpdateBy: 0,
    url_canonical: '',
    live_support: '',
    like_count: 0,
    redirect_url: '',
    template: '',
    number_display: 0,
    extend: '',
    create_by: 'legacy-import',
    last_update_by: 'legacy-import',
  };
  let value = source[column.COLUMN_NAME];
  if (['create_time', 'last_update', 'createDate', 'lastUpdate'].includes(column.COLUMN_NAME) && /^(tiny|small|medium|big)?int$/.test(column.DATA_TYPE)) {
    const timestamp = Date.parse(`${String(value)}+07:00`);
    value = Number.isFinite(timestamp) ? Math.floor(timestamp / 1000) : 0;
  }
  if (typeof value === 'string' && column.CHARACTER_MAXIMUM_LENGTH && value.length > column.CHARACTER_MAXIMUM_LENGTH) {
    throw new Error(`Category ${category.id} exceeds ${column.COLUMN_NAME}(${column.CHARACTER_MAXIMUM_LENGTH})`);
  }
  return value;
}

async function populateStaging(connection: PoolConnection, database: string, staging: string, categories: NormalizedCategory[]) {
  const columns = await columnsFor(connection, database, 'idv_seller_category');
  const known = new Set([
    'id', 'name', 'parentId', 'url', 'request_path', 'status', 'ordering', 'summary', 'imgUrl', 'img_big',
    'priceRange', 'static_html', 'is_featured', 'display_option', 'image_background', 'meta_title', 'meta_keyword',
    'meta_description', 'isParent', 'childListId', 'catPath', 'tags', 'create_time', 'last_update', 'sellerId',
    'seller_id', 'productCount', 'product_count', 'visit', 'create_by', 'last_update_by', 'url_hash', 'useImg',
    'toUrl', 'proCount', 'attr_count', 'keyword', 'createDate', 'createBy', 'lastUpdate', 'lastUpdateBy',
    'url_canonical', 'live_support', 'like_count', 'redirect_url', 'template', 'number_display', 'extend',
  ]);
  const insertColumns = columns.filter((column) => known.has(column.COLUMN_NAME));
  const columnSql = insertColumns.map((column) => quote(column.COLUMN_NAME)).join(',');
  for (let offset = 0; offset < categories.length; offset += 50) {
    const batch = categories.slice(offset, offset + 50);
    const placeholders = batch.map(() => `(${insertColumns.map(() => '?').join(',')})`).join(',');
    const values = batch.flatMap((category) => insertColumns.map((column) => valueForColumn(category, column)));
    await connection.query(`INSERT INTO ${quote(staging)} (${columnSql}) VALUES ${placeholders}`, values);
  }
  const total = await count(connection, staging);
  if (total !== categories.length) throw new Error(`Staging count mismatch: ${total}/${categories.length}`);
  const [stats] = await connection.query<RowDataPacket[]>(
    `SELECT COUNT(DISTINCT id) AS unique_ids, SUM(parentId=0) AS roots, SUM(status=1) AS enabled, SUM(status=0) AS disabled FROM ${quote(staging)}`,
  );
  if (Number(stats[0]?.unique_ids) !== categories.length) throw new Error('Staging contains duplicate IDs');
}

async function tableExists(connection: PoolConnection, database: string, table: string) {
  const [rows] = await connection.query<RowDataPacket[]>(
    'SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? LIMIT 1',
    [database, table],
  );
  return rows.length > 0;
}

async function backupDependencies(connection: PoolConnection, database: string, runId: number) {
  await backupWhole(connection, runId, 'idv_product_category', 'product_category');
  await backupWhole(connection, runId, 'idv_attribute_category', 'attribute_category');
  await createBackupFrom(connection, backupName(runId, 'product_cat'), 'SELECT id, product_cat FROM idv_sell_product_store');
  if (await tableExists(connection, database, 'web_admin_voucher_categories')) {
    await backupWhole(connection, runId, 'web_admin_voucher_categories', 'voucher_categories');
    await createBackupFrom(connection, backupName(runId, 'voucher_status'),
      'SELECT id, status FROM web_admin_vouchers WHERE id IN (SELECT DISTINCT voucher_id FROM web_admin_voucher_categories)');
  }
  if (await tableExists(connection, database, 'web_admin_product_promotion_categories')) {
    await backupWhole(connection, runId, 'web_admin_product_promotion_categories', 'promotion_categories');
    await createBackupFrom(connection, backupName(runId, 'promotion_status'),
      'SELECT id, status FROM web_admin_product_promotions WHERE id IN (SELECT DISTINCT promotion_id FROM web_admin_product_promotion_categories)');
  }
  if (await tableExists(connection, database, 'idv_seller_ad_category')) {
    await backupWhole(connection, runId, 'idv_seller_ad_category', 'ad_category');
    await createBackupFrom(connection, backupName(runId, 'ads'),
      'SELECT a.* FROM idv_seller_ad a WHERE a.id IN (SELECT DISTINCT adId FROM idv_seller_ad_category)');
  }
  if (await tableExists(connection, database, 'web_admin_menu_items')) {
    await createBackupFrom(connection, backupName(runId, 'menu_items'), "SELECT * FROM web_admin_menu_items WHERE entity_type='product-category'");
  }
  for (const [table, suffix] of [
    ['web_admin_category_feature_boxes', 'feature_boxes'],
    ['web_admin_product_card_attribute_rules', 'attribute_rules'],
  ] as const) {
    if (await tableExists(connection, database, table)) {
      await backupWhole(connection, runId, table, suffix);
    }
  }
  if (await tableExists(connection, database, 'web_admin_buying_guides')) {
    await createBackupFrom(connection, backupName(runId, 'buying_guides'), "SELECT * FROM web_admin_buying_guides WHERE entity_type='product_category'");
    if (await tableExists(connection, database, 'web_admin_buying_guide_items')) {
      await createBackupFrom(connection, backupName(runId, 'buying_guide_items'),
        "SELECT i.* FROM web_admin_buying_guide_items i JOIN web_admin_buying_guides g ON g.id=i.guide_id WHERE g.entity_type='product_category'");
    }
  }
  if (await tableExists(connection, database, 'web_admin_entity_registry')) {
    await createBackupFrom(connection, backupName(runId, 'entity_registry'), "SELECT * FROM web_admin_entity_registry WHERE entity_type='product-category'");
  }
}

async function detachDependencies(connection: PoolConnection, database: string) {
  await connection.query('DELETE FROM idv_product_category');
  await connection.query('DELETE FROM idv_attribute_category');
  await connection.query("UPDATE idv_sell_product_store SET product_cat = ''");
  if (await tableExists(connection, database, 'web_admin_voucher_categories')) {
    await connection.query('UPDATE web_admin_vouchers SET status=0 WHERE id IN (SELECT DISTINCT voucher_id FROM web_admin_voucher_categories)');
    await connection.query('DELETE FROM web_admin_voucher_categories');
  }
  if (await tableExists(connection, database, 'web_admin_product_promotion_categories')) {
    await connection.query('UPDATE web_admin_product_promotions SET status=0 WHERE id IN (SELECT DISTINCT promotion_id FROM web_admin_product_promotion_categories)');
    await connection.query('DELETE FROM web_admin_product_promotion_categories');
  }
  if (await tableExists(connection, database, 'idv_seller_ad_category')) {
    await connection.query("UPDATE idv_seller_ad SET status=0, category_list='' WHERE id IN (SELECT DISTINCT adId FROM idv_seller_ad_category)");
    await connection.query('DELETE FROM idv_seller_ad_category');
  }
  if (await tableExists(connection, database, 'web_admin_menu_items')) {
    await connection.query("UPDATE web_admin_menu_items SET is_active=0 WHERE entity_type='product-category'");
  }
  for (const table of ['web_admin_category_feature_boxes', 'web_admin_product_card_attribute_rules']) {
    if (await tableExists(connection, database, table)) await connection.query(`DELETE FROM ${quote(table)}`);
  }
  if (await tableExists(connection, database, 'web_admin_buying_guides')) {
    await connection.query("DELETE FROM web_admin_buying_guides WHERE entity_type='product_category'");
  }
  if (await tableExists(connection, database, 'web_admin_entity_registry')) {
    await connection.query("DELETE FROM web_admin_entity_registry WHERE entity_type='product-category'");
  }
}

async function insertRoutes(connection: PoolConnection, categories: NormalizedCategory[]) {
  for (let offset = 0; offset < categories.length; offset += 100) {
    const batch = categories.slice(offset, offset + 100);
    const values = batch.flatMap((category) => [
      category.requestPath,
      crypto.createHash('md5').update(category.requestPath).digest('hex'),
      `${CATEGORY_ID_PATH_PREFIX}${category.id}`,
      '',
      '',
    ]);
    await connection.query(
      `INSERT INTO idv_url (request_path,request_path_index,id_path,target_path,redirect_code) VALUES ${batch.map(() => '(?,?,?,?,?)').join(',')}`,
      values,
    );
  }
}

async function bumpCaches(connection: PoolConnection, database: string) {
  if (!await tableExists(connection, database, 'web_admin_cache_versions')) return;
  for (const key of ['public_products', 'public_catalog_details', 'catalog', 'search', 'menus', 'banners']) {
    await connection.query(
      'INSERT INTO web_admin_cache_versions(cache_key,version) VALUES(?,2) ON DUPLICATE KEY UPDATE version=version+1',
      [key],
    );
  }
}

export async function applyProductCategoryImport(input: {
  categories: NormalizedCategory[];
  report: CategoryImportReport;
  snapshotHash: string;
  sourceUrl: string;
  expectedDatabase: string;
}) {
  if (process.env.ADMIN_WRITE_ENABLED !== 'true') throw new Error('ADMIN_WRITE_ENABLED=true is required for apply');
  if (!/^[a-f0-9]{64}$/.test(input.snapshotHash)) throw new Error('A valid SHA-256 snapshot hash is required for apply');
  const connection = await pool.getConnection();
  let runId = 0;
  let lockHeld = false;
  try {
    const database = await databaseName(connection);
    if (database !== input.expectedDatabase) throw new Error(`Database mismatch: connected to ${database}, expected ${input.expectedDatabase}`);
    const [lockRows] = await connection.query<RowDataPacket[]>('SELECT GET_LOCK(?, 0) AS acquired', [LOCK_NAME]);
    lockHeld = Number(lockRows[0]?.acquired) === 1;
    if (!lockHeld) throw new Error('Another product-category import is running');
    const preflight = await preflightProductCategoryImport(input.categories, connection);
    if (preflight.routeConflicts.length) throw new Error(`Route conflicts block apply: ${JSON.stringify(preflight.routeConflicts)}`);
    await ensureLegacyImportTables(connection);
    const [runResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO web_admin_import_runs(source,entity,source_url,snapshot_hash,status,item_count,report_json)
       VALUES('pcmarket','product-categories',?,?,'applying',?,?)`,
      [input.sourceUrl, input.snapshotHash, input.categories.length, JSON.stringify({ ...input.report, preflight })],
    );
    runId = Number(runResult.insertId);
    const staging = `web_admin_import_stage_${runId}_category`;
    const oldCategory = backupName(runId, 'category');
    await connection.query(`CREATE TABLE ${quote(staging)} LIKE idv_seller_category`);
    await populateStaging(connection, database, staging, input.categories);

    await createBackupFrom(connection, backupName(runId, 'url'), 'SELECT * FROM idv_url WHERE id_path LIKE ?', [`${CATEGORY_ID_PATH_PREFIX}%`]);
    await backupDependencies(connection, database, runId);
    await connection.query(`RENAME TABLE idv_seller_category TO ${quote(oldCategory)}, ${quote(staging)} TO idv_seller_category`);
    await detachDependencies(connection, database);
    await connection.query('DELETE FROM idv_url WHERE id_path LIKE ?', [`${CATEGORY_ID_PATH_PREFIX}%`]);
    await insertRoutes(connection, input.categories);

    for (const category of input.categories) {
      const normalizedJson = JSON.stringify(category);
      const relationStatus = category.attributes.length ? 'pending' : 'none';
      await connection.query(
        `INSERT INTO web_admin_import_records(run_id,entity,source_id,target_id,payload_hash,normalized_json,relation_status)
         VALUES(?,'product-category',?,?,?,?,?)`,
        [runId, String(category.id), String(category.id), sha256(normalizedJson), normalizedJson, relationStatus],
      );
      await connection.query(
        `INSERT INTO web_admin_import_entity_map(source,entity,source_id,target_id,source_hash,last_run_id)
         VALUES('pcmarket','product-category',?,?,?,?)
         ON DUPLICATE KEY UPDATE target_id=VALUES(target_id),source_hash=VALUES(source_hash),last_run_id=VALUES(last_run_id)`,
        [String(category.id), String(category.id), sha256(normalizedJson), runId],
      );
    }
    await bumpCaches(connection, database);
    await connection.query("UPDATE web_admin_import_runs SET status='applied',completed_at=NOW() WHERE id=?", [runId]);
    return { runId, preflight, backupTable: oldCategory };
  } catch (error) {
    if (runId) {
      await connection.query("UPDATE web_admin_import_runs SET status='apply_failed',error_message=?,completed_at=NOW() WHERE id=?", [String(error instanceof Error ? error.message : error).slice(0, 2000), runId]).catch(() => undefined);
    }
    throw error;
  } finally {
    if (lockHeld) await connection.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]).catch(() => undefined);
    connection.release();
  }
}

async function restoreWhole(connection: PoolConnection, runId: number, target: string, suffix: string) {
  const backup = backupName(runId, suffix);
  await connection.query(`DELETE FROM ${quote(target)}`);
  await connection.query(`INSERT INTO ${quote(target)} SELECT * FROM ${quote(backup)}`);
}

async function backupExists(connection: PoolConnection, database: string, runId: number, suffix: string) {
  return tableExists(connection, database, backupName(runId, suffix));
}

export async function rollbackProductCategoryImport(input: { runId: number; expectedDatabase: string }) {
  if (process.env.ADMIN_WRITE_ENABLED !== 'true') throw new Error('ADMIN_WRITE_ENABLED=true is required for rollback');
  const connection = await pool.getConnection();
  let lockHeld = false;
  try {
    const database = await databaseName(connection);
    if (database !== input.expectedDatabase) throw new Error(`Database mismatch: connected to ${database}, expected ${input.expectedDatabase}`);
    const [lockRows] = await connection.query<RowDataPacket[]>('SELECT GET_LOCK(?, 0) AS acquired', [LOCK_NAME]);
    lockHeld = Number(lockRows[0]?.acquired) === 1;
    if (!lockHeld) throw new Error('Another product-category import is running');
    const [runs] = await connection.query<RowDataPacket[]>(
      "SELECT status FROM web_admin_import_runs WHERE id=? AND source='pcmarket' AND entity='product-categories' LIMIT 1",
      [input.runId],
    );
    if (!['applied', 'apply_failed'].includes(String(runs[0]?.status || ''))) {
      throw new Error(`Run ${input.runId} is not in applied/apply_failed state`);
    }
    const categoryBackup = backupName(input.runId, 'category');
    if (!await tableExists(connection, database, categoryBackup)) throw new Error(`Category backup is missing for run ${input.runId}`);
    await connection.query("UPDATE web_admin_import_runs SET status='rolling_back',completed_at=NULL,error_message='' WHERE id=?", [input.runId]);

    const imported = backupName(input.runId, 'imported_category');
    const restoreCategory = `web_admin_import_restore_${input.runId}_category`;
    await connection.query(`CREATE TABLE ${quote(restoreCategory)} LIKE ${quote(categoryBackup)}`);
    await connection.query(`INSERT INTO ${quote(restoreCategory)} SELECT * FROM ${quote(categoryBackup)}`);
    await connection.query(`RENAME TABLE idv_seller_category TO ${quote(imported)}, ${quote(restoreCategory)} TO idv_seller_category`);
    await connection.query('DELETE FROM idv_url WHERE id_path LIKE ?', [`${CATEGORY_ID_PATH_PREFIX}%`]);
    await connection.query(`INSERT INTO idv_url SELECT * FROM ${quote(backupName(input.runId, 'url'))}`);
    await restoreWhole(connection, input.runId, 'idv_product_category', 'product_category');
    await restoreWhole(connection, input.runId, 'idv_attribute_category', 'attribute_category');
    await connection.query(`UPDATE idv_sell_product_store p JOIN ${quote(backupName(input.runId, 'product_cat'))} b ON b.id=p.id SET p.product_cat=b.product_cat`);

    if (await backupExists(connection, database, input.runId, 'voucher_categories')) {
      await restoreWhole(connection, input.runId, 'web_admin_voucher_categories', 'voucher_categories');
      await connection.query(`UPDATE web_admin_vouchers v JOIN ${quote(backupName(input.runId, 'voucher_status'))} b ON b.id=v.id SET v.status=b.status`);
    }
    if (await backupExists(connection, database, input.runId, 'promotion_categories')) {
      await restoreWhole(connection, input.runId, 'web_admin_product_promotion_categories', 'promotion_categories');
      await connection.query(`UPDATE web_admin_product_promotions p JOIN ${quote(backupName(input.runId, 'promotion_status'))} b ON b.id=p.id SET p.status=b.status`);
    }
    if (await backupExists(connection, database, input.runId, 'ad_category')) {
      await restoreWhole(connection, input.runId, 'idv_seller_ad_category', 'ad_category');
      const ads = backupName(input.runId, 'ads');
      await connection.query(`DELETE a FROM idv_seller_ad a JOIN ${quote(ads)} b ON b.id=a.id`);
      await connection.query(`INSERT INTO idv_seller_ad SELECT * FROM ${quote(ads)}`);
    }
    if (await backupExists(connection, database, input.runId, 'menu_items')) {
      const menu = backupName(input.runId, 'menu_items');
      await connection.query(`DELETE m FROM web_admin_menu_items m JOIN ${quote(menu)} b ON b.id=m.id`);
      await connection.query(`INSERT INTO web_admin_menu_items SELECT * FROM ${quote(menu)}`);
    }
    for (const [table, suffix] of [
      ['web_admin_category_feature_boxes', 'feature_boxes'],
      ['web_admin_product_card_attribute_rules', 'attribute_rules'],
    ] as const) {
      if (await backupExists(connection, database, input.runId, suffix)) await restoreWhole(connection, input.runId, table, suffix);
    }
    if (await backupExists(connection, database, input.runId, 'buying_guides')) {
      await connection.query("DELETE FROM web_admin_buying_guides WHERE entity_type='product_category'");
      await connection.query(`INSERT INTO web_admin_buying_guides SELECT * FROM ${quote(backupName(input.runId, 'buying_guides'))}`);
      if (await backupExists(connection, database, input.runId, 'buying_guide_items')) {
        await connection.query(`INSERT INTO web_admin_buying_guide_items SELECT * FROM ${quote(backupName(input.runId, 'buying_guide_items'))}`);
      }
    }
    if (await backupExists(connection, database, input.runId, 'entity_registry')) {
      await connection.query("DELETE FROM web_admin_entity_registry WHERE entity_type='product-category'");
      await connection.query(`INSERT INTO web_admin_entity_registry SELECT * FROM ${quote(backupName(input.runId, 'entity_registry'))}`);
    }
    await bumpCaches(connection, database);
    await connection.query("UPDATE web_admin_import_runs SET status='rolled_back',completed_at=NOW() WHERE id=?", [input.runId]);
    return { runId: input.runId, restoredCategoryTable: 'idv_seller_category', retainedImportedTable: imported };
  } catch (error) {
    await connection.query("UPDATE web_admin_import_runs SET status='rollback_failed',error_message=?,completed_at=NOW() WHERE id=?", [String(error instanceof Error ? error.message : error).slice(0, 2000), input.runId]).catch(() => undefined);
    throw error;
  } finally {
    if (lockHeld) await connection.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]).catch(() => undefined);
    connection.release();
  }
}
