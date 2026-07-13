import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { rebuildProductSearchData } from '@/lib/searchInfrastructure';
import {
  PCM_FALLBACK_BRAND_ID,
  PCM_FALLBACK_BRAND_POLICY_VERSION,
  canonicalPcmarketBrandId,
  type BrandImportReport,
  type NormalizedBrand,
  type PcmarketBrand,
  productCatalogSha256,
} from './pcmarketProducts';
import { ensureLegacyImportTables } from './tables';

const LOCK_NAME = 'web_admin:legacy_import:brands';
const BRAND_ID_TABLES = ['idv_brand_category', 'idv_movie', 'idv_product_category', 'idv_product_category_for_seo', 'idv_sell_product_price', 'idv_sell_product_store'] as const;
const RELATION_BACKUPS = ['idv_sell_product_store', 'idv_sell_product_price', 'idv_product_category', 'idv_product_category_for_seo', 'product_data_search', 'web_admin_import_entity_map'] as const;
type Db = Pool | PoolConnection;

export type BrandImportPreflight = {
  database: string;
  currentBrands: number;
  currentBrandInfo: number;
  currentBrandCategories: number;
  products: number;
  searchRows: number;
  missingSearchRows: number;
  latestProductRunId: number;
  targetOnlyBrandIds: number[];
  aliasReferences: Record<string, number>;
  expectedRuntimeBrands: number;
  expectedBrandCategories: number;
  pathConflicts: Array<{ id: number; brandIndex: string }>;
  unexpectedBrandIdTables: string[];
  collations: Record<string, string>;
  engines: Record<string, string>;
};

function quote(identifier: string) {
  if (!/^[a-zA-Z0-9_]+$/.test(identifier)) throw new Error(`Unsafe SQL identifier: ${identifier}`);
  return `\`${identifier}\``;
}

function backupName(runId: number, suffix: string) {
  return `web_admin_import_b_${runId}_${suffix}`;
}

function stageName(runId: number, suffix: string) {
  return `web_admin_import_stage_${runId}_${suffix}`;
}

async function databaseName(db: Db) {
  const [rows] = await db.query<RowDataPacket[]>('SELECT DATABASE() AS name');
  const name = String(rows[0]?.name || '');
  if (!name) throw new Error('No MySQL database is selected');
  return name;
}

async function count(db: Db, table: string, where = '', values: unknown[] = []) {
  const [rows] = await db.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM ${quote(table)} ${where}`, values);
  return Number(rows[0]?.total || 0);
}

async function tableExists(db: Db, database: string, table: string) {
  const [rows] = await db.query<RowDataPacket[]>('SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME=? LIMIT 1', [database, table]);
  return rows.length > 0;
}

async function insertBatches<T>(items: T[], batchSize: number, insert: (batch: T[]) => Promise<unknown>) {
  for (let offset = 0; offset < items.length; offset += batchSize) await insert(items.slice(offset, offset + batchSize));
}

async function backupWhole(connection: PoolConnection, runId: number, table: string) {
  const backup = backupName(runId, table.replace(/^idv_|^web_admin_/, ''));
  await connection.query(`CREATE TABLE ${quote(backup)} LIKE ${quote(table)}`);
  await connection.query(`INSERT INTO ${quote(backup)} SELECT * FROM ${quote(table)}`);
}

function aliasCase(column = 'brandId') {
  return `CASE ${quote(column)} WHEN 0 THEN ${PCM_FALLBACK_BRAND_ID} WHEN 34 THEN 25 WHEN 57 THEN 31 ELSE ${quote(column)} END`;
}

export async function preflightBrandImport(sourceBrands: PcmarketBrand[], brands: NormalizedBrand[], db: Db = pool): Promise<BrandImportPreflight> {
  const database = await databaseName(db);
  const required = ['idv_brand', 'idv_brand_info', ...BRAND_ID_TABLES, 'product_data_search', 'web_admin_import_runs', 'web_admin_import_records', 'web_admin_import_entity_map', 'web_admin_cache_versions'];
  const [tableRows] = await db.query<RowDataPacket[]>(
    `SELECT TABLE_NAME,ENGINE,TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME IN (${required.map(() => '?').join(',')})`,
    [database, ...required],
  );
  const engines = Object.fromEntries(tableRows.map((row) => [String(row.TABLE_NAME), String(row.ENGINE)]));
  const collations = Object.fromEntries(tableRows.map((row) => [String(row.TABLE_NAME), String(row.TABLE_COLLATION || '')]));
  const missing = required.filter((table) => !engines[table]);
  if (missing.length) throw new Error(`Missing brand import tables: ${missing.join(', ')}`);
  for (const table of required.filter((table) => !['idv_brand_category', 'idv_movie'].includes(table))) {
    if (engines[table] !== 'InnoDB') throw new Error(`${table} must use InnoDB; found ${engines[table]}`);
  }
  if (engines.idv_brand_category !== 'MyISAM') throw new Error(`idv_brand_category must use MyISAM; found ${engines.idv_brand_category}`);
  if (engines.idv_movie !== 'MyISAM') throw new Error(`idv_movie must use MyISAM; found ${engines.idv_movie}`);

  const [columnRows] = await db.query<RowDataPacket[]>(`
    SELECT TABLE_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=? AND LOWER(COLUMN_NAME) IN ('brandid','brand_id')
      AND TABLE_NAME NOT LIKE 'web_admin_import_%'
  `, [database]);
  const known = new Set<string>(BRAND_ID_TABLES as readonly string[]);
  const unexpectedBrandIdTables = [...new Set(columnRows.map((row) => String(row.TABLE_NAME)).filter((table) => !known.has(table)))].sort();

  const aliasReferences: Record<string, number> = {};
  for (const table of BRAND_ID_TABLES) aliasReferences[table] = await count(db, table, 'WHERE brandId IN (0,34,57)');
  const managedIds = [...new Set([...sourceBrands.map((brand) => brand.id), ...brands.map((brand) => brand.id)])];
  const targetOnlyBrandIds: number[] = [];
  if (managedIds.length) {
    const [rows] = await db.query<RowDataPacket[]>(`SELECT id FROM idv_brand WHERE id NOT IN (${managedIds.map(() => '?').join(',')}) ORDER BY id`, managedIds);
    targetOnlyBrandIds.push(...rows.map((row) => Number(row.id)));
  }
  const sourceIndexes = new Set(brands.map((brand) => brand.index));
  const pathConflicts: BrandImportPreflight['pathConflicts'] = [];
  if (targetOnlyBrandIds.length) {
    const [rows] = await db.query<RowDataPacket[]>(`SELECT id,brand_index FROM idv_brand WHERE id IN (${targetOnlyBrandIds.map(() => '?').join(',')})`, targetOnlyBrandIds);
    for (const row of rows) if (sourceIndexes.has(String(row.brand_index || ''))) pathConflicts.push({ id: Number(row.id), brandIndex: String(row.brand_index) });
  }
  const [productRunRows] = await db.query<RowDataPacket[]>("SELECT id FROM web_admin_import_runs WHERE source='pcmarket' AND entity='products' AND status='applied' ORDER BY id DESC LIMIT 1");
  const [searchRows] = await db.query<RowDataPacket[]>(`
    SELECT (SELECT COUNT(*) FROM product_data_search) AS search_rows,
      (SELECT COUNT(*) FROM idv_sell_product_store p LEFT JOIN product_data_search s ON s.product_id=p.id WHERE s.product_id IS NULL) AS missing_rows
  `);
  const [brandCategoryRows] = await db.query<RowDataPacket[]>(`
    SELECT COUNT(*) AS total FROM (
      SELECT ${aliasCase('brandId')} AS canonical_brand_id,category_id
      FROM idv_product_category WHERE ${aliasCase('brandId')}>0 GROUP BY canonical_brand_id,category_id
    ) grouped
  `);
  return {
    database,
    currentBrands: await count(db, 'idv_brand'),
    currentBrandInfo: await count(db, 'idv_brand_info'),
    currentBrandCategories: await count(db, 'idv_brand_category'),
    products: await count(db, 'idv_sell_product_store'),
    searchRows: Number(searchRows[0]?.search_rows || 0),
    missingSearchRows: Number(searchRows[0]?.missing_rows || 0),
    latestProductRunId: Number(productRunRows[0]?.id || 0),
    targetOnlyBrandIds,
    aliasReferences,
    expectedRuntimeBrands: brands.length + targetOnlyBrandIds.length,
    expectedBrandCategories: Number(brandCategoryRows[0]?.total || 0),
    pathConflicts,
    unexpectedBrandIdTables,
    collations,
    engines,
  };
}

function assertApplyPreflight(preflight: BrandImportPreflight) {
  if (!preflight.latestProductRunId) throw new Error('An applied PCMarket product run is required before brand sync');
  if (preflight.products <= 0 || preflight.searchRows !== preflight.products || preflight.missingSearchRows !== 0) throw new Error('Product/search state is not ready for brand sync');
  if (preflight.pathConflicts.length) throw new Error(`Brand path conflicts block apply: ${preflight.pathConflicts.map((row) => `${row.id}:${row.brandIndex}`).join(', ')}`);
  if (preflight.unexpectedBrandIdTables.length) throw new Error(`Unexpected brand reference tables: ${preflight.unexpectedBrandIdTables.join(', ')}`);
}

async function createBrandStages(connection: PoolConnection, runId: number, sourceBrands: PcmarketBrand[], brands: NormalizedBrand[], now: Date) {
  const brandStage = stageName(runId, 'brand');
  const infoStage = stageName(runId, 'brand_info');
  const categoryStage = stageName(runId, 'brand_category');
  const movieStage = stageName(runId, 'movie');
  await connection.query(`CREATE TABLE ${quote(brandStage)} LIKE idv_brand`);
  await connection.query(`ALTER TABLE ${quote(brandStage)} CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.query(`CREATE TABLE ${quote(infoStage)} LIKE idv_brand_info`);
  await connection.query(`ALTER TABLE ${quote(infoStage)} CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.query(`CREATE TABLE ${quote(categoryStage)} LIKE idv_brand_category`);
  await connection.query(`CREATE TABLE ${quote(movieStage)} LIKE idv_movie`);
  await connection.query(`INSERT INTO ${quote(movieStage)} SELECT * FROM idv_movie`);
  await connection.query(`UPDATE ${quote(movieStage)} SET brandId=${aliasCase('brandId')} WHERE brandId IN (0,34,57)`);

  const managedIds = [...new Set([...sourceBrands.map((brand) => brand.id), ...brands.map((brand) => brand.id)])];
  if (managedIds.length) {
    const placeholders = managedIds.map(() => '?').join(',');
    await connection.query(`INSERT INTO ${quote(brandStage)} SELECT * FROM idv_brand WHERE id NOT IN (${placeholders})`, managedIds);
    await connection.query(`INSERT INTO ${quote(infoStage)} SELECT * FROM idv_brand_info WHERE id NOT IN (${placeholders})`, managedIds);
  }
  const [localRows] = await connection.query<RowDataPacket[]>(`SELECT id,is_featured,brand_page_view FROM idv_brand WHERE id IN (${brands.map(() => '?').join(',')})`, brands.map((brand) => brand.id));
  const local = new Map(localRows.map((row) => [Number(row.id), { featured: Number(row.is_featured || 0), views: Number(row.brand_page_view || 0) }]));
  const [countRows] = await connection.query<RowDataPacket[]>(`SELECT ${aliasCase('brandId')} AS canonical_brand_id,COUNT(*) AS total FROM idv_sell_product_store WHERE ${aliasCase('brandId')}>0 GROUP BY ${aliasCase('brandId')}`);
  const productCounts = new Map(countRows.map((row) => [Number(row.canonical_brand_id), Number(row.total || 0)]));
  await insertBatches(brands, 100, (batch) => connection.query(
    `INSERT INTO ${quote(brandStage)}(id,brand_index,name,summary,image,product,status,is_featured,ordering,letter,lastUpdate,brand_page_view) VALUES ${batch.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?)').join(',')}`,
    batch.flatMap((brand) => {
      const localState = local.get(brand.id) || { featured: 0, views: 0 };
      return [brand.id, brand.index, brand.name, brand.summary, brand.image, productCounts.get(brand.id) || 0, brand.status, localState.featured, brand.ordering, brand.name.slice(0, 2).toUpperCase(), brand.lastUpdate || now, localState.views];
    }),
  ));
  await insertBatches(brands, 100, (batch) => connection.query(
    `INSERT INTO ${quote(infoStage)}(id,meta_title,meta_keywords,meta_description,sellerId,description) VALUES ${batch.map(() => '(?,?,?,?,0,?)').join(',')}`,
    batch.flatMap((brand) => [brand.id, brand.metaTitle, brand.metaKeyword, brand.metaDescription, brand.description]),
  ));
  await connection.query(`
    INSERT INTO ${quote(categoryStage)}(brandId,catId,proCount,proDtCount)
    SELECT ${aliasCase('brandId')},category_id,COUNT(DISTINCT pro_id),COUNT(DISTINCT pro_id)
    FROM idv_product_category WHERE ${aliasCase('brandId')}>0 GROUP BY ${aliasCase('brandId')},category_id
  `);
  return {
    brandStage,
    infoStage,
    categoryStage,
    movieStage,
    brands: await count(connection, brandStage),
    info: await count(connection, infoStage),
    categories: await count(connection, categoryStage),
  };
}

async function swapBrandTables(connection: PoolConnection, runId: number, stages: { brandStage: string; infoStage: string; categoryStage: string; movieStage: string }) {
  await connection.query(`RENAME TABLE
    idv_brand TO ${quote(backupName(runId, 'brand'))}, ${quote(stages.brandStage)} TO idv_brand,
    idv_brand_info TO ${quote(backupName(runId, 'brand_info'))}, ${quote(stages.infoStage)} TO idv_brand_info,
    idv_brand_category TO ${quote(backupName(runId, 'brand_category'))}, ${quote(stages.categoryStage)} TO idv_brand_category,
    idv_movie TO ${quote(backupName(runId, 'movie'))}, ${quote(stages.movieStage)} TO idv_movie`);
}

async function restoreSwappedTables(connection: PoolConnection, runId: number, label: string) {
  const triples = ['brand', 'brand_info', 'brand_category', 'movie'].map((suffix) => ({
    suffix,
    backup: backupName(runId, suffix),
    restore: `web_admin_import_restore_${runId}_${suffix}_${label}`,
    imported: backupName(runId, `${label}_${suffix}`),
    live: `idv_${suffix}`,
  }));
  for (const item of triples) {
    await connection.query(`CREATE TABLE ${quote(item.restore)} LIKE ${quote(item.backup)}`);
    await connection.query(`INSERT INTO ${quote(item.restore)} SELECT * FROM ${quote(item.backup)}`);
  }
  await connection.query(`RENAME TABLE ${triples.map((item) => `${quote(item.live)} TO ${quote(item.imported)}, ${quote(item.restore)} TO ${quote(item.live)}`).join(', ')}`);
}

async function updateAliasReferences(connection: PoolConnection) {
  for (const table of ['idv_sell_product_store', 'idv_sell_product_price', 'idv_product_category', 'idv_product_category_for_seo']) {
    await connection.query(`UPDATE ${quote(table)} SET brandId=${aliasCase('brandId')} WHERE brandId IN (0,34,57)`);
  }
}

async function insertAudit(connection: PoolConnection, runId: number, sourceBrands: PcmarketBrand[], brands: NormalizedBrand[]) {
  const targetBySource = new Map<number, NormalizedBrand>();
  for (const brand of brands) for (const sourceId of brand.sourceIds) targetBySource.set(sourceId, brand);
  const records: Array<{ sourceId: string; targetId: string; json: string; hash: string }> = sourceBrands.map((source) => {
    const target = targetBySource.get(source.id)!;
    const payload = { source, normalized: target, mergedInto: source.id === target.id ? null : target.id };
    const json = JSON.stringify(payload);
    return { sourceId: String(source.id), targetId: String(target.id), json, hash: productCatalogSha256(json) };
  });
  const fallbackTarget = targetBySource.get(0);
  if (!fallbackTarget || fallbackTarget.id !== PCM_FALLBACK_BRAND_ID) throw new Error('PCM fallback brand normalization is missing');
  const fallbackJson = JSON.stringify({
    source: { id: 0, meaning: 'PCMarket unassigned brand sentinel' },
    normalized: fallbackTarget,
    mergedInto: PCM_FALLBACK_BRAND_ID,
    policyVersion: PCM_FALLBACK_BRAND_POLICY_VERSION,
  });
  records.push({ sourceId: '0', targetId: String(PCM_FALLBACK_BRAND_ID), json: fallbackJson, hash: productCatalogSha256(fallbackJson) });
  await insertBatches(records, 50, (batch) => connection.query(
    `INSERT INTO web_admin_import_records(run_id,entity,source_id,target_id,payload_hash,normalized_json,relation_status) VALUES ${batch.map(() => "(?,'brand',?,?,?,?, 'applied')").join(',')}`,
    batch.flatMap((record) => [runId, record.sourceId, record.targetId, record.hash, record.json]),
  ));
  await insertBatches(records, 100, (batch) => connection.query(
    `INSERT INTO web_admin_import_entity_map(source,entity,source_id,target_id,source_hash,last_run_id) VALUES ${batch.map(() => "('pcmarket','brand',?,?,?,?)").join(',')} ON DUPLICATE KEY UPDATE target_id=VALUES(target_id),source_hash=VALUES(source_hash),last_run_id=VALUES(last_run_id)`,
    batch.flatMap((record) => [record.sourceId, record.targetId, record.hash, runId]),
  ));
}

async function bumpCaches(connection: PoolConnection) {
  for (const key of ['public_products', 'public_catalog_details', 'catalog', 'search', 'homepage']) {
    await connection.query('INSERT INTO web_admin_cache_versions(cache_key,version) VALUES(?,2) ON DUPLICATE KEY UPDATE version=version+1', [key]);
  }
}

async function restoreRelations(connection: PoolConnection, runId: number) {
  for (const table of RELATION_BACKUPS) {
    const backup = backupName(runId, table.replace(/^idv_|^web_admin_/, ''));
    await connection.query(`DELETE FROM ${quote(table)}`);
    await connection.query(`INSERT INTO ${quote(table)} SELECT * FROM ${quote(backup)}`);
  }
}

async function countAliasReferences(db: Db) {
  let total = 0;
  for (const table of BRAND_ID_TABLES) total += await count(db, table, 'WHERE brandId IN (0,34,57)');
  return total;
}

export async function applyBrandImport(input: {
  sourceBrands: PcmarketBrand[];
  brands: NormalizedBrand[];
  report: BrandImportReport;
  snapshotHash: string;
  sourceUrl: string;
  expectedDatabase: string;
}) {
  if (process.env.ADMIN_WRITE_ENABLED !== 'true') throw new Error('ADMIN_WRITE_ENABLED=true is required for brand apply');
  await ensureLegacyImportTables();
  const connection = await pool.getConnection();
  let lockHeld = false;
  let runId = 0;
  let swapped = false;
  let relationsCommitted = false;
  let originalSqlMode = '';
  try {
    const [modeRows] = await connection.query<RowDataPacket[]>('SELECT @@SESSION.sql_mode AS mode');
    originalSqlMode = String(modeRows[0]?.mode || '');
    await connection.query("SET SESSION sql_mode=''");
    const database = await databaseName(connection);
    if (database !== input.expectedDatabase) throw new Error(`Connected database ${database} does not match ${input.expectedDatabase}`);
    const [locks] = await connection.query<RowDataPacket[]>('SELECT GET_LOCK(?,0) AS acquired', [LOCK_NAME]);
    if (Number(locks[0]?.acquired) !== 1) throw new Error('Another brand import is running');
    lockHeld = true;
    const preflight = await preflightBrandImport(input.sourceBrands, input.brands, connection);
    assertApplyPreflight(preflight);
    const [runResult] = await connection.query<ResultSetHeader>(
      "INSERT INTO web_admin_import_runs(source,entity,source_url,snapshot_hash,status,item_count,report_json) VALUES('pcmarket','brands',?,?,'applying',?,?)",
      [input.sourceUrl, input.snapshotHash, input.sourceBrands.length, JSON.stringify({ ...input.report, preflight })],
    );
    runId = Number(runResult.insertId);
    for (const table of RELATION_BACKUPS) await backupWhole(connection, runId, table);
    const stages = await createBrandStages(connection, runId, input.sourceBrands, input.brands, new Date());
    if (stages.brands !== preflight.expectedRuntimeBrands || stages.info !== preflight.expectedRuntimeBrands || stages.categories !== preflight.expectedBrandCategories) {
      throw new Error(`Brand staging count mismatch: ${JSON.stringify(stages)}`);
    }
    await swapBrandTables(connection, runId, stages);
    swapped = true;
    await connection.beginTransaction();
    try {
      await updateAliasReferences(connection);
      await insertAudit(connection, runId, input.sourceBrands, input.brands);
      await bumpCaches(connection);
      await connection.commit();
      relationsCommitted = true;
    } catch (error) {
      await connection.rollback();
      throw error;
    }
    const searchCounts = await rebuildProductSearchData();
    const finalCounts = {
      brands: await count(connection, 'idv_brand'),
      brandInfo: await count(connection, 'idv_brand_info'),
      brandCategories: await count(connection, 'idv_brand_category'),
      aliases: await countAliasReferences(connection),
      searchRows: searchCounts.searchCount,
    };
    const [productCountRows] = await connection.query<RowDataPacket[]>('SELECT COALESCE(SUM(product),0) AS brand_total,(SELECT COUNT(*) FROM idv_sell_product_store WHERE brandId>0) AS product_refs FROM idv_brand');
    const brandProductCount = Number(productCountRows[0]?.brand_total || 0);
    const productBrandReferences = Number(productCountRows[0]?.product_refs || 0);
    if (finalCounts.brands !== preflight.expectedRuntimeBrands || finalCounts.brandInfo !== preflight.expectedRuntimeBrands || finalCounts.aliases !== 0 || brandProductCount !== productBrandReferences || searchCounts.productCount !== searchCounts.searchCount || searchCounts.missingCount !== 0) {
      throw new Error(`Brand acceptance mismatch: ${JSON.stringify(finalCounts)} search=${JSON.stringify(searchCounts)}`);
    }
    await connection.query("UPDATE web_admin_import_runs SET status='applied',completed_at=NOW() WHERE id=?", [runId]);
    return { runId, preflight, staging: stages, finalCounts: { ...finalCounts, brandProductCount, productBrandReferences }, searchCounts, backupTablesRetained: true };
  } catch (error) {
    if (relationsCommitted && runId) {
      await connection.beginTransaction().catch(() => undefined);
      try {
        await restoreRelations(connection, runId);
        await bumpCaches(connection);
        await connection.commit();
      } catch {
        await connection.rollback().catch(() => undefined);
      }
    }
    if (swapped && runId) await restoreSwappedTables(connection, runId, 'failed').catch(() => undefined);
    if (runId) await connection.query("UPDATE web_admin_import_runs SET status='apply_failed',error_message=?,completed_at=NOW() WHERE id=?", [String(error instanceof Error ? error.message : error).slice(0, 2000), runId]).catch(() => undefined);
    throw error;
  } finally {
    if (lockHeld) await connection.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]).catch(() => undefined);
    await connection.query('SET SESSION sql_mode=?', [originalSqlMode]).catch(() => undefined);
    connection.release();
  }
}

export async function rollbackBrandImport(input: { runId: number; expectedDatabase: string }) {
  if (process.env.ADMIN_WRITE_ENABLED !== 'true') throw new Error('ADMIN_WRITE_ENABLED=true is required for rollback');
  const connection = await pool.getConnection();
  let lockHeld = false;
  let originalSqlMode = '';
  try {
    const [modeRows] = await connection.query<RowDataPacket[]>('SELECT @@SESSION.sql_mode AS mode');
    originalSqlMode = String(modeRows[0]?.mode || '');
    await connection.query("SET SESSION sql_mode=''");
    const database = await databaseName(connection);
    if (database !== input.expectedDatabase) throw new Error(`Connected database ${database} does not match ${input.expectedDatabase}`);
    const [locks] = await connection.query<RowDataPacket[]>('SELECT GET_LOCK(?,0) AS acquired', [LOCK_NAME]);
    if (Number(locks[0]?.acquired) !== 1) throw new Error('Another brand import is running');
    lockHeld = true;
    const [runs] = await connection.query<RowDataPacket[]>("SELECT status,rollback_closed_at FROM web_admin_import_runs WHERE id=? AND source='pcmarket' AND entity='brands' LIMIT 1", [input.runId]);
    if (!runs[0] || !['applied', 'apply_failed'].includes(String(runs[0].status))) throw new Error(`Run ${input.runId} cannot be rolled back`);
    if (runs[0].rollback_closed_at) throw new Error(`Run ${input.runId} rollback window is closed`);
    const [later] = await connection.query<RowDataPacket[]>("SELECT id,entity FROM web_admin_import_runs WHERE status='applied' AND id>? ORDER BY id ASC LIMIT 1", [input.runId]);
    if (later.length) throw new Error(`Rollback later applied import run ${later[0].id} (${later[0].entity}) first`);
    await connection.query("UPDATE web_admin_import_runs SET status='rolling_back',completed_at=NULL,error_message='' WHERE id=?", [input.runId]);
    await connection.beginTransaction();
    try {
      await restoreRelations(connection, input.runId);
      await bumpCaches(connection);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    }
    await restoreSwappedTables(connection, input.runId, 'rolled_back');
    const searchCounts = await rebuildProductSearchData();
    await connection.query("UPDATE web_admin_import_runs SET status='rolled_back',completed_at=NOW() WHERE id=?", [input.runId]);
    return { runId: input.runId, status: 'rolled_back', searchCounts, backupTablesRetained: true };
  } catch (error) {
    await connection.query("UPDATE web_admin_import_runs SET status='rollback_failed',error_message=?,completed_at=NOW() WHERE id=?", [String(error instanceof Error ? error.message : error).slice(0, 2000), input.runId]).catch(() => undefined);
    throw error;
  } finally {
    if (lockHeld) await connection.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]).catch(() => undefined);
    await connection.query('SET SESSION sql_mode=?', [originalSqlMode]).catch(() => undefined);
    connection.release();
  }
}
