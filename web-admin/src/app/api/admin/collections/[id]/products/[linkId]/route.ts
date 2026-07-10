import { fail, ok, requireAdminWrite, toInt } from '@/lib/admin/common';
import { deleteSpecialCollectionProduct, updateSpecialCollectionProduct } from '@/lib/admin/special-collections';

export async function PATCH(request: Request, context: RouteContext<'/api/admin/collections/[id]/products/[linkId]'>) {
  try {
    requireAdminWrite();
    const { id, linkId } = await context.params;
    const body = await request.json().catch(() => ({}));
    return ok(await updateSpecialCollectionProduct(toInt(id), toInt(linkId), body), 'Da cap nhat thu tu san pham');
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext<'/api/admin/collections/[id]/products/[linkId]'>) {
  try {
    requireAdminWrite();
    const { id, linkId } = await context.params;
    return ok(await deleteSpecialCollectionProduct(toInt(id), toInt(linkId)), 'Da xoa san pham khoi bo suu tap');
  } catch (error) {
    return fail(error);
  }
}
