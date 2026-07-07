import { fail, ok, requireAdminWrite, toInt } from '@/lib/admin/common';
import { deleteProduct, getProduct, saveProduct } from '@/lib/admin/services';

export async function GET(_request: Request, context: RouteContext<'/api/admin/products/[id]'>) {
  try {
    const { id } = await context.params;
    return ok(await getProduct(toInt(id)));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request, context: RouteContext<'/api/admin/products/[id]'>) {
  try {
    requireAdminWrite();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    return ok(await saveProduct(body, toInt(id)), 'Cap nhat san pham thanh cong');
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request, context: RouteContext<'/api/admin/products/[id]'>) {
  try {
    requireAdminWrite();
    const { id } = await context.params;
    const mode = new URL(request.url).searchParams.get('mode') || 'hide';
    return ok(await deleteProduct(toInt(id), mode), mode === 'permanent' ? 'Da xoa vinh vien' : 'Da an san pham');
  } catch (error) {
    return fail(error);
  }
}

