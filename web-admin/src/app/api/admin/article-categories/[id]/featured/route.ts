import { fail, ok, requireAdminWrite, toInt } from '@/lib/admin/common';
import { setArticleCategoryFeatured } from '@/lib/admin/services';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminWrite(request);
    const { id } = await context.params;
    const payload = await request.json().catch(() => ({}));
    return ok(
      await setArticleCategoryFeatured(toInt(id), payload.isFeatured),
      'Cap nhat noi bat danh muc bai viet thanh cong',
    );
  } catch (error) {
    return fail(error);
  }
}
