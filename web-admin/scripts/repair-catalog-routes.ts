import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '../src/lib/db';

type Args = Record<string, string | boolean>;
type RouteSnapshot = {
  id: number;
  requestPath: string;
  requestPathIndex: string;
  idPath: string;
  urlType: string;
  targetPath: string;
  redirectCode: string;
};

const APPLY_CONFIRMATION = 'REPAIR_PRODUCT_CATEGORY_ROUTE_TYPES';
const ROLLBACK_CONFIRMATION = 'ROLLBACK_PRODUCT_CATEGORY_ROUTE_TYPES';
const CATEGORY_PREFIX = 'module:product/view:category/view_id:';
const LOCKS = ['web_admin:catalog_route_repair', 'web_admin:legacy_import:product_categories'].sort();

function parseArgs(argv: string[]) {
  const result: Args = {};
  for (const argument of argv) {
    if (!argument.startsWith('--')) throw new Error(`Unknown argument: ${argument}`);
    const [key, ...value] = argument.slice(2).split('=');
    result[key] = value.length ? value.join('=') : true;
  }
  return result;
}

function required(args: Args, key: string) {
  const value = args[key];
  if (!value || value === true) throw new Error(`--${key}=<value> is required`);
  return String(value);
}

function sha256(value: string | Buffer) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizeRoute(row: Record<string, unknown>): RouteSnapshot {
  return {
    id: Number(row.id || 0),
    requestPath: String(row.request_path ?? row.requestPath ?? ''),
    requestPathIndex: String(row.request_path_index ?? row.requestPathIndex ?? ''),
    idPath: String(row.id_path ?? row.idPath ?? ''),
    urlType: String(row.url_type ?? row.urlType ?? ''),
    targetPath: String(row.target_path ?? row.targetPath ?? ''),
    redirectCode: String(row.redirect_code ?? row.redirectCode ?? ''),
  };
}

function routeHash(routes: RouteSnapshot[]) {
  return sha256(JSON.stringify([...routes].sort((left, right) => left.id - right.id)));
}

function structuralRouteHash(routes: RouteSnapshot[]) {
  return sha256(JSON.stringify([...routes].sort((left, right) => left.id - right.id).map(({ urlType: _urlType, ...route }) => route)));
}

async function selectedDatabase(connection: PoolConnection) {
  const [rows] = await connection.query<RowDataPacket[]>('SELECT DATABASE() AS name,@@version AS version');
  return { name: String(rows[0]?.name || ''), version: String(rows[0]?.version || '') };
}

async function catalogRoutes(connection: PoolConnection) {
  const [rows] = await connection.query<RowDataPacket[]>(`
    SELECT u.id,u.request_path,u.request_path_index,u.id_path,u.url_type,u.target_path,u.redirect_code
    FROM idv_url u
    WHERE u.id_path LIKE ?
    ORDER BY u.id
  `, [`${CATEGORY_PREFIX}%`]);
  return rows.map((row) => normalizeRoute(row));
}

async function preflight(connection: PoolConnection) {
  const routes = await catalogRoutes(connection);
  const [rows] = await connection.query<RowDataPacket[]>(`
    SELECT
      (SELECT COUNT(*) FROM idv_seller_category) AS categories,
      (SELECT COUNT(*) FROM idv_url WHERE id_path LIKE ?) AS category_routes,
      (SELECT COUNT(*) FROM idv_seller_category c LEFT JOIN idv_url u
        ON u.id_path=CONCAT(?,c.id) WHERE u.id IS NULL) AS categories_without_route,
      (SELECT COUNT(*) FROM idv_url u LEFT JOIN idv_seller_category c
        ON u.id_path=CONCAT(?,c.id) WHERE u.id_path LIKE ? AND c.id IS NULL) AS routes_without_category,
      (SELECT COUNT(*) FROM idv_url WHERE id_path LIKE ? AND request_path_index<>MD5(request_path)) AS invalid_hashes,
      (SELECT COUNT(*) FROM (SELECT request_path FROM idv_url GROUP BY request_path HAVING COUNT(*)>1) d) AS duplicate_paths,
      (SELECT COUNT(*) FROM (SELECT id_path FROM idv_url WHERE id_path LIKE ? GROUP BY id_path HAVING COUNT(*)>1) d) AS duplicate_targets
  `, [
    `${CATEGORY_PREFIX}%`, CATEGORY_PREFIX, CATEGORY_PREFIX, `${CATEGORY_PREFIX}%`,
    `${CATEGORY_PREFIX}%`, `${CATEGORY_PREFIX}%`,
  ]);
  const summary = {
    categories: Number(rows[0]?.categories || 0),
    categoryRoutes: Number(rows[0]?.category_routes || 0),
    categoriesWithoutRoute: Number(rows[0]?.categories_without_route || 0),
    routesWithoutCategory: Number(rows[0]?.routes_without_category || 0),
    invalidHashes: Number(rows[0]?.invalid_hashes || 0),
    duplicatePaths: Number(rows[0]?.duplicate_paths || 0),
    duplicateTargets: Number(rows[0]?.duplicate_targets || 0),
    canonicalRoutes: routes.filter((route) => route.urlType === 'product:category').length,
    repairRoutes: routes.filter((route) => route.urlType !== 'product:category').length,
  };
  const blockers = [
    summary.categories !== summary.categoryRoutes ? 'category/route count mismatch' : '',
    summary.categoriesWithoutRoute ? 'categories without routes' : '',
    summary.routesWithoutCategory ? 'routes without categories' : '',
    summary.invalidHashes ? 'invalid route hashes' : '',
    summary.duplicatePaths ? 'duplicate request paths' : '',
    summary.duplicateTargets ? 'duplicate category targets' : '',
  ].filter(Boolean);
  return { routes, preimageHash: routeHash(routes), summary, blockers };
}

function scalar(value: unknown) {
  if (value && typeof value === 'object' && '__backupType' in value) {
    return (value as { value?: unknown }).value;
  }
  return value;
}

function routesFromBackup(bundle: Record<string, any>) {
  const table = (bundle.tables || []).find((item: Record<string, unknown>) => item.name === 'idv_url');
  if (!table || !Array.isArray(table.columns) || !Array.isArray(table.rows)) throw new Error('Backup does not contain idv_url');
  const columns = table.columns.map(String);
  const requiredColumns = ['id', 'request_path', 'request_path_index', 'id_path', 'url_type', 'target_path', 'redirect_code'];
  for (const column of requiredColumns) if (!columns.includes(column)) throw new Error(`Backup idv_url is missing ${column}`);
  return table.rows.map((values: unknown[]) => Object.fromEntries(columns.map((column: string, index: number) => [column, scalar(values[index])])) as Record<string, unknown>)
    .filter((row: Record<string, unknown>) => String(row.id_path || '').startsWith(CATEGORY_PREFIX))
    .map(normalizeRoute)
    .sort((left: RouteSnapshot, right: RouteSnapshot) => left.id - right.id);
}

async function verifyBackupManifest(manifestInput: string, manifestDatabase: string, expectedRouteHash: string) {
  const manifestPath = path.resolve(manifestInput);
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8')) as Record<string, any>;
  if (manifest.format !== 'web-tech-logical-backup-manifest-v1') throw new Error('Unsupported backup manifest format');
  if (manifest.database !== manifestDatabase) throw new Error(`Backup database ${manifest.database} does not match ${manifestDatabase}`);
  if (manifest.verification?.verified !== true) throw new Error('Backup manifest is not restore-verified');
  const backupPath = path.resolve(path.dirname(manifestPath), String(manifest.backupFile || ''));
  const bytes = await fs.readFile(backupPath);
  const digest = sha256(bytes);
  if (digest !== String(manifest.sha256 || '')) throw new Error('Backup SHA-256 does not match its manifest');
  const bundle = JSON.parse(bytes.toString('utf8')) as Record<string, any>;
  if (bundle.format !== 'web-tech-logical-backup-v1' || bundle.database !== manifestDatabase) throw new Error('Backup bundle metadata mismatch');
  const backupRouteHash = routeHash(routesFromBackup(bundle));
  if (backupRouteHash !== expectedRouteHash) throw new Error(`Backup category-route hash ${backupRouteHash} does not match ${expectedRouteHash}`);
  return { manifestPath, backupPath, database: manifestDatabase, sha256: digest, createdAt: String(manifest.createdAt || ''), backupRouteHash };
}

function backupSourceDatabase(args: Args, targetDatabase: string) {
  const sourceDatabase = String(args['backup-source-database'] || targetDatabase);
  if (sourceDatabase === targetDatabase) return sourceDatabase;
  if (!/(?:test|backup|clone|disposable)/i.test(targetDatabase)) {
    throw new Error('--backup-source-database may only differ on a disposable clone database');
  }
  if (args['allow-source-backup-for-disposable-clone'] !== true) {
    throw new Error('--allow-source-backup-for-disposable-clone is required when the backup source differs');
  }
  return sourceDatabase;
}

async function writePreimageArtifact(args: Args, database: string, routes: RouteSnapshot[], preimageHash: string) {
  const directory = path.resolve(String(args['artifact-dir'] || path.join(process.cwd(), 'var', 'migrations', 'catalog-routes')));
  await fs.mkdir(directory, { recursive: true });
  const safeDatabase = database.replace(/[^a-zA-Z0-9_-]/g, '-');
  const artifactPath = path.join(directory, `preimage-${safeDatabase}-${preimageHash}.json`);
  const artifact = {
    format: 'web-tech-catalog-route-preimage-v1', database, createdAt: new Date().toISOString(),
    preimageHash, routes,
  };
  const body = `${JSON.stringify(artifact, null, 2)}\n`;
  try {
    await fs.writeFile(artifactPath, body, { encoding: 'utf8', flag: 'wx' });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    const existing = JSON.parse(await fs.readFile(artifactPath, 'utf8')) as Record<string, any>;
    if (existing.database !== database || existing.preimageHash !== preimageHash || routeHash((existing.routes || []).map(normalizeRoute)) !== preimageHash) {
      throw new Error('Existing preimage artifact does not match current routes');
    }
  }
  return { artifactPath, artifactSha256: sha256(await fs.readFile(artifactPath)) };
}

async function readPreimageArtifact(input: string, expectedDatabase: string) {
  const artifactPath = path.resolve(input);
  const bytes = await fs.readFile(artifactPath);
  const artifact = JSON.parse(bytes.toString('utf8')) as Record<string, any>;
  if (artifact.format !== 'web-tech-catalog-route-preimage-v1') throw new Error('Unsupported preimage artifact format');
  if (artifact.database !== expectedDatabase) throw new Error(`Artifact database ${artifact.database} does not match ${expectedDatabase}`);
  const routes: RouteSnapshot[] = (Array.isArray(artifact.routes) ? artifact.routes : [])
    .map((route: Record<string, unknown>) => normalizeRoute(route))
    .sort((left: RouteSnapshot, right: RouteSnapshot) => left.id - right.id);
  const preimageHash = routeHash(routes);
  if (preimageHash !== artifact.preimageHash) throw new Error('Preimage artifact route hash mismatch');
  return { artifactPath, artifactSha256: sha256(bytes), preimageHash, routes };
}

async function acquireLocks(connection: PoolConnection) {
  const acquired: string[] = [];
  for (const lock of LOCKS) {
    const [rows] = await connection.query<RowDataPacket[]>('SELECT GET_LOCK(?,0) AS acquired', [lock]);
    if (Number(rows[0]?.acquired) !== 1) {
      for (const held of acquired.reverse()) await connection.query('SELECT RELEASE_LOCK(?)', [held]).catch(() => undefined);
      throw new Error(`Unable to acquire lock ${lock}`);
    }
    acquired.push(lock);
  }
  return acquired;
}

async function assertNoActiveImporter(connection: PoolConnection) {
  const [rows] = await connection.query<RowDataPacket[]>("SELECT id FROM web_admin_import_runs WHERE status IN ('applying','rolling_back') LIMIT 1");
  if (rows.length) throw new Error(`Import run ${rows[0].id} is active`);
}

async function bumpCaches(connection: PoolConnection) {
  for (const key of ['public_products', 'public_catalog_details', 'catalog']) {
    await connection.query(`INSERT INTO web_admin_cache_versions(cache_key,version) VALUES(?,2)
      ON DUPLICATE KEY UPDATE version=version+1`, [key]);
  }
}

function requireWriteGates(args: Args, confirmation: string) {
  if (process.env.ADMIN_WRITE_ENABLED !== 'true') throw new Error('ADMIN_WRITE_ENABLED=true is required');
  if (args['maintenance-window'] !== true) throw new Error('--maintenance-window is required');
  if (required(args, 'confirm') !== confirmation) throw new Error(`--confirm=${confirmation} is required`);
}

async function applyRepair(connection: PoolConnection, args: Args, database: string, before: Awaited<ReturnType<typeof preflight>>) {
  requireWriteGates(args, APPLY_CONFIRMATION);
  if (before.blockers.length) throw new Error(`Repair preflight blockers: ${before.blockers.join(', ')}`);
  const expectedHash = required(args, 'expected-preimage-hash');
  if (expectedHash !== before.preimageHash) throw new Error(`Preimage hash changed: ${before.preimageHash} != ${expectedHash}`);
  const backupDatabase = backupSourceDatabase(args, database);
  const backup = await verifyBackupManifest(required(args, 'backup-manifest'), backupDatabase, before.preimageHash);
  const artifact = await writePreimageArtifact(args, database, before.routes, before.preimageHash);
  await connection.beginTransaction();
  try {
    const [result] = await connection.query<ResultSetHeader>(`
      UPDATE idv_url u
      JOIN idv_seller_category c ON u.id_path=CONCAT(?,c.id)
      SET u.url_type='product:category'
      WHERE COALESCE(u.url_type,'')<>'product:category'
    `, [CATEGORY_PREFIX]);
    if (Number(result.affectedRows) !== before.summary.repairRoutes) {
      throw new Error(`Updated ${result.affectedRows} routes; expected ${before.summary.repairRoutes}`);
    }
    await bumpCaches(connection);
    await connection.commit();
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  }
  const after = await preflight(connection);
  if (after.blockers.length || after.summary.canonicalRoutes !== after.summary.categoryRoutes || after.summary.repairRoutes !== 0) {
    throw new Error(`Post-repair verification failed: ${JSON.stringify(after)}`);
  }
  return { mode: 'apply', database, before: before.summary, after: after.summary, backup, artifact, preimageHash: before.preimageHash };
}

async function rollbackRepair(connection: PoolConnection, args: Args, database: string) {
  requireWriteGates(args, ROLLBACK_CONFIRMATION);
  const artifact = await readPreimageArtifact(required(args, 'artifact'), database);
  const current = await catalogRoutes(connection);
  if (structuralRouteHash(current) !== structuralRouteHash(artifact.routes)) {
    throw new Error('Current category-route structure differs from the rollback artifact');
  }
  if (current.some((route) => route.urlType !== 'product:category')) {
    throw new Error('Rollback requires every current category route to be canonical');
  }
  await connection.beginTransaction();
  try {
    for (let offset = 0; offset < artifact.routes.length; offset += 100) {
      const batch = artifact.routes.slice(offset, offset + 100);
      const cases = batch.map(() => 'WHEN ? THEN ?').join(' ');
      const values = batch.flatMap((route) => [route.id, route.urlType]);
      await connection.query(
        `UPDATE idv_url SET url_type=CASE id ${cases} ELSE url_type END WHERE id IN (${batch.map(() => '?').join(',')})`,
        [...values, ...batch.map((route) => route.id)],
      );
    }
    await bumpCaches(connection);
    await connection.commit();
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  }
  const restored = await catalogRoutes(connection);
  if (routeHash(restored) !== artifact.preimageHash) throw new Error('Rollback route hash does not match the preimage artifact');
  return {
    mode: 'rollback', database, restoredRoutes: restored.length,
    artifact: {
      artifactPath: artifact.artifactPath,
      artifactSha256: artifact.artifactSha256,
      preimageHash: artifact.preimageHash,
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const modes = ['dry-run', 'apply', 'rollback'].filter((mode) => args[mode] === true);
  if (modes.length > 1) throw new Error('Choose exactly one of --dry-run, --apply, or --rollback');
  const mode = modes[0] || 'dry-run';
  const expectedDatabase = required(args, 'expected-database');
  const connection = await pool.getConnection();
  let acquiredLocks: string[] = [];
  try {
    const database = await selectedDatabase(connection);
    if (database.name !== expectedDatabase) throw new Error(`Database mismatch: connected to ${database.name}, expected ${expectedDatabase}`);
    const before = await preflight(connection);
    if (mode === 'dry-run') {
      console.log(JSON.stringify({ mode, database, ...before, repairRows: before.routes.filter((route) => route.urlType !== 'product:category') }, null, 2));
      return;
    }
    acquiredLocks = await acquireLocks(connection);
    await assertNoActiveImporter(connection);
    const result = mode === 'apply'
      ? await applyRepair(connection, args, database.name, before)
      : await rollbackRepair(connection, args, database.name);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    for (const lock of acquiredLocks.reverse()) await connection.query('SELECT RELEASE_LOCK(?)', [lock]).catch(() => undefined);
    connection.release();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(async () => pool.end());
