import { fail, ok, requireAdminWrite } from '@/lib/admin/common';
import { requireAdminSession } from '@/lib/admin/auth';
import { listComboSetCatalogFromRequest } from '@/lib/admin/services';
import { saveAdminComboSet } from '@/lib/comboSets';

export async function GET(request: Request) {
  try {
    return ok(await listComboSetCatalogFromRequest(request.url));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminWrite(request);
    const actor = await requireAdminSession(request);
    const body = await request.json().catch(() => ({}));
    return ok(await saveAdminComboSet(body, actor.name || actor.email || 'Admin'), 'Đã tạo combo set');
  } catch (error) {
    return fail(error);
  }
}
