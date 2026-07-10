import { fail, ok, requireAdminWrite, toInt } from '@/lib/admin/common';
import { addProductToComboSet, listProductComboSets } from '@/lib/admin/services';

type ProductComboRouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: ProductComboRouteContext) {
  try {
    const { id } = await context.params;
    return ok({ items: await listProductComboSets(toInt(id)) });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request, context: ProductComboRouteContext) {
  try {
    await requireAdminWrite(request);
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    return ok(await addProductToComboSet(toInt(id), toInt(body?.setId)), 'Da them san pham vao combo set');
  } catch (error) {
    return fail(error);
  }
}
