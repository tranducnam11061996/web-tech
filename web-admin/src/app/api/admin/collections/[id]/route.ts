import { fail, ok, requireAdminWrite, toInt } from '@/lib/admin/common';
import { deleteCollection } from '@/lib/admin/services';

export async function DELETE(request: Request, context: RouteContext<'/api/admin/collections/[id]'>) {
  try {
    requireAdminWrite();
    const { id } = await context.params;
    const mode = new URL(request.url).searchParams.get('mode') || 'hide';
    return ok(await deleteCollection(toInt(id), mode), mode === 'permanent' ? 'Đã xóa vĩnh viễn bộ sưu tập' : 'Đã ẩn bộ sưu tập');
  } catch (error) {
    return fail(error);
  }
}
