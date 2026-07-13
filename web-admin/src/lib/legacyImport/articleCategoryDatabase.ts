import crypto from 'node:crypto';
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { ensureLegacyImportTables } from './tables';
import {
  articleCategorySha256,
  type ArticleCategoryImportReport,
  type NormalizedArticleCategory,
} from './pcmarketArticleCategories';

const LOCK_NAME = 'web_admin:legacy_import:article_categories';
const PRIMARY_ROUTE_PREFIX = 'module:news/view:category/view_id:';
const ALIAS_ROUTE_PREFIX = 'module:article/view:category/view_id:';
const ENTITY = 'article-categories';
const RECORD_ENTITY = 'article-category';
type Db = Pool | PoolConnection;

type DatabaseInvariant = {
  productCategories: number;
  brands: number;
  products: number;
  searchRows: number;
  fulltextIndexes: number;
  routines: number;
  triggers: number;
};

export type ArticleCategoryPreflight = {
  database: string;
  engine: string;
  tableCollation: string;
  autoIncrement: number;
  currentCategories: number;
  currentArticles: number;
  currentArticleLinks: number;
  currentMenuReferences: number;
  currentCategoryRoutes: number;
  currentRegistryRows: number;
  idConflicts: number[];
  routeConflicts: Array<{ requestPath: string; idPath: string }>;
  foreignKeys: string[];
  triggers: string[];
  invariant: DatabaseInvariant;
};

function quote(identifier: string) {
  if (!/^[a-zA-Z0-9_]+$/.test(identifier)) throw new Error(`Unsafe identifier: ${identifier}`);
  return `\`${identifier}\``;
}

async function databaseName(db: Db) {
  const [rows] = await db.query<RowDataPacket[]>('SELECT DATABASE() AS name');
  const name = String(rows[0]?.name || '');
  if (!name) throw new Error('No database is selected');
  return name;
}

async function tableNames(db: Db, database: string) {
  const [rows] = await db.query<RowDataPacket[]>('SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=?', [database]);
  return new Set(rows.map((row) => String(row.TABLE_NAME)));
}

async function exactCount(db: Db, table: string, where = '', values: unknown[] = []) {
  const [rows] = await db.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM ${quote(table)}${where ? ` WHERE ${where}` : ''}`, values);
  return Number(rows[0]?.total || 0);
}

async function invariant(db: Db, database: string): Promise<DatabaseInvariant> {
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT
      (SELECT COUNT(*) FROM idv_seller_category) AS product_categories,
      (SELECT COUNT(*) FROM idv_brand) AS brands,
      (SELECT COUNT(*) FROM idv_sell_product_store) AS products,
      (SELECT COUNT(*) FROM product_data_search) AS search_rows,
      (SELECT COUNT(*) FROM (
        SELECT TABLE_NAME,INDEX_NAME FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA=? AND INDEX_TYPE='FULLTEXT' GROUP BY TABLE_NAME,INDEX_NAME
      ) fulltext_rows) AS fulltext_indexes,
      (SELECT COUNT(*) FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA=?) AS routines,
      (SELECT COUNT(*) FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=?) AS triggers
  `, [database, database, database]);
  const row = rows[0] || {};
  return {
    productCategories: Number(row.product_categories || 0),
    brands: Number(row.brands || 0),
    products: Number(row.products || 0),
    searchRows: Number(row.search_rows || 0),
    fulltextIndexes: Number(row.fulltext_indexes || 0),
    routines: Number(row.routines || 0),
    triggers: Number(row.triggers || 0),
  };
}

export async function preflightArticleCategoryImport(categories: NormalizedArticleCategory[], db: Db = pool): Promise<ArticleCategoryPreflight> {
  const database = await databaseName(db);
  const tables = await tableNames(db, database);
  const required = [
    'idv_seller_news_category', 'idv_seller_news', 'idv_article_category', 'idv_url', 'web_admin_menu_items',
    'web_admin_entity_registry', 'idv_seller_category', 'idv_brand', 'idv_sell_product_store', 'product_data_search',
  ];
  const missing = required.filter((table) => !tables.has(table));
  if (missing.length) throw new Error(`Missing required tables: ${missing.join(', ')}`);

  // MySQL caches information_schema table statistics. A freshly restored clone can
  // otherwise report the pre-restore AUTO_INCREMENT even though SHOW CREATE TABLE
  // already contains the correct value from the dump.
  await db.query('SET SESSION information_schema_stats_expiry=0');
  const [tableRows] = await db.query<RowDataPacket[]>(`
    SELECT ENGINE,TABLE_COLLATION,AUTO_INCREMENT FROM information_schema.TABLES
    WHERE TABLE_SCHEMA=? AND TABLE_NAME='idv_seller_news_category'
  `, [database]);
  const engine = String(tableRows[0]?.ENGINE || '');
  const tableCollation = String(tableRows[0]?.TABLE_COLLATION || '');
  const autoIncrement = Number(tableRows[0]?.AUTO_INCREMENT || 0);
  if (engine !== 'InnoDB') throw new Error(`idv_seller_news_category must use InnoDB, found ${engine}`);
  if (tableCollation !== 'utf8mb4_unicode_ci') throw new Error(`idv_seller_news_category must use utf8mb4_unicode_ci, found ${tableCollation}`);

  const ids = categories.map((category) => category.id);
  const paths = categories.map((category) => category.requestPath);
  let idConflicts: number[] = [];
  if (ids.length) {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT id FROM idv_seller_news_category WHERE id IN (${ids.map(() => '?').join(',')}) ORDER BY id`, ids,
    );
    idConflicts = rows.map((row) => Number(row.id));
  }
  const routeConflicts: ArticleCategoryPreflight['routeConflicts'] = [];
  if (paths.length) {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT request_path,id_path FROM idv_url WHERE request_path IN (${paths.map(() => '?').join(',')}) ORDER BY request_path,id_path`, paths,
    );
    routeConflicts.push(...rows.map((row) => ({ requestPath: String(row.request_path), idPath: String(row.id_path) })));
  }
  const [foreignKeyRows] = await db.query<RowDataPacket[]>(`
    SELECT TABLE_NAME,CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
    WHERE (TABLE_SCHEMA=? AND TABLE_NAME='idv_seller_news_category' AND REFERENCED_TABLE_NAME IS NOT NULL)
       OR (REFERENCED_TABLE_SCHEMA=? AND REFERENCED_TABLE_NAME='idv_seller_news_category')
    ORDER BY TABLE_NAME,CONSTRAINT_NAME
  `, [database, database]);
  const [triggerRows] = await db.query<RowDataPacket[]>(`
    SELECT TRIGGER_NAME FROM information_schema.TRIGGERS
    WHERE TRIGGER_SCHEMA=? AND EVENT_OBJECT_TABLE='idv_seller_news_category' ORDER BY TRIGGER_NAME
  `, [database]);

  return {
    database,
    engine,
    tableCollation,
    autoIncrement,
    currentCategories: await exactCount(db, 'idv_seller_news_category'),
    currentArticles: await exactCount(db, 'idv_seller_news'),
    currentArticleLinks: await exactCount(db, 'idv_article_category'),
    currentMenuReferences: await exactCount(db, 'web_admin_menu_items', "entity_type='article-category'"),
    currentCategoryRoutes: await exactCount(db, 'idv_url', '(id_path LIKE ? OR id_path LIKE ?)', [`${PRIMARY_ROUTE_PREFIX}%`, `${ALIAS_ROUTE_PREFIX}%`]),
    currentRegistryRows: await exactCount(db, 'web_admin_entity_registry', 'entity_type=?', [RECORD_ENTITY]),
    idConflicts,
    routeConflicts,
    foreignKeys: foreignKeyRows.map((row) => `${row.TABLE_NAME}.${row.CONSTRAINT_NAME}`),
    triggers: triggerRows.map((row) => String(row.TRIGGER_NAME)),
    invariant: await invariant(db, database),
  };
}

function assertInitialTarget(preflight: ArticleCategoryPreflight) {
  const occupied = {
    categories: preflight.currentCategories,
    articles: preflight.currentArticles,
    links: preflight.currentArticleLinks,
    menuReferences: preflight.currentMenuReferences,
    categoryRoutes: preflight.currentCategoryRoutes,
    registryRows: preflight.currentRegistryRows,
  };
  if (Object.values(occupied).some((value) => value !== 0)) throw new Error(`Initial article-category target is not empty: ${JSON.stringify(occupied)}`);
  if (preflight.idConflicts.length || preflight.routeConflicts.length) throw new Error('Article-category ID or route conflicts block apply');
  if (preflight.foreignKeys.length || preflight.triggers.length) throw new Error('Article-category foreign keys or triggers require manual review');
  if (preflight.autoIncrement < 76) throw new Error(`Unexpected article-category AUTO_INCREMENT: ${preflight.autoIncrement}/76`);
}

function backupName(runId: number, suffix: string) {
  return `web_admin_import_b_${runId}_${suffix}`;
}

async function backupWhole(connection: PoolConnection, runId: number, table: string, suffix: string) {
  const backup = backupName(runId, suffix);
  await connection.query(`CREATE TABLE ${quote(backup)} LIKE ${quote(table)}`);
  await connection.query(`INSERT INTO ${quote(backup)} SELECT * FROM ${quote(table)}`);
  return backup;
}

async function backupSubset(connection: PoolConnection, runId: number, suffix: string, selectSql: string, values: unknown[] = []) {
  const backup = backupName(runId, suffix);
  await connection.query(`CREATE TABLE ${quote(backup)} ENGINE=InnoDB AS ${selectSql}`, values);
  return backup;
}

function requestPathIndex(slug: string) {
  return crypto.createHash('md5').update(slug).digest('hex');
}

async function insertCategory(connection: PoolConnection, category: NormalizedArticleCategory) {
  await connection.query(`
    INSERT INTO idv_seller_news_category
      (id,type,catPath,childListId,sellerId,url,url_hash,name,summary,description,isParent,imgUrl,parentId,status,ordering,
       item_count,display_option,createDate,createBy,lastUpdate,lastUpdateBy,meta_title,meta_keyword,meta_description,
       request_path,relate_product,visit)
    VALUES (?,'article',?,?,0,?,?,?,?,?,?,?, ?,?,?,0,'article',?,0,?,0,?,?,?,?,NULL,0)
  `, [
    category.id, category.catPath, category.childListId, category.slug, requestPathIndex(category.slug), category.name,
    category.summary, category.description, category.isParent, category.imageUrl, category.parentId, category.status,
    category.ordering, category.createDate, category.lastUpdate, category.metaTitle, category.metaKeyword,
    category.metaDescription, category.requestPath,
  ]);
}

async function verifyApplied(connection: PoolConnection, input: {
  categories: NormalizedArticleCategory[];
  runId: number;
  autoIncrement: number;
  invariant: DatabaseInvariant;
}) {
  const [rows] = await connection.query<RowDataPacket[]>(`
    SELECT id,name,url,request_path,parentId,status,ordering,summary,description,imgUrl,
           DATE_FORMAT(createDate,'%Y-%m-%d %H:%i:%s') AS createDate,
           DATE_FORMAT(lastUpdate,'%Y-%m-%d %H:%i:%s') AS lastUpdate,
           meta_title,meta_keyword,meta_description,catPath,childListId,isParent,item_count,type,display_option
    FROM idv_seller_news_category ORDER BY id
  `);
  if (rows.length !== input.categories.length) throw new Error(`Post-apply category count mismatch: ${rows.length}/${input.categories.length}`);
  for (let index = 0; index < input.categories.length; index += 1) {
    const expected = input.categories[index];
    const row = rows[index];
    const actual = {
      id: Number(row.id), name: String(row.name), slug: String(row.url), requestPath: String(row.request_path),
      parentId: Number(row.parentId), status: Number(row.status), ordering: Number(row.ordering), summary: String(row.summary || ''),
      description: String(row.description || ''), imageUrl: String(row.imgUrl || ''), createDate: String(row.createDate),
      lastUpdate: String(row.lastUpdate), metaTitle: String(row.meta_title || ''), metaKeyword: String(row.meta_keyword || ''),
      metaDescription: String(row.meta_description || ''), catPath: String(row.catPath || ''), childListId: String(row.childListId || ''),
      isParent: Number(row.isParent), itemCount: Number(row.item_count), type: String(row.type), displayOption: String(row.display_option),
    };
    const wanted = {
      id: expected.id, name: expected.name, slug: expected.slug, requestPath: expected.requestPath,
      parentId: expected.parentId, status: expected.status, ordering: expected.ordering, summary: expected.summary,
      description: expected.description, imageUrl: expected.imageUrl, createDate: expected.createDate,
      lastUpdate: expected.lastUpdate, metaTitle: expected.metaTitle, metaKeyword: expected.metaKeyword,
      metaDescription: expected.metaDescription, catPath: expected.catPath, childListId: expected.childListId,
      isParent: expected.isParent, itemCount: 0, type: 'article', displayOption: 'article',
    };
    if (JSON.stringify(actual) !== JSON.stringify(wanted)) throw new Error(`Post-apply category mismatch for ${expected.id}`);
  }
  const routes = await exactCount(connection, 'idv_url', 'id_path LIKE ?', [`${PRIMARY_ROUTE_PREFIX}%`]);
  const aliases = await exactCount(connection, 'idv_url', 'id_path LIKE ?', [`${ALIAS_ROUTE_PREFIX}%`]);
  const registry = await exactCount(connection, 'web_admin_entity_registry', 'entity_type=?', [RECORD_ENTITY]);
  const records = await exactCount(connection, 'web_admin_import_records', 'run_id=? AND entity=?', [input.runId, RECORD_ENTITY]);
  const maps = await exactCount(connection, 'web_admin_import_entity_map', 'source=? AND entity=?', ['pcmarket', RECORD_ENTITY]);
  if (routes !== input.categories.length || aliases !== 0 || registry !== input.categories.length
      || records !== input.categories.length || maps !== input.categories.length) {
    throw new Error(`Post-apply relation mismatch: routes=${routes} aliases=${aliases} registry=${registry} records=${records} maps=${maps}`);
  }
  await connection.query('SET SESSION information_schema_stats_expiry=0');
  const [tableRows] = await connection.query<RowDataPacket[]>(`
    SELECT AUTO_INCREMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='idv_seller_news_category'
  `);
  if (Number(tableRows[0]?.AUTO_INCREMENT || 0) < input.autoIncrement) throw new Error('Article-category AUTO_INCREMENT moved backwards');
  if (JSON.stringify(await invariant(connection, await databaseName(connection))) !== JSON.stringify(input.invariant)) {
    throw new Error('Product/catalog database invariant changed during article-category import');
  }
}

export async function applyArticleCategoryImport(input: {
  categories: NormalizedArticleCategory[];
  report: ArticleCategoryImportReport;
  snapshotHash: string;
  sourceUrl: string;
  expectedDatabase: string;
}) {
  if (process.env.ADMIN_WRITE_ENABLED !== 'true') throw new Error('ADMIN_WRITE_ENABLED=true is required for apply');
  if (!/^[a-f0-9]{64}$/.test(input.snapshotHash)) throw new Error('A valid SHA-256 snapshot hash is required for apply');
  const connection = await pool.getConnection();
  let lockHeld = false;
  let runId = 0;
  let transactionStarted = false;
  try {
    const database = await databaseName(connection);
    if (database !== input.expectedDatabase) throw new Error(`Database mismatch: connected to ${database}, expected ${input.expectedDatabase}`);
    const [lockRows] = await connection.query<RowDataPacket[]>('SELECT GET_LOCK(?,0) AS acquired', [LOCK_NAME]);
    lockHeld = Number(lockRows[0]?.acquired) === 1;
    if (!lockHeld) throw new Error('Another article-category import is running');
    const preflight = await preflightArticleCategoryImport(input.categories, connection);
    assertInitialTarget(preflight);
    await ensureLegacyImportTables(connection);
    const [runResult] = await connection.query<ResultSetHeader>(`
      INSERT INTO web_admin_import_runs(source,entity,source_url,snapshot_hash,status,item_count,report_json)
      VALUES('pcmarket',?,?,?,'applying',?,?)
    `, [ENTITY, input.sourceUrl, input.snapshotHash, input.categories.length, JSON.stringify({ ...input.report, preflight })]);
    runId = Number(runResult.insertId);
    const backups = {
      category: await backupWhole(connection, runId, 'idv_seller_news_category', 'article_category'),
      url: await backupSubset(connection, runId, 'article_category_url',
        'SELECT * FROM idv_url WHERE id_path LIKE ? OR id_path LIKE ?', [`${PRIMARY_ROUTE_PREFIX}%`, `${ALIAS_ROUTE_PREFIX}%`]),
      registry: await backupSubset(connection, runId, 'article_category_registry',
        'SELECT * FROM web_admin_entity_registry WHERE entity_type=?', [RECORD_ENTITY]),
      map: await backupSubset(connection, runId, 'article_category_map',
        'SELECT * FROM web_admin_import_entity_map WHERE source=? AND entity=?', ['pcmarket', RECORD_ENTITY]),
    };
    assertInitialTarget(await preflightArticleCategoryImport(input.categories, connection));
    await connection.beginTransaction();
    transactionStarted = true;
    for (const category of input.categories) {
      await insertCategory(connection, category);
      await connection.query(`
        INSERT INTO idv_url(request_path,request_path_index,id_path,target_path,redirect_code)
        VALUES(?,?,?,'','')
      `, [category.requestPath, requestPathIndex(category.slug), `${PRIMARY_ROUTE_PREFIX}${category.id}`]);
      await connection.query('INSERT INTO web_admin_entity_registry(entity_type,entity_id) VALUES(?,?)', [RECORD_ENTITY, category.id]);
      const normalizedJson = JSON.stringify(category);
      const payloadHash = articleCategorySha256(normalizedJson);
      await connection.query(`
        INSERT INTO web_admin_import_records(run_id,entity,source_id,target_id,payload_hash,normalized_json,relation_status)
        VALUES(?,?,?,?,?,?,'none')
      `, [runId, RECORD_ENTITY, String(category.id), String(category.id), payloadHash, normalizedJson]);
      await connection.query(`
        INSERT INTO web_admin_import_entity_map(source,entity,source_id,target_id,source_hash,last_run_id)
        VALUES('pcmarket',?,?,?,?,?)
      `, [RECORD_ENTITY, String(category.id), String(category.id), payloadHash, runId]);
    }
    await connection.query("UPDATE web_admin_import_runs SET status='applied',completed_at=NOW() WHERE id=?", [runId]);
    await verifyApplied(connection, { categories: input.categories, runId, autoIncrement: preflight.autoIncrement, invariant: preflight.invariant });
    await connection.commit();
    transactionStarted = false;
    return { runId, preflight, backups };
  } catch (error) {
    if (transactionStarted) await connection.rollback().catch(() => undefined);
    if (runId) {
      await connection.query("UPDATE web_admin_import_runs SET status='apply_failed',error_message=?,completed_at=NOW() WHERE id=?", [
        String(error instanceof Error ? error.message : error).slice(0, 2000), runId,
      ]).catch(() => undefined);
    }
    throw error;
  } finally {
    if (lockHeld) await connection.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]).catch(() => undefined);
    connection.release();
  }
}

async function backupExists(connection: PoolConnection, database: string, table: string) {
  const [rows] = await connection.query<RowDataPacket[]>(
    'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME=?', [database, table],
  );
  return rows.length > 0;
}

export async function rollbackArticleCategoryImport(input: { runId: number; expectedDatabase: string }) {
  if (process.env.ADMIN_WRITE_ENABLED !== 'true') throw new Error('ADMIN_WRITE_ENABLED=true is required for rollback');
  const connection = await pool.getConnection();
  let lockHeld = false;
  let transactionStarted = false;
  try {
    const database = await databaseName(connection);
    if (database !== input.expectedDatabase) throw new Error(`Database mismatch: connected to ${database}, expected ${input.expectedDatabase}`);
    const [lockRows] = await connection.query<RowDataPacket[]>('SELECT GET_LOCK(?,0) AS acquired', [LOCK_NAME]);
    lockHeld = Number(lockRows[0]?.acquired) === 1;
    if (!lockHeld) throw new Error('Another article-category import is running');
    const [runs] = await connection.query<RowDataPacket[]>(
      "SELECT status,rollback_closed_at FROM web_admin_import_runs WHERE id=? AND source='pcmarket' AND entity=? LIMIT 1", [input.runId, ENTITY],
    );
    if (!['applied', 'apply_failed'].includes(String(runs[0]?.status || ''))) throw new Error(`Run ${input.runId} is not rollbackable`);
    if (runs[0]?.rollback_closed_at) throw new Error(`Run ${input.runId} rollback window is closed`);
    const required = ['article_category', 'article_category_url', 'article_category_registry', 'article_category_map']
      .map((suffix) => backupName(input.runId, suffix));
    for (const table of required) if (!await backupExists(connection, database, table)) throw new Error(`Missing rollback table ${table}`);
    const imported = backupName(input.runId, 'imported_article_category');
    if (!await backupExists(connection, database, imported)) {
      await connection.query(`CREATE TABLE ${quote(imported)} LIKE idv_seller_news_category`);
      await connection.query(`INSERT INTO ${quote(imported)} SELECT * FROM idv_seller_news_category`);
    }
    const before = await invariant(connection, database);
    await connection.query("UPDATE web_admin_import_runs SET status='rolling_back',completed_at=NULL,error_message='' WHERE id=?", [input.runId]);
    await connection.beginTransaction();
    transactionStarted = true;
    await connection.query('DELETE FROM idv_seller_news_category');
    await connection.query(`INSERT INTO idv_seller_news_category SELECT * FROM ${quote(backupName(input.runId, 'article_category'))}`);
    await connection.query('DELETE FROM idv_url WHERE id_path LIKE ? OR id_path LIKE ?', [`${PRIMARY_ROUTE_PREFIX}%`, `${ALIAS_ROUTE_PREFIX}%`]);
    await connection.query(`INSERT INTO idv_url SELECT * FROM ${quote(backupName(input.runId, 'article_category_url'))}`);
    await connection.query('DELETE FROM web_admin_entity_registry WHERE entity_type=?', [RECORD_ENTITY]);
    await connection.query(`INSERT INTO web_admin_entity_registry SELECT * FROM ${quote(backupName(input.runId, 'article_category_registry'))}`);
    await connection.query('DELETE FROM web_admin_import_entity_map WHERE source=? AND entity=?', ['pcmarket', RECORD_ENTITY]);
    await connection.query(`INSERT INTO web_admin_import_entity_map SELECT * FROM ${quote(backupName(input.runId, 'article_category_map'))}`);
    await connection.query("UPDATE web_admin_import_runs SET status='rolled_back',completed_at=NOW() WHERE id=?", [input.runId]);
    if (JSON.stringify(await invariant(connection, database)) !== JSON.stringify(before)) throw new Error('Catalog invariant changed during rollback');
    await connection.commit();
    transactionStarted = false;
    return { runId: input.runId, retainedImportedTable: imported, restoredCategories: await exactCount(connection, 'idv_seller_news_category') };
  } catch (error) {
    if (transactionStarted) await connection.rollback().catch(() => undefined);
    await connection.query("UPDATE web_admin_import_runs SET status='rollback_failed',error_message=?,completed_at=NOW() WHERE id=?", [
      String(error instanceof Error ? error.message : error).slice(0, 2000), input.runId,
    ]).catch(() => undefined);
    throw error;
  } finally {
    if (lockHeld) await connection.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]).catch(() => undefined);
    connection.release();
  }
}
