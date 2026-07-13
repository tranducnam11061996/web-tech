import crypto from 'node:crypto';

export const COLLATION_TARGET_CHARSET = 'utf8mb4';
export const COLLATION_TARGET = 'utf8mb4_unicode_ci';
export const COLLATION_SOURCE = 'latin1_swedish_ci';
export const COLLATION_CONFIRMATION = 'CONVERT_LATIN1_TO_UTF8MB4';
export const COLLATION_RECOVERY_PREFIX = 'web_admin_import_b_';

export type CollationMigrationTable = {
  name: string;
  engine: string;
  tableCollation: string;
  rowCount: number;
  dataLength: number;
  indexLength: number;
  characterColumns: number;
  latin1Columns: number;
  utf8mb3Columns: number;
  indexCount: number;
  uniqueIndexCount: number;
  fulltextIndexCount: number;
  createHash: string;
  indexHash: string;
  indexStructureHash: string;
  mode: 'convert' | 'default-only';
  ddl: string;
  priority: number;
};

export type BannerNameRepair = {
  id: number;
  currentText: string;
  originalHex: string;
  repairedText: string;
  repairedHex: string;
  changed: boolean;
};

export function quoteSqlIdentifier(identifier: string) {
  if (!/^[a-zA-Z0-9_]+$/.test(identifier)) throw new Error(`Unsafe SQL identifier: ${identifier}`);
  return `\`${identifier}\``;
}

export function isCollationRecoveryTable(tableName: string) {
  return tableName.startsWith(COLLATION_RECOVERY_PREFIX);
}

export function buildCollationDdl(input: {
  tableName: string;
  tableCollation: string;
  latin1Columns: number;
  utf8mb3Columns: number;
}) {
  const table = quoteSqlIdentifier(input.tableName);
  const mode: CollationMigrationTable['mode'] = input.latin1Columns > 0 || input.utf8mb3Columns > 0
    ? 'convert'
    : 'default-only';
  const ddl = mode === 'convert'
    ? `ALTER TABLE ${table} CONVERT TO CHARACTER SET ${COLLATION_TARGET_CHARSET} COLLATE ${COLLATION_TARGET}`
    : `ALTER TABLE ${table} DEFAULT CHARACTER SET ${COLLATION_TARGET_CHARSET} COLLATE ${COLLATION_TARGET}`;
  return { mode, ddl };
}

export function collationMigrationPriority(table: {
  name: string;
  engine: string;
  rowCount: number;
  mode: CollationMigrationTable['mode'];
  uniqueIndexCount: number;
  fulltextIndexCount: number;
  latin1Columns: number;
}) {
  if (table.name === 'idv_seller_ad_location') return 60;
  if (table.mode === 'default-only') return 0;
  if (table.rowCount === 0) return 10;
  if (table.engine.toLowerCase() === 'myisam') return 20;
  if (table.uniqueIndexCount > 0 || table.fulltextIndexCount > 0) return 40;
  if (table.latin1Columns > 0) return 50;
  return 30;
}

export function sortCollationTables<T extends Pick<CollationMigrationTable, 'name' | 'priority' | 'dataLength' | 'indexLength'>>(tables: T[]) {
  return [...tables].sort((left, right) =>
    left.priority - right.priority
    || (left.dataLength + left.indexLength) - (right.dataLength + right.indexLength)
    || left.name.localeCompare(right.name));
}

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value: string | Buffer) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function buildCollationPlanHash(value: unknown) {
  return sha256(stableJson(value));
}

export function repairUtf8BytesStoredAsLatin1(input: { id: number; currentText: string; originalHex: string }): BannerNameRepair {
  const originalHex = input.originalHex.toUpperCase();
  if (!/^(?:[0-9A-F]{2})*$/.test(originalHex)) throw new Error(`Invalid hex payload for banner ${input.id}`);
  const bytes = Buffer.from(originalHex, 'hex');
  const repairedText = bytes.toString('utf8');
  const repairedHex = Buffer.from(repairedText, 'utf8').toString('hex').toUpperCase();
  if (repairedHex !== originalHex || repairedText.includes('\uFFFD')) {
    throw new Error(`Banner ${input.id} is not a valid UTF-8 byte sequence`);
  }
  return {
    id: input.id,
    currentText: input.currentText,
    originalHex,
    repairedText,
    repairedHex,
    changed: repairedText !== input.currentText,
  };
}
