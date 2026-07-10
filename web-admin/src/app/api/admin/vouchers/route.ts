import { fail, ok, requireAdminWrite } from '@/lib/admin/common';
import { listAdminVouchers, saveAdminVoucher } from '@/lib/vouchers';

export async function GET() {
  try {
    return ok({ items: await listAdminVouchers() });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminWrite(request);
    return ok(await saveAdminVoucher(await request.json().catch(() => ({}))), 'Đã tạo voucher.', 201);
  } catch (error) {
    return fail(error);
  }
}
