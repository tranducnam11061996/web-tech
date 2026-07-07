import { fail, ok, requireAdminWrite } from '@/lib/admin/common';
import { runAdminMigration } from '@/lib/admin/services';

export async function POST() {
  try {
    requireAdminWrite();
    return ok(await runAdminMigration(), 'Migration admin da chay');
  } catch (error) {
    return fail(error);
  }
}

