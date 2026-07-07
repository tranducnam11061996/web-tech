import { fail, ok, requireAdminWrite, toInt } from '@/lib/admin/common';
import { deleteCategory, getProductCategory, saveProductCategory } from '@/lib/admin/services';

export async function GET(_request: Request, context: RouteContext<'/api/admin/product-categories/[id]'>) {
  try {
    const { id } = await context.params;
    return ok(await getProductCategory(toInt(id)));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request, context: RouteContext<'/api/admin/product-categories/[id]'>) {
  try {
    requireAdminWrite();
    const { id } = await context.params;
    return ok(await saveProductCategory(await request.json().catch(() => ({})), toInt(id)), 'Cap nhat danh muc thanh cong');
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request, context: RouteContext<'/api/admin/product-categories/[id]'>) {
  try {
    requireAdminWrite();
    const { id } = await context.params;
    const mode = new URL(request.url).searchParams.get('mode') || 'hide';
    return ok(await deleteCategory('product-category', 'idv_seller_category', toInt(id), mode), mode === 'permanent' ? 'Da xoa vinh vien' : 'Da an danh muc');
  } catch (error) {
    return fail(error);
  }
}

