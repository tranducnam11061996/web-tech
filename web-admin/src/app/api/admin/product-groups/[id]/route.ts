import { fail, ok, requireAdminWrite, toInt } from '@/lib/admin/common';
import { requireAdminSession } from '@/lib/admin/auth';
import { deleteProductGroupPermanently, getAdminProductGroup, saveProductGroup } from '@/lib/productGroups';

export async function GET(_request: Request, context: RouteContext<'/api/admin/product-groups/[id]'>) {
  try {
    const { id } = await context.params;
    return ok(await getAdminProductGroup(toInt(id)));
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(request: Request, context: RouteContext<'/api/admin/product-groups/[id]'>) {
  try {
    await requireAdminWrite(request);
    const actor = await requireAdminSession(request);
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    return ok(await saveProductGroup(body, actor.name || actor.email || 'Admin', toInt(id)), 'Đã cập nhật group sản phẩm');
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request, context: RouteContext<'/api/admin/product-groups/[id]'>) {
  try {
    await requireAdminWrite(request);
    const { id } = await context.params;
    return ok(await deleteProductGroupPermanently(toInt(id)), 'Đã xóa vĩnh viễn group sản phẩm');
  } catch (error) {
    return fail(error);
  }
}
