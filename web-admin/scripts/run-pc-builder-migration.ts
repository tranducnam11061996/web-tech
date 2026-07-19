import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import type { RowDataPacket } from 'mysql2/promise';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const PC_TABLES = [
  'web_admin_pc_builder_components',
  'web_admin_pc_builder_component_relations',
  'web_admin_pc_builder_benchmark_snapshots',
  'web_admin_pc_builder_rule_sets',
  'web_admin_pc_builder_rules',
  'web_admin_pc_builder_gaming_policies',
  'web_admin_pc_builder_release_gates',
  'web_admin_pc_builds',
  'web_admin_pc_build_items',
] as const;
const RETIRED_TABLES = ['web_admin_pc_builder_product_metrics', 'web_admin_pc_builder_product_profiles'] as const;
const REVISION = 'pc-builder-v4-catalog-live';
const PLAN_HASH = createHash('sha256').update(JSON.stringify({ revision: REVISION, tables: PC_TABLES, retiredTables: RETIRED_TABLES })).digest('hex');

function args() {
  const values = new Map<string, string>();
  for (let index = 2; index < process.argv.length; index += 1) {
    const value = process.argv[index];
    if (!value.startsWith('--')) continue;
    const [key, inline] = value.slice(2).split('=', 2);
    const next = process.argv[index + 1];
    if (inline !== undefined) values.set(key, inline);
    else if (next && !next.startsWith('--')) { values.set(key, next); index += 1; }
    else values.set(key, 'true');
  }
  return values;
}

function assertGuard(input: Map<string, string>) {
  const mode = input.get('mode') || 'verify';
  if (!['apply', 'verify'].includes(mode)) throw new Error('Mode must be apply or verify. Destructive v4 rollback requires restoring the verified backup.');
  const database = String(input.get('database') || '');
  if (!(database === 'it_tech_db' || /^it_tech_db_(?:pc_builder_clone_\d{8,14}|backup_test_\d+_[a-f0-9]+)$/.test(database))) {
    throw new Error('Database must be it_tech_db or a restore-verified PC Builder clone.');
  }
  const backupSha256 = String(input.get('backup-sha256') || '').toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(backupSha256)) throw new Error('A restore-verified backup SHA-256 is required.');
  if (String(process.env.PC_BUILDER_RESTORE_VERIFIED_SHA256 || '').toLowerCase() !== backupSha256) {
    throw new Error('PC_BUILDER_RESTORE_VERIFIED_SHA256 does not match --backup-sha256.');
  }
  if (mode === 'apply') {
    if (process.env.ADMIN_WRITE_ENABLED !== 'true') throw new Error('ADMIN_WRITE_ENABLED must be true for apply/rollback.');
    const expected = String(process.env.PC_BUILDER_CONFIRMATION_TOKEN || '');
    const supplied = String(process.env.PC_BUILDER_CONFIRMATION_INPUT || '');
    if (!expected || supplied.length < 32 || supplied !== expected) throw new Error('PC Builder confirmation token mismatch.');
  }
  return { mode, database, backupSha256 };
}

async function inventory(pool: typeof import('../src/lib/db').default) {
  const [[database], [tables], [routines], [triggers], [catalog]] = await Promise.all([
    pool.query<RowDataPacket[]>('SELECT DATABASE() database_name,@@version version'),
    pool.query<RowDataPacket[]>(`SELECT COUNT(*) tables,SUM(engine='InnoDB') innodb,SUM(engine='MyISAM') myisam FROM information_schema.tables WHERE table_schema=DATABASE()`),
    pool.query<RowDataPacket[]>('SELECT COUNT(*) routines FROM information_schema.routines WHERE routine_schema=DATABASE()'),
    pool.query<RowDataPacket[]>('SELECT COUNT(*) triggers FROM information_schema.triggers WHERE trigger_schema=DATABASE()'),
    pool.query<RowDataPacket[]>(`SELECT
      (SELECT COUNT(*) FROM idv_seller_category) categories,
      (SELECT COUNT(*) FROM idv_brand) brands,
      (SELECT COUNT(*) FROM idv_sell_product_store) products,
      (SELECT COUNT(*) FROM product_data_search) search_rows`),
  ]);
  return { database: database[0], schema: tables[0], routines: Number(routines[0]?.routines || 0), triggers: Number(triggers[0]?.triggers || 0), catalog: catalog[0] };
}

async function verify(pool: typeof import('../src/lib/db').default) {
  const [tables] = await pool.query<RowDataPacket[]>(`SELECT TABLE_NAME AS table_name,ENGINE AS engine,TABLE_COLLATION AS table_collation FROM information_schema.tables
    WHERE table_schema=DATABASE() AND table_name IN (?) ORDER BY table_name`, [PC_TABLES]);
  const present = new Set(tables.map((row) => String(row.table_name)));
  const missing = PC_TABLES.filter((table) => !present.has(table));
  if (missing.length) throw new Error(`Missing PC Builder tables: ${missing.join(', ')}`);
  if (tables.some((row) => String(row.engine).toLowerCase() !== 'innodb' || String(row.table_collation) !== 'utf8mb4_unicode_ci')) {
    throw new Error('Every PC Builder table must use InnoDB and utf8mb4_unicode_ci.');
  }
  const [columns] = await pool.query<RowDataPacket[]>(`SELECT COLUMN_NAME AS column_name,COLUMN_TYPE AS column_type FROM information_schema.columns
    WHERE table_schema=DATABASE() AND table_name='web_admin_storefront_order_meta'
      AND column_name IN ('order_type','pc_build_id','assembly_required','pc_builder_revision')`);
  if (columns.length !== 4 || !String(columns.find((row) => row.column_name === 'order_type')?.column_type || '').includes('pc_builder')) {
    throw new Error('PC Builder order meta columns are incomplete.');
  }
  const [retiredTables] = await pool.query<RowDataPacket[]>(`SELECT TABLE_NAME AS table_name FROM information_schema.tables
    WHERE table_schema=DATABASE() AND table_name IN (?)`, [RETIRED_TABLES]);
  if (retiredTables.length) throw new Error(`Retired verification tables still exist: ${retiredTables.map((row) => row.table_name).join(', ')}`);
  const [manualReleaseColumns] = await pool.query<RowDataPacket[]>(`SELECT COLUMN_NAME AS column_name FROM information_schema.columns
    WHERE table_schema=DATABASE() AND table_name='web_admin_pc_builder_rule_sets'
      AND column_name IN ('manual_report_hash','manual_fingerprint','manual_evaluated_by','manual_evaluated_at')`);
  if (manualReleaseColumns.length !== 4) throw new Error('Manual release provenance columns are incomplete.');
  const [componentColumns] = await pool.query<RowDataPacket[]>(`SELECT COLUMN_NAME AS column_name FROM information_schema.columns
    WHERE table_schema=DATABASE() AND table_name='web_admin_pc_builder_components'
      AND column_name IN ('category_id','profile_component_code')`);
  if (componentColumns.length !== 1 || String(componentColumns[0]?.column_name) !== 'category_id') {
    throw new Error('Catalog-live component columns are incomplete.');
  }
  const [buildColumns] = await pool.query<RowDataPacket[]>(`SELECT COLUMN_NAME AS column_name FROM information_schema.columns
    WHERE table_schema=DATABASE() AND table_name='web_admin_pc_builds'
      AND column_name IN ('catalog_revision','profile_revision')`);
  if (buildColumns.length !== 1 || String(buildColumns[0]?.column_name) !== 'catalog_revision') throw new Error('Build catalog revision migration is incomplete.');
  const [[categoryIndex], [relationForeignKeys]] = await Promise.all([
    pool.query<RowDataPacket[]>(`SELECT COUNT(*) total FROM information_schema.statistics WHERE table_schema=DATABASE()
      AND table_name='web_admin_pc_builder_components' AND index_name='uq_pc_builder_components_category' AND non_unique=0`),
    pool.query<RowDataPacket[]>(`SELECT COUNT(*) total FROM information_schema.referential_constraints WHERE constraint_schema=DATABASE()
      AND table_name='web_admin_pc_builder_component_relations'`),
  ]);
  if (Number(categoryIndex[0]?.total || 0) !== 1 || Number(relationForeignKeys[0]?.total || 0) !== 2) {
    throw new Error('Dynamic component indexes or relation foreign keys are incomplete.');
  }
  const [relations] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) total FROM web_admin_pc_builder_component_relations WHERE status=1');
  const [metricRules] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) total FROM web_admin_pc_builder_rules
    WHERE is_enabled=1 AND (left_fact LIKE 'metric:%' OR right_fact LIKE 'metric:%')`);
  if (Number(metricRules[0]?.total || 0) !== 0) throw new Error('Metric compatibility rules must be disabled in catalog-live v4.');
  const [[rules], [policies]] = await Promise.all([
    pool.query<RowDataPacket[]>("SELECT revision,status,published_by FROM web_admin_pc_builder_rule_sets WHERE revision='v1'"),
    pool.query<RowDataPacket[]>("SELECT status,COUNT(*) total FROM web_admin_pc_builder_gaming_policies WHERE revision='v1' GROUP BY status"),
  ]);
  return { tableCount: tables.length, orderColumns: columns.length, retiredTables: retiredTables.length,
    manualReleaseColumns: manualReleaseColumns.length, componentColumns: componentColumns.length,
    buildRevisionColumn: String(buildColumns[0]?.column_name || ''), enabledMetricRules: Number(metricRules[0]?.total || 0),
    relationCount: Number(relations[0]?.total || 0), relationForeignKeys: Number(relationForeignKeys[0]?.total || 0),
    categoryUniqueIndex: Number(categoryIndex[0]?.total || 0), seededRule: rules[0] || null, seededPolicies: policies };
}

async function apply(pool: typeof import('../src/lib/db').default) {
  const [profileComponent] = await pool.query<RowDataPacket[]>(`SELECT 1 FROM information_schema.columns
    WHERE table_schema=DATABASE() AND table_name='web_admin_pc_builder_components' AND column_name='profile_component_code' LIMIT 1`);
  if (profileComponent[0]) await pool.query(`ALTER TABLE web_admin_pc_builder_components DROP COLUMN profile_component_code`);
  const { ensurePcBuilderTables } = await import('../src/lib/pcBuilder/infrastructure');
  await ensurePcBuilderTables();
  const [profileRevision] = await pool.query<RowDataPacket[]>(`SELECT 1 FROM information_schema.columns
    WHERE table_schema=DATABASE() AND table_name='web_admin_pc_builds' AND column_name='profile_revision' LIMIT 1`);
  if (profileRevision[0]) {
    await pool.query(`UPDATE web_admin_pc_builds SET catalog_revision=profile_revision WHERE catalog_revision=''`);
    await pool.query(`ALTER TABLE web_admin_pc_builds DROP COLUMN profile_revision`);
  }
  await pool.query(`UPDATE web_admin_pc_builder_rules SET is_enabled=0
    WHERE left_fact LIKE 'metric:%' OR right_fact LIKE 'metric:%'`);
  for (const table of RETIRED_TABLES) await pool.query(`DROP TABLE IF EXISTS ${table}`);
  const permissions = ['catalog.pc_builder.read', 'catalog.pc_builder.update', 'catalog.pc_builder.publish'];
  for (const permission of permissions) {
    await pool.query(`UPDATE admin_roles SET permissions=JSON_ARRAY_APPEND(permissions,'$',?)
      WHERE code='catalog_manager' AND JSON_CONTAINS(permissions,JSON_QUOTE(?))=0`, [permission, permission]);
  }
  return verify(pool);
}

async function main() {
  const input = args();
  const guard = assertGuard(input);
  process.stderr.write(`[pc-builder:migrate] ${guard.mode} guard accepted for ${guard.database}\n`);
  const databaseUrl = new URL(String(process.env.DATABASE_URL || ''));
  databaseUrl.pathname = `/${guard.database}`;
  process.env.DATABASE_URL = databaseUrl.toString();
  const pool = (await import('../src/lib/db')).default;
  const before = await inventory(pool);
  if (String(before.database?.database_name || '') !== guard.database) throw new Error(`Connected database ${before.database?.database_name || '(none)'} does not match ${guard.database}.`);
  process.stderr.write(`[pc-builder:migrate] ${guard.mode} inventory captured\n`);
  const result = guard.mode === 'apply' ? await apply(pool) : await verify(pool);
  process.stderr.write(`[pc-builder:migrate] ${guard.mode} operation completed\n`);
  const after = await inventory(pool);
  const artifact = { revision: REVISION, planHash: PLAN_HASH, mode: guard.mode, backupSha256: guard.backupSha256, before, after, result, completedAt: new Date().toISOString() };
  const directory = path.resolve(process.cwd(), 'var', 'migrations', 'pc-builder');
  fs.mkdirSync(directory, { recursive: true });
  const artifactPath = path.join(directory, `${Date.now()}-${guard.mode}.json`);
  fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2), { encoding: 'utf8', mode: 0o600 });
  process.stdout.write(JSON.stringify({ success: true, artifactPath, revision: REVISION, planHash: PLAN_HASH, result }) + '\n');
  process.stderr.write(`[pc-builder:migrate] ${guard.mode} artifact written\n`);
  await pool.end();
  process.stderr.write(`[pc-builder:migrate] ${guard.mode} pool closed\n`);
}

void main().then(() => process.exit(0)).catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
