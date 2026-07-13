import crypto from 'crypto';
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { ensureLegacyImportTables } from './tables';

const LOCK_NAME = 'web_admin:bootstrap:safe_configuration';
export const SAFE_CONFIGURATION_CONFIRMATION = 'COPY_SAFE_CONFIGURATION';

export const SAFE_CONFIGURATION_TABLES = [
  'admin_roles',
  'admin_users',
  'web_admin_menus',
  'web_admin_menu_versions',
  'web_admin_menu_items',
  'web_admin_vn_provinces',
  'web_admin_vn_wards',
  'web_admin_location_sync_state',
  'shipping_setting',
  'idv_seller_ad_location',
] as const;

const INSERT_ORDER = [
  'admin_roles',
  'admin_users',
  'web_admin_menus',
  'web_admin_menu_versions',
  'web_admin_menu_items',
  'web_admin_vn_provinces',
  'web_admin_vn_wards',
  'web_admin_location_sync_state',
  'idv_seller_ad_location',
] as const;
const DELETE_ORDER = [...INSERT_ORDER].reverse();

type Db = Pool | PoolConnection;
type PlainRow = Record<string, unknown>;

function quote(identifier: string) {
  if (!/^[a-zA-Z0-9_]+$/.test(identifier)) throw new Error(`Unsafe SQL identifier: ${identifier}`);
  return `\`${identifier}\``;
}

function canonicalValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) return { bufferBase64: value.toString('base64') };
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as PlainRow).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonicalValue(item)]));
  }
  return value;
}

function stableJson(value: unknown) {
  return JSON.stringify(canonicalValue(value));
}

function hash(value: unknown) {
  return crypto.createHash('sha256').update(stableJson(value)).digest('hex');
}

async function selectedDatabase(db: Db) {
  const [rows] = await db.query<RowDataPacket[]>('SELECT DATABASE() AS name');
  const name = String(rows[0]?.name || '');
  if (!name) throw new Error('No MySQL database is selected');
  return name;
}

async function tableDefinition(db: Db, database: string, table: string) {
  const [columns] = await db.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME,ORDINAL_POSITION,COLUMN_DEFAULT,IS_NULLABLE,DATA_TYPE,CHARACTER_MAXIMUM_LENGTH,
            NUMERIC_PRECISION,NUMERIC_SCALE,DATETIME_PRECISION,CHARACTER_SET_NAME,COLLATION_NAME,COLUMN_TYPE,
            COLUMN_KEY,EXTRA,GENERATION_EXPRESSION
       FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? ORDER BY ORDINAL_POSITION`,
    [database, table],
  );
  const [indexes] = await db.query<RowDataPacket[]>(
    `SELECT INDEX_NAME,NON_UNIQUE,SEQ_IN_INDEX,COLUMN_NAME,COLLATION,SUB_PART,NULLABLE,INDEX_TYPE,EXPRESSION
       FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? ORDER BY INDEX_NAME,SEQ_IN_INDEX`,
    [database, table],
  );
  const [engines] = await db.query<RowDataPacket[]>(
    'SELECT ENGINE,TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME=?',
    [database, table],
  );
  if (!engines.length) throw new Error(`Missing table ${database}.${table}`);
  return { columns, indexes, engine: engines[0] };
}

async function primaryKey(db: Db, database: string, table: string) {
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND INDEX_NAME='PRIMARY' ORDER BY SEQ_IN_INDEX`,
    [database, table],
  );
  return rows.map((row) => String(row.COLUMN_NAME));
}

async function readRows(db: Db, database: string, table: string) {
  const keys = await primaryKey(db, database, table);
  const order = keys.length ? ` ORDER BY ${keys.map(quote).join(',')}` : '';
  const [rows] = await db.query<RowDataPacket[]>(`SELECT * FROM ${quote(database)}.${quote(table)}${order}`);
  return rows.map((row) => ({ ...row })) as PlainRow[];
}

function transformedRows(table: string, rows: PlainRow[]) {
  if (table !== 'admin_users') return rows;
  return rows.map((row) => ({
    ...row,
    must_change_password: 1,
    last_login_at: null,
    auth_version: Number(row.auth_version || 0) + 1,
  }));
}

async function targetNonEmptyTables(db: Db, database: string) {
  const [tables] = await db.query<RowDataPacket[]>(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME",
    [database],
  );
  const nonEmpty: Array<{ table: string; count: number }> = [];
  for (const row of tables) {
    const table = String(row.TABLE_NAME);
    if (['web_admin_import_runs', 'web_admin_import_records', 'web_admin_import_entity_map'].includes(table)) continue;
    const [counts] = await db.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM ${quote(database)}.${quote(table)}`);
    const count = Number(counts[0]?.total || 0);
    if (count) nonEmpty.push({ table, count });
  }
  return { tableCount: tables.length, nonEmpty };
}

export type SafeConfigurationPlan = {
  sourceDatabase: string;
  targetDatabase: string;
  snapshotHash: string;
  totalRows: number;
  counts: Record<string, number>;
  engines: Record<string, string>;
  targetTableCount: number;
  targetNonEmptyTables: Array<{ table: string; count: number }>;
  adminTransform: { mustChangePassword: true; clearLastLogin: true; incrementAuthVersion: true };
};

export async function planSafeConfigurationBootstrap(input: { sourceDatabase: string; targetDatabase: string }, db: Db = pool): Promise<SafeConfigurationPlan> {
  const current = await selectedDatabase(db);
  if (current !== input.targetDatabase) throw new Error(`Database mismatch: connected to ${current}, expected ${input.targetDatabase}`);
  if (input.sourceDatabase === input.targetDatabase) throw new Error('Source and target databases must differ');
  const counts: Record<string, number> = {};
  const engines: Record<string, string> = {};
  const snapshot: Record<string, unknown> = {};
  for (const table of SAFE_CONFIGURATION_TABLES) {
    const sourceDefinition = await tableDefinition(db, input.sourceDatabase, table);
    const targetDefinition = await tableDefinition(db, input.targetDatabase, table);
    if (hash(sourceDefinition) !== hash(targetDefinition)) throw new Error(`Schema/index/engine mismatch for ${table}`);
    engines[table] = String((sourceDefinition.engine as RowDataPacket).ENGINE || '');
    const rows = transformedRows(table, await readRows(db, input.sourceDatabase, table));
    counts[table] = rows.length;
    snapshot[table] = rows;
  }
  const targetState = await targetNonEmptyTables(db, input.targetDatabase);
  return {
    sourceDatabase: input.sourceDatabase,
    targetDatabase: input.targetDatabase,
    snapshotHash: hash(snapshot),
    totalRows: Object.values(counts).reduce((total, count) => total + count, 0),
    counts,
    engines,
    targetTableCount: targetState.tableCount,
    targetNonEmptyTables: targetState.nonEmpty,
    adminTransform: { mustChangePassword: true, clearLastLogin: true, incrementAuthVersion: true },
  };
}

async function insertRows(db: Db, table: string, rows: PlainRow[]) {
  if (!rows.length) return;
  const columns = Object.keys(rows[0]);
  for (let offset = 0; offset < rows.length; offset += 100) {
    const batch = rows.slice(offset, offset + 100);
    const values: unknown[] = [];
    for (const row of batch) {
      for (const column of columns) {
        const value = row[column];
        values.push(value && typeof value === 'object' && !(value instanceof Date) && !Buffer.isBuffer(value) ? JSON.stringify(value) : value);
      }
    }
    await db.query(
      `INSERT INTO ${quote(table)} (${columns.map(quote).join(',')}) VALUES ${batch.map(() => `(${columns.map(() => '?').join(',')})`).join(',')}`,
      values,
    );
  }
}

function menuRowsByDepth(rows: PlainRow[]) {
  const ids = new Map(rows.map((row) => [Number(row.id), row]));
  const depth = (row: PlainRow) => {
    let current = row;
    let result = 0;
    const seen = new Set<number>();
    while (current.parent_id !== null && current.parent_id !== undefined) {
      const parentId = Number(current.parent_id);
      if (seen.has(parentId)) throw new Error(`Menu cycle at item ${row.id}`);
      seen.add(parentId);
      const parent = ids.get(parentId);
      if (!parent) throw new Error(`Menu item ${row.id} has missing parent ${parentId}`);
      result += 1;
      current = parent;
    }
    return result;
  };
  return [...rows].sort((a, b) => depth(a) - depth(b) || Number(a.id) - Number(b.id));
}

export async function applySafeConfigurationBootstrap(input: {
  sourceDatabase: string;
  targetDatabase: string;
  expectedHash: string;
}) {
  if (process.env.ADMIN_WRITE_ENABLED !== 'true') throw new Error('ADMIN_WRITE_ENABLED=true is required for apply');
  const connection = await pool.getConnection();
  let lockHeld = false;
  let runId = 0;
  let shippingInserted = false;
  try {
    const [locks] = await connection.query<RowDataPacket[]>('SELECT GET_LOCK(?,0) AS acquired', [LOCK_NAME]);
    lockHeld = Number(locks[0]?.acquired) === 1;
    if (!lockHeld) throw new Error('Another safe-configuration bootstrap is running');
    const plan = await planSafeConfigurationBootstrap(input, connection);
    if (plan.targetNonEmptyTables.length) throw new Error(`Target database is not empty: ${plan.targetNonEmptyTables.map((item) => `${item.table}=${item.count}`).join(', ')}`);
    if (plan.snapshotHash !== input.expectedHash) throw new Error(`Snapshot hash mismatch: ${plan.snapshotHash} != ${input.expectedHash}`);
    await ensureLegacyImportTables(connection);
    const [failedRuns] = await connection.query<RowDataPacket[]>(
      `SELECT id FROM web_admin_import_runs
        WHERE source=? AND entity='safe-configuration' AND snapshot_hash=? AND status='apply_failed'
        ORDER BY id DESC LIMIT 1`,
      [input.sourceDatabase, plan.snapshotHash],
    );
    runId = Number(failedRuns[0]?.id || 0);
    if (runId) {
      await connection.query(
        "UPDATE web_admin_import_runs SET status='applying',item_count=?,report_json=?,error_message='',started_at=NOW(),completed_at=NULL WHERE id=?",
        [plan.totalRows, JSON.stringify({ ...plan, retriedAfterCompensatedFailure: true }), runId],
      );
    } else {
      const [run] = await connection.query<ResultSetHeader>(
        `INSERT INTO web_admin_import_runs(source,entity,source_url,snapshot_hash,status,item_count,report_json)
         VALUES(?,'safe-configuration',?,?,'applying',?,?)`,
        [input.sourceDatabase, `mysql://local/${input.sourceDatabase}`, plan.snapshotHash, plan.totalRows, JSON.stringify(plan)],
      );
      runId = Number(run.insertId);
    }
    const shippingRows = await readRows(connection, input.sourceDatabase, 'shipping_setting');
    await insertRows(connection, 'shipping_setting', shippingRows);
    shippingInserted = shippingRows.length > 0;
    await connection.beginTransaction();
    try {
      for (const table of INSERT_ORDER) {
        let rows = transformedRows(table, await readRows(connection, input.sourceDatabase, table));
        if (table === 'web_admin_menu_items') rows = menuRowsByDepth(rows);
        await insertRows(connection, table, rows);
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    }
    const verification = await planSafeConfigurationBootstrapAfterApply(input, connection);
    await connection.query("UPDATE web_admin_import_runs SET status='applied',report_json=?,completed_at=NOW() WHERE id=?", [JSON.stringify({ ...plan, verification }), runId]);
    return { runId, plan, verification };
  } catch (error) {
    if (shippingInserted) await connection.query('DELETE FROM shipping_setting').catch(() => undefined);
    if (runId) await connection.query("UPDATE web_admin_import_runs SET status='apply_failed',error_message=?,completed_at=NOW() WHERE id=?", [String(error instanceof Error ? error.message : error).slice(0, 2000), runId]).catch(() => undefined);
    throw error;
  } finally {
    if (lockHeld) await connection.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]).catch(() => undefined);
    connection.release();
  }
}

async function planSafeConfigurationBootstrapAfterApply(input: { sourceDatabase: string; targetDatabase: string }, db: Db) {
  const counts: Record<string, number> = {};
  const hashes: Record<string, string> = {};
  for (const table of SAFE_CONFIGURATION_TABLES) {
    const targetRows = await readRows(db, input.targetDatabase, table);
    const expectedRows = transformedRows(table, await readRows(db, input.sourceDatabase, table));
    counts[table] = targetRows.length;
    hashes[table] = hash(targetRows);
    if (hash(targetRows) !== hash(expectedRows)) throw new Error(`Post-copy hash mismatch for ${table}`);
  }
  return { counts, hashes, totalRows: Object.values(counts).reduce((total, count) => total + count, 0) };
}

export async function rollbackSafeConfigurationBootstrap(input: { runId: number; targetDatabase: string }) {
  if (process.env.ADMIN_WRITE_ENABLED !== 'true') throw new Error('ADMIN_WRITE_ENABLED=true is required for rollback');
  const connection = await pool.getConnection();
  let lockHeld = false;
  try {
    const current = await selectedDatabase(connection);
    if (current !== input.targetDatabase) throw new Error(`Database mismatch: connected to ${current}, expected ${input.targetDatabase}`);
    const [locks] = await connection.query<RowDataPacket[]>('SELECT GET_LOCK(?,0) AS acquired', [LOCK_NAME]);
    lockHeld = Number(locks[0]?.acquired) === 1;
    if (!lockHeld) throw new Error('Another safe-configuration bootstrap is running');
    const [runs] = await connection.query<RowDataPacket[]>("SELECT status FROM web_admin_import_runs WHERE id=? AND entity='safe-configuration'", [input.runId]);
    if (String(runs[0]?.status || '') !== 'applied') throw new Error(`Run ${input.runId} is not applied safe configuration`);
    await connection.query("UPDATE web_admin_import_runs SET status='rolling_back',completed_at=NULL WHERE id=?", [input.runId]);
    await connection.beginTransaction();
    try {
      for (const table of DELETE_ORDER) await connection.query(`DELETE FROM ${quote(table)}`);
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    }
    await connection.query('DELETE FROM shipping_setting');
    await connection.query("UPDATE web_admin_import_runs SET status='rolled_back',completed_at=NOW() WHERE id=?", [input.runId]);
    return { runId: input.runId, retainedAudit: true };
  } catch (error) {
    await connection.query("UPDATE web_admin_import_runs SET status='rollback_failed',error_message=?,completed_at=NOW() WHERE id=?", [String(error instanceof Error ? error.message : error).slice(0, 2000), input.runId]).catch(() => undefined);
    throw error;
  } finally {
    if (lockHeld) await connection.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]).catch(() => undefined);
    connection.release();
  }
}
