import { fail, ok, requireAdminWrite, toInt } from '@/lib/admin/common';
import { deleteProductGroup } from '@/lib/admin/services';

export async function DELETE(request: Request, context: RouteContext<'/api/admin/product-groups/[id]'>) {
  try {
    requireAdminWrite();
    const { id } = await context.params;
    const mode = new URL(request.url).searchParams.get('mode') || 'hide';
    return ok(await deleteProductGroup(toInt(id), mode), mode === 'permanent' ? 'Đã xóa vĩnh viễn nhóm sản phẩm' : 'Đã ẩn nhóm sản phẩm');
  } catch (error) {
    return fail(error);
  }
}
