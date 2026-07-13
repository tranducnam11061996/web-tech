import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import pool from '../src/lib/db';
import { ensureLegacyImportTables } from '../src/lib/legacyImport/tables';

type Args = Record<string, string | boolean>;
type RecoveryTable = {
  name: string;
  runId: number;
  engine: string;
  collation: string;
  rows: number;
  dataBytes: number;
  indexBytes: number;
};

const CONFIRMATION = 'DROP_ACCEPTED_IMPORT_RECOVERY';
const LOCKS = [
  'web_admin:bootstrap:safe_configuration',
  'web_admin:legacy_import:article_categories',
  'web_admin:legacy_import:articles',
  'web_admin:legacy_import:brands',
  'web_admin:legacy_import:product_categories',
  'web_admin:legacy_import:products',
  'web_admin:performance_indexes',
  'web_admin:legacy_import:cleanup',
].sort();

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

function quote(identifier: string) {
  if (!/^[a-zA-Z0-9_]+$/.test(identifier)) throw new Error(`Unsafe SQL identifier: ${identifier}`);
  return `\`${identifier}\``;
}

function parseRunIds(value: string) {
  const ids = [...new Set(value.split(',').map((item) => Number(item.trim())))].sort((a, b) => a - b);
  if (!ids.length || ids.some((id) => !Number.isInteger(id) || id <= 0)) throw new Error('--run-ids must be a comma-separated list of positive integers');
  return ids;
}

async function selectedDatabase(connection: PoolConnection) {
  const [rows] = await connection.query<RowDataPacket[]>('SELECT DATABASE() AS name');
  return String(rows[0]?.name || '');
}

async function recoveryTables(connection: PoolConnection): Promise<RecoveryTable[]> {
  const [rows] = await connection.query<RowDataPacket[]>(`
    SELECT TABLE_NAME,ENGINE,TABLE_COLLATION,DATA_LENGTH,INDEX_LENGTH
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME LIKE 'web_admin_import_b\\_%'
    ORDER BY TABLE_NAME
  `);
  const output: RecoveryTable[] = [];
  for (const row of rows) {
    const name = String(row.TABLE_NAME);
    const match = name.match(/^web_admin_import_b_(\d+)_([a-zA-Z0-9_]+)$/);
    if (!match) throw new Error(`Unexpected recovery table name: ${name}`);
    const [countRows] = await connection.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM ${quote(name)}`);
    output.push({
      name,
      runId: Number(match[1]),
      engine: String(row.ENGINE || ''),
      collation: String(row.TABLE_COLLATION || ''),
      rows: Number(countRows[0]?.total || 0),
      dataBytes: Number(row.DATA_LENGTH || 0),
      indexBytes: Number(row.INDEX_LENGTH || 0),
    });
  }
  return output;
}

async function verifyBackupManifest(manifestPathInput: string, expectedDatabase: string, latestCompletedAt: Date) {
  const manifestPath = path.resolve(manifestPathInput);
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8')) as Record<string, any>;
  if (manifest.format !== 'web-tech-logical-backup-manifest-v1') throw new Error('Unsupported backup manifest format');
  if (manifest.database !== expectedDatabase) throw new Error(`Backup manifest database ${manifest.database} does not match ${expectedDatabase}`);
  if (manifest.verification?.verified !== true) throw new Error('Backup manifest is not restore-verified');
  const createdAt = new Date(String(manifest.createdAt || ''));
  if (Number.isNaN(createdAt.valueOf()) || createdAt < latestCompletedAt) throw new Error('Backup manifest predates the latest accepted import run');
  const backupPath = path.resolve(path.dirname(manifestPath), String(manifest.backupFile || ''));
  const bytes = await fs.readFile(backupPath);
  const digest = crypto.createHash('sha256').update(bytes).digest('hex');
  if (digest !== String(manifest.sha256 || '')) throw new Error('Backup file SHA-256 does not match the restore-verified manifest');
  const bundle = JSON.parse(bytes.toString('utf8')) as Record<string, any>;
  if (bundle.database !== expectedDatabase || bundle.format !== 'web-tech-logical-backup-v1') throw new Error('Backup bundle metadata does not match the target database');
  return { manifestPath, backupPath, sha256: digest, createdAt: createdAt.toISOString(), verification: manifest.verification };
}

async function acquireLocks(connection: PoolConnection) {
  const acquired: string[] = [];
  for (const lock of LOCKS) {
    const [rows] = await connection.query<RowDataPacket[]>('SELECT GET_LOCK(?,0) AS acquired', [lock]);
    if (Number(rows[0]?.acquired) !== 1) {
      for (const held of acquired.reverse()) await connection.query('SELECT RELEASE_LOCK(?)', [held]).catch(() => undefined);
      throw new Error(`Unable to acquire importer lock ${lock}`);
    }
    acquired.push(lock);
  }
  return acquired;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const modes = ['dry-run', 'apply'].filter((mode) => args[mode] === true);
  if (modes.length > 1) throw new Error('Choose exactly one of --dry-run or --apply');
  const mode = modes[0] || 'dry-run';
  const expectedDatabase = required(args, 'expected-database');
  const runIds = parseRunIds(required(args, 'run-ids'));
  const connection = await pool.getConnection();
  let acquiredLocks: string[] = [];
  try {
    const database = await selectedDatabase(connection);
    if (database !== expectedDatabase) throw new Error(`Database mismatch: connected to ${database}, expected ${expectedDatabase}`);
    const [auditColumnRows] = await connection.query<RowDataPacket[]>(`
      SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='web_admin_import_runs'
        AND COLUMN_NAME IN ('accepted_at','rollback_closed_at','recovery_cleaned_at')
    `);
    const auditColumns = new Set(auditColumnRows.map((row) => String(row.COLUMN_NAME)));
    const auditSelect = ['accepted_at', 'rollback_closed_at', 'recovery_cleaned_at']
      .map((column) => auditColumns.has(column) ? column : `NULL AS ${column}`).join(',');
    const [runRows] = await connection.query<RowDataPacket[]>(`
      SELECT id,source,entity,status,completed_at,${auditSelect}
      FROM web_admin_import_runs WHERE id IN (${runIds.map(() => '?').join(',')}) ORDER BY id
    `, runIds);
    if (runRows.length !== runIds.length) throw new Error('One or more requested import runs do not exist');
    const nonTerminal = runRows.filter((row) => !['applied', 'rolled_back'].includes(String(row.status)));
    if (nonTerminal.length) throw new Error(`Non-terminal runs cannot be cleaned: ${nonTerminal.map((row) => row.id).join(',')}`);
    const [activeRows] = await connection.query<RowDataPacket[]>("SELECT id FROM web_admin_import_runs WHERE status IN ('applying','rolling_back') LIMIT 1");
    if (activeRows.length) throw new Error(`Import run ${activeRows[0].id} is active`);
    const [transientRows] = await connection.query<RowDataPacket[]>(`
      SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE()
      AND (TABLE_NAME LIKE 'web_admin_import_stage\\_%' OR TABLE_NAME LIKE 'web_admin_import_restore\\_%')
    `);
    if (transientRows.length) throw new Error(`Transient import tables exist: ${transientRows.map((row) => row.TABLE_NAME).join(',')}`);
    const tables = await recoveryTables(connection);
    const selected = tables.filter((table) => runIds.includes(table.runId));
    const unselected = tables.filter((table) => !runIds.includes(table.runId));
    const summary = {
      tableCount: selected.length,
      emptyTables: selected.filter((table) => table.rows === 0).length,
      nonEmptyTables: selected.filter((table) => table.rows > 0).length,
      rows: selected.reduce((sum, table) => sum + table.rows, 0),
      dataBytes: selected.reduce((sum, table) => sum + table.dataBytes, 0),
      indexBytes: selected.reduce((sum, table) => sum + table.indexBytes, 0),
    };
    if (mode === 'dry-run') {
      console.log(JSON.stringify({ mode, database, runIds, runs: runRows, summary, tables: selected, unselectedRecoveryTables: unselected.map((table) => table.name) }, null, 2));
      return;
    }
    if (process.env.ADMIN_WRITE_ENABLED !== 'true') throw new Error('ADMIN_WRITE_ENABLED=true is required');
    if (args['maintenance-window'] !== true) throw new Error('--maintenance-window is required');
    if (required(args, 'confirm') !== CONFIRMATION) throw new Error(`--confirm=${CONFIRMATION} is required`);
    if (unselected.length) throw new Error(`Unselected recovery tables would remain: ${unselected.map((table) => table.name).join(',')}`);
    if (!selected.length) throw new Error('No recovery tables matched the requested runs');
    const latestCompletedAt = new Date(Math.max(...runRows.map((row) => new Date(row.completed_at).valueOf())));
    const backup = await verifyBackupManifest(required(args, 'backup-manifest'), database, latestCompletedAt);
    acquiredLocks = await acquireLocks(connection);
    await ensureLegacyImportTables(connection);
    await connection.query(
      `UPDATE web_admin_import_runs SET accepted_at=COALESCE(accepted_at,NOW()),rollback_closed_at=COALESCE(rollback_closed_at,NOW())
       WHERE id IN (${runIds.map(() => '?').join(',')})`,
      runIds,
    );
    await connection.query(`DROP TABLE ${selected.map((table) => quote(table.name)).join(',')}`);
    const report = JSON.stringify({ runIds, summary, backup, droppedTables: selected.map((table) => table.name), completedAt: new Date().toISOString() });
    await connection.query(
      `UPDATE web_admin_import_runs SET recovery_cleaned_at=NOW(),recovery_cleanup_json=?
       WHERE id IN (${runIds.map(() => '?').join(',')})`,
      [report, ...runIds],
    );
    const remaining = await recoveryTables(connection);
    if (remaining.length) throw new Error(`Recovery cleanup left ${remaining.length} tables`);
    console.log(JSON.stringify({ mode, database, runIds, summary, backup, remainingRecoveryTables: 0 }, null, 2));
  } finally {
    for (const lock of acquiredLocks.reverse()) await connection.query('SELECT RELEASE_LOCK(?)', [lock]).catch(() => undefined);
    connection.release();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(async () => pool.end());
