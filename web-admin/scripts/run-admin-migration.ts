import pool from '../src/lib/db';
import { ensureAdminTables, requireAdminWrite } from '../src/lib/admin/common';
import { ensureProductImageTable } from '../src/lib/admin/images';
import { ensureHeaderMenuSeeded } from '../src/lib/admin/menus';
import { ensureBannerMetaTable } from '../src/lib/admin/banners';
import { ensureProductCardAttributeRulesTable } from '../src/lib/productCardAttributes';

async function main() {
  requireAdminWrite();
  await ensureAdminTables();
  await ensureProductImageTable();
  await ensureHeaderMenuSeeded();
  await ensureBannerMetaTable();
  await ensureProductCardAttributeRulesTable();
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
