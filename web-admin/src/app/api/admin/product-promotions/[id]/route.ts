import { fail, ok, requireAdminWrite, toInt } from '@/lib/admin/common';
import { writeAdminAudit } from '@/lib/admin/auth';
import { deleteAdminProductPromotion, getAdminProductPromotion, saveAdminProductPromotion } from '@/lib/productPromotions';

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return ok(await getAdminProductPromotion(toInt(id)));
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdminWrite(request);
    const { id } = await context.params;
    const saved = await saveAdminProductPromotion(await request.json().catch(() => ({})), toInt(id));
    await writeAdminAudit({ actorUserId: actor.id, action: 'product_promotion.updated', resource: 'marketing.product_promotions', resourceId: saved.id, request });
    return ok(saved, 'Đã cập nhật chương trình khuyến mãi.');
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdminWrite(request);
    const { id } = await context.params;
    const deleted = await deleteAdminProductPromotion(toInt(id));
    await writeAdminAudit({ actorUserId: actor.id, action: 'product_promotion.deleted', resource: 'marketing.product_promotions', resourceId: deleted.id, request });
    return ok(deleted, 'Đã xóa chương trình khuyến mãi.');
  } catch (error) {
    return fail(error);
  }
}
