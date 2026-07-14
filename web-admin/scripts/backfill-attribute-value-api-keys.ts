import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import pool from '../src/lib/db';
import { createAttributeValueApiKey, isAttributeValueApiKey } from '../src/lib/attributeValueApiKey';

type ValueRow = RowDataPacket & {
  id: number;
  attributeId: number;
  value: string | null;
  api_key: string | null;
};

const APPLY_CONFIRMATION = 'BACKFILL_ATTRIBUTE_VALUE_API_KEYS';
const LOCK_NAME = 'web_admin:attribute_value_api_key_backfill';

function argument(name: string) {
  const prefix = `--${name}=`;
  return process.argv.slice(2).find((item) => item.startsWith(prefix))?.slice(prefix.length);
}

function hasFlag(name: string) {
  return process.argv.slice(2).includes(`--${name}`);
}

function analyze(rows: ValueRow[]) {
  const candidates = rows.filter((row) => !String(row.api_key || '').trim());
  const proposed = new Map<number, string>();
  const owners = new Map<string, number>();
  const blockers: string[] = [];

  for (const row of rows) {
    const existing = String(row.api_key || '').trim();
    const apiKey = existing || createAttributeValueApiKey(row.value);
    if (!isAttributeValueApiKey(apiKey)) {
      blockers.push(`value ${row.id} (${String(row.value || '')}) does not produce a valid ApiKey`);
      continue;
    }
    const ownerKey = `${Number(row.attributeId)}:${apiKey.toLowerCase()}`;
    const previousId = owners.get(ownerKey);
    if (previousId && previousId !== Number(row.id)) {
      blockers.push(`ApiKey collision in attribute ${row.attributeId}: values ${previousId} and ${row.id} -> ${apiKey}`);
      continue;
    }
    owners.set(ownerKey, Number(row.id));
    if (!existing) proposed.set(Number(row.id), apiKey);
  }

  return { candidates, proposed, blockers };
}

async function loadRows(connection: PoolConnection, lockRows: boolean) {
  const [rows] = await connection.query<ValueRow[]>(`
    SELECT id, attributeId, value, api_key
    FROM idv_attribute_value
    ORDER BY attributeId, id
    ${lockRows ? 'FOR UPDATE' : ''}
  `);
  return rows;
}

async function main() {
  const apply = hasFlag('apply');
  const expectedDatabase = argument('expected-database') || 'it_tech_db';
  const expectedUpdates = Number(argument('expected-updates') || 426);
  const connection = await pool.getConnection();
  let namedLock = false;

  try {
    const [databaseRows] = await connection.query<RowDataPacket[]>('SELECT DATABASE() AS name');
    const database = String(databaseRows[0]?.name || '');
    if (database !== expectedDatabase) throw new Error(`Refusing database ${database}; expected ${expectedDatabase}`);

    if (apply) {
      if (process.env.ADMIN_WRITE_ENABLED !== 'true') throw new Error('ADMIN_WRITE_ENABLED=true is required for --apply');
      if (argument('confirm') !== APPLY_CONFIRMATION) throw new Error(`--confirm=${APPLY_CONFIRMATION} is required for --apply`);
      if (!Number.isInteger(expectedUpdates) || expectedUpdates < 0) throw new Error('--expected-updates must be a non-negative integer');
      const [lockRows] = await connection.query<RowDataPacket[]>('SELECT GET_LOCK(?, 10) AS acquired', [LOCK_NAME]);
      namedLock = Number(lockRows[0]?.acquired) === 1;
      if (!namedLock) throw new Error('Could not acquire attribute ApiKey backfill lock');
      await connection.beginTransaction();
    }

    const rows = await loadRows(connection, apply);
    const report = analyze(rows);
    console.log(JSON.stringify({
      mode: apply ? 'apply' : 'dry-run',
      database,
      totalValues: rows.length,
      blankApiKeys: report.candidates.length,
      proposedUpdates: report.proposed.size,
      blockers: report.blockers,
      samples: report.candidates.slice(0, 10).map((row) => ({
        id: Number(row.id), attributeId: Number(row.attributeId), value: String(row.value || ''), apiKey: report.proposed.get(Number(row.id)),
      })),
    }, null, 2));

    if (report.blockers.length) throw new Error(`Backfill blocked by ${report.blockers.length} validation error(s)`);
    if (!apply) return;
    if (report.proposed.size !== expectedUpdates) {
      throw new Error(`Refusing ${report.proposed.size} updates; expected ${expectedUpdates}`);
    }

    for (const [id, apiKey] of report.proposed) {
      const [result] = await connection.query(
        "UPDATE idv_attribute_value SET api_key = ? WHERE id = ? AND TRIM(COALESCE(api_key, '')) = ''",
        [apiKey, id],
      );
      if ('affectedRows' in result && Number(result.affectedRows) !== 1) throw new Error(`Concurrent update detected for value ${id}`);
    }
    for (const key of ['public_products', 'public_catalog_details', 'catalog', 'search']) {
      await connection.query(
        'INSERT INTO web_admin_cache_versions(cache_key,version) VALUES(?,2) ON DUPLICATE KEY UPDATE version=version+1',
        [key],
      );
    }

    const verified = analyze(await loadRows(connection, false));
    if (verified.candidates.length || verified.blockers.length) throw new Error('Post-update ApiKey verification failed');
    await connection.commit();
    console.log(JSON.stringify({ applied: report.proposed.size, remainingBlankApiKeys: 0, database }, null, 2));
  } catch (error) {
    if (apply) await connection.rollback();
    throw error;
  } finally {
    if (namedLock) await connection.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]).catch(() => undefined);
    connection.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
