import { fail, ok, requireAdminWrite } from '@/lib/admin/common';
import { writeAdminAudit } from '@/lib/admin/auth';
import { listAdminProductPromotions, saveAdminProductPromotion } from '@/lib/productPromotions';

export async function GET(request: Request) {
  try {
    return ok(await listAdminProductPromotions(request.url));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAdminWrite(request);
    const saved = await saveAdminProductPromotion(await request.json().catch(() => ({})));
    await writeAdminAudit({ actorUserId: actor.id, action: 'product_promotion.created', resource: 'marketing.product_promotions', resourceId: saved.id, request });
    return ok(saved, 'Đã tạo chương trình khuyến mãi.', 201);
  } catch (error) {
    return fail(error);
  }
}

