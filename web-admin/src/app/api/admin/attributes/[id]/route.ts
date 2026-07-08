import { fail, ok, requireAdminWrite, toInt } from '@/lib/admin/common';
import { deleteAttribute } from '@/lib/admin/services';

export async function DELETE(request: Request, context: RouteContext<'/api/admin/attributes/[id]'>) {
  try {
    requireAdminWrite();
    const { id } = await context.params;
    const mode = new URL(request.url).searchParams.get('mode') || 'hide';
    return ok(await deleteAttribute(toInt(id), mode), mode === 'permanent' ? 'Đã xóa vĩnh viễn thuộc tính' : 'Đã ẩn thuộc tính');
  } catch (error) {
    return fail(error);
  }
}
