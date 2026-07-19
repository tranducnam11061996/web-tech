import { fail, ok, requireAdminWrite, toInt } from '@/lib/admin/common';
import { writeAdminAudit } from '@/lib/admin/auth';
import { setAdminFlashSaleStatus } from '@/lib/flashSales';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdminWrite(request);
    const { id } = await context.params;
    const saved = await setAdminFlashSaleStatus(toInt(id), 'paused', actor.id);
    await writeAdminAudit({ actorUserId: actor.id, action: 'flash_sale.paused', resource: 'marketing.flash_sales', resourceId: saved.id, request });
    return ok(saved, 'Đã tạm dừng chiến dịch Flash Sale.');
  } catch (error) { return fail(error); }
}
