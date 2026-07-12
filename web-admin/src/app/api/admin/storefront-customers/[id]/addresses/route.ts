import { fail, ok, requireAdminWrite, toInt } from '@/lib/admin/common';
import { requireAdminSession } from '@/lib/admin/auth';
import { getAdminStorefrontCustomer, saveAdminCustomerAddress, writeCustomerAdminAudit } from '@/lib/admin/storefrontCustomers';

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: Context) {
  try {
    await requireAdminWrite(request);
    const actor = await requireAdminSession(request);
    const result = await saveAdminCustomerAddress(toInt((await context.params).id), await request.json().catch(() => ({})));
    await writeCustomerAdminAudit(result, actor, request);
    return ok(await getAdminStorefrontCustomer(result.id), 'Đã thêm địa chỉ.');
  } catch (error) {
    return fail(error);
  }
}
