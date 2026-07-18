import { fail, ok } from '@/lib/admin/common';
import { requireAdminPermission } from '@/lib/admin/auth';
import { getPcBuilderAdminDashboard } from '@/lib/pcBuilder/admin';

export async function GET(request: Request) {
  try { await requireAdminPermission(request, 'catalog.pc_builder.read'); return ok(await getPcBuilderAdminDashboard()); }
  catch (error) { return fail(error); }
}
