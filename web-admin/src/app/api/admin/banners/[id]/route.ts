import { fail, ok, requireAdminWrite, toInt } from '@/lib/admin/common';
import { deleteBanner, getAdminBanner, saveAdminBanner } from '@/lib/admin/banners';

export async function GET(request: Request, context: RouteContext<'/api/admin/banners/[id]'>) {
  try {
    const { id } = await context.params;
    return ok(await getAdminBanner(toInt(id)));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request, context: RouteContext<'/api/admin/banners/[id]'>) {
  try {
    await requireAdminWrite(request);
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    return ok(await saveAdminBanner(body, toInt(id)), 'Đã lưu banner');
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request, context: RouteContext<'/api/admin/banners/[id]'>) {
  try {
    await requireAdminWrite(request);
    const { id } = await context.params;
    const mode = new URL(request.url).searchParams.get('mode') || 'hide';
    return ok(await deleteBanner(toInt(id), mode), mode === 'permanent' ? 'Đã xóa vĩnh viễn banner' : 'Đã ẩn banner');
  } catch (error) {
    return fail(error);
  }
}
