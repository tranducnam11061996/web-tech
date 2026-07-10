import { fail, ok, requireAdminWrite, toInt } from '@/lib/admin/common';
import { saveBannerLocation } from '@/lib/admin/banners';

export async function PATCH(request: Request, context: RouteContext<'/api/admin/banner-locations/[id]'>) {
  try {
    await requireAdminWrite(request);
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    return ok(await saveBannerLocation(body, toInt(id)), 'Đã lưu vị trí banner');
  } catch (error) {
    return fail(error);
  }
}
