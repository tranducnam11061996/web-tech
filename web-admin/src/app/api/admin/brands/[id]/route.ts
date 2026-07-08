import { fail, ok, requireAdminWrite, toInt } from '@/lib/admin/common';
import { deleteBrand } from '@/lib/admin/services';

export async function DELETE(request: Request, context: RouteContext<'/api/admin/brands/[id]'>) {
  try {
    requireAdminWrite();
    const { id } = await context.params;
    const mode = new URL(request.url).searchParams.get('mode') || 'hide';
    return ok(await deleteBrand(toInt(id), mode), mode === 'permanent' ? 'Đã xóa vĩnh viễn thương hiệu' : 'Đã ẩn thương hiệu');
  } catch (error) {
    return fail(error);
  }
}
