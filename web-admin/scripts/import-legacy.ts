import fs from 'fs/promises';
import path from 'path';
import pool from '../src/lib/db';
import {
  PCM_CATEGORY_CONFIRMATION,
  PCM_CATEGORY_SOURCE,
  canonicalCategorySnapshot,
  normalizePcmarketCategories,
  sha256,
} from '../src/lib/legacyImport/pcmarketProductCategories';
import { fetchPcmarketCategorySnapshot } from '../src/lib/legacyImport/source';
import {
  applyProductCategoryImport,
  preflightProductCategoryImport,
  rollbackProductCategoryImport,
} from '../src/lib/legacyImport/productCategoryDatabase';
import {
  PCM_ATTRIBUTE_SOURCE,
  PCM_BRAND_CONFIRMATION,
  PCM_BRAND_SOURCE,
  PCM_PRODUCT_CONFIRMATION,
  PCM_PRODUCT_SOURCE,
  canonicalBrandSnapshot,
  canonicalProductCatalogSnapshot,
  normalizePcmarketBrands,
  normalizePcmarketProductCatalog,
  productCatalogSha256,
} from '../src/lib/legacyImport/pcmarketProducts';
import {
  fetchPcmarketAttributeSnapshot,
  fetchPcmarketBrandSnapshot,
  fetchPcmarketProductSnapshot,
} from '../src/lib/legacyImport/productSource';
import {
  applyProductImport,
  loadPendingCategoryAttributes,
  preflightProductImport,
  rollbackProductImport,
} from '../src/lib/legacyImport/productDatabase';
import {
  applyBrandImport,
  preflightBrandImport,
  rollbackBrandImport,
} from '../src/lib/legacyImport/brandDatabase';
import {
  PCM_ARTICLE_CATEGORY_CONFIRMATION,
  PCM_ARTICLE_CATEGORY_SOURCE,
  articleCategorySha256,
  canonicalArticleCategorySnapshot,
  normalizePcmarketArticleCategories,
} from '../src/lib/legacyImport/pcmarketArticleCategories';
import { fetchPcmarketArticleCategorySnapshot } from '../src/lib/legacyImport/articleCategorySource';
import {
  applyArticleCategoryImport,
  preflightArticleCategoryImport,
  rollbackArticleCategoryImport,
} from '../src/lib/legacyImport/articleCategoryDatabase';
import {
  PCM_ARTICLE_CONFIRMATION,
  PCM_ARTICLE_QUARANTINED_IDS,
  PCM_ARTICLE_ROLLBACK_CONFIRMATION,
  PCM_ARTICLE_SOURCE,
  articleSha256,
  canonicalArticleSnapshot,
  normalizePcmarketArticles,
} from '../src/lib/legacyImport/pcmarketArticles';
import { fetchPcmarketArticleSnapshot } from '../src/lib/legacyImport/articleSource';
import {
  applyArticleImport,
  preflightArticleImport,
  rollbackArticleImport,
} from '../src/lib/legacyImport/articleDatabase';

type Args = Record<string, string | boolean>;

function parseArgs(argv: string[]) {
  const parsed: Args = {};
  for (const argument of argv) {
    if (!argument.startsWith('--')) throw new Error(`Unknown argument: ${argument}`);
    const [key, ...rest] = argument.slice(2).split('=');
    parsed[key] = rest.length ? rest.join('=') : true;
  }
  return parsed;
}

function requireArg(args: Args, key: string) {
  const value = args[key];
  if (!value || value === true) throw new Error(`--${key}=<value> is required`);
  return String(value);
}

function requireWriteEnabled() {
  if (process.env.ADMIN_WRITE_ENABLED !== 'true') throw new Error('ADMIN_WRITE_ENABLED=true is required for apply/rollback');
  const databaseUrl = process.env.DATABASE_URL || '';
  if (databaseUrl.includes('username:password') || databaseUrl.includes('database_name')) throw new Error('DATABASE_URL still contains placeholder values');
}

async function saveAuditSnapshot(snapshot: unknown, hash: string, entity = 'product-categories') {
  const configured = process.env.LEGACY_IMPORT_ARTIFACT_DIR;
  const directory = configured ? path.resolve(configured, entity) : path.resolve(process.cwd(), 'var', 'imports', 'pcmarket', entity);
  await fs.mkdir(directory, { recursive: true });
  const file = path.join(directory, `snapshot-${hash}.json`);
  try {
    await fs.writeFile(file, `${JSON.stringify(snapshot, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
  }
  return file;
}

type AppliedAssertion = {
  name: string;
  sql: string;
  expected: number | string;
  values?: unknown[];
};

async function verifyAppliedImport(input: {
  entity: string;
  expectedDatabase: string;
  snapshotHash: string;
  assertions: AppliedAssertion[];
}) {
  const [databaseRows] = await pool.query<any[]>('SELECT DATABASE() AS name');
  const database = String(databaseRows[0]?.name || '');
  if (!database || database !== input.expectedDatabase) {
    throw new Error(`Connected database ${database || '<none>'} does not match ${input.expectedDatabase}`);
  }
  const [runRows] = await pool.query<any[]>(
    "SELECT id,snapshot_hash,status,completed_at FROM web_admin_import_runs WHERE source='pcmarket' AND entity=? AND status='applied' ORDER BY id DESC LIMIT 1",
    [input.entity],
  );
  const run = runRows[0];
  if (!run) throw new Error(`No applied PCMarket ${input.entity} run exists`);
  if (String(run.snapshot_hash) !== input.snapshotHash) {
    throw new Error(`Applied ${input.entity} hash ${String(run.snapshot_hash)} does not match current source ${input.snapshotHash}`);
  }
  const checks = [];
  for (const assertion of input.assertions) {
    const [rows] = await pool.query<any[]>(assertion.sql, assertion.values || []);
    const row = rows[0] || {};
    const value = row.actual ?? row[Object.keys(row)[0]];
    const actual = typeof assertion.expected === 'number' ? Number(value) : String(value ?? '');
    checks.push({ name: assertion.name, expected: assertion.expected, actual, ok: actual === assertion.expected });
  }
  const failed = checks.filter((check) => !check.ok);
  if (failed.length) throw new Error(`Applied ${input.entity} verification failed: ${JSON.stringify(failed)}`);
  return {
    database,
    runId: Number(run.id),
    status: String(run.status),
    completedAt: run.completed_at,
    snapshotHash: input.snapshotHash,
    checks,
  };
}

async function runProductImport(args: Args, mode: string) {
  if (mode === 'rollback') {
    requireWriteEnabled();
    const runId = Number(requireArg(args, 'run-id'));
    if (!Number.isInteger(runId) || runId <= 0) throw new Error('--run-id must be a positive integer');
    const result = await rollbackProductImport({ runId, expectedDatabase: requireArg(args, 'expected-database') });
    console.log(JSON.stringify({ mode, result, restartRequired: true, backupTablesRetained: true }, null, 2));
    return;
  }
  const endpoints = {
    products: String(args['source-url'] || process.env.LEGACY_IMPORT_PCMARKET_PRODUCT_URL || PCM_PRODUCT_SOURCE),
    brands: String(process.env.LEGACY_IMPORT_PCMARKET_BRAND_URL || PCM_BRAND_SOURCE),
    attributes: String(process.env.LEGACY_IMPORT_PCMARKET_ATTRIBUTE_URL || PCM_ATTRIBUTE_SOURCE),
  };
  const download = () => Promise.all([
    fetchPcmarketProductSnapshot({ endpoint: endpoints.products }),
    fetchPcmarketBrandSnapshot({ endpoint: endpoints.brands }),
    fetchPcmarketAttributeSnapshot({ endpoint: endpoints.attributes }),
  ]);
  const first = await download();
  const second = await download();
  const firstCanonical = canonicalProductCatalogSnapshot({ products: first[0].items, brands: first[1].items, attributes: first[2].items });
  const secondCanonical = canonicalProductCatalogSnapshot({ products: second[0].items, brands: second[1].items, attributes: second[2].items });
  const snapshotHash = productCatalogSha256(firstCanonical);
  const secondHash = productCatalogSha256(secondCanonical);
  if (snapshotHash !== secondHash) throw new Error(`Source changed between downloads: ${snapshotHash} != ${secondHash}`);
  const categoryAttributes = await loadPendingCategoryAttributes();
  const normalized = normalizePcmarketProductCatalog({
    products: first[0].items,
    brands: first[1].items,
    attributes: first[2].items,
    categoryAttributes,
  });
  const snapshotFile = await saveAuditSnapshot({
    sources: endpoints,
    snapshotHash,
    sourceHashes: {
      products: productCatalogSha256(JSON.stringify([...first[0].items].sort((a, b) => a.id - b.id))),
      brands: productCatalogSha256(JSON.stringify([...first[1].items].sort((a, b) => a.id - b.id))),
      attributes: productCatalogSha256(JSON.stringify([...first[2].items].sort((a, b) => a.id - b.id))),
    },
    downloadedAt: new Date().toISOString(),
    pages: { products: first[0].pages, brands: first[1].pages, attributes: first[2].pages },
  }, snapshotHash, 'products');
  const preflight = await preflightProductImport(normalized.products);
  const output = {
    mode,
    sources: endpoints,
    snapshotHash,
    snapshotFile,
    report: normalized.report,
    preflight,
    plannedChanges: {
      products: normalized.products.length,
      productRoutes: normalized.products.length,
      productCategoryLinks: normalized.report.productCategoryLinks,
      productAttributeLinks: normalized.report.productAttributeLinks,
      categoryAttributeLinks: normalized.report.categoryAttributeLinks,
      brands: normalized.brands.length,
      attributes: normalized.attributes.length,
      backupTablesRetainedUntilAcceptance: true,
    },
    rollbackCommand: 'npm run import:legacy -- --source=pcmarket --entity=products --rollback --run-id=<id> --expected-database=<name>',
  };
  if (mode === 'verify-applied') {
    const result = await verifyAppliedImport({
      entity: 'products',
      expectedDatabase: requireArg(args, 'expected-database'),
      snapshotHash,
      assertions: [
        { name: 'products', sql: 'SELECT COUNT(*) AS actual FROM idv_sell_product_store', expected: normalized.products.length },
        { name: 'prices', sql: 'SELECT COUNT(*) AS actual FROM idv_sell_product_price', expected: normalized.products.length },
        { name: 'info', sql: 'SELECT COUNT(*) AS actual FROM idv_sell_product_info', expected: normalized.products.length },
        { name: 'search', sql: 'SELECT COUNT(*) AS actual FROM product_data_search', expected: normalized.products.length },
        { name: 'routes', sql: "SELECT COUNT(*) AS actual FROM idv_url WHERE id_path LIKE 'module:product/view:product-detail/view_id:%'", expected: normalized.products.length },
        { name: 'category-links', sql: 'SELECT COUNT(*) AS actual FROM idv_product_category', expected: normalized.report.productCategoryLinks },
        { name: 'attribute-links', sql: 'SELECT COUNT(*) AS actual FROM idv_product_attribute', expected: normalized.report.productAttributeLinks },
        { name: 'missing-price', sql: 'SELECT COUNT(*) AS actual FROM idv_sell_product_store p LEFT JOIN idv_sell_product_price x ON x.id=p.id WHERE x.id IS NULL', expected: 0 },
        { name: 'missing-info', sql: 'SELECT COUNT(*) AS actual FROM idv_sell_product_store p LEFT JOIN idv_sell_product_info x ON x.id=p.id WHERE x.id IS NULL', expected: 0 },
        { name: 'missing-search', sql: 'SELECT COUNT(*) AS actual FROM idv_sell_product_store p LEFT JOIN product_data_search x ON x.product_id=p.id WHERE x.product_id IS NULL', expected: 0 },
        { name: 'orphan-category-links', sql: 'SELECT COUNT(*) AS actual FROM idv_product_category pc LEFT JOIN idv_sell_product_store p ON p.id=pc.pro_id LEFT JOIN idv_seller_category c ON c.id=pc.category_id WHERE p.id IS NULL OR c.id IS NULL', expected: 0 },
        { name: 'noncanonical-brands', sql: 'SELECT COUNT(*) AS actual FROM idv_sell_product_store WHERE brandId IN (0,34,57)', expected: 0 },
      ],
    });
    console.log(JSON.stringify({ ...output, result }, null, 2));
    return;
  }
  if (mode === 'dry-run') {
    console.log(JSON.stringify(output, null, 2));
    if (preflight.routeConflicts.length || preflight.missingCategoryIds.length) process.exitCode = 2;
    return;
  }
  requireWriteEnabled();
  const expectedDatabase = requireArg(args, 'expected-database');
  const expectedHash = requireArg(args, 'expected-hash');
  if (expectedHash !== snapshotHash) throw new Error(`Snapshot hash mismatch: downloaded ${snapshotHash}, expected ${expectedHash}`);
  if (requireArg(args, 'confirm') !== PCM_PRODUCT_CONFIRMATION) throw new Error(`--confirm=${PCM_PRODUCT_CONFIRMATION} is required`);
  if (args['backup-confirmed'] !== true) throw new Error('--backup-confirmed is required after verifying a full MySQL backup');
  if (args['maintenance-window'] !== true) throw new Error('--maintenance-window is required');
  const result = await applyProductImport({ ...normalized, categoryAttributes, snapshotHash, sourceUrl: endpoints.products, expectedDatabase });
  console.log(JSON.stringify({ ...output, result, restartRequired: true }, null, 2));
}

async function runBrandImport(args: Args, mode: string) {
  if (mode === 'rollback') {
    requireWriteEnabled();
    const runId = Number(requireArg(args, 'run-id'));
    if (!Number.isInteger(runId) || runId <= 0) throw new Error('--run-id must be a positive integer');
    const result = await rollbackBrandImport({ runId, expectedDatabase: requireArg(args, 'expected-database') });
    console.log(JSON.stringify({ mode, result, restartRequired: true, backupTablesRetained: true }, null, 2));
    return;
  }
  const endpoint = String(args['source-url'] || process.env.LEGACY_IMPORT_PCMARKET_BRAND_URL || PCM_BRAND_SOURCE);
  const first = await fetchPcmarketBrandSnapshot({ endpoint });
  const second = await fetchPcmarketBrandSnapshot({ endpoint });
  const snapshotHash = productCatalogSha256(canonicalBrandSnapshot(first.items));
  const secondHash = productCatalogSha256(canonicalBrandSnapshot(second.items));
  if (snapshotHash !== secondHash) throw new Error(`Source changed between downloads: ${snapshotHash} != ${secondHash}`);
  const normalized = normalizePcmarketBrands(first.items);
  const snapshotFile = await saveAuditSnapshot({
    source: endpoint,
    snapshotHash,
    downloadedAt: new Date().toISOString(),
    pages: first.pages,
  }, snapshotHash, 'brands');
  const preflight = await preflightBrandImport(normalized.sourceBrands, normalized.brands);
  const requestedDatabase = args['expected-database'];
  if (requestedDatabase && requestedDatabase !== true && String(requestedDatabase) !== preflight.database) {
    throw new Error(`Connected database ${preflight.database} does not match ${requestedDatabase}`);
  }
  const output = {
    mode,
    source: endpoint,
    snapshotHash,
    snapshotFile,
    report: normalized.report,
    preflight,
    plannedChanges: {
      sourceBrands: normalized.sourceBrands.length,
      runtimeBrands: normalized.brands.length + preflight.targetOnlyBrandIds.length,
      targetOnlyBrandsPreserved: preflight.targetOnlyBrandIds,
      aliasReferences: preflight.aliasReferences,
      brandCategoryRows: preflight.expectedBrandCategories,
      charset: 'utf8mb4_unicode_ci',
      backupTablesRetainedUntilAcceptance: true,
    },
    rollbackCommand: 'npm run import:legacy -- --source=pcmarket --entity=brands --rollback --run-id=<id> --expected-database=<name>',
  };
  if (mode === 'verify-applied') {
    const result = await verifyAppliedImport({
      entity: 'brands',
      expectedDatabase: requireArg(args, 'expected-database'),
      snapshotHash,
      assertions: [
        { name: 'brands', sql: 'SELECT COUNT(*) AS actual FROM idv_brand', expected: preflight.expectedRuntimeBrands },
        { name: 'brand-info', sql: 'SELECT COUNT(*) AS actual FROM idv_brand_info', expected: preflight.expectedRuntimeBrands },
        { name: 'brand-category', sql: 'SELECT COUNT(*) AS actual FROM idv_brand_category', expected: preflight.expectedBrandCategories },
        { name: 'pcm-row', sql: "SELECT COUNT(*) AS actual FROM idv_brand WHERE id=96 AND brand_index='pcm' AND name='PCM' AND status=1 AND ordering=8388607", expected: 1 },
        { name: 'pcm-products', sql: 'SELECT COUNT(*) AS actual FROM idv_sell_product_store WHERE brandId=96', expected: 2276 },
        { name: 'pcm-enabled-products', sql: 'SELECT COUNT(*) AS actual FROM idv_sell_product_store p JOIN idv_sell_product_price pr ON pr.id=p.id WHERE p.brandId=96 AND pr.isOn=1', expected: 849 },
        { name: 'noncanonical-store-brands', sql: 'SELECT COUNT(*) AS actual FROM idv_sell_product_store WHERE brandId IN (0,34,57)', expected: 0 },
        { name: 'noncanonical-price-brands', sql: 'SELECT COUNT(*) AS actual FROM idv_sell_product_price WHERE brandId IN (0,34,57)', expected: 0 },
        { name: 'noncanonical-category-brands', sql: 'SELECT COUNT(*) AS actual FROM idv_product_category WHERE brandId IN (0,34,57)', expected: 0 },
        { name: 'brand-source-maps', sql: "SELECT COUNT(*) AS actual FROM web_admin_import_entity_map WHERE source='pcmarket' AND entity='brand'", expected: normalized.sourceBrands.length + 1 },
        { name: 'fallback-map', sql: "SELECT COUNT(*) AS actual FROM web_admin_import_entity_map WHERE source='pcmarket' AND entity='brand' AND source_id='0' AND target_id='96'", expected: 1 },
        { name: 'alias-map-34', sql: "SELECT COUNT(*) AS actual FROM web_admin_import_entity_map WHERE source='pcmarket' AND entity='brand' AND source_id='34' AND target_id='25'", expected: 1 },
        { name: 'alias-map-57', sql: "SELECT COUNT(*) AS actual FROM web_admin_import_entity_map WHERE source='pcmarket' AND entity='brand' AND source_id='57' AND target_id='31'", expected: 1 },
        { name: 'search', sql: 'SELECT COUNT(*) AS actual FROM product_data_search', expected: 4712 },
        { name: 'pcm-last', sql: 'SELECT COUNT(*) AS actual FROM idv_brand WHERE id=96 AND ordering=(SELECT MAX(ordering) FROM idv_brand)', expected: 1 },
      ],
    });
    console.log(JSON.stringify({ ...output, result }, null, 2));
    return;
  }
  if (mode === 'dry-run') {
    console.log(JSON.stringify(output, null, 2));
    if (preflight.pathConflicts.length || preflight.unexpectedBrandIdTables.length || !preflight.latestProductRunId || preflight.missingSearchRows) process.exitCode = 2;
    return;
  }
  requireWriteEnabled();
  const expectedDatabase = requireArg(args, 'expected-database');
  const expectedHash = requireArg(args, 'expected-hash');
  if (expectedHash !== snapshotHash) throw new Error(`Snapshot hash mismatch: downloaded ${snapshotHash}, expected ${expectedHash}`);
  if (requireArg(args, 'confirm') !== PCM_BRAND_CONFIRMATION) throw new Error(`--confirm=${PCM_BRAND_CONFIRMATION} is required`);
  if (args['backup-confirmed'] !== true) throw new Error('--backup-confirmed is required after verifying a full MySQL backup');
  if (args['maintenance-window'] !== true) throw new Error('--maintenance-window is required');
  const result = await applyBrandImport({ ...normalized, snapshotHash, sourceUrl: endpoint, expectedDatabase });
  console.log(JSON.stringify({ ...output, result, restartRequired: true }, null, 2));
}

async function runArticleCategoryImport(args: Args, mode: string) {
  if (mode === 'rollback') {
    requireWriteEnabled();
    const runId = Number(requireArg(args, 'run-id'));
    if (!Number.isInteger(runId) || runId <= 0) throw new Error('--run-id must be a positive integer');
    const result = await rollbackArticleCategoryImport({ runId, expectedDatabase: requireArg(args, 'expected-database') });
    console.log(JSON.stringify({ mode, result, restartRequired: true, backupTablesRetained: true }, null, 2));
    return;
  }
  const endpoint = String(args['source-url'] || process.env.LEGACY_IMPORT_PCMARKET_ARTICLE_CATEGORY_URL || PCM_ARTICLE_CATEGORY_SOURCE);
  const first = await fetchPcmarketArticleCategorySnapshot({ endpoint });
  const second = await fetchPcmarketArticleCategorySnapshot({ endpoint });
  const snapshotHash = articleCategorySha256(canonicalArticleCategorySnapshot(first.items));
  const secondHash = articleCategorySha256(canonicalArticleCategorySnapshot(second.items));
  if (snapshotHash !== secondHash) throw new Error(`Source changed between downloads: ${snapshotHash} != ${secondHash}`);
  const normalized = normalizePcmarketArticleCategories(first.items);
  const snapshotFile = await saveAuditSnapshot({
    source: endpoint,
    snapshotHash,
    downloadedAt: new Date().toISOString(),
    pages: first.pages,
  }, snapshotHash, 'article-categories');
  const preflight = await preflightArticleCategoryImport(normalized.categories);
  const requestedDatabase = args['expected-database'];
  if (requestedDatabase && requestedDatabase !== true && String(requestedDatabase) !== preflight.database) {
    throw new Error(`Connected database ${preflight.database} does not match ${requestedDatabase}`);
  }
  const initialTargetEmpty = preflight.currentCategories === 0 && preflight.currentArticles === 0
    && preflight.currentArticleLinks === 0 && preflight.currentMenuReferences === 0
    && preflight.currentCategoryRoutes === 0 && preflight.currentRegistryRows === 0;
  const output = {
    mode,
    source: endpoint,
    snapshotHash,
    snapshotFile,
    report: normalized.report,
    preflight,
    plannedChanges: {
      articleCategories: normalized.categories.length,
      routes: normalized.categories.length,
      registryRows: normalized.categories.length,
      importRecords: normalized.categories.length,
      imagesDownloaded: 0,
      imagePolicy: 'Keep validated absolute https://pcmarket.vn URLs',
      backupTablesRetainedUntilAcceptance: true,
    },
    rollbackCommand: 'npm run import:legacy -- --source=pcmarket --entity=article-categories --rollback --run-id=<id> --expected-database=it_tech_db',
  };
  if (mode === 'verify-applied') {
    const result = await verifyAppliedImport({
      entity: 'article-categories',
      expectedDatabase: requireArg(args, 'expected-database'),
      snapshotHash,
      assertions: [
        { name: 'categories', sql: 'SELECT COUNT(*) AS actual FROM idv_seller_news_category', expected: normalized.categories.length },
        { name: 'routes', sql: "SELECT COUNT(*) AS actual FROM idv_url WHERE id_path LIKE 'module:news/view:category/view_id:%'", expected: normalized.categories.length },
        { name: 'registry', sql: "SELECT COUNT(*) AS actual FROM web_admin_entity_registry WHERE entity_type='article-category'", expected: normalized.categories.length },
        { name: 'maps', sql: "SELECT COUNT(*) AS actual FROM web_admin_import_entity_map WHERE source='pcmarket' AND entity='article-category'", expected: normalized.categories.length },
        { name: 'duplicate-slugs', sql: 'SELECT COUNT(*) AS actual FROM (SELECT url FROM idv_seller_news_category GROUP BY url HAVING COUNT(*)>1) duplicates', expected: 0 },
      ],
    });
    console.log(JSON.stringify({ ...output, result }, null, 2));
    return;
  }
  if (mode === 'dry-run') {
    console.log(JSON.stringify(output, null, 2));
    if (!initialTargetEmpty || preflight.idConflicts.length || preflight.routeConflicts.length
        || preflight.foreignKeys.length || preflight.triggers.length || preflight.autoIncrement < 76) process.exitCode = 2;
    return;
  }
  requireWriteEnabled();
  const expectedDatabase = requireArg(args, 'expected-database');
  const expectedHash = requireArg(args, 'expected-hash');
  if (expectedHash !== snapshotHash) throw new Error(`Snapshot hash mismatch: downloaded ${snapshotHash}, expected ${expectedHash}`);
  if (requireArg(args, 'confirm') !== PCM_ARTICLE_CATEGORY_CONFIRMATION) {
    throw new Error(`--confirm=${PCM_ARTICLE_CATEGORY_CONFIRMATION} is required`);
  }
  if (args['backup-confirmed'] !== true) throw new Error('--backup-confirmed is required after verifying a full MySQL backup');
  if (args['maintenance-window'] !== true) throw new Error('--maintenance-window is required');
  const result = await applyArticleCategoryImport({ ...normalized, snapshotHash, sourceUrl: endpoint, expectedDatabase });
  console.log(JSON.stringify({ ...output, result, restartRequired: true }, null, 2));
}

async function runArticleImport(args: Args, mode: string) {
  if (mode === 'rollback') {
    requireWriteEnabled();
    const runId = Number(requireArg(args, 'run-id'));
    if (!Number.isInteger(runId) || runId <= 0) throw new Error('--run-id must be a positive integer');
    if (requireArg(args, 'confirm') !== PCM_ARTICLE_ROLLBACK_CONFIRMATION) {
      throw new Error(`--confirm=${PCM_ARTICLE_ROLLBACK_CONFIRMATION} is required`);
    }
    const result = await rollbackArticleImport({ runId, expectedDatabase: requireArg(args, 'expected-database') });
    console.log(JSON.stringify({ mode, result, restartRequired: true, backupTablesRetained: true }, null, 2));
    return;
  }
  const endpoint = String(args['source-url'] || process.env.LEGACY_IMPORT_PCMARKET_ARTICLE_URL || PCM_ARTICLE_SOURCE);
  const first = await fetchPcmarketArticleSnapshot({ endpoint });
  const second = await fetchPcmarketArticleSnapshot({ endpoint });
  const snapshotHash = articleSha256(canonicalArticleSnapshot(first.items));
  const secondHash = articleSha256(canonicalArticleSnapshot(second.items));
  if (snapshotHash !== secondHash) throw new Error(`Source changed between downloads: ${snapshotHash} != ${secondHash}`);
  const normalized = normalizePcmarketArticles(first.items);
  const snapshotFile = await saveAuditSnapshot({
    source: endpoint,
    snapshotHash,
    downloadedAt: new Date().toISOString(),
    totalBytes: first.totalBytes,
    pageHashes: first.pages.map(({ page, hash }) => ({ page, hash })),
    pages: first.pages.map(({ raw }) => raw),
  }, snapshotHash, 'articles');
  const preflight = await preflightArticleImport(normalized.articles);
  const requestedDatabase = args['expected-database'];
  if (requestedDatabase && requestedDatabase !== true && String(requestedDatabase) !== preflight.database) {
    throw new Error(`Connected database ${preflight.database} does not match ${requestedDatabase}`);
  }
  const output = {
    mode,
    source: endpoint,
    snapshotHash,
    snapshotFile,
    pageCount: first.pages.length,
    totalBytes: first.totalBytes,
    report: normalized.report,
    preflight,
    plannedChanges: {
      articles: normalized.articles.length,
      contentRows: normalized.articles.length,
      junctionRows: normalized.report.relationCountUnique,
      routes: normalized.articles.length,
      registryRows: normalized.articles.length,
      mapRows: normalized.articles.length,
      importRecords: normalized.articles.length + normalized.quarantined.length,
      imagesDownloaded: 0,
      imagePolicy: 'Keep validated absolute HTTPS source URLs',
      backupTablesRetainedUntilAcceptance: true,
    },
    rollbackCommand: `npm run import:legacy -- --source=pcmarket --entity=articles --rollback --run-id=<id> --expected-database=it_tech_db --confirm=${PCM_ARTICLE_ROLLBACK_CONFIRMATION}`,
  };
  if (mode === 'verify-applied') {
    const result = await verifyAppliedImport({
      entity: 'articles',
      expectedDatabase: requireArg(args, 'expected-database'),
      snapshotHash,
      assertions: [
        { name: 'articles', sql: 'SELECT COUNT(*) AS actual FROM idv_seller_news', expected: normalized.articles.length },
        { name: 'content', sql: 'SELECT COUNT(*) AS actual FROM idv_seller_news_content', expected: normalized.articles.length },
        { name: 'links', sql: 'SELECT COUNT(*) AS actual FROM idv_article_category', expected: normalized.report.relationCountUnique },
        { name: 'routes', sql: "SELECT COUNT(*) AS actual FROM idv_url WHERE id_path LIKE 'module:article/view:detail/view_id:%'", expected: normalized.articles.length },
        { name: 'registry', sql: "SELECT COUNT(*) AS actual FROM web_admin_entity_registry WHERE entity_type='article'", expected: normalized.articles.length },
        { name: 'maps', sql: "SELECT COUNT(*) AS actual FROM web_admin_import_entity_map WHERE source='pcmarket' AND entity='article'", expected: normalized.articles.length },
        { name: 'quarantine-83', sql: "SELECT COUNT(*) AS actual FROM web_admin_import_records WHERE run_id=(SELECT MAX(id) FROM web_admin_import_runs WHERE source='pcmarket' AND entity='articles' AND status='applied') AND entity='article' AND source_id='83' AND target_id IS NULL AND relation_status='pending'", expected: 1 },
        { name: 'duplicate-links', sql: 'SELECT COUNT(*) AS actual FROM (SELECT article_id,category_id FROM idv_article_category GROUP BY article_id,category_id HAVING COUNT(*)>1) duplicates', expected: 0 },
        { name: 'orphan-links', sql: 'SELECT COUNT(*) AS actual FROM idv_article_category ac LEFT JOIN idv_seller_news n ON n.id=ac.article_id LEFT JOIN idv_seller_news_category c ON c.id=ac.category_id WHERE n.id IS NULL OR c.id IS NULL', expected: 0 },
        { name: 'uncategorized', sql: 'SELECT COUNT(*) AS actual FROM idv_seller_news n WHERE n.catId=0 AND NOT EXISTS (SELECT 1 FROM idv_article_category ac WHERE ac.article_id=n.id)', expected: 14 },
        { name: 'multi-category', sql: 'SELECT COUNT(*) AS actual FROM (SELECT article_id FROM idv_article_category GROUP BY article_id HAVING COUNT(DISTINCT category_id)>1) multi_category', expected: 50 },
        { name: 'unsafe-runtime-route', sql: "SELECT COUNT(*) AS actual FROM idv_seller_news WHERE id=83 OR request_path='/.html'", expected: 0 },
      ],
    });
    console.log(JSON.stringify({ ...output, result }, null, 2));
    return;
  }
  if (mode === 'dry-run') {
    console.log(JSON.stringify(output, null, 2));
    const blocked = preflight.currentArticles || preflight.currentContent || preflight.currentLinks || preflight.currentRoutes
      || preflight.currentRegistryRows || preflight.currentMapRows || preflight.currentMenuReferences
      || preflight.idConflicts.length || preflight.routeConflicts.length || preflight.foreignKeys.length || preflight.triggers.length
      || preflight.categoryCount !== 4 || preflight.categoryMapCount !== 4 || preflight.categoryRouteCount !== 4
      || preflight.autoIncrement < 2912;
    if (blocked) process.exitCode = 2;
    return;
  }
  requireWriteEnabled();
  const expectedDatabase = requireArg(args, 'expected-database');
  const expectedHash = requireArg(args, 'expected-hash');
  if (expectedHash !== snapshotHash) throw new Error(`Snapshot hash mismatch: downloaded ${snapshotHash}, expected ${expectedHash}`);
  const expectedQuarantined = requireArg(args, 'expected-quarantined').split(',').map(Number);
  const actualQuarantined = normalized.quarantined.map((item) => item.id);
  if (JSON.stringify(expectedQuarantined) !== JSON.stringify([...PCM_ARTICLE_QUARANTINED_IDS])
      || JSON.stringify(actualQuarantined) !== JSON.stringify([...PCM_ARTICLE_QUARANTINED_IDS])) {
    throw new Error(`Quarantine mismatch: expected=${expectedQuarantined.join(',')} actual=${actualQuarantined.join(',')}`);
  }
  if (requireArg(args, 'confirm') !== PCM_ARTICLE_CONFIRMATION) throw new Error(`--confirm=${PCM_ARTICLE_CONFIRMATION} is required`);
  if (args['backup-confirmed'] !== true) throw new Error('--backup-confirmed is required after verifying a full MySQL backup');
  if (args['maintenance-window'] !== true) throw new Error('--maintenance-window is required');
  const result = await applyArticleImport({ ...normalized, snapshotHash, sourceUrl: endpoint, expectedDatabase });
  console.log(JSON.stringify({ ...output, result, restartRequired: true }, null, 2));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.source !== 'pcmarket' || !['product-categories', 'products', 'brands', 'article-categories', 'articles'].includes(String(args.entity))) {
    throw new Error('Supported adapters: --source=pcmarket --entity=product-categories|products|brands|article-categories|articles');
  }
  const modes = ['dry-run', 'verify-applied', 'apply', 'rollback'].filter((mode) => args[mode] === true);
  if (modes.length > 1) throw new Error('Choose exactly one of --dry-run, --verify-applied, --apply, or --rollback');
  const mode = modes[0] || 'dry-run';

  if (args.entity === 'products') {
    await runProductImport(args, mode);
    return;
  }
  if (args.entity === 'brands') {
    await runBrandImport(args, mode);
    return;
  }
  if (args.entity === 'article-categories') {
    await runArticleCategoryImport(args, mode);
    return;
  }
  if (args.entity === 'articles') {
    await runArticleImport(args, mode);
    return;
  }

  if (mode === 'rollback') {
    requireWriteEnabled();
    const runId = Number(requireArg(args, 'run-id'));
    if (!Number.isInteger(runId) || runId <= 0) throw new Error('--run-id must be a positive integer');
    const result = await rollbackProductCategoryImport({ runId, expectedDatabase: requireArg(args, 'expected-database') });
    console.log(JSON.stringify({ mode, result, restartRequired: true, backupTablesRetained: true }, null, 2));
    return;
  }

  const endpoint = String(args['source-url'] || process.env.LEGACY_IMPORT_PCMARKET_CATEGORY_URL || PCM_CATEGORY_SOURCE);
  const first = await fetchPcmarketCategorySnapshot({ endpoint });
  const second = await fetchPcmarketCategorySnapshot({ endpoint });
  const firstCanonical = canonicalCategorySnapshot(first.items);
  const secondCanonical = canonicalCategorySnapshot(second.items);
  const snapshotHash = sha256(firstCanonical);
  const secondHash = sha256(secondCanonical);
  if (snapshotHash !== secondHash) throw new Error(`Source changed between downloads: ${snapshotHash} != ${secondHash}`);
  const { categories, report } = normalizePcmarketCategories(first.items);
  const snapshotFile = await saveAuditSnapshot({ source: endpoint, snapshotHash, downloadedAt: new Date().toISOString(), pages: first.pages }, snapshotHash);
  const preflight = await preflightProductCategoryImport(categories);
  const output = {
    mode,
    source: endpoint,
    snapshotHash,
    snapshotFile,
    report,
    preflight,
    plannedChanges: {
      replacementCategories: categories.length,
      newCategoryRoutes: categories.length,
      detachedProductRelations: preflight.currentProductRelations,
      detachedAttributeRelations: preflight.currentAttributeRelations,
      pendingAttributeLinks: report.pendingAttributeLinks,
      backupTablesRetainedUntilAcceptance: true,
    },
    rollbackCommand: 'npm run import:legacy -- --source=pcmarket --entity=product-categories --rollback --run-id=<id> --expected-database=<name>',
  };

  if (mode === 'verify-applied') {
    const result = await verifyAppliedImport({
      entity: 'product-categories',
      expectedDatabase: requireArg(args, 'expected-database'),
      snapshotHash,
      assertions: [
        { name: 'categories', sql: 'SELECT COUNT(*) AS actual FROM idv_seller_category', expected: categories.length },
        { name: 'routes', sql: "SELECT COUNT(*) AS actual FROM idv_url WHERE id_path LIKE 'module:product/view:category/view_id:%'", expected: categories.length },
        { name: 'canonical-route-types', sql: "SELECT COUNT(*) AS actual FROM idv_url WHERE id_path LIKE 'module:product/view:category/view_id:%' AND url_type='product:category'", expected: categories.length },
        { name: 'invalid-route-hashes', sql: "SELECT COUNT(*) AS actual FROM idv_url WHERE id_path LIKE 'module:product/view:category/view_id:%' AND request_path_index<>MD5(request_path)", expected: 0 },
        { name: 'orphan-routes', sql: "SELECT COUNT(*) AS actual FROM idv_url u LEFT JOIN idv_seller_category c ON u.id_path=CONCAT('module:product/view:category/view_id:',c.id) WHERE u.id_path LIKE 'module:product/view:category/view_id:%' AND c.id IS NULL", expected: 0 },
        { name: 'maps', sql: "SELECT COUNT(*) AS actual FROM web_admin_import_entity_map WHERE source='pcmarket' AND entity='product-category'", expected: categories.length },
        { name: 'orphan-parents', sql: 'SELECT COUNT(*) AS actual FROM idv_seller_category c LEFT JOIN idv_seller_category p ON p.id=c.parentId WHERE c.parentId<>0 AND p.id IS NULL', expected: 0 },
        { name: 'duplicate-slugs', sql: 'SELECT COUNT(*) AS actual FROM (SELECT url FROM idv_seller_category GROUP BY url HAVING COUNT(*)>1) duplicates', expected: 0 },
      ],
    });
    console.log(JSON.stringify({ ...output, result }, null, 2));
    return;
  }

  if (mode === 'dry-run') {
    console.log(JSON.stringify(output, null, 2));
    if (preflight.routeConflicts.length) process.exitCode = 2;
    return;
  }

  requireWriteEnabled();
  const expectedDatabase = requireArg(args, 'expected-database');
  const expectedHash = requireArg(args, 'expected-hash');
  if (expectedHash !== snapshotHash) throw new Error(`Snapshot hash mismatch: downloaded ${snapshotHash}, expected ${expectedHash}`);
  if (requireArg(args, 'confirm') !== PCM_CATEGORY_CONFIRMATION) throw new Error(`--confirm=${PCM_CATEGORY_CONFIRMATION} is required`);
  if (args['backup-confirmed'] !== true) throw new Error('--backup-confirmed is required after verifying a full MySQL backup');
  if (args['maintenance-window'] !== true) throw new Error('--maintenance-window is required');
  if (preflight.routeConflicts.length) throw new Error('Apply blocked by non-category route conflicts');
  const result = await applyProductCategoryImport({ categories, report, snapshotHash, sourceUrl: endpoint, expectedDatabase });
  console.log(JSON.stringify({ ...output, result, restartRequired: true }, null, 2));
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => pool.end());
