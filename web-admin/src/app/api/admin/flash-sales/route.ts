import { fail, ok, requireAdminWrite } from '@/lib/admin/common';
import { writeAdminAudit } from '@/lib/admin/auth';
import { listAdminFlashSales, saveAdminFlashSale } from '@/lib/flashSales';

export async function GET(request: Request) {
  try { return ok(await listAdminFlashSales(request.url)); }
  catch (error) { return fail(error); }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAdminWrite(request);
    const saved = await saveAdminFlashSale(await request.json().catch(() => ({})), actor.id);
    await writeAdminAudit({ actorUserId: actor.id, action: 'flash_sale.created', resource: 'marketing.flash_sales', resourceId: saved.id, request });
    return ok(saved, 'Đã tạo chiến dịch Flash Sale.', 201);
  } catch (error) { return fail(error); }
}
