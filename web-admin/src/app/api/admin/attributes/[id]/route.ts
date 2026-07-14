import { AdminApiError, fail, ok, requireAdminWrite, toInt } from '@/lib/admin/common';
import { bulkAttributeAction, getAttribute, saveAttribute } from '@/lib/admin/attributes';

export async function GET(_request: Request, context: RouteContext<'/api/admin/attributes/[id]'>) {
  try {
    const { id } = await context.params;
    return ok(await getAttribute(toInt(id)));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request, context: RouteContext<'/api/admin/attributes/[id]'>) {
  try {
    await requireAdminWrite(request);
    const { id } = await context.params;
    return ok(await saveAttribute(await request.json().catch(() => ({})), toInt(id)), 'Da cap nhat thuoc tinh');
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request, context: RouteContext<'/api/admin/attributes/[id]'>) {
  try {
    await requireAdminWrite(request);
    const { id } = await context.params;
    const attributeId = toInt(id);
    const mode = new URL(request.url).searchParams.get('mode') || 'hide';
    if (mode !== 'permanent') throw new AdminApiError(400, 'BAD_REQUEST', 'Can xac nhan mode=permanent');
    return ok(await bulkAttributeAction([attributeId], 'delete-permanent'), 'Da xoa vinh vien thuoc tinh');
  } catch (error) {
    return fail(error);
  }
}
