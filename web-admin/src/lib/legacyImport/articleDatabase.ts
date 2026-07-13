import crypto from 'node:crypto';
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { ensureLegacyImportTables } from './tables';
import {
  articleSha256,
  type ArticleImportReport,
  type NormalizedArticle,
  type QuarantinedArticle,
} from './pcmarketArticles';

const LOCK_NAME = 'web_admin:legacy_import:articles';
const ENTITY = 'articles';
const RECORD_ENTITY = 'article';
const CATEGORY_RECORD_ENTITY = 'article-category';
const ARTICLE_ROUTE_PREFIX = 'module:article/view:detail/view_id:';
const ARTICLE_ALIAS_PREFIX = 'module:news/view:detail/view_id:';
const CATEGORY_ROUTE_PREFIX = 'module:news/view:category/view_id:';
const CATEGORY_ALIAS_PREFIX = 'module:article/view:category/view_id:';
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

export type ArticlePreflight = {
  database: string;
  articleEngine: string;
  contentEngine: string;
  junctionEngine: string;
  articleCollation: string;
  contentCollation: string;
  junctionCollation: string;
  autoIncrement: number;
  currentArticles: number;
  currentContent: number;
  currentLinks: number;
  currentRoutes: number;
  currentRegistryRows: number;
  currentMapRows: number;
  currentMenuReferences: number;
  categoryCount: number;
  categoryMapCount: number;
  categoryRouteCount: number;
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

function backupName(runId: number, suffix: string) {
  const name = `web_admin_import_b_${runId}_${suffix}`;
  if (name.length > 64) throw new Error(`Backup table name is too long: ${name}`);
  return name;
}

function stagingName(runId: number) {
  return `web_admin_import_s_${runId}_article_category`;
}

async function databaseName(db: Db) {
  const [rows] = await db.query<RowDataPacket[]>('SELECT DATABASE() AS name');
  const name = String(rows[0]?.name || '');
  if (!name) throw new Error('No database is selected');
  return name;
}

async function exactCount(db: Db, table: string, where = '', values: unknown[] = []) {
  const [rows] = await db.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM ${quote(table)}${where ? ` WHERE ${where}` : ''}`, values);
  return Number(rows[0]?.total || 0);
}

async function tableExists(db: Db, database: string, table: string) {
  const [rows] = await db.query<RowDataPacket[]>(
    'SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME=? LIMIT 1', [database, table],
  );
  return rows.length > 0;
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
      ) indexes) AS fulltext_indexes,
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

export async function preflightArticleImport(articles: NormalizedArticle[], db: Db = pool): Promise<ArticlePreflight> {
  const database = await databaseName(db);
  const requiredTables = [
    'idv_seller_news', 'idv_seller_news_content', 'idv_article_category', 'idv_seller_news_category', 'idv_url',
    'web_admin_menu_items', 'web_admin_entity_registry', 'web_admin_import_entity_map', 'web_admin_import_runs',
    'idv_seller_category', 'idv_brand', 'idv_sell_product_store', 'product_data_search',
  ];
  const missing: string[] = [];
  for (const table of requiredTables) if (!await tableExists(db, database, table)) missing.push(table);
  if (missing.length) throw new Error(`Missing required tables: ${missing.join(', ')}`);
  await db.query('SET SESSION information_schema_stats_expiry=0');
  const [metadata] = await db.query<RowDataPacket[]>(`
    SELECT TABLE_NAME,ENGINE,TABLE_COLLATION,AUTO_INCREMENT FROM information_schema.TABLES
    WHERE TABLE_SCHEMA=? AND TABLE_NAME IN ('idv_seller_news','idv_seller_news_content','idv_article_category')
  `, [database]);
  const byTable = new Map(metadata.map((row) => [String(row.TABLE_NAME), row]));
  const articleMeta: RowDataPacket = byTable.get('idv_seller_news') || {} as RowDataPacket;
  const contentMeta: RowDataPacket = byTable.get('idv_seller_news_content') || {} as RowDataPacket;
  const junctionMeta: RowDataPacket = byTable.get('idv_article_category') || {} as RowDataPacket;
  const ids = articles.map((article) => article.id);
  const paths = articles.map((article) => article.requestPath);
  let idConflicts: number[] = [];
  let routeConflicts: ArticlePreflight['routeConflicts'] = [];
  if (ids.length) {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT id FROM idv_seller_news WHERE id IN (${ids.map(() => '?').join(',')}) ORDER BY id`, ids,
    );
    idConflicts = rows.map((row) => Number(row.id));
  }
  if (paths.length) {
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT request_path,id_path FROM idv_url WHERE request_path IN (${paths.map(() => '?').join(',')}) ORDER BY request_path,id_path`, paths,
    );
    routeConflicts = rows.map((row) => ({ requestPath: String(row.request_path), idPath: String(row.id_path) }));
  }
  const [foreignKeyRows] = await db.query<RowDataPacket[]>(`
    SELECT TABLE_NAME,CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA=? AND TABLE_NAME IN ('idv_seller_news','idv_seller_news_content','idv_article_category')
      AND REFERENCED_TABLE_NAME IS NOT NULL ORDER BY TABLE_NAME,CONSTRAINT_NAME
  `, [database]);
  const [triggerRows] = await db.query<RowDataPacket[]>(`
    SELECT EVENT_OBJECT_TABLE,TRIGGER_NAME FROM information_schema.TRIGGERS
    WHERE TRIGGER_SCHEMA=? AND EVENT_OBJECT_TABLE IN ('idv_seller_news','idv_seller_news_content','idv_article_category')
    ORDER BY EVENT_OBJECT_TABLE,TRIGGER_NAME
  `, [database]);
  const [categoryRows] = await db.query<RowDataPacket[]>(`
    SELECT id,name,url,status FROM idv_seller_news_category WHERE id IN (1,2,3,4) ORDER BY id
  `);
  const expectedCategories = [
    [1, 'Tin Công Nghệ', 'tin-cong-nghe.html', 1],
    [2, 'Tin Công Ty', 'tin-cong-ty.html', 1],
    [3, 'Bảo Hành', 'bao-hanh.html', 1],
    [4, 'Thủ thuật máy tính', 'thu-thuat-may-tinh.html', 1],
  ];
  const actualCategories = categoryRows.map((row) => [Number(row.id), String(row.name), String(row.url), Number(row.status)]);
  if (JSON.stringify(actualCategories) !== JSON.stringify(expectedCategories)) throw new Error('Imported article taxonomy IDs 1-4 do not match the locked baseline');
  return {
    database,
    articleEngine: String(articleMeta.ENGINE || ''),
    contentEngine: String(contentMeta.ENGINE || ''),
    junctionEngine: String(junctionMeta.ENGINE || ''),
    articleCollation: String(articleMeta.TABLE_COLLATION || ''),
    contentCollation: String(contentMeta.TABLE_COLLATION || ''),
    junctionCollation: String(junctionMeta.TABLE_COLLATION || ''),
    autoIncrement: Number(articleMeta.AUTO_INCREMENT || 0),
    currentArticles: await exactCount(db, 'idv_seller_news'),
    currentContent: await exactCount(db, 'idv_seller_news_content'),
    currentLinks: await exactCount(db, 'idv_article_category'),
    currentRoutes: await exactCount(db, 'idv_url', '(id_path LIKE ? OR id_path LIKE ?)', [`${ARTICLE_ROUTE_PREFIX}%`, `${ARTICLE_ALIAS_PREFIX}%`]),
    currentRegistryRows: await exactCount(db, 'web_admin_entity_registry', 'entity_type=?', [RECORD_ENTITY]),
    currentMapRows: await exactCount(db, 'web_admin_import_entity_map', 'source=? AND entity=?', ['pcmarket', RECORD_ENTITY]),
    currentMenuReferences: await exactCount(db, 'web_admin_menu_items', 'entity_type=?', [RECORD_ENTITY]),
    categoryCount: categoryRows.length,
    categoryMapCount: await exactCount(db, 'web_admin_import_entity_map', 'source=? AND entity=? AND last_run_id=6', ['pcmarket', CATEGORY_RECORD_ENTITY]),
    categoryRouteCount: await exactCount(db, 'idv_url', 'id_path LIKE ?', [`${CATEGORY_ROUTE_PREFIX}%`]),
    idConflicts,
    routeConflicts,
    foreignKeys: foreignKeyRows.map((row) => `${row.TABLE_NAME}.${row.CONSTRAINT_NAME}`),
    triggers: triggerRows.map((row) => `${row.EVENT_OBJECT_TABLE}.${row.TRIGGER_NAME}`),
    invariant: await invariant(db, database),
  };
}

function assertInitialTarget(preflight: ArticlePreflight) {
  const expectedMetadata = preflight.articleEngine === 'InnoDB' && preflight.contentEngine === 'InnoDB'
    && preflight.junctionEngine === 'MyISAM' && preflight.articleCollation === 'utf8mb4_unicode_ci'
    && preflight.contentCollation === 'utf8mb4_unicode_ci' && preflight.junctionCollation === 'utf8mb4_unicode_ci';
  if (!expectedMetadata) throw new Error(`Unexpected article table metadata: ${JSON.stringify(preflight)}`);
  const occupied = {
    articles: preflight.currentArticles,
    content: preflight.currentContent,
    links: preflight.currentLinks,
    routes: preflight.currentRoutes,
    registry: preflight.currentRegistryRows,
    maps: preflight.currentMapRows,
    menuReferences: preflight.currentMenuReferences,
  };
  if (Object.values(occupied).some((value) => value !== 0)) throw new Error(`Initial article target is not empty: ${JSON.stringify(occupied)}`);
  if (preflight.categoryCount !== 4 || preflight.categoryMapCount !== 4 || preflight.categoryRouteCount !== 4) {
    throw new Error('Article category run 6 baseline is incomplete');
  }
  if (preflight.idConflicts.length || preflight.routeConflicts.length) throw new Error('Article ID or route conflicts block apply');
  if (preflight.foreignKeys.length || preflight.triggers.length) throw new Error('Article foreign keys or triggers require manual review');
  if (preflight.autoIncrement < 2912) throw new Error(`Unexpected article AUTO_INCREMENT: ${preflight.autoIncrement}/2912`);
}

async function backupSubset(connection: PoolConnection, runId: number, suffix: string, selectSql: string, values: unknown[]) {
  const backup = backupName(runId, suffix);
  await connection.query(`CREATE TABLE ${quote(backup)} ENGINE=InnoDB AS ${selectSql}`, values);
  return backup;
}

function md5(value: string) {
  return crypto.createHash('md5').update(value).digest('hex');
}

async function populateStaging(connection: PoolConnection, runId: number, articles: NormalizedArticle[]) {
  const staging = stagingName(runId);
  await connection.query(`CREATE TABLE ${quote(staging)} LIKE idv_article_category`);
  for (const article of articles) {
    for (const link of article.links) {
      await connection.query(`
        INSERT INTO ${quote(staging)}
          (category_id,article_id,article_type,status,is_featured,ordering,visit,create_time,article_update_time,article_display_time)
        VALUES (?,?,'article',1,0,?,0,?,?,?)
      `, [link.categoryId, article.id, link.ordering, link.createTime, link.articleUpdateTime, link.articleDisplayTime]);
    }
  }
  const expected = articles.reduce((sum, article) => sum + article.links.length, 0);
  const actual = await exactCount(connection, staging);
  const [duplicates] = await connection.query<RowDataPacket[]>(`
    SELECT article_id,category_id,COUNT(*) AS total FROM ${quote(staging)}
    GROUP BY article_id,category_id HAVING COUNT(*) > 1 LIMIT 1
  `);
  if (actual !== expected || duplicates.length) throw new Error(`Staging junction verification failed: ${actual}/${expected}`);
  return staging;
}

async function insertArticle(connection: PoolConnection, article: NormalizedArticle) {
  await connection.query(`
    INSERT INTO idv_seller_news
      (id,type,changeCount,sellerId,catId,article_category,title,video_code,external_url,url,request_path,url_hash,
       thumnail,image_background,extend,summary,tags,createDate,createBy,lastUpdate,lastUpdateBy,lastUpdateByUser,
       ordering,review_rate,review_count,status,visit,like_count,is_featured,album_id,search_fulltext,meta_title,
       meta_keywords,meta_description,article_time,article_time_set,allow_se_index,url_canonical,article_display_time,
       article_display_time_set,comment_count,comment_rate)
    VALUES (?,'article',0,0,?,?,?,'',?,?,?,? ,?,'','',?,'',?,0,?,0,'',?,0,0,?,0,0,0,0,?,?,?,?,0,0,?,'',0,0,?,0)
  `, [
    article.id, article.categoryId, article.categoryCsv, article.title, article.externalUrl, article.slug,
    article.requestPath, md5(article.slug), article.thumbnail, article.summary, article.createDate, article.lastUpdate,
    article.ordering, article.status, article.searchFulltext, article.metaTitle, article.metaKeywords,
    article.metaDescription, article.status, article.commentCount,
  ]);
  await connection.query(
    "INSERT INTO idv_seller_news_content(id,content,relate_product,relate_article) VALUES (?,?,'','')",
    [article.id, article.content],
  );
  await connection.query(`
    INSERT INTO idv_url(request_path,request_path_index,id_path,target_path,redirect_code)
    VALUES (?,?,?,'','')
  `, [article.requestPath, md5(article.requestPath), `${ARTICLE_ROUTE_PREFIX}${article.id}`]);
  await connection.query('INSERT INTO web_admin_entity_registry(entity_type,entity_id) VALUES(?,?)', [RECORD_ENTITY, article.id]);
}

async function verifyApplied(connection: PoolConnection, input: {
  articles: NormalizedArticle[];
  quarantined: QuarantinedArticle[];
  runId: number;
  autoIncrement: number;
  invariant: DatabaseInvariant;
}) {
  const expectedLinks = input.articles.reduce((sum, article) => sum + article.links.length, 0);
  const counts = {
    articles: await exactCount(connection, 'idv_seller_news'),
    content: await exactCount(connection, 'idv_seller_news_content'),
    links: await exactCount(connection, 'idv_article_category'),
    routes: await exactCount(connection, 'idv_url', 'id_path LIKE ?', [`${ARTICLE_ROUTE_PREFIX}%`]),
    registry: await exactCount(connection, 'web_admin_entity_registry', 'entity_type=?', [RECORD_ENTITY]),
    maps: await exactCount(connection, 'web_admin_import_entity_map', 'source=? AND entity=?', ['pcmarket', RECORD_ENTITY]),
    records: await exactCount(connection, 'web_admin_import_records', 'run_id=? AND entity=?', [input.runId, RECORD_ENTITY]),
  };
  const expected = {
    articles: input.articles.length,
    content: input.articles.length,
    links: expectedLinks,
    routes: input.articles.length,
    registry: input.articles.length,
    maps: input.articles.length,
    records: input.articles.length + input.quarantined.length,
  };
  if (JSON.stringify(counts) !== JSON.stringify(expected)) throw new Error(`Post-apply article counts mismatch: ${JSON.stringify({ counts, expected })}`);
  const enabled = await exactCount(connection, 'idv_seller_news', 'status=1');
  const disabled = await exactCount(connection, 'idv_seller_news', 'status=0');
  const thumbnail = await exactCount(connection, 'idv_seller_news', "thumnail<>''");
  if (enabled !== 654 || disabled !== 14 || thumbnail !== 653) {
    throw new Error(`Post-apply article inventory mismatch: enabled=${enabled}, disabled=${disabled}, thumbnail=${thumbnail}`);
  }
  const [categoryCounts] = await connection.query<RowDataPacket[]>(`
    SELECT ac.category_id,COUNT(*) AS total,SUM(n.status=1) AS enabled
    FROM idv_article_category ac JOIN idv_seller_news n ON n.id=ac.article_id
    WHERE ac.status=1 AND ac.article_type='article'
    GROUP BY ac.category_id ORDER BY ac.category_id
  `);
  const categoryInventory = categoryCounts.map((row) => [Number(row.category_id), Number(row.total), Number(row.enabled)]);
  const expectedCategoryInventory = [[1, 620, 609], [2, 50, 47], [3, 5, 5], [4, 30, 30]];
  if (JSON.stringify(categoryInventory) !== JSON.stringify(expectedCategoryInventory)) {
    throw new Error(`Article category inventory mismatch: ${JSON.stringify(categoryInventory)}`);
  }
  const [qualityRows] = await connection.query<RowDataPacket[]>(`
    SELECT
      (SELECT COUNT(*) FROM (
        SELECT article_id,category_id FROM idv_article_category GROUP BY article_id,category_id HAVING COUNT(*)>1
      ) duplicate_links) AS duplicate_links,
      (SELECT COUNT(*) FROM idv_seller_news n WHERE n.catId=0 AND NOT EXISTS (
        SELECT 1 FROM idv_article_category ac WHERE ac.article_id=n.id
      )) AS no_category,
      (SELECT COUNT(*) FROM (
        SELECT article_id FROM idv_article_category GROUP BY article_id HAVING COUNT(DISTINCT category_id)>1
      ) multi_category) AS multi_category,
      (SELECT COUNT(*) FROM idv_seller_news n LEFT JOIN idv_seller_news_content nc ON nc.id=n.id
        WHERE LOCATE(CONVERT(0xEFBFBD USING utf8mb4),CONCAT_WS(' ',n.title,n.summary,n.meta_title,n.meta_keywords,n.meta_description,nc.content))>0
      ) AS replacement_chars,
      (SELECT COUNT(*) FROM idv_seller_news WHERE id=83 OR request_path='/.html') AS quarantined_runtime
  `);
  const quality = qualityRows[0] || {};
  if (Number(quality.duplicate_links) !== 0 || Number(quality.no_category) !== 14
      || Number(quality.multi_category) !== 50 || Number(quality.replacement_chars) !== 0
      || Number(quality.quarantined_runtime) !== 0) {
    throw new Error(`Post-apply article quality mismatch: ${JSON.stringify(quality)}`);
  }
  const [routeHashes] = await connection.query<RowDataPacket[]>(`
    SELECT request_path,request_path_index FROM idv_url WHERE id_path LIKE ? ORDER BY id_path
  `, [`${CATEGORY_ROUTE_PREFIX}%`]);
  if (routeHashes.length !== 4 || routeHashes.some((row) => String(row.request_path_index) !== md5(String(row.request_path)))) {
    throw new Error('Article-category route hashes were not normalized');
  }
  await connection.query('SET SESSION information_schema_stats_expiry=0');
  const [tableRows] = await connection.query<RowDataPacket[]>(`
    SELECT AUTO_INCREMENT FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='idv_seller_news'
  `);
  if (Number(tableRows[0]?.AUTO_INCREMENT || 0) < input.autoIncrement) throw new Error('Article AUTO_INCREMENT moved backwards');
  if (JSON.stringify(await invariant(connection, await databaseName(connection))) !== JSON.stringify(input.invariant)) {
    throw new Error('Product/catalog invariant changed during article import');
  }
}

async function compensateJunctionSwap(connection: PoolConnection, runId: number, database: string) {
  const original = backupName(runId, 'article_category');
  const failed = backupName(runId, 'failed_article_category');
  if (await tableExists(connection, database, original) && await tableExists(connection, database, 'idv_article_category')) {
    if (await tableExists(connection, database, failed)) await connection.query(`DROP TABLE ${quote(failed)}`);
    await connection.query(`RENAME TABLE idv_article_category TO ${quote(failed)}, ${quote(original)} TO idv_article_category`);
  }
}

export async function applyArticleImport(input: {
  articles: NormalizedArticle[];
  quarantined: QuarantinedArticle[];
  report: ArticleImportReport;
  snapshotHash: string;
  sourceUrl: string;
  expectedDatabase: string;
}) {
  if (process.env.ADMIN_WRITE_ENABLED !== 'true') throw new Error('ADMIN_WRITE_ENABLED=true is required for apply');
  if (!/^[a-f0-9]{64}$/.test(input.snapshotHash)) throw new Error('A valid SHA-256 snapshot hash is required for apply');
  const connection = await pool.getConnection();
  let lockHeld = false;
  let transactionStarted = false;
  let junctionSwapped = false;
  let runId = 0;
  try {
    const database = await databaseName(connection);
    if (database !== input.expectedDatabase) throw new Error(`Database mismatch: connected to ${database}, expected ${input.expectedDatabase}`);
    const [locks] = await connection.query<RowDataPacket[]>('SELECT GET_LOCK(?,0) AS acquired', [LOCK_NAME]);
    lockHeld = Number(locks[0]?.acquired) === 1;
    if (!lockHeld) throw new Error('Another article import is running');
    const preflight = await preflightArticleImport(input.articles, connection);
    assertInitialTarget(preflight);
    await ensureLegacyImportTables(connection);
    const [runResult] = await connection.query<ResultSetHeader>(`
      INSERT INTO web_admin_import_runs(source,entity,source_url,snapshot_hash,status,item_count,report_json)
      VALUES('pcmarket',?,?,?,'applying',?,?)
    `, [ENTITY, input.sourceUrl, input.snapshotHash, input.report.sourceTotal, JSON.stringify({ ...input.report, preflight })]);
    runId = Number(runResult.insertId);
    const backups = {
      article: await backupSubset(connection, runId, 'article', 'SELECT * FROM idv_seller_news', []),
      content: await backupSubset(connection, runId, 'article_content', 'SELECT * FROM idv_seller_news_content', []),
      url: await backupSubset(connection, runId, 'article_url',
        'SELECT * FROM idv_url WHERE id_path LIKE ? OR id_path LIKE ? OR id_path LIKE ? OR id_path LIKE ?',
        [`${ARTICLE_ROUTE_PREFIX}%`, `${ARTICLE_ALIAS_PREFIX}%`, `${CATEGORY_ROUTE_PREFIX}%`, `${CATEGORY_ALIAS_PREFIX}%`]),
      registry: await backupSubset(connection, runId, 'article_registry',
        'SELECT * FROM web_admin_entity_registry WHERE entity_type=?', [RECORD_ENTITY]),
      map: await backupSubset(connection, runId, 'article_map',
        'SELECT * FROM web_admin_import_entity_map WHERE source=? AND entity=?', ['pcmarket', RECORD_ENTITY]),
    };
    assertInitialTarget(await preflightArticleImport(input.articles, connection));
    const staging = await populateStaging(connection, runId, input.articles);
    const junctionBackup = backupName(runId, 'article_category');
    await connection.query(`RENAME TABLE idv_article_category TO ${quote(junctionBackup)}, ${quote(staging)} TO idv_article_category`);
    junctionSwapped = true;
    await connection.beginTransaction();
    transactionStarted = true;
    await connection.query('UPDATE idv_url SET request_path_index=MD5(request_path) WHERE id_path LIKE ?', [`${CATEGORY_ROUTE_PREFIX}%`]);
    for (const article of input.articles) {
      await insertArticle(connection, article);
      const normalizedJson = JSON.stringify(article);
      const payloadHash = articleSha256(normalizedJson);
      await connection.query(`
        INSERT INTO web_admin_import_records(run_id,entity,source_id,target_id,payload_hash,normalized_json,relation_status)
        VALUES(?,?,?,?,?,?,'applied')
      `, [runId, RECORD_ENTITY, String(article.id), String(article.id), payloadHash, normalizedJson]);
      await connection.query(`
        INSERT INTO web_admin_import_entity_map(source,entity,source_id,target_id,source_hash,last_run_id)
        VALUES('pcmarket',?,?,?,?,?)
      `, [RECORD_ENTITY, String(article.id), String(article.id), payloadHash, runId]);
    }
    for (const quarantine of input.quarantined) {
      await connection.query(`
        INSERT INTO web_admin_import_records(run_id,entity,source_id,target_id,payload_hash,normalized_json,relation_status)
        VALUES(?,?,?,NULL,?,?, 'pending')
      `, [runId, RECORD_ENTITY, String(quarantine.id), articleSha256(quarantine.normalizedJson), quarantine.normalizedJson]);
    }
    await connection.query("UPDATE web_admin_import_runs SET status='applied',completed_at=NOW() WHERE id=?", [runId]);
    await verifyApplied(connection, {
      articles: input.articles,
      quarantined: input.quarantined,
      runId,
      autoIncrement: preflight.autoIncrement,
      invariant: preflight.invariant,
    });
    await connection.commit();
    transactionStarted = false;
    return { runId, preflight, backups: { ...backups, junction: junctionBackup } };
  } catch (error) {
    if (transactionStarted) await connection.rollback().catch(() => undefined);
    if (junctionSwapped && runId) await compensateJunctionSwap(connection, runId, await databaseName(connection)).catch(() => undefined);
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

export async function rollbackArticleImport(input: { runId: number; expectedDatabase: string }) {
  if (process.env.ADMIN_WRITE_ENABLED !== 'true') throw new Error('ADMIN_WRITE_ENABLED=true is required for rollback');
  const connection = await pool.getConnection();
  let lockHeld = false;
  let transactionStarted = false;
  let junctionSwapped = false;
  try {
    const database = await databaseName(connection);
    if (database !== input.expectedDatabase) throw new Error(`Database mismatch: connected to ${database}, expected ${input.expectedDatabase}`);
    const [locks] = await connection.query<RowDataPacket[]>('SELECT GET_LOCK(?,0) AS acquired', [LOCK_NAME]);
    lockHeld = Number(locks[0]?.acquired) === 1;
    if (!lockHeld) throw new Error('Another article import is running');
    const [runs] = await connection.query<RowDataPacket[]>(
      "SELECT status,rollback_closed_at FROM web_admin_import_runs WHERE id=? AND source='pcmarket' AND entity=? LIMIT 1", [input.runId, ENTITY],
    );
    if (String(runs[0]?.status || '') !== 'applied') throw new Error(`Run ${input.runId} is not an applied article import`);
    if (runs[0]?.rollback_closed_at) throw new Error(`Run ${input.runId} rollback window is closed`);
    const newer = await exactCount(connection, 'web_admin_import_runs', "source='pcmarket' AND entity=? AND status='applied' AND id>?", [ENTITY, input.runId]);
    if (newer) throw new Error('A newer applied article import blocks rollback');
    const required = ['article', 'article_content', 'article_url', 'article_registry', 'article_map', 'article_category']
      .map((suffix) => backupName(input.runId, suffix));
    for (const table of required) if (!await tableExists(connection, database, table)) throw new Error(`Missing rollback table ${table}`);
    const importedJunction = backupName(input.runId, 'imported_article_category');
    if (await tableExists(connection, database, importedJunction)) throw new Error(`Rollback snapshot already exists: ${importedJunction}`);
    await connection.query("UPDATE web_admin_import_runs SET status='rolling_back',completed_at=NULL,error_message='' WHERE id=?", [input.runId]);
    await connection.query(`RENAME TABLE idv_article_category TO ${quote(importedJunction)}, ${quote(backupName(input.runId, 'article_category'))} TO idv_article_category`);
    junctionSwapped = true;
    await connection.beginTransaction();
    transactionStarted = true;
    await connection.query('DELETE FROM idv_seller_news_content');
    await connection.query(`INSERT INTO idv_seller_news_content SELECT * FROM ${quote(backupName(input.runId, 'article_content'))}`);
    await connection.query('DELETE FROM idv_seller_news');
    await connection.query(`INSERT INTO idv_seller_news SELECT * FROM ${quote(backupName(input.runId, 'article'))}`);
    await connection.query('DELETE FROM idv_url WHERE id_path LIKE ? OR id_path LIKE ? OR id_path LIKE ? OR id_path LIKE ?',
      [`${ARTICLE_ROUTE_PREFIX}%`, `${ARTICLE_ALIAS_PREFIX}%`, `${CATEGORY_ROUTE_PREFIX}%`, `${CATEGORY_ALIAS_PREFIX}%`]);
    await connection.query(`INSERT INTO idv_url SELECT * FROM ${quote(backupName(input.runId, 'article_url'))}`);
    await connection.query('DELETE FROM web_admin_entity_registry WHERE entity_type=?', [RECORD_ENTITY]);
    await connection.query(`INSERT INTO web_admin_entity_registry SELECT * FROM ${quote(backupName(input.runId, 'article_registry'))}`);
    await connection.query('DELETE FROM web_admin_import_entity_map WHERE source=? AND entity=?', ['pcmarket', RECORD_ENTITY]);
    await connection.query(`INSERT INTO web_admin_import_entity_map SELECT * FROM ${quote(backupName(input.runId, 'article_map'))}`);
    await connection.query("UPDATE web_admin_import_runs SET status='rolled_back',completed_at=NOW() WHERE id=?", [input.runId]);
    await connection.commit();
    transactionStarted = false;
    return { runId: input.runId, retainedImportedJunction: importedJunction, recordsRetained: true };
  } catch (error) {
    if (transactionStarted) await connection.rollback().catch(() => undefined);
    if (junctionSwapped) {
      const imported = backupName(input.runId, 'imported_article_category');
      const original = backupName(input.runId, 'article_category');
      if (await tableExists(connection, await databaseName(connection), imported)) {
        await connection.query(`RENAME TABLE idv_article_category TO ${quote(original)}, ${quote(imported)} TO idv_article_category`).catch(() => undefined);
      }
    }
    await connection.query("UPDATE web_admin_import_runs SET status='rollback_failed',error_message=?,completed_at=NOW() WHERE id=?", [
      String(error instanceof Error ? error.message : error).slice(0, 2000), input.runId,
    ]).catch(() => undefined);
    throw error;
  } finally {
    if (lockHeld) await connection.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]).catch(() => undefined);
    connection.release();
  }
}
