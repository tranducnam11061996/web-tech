import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import pool from '../src/lib/db';

type Args = Record<string, string | boolean>;
type Encoded = null | string | number | boolean | Encoded[] | { [key: string]: Encoded };
type BackupTable = { name: string; createSql: string; schemaHash: string; columns: string[]; rows: Encoded[][]; dataHash: string };
type BackupRoutine = { name: string; type: 'FUNCTION' | 'PROCEDURE'; createSql: string; definitionHash: string };
type BackupTrigger = { name: string; createSql: string; definitionHash: string };
type BackupBundle = {
  format: 'web-tech-logical-backup-v1';
  database: string;
  createdAt: string;
  charset: string;
  collation: string;
  tables: BackupTable[];
  routines: BackupRoutine[];
  triggers: BackupTrigger[];
};

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

function encode(value: unknown): Encoded {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return { __backupType: 'date', value: value.toISOString() };
  if (Buffer.isBuffer(value)) return { __backupType: 'buffer', value: value.toString('base64') };
  if (typeof value === 'bigint') return { __backupType: 'bigint', value: value.toString() };
  if (Array.isArray(value)) return value.map(encode);
  if (typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, encode(item)]));
  return value as string | number | boolean;
}

function decode(value: Encoded): unknown {
  if (Array.isArray(value)) return value.map(decode);
  if (value && typeof value === 'object' && '__backupType' in value) {
    if (value.__backupType === 'date') return new Date(String(value.value));
    if (value.__backupType === 'buffer') return Buffer.from(String(value.value), 'base64');
    if (value.__backupType === 'bigint') return String(value.value);
  }
  return value;
}

function sha256(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function selectedDatabase(connection: PoolConnection) {
  const [rows] = await connection.query<RowDataPacket[]>('SELECT DATABASE() AS name');
  return String(rows[0]?.name || '');
}

async function orderColumns(connection: PoolConnection, database: string, table: string) {
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND INDEX_NAME='PRIMARY' ORDER BY SEQ_IN_INDEX`,
    [database, table],
  );
  return rows.map((row) => String(row.COLUMN_NAME));
}

async function schemaHash(connection: PoolConnection, database: string, table: string) {
  const [columns] = await connection.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME,ORDINAL_POSITION,COLUMN_DEFAULT,IS_NULLABLE,DATA_TYPE,CHARACTER_MAXIMUM_LENGTH,
            NUMERIC_PRECISION,NUMERIC_SCALE,DATETIME_PRECISION,CHARACTER_SET_NAME,COLLATION_NAME,COLUMN_TYPE,
            COLUMN_KEY,EXTRA,GENERATION_EXPRESSION
       FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? ORDER BY ORDINAL_POSITION`,
    [database, table],
  );
  const [indexes] = await connection.query<RowDataPacket[]>(
    `SELECT INDEX_NAME,NON_UNIQUE,SEQ_IN_INDEX,COLUMN_NAME,COLLATION,SUB_PART,NULLABLE,INDEX_TYPE,EXPRESSION
       FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? ORDER BY INDEX_NAME,SEQ_IN_INDEX`,
    [database, table],
  );
  const [foreignKeys] = await connection.query<RowDataPacket[]>(
    `SELECT k.CONSTRAINT_NAME,k.COLUMN_NAME,k.ORDINAL_POSITION,k.REFERENCED_TABLE_NAME,k.REFERENCED_COLUMN_NAME,
            r.UPDATE_RULE,r.DELETE_RULE
       FROM information_schema.KEY_COLUMN_USAGE k
       JOIN information_schema.REFERENTIAL_CONSTRAINTS r
         ON r.CONSTRAINT_SCHEMA=k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME=k.CONSTRAINT_NAME
      WHERE k.TABLE_SCHEMA=? AND k.TABLE_NAME=? AND k.REFERENCED_TABLE_NAME IS NOT NULL
      ORDER BY k.CONSTRAINT_NAME,k.ORDINAL_POSITION`,
    [database, table],
  );
  const [metadata] = await connection.query<RowDataPacket[]>(
    'SELECT ENGINE,TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME=?',
    [database, table],
  );
  return sha256(JSON.stringify({ columns, indexes, foreignKeys, metadata }));
}

async function capture(connection: PoolConnection, database: string): Promise<BackupBundle> {
  const [schemas] = await connection.query<RowDataPacket[]>(
    'SELECT DEFAULT_CHARACTER_SET_NAME AS charset,DEFAULT_COLLATION_NAME AS collation FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=?',
    [database],
  );
  if (!schemas.length) throw new Error(`Database ${database} does not exist`);
  const [tableRows] = await connection.query<RowDataPacket[]>(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME",
    [database],
  );
  const tables: BackupTable[] = [];
  for (const tableRow of tableRows) {
    const name = String(tableRow.TABLE_NAME);
    const [creates] = await connection.query<RowDataPacket[]>(`SHOW CREATE TABLE ${quote(database)}.${quote(name)}`);
    const createSql = String(creates[0]?.['Create Table'] || '');
    const [columnRows] = await connection.query<RowDataPacket[]>(
      'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? ORDER BY ORDINAL_POSITION',
      [database, name],
    );
    const columns = columnRows.map((row) => String(row.COLUMN_NAME));
    const keys = await orderColumns(connection, database, name);
    const order = keys.length ? ` ORDER BY ${keys.map(quote).join(',')}` : '';
    const [rows] = await connection.query<RowDataPacket[]>(`SELECT * FROM ${quote(database)}.${quote(name)}${order}`);
    const encodedRows = rows.map((row) => columns.map((column) => encode(row[column])));
    tables.push({ name, createSql, schemaHash: await schemaHash(connection, database, name), columns, rows: encodedRows, dataHash: sha256(JSON.stringify(encodedRows)) });
  }
  const [routineRows] = await connection.query<RowDataPacket[]>(
    'SELECT ROUTINE_NAME,ROUTINE_TYPE FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA=? ORDER BY ROUTINE_TYPE,ROUTINE_NAME',
    [database],
  );
  const routines: BackupRoutine[] = [];
  for (const row of routineRows) {
    const type = String(row.ROUTINE_TYPE).toUpperCase() as 'FUNCTION' | 'PROCEDURE';
    const name = String(row.ROUTINE_NAME);
    const [creates] = await connection.query<RowDataPacket[]>(`SHOW CREATE ${type} ${quote(database)}.${quote(name)}`);
    const createSql = String(creates[0]?.[`Create ${type[0]}${type.slice(1).toLowerCase()}`] || creates[0]?.['Create Function'] || creates[0]?.['Create Procedure'] || '');
    routines.push({ name, type, createSql, definitionHash: sha256(createSql) });
  }
  const [triggerRows] = await connection.query<RowDataPacket[]>(
    'SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=? ORDER BY TRIGGER_NAME',
    [database],
  );
  const triggers: BackupTrigger[] = [];
  for (const row of triggerRows) {
    const name = String(row.TRIGGER_NAME);
    const [creates] = await connection.query<RowDataPacket[]>(`SHOW CREATE TRIGGER ${quote(database)}.${quote(name)}`);
    const createSql = String(creates[0]?.['SQL Original Statement'] || creates[0]?.['Create Trigger'] || '');
    triggers.push({ name, createSql, definitionHash: sha256(createSql) });
  }
  return {
    format: 'web-tech-logical-backup-v1',
    database,
    createdAt: new Date().toISOString(),
    charset: String(schemas[0].charset),
    collation: String(schemas[0].collation),
    tables,
    routines,
    triggers,
  };
}

async function restoreAndVerify(connection: PoolConnection, bundle: BackupBundle, keepRestore = false) {
  const suffix = `backup_test_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const prefixLength = 64 - suffix.length - 1;
  const temporaryDatabase = `${bundle.database.slice(0, prefixLength)}_${suffix}`;
  if (!temporaryDatabase.includes('test')) throw new Error('Restore database name must contain test');
  const [modeRows] = await connection.query<RowDataPacket[]>('SELECT @@SESSION.sql_mode AS sqlMode');
  const originalSqlMode = String(modeRows[0]?.sqlMode || '');
  try {
    await connection.query("SET SESSION sql_mode=''");
    await connection.query(`CREATE DATABASE ${quote(temporaryDatabase)} CHARACTER SET ${quote(bundle.charset)} COLLATE ${quote(bundle.collation)}`);
    await connection.query('SET FOREIGN_KEY_CHECKS=0');
    await connection.query(`USE ${quote(temporaryDatabase)}`);
    for (const table of bundle.tables) await connection.query(table.createSql);
    for (const table of bundle.tables) {
      if (!table.rows.length) continue;
      for (let offset = 0; offset < table.rows.length; offset += 100) {
        const rows = table.rows.slice(offset, offset + 100);
        const values: unknown[] = [];
        for (const row of rows) {
          for (const value of row) {
            const decoded = decode(value);
            values.push(decoded && typeof decoded === 'object' && !(decoded instanceof Date) && !Buffer.isBuffer(decoded) ? JSON.stringify(decoded) : decoded);
          }
        }
        await connection.query(
          `INSERT INTO ${quote(table.name)} (${table.columns.map(quote).join(',')}) VALUES ${rows.map(() => `(${table.columns.map(() => '?').join(',')})`).join(',')}`,
          values,
        );
      }
    }
    for (const routine of bundle.routines || []) await connection.query(routine.createSql);
    for (const trigger of bundle.triggers || []) await connection.query(trigger.createSql);
    await connection.query('SET FOREIGN_KEY_CHECKS=1');
    const restored = await capture(connection, temporaryDatabase);
    if (restored.tables.length !== bundle.tables.length) throw new Error(`Restore table count mismatch: ${restored.tables.length}/${bundle.tables.length}`);
    for (let index = 0; index < bundle.tables.length; index += 1) {
      const source = bundle.tables[index];
      const target = restored.tables[index];
      if (source.name !== target.name || source.rows.length !== target.rows.length || source.dataHash !== target.dataHash) {
        throw new Error(`Restore verification mismatch for ${source.name}`);
      }
      if (source.schemaHash !== target.schemaHash) throw new Error(`Restore schema mismatch for ${source.name}`);
    }
    if (JSON.stringify((bundle.routines || []).map((item) => [item.name, item.type, item.definitionHash])) !== JSON.stringify((restored.routines || []).map((item) => [item.name, item.type, item.definitionHash]))) {
      throw new Error('Restore routine mismatch');
    }
    if (JSON.stringify((bundle.triggers || []).map((item) => [item.name, item.definitionHash])) !== JSON.stringify((restored.triggers || []).map((item) => [item.name, item.definitionHash]))) {
      throw new Error('Restore trigger mismatch');
    }
    return { temporaryDatabase, tables: bundle.tables.length, rows: bundle.tables.reduce((total, table) => total + table.rows.length, 0), routines: bundle.routines.length, triggers: bundle.triggers.length, verified: true };
  } finally {
    await connection.query(`USE ${quote(bundle.database)}`).catch(() => undefined);
    await connection.query('SET FOREIGN_KEY_CHECKS=1').catch(() => undefined);
    await connection.query('SET SESSION sql_mode=?', [originalSqlMode]).catch(() => undefined);
    if (!keepRestore) await connection.query(`DROP DATABASE IF EXISTS ${quote(temporaryDatabase)}`).catch(() => undefined);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const database = required(args, 'database');
  if (args['verify-restore'] !== true) throw new Error('--verify-restore is required');
  if (process.env.ADMIN_WRITE_ENABLED !== 'true') throw new Error('ADMIN_WRITE_ENABLED=true is required because restore verification creates and drops a disposable database');
  const connection = await pool.getConnection();
  try {
    const current = await selectedDatabase(connection);
    if (current !== database) throw new Error(`Database mismatch: connected to ${current}, expected ${database}`);
    const bundle = await capture(connection, database);
    const json = `${JSON.stringify(bundle)}\n`;
    const digest = sha256(json);
    const outputDirectory = path.resolve(String(args['output-dir'] || path.resolve(process.cwd(), '..', 'tmp', 'db-backups')));
    await fs.mkdir(outputDirectory, { recursive: true });
    const label = String(args.label || 'backup').replace(/[^a-zA-Z0-9_-]/g, '-');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(outputDirectory, `${database}-${label}-${timestamp}.json`);
    const manifestPath = `${backupPath}.sha256`;
    const verificationManifestPath = `${backupPath}.manifest.json`;
    const verification = await restoreAndVerify(connection, bundle, args['keep-restore'] === true);
    await fs.writeFile(backupPath, json, { encoding: 'utf8', flag: 'wx' });
    await fs.writeFile(manifestPath, `${digest}  ${path.basename(backupPath)}\n`, { encoding: 'ascii', flag: 'wx' });
    await fs.writeFile(verificationManifestPath, `${JSON.stringify({
      format: 'web-tech-logical-backup-manifest-v1',
      database,
      createdAt: bundle.createdAt,
      backupFile: path.basename(backupPath),
      sha256: digest,
      tables: bundle.tables.length,
      rows: bundle.tables.reduce((total, table) => total + table.rows.length, 0),
      routines: bundle.routines.length,
      triggers: bundle.triggers.length,
      verification,
    }, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    console.log(JSON.stringify({ database, backupPath, manifestPath, verificationManifestPath, sha256: digest, tables: bundle.tables.length, rows: bundle.tables.reduce((total, table) => total + table.rows.length, 0), routines: bundle.routines.length, triggers: bundle.triggers.length, verification }, null, 2));
  } finally {
    connection.release();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(async () => pool.end());
