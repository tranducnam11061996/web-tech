import { ensureAdminAccessTables } from '../src/lib/admin/auth';
import pool from '../src/lib/db';

ensureAdminAccessTables()
  .then(() => console.log('[admin:access-migrate] Admin access tables are ready.'))
  .catch((error) => {
    console.error('[admin:access-migrate] Failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
