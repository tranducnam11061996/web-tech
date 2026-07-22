import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import type { RowDataPacket } from 'mysql2/promise';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const REVISION = 'banner-location-unassigned-v1';

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
  if (!['apply', 'verify', 'rollback'].includes(mode)) throw new Error('Mode must be apply, verify or rollback.');
  const database = String(input.get('database') || '');
  if (!(database === 'it_tech_db' || /^it_tech_db_(?:banner_location_clone_\d{8,14}|backup_test_\d+_[a-f0-9]+)$/.test(database))) {
    throw new Error('Database must be it_tech_db or a restore-verified banner-location clone.');
  }
  const backupSha256 = String(input.get('backup-sha256') || '').toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(backupSha256) || String(process.env.BANNER_LOCATION_RESTORE_VERIFIED_SHA256 || '').toLowerCase() !== backupSha256) {
    throw new Error('A matching restore-verified backup SHA-256 is required.');
  }
  if (mode !== 'verify') {
    if (process.env.ADMIN_WRITE_ENABLED !== 'true') throw new Error('ADMIN_WRITE_ENABLED must be true for apply or rollback.');
    const expected = String(process.env.BANNER_LOCATION_MIGRATION_CONFIRMATION_TOKEN || '');
    const supplied = String(process.env.BANNER_LOCATION_MIGRATION_CONFIRMATION_INPUT || '');
    if (!expected || expected.length < 32 || supplied !== expected) throw new Error('Banner-location migration confirmation token mismatch.');
  }
  return { mode, database, backupSha256 };
}

async function main() {
  const selected = guard(argumentsMap());
  const databaseUrl = new URL(String(process.env.DATABASE_URL || ''));
  databaseUrl.pathname = `/${selected.database}`;
  process.env.DATABASE_URL = databaseUrl.toString();
  const db = (await import('../src/lib/db')).default;
  try {
    const connection = await db.getConnection();
    try {
      const [connected] = await connection.query<RowDataPacket[]>('SELECT DATABASE() AS database_name');
      if (String(connected[0]?.database_name || '') !== selected.database) throw new Error('Connected database does not match --database.');
      const [lockRows] = await connection.query<RowDataPacket[]>("SELECT GET_LOCK('web_admin_banner_location_migration', 10) AS acquired");
      if (Number(lockRows[0]?.acquired || 0) !== 1) throw new Error('Could not acquire the banner-location migration lock.');
      try {
        const infrastructure = await import('../src/lib/admin/banners');
        if (selected.mode === 'apply') {
          await infrastructure.ensureBannerLocationInfrastructure(connection);
        } else if (selected.mode === 'rollback') {
          const [modeRows] = await connection.query<RowDataPacket[]>('SELECT @@SESSION.sql_mode AS sql_mode');
          const originalSqlMode = String(modeRows[0]?.sql_mode || '');
          const migrationSqlMode = originalSqlMode.split(',').filter((mode) => mode !== 'NO_ZERO_DATE' && mode !== 'NO_ZERO_IN_DATE').join(',');
          await connection.query('SET SESSION sql_mode = ?', [migrationSqlMode]);
          try {
            const [defaultRows] = await connection.query<RowDataPacket[]>(
              'SELECT id FROM idv_seller_ad_location WHERE index_key = ? LIMIT 1',
              [infrastructure.DEFAULT_BANNER_LOCATION_KEY],
            );
            const defaultLocationId = Number(defaultRows[0]?.id || 0);
            if (defaultLocationId) {
              const [bannerRows] = await connection.query<RowDataPacket[]>('SELECT COUNT(*) AS total FROM idv_seller_ad WHERE location = ?', [defaultLocationId]);
              if (Number(bannerRows[0]?.total || 0) > 0) throw new Error('Hard rollback is forbidden after banners have been assigned to the default location.');
              await connection.query('DELETE FROM idv_seller_ad_location WHERE id = ?', [defaultLocationId]);
            }
            const [indexRows] = await connection.query<RowDataPacket[]>(`
              SELECT INDEX_NAME FROM information_schema.STATISTICS
              WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'idv_seller_ad_location' AND INDEX_NAME = ?
            `, [infrastructure.BANNER_LOCATION_KEY_UNIQUE_INDEX]);
            if (indexRows.length > 0) {
              await connection.query(`ALTER TABLE idv_seller_ad_location DROP INDEX ${infrastructure.BANNER_LOCATION_KEY_UNIQUE_INDEX}`);
            }
          } finally {
            await connection.query('SET SESSION sql_mode = ?', [originalSqlMode]);
          }
        }

        const result = selected.mode === 'rollback'
          ? { rolledBack: true }
          : await infrastructure.verifyBannerLocationInfrastructure(connection);
        const artifact = {
          revision: REVISION,
          mode: selected.mode,
          database: selected.database,
          backupSha256: selected.backupSha256,
          result,
          completedAt: new Date().toISOString(),
          planHash: createHash('sha256').update(JSON.stringify({ revision: REVISION, defaultKey: 'unassigned' })).digest('hex'),
        };
        const directory = path.resolve(process.cwd(), 'var', 'migrations', 'banner-locations');
        fs.mkdirSync(directory, { recursive: true });
        const artifactPath = path.join(directory, `${Date.now()}-${selected.mode}.json`);
        fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2), { encoding: 'utf8', mode: 0o600 });
        process.stdout.write(`${JSON.stringify({ success: true, artifactPath, ...artifact })}\n`);
      } finally {
        await connection.query("SELECT RELEASE_LOCK('web_admin_banner_location_migration')");
      }
    } finally {
      connection.release();
    }
  } finally {
    await db.end();
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});
