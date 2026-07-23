import { fail, ok, requireAdminWrite, toInt } from '@/lib/admin/common';
import { getAdminBrand, updateAdminBrand } from '@/lib/admin/brands';
import { deleteBrand } from '@/lib/admin/services';

export async function GET(_request: Request, context: RouteContext<'/api/admin/brands/[id]'>) {
  try {
    const { id } = await context.params;
    return ok(await getAdminBrand(toInt(id)));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request, context: RouteContext<'/api/admin/brands/[id]'>) {
  try {
    await requireAdminWrite(request);
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    return ok(await updateAdminBrand(toInt(id), body), 'Da cap nhat thuong hieu');
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request, context: RouteContext<'/api/admin/brands/[id]'>) {
  try {
    await requireAdminWrite(request);
    const { id } = await context.params;
    const mode = new URL(request.url).searchParams.get('mode') || 'hide';
    return ok(await deleteBrand(toInt(id), mode), mode === 'permanent' ? 'Đã xóa vĩnh viễn thương hiệu' : 'Đã ẩn thương hiệu');
  } catch (error) {
    return fail(error);
  }
}
