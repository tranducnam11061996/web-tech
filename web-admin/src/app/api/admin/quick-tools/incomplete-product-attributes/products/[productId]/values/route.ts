import { AdminApiError, fail, ok, requireAdminWrite } from '@/lib/admin/common';
import { replaceQuickProductAttributeValuesWithAudit } from '@/lib/admin/quickProductAttributes';

export async function PUT(
  request: Request,
  context: { params: Promise<{ productId: string }> },
) {
  try {
    const actor = await requireAdminWrite(request);
    const { productId } = await context.params;
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > 16 * 1024) {
      throw new AdminApiError(413, 'BAD_REQUEST', 'Payload autosave vượt quá 16 KB');
    }
    const body = (() => {
      try { return JSON.parse(rawBody); } catch { return {}; }
    })();
    const result = await replaceQuickProductAttributeValuesWithAudit(productId, body, { actorUserId: actor.id, request });
    return ok(result, result.changed ? 'Đã lưu thuộc tính' : 'Thuộc tính không thay đổi');
  } catch (error) {
    return fail(error);
  }
}
