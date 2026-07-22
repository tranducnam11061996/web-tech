import { fail, ok, requireAdminWrite, toInt } from '@/lib/admin/common';
import { writeAdminAudit } from '@/lib/admin/auth';
import { deleteBannerLocation, saveBannerLocation } from '@/lib/admin/banners';

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

export async function DELETE(request: Request, context: RouteContext<'/api/admin/banner-locations/[id]'>) {
  try {
    const actor = await requireAdminWrite(request);
    const { id } = await context.params;
    const deleted = await deleteBannerLocation(toInt(id));
    await writeAdminAudit({
      actorUserId: actor.id,
      action: 'banner_location.deleted',
      resource: 'marketing.banner_locations',
      resourceId: deleted.id,
      request,
      metadata: {
        deletedLocationKey: deleted.deletedLocationKey,
        reassignedBannerCount: deleted.reassignedBannerCount,
        defaultLocationId: deleted.defaultLocation.id,
      },
    });
    return ok(deleted, 'Đã xóa vị trí banner');
  } catch (error) {
    return fail(error);
  }
}
