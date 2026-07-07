import pool from '../src/lib/db';
import { ensureAdminTables, requireAdminWrite } from '../src/lib/admin/common';

async function main() {
  requireAdminWrite();
  await ensureAdminTables();
  console.log('Admin migration completed.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
