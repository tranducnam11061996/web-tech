import { fail, ok, requireAdminWrite, toInt } from '@/lib/admin/common';
import { requireAdminSession } from '@/lib/admin/auth';
import { deleteComboSet } from '@/lib/admin/services';
import { getAdminComboSet, saveAdminComboSet } from '@/lib/comboSets';

export async function GET(_request: Request, context: RouteContext<'/api/admin/combo-sets/[id]'>) {
  try {
    const { id } = await context.params;
    return ok(await getAdminComboSet(toInt(id)));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request, context: RouteContext<'/api/admin/combo-sets/[id]'>) {
  try {
    await requireAdminWrite(request);
    const actor = await requireAdminSession(request);
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    return ok(await saveAdminComboSet(body, actor.name || actor.email || 'Admin', toInt(id)), 'Đã cập nhật combo set');
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request, context: RouteContext<'/api/admin/combo-sets/[id]'>) {
  try {
    await requireAdminWrite(request);
    const { id } = await context.params;
    const mode = new URL(request.url).searchParams.get('mode') || 'hide';
    return ok(await deleteComboSet(toInt(id), mode), mode === 'permanent' ? 'Đã xóa vĩnh viễn combo set' : 'Đã ẩn combo set');
  } catch (error) {
    return fail(error);
  }
}
