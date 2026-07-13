import fs from 'node:fs/promises';
import path from 'node:path';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import pool from '../src/lib/db';
import {
  COLLATION_CONFIRMATION,
  COLLATION_RECOVERY_PREFIX,
  COLLATION_SOURCE,
  COLLATION_TARGET,
  COLLATION_TARGET_CHARSET,
  buildCollationDdl,
  buildCollationPlanHash,
  collationMigrationPriority,
  isCollationRecoveryTable,
  quoteSqlIdentifier,
  repairUtf8BytesStoredAsLatin1,
  sha256,
  sortCollationTables,
  stableJson,
  type BannerNameRepair,
  type CollationMigrationTable,
} from '../src/lib/databaseCollationMigration';

type Args = Record<string, string | boolean>;
type IndexColumn = {
  indexName: string;
  nonUnique: number;
  indexType: string;
  sequence: number;
  columnName: string;
  subPart: number | null;
  collationName: string | null;
  characterLength: number | null;
  octetLength: number | null;
  dataType: string;
  nullable: boolean;
};
type DatabaseSnapshot = {
  tables: number;
  rows: number;
  routines: number;
  triggers: number;
  fulltextIndexes: number;
  categories: number;
  brands: number;
  products: number;
  prices: number;
  productInfo: number;
  searchRows: number;
  missingSearchRows: number;
};
type CollationAudit = {
  format: 'web-tech-collation-plan-v1';
  database: string;
  includeRecovery: boolean;
  createdAt: string;
  sourceCollation: string;
  targetCharset: string;
  targetCollation: string;
  snapshot: DatabaseSnapshot;
  tables: CollationMigrationTable[];
  bannerRepairs: BannerNameRepair[];
  planHash: string;
};

function calculateAuditPlanHash(audit: Pick<CollationAudit,
  'database' | 'includeRecovery' | 'sourceCollation' | 'targetCharset' | 'targetCollation' | 'snapshot' | 'tables' | 'bannerRepairs'>) {
  return buildCollationPlanHash({
    database: audit.database,
    includeRecovery: audit.includeRecovery,
    sourceCollation: audit.sourceCollation,
    targetCharset: audit.targetCharset,
    targetCollation: audit.targetCollation,
    snapshot: audit.snapshot,
    tables: audit.tables.map(({ dataLength: _dataLength, indexLength: _indexLength, priority: _priority, ...table }) => table),
    bannerRepairs: audit.bannerRepairs,
  });
}

function advisoryLockName(database: string) {
  return `web-tech:dbcoll:${sha256(database).slice(0, 32)}`;
}

function parseArgs(argv: string[]) {
  const result: Args = {};
  for (const argument of argv) {
    if (!argument.startsWith('--')) throw new Error(`Unknown argument: ${argument}`);
    const [key, ...rest] = argument.slice(2).split('=');
    result[key] = rest.length ? rest.join('=') : true;
  }
  return result;
}

function required(args: Args, key: string) {
  const value = args[key];
  if (!value || value === true) throw new Error(`--${key}=<value> is required`);
  return String(value);
}

function allowedDatabase(database: string) {
  return database === 'it_tech_db' || /^it_tech_db_collation_test_[a-zA-Z0-9_]+$/.test(database);
}

async function selectExpectedDatabase(connection: PoolConnection, database: string) {
  if (!allowedDatabase(database)) throw new Error(`Refusing collation work on unsupported database: ${database}`);
  const [schemas] = await connection.query<RowDataPacket[]>(
    'SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME=?',
    [database],
  );
  if (!schemas.length) throw new Error(`Database does not exist: ${database}`);
  await connection.query(`USE ${quoteSqlIdentifier(database)}`);
  const [rows] = await connection.query<RowDataPacket[]>('SELECT DATABASE() AS name');
  if (String(rows[0]?.name || '') !== database) throw new Error(`Failed to select database ${database}`);
}

async function exactRowCount(connection: PoolConnection, table: string) {
  const [rows] = await connection.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM ${quoteSqlIdentifier(table)}`);
  return Number(rows[0]?.total || 0);
}

async function indexColumns(connection: PoolConnection, database: string, table: string): Promise<IndexColumn[]> {
  const [rows] = await connection.query<RowDataPacket[]>(`
    SELECT s.INDEX_NAME,s.NON_UNIQUE,s.INDEX_TYPE,s.SEQ_IN_INDEX,s.COLUMN_NAME,s.SUB_PART,
           c.COLLATION_NAME,c.CHARACTER_MAXIMUM_LENGTH,c.CHARACTER_OCTET_LENGTH,c.DATA_TYPE,c.IS_NULLABLE
    FROM information_schema.STATISTICS s
    LEFT JOIN information_schema.COLUMNS c
      ON c.TABLE_SCHEMA=s.TABLE_SCHEMA AND c.TABLE_NAME=s.TABLE_NAME AND c.COLUMN_NAME=s.COLUMN_NAME
    WHERE s.TABLE_SCHEMA=? AND s.TABLE_NAME=?
    ORDER BY s.INDEX_NAME,s.SEQ_IN_INDEX
  `, [database, table]);
  return rows.map((row) => {
    if (!row.COLUMN_NAME) throw new Error(`Functional index ${table}.${row.INDEX_NAME} requires manual review`);
    return {
      indexName: String(row.INDEX_NAME),
      nonUnique: Number(row.NON_UNIQUE),
      indexType: String(row.INDEX_TYPE),
      sequence: Number(row.SEQ_IN_INDEX),
      columnName: String(row.COLUMN_NAME),
      subPart: row.SUB_PART === null ? null : Number(row.SUB_PART),
      collationName: row.COLLATION_NAME === null ? null : String(row.COLLATION_NAME),
      characterLength: row.CHARACTER_MAXIMUM_LENGTH === null ? null : Number(row.CHARACTER_MAXIMUM_LENGTH),
      octetLength: row.CHARACTER_OCTET_LENGTH === null ? null : Number(row.CHARACTER_OCTET_LENGTH),
      dataType: String(row.DATA_TYPE || ''),
      nullable: String(row.IS_NULLABLE || '') === 'YES',
    };
  });
}

function groupIndexes(columns: IndexColumn[]) {
  const grouped = new Map<string, IndexColumn[]>();
  for (const column of columns) grouped.set(column.indexName, [...(grouped.get(column.indexName) || []), column]);
  return grouped;
}

function indexStructureHash(columns: IndexColumn[]) {
  return sha256(stableJson(columns.map((column) => ({
    indexName: column.indexName,
    nonUnique: column.nonUnique,
    indexType: column.indexType,
    sequence: column.sequence,
    columnName: column.columnName,
    subPart: column.subPart,
    nullable: column.nullable,
  }))));
}

function estimateConvertedIndexBytes(engine: string, table: string, indexes: Map<string, IndexColumn[]>) {
  const threshold = engine.toLowerCase() === 'myisam' ? 1000 : 3072;
  for (const [indexName, columns] of indexes) {
    if (columns[0]?.indexType === 'FULLTEXT' || columns[0]?.indexType === 'SPATIAL') continue;
    let estimated = 0;
    for (const column of columns) {
      if (column.collationName !== null) {
        const characters = column.subPart ?? column.characterLength ?? 0;
        estimated += characters * 4;
      } else if (column.octetLength !== null) {
        estimated += column.subPart ?? column.octetLength;
      } else {
        estimated += 16;
      }
    }
    if (estimated > threshold) {
      throw new Error(`Converted index may exceed ${threshold} bytes: ${table}.${indexName} estimated=${estimated}`);
    }
  }
}

async function assertNoTargetCollationDuplicates(connection: PoolConnection, table: string, indexes: Map<string, IndexColumn[]>) {
  for (const [indexName, columns] of indexes) {
    if (columns[0]?.nonUnique !== 0 || columns[0]?.indexType === 'FULLTEXT' || columns[0]?.indexType === 'SPATIAL') continue;
    if (!columns.some((column) => column.collationName !== null)) continue;
    const expressions = columns.map((column) => {
      let expression = quoteSqlIdentifier(column.columnName);
      if (column.collationName !== null) {
        expression = `CONVERT(${expression} USING ${COLLATION_TARGET_CHARSET}) COLLATE ${COLLATION_TARGET}`;
        if (column.subPart) expression = `LEFT(${expression},${column.subPart})`;
      }
      return expression;
    });
    const nullable = columns.filter((column) => column.nullable).map((column) => `${quoteSqlIdentifier(column.columnName)} IS NOT NULL`);
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT 1 FROM ${quoteSqlIdentifier(table)}${nullable.length ? ` WHERE ${nullable.join(' AND ')}` : ''}
       GROUP BY ${expressions.join(',')} HAVING COUNT(*)>1 LIMIT 1`,
    );
    if (rows.length) throw new Error(`Target collation creates a duplicate key in ${table}.${indexName}`);
  }
}

async function databaseSnapshot(connection: PoolConnection, database: string): Promise<DatabaseSnapshot> {
  const [tableRows] = await connection.query<RowDataPacket[]>(
    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME",
    [database],
  );
  let rows = 0;
  for (const table of tableRows) rows += await exactRowCount(connection, String(table.TABLE_NAME));
  const [objects] = await connection.query<RowDataPacket[]>(`
    SELECT
      (SELECT COUNT(*) FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA=?) AS routines,
      (SELECT COUNT(*) FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA=?) AS triggers,
      (SELECT COUNT(*) FROM (
        SELECT TABLE_NAME,INDEX_NAME FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA=? AND INDEX_TYPE='FULLTEXT' GROUP BY TABLE_NAME,INDEX_NAME
      ) fulltext_index_rows) AS fulltext_indexes,
      (SELECT COUNT(*) FROM idv_seller_category) AS categories,
      (SELECT COUNT(*) FROM idv_brand) AS brands,
      (SELECT COUNT(*) FROM idv_sell_product_store) AS products,
      (SELECT COUNT(*) FROM idv_sell_product_price) AS prices,
      (SELECT COUNT(*) FROM idv_sell_product_info) AS product_info,
      (SELECT COUNT(*) FROM product_data_search) AS search_rows,
      (SELECT COUNT(*) FROM idv_sell_product_store p LEFT JOIN product_data_search s ON s.product_id=p.id WHERE s.product_id IS NULL) AS missing_search_rows
  `, [database, database, database]);
  const row = objects[0] || {};
  return {
    tables: tableRows.length,
    rows,
    routines: Number(row.routines || 0),
    triggers: Number(row.triggers || 0),
    fulltextIndexes: Number(row.fulltext_indexes || 0),
    categories: Number(row.categories || 0),
    brands: Number(row.brands || 0),
    products: Number(row.products || 0),
    prices: Number(row.prices || 0),
    productInfo: Number(row.product_info || 0),
    searchRows: Number(row.search_rows || 0),
    missingSearchRows: Number(row.missing_search_rows || 0),
  };
}

async function loadBannerRepairs(connection: PoolConnection): Promise<BannerNameRepair[]> {
  const [columns] = await connection.query<RowDataPacket[]>(`
    SELECT COLLATION_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='idv_seller_ad_location' AND COLUMN_NAME='name'
  `);
  if (!columns.length || String(columns[0].COLLATION_NAME) !== COLLATION_SOURCE) return [];
  const [rows] = await connection.query<RowDataPacket[]>(
    'SELECT id,name,HEX(name) AS original_hex FROM idv_seller_ad_location ORDER BY id',
  );
  return rows.map((row) => repairUtf8BytesStoredAsLatin1({
    id: Number(row.id),
    currentText: String(row.name || ''),
    originalHex: String(row.original_hex || ''),
  }));
}

async function createAudit(connection: PoolConnection, database: string, includeRecovery: boolean): Promise<CollationAudit> {
  const [tableRows] = await connection.query<RowDataPacket[]>(`
    SELECT t.TABLE_NAME,t.ENGINE,t.TABLE_COLLATION,t.DATA_LENGTH,t.INDEX_LENGTH,
           SUM(c.COLLATION_NAME IS NOT NULL) AS character_columns,
           SUM(c.COLLATION_NAME=?) AS latin1_columns,
           SUM(c.CHARACTER_SET_NAME='utf8mb3') AS utf8mb3_columns
    FROM information_schema.TABLES t
    LEFT JOIN information_schema.COLUMNS c ON c.TABLE_SCHEMA=t.TABLE_SCHEMA AND c.TABLE_NAME=t.TABLE_NAME
    WHERE t.TABLE_SCHEMA=? AND t.TABLE_TYPE='BASE TABLE'
    GROUP BY t.TABLE_NAME,t.ENGINE,t.TABLE_COLLATION,t.DATA_LENGTH,t.INDEX_LENGTH
    HAVING t.TABLE_COLLATION=? OR latin1_columns>0 OR (t.TABLE_COLLATION=? AND utf8mb3_columns>0)
    ORDER BY t.TABLE_NAME
  `, [COLLATION_SOURCE, database, COLLATION_SOURCE, COLLATION_SOURCE]);

  const tables: CollationMigrationTable[] = [];
  for (const row of tableRows) {
    const name = String(row.TABLE_NAME);
    if (!includeRecovery && isCollationRecoveryTable(name)) continue;
    const latin1Columns = Number(row.latin1_columns || 0);
    const utf8mb3Columns = Number(row.utf8mb3_columns || 0);
    const tableCollation = String(row.TABLE_COLLATION || '');
    const { mode, ddl } = buildCollationDdl({ tableName: name, tableCollation, latin1Columns, utf8mb3Columns });
    const indexes = indexColumns(connection, database, name);
    const indexRows = await indexes;
    const grouped = groupIndexes(indexRows);
    const engine = String(row.ENGINE || '');
    estimateConvertedIndexBytes(engine, name, grouped);
    await assertNoTargetCollationDuplicates(connection, name, grouped);
    const [createRows] = await connection.query<RowDataPacket[]>(`SHOW CREATE TABLE ${quoteSqlIdentifier(name)}`);
    const createSql = String(createRows[0]?.['Create Table'] || '');
    const rowCount = await exactRowCount(connection, name);
    const uniqueIndexCount = [...grouped.values()].filter((columns) => columns[0]?.nonUnique === 0).length;
    const fulltextIndexCount = [...grouped.values()].filter((columns) => columns[0]?.indexType === 'FULLTEXT').length;
    const base = {
      name,
      engine,
      tableCollation,
      rowCount,
      dataLength: Number(row.DATA_LENGTH || 0),
      indexLength: Number(row.INDEX_LENGTH || 0),
      characterColumns: Number(row.character_columns || 0),
      latin1Columns,
      utf8mb3Columns,
      indexCount: grouped.size,
      uniqueIndexCount,
      fulltextIndexCount,
      createHash: sha256(createSql),
      indexHash: sha256(stableJson(indexRows)),
      indexStructureHash: indexStructureHash(indexRows),
      mode,
      ddl,
    };
    tables.push({ ...base, priority: collationMigrationPriority(base) });
  }

  const snapshot = await databaseSnapshot(connection, database);
  const bannerRepairs = includeRecovery ? [] : await loadBannerRepairs(connection);
  if (!includeRecovery && tables.some((table) => table.name === 'idv_seller_ad_location')) {
    const changedBannerNames = bannerRepairs.filter((repair) => repair.changed).length;
    if (bannerRepairs.length !== 78 || changedBannerNames !== 54) {
      throw new Error(`Unexpected banner repair inventory: rows=${bannerRepairs.length}/78 changed=${changedBannerNames}/54`);
    }
  }
  const sorted = sortCollationTables(tables);
  const hashInput = {
    database,
    includeRecovery,
    sourceCollation: COLLATION_SOURCE,
    targetCharset: COLLATION_TARGET_CHARSET,
    targetCollation: COLLATION_TARGET,
    snapshot,
    tables: sorted,
    bannerRepairs,
  };
  return {
    format: 'web-tech-collation-plan-v1',
    database,
    includeRecovery,
    createdAt: new Date().toISOString(),
    sourceCollation: COLLATION_SOURCE,
    targetCharset: COLLATION_TARGET_CHARSET,
    targetCollation: COLLATION_TARGET,
    snapshot,
    tables: sorted,
    bannerRepairs,
    planHash: calculateAuditPlanHash(hashInput),
  };
}

function artifactDirectory(args: Args) {
  return path.resolve(String(args['artifact-dir'] || path.resolve(process.cwd(), 'var', 'migrations', 'collation')));
}

async function writeJson(file: string, value: unknown) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function auditFile(directory: string, audit: CollationAudit) {
  return path.join(directory, `${audit.database}-${audit.includeRecovery ? 'all' : 'runtime'}-${audit.planHash}.audit.json`);
}

async function repairBannerNames(connection: PoolConnection, repairs: BannerNameRepair[]) {
  const changed = repairs.filter((repair) => repair.changed);
  if (!changed.length) return 0;
  await connection.beginTransaction();
  try {
    for (const repair of changed) {
      const [result] = await connection.query('UPDATE idv_seller_ad_location SET name=? WHERE id=?', [repair.repairedText, repair.id]);
      if (!('affectedRows' in result) || Number(result.affectedRows) !== 1) throw new Error(`Banner repair did not update id ${repair.id}`);
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  }
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT id,HEX(name) AS repaired_hex FROM idv_seller_ad_location WHERE id IN (${changed.map(() => '?').join(',')})`,
    changed.map((repair) => repair.id),
  );
  const byId = new Map(rows.map((row) => [Number(row.id), String(row.repaired_hex || '').toUpperCase()]));
  for (const repair of changed) {
    if (byId.get(repair.id) !== repair.repairedHex) throw new Error(`Banner repair verification failed for id ${repair.id}`);
  }
  return changed.length;
}

async function verifyTableAfterAlter(connection: PoolConnection, database: string, table: CollationMigrationTable) {
  const [rows] = await connection.query<RowDataPacket[]>(`
    SELECT t.ENGINE,t.TABLE_COLLATION,
           SUM(c.COLLATION_NAME=?) AS latin1_columns,
           SUM(c.CHARACTER_SET_NAME='utf8mb3') AS utf8mb3_columns
    FROM information_schema.TABLES t
    LEFT JOIN information_schema.COLUMNS c ON c.TABLE_SCHEMA=t.TABLE_SCHEMA AND c.TABLE_NAME=t.TABLE_NAME
    WHERE t.TABLE_SCHEMA=? AND t.TABLE_NAME=?
    GROUP BY t.ENGINE,t.TABLE_COLLATION
  `, [COLLATION_SOURCE, database, table.name]);
  const row = rows[0];
  if (!row || String(row.ENGINE) !== table.engine || String(row.TABLE_COLLATION) !== COLLATION_TARGET
      || Number(row.latin1_columns || 0) !== 0 || Number(row.utf8mb3_columns || 0) !== 0) {
    throw new Error(`Post-alter schema mismatch for ${table.name}: ${JSON.stringify(row || {})}`);
  }
  if (await exactRowCount(connection, table.name) !== table.rowCount) throw new Error(`Row count changed for ${table.name}`);
  const indexes = groupIndexes(await indexColumns(connection, database, table.name));
  const fulltext = [...indexes.values()].filter((columns) => columns[0]?.indexType === 'FULLTEXT').length;
  if (indexes.size !== table.indexCount || fulltext !== table.fulltextIndexCount) throw new Error(`Index count changed for ${table.name}`);
  const currentIndexStructureHash = indexStructureHash([...indexes.values()].flat());
  if (currentIndexStructureHash !== table.indexStructureHash) throw new Error(`Index definition changed for ${table.name}`);
}

async function tableAlreadyAtTarget(connection: PoolConnection, database: string, table: CollationMigrationTable) {
  const [rows] = await connection.query<RowDataPacket[]>(`
    SELECT t.TABLE_COLLATION,
           SUM(c.COLLATION_NAME=?) AS latin1_columns,
           SUM(c.CHARACTER_SET_NAME='utf8mb3') AS utf8mb3_columns
    FROM information_schema.TABLES t
    LEFT JOIN information_schema.COLUMNS c ON c.TABLE_SCHEMA=t.TABLE_SCHEMA AND c.TABLE_NAME=t.TABLE_NAME
    WHERE t.TABLE_SCHEMA=? AND t.TABLE_NAME=?
    GROUP BY t.TABLE_COLLATION
  `, [COLLATION_SOURCE, database, table.name]);
  const row = rows[0];
  return Boolean(row && String(row.TABLE_COLLATION) === COLLATION_TARGET
    && Number(row.latin1_columns || 0) === 0 && Number(row.utf8mb3_columns || 0) === 0);
}

async function assertTableMatchesAudit(connection: PoolConnection, database: string, table: CollationMigrationTable) {
  const [rows] = await connection.query<RowDataPacket[]>(`
    SELECT ENGINE,TABLE_COLLATION FROM information_schema.TABLES
    WHERE TABLE_SCHEMA=? AND TABLE_NAME=?
  `, [database, table.name]);
  if (!rows.length || String(rows[0].ENGINE) !== table.engine || String(rows[0].TABLE_COLLATION) !== table.tableCollation) {
    throw new Error(`Schema changed since audit for ${table.name}`);
  }
  if (await exactRowCount(connection, table.name) !== table.rowCount) throw new Error(`Row count changed since audit for ${table.name}`);
  const [createRows] = await connection.query<RowDataPacket[]>(`SHOW CREATE TABLE ${quoteSqlIdentifier(table.name)}`);
  if (sha256(String(createRows[0]?.['Create Table'] || '')) !== table.createHash) throw new Error(`Table definition changed since audit for ${table.name}`);
  const indexes = await indexColumns(connection, database, table.name);
  if (sha256(stableJson(indexes)) !== table.indexHash) throw new Error(`Index metadata changed since audit for ${table.name}`);
}

async function applyAudit(connection: PoolConnection, audit: CollationAudit, directory: string) {
  const startedAt = new Date().toISOString();
  const completed: Array<{ table: string; durationMs: number; skipped?: boolean }> = [];
  let currentTable = '';
  const currentSnapshot = await databaseSnapshot(connection, audit.database);
  if (stableJson(currentSnapshot) !== stableJson(audit.snapshot)) throw new Error('Database contents changed since audit');
  const [modeRows] = await connection.query<RowDataPacket[]>('SELECT @@SESSION.sql_mode AS sql_mode');
  const originalSqlMode = String(modeRows[0]?.sql_mode || '');
  const migrationSqlMode = originalSqlMode.split(',').filter((mode) => ![
    'STRICT_TRANS_TABLES', 'STRICT_ALL_TABLES', 'NO_ZERO_DATE', 'NO_ZERO_IN_DATE',
  ].includes(mode)).join(',');
  await connection.query('SET SESSION sql_mode=?', [migrationSqlMode]);
  try {
    for (const table of audit.tables) {
      currentTable = table.name;
      const started = performance.now();
      if (await tableAlreadyAtTarget(connection, audit.database, table)) {
        if (table.name === 'idv_seller_ad_location') await repairBannerNames(connection, audit.bannerRepairs);
        await verifyTableAfterAlter(connection, audit.database, table);
        completed.push({ table: table.name, durationMs: Number((performance.now() - started).toFixed(1)), skipped: true });
        continue;
      }
      await assertTableMatchesAudit(connection, audit.database, table);
      await connection.query(table.ddl);
      const [warnings] = await connection.query<RowDataPacket[]>('SHOW WARNINGS');
      const actionableWarnings = warnings.filter((warning) => String(warning.Level || '').toLowerCase() !== 'note');
      if (actionableWarnings.length) throw new Error(`ALTER ${table.name} produced warnings: ${JSON.stringify(actionableWarnings)}`);
      if (table.name === 'idv_seller_ad_location') await repairBannerNames(connection, audit.bannerRepairs);
      await verifyTableAfterAlter(connection, audit.database, table);
      completed.push({ table: table.name, durationMs: Number((performance.now() - started).toFixed(1)) });
    }
    const result = { status: 'applied', planHash: audit.planHash, database: audit.database, startedAt, completedAt: new Date().toISOString(), completed };
    await writeJson(path.join(directory, `${audit.database}-${audit.planHash}.apply.json`), result);
    return result;
  } catch (error) {
    const result = {
      status: 'apply_failed', planHash: audit.planHash, database: audit.database, startedAt,
      failedAt: new Date().toISOString(), currentTable, completed,
      error: String(error instanceof Error ? error.message : error).slice(0, 4000),
    };
    await writeJson(path.join(directory, `${audit.database}-${audit.planHash}.apply-failed.json`), result).catch(() => undefined);
    throw error;
  } finally {
    await connection.query('SET SESSION sql_mode=?', [originalSqlMode]).catch(() => undefined);
  }
}

async function verifyDatabase(connection: PoolConnection, database: string, baseline: CollationAudit) {
  const snapshot = await databaseSnapshot(connection, database);
  for (const key of Object.keys(baseline.snapshot) as Array<keyof DatabaseSnapshot>) {
    if (snapshot[key] !== baseline.snapshot[key]) throw new Error(`Database snapshot mismatch for ${key}: ${snapshot[key]}/${baseline.snapshot[key]}`);
  }
  for (const table of baseline.tables) await verifyTableAfterAlter(connection, database, table);

  const [latinTables] = await connection.query<RowDataPacket[]>(`
    SELECT TABLE_NAME FROM information_schema.TABLES
    WHERE TABLE_SCHEMA=? AND TABLE_COLLATION=? ORDER BY TABLE_NAME
  `, [database, COLLATION_SOURCE]);
  const [latinColumns] = await connection.query<RowDataPacket[]>(`
    SELECT TABLE_NAME,COLUMN_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=? AND COLLATION_NAME=? ORDER BY TABLE_NAME,COLUMN_NAME
  `, [database, COLLATION_SOURCE]);
  const [utf8mb3Columns] = await connection.query<RowDataPacket[]>(`
    SELECT TABLE_NAME,COLUMN_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA=? AND CHARACTER_SET_NAME='utf8mb3' ORDER BY TABLE_NAME,COLUMN_NAME
  `, [database]);
  const residual = [...latinTables, ...latinColumns, ...utf8mb3Columns];
  if (baseline.includeRecovery) {
    if (residual.length) throw new Error(`Legacy character sets remain after full migration: ${JSON.stringify(residual.slice(0, 20))}`);
  } else {
    const invalid = residual.filter((row) => !String(row.TABLE_NAME || '').startsWith(COLLATION_RECOVERY_PREFIX));
    if (invalid.length) throw new Error(`Legacy character sets remain outside recovery tables: ${JSON.stringify(invalid.slice(0, 20))}`);
    if (latinTables.length !== 31 || latinColumns.length !== 108) {
      throw new Error(`Unexpected recovery residual: tables=${latinTables.length}/31 columns=${latinColumns.length}/108`);
    }
  }
  if (baseline.bannerRepairs.length) {
    const changed = baseline.bannerRepairs.filter((repair) => repair.changed);
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT id,HEX(name) AS repaired_hex FROM idv_seller_ad_location WHERE id IN (${changed.map(() => '?').join(',')})`,
      changed.map((repair) => repair.id),
    );
    const byId = new Map(rows.map((row) => [Number(row.id), String(row.repaired_hex || '').toUpperCase()]));
    for (const repair of changed) {
      if (byId.get(repair.id) !== repair.repairedHex) throw new Error(`Banner repair is missing for id ${repair.id}`);
    }
  }
  return {
    status: 'verified', database, planHash: baseline.planHash, snapshot,
    residualLatin1Tables: latinTables.length,
    residualLatin1Columns: latinColumns.length,
    residualUtf8mb3Columns: utf8mb3Columns.length,
    repairedBannerNames: baseline.bannerRepairs.filter((repair) => repair.changed).length,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const modes = ['audit', 'apply', 'verify'].filter((mode) => args[mode] === true);
  if (modes.length !== 1) throw new Error('Choose exactly one of --audit, --apply, or --verify');
  const mode = modes[0];
  const database = required(args, 'expected-database');
  const includeRecovery = args['include-recovery'] === true;
  const directory = artifactDirectory(args);
  const connection = await pool.getConnection();
  let lockHeld = false;
  try {
    await selectExpectedDatabase(connection, database);
    if (mode === 'verify') {
      const baselineFile = path.resolve(required(args, 'baseline-plan'));
      const baseline = JSON.parse(await fs.readFile(baselineFile, 'utf8')) as CollationAudit;
      if (baseline.format !== 'web-tech-collation-plan-v1' || baseline.database !== database || baseline.includeRecovery !== includeRecovery) {
        throw new Error('Baseline does not match database/recovery scope');
      }
      if (calculateAuditPlanHash(baseline) !== baseline.planHash) throw new Error('Baseline plan hash is invalid');
      const result = await verifyDatabase(connection, database, baseline);
      await writeJson(path.join(directory, `${database}-${baseline.planHash}.verify.json`), result);
      console.log(JSON.stringify({ ...result, artifactDirectory: directory }, null, 2));
      return;
    }

    if (mode === 'audit') {
      const audit = await createAudit(connection, database, includeRecovery);
      const file = auditFile(directory, audit);
      await writeJson(file, audit);
      console.log(JSON.stringify({
        mode, database, includeRecovery, planHash: audit.planHash, auditFile: file,
        tables: audit.tables.length,
        convertTables: audit.tables.filter((table) => table.mode === 'convert').length,
        defaultOnlyTables: audit.tables.filter((table) => table.mode === 'default-only').length,
        latin1Columns: audit.tables.reduce((sum, table) => sum + table.latin1Columns, 0),
        utf8mb3Columns: audit.tables.reduce((sum, table) => sum + table.utf8mb3Columns, 0),
        bannerRows: audit.bannerRepairs.length,
        bannerRepairs: audit.bannerRepairs.filter((repair) => repair.changed).length,
        snapshot: audit.snapshot,
      }, null, 2));
      return;
    }

    if (process.env.ADMIN_WRITE_ENABLED !== 'true') throw new Error('ADMIN_WRITE_ENABLED=true is required for apply');
    if (required(args, 'confirm') !== COLLATION_CONFIRMATION) throw new Error(`--confirm=${COLLATION_CONFIRMATION} is required`);
    if (args['backup-confirmed'] !== true) throw new Error('--backup-confirmed is required');
    if (args['maintenance-window'] !== true) throw new Error('--maintenance-window is required');
    const expectedHash = required(args, 'expected-plan-hash');
    let audit: CollationAudit;
    let file: string;
    if (args['baseline-plan'] && args['baseline-plan'] !== true) {
      file = path.resolve(String(args['baseline-plan']));
      audit = JSON.parse(await fs.readFile(file, 'utf8')) as CollationAudit;
      if (audit.format !== 'web-tech-collation-plan-v1' || audit.database !== database || audit.includeRecovery !== includeRecovery) {
        throw new Error('Baseline does not match database/recovery scope');
      }
      if (calculateAuditPlanHash(audit) !== audit.planHash) throw new Error('Baseline plan hash is invalid');
    } else {
      audit = await createAudit(connection, database, includeRecovery);
      file = auditFile(directory, audit);
      await writeJson(file, audit);
    }
    if (audit.planHash !== expectedHash) throw new Error(`Plan hash mismatch: current=${audit.planHash} expected=${expectedHash}`);
    const lockName = advisoryLockName(database);
    const [locks] = await connection.query<RowDataPacket[]>('SELECT GET_LOCK(?,0) AS acquired', [lockName]);
    lockHeld = Number(locks[0]?.acquired) === 1;
    if (!lockHeld) throw new Error(`Another collation migration is running for ${database}`);
    const result = await applyAudit(connection, audit, directory);
    console.log(JSON.stringify({ ...result, auditFile: file, artifactDirectory: directory }, null, 2));
  } finally {
    if (lockHeld) await connection.query('SELECT RELEASE_LOCK(?)', [advisoryLockName(database)]).catch(() => undefined);
    connection.release();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(async () => pool.end());
