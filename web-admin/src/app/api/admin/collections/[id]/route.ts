import { fail, ok, requireAdminWrite, toInt } from '@/lib/admin/common';
import { deleteSpecialCollection, getSpecialCollection, saveSpecialCollection } from '@/lib/admin/special-collections';

export async function GET(_request: Request, context: RouteContext<'/api/admin/collections/[id]'>) {
  try {
    const { id } = await context.params;
    return ok(await getSpecialCollection(toInt(id)));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request, context: RouteContext<'/api/admin/collections/[id]'>) {
  try {
    await requireAdminWrite(request);
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    return ok(await saveSpecialCollection(body, toInt(id)), 'Da cap nhat bo suu tap');
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request, context: RouteContext<'/api/admin/collections/[id]'>) {
  try {
    await requireAdminWrite(request);
    const { id } = await context.params;
    return ok(await deleteSpecialCollection(toInt(id)), 'Da xoa vinh vien bo suu tap');
  } catch (error) {
    return fail(error);
  }
}
