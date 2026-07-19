import { fail, ok, requireAdminWrite, toInt } from '@/lib/admin/common';
import { writeAdminAudit } from '@/lib/admin/auth';
import { getAdminFlashSale, saveAdminFlashSale } from '@/lib/flashSales';

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try { const { id } = await context.params; return ok(await getAdminFlashSale(toInt(id))); }
  catch (error) { return fail(error); }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdminWrite(request);
    const { id } = await context.params;
    const saved = await saveAdminFlashSale(await request.json().catch(() => ({})), actor.id, toInt(id));
    await writeAdminAudit({ actorUserId: actor.id, action: 'flash_sale.updated', resource: 'marketing.flash_sales', resourceId: saved.id, request });
    return ok(saved, 'Đã cập nhật chiến dịch Flash Sale.');
  } catch (error) { return fail(error); }
}
