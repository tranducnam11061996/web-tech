import pool from '../src/lib/db';
import { ensureAdminTables, requireAdminWrite } from '../src/lib/admin/common';
import { ensureProductImageTable } from '../src/lib/admin/images';
import { ensureHeaderMenuSeeded } from '../src/lib/admin/menus';

async function main() {
  requireAdminWrite();
  await ensureAdminTables();
  await ensureProductImageTable();
  await ensureHeaderMenuSeeded();
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
