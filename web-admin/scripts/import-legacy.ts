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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.source !== 'pcmarket' || !['product-categories', 'products', 'brands'].includes(String(args.entity))) {
    throw new Error('Supported adapters: --source=pcmarket --entity=product-categories|products|brands');
  }
  const modes = ['dry-run', 'apply', 'rollback'].filter((mode) => args[mode] === true);
  if (modes.length > 1) throw new Error('Choose exactly one of --dry-run, --apply, or --rollback');
  const mode = modes[0] || 'dry-run';

  if (args.entity === 'products') {
    await runProductImport(args, mode);
    return;
  }
  if (args.entity === 'brands') {
    await runBrandImport(args, mode);
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
