import crypto from 'crypto';
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { ensureProductSearchInfrastructure } from '@/lib/searchInfrastructure';
import { normalizeSearchText } from '@/lib/searchRules';
import type { NormalizedAttribute, NormalizedBrand, NormalizedProduct, ProductCatalogReport } from './pcmarketProducts';
import { productCatalogSha256 } from './pcmarketProducts';
import { ensureLegacyImportTables } from './tables';

const LOCK_NAME = 'web_admin:legacy_import:products';
const PRODUCT_ID_PATH_PREFIX = 'module:product/view:product-detail/view_id:';
const PRODUCT_TABLES = [
  'idv_sell_product_store', 'idv_sell_product_price', 'idv_sell_product_info', 'idv_product_category',
  'idv_product_attribute', 'product_data_search', 'idv_brand', 'idv_brand_info', 'idv_attribute',
  'idv_attribute_value', 'idv_attribute_category',
] as const;
type Db = Pool | PoolConnection;

export type PendingCategoryAttribute = { categoryId: number; attributes: Array<{ id: number; name: string; status: number }> };
export type ProductImportPreflight = {
  database: string;
  categories: number;
  categoryRoutes: number;
  currentCounts: Record<string, number>;
  productRoutes: number;
  routeConflicts: Array<{ requestPath: string; idPath: string }>;
  missingCategoryIds: number[];
  pendingCategoryRows: number;
  searchInfrastructurePreexisting: boolean;
  engines: Record<string, string>;
};

function quote(identifier: string) {
  if (!/^[a-zA-Z0-9_]+$/.test(identifier)) throw new Error(`Unsafe SQL identifier: ${identifier}`);
  return `\`${identifier}\``;
}

function backupName(runId: number, suffix: string) {
  return `web_admin_import_b_${runId}_${suffix}`;
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
  const [rows] = await db.query<RowDataPacket[]>(
    'SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME=? LIMIT 1',
    [database, table],
  );
  return rows.length > 0;
}

export async function loadPendingCategoryAttributes(db: Db = pool): Promise<PendingCategoryAttribute[]> {
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT normalized_json
    FROM web_admin_import_records
    WHERE run_id=(SELECT MAX(id) FROM web_admin_import_runs WHERE source='pcmarket' AND entity='product-categories' AND status='applied')
      AND entity='product-category' AND relation_status='pending'
    ORDER BY CAST(source_id AS UNSIGNED)
  `);
  return rows.map((row) => {
    const value = JSON.parse(String(row.normalized_json || '{}')) as PendingCategoryAttribute & { id?: number };
    return { categoryId: Number(value.categoryId || value.id), attributes: Array.isArray(value.attributes) ? value.attributes : [] };
  }).filter((row) => row.categoryId > 0 && row.attributes.length > 0);
}

export async function preflightProductImport(products: NormalizedProduct[], db: Db = pool): Promise<ProductImportPreflight> {
  const database = await databaseName(db);
  const required = [...PRODUCT_TABLES, 'idv_brand_category', 'idv_url', 'idv_seller_category', 'web_admin_import_runs', 'web_admin_import_records'];
  const [tableRows] = await db.query<RowDataPacket[]>(
    `SELECT TABLE_NAME,ENGINE FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME IN (${required.map(() => '?').join(',')})`,
    [database, ...required],
  );
  const engines = Object.fromEntries(tableRows.map((row) => [String(row.TABLE_NAME), String(row.ENGINE)]));
  const missing = required.filter((table) => !engines[table]);
  if (missing.length) throw new Error(`Missing product import tables: ${missing.join(', ')}`);
  for (const table of PRODUCT_TABLES) {
    if (engines[table] !== 'InnoDB') throw new Error(`${table} must use InnoDB; found ${engines[table]}`);
  }
  if (engines.idv_brand_category !== 'MyISAM') throw new Error(`idv_brand_category must use MyISAM; found ${engines.idv_brand_category}`);

  const currentCounts: Record<string, number> = {};
  for (const table of [...PRODUCT_TABLES, 'idv_brand_category', 'combo_set', 'combo_set_product', 'config_group', 'config_group_product']) {
    if (await tableExists(db, database, table)) currentCounts[table] = await count(db, table);
  }

  const categoryIds = Array.from(new Set(products.flatMap((product) => product.categoryIds)));
  const existingCategoryIds = new Set<number>();
  for (let offset = 0; offset < categoryIds.length; offset += 500) {
    const batch = categoryIds.slice(offset, offset + 500);
    if (!batch.length) continue;
    const [rows] = await db.query<RowDataPacket[]>(`SELECT id FROM idv_seller_category WHERE id IN (${batch.map(() => '?').join(',')})`, batch);
    rows.forEach((row) => existingCategoryIds.add(Number(row.id)));
  }
  const missingCategoryIds = categoryIds.filter((id) => !existingCategoryIds.has(id));

  const routeConflicts: ProductImportPreflight['routeConflicts'] = [];
  for (let offset = 0; offset < products.length; offset += 200) {
    const paths = products.slice(offset, offset + 200).map((product) => product.requestPath);
    const [rows] = await db.query<RowDataPacket[]>(
      `SELECT request_path,id_path FROM idv_url WHERE request_path IN (${paths.map(() => '?').join(',')}) AND id_path NOT LIKE ?`,
      [...paths, `${PRODUCT_ID_PATH_PREFIX}%`],
    );
    routeConflicts.push(...rows.map((row) => ({ requestPath: String(row.request_path), idPath: String(row.id_path) })));
  }
  const [searchRows] = await db.query<RowDataPacket[]>(`
    SELECT
      (SELECT COUNT(*) FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA=? AND ROUTINE_NAME='webtech_normalize_product_search') AS routine_count,
      (SELECT COUNT(*) FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=? AND TRIGGER_NAME IN ('webtech_product_search_after_insert','webtech_product_search_after_update')) AS trigger_count
  `, [database, database]);
  return {
    database,
    categories: await count(db, 'idv_seller_category'),
    categoryRoutes: await count(db, 'idv_url', 'WHERE id_path LIKE ?', ['module:product/view:category/view_id:%']),
    currentCounts,
    productRoutes: await count(db, 'idv_url', 'WHERE id_path LIKE ?', [`${PRODUCT_ID_PATH_PREFIX}%`]),
    routeConflicts,
    missingCategoryIds,
    pendingCategoryRows: await count(db, 'web_admin_import_records', "WHERE entity='product-category' AND relation_status='pending'"),
    searchInfrastructurePreexisting: Number(searchRows[0]?.routine_count || 0) === 1 && Number(searchRows[0]?.trigger_count || 0) === 2,
    engines,
  };
}

async function backupWhole(connection: PoolConnection, runId: number, table: string, suffix = table.replace(/^idv_|^web_admin_/, '')) {
  const backup = backupName(runId, suffix);
  await connection.query(`CREATE TABLE ${quote(backup)} LIKE ${quote(table)}`);
  await connection.query(`INSERT INTO ${quote(backup)} SELECT * FROM ${quote(table)}`);
}

async function backupProductRoutes(connection: PoolConnection, runId: number) {
  const backup = backupName(runId, 'product_url');
  await connection.query(`CREATE TABLE ${quote(backup)} LIKE idv_url`);
  await connection.query(`INSERT INTO ${quote(backup)} SELECT * FROM idv_url WHERE id_path LIKE ?`, [`${PRODUCT_ID_PATH_PREFIX}%`]);
}

async function insertBatches<T>(items: T[], batchSize: number, insert: (batch: T[]) => Promise<unknown>) {
  for (let offset = 0; offset < items.length; offset += batchSize) await insert(items.slice(offset, offset + batchSize));
}

async function insertBrands(connection: PoolConnection, brands: NormalizedBrand[], now: Date) {
  await insertBatches(brands, 100, (batch) => connection.query(
    `INSERT INTO idv_brand(id,brand_index,name,summary,image,product,status,is_featured,ordering,letter,lastUpdate,brand_page_view) VALUES ${batch.map(() => '(?,?,?,?,?,?,?,?,?,?,?,0)').join(',')}`,
    batch.flatMap((brand) => [brand.id, brand.index, brand.name, brand.summary, brand.image, brand.productCount, brand.status, 0, brand.ordering, brand.name.slice(0, 2).toUpperCase(), brand.lastUpdate || now]),
  ));
  await insertBatches(brands, 100, (batch) => connection.query(
    `INSERT INTO idv_brand_info(id,meta_title,meta_keywords,meta_description,sellerId,description) VALUES ${batch.map(() => '(?,?,?,?,0,?)').join(',')}`,
    batch.flatMap((brand) => [brand.id, brand.metaTitle, brand.metaKeyword, brand.metaDescription, brand.description]),
  ));
}

async function insertAttributes(connection: PoolConnection, attributes: NormalizedAttribute[]) {
  await insertBatches(attributes, 100, (batch) => connection.query(
    `INSERT INTO idv_attribute(id,scope,attribute_code,sellerId,filterCol,categoryId,icon,name,name_index,isSearch,value_match_all,filter_code,comment,isDisplay,ordering,isHeader,isMulti,for_product_option,value_count,status,create_time,last_update,in_summary,product_spec) VALUES ${batch.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',')}`,
    batch.flatMap((attribute) => [attribute.id, attribute.scope, attribute.code, 0, '', 0, '', attribute.name, attribute.code, 1, 0, attribute.code.length <= 20 ? attribute.code : null, '', attribute.isDisplay, attribute.ordering, attribute.isHeader, 0, 0, attribute.values.length, attribute.status, 0, attribute.lastUpdate, attribute.inSummary, 1]),
  ));
  const values = attributes.flatMap((attribute) => attribute.values.map((value) => ({ ...value, attributeId: attribute.id })));
  await insertBatches(values, 200, (batch) => connection.query(
    `INSERT INTO idv_attribute_value(id,attributeId,value,description,api_key,image,value_en,ordering,value_sort) VALUES ${batch.map(() => '(?,?,?,?,?,?,?,?,0)').join(',')}`,
    batch.flatMap((value) => [value.id, value.attributeId, value.value, value.description, '', '', '', value.ordering]),
  ));
}

async function insertProducts(connection: PoolConnection, products: NormalizedProduct[], now: Date) {
  await insertBatches(products, 40, (batch) => connection.query(
    `INSERT INTO idv_sell_product_store(id,realProId,product_cat,request_path,storeSKU,productModel,brandId,proName,url,url_hash,proThum,image_count,proSummary,deslen,warranty,specialOffer,promotion,postDate,lastUpdate,cond,hasVAT,meta_title,meta_keyword,meta_description,url_canonical,allow_se_index,image_collection) VALUES ${batch.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',')}`,
    batch.flatMap((product) => [product.id, 0, product.productCat, product.requestPath, product.sku, '0', product.brandId, product.name, product.path, crypto.createHash('md5').update(product.path).digest('hex'), product.mainImage, product.imageCount, product.summary, Buffer.byteLength(product.description, 'utf8'), product.warranty, product.specialOffer, '', now, now, '0', product.hasVat, product.metaTitle, product.metaKeyword, product.metaDescription, '', product.status, product.imageCollection]),
  ));
  await insertBatches(products, 100, (batch) => connection.query(
    `INSERT INTO idv_sell_product_price(id,brandId,price,old_price,market_price,purchase_price,quantity,isOn,ordering,lastUpdate,hasVAT) VALUES ${batch.map(() => '(?,?,?,?,?,?,?,?,?,?,?)').join(',')}`,
    batch.flatMap((product) => [product.id, product.brandId, product.price, product.marketPrice, product.marketPrice, product.purchasePrice, -1, product.status, product.ordering, now, product.hasVat]),
  ));
  await insertBatches(products, 40, (batch) => connection.query(
    `INSERT INTO idv_sell_product_info(id,description,deslen,spec,multipart_spec,instruction,video_code,tags,relate_article,relate_product) VALUES ${batch.map(() => '(?,?,?,?,?,?,?,?,?,?)').join(',')}`,
    batch.flatMap((product) => [product.id, product.description, Buffer.byteLength(product.description, 'utf8'), product.spec, '', '', '', '', '0', '0']),
  ));
}

async function insertRelations(connection: PoolConnection, products: NormalizedProduct[], categoryAttributes: PendingCategoryAttribute[], nowSeconds: number) {
  const categoryLinks = products.flatMap((product) => product.categoryIds.map((categoryId) => ({ product, categoryId })));
  await insertBatches(categoryLinks, 150, (batch) => connection.query(
    `INSERT INTO idv_product_category(category_id,pro_id,ordering,status,create_time,name_sort,brandId,supplier_id,price,price_off,quantity,online_only,ranking,review_rate,hasVAT,last_update,visit,from_time,to_time) VALUES ${batch.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',')}`,
    batch.flatMap(({ product, categoryId }) => [categoryId, product.id, product.ordering, product.status, nowSeconds, '0', product.brandId, 0, Math.round(product.price), 0, 0, 0, 0, 0, product.hasVat, nowSeconds, 0, 0, 0]),
  ));
  const attributeLinks = products.flatMap((product) => product.attributes.map((attribute) => ({ productId: product.id, ...attribute })));
  await insertBatches(attributeLinks, 250, (batch) => connection.query(
    `INSERT INTO idv_product_attribute(pro_id,attr_id,attr_value_id,value_sort) VALUES ${batch.map(() => '(?,?,?,0)').join(',')}`,
    batch.flatMap((relation) => [relation.productId, relation.attributeId, relation.valueId]),
  ));
  const categoryAttributeLinks = categoryAttributes.flatMap((category) => category.attributes.map((attribute, index) => ({ categoryId: category.categoryId, attribute, ordering: category.attributes.length - index })));
  await insertBatches(categoryAttributeLinks, 200, (batch) => connection.query(
    `INSERT INTO idv_attribute_category(attr_id,category_id,seller_id,ordering,status) VALUES ${batch.map(() => '(?,?,?,?,?)').join(',')}`,
    batch.flatMap((relation) => [relation.attribute.id, relation.categoryId, 0, relation.ordering, relation.attribute.status]),
  ));
}

async function insertRoutesAndSearch(connection: PoolConnection, products: NormalizedProduct[]) {
  await insertBatches(products, 150, (batch) => connection.query(
    `INSERT INTO idv_url(url_type,target_path,request_path,request_path_index,id_path,redirect_code,create_time,create_by,last_update,last_update_by) VALUES ${batch.map(() => "('product:product-detail','',?,?,?,'',0,'legacy-import',0,'legacy-import')").join(',')}`,
    batch.flatMap((product) => [product.requestPath, crypto.createHash('md5').update(product.requestPath).digest('hex'), `${PRODUCT_ID_PATH_PREFIX}${product.id}`]),
  ));
  await insertBatches(products, 200, (batch) => connection.query(
    `INSERT INTO product_data_search(product_id,data_search) VALUES ${batch.map(() => '(?,?)').join(',')}`,
    batch.flatMap((product) => [product.id, normalizeSearchText(`${product.sku} ${product.name}`)]),
  ));
}

async function insertAudit(connection: PoolConnection, runId: number, products: NormalizedProduct[], brands: NormalizedBrand[], attributes: NormalizedAttribute[]) {
  const records: Array<{ entity: string; sourceId: string; targetId: string | null; payload: unknown; status: 'none' | 'pending' | 'applied' }> = [];
  products.forEach((product) => {
    records.push({ entity: 'product', sourceId: String(product.id), targetId: String(product.id), payload: product, status: 'applied' });
    if (product.variants.length) records.push({ entity: 'product-variants', sourceId: String(product.id), targetId: String(product.id), payload: product.variants, status: 'pending' });
    if (product.configGroup) records.push({ entity: 'product-config-group', sourceId: String(product.id), targetId: String(product.id), payload: product.configGroup, status: 'pending' });
    if (product.comboSets.length) records.push({ entity: 'product-comboset', sourceId: String(product.id), targetId: String(product.id), payload: product.comboSets, status: 'pending' });
  });
  brands.forEach((brand) => brand.sourceIds.forEach((sourceId) => records.push({
    entity: 'brand',
    sourceId: String(sourceId),
    targetId: String(brand.id),
    payload: { ...brand, sourceId },
    status: 'applied',
  })));
  attributes.forEach((attribute) => {
    records.push({ entity: 'attribute', sourceId: String(attribute.id), targetId: String(attribute.id), payload: attribute, status: 'applied' });
    attribute.values.forEach((value) => records.push({ entity: 'attribute-value', sourceId: String(value.id), targetId: String(value.id), payload: { ...value, attributeId: attribute.id }, status: 'applied' }));
  });
  await insertBatches(records, 40, async (batch) => {
    const values = batch.flatMap((record) => {
      const json = JSON.stringify(record.payload);
      return [runId, record.entity, record.sourceId, record.targetId, productCatalogSha256(json), json, record.status];
    });
    await connection.query(
      `INSERT INTO web_admin_import_records(run_id,entity,source_id,target_id,payload_hash,normalized_json,relation_status) VALUES ${batch.map(() => '(?,?,?,?,?,?,?)').join(',')}`,
      values,
    );
  });
  const mappings = records.filter((record) => ['product', 'brand', 'attribute', 'attribute-value'].includes(record.entity));
  await insertBatches(mappings, 100, (batch) => connection.query(
    `INSERT INTO web_admin_import_entity_map(source,entity,source_id,target_id,source_hash,last_run_id) VALUES ${batch.map(() => "('pcmarket',?,?,?,?,?)").join(',')} ON DUPLICATE KEY UPDATE target_id=VALUES(target_id),source_hash=VALUES(source_hash),last_run_id=VALUES(last_run_id)`,
    batch.flatMap((record) => {
      const hash = productCatalogSha256(JSON.stringify(record.payload));
      return [record.entity, record.sourceId, record.targetId, hash, runId];
    }),
  ));
}

async function bumpCaches(connection: PoolConnection, database: string) {
  if (!await tableExists(connection, database, 'web_admin_cache_versions')) return;
  for (const key of ['public_products', 'public_catalog_details', 'catalog', 'search']) {
    await connection.query('INSERT INTO web_admin_cache_versions(cache_key,version) VALUES(?,2) ON DUPLICATE KEY UPDATE version=version+1', [key]);
  }
}

async function populateBrandCategoryStage(connection: PoolConnection, runId: number, products: NormalizedProduct[]) {
  const stage = `web_admin_import_stage_${runId}_brand_category`;
  await connection.query(`CREATE TABLE ${quote(stage)} LIKE idv_brand_category`);
  const grouped = new Map<string, { brandId: number; categoryId: number; count: number }>();
  for (const product of products) for (const categoryId of product.categoryIds) {
    if (!product.brandId) continue;
    const key = `${product.brandId}:${categoryId}`;
    const current = grouped.get(key) || { brandId: product.brandId, categoryId, count: 0 };
    current.count += 1;
    grouped.set(key, current);
  }
  const rows = [...grouped.values()];
  await insertBatches(rows, 250, (batch) => connection.query(
    `INSERT INTO ${quote(stage)}(brandId,catId,proCount,proDtCount) VALUES ${batch.map(() => '(?,?,?,?)').join(',')}`,
    batch.flatMap((row) => [row.brandId, row.categoryId, row.count, row.count]),
  ));
  return { stage, count: rows.length };
}

async function assertInitialEmpty(preflight: ProductImportPreflight) {
  const nonEmpty = Object.entries(preflight.currentCounts).filter(([, value]) => value > 0);
  if (preflight.productRoutes > 0) nonEmpty.push(['product routes', preflight.productRoutes]);
  if (nonEmpty.length) throw new Error(`Target catalog is not empty: ${nonEmpty.map(([name, value]) => `${name}=${value}`).join(', ')}`);
  if (preflight.categories !== 788 || preflight.categoryRoutes !== 788) throw new Error(`Expected the applied 788-category snapshot; found ${preflight.categories} categories/${preflight.categoryRoutes} routes`);
  if (preflight.missingCategoryIds.length) throw new Error(`Missing target category IDs: ${preflight.missingCategoryIds.join(', ')}`);
  if (preflight.routeConflicts.length) throw new Error('Product route conflicts block apply');
}

export async function applyProductImport(input: {
  products: NormalizedProduct[];
  brands: NormalizedBrand[];
  attributes: NormalizedAttribute[];
  categoryAttributes: PendingCategoryAttribute[];
  report: ProductCatalogReport;
  snapshotHash: string;
  sourceUrl: string;
  expectedDatabase: string;
}) {
  await ensureLegacyImportTables();
  const connection = await pool.getConnection();
  let lockHeld = false;
  let runId = 0;
  let brandTableSwapped = false;
  let coreCommitted = false;
  let preflightState: ProductImportPreflight | null = null;
  let originalSqlMode = '';
  try {
    const [modeRows] = await connection.query<RowDataPacket[]>('SELECT @@SESSION.sql_mode AS mode');
    originalSqlMode = String(modeRows[0]?.mode || '');
    await connection.query("SET SESSION sql_mode=''");
    const database = await databaseName(connection);
    if (database !== input.expectedDatabase) throw new Error(`Connected database ${database} does not match ${input.expectedDatabase}`);
    const [locks] = await connection.query<RowDataPacket[]>('SELECT GET_LOCK(?,0) AS acquired', [LOCK_NAME]);
    if (Number(locks[0]?.acquired) !== 1) throw new Error('Another product import is running');
    lockHeld = true;
    const preflight = await preflightProductImport(input.products, connection);
    preflightState = preflight;
    await assertInitialEmpty(preflight);
    const reportJson = JSON.stringify({ ...input.report, preflight });
    const [runResult] = await connection.query<ResultSetHeader>(
      `INSERT INTO web_admin_import_runs(source,entity,source_url,snapshot_hash,status,item_count,report_json) VALUES('pcmarket','products',?,?, 'applying',?,?)`,
      [input.sourceUrl, input.snapshotHash, input.products.length, reportJson],
    );
    runId = Number(runResult.insertId);
    for (const table of PRODUCT_TABLES) await backupWhole(connection, runId, table);
    await backupProductRoutes(connection, runId);
    const brandStage = await populateBrandCategoryStage(connection, runId, input.products);
    const brandBackup = backupName(runId, 'brand_category');
    await connection.query(`RENAME TABLE idv_brand_category TO ${quote(brandBackup)}, ${quote(brandStage.stage)} TO idv_brand_category`);
    brandTableSwapped = true;
    const now = new Date();
    const nowSeconds = Math.floor(now.valueOf() / 1000);
    await connection.beginTransaction();
    try {
      await insertBrands(connection, input.brands, now);
      await insertAttributes(connection, input.attributes);
      await insertProducts(connection, input.products, now);
      await insertRelations(connection, input.products, input.categoryAttributes, nowSeconds);
      await insertRoutesAndSearch(connection, input.products);
      await insertAudit(connection, runId, input.products, input.brands, input.attributes);
      await connection.query(`UPDATE web_admin_import_records SET relation_status='applied' WHERE entity='product-category' AND relation_status='pending'`);
      await bumpCaches(connection, database);
      await connection.commit();
      coreCommitted = true;
    } catch (error) {
      await connection.rollback();
      throw error;
    }
    const searchCounts = await ensureProductSearchInfrastructure();
    if (searchCounts.productCount !== input.products.length || searchCounts.searchCount !== input.products.length || searchCounts.missingCount !== 0) {
      throw new Error(`Search infrastructure mismatch: ${JSON.stringify(searchCounts)}`);
    }
    await connection.query("UPDATE web_admin_import_runs SET status='applied',completed_at=NOW() WHERE id=?", [runId]);
    return { runId, preflight, brandCategoryRows: brandStage.count, searchCounts, backupTablesRetained: true };
  } catch (error) {
    if (coreCommitted && runId) {
      await connection.beginTransaction().catch(() => undefined);
      try {
        for (const table of [...PRODUCT_TABLES].reverse()) await restoreWhole(connection, runId, table);
        await connection.query('DELETE FROM idv_url WHERE id_path LIKE ?', [`${PRODUCT_ID_PATH_PREFIX}%`]);
        await connection.query(`INSERT INTO idv_url SELECT * FROM ${quote(backupName(runId, 'product_url'))}`);
        await connection.query("UPDATE web_admin_import_records SET relation_status='pending' WHERE entity='product-category' AND relation_status='applied' AND run_id=(SELECT id FROM web_admin_import_runs WHERE source='pcmarket' AND entity='product-categories' AND status='applied' ORDER BY id DESC LIMIT 1)");
        await connection.query('DELETE FROM web_admin_import_entity_map WHERE last_run_id=?', [runId]);
        await connection.commit();
      } catch {
        await connection.rollback().catch(() => undefined);
      }
      if (!preflightState?.searchInfrastructurePreexisting) {
        await connection.query('DROP TRIGGER IF EXISTS webtech_product_search_after_insert').catch(() => undefined);
        await connection.query('DROP TRIGGER IF EXISTS webtech_product_search_after_update').catch(() => undefined);
        await connection.query('DROP FUNCTION IF EXISTS webtech_normalize_product_search').catch(() => undefined);
      }
    }
    if (runId) await connection.query("UPDATE web_admin_import_runs SET status='apply_failed',error_message=?,completed_at=NOW() WHERE id=?", [String(error instanceof Error ? error.message : error).slice(0, 2000), runId]).catch(() => undefined);
    if (brandTableSwapped && runId) {
      await restoreBrandCategoryFromBackup(connection, runId, 'failed_brand_category').catch(() => undefined);
    }
    throw error;
  } finally {
    if (lockHeld) await connection.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]).catch(() => undefined);
    await connection.query('SET SESSION sql_mode=?', [originalSqlMode]).catch(() => undefined);
    connection.release();
  }
}

async function restoreWhole(connection: PoolConnection, runId: number, table: string, suffix = table.replace(/^idv_|^web_admin_/, '')) {
  const backup = backupName(runId, suffix);
  await connection.query(`DELETE FROM ${quote(table)}`);
  await connection.query(`INSERT INTO ${quote(table)} SELECT * FROM ${quote(backup)}`);
}

async function restoreBrandCategoryFromBackup(connection: PoolConnection, runId: number, importedSuffix = 'imported_brand_category') {
  const backup = backupName(runId, 'brand_category');
  const restore = `web_admin_import_restore_${runId}_brand_category`;
  const imported = backupName(runId, importedSuffix);
  await connection.query(`CREATE TABLE ${quote(restore)} LIKE ${quote(backup)}`);
  await connection.query(`INSERT INTO ${quote(restore)} SELECT * FROM ${quote(backup)}`);
  await connection.query(`RENAME TABLE idv_brand_category TO ${quote(imported)}, ${quote(restore)} TO idv_brand_category`);
}

export async function rollbackProductImport(input: { runId: number; expectedDatabase: string }) {
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
    if (Number(locks[0]?.acquired) !== 1) throw new Error('Another product import is running');
    lockHeld = true;
    const [runs] = await connection.query<RowDataPacket[]>("SELECT status,report_json FROM web_admin_import_runs WHERE id=? AND source='pcmarket' AND entity='products' LIMIT 1", [input.runId]);
    if (!runs[0] || !['applied', 'apply_failed'].includes(String(runs[0].status))) throw new Error(`Run ${input.runId} cannot be rolled back`);
    const [dependentBrandRuns] = await connection.query<RowDataPacket[]>("SELECT id FROM web_admin_import_runs WHERE source='pcmarket' AND entity='brands' AND status='applied' AND id>? ORDER BY id DESC LIMIT 1", [input.runId]);
    if (dependentBrandRuns.length) throw new Error(`Rollback brand run ${dependentBrandRuns[0].id} before product run ${input.runId}`);
    await connection.query("UPDATE web_admin_import_runs SET status='rolling_back',completed_at=NULL,error_message='' WHERE id=?", [input.runId]);
    await connection.beginTransaction();
    try {
      for (const table of [...PRODUCT_TABLES].reverse()) await restoreWhole(connection, input.runId, table);
      await connection.query("DELETE FROM idv_url WHERE id_path LIKE ?", [`${PRODUCT_ID_PATH_PREFIX}%`]);
      await connection.query(`INSERT INTO idv_url SELECT * FROM ${quote(backupName(input.runId, 'product_url'))}`);
      await connection.query("UPDATE web_admin_import_records SET relation_status='pending' WHERE entity='product-category' AND relation_status='applied' AND run_id=(SELECT id FROM web_admin_import_runs WHERE source='pcmarket' AND entity='product-categories' AND status='applied' ORDER BY id DESC LIMIT 1)");
      await connection.query('DELETE FROM web_admin_import_entity_map WHERE last_run_id=?', [input.runId]);
      await bumpCaches(connection, database);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    }
    const brandBackup = backupName(input.runId, 'brand_category');
    if (await tableExists(connection, database, brandBackup)) {
      await restoreBrandCategoryFromBackup(connection, input.runId);
    }
    const report = JSON.parse(String(runs[0].report_json || '{}')) as { preflight?: { searchInfrastructurePreexisting?: boolean } };
    if (!report.preflight?.searchInfrastructurePreexisting) {
      await connection.query('DROP TRIGGER IF EXISTS webtech_product_search_after_insert');
      await connection.query('DROP TRIGGER IF EXISTS webtech_product_search_after_update');
      await connection.query('DROP FUNCTION IF EXISTS webtech_normalize_product_search');
    }
    await connection.query("UPDATE web_admin_import_runs SET status='rolled_back',completed_at=NOW() WHERE id=?", [input.runId]);
    return { runId: input.runId, status: 'rolled_back', backupTablesRetained: true };
  } catch (error) {
    await connection.query("UPDATE web_admin_import_runs SET status='rollback_failed',error_message=?,completed_at=NOW() WHERE id=?", [String(error instanceof Error ? error.message : error).slice(0, 2000), input.runId]).catch(() => undefined);
    throw error;
  } finally {
    if (lockHeld) await connection.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]).catch(() => undefined);
    await connection.query('SET SESSION sql_mode=?', [originalSqlMode]).catch(() => undefined);
    connection.release();
  }
}
