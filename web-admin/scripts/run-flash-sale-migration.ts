import type { RowDataPacket } from 'mysql2/promise';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const TABLES = [
  'web_admin_flash_sale_campaigns',
  'web_admin_flash_sale_items',
  'web_admin_flash_sale_allocations',
  'web_admin_flash_sale_buyer_usage',
] as const;

function argumentsMap() {
  const values = new Map<string, string>();
  for (let index = 2; index < process.argv.length; index += 1) {
    const token = process.argv[index];
    if (!token.startsWith('--')) continue;
    const [key, inline] = token.slice(2).split('=', 2);
    const next = process.argv[index + 1];
    if (inline !== undefined) values.set(key, inline);
    else if (next && !next.startsWith('--')) { values.set(key, next); index += 1; }
    else values.set(key, 'true');
  }
  return values;
}

function guard(input: Map<string, string>) {
  const mode = input.get('mode') || 'verify';
  if (mode !== 'verify' && mode !== 'apply') throw new Error('Mode must be verify or apply.');
  const database = String(input.get('database') || '');
  if (!(database === 'it_tech_db' || /^it_tech_db_flash_sale_clone_\d{8,14}$/.test(database))) {
    throw new Error('Database must be it_tech_db or a named Flash Sale rehearsal clone.');
  }
  if (mode === 'apply') {
    if (process.env.ADMIN_WRITE_ENABLED !== 'true') throw new Error('ADMIN_WRITE_ENABLED must be true for apply.');
    const backupSha256 = String(input.get('backup-sha256') || '').toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(backupSha256)) throw new Error('A restore-verified backup SHA-256 is required for apply.');
    if (String(process.env.FLASH_SALE_RESTORE_VERIFIED_SHA256 || '').toLowerCase() !== backupSha256) {
      throw new Error('FLASH_SALE_RESTORE_VERIFIED_SHA256 does not match --backup-sha256.');
    }
    const expected = String(process.env.FLASH_SALE_MIGRATION_CONFIRMATION_TOKEN || '');
    const supplied = String(process.env.FLASH_SALE_MIGRATION_CONFIRMATION_INPUT || '');
    if (!expected || expected.length < 32 || supplied !== expected) throw new Error('Flash Sale migration confirmation token mismatch.');
  }
  return { mode, database };
}

function permissionSet(value: unknown) {
  if (Array.isArray(value)) return new Set(value.map(String));
  try {
    const parsed = JSON.parse(String(value || '[]'));
    return new Set(Array.isArray(parsed) ? parsed.map(String) : []);
  } catch {
    return new Set<string>();
  }
}

async function verify(pool: typeof import('../src/lib/db').default) {
  const [tables] = await pool.query<RowDataPacket[]>(`SELECT TABLE_NAME table_name,ENGINE engine,TABLE_COLLATION table_collation
    FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name IN (?) ORDER BY table_name`, [TABLES]);
  const present = new Set(tables.map((row) => String(row.table_name)));
  const missing = TABLES.filter((table) => !present.has(table));
  if (missing.length) throw new Error(`Missing Flash Sale tables: ${missing.join(', ')}`);
  if (tables.some((row) => String(row.engine).toLowerCase() !== 'innodb' || String(row.table_collation) !== 'utf8mb4_unicode_ci')) {
    throw new Error('Every Flash Sale table must use InnoDB and utf8mb4_unicode_ci.');
  }
  const [[foreignKeys], [counterColumns], [indexes], [roleRows]] = await Promise.all([
    pool.query<RowDataPacket[]>(`SELECT COUNT(*) total FROM information_schema.referential_constraints
      WHERE constraint_schema=DATABASE() AND table_name IN (?)`, [TABLES]),
    pool.query<RowDataPacket[]>(`SELECT COUNT(*) total FROM information_schema.columns WHERE table_schema=DATABASE()
      AND table_name='web_admin_flash_sale_items' AND column_name IN ('quota_total','quota_reserved','quota_sold')`),
    pool.query<RowDataPacket[]>(`SELECT COUNT(DISTINCT index_name) total FROM information_schema.statistics WHERE table_schema=DATABASE()
      AND table_name IN (?) AND index_name IN ('idx_web_admin_flash_sale_state_time','idx_web_admin_flash_sale_item_product_lookup','idx_web_admin_flash_sale_allocation_item_state')`, [TABLES]),
    pool.query<RowDataPacket[]>(`SELECT code,permissions FROM admin_roles WHERE code IN ('marketing_manager','viewer')`),
  ]);
  if (Number(foreignKeys[0]?.total || 0) !== 4) throw new Error('Flash Sale foreign-key contract is incomplete.');
  if (Number(counterColumns[0]?.total || 0) !== 3) throw new Error('Flash Sale quota counters are incomplete.');
  if (Number(indexes[0]?.total || 0) !== 3) throw new Error('Flash Sale hot-path indexes are incomplete.');
  const rolePermissions = new Map(roleRows.map((row) => [String(row.code), permissionSet(row.permissions)]));
  const marketingPermissions = rolePermissions.get('marketing_manager');
  if (!marketingPermissions || !['read','create','update','delete','publish'].every((action) => marketingPermissions.has(`marketing.flash_sales.${action}`))) {
    throw new Error('Marketing manager Flash Sale permissions are incomplete.');
  }
  if (!rolePermissions.get('viewer')?.has('marketing.flash_sales.read')) throw new Error('Viewer Flash Sale read permission is missing.');
  return { tableCount: tables.length, foreignKeyCount: 4, quotaCounterCount: 3, hotPathIndexCount: 3, roleContract: 'verified' };
}

async function main() {
  const selected = guard(argumentsMap());
  const databaseUrl = new URL(String(process.env.DATABASE_URL || ''));
  databaseUrl.pathname = `/${selected.database}`;
  process.env.DATABASE_URL = databaseUrl.toString();
  const pool = (await import('../src/lib/db')).default;
  try {
    const [databaseRows] = await pool.query<RowDataPacket[]>('SELECT DATABASE() database_name');
    if (String(databaseRows[0]?.database_name || '') !== selected.database) throw new Error('Connected database does not match --database.');
    if (selected.mode === 'apply') {
      const [lockRows] = await pool.query<RowDataPacket[]>("SELECT GET_LOCK('web_admin_flash_sale_migration',10) acquired");
      if (Number(lockRows[0]?.acquired || 0) !== 1) throw new Error('Could not acquire the Flash Sale migration lock.');
      try {
        const { ensureFlashSaleTables } = await import('../src/lib/flashSales');
        await ensureFlashSaleTables(pool);
        for (const [roleCode, permissions] of [
          ['marketing_manager', ['marketing.flash_sales.read', 'marketing.flash_sales.create', 'marketing.flash_sales.update', 'marketing.flash_sales.delete', 'marketing.flash_sales.publish']],
          ['viewer', ['marketing.flash_sales.read']],
        ] as const) {
          for (const permission of permissions) {
            await pool.query(`UPDATE admin_roles SET permissions=JSON_ARRAY_APPEND(permissions,'$',?)
              WHERE code=? AND JSON_CONTAINS(permissions,JSON_QUOTE(?))=0`, [permission, roleCode, permission]);
          }
        }
      } finally {
        await pool.query("SELECT RELEASE_LOCK('web_admin_flash_sale_migration')");
      }
    }
    const result = await verify(pool);
    process.stdout.write(`${JSON.stringify({ success: true, mode: selected.mode, database: selected.database, result })}\n`);
  } finally {
    await pool.end();
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
