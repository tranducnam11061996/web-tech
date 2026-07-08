import { fail, ok, requireAdminWrite, toInt } from '@/lib/admin/common';
import { deleteComboSet } from '@/lib/admin/services';

export async function DELETE(request: Request, context: RouteContext<'/api/admin/combo-sets/[id]'>) {
  try {
    requireAdminWrite();
    const { id } = await context.params;
    const mode = new URL(request.url).searchParams.get('mode') || 'hide';
    return ok(await deleteComboSet(toInt(id), mode), mode === 'permanent' ? 'Đã xóa vĩnh viễn combo set' : 'Đã ẩn combo set');
  } catch (error) {
    return fail(error);
  }
}
