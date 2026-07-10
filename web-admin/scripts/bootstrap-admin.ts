import { createAdminUser, ensureAdminAccessTables, type AdminSessionUser } from '../src/lib/admin/auth';
import pool from '../src/lib/db';

function argument(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : '';
}

const email = argument('email');
const password = argument('password');
const name = argument('name') || 'Bootstrap Superadmin';

if (!email || !password) {
  console.error('Usage: npm run admin:bootstrap -- --email admin@example.com --password "minimum-12-chars" [--name "Admin"]');
  process.exitCode = 1;
} else {
  const bootstrapActor: AdminSessionUser = { id: 0, email: 'bootstrap@local', name: 'Bootstrap', role: 'superadmin', permissions: ['*'], mustChangePassword: false };
  ensureAdminAccessTables()
    .then(() => createAdminUser({ email, password, name, role: 'superadmin' }, bootstrapActor))
    .then((result) => console.log(`[admin:bootstrap] Created superadmin #${result.id}.`))
    .catch((error) => {
      console.error('[admin:bootstrap] Failed:', error instanceof Error ? error.message : error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end();
    });
}
