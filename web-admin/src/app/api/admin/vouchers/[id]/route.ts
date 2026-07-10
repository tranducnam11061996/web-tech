import { fail, ok, requireAdminWrite, toInt } from '@/lib/admin/common';
import { getAdminVoucher, saveAdminVoucher } from '@/lib/vouchers';

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return ok(await getAdminVoucher(toInt(id)));
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminWrite(request);
    const { id } = await context.params;
    const payload = await request.json().catch(() => ({}));
    return ok(await saveAdminVoucher(payload, toInt(id)), 'Đã cập nhật voucher.');
  } catch (error) {
    return fail(error);
  }
}
