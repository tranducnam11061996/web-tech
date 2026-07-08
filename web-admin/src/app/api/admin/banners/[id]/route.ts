import { fail, ok, requireAdminWrite, toInt } from '@/lib/admin/common';
import { deleteBanner } from '@/lib/admin/services';

export async function DELETE(request: Request, context: RouteContext<'/api/admin/banners/[id]'>) {
  try {
    requireAdminWrite();
    const { id } = await context.params;
    const mode = new URL(request.url).searchParams.get('mode') || 'hide';
    return ok(await deleteBanner(toInt(id), mode), mode === 'permanent' ? 'Đã xóa vĩnh viễn banner' : 'Đã ẩn banner');
  } catch (error) {
    return fail(error);
  }
}
