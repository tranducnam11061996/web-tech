import { fail, ok, requireAdminWrite, toInt } from '@/lib/admin/common';
import { requireAdminSession } from '@/lib/admin/auth';
import { deleteAdminCustomerAddress, getAdminStorefrontCustomer, saveAdminCustomerAddress, setAdminCustomerDefaultAddress, writeCustomerAdminAudit } from '@/lib/admin/storefrontCustomers';

type Context = { params: Promise<{ id: string; addressId: string }> };
async function values(context: Context) { const params = await context.params; return { customerId: toInt(params.id), addressId: toInt(params.addressId) }; }

export async function PATCH(request: Request, context: Context) {
  try {
    await requireAdminWrite(request);
    const actor = await requireAdminSession(request);
    const { customerId, addressId } = await values(context);
    const payload = await request.json().catch(() => ({}));
    const result = payload?.action === 'set_default'
      ? await setAdminCustomerDefaultAddress(customerId, addressId)
      : await saveAdminCustomerAddress(customerId, payload, addressId);
    await writeCustomerAdminAudit(result, actor, request);
    return ok(await getAdminStorefrontCustomer(result.id), 'Đã cập nhật địa chỉ.');
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    await requireAdminWrite(request);
    const actor = await requireAdminSession(request);
    const { customerId, addressId } = await values(context);
    const result = await deleteAdminCustomerAddress(customerId, addressId);
    await writeCustomerAdminAudit(result, actor, request);
    return ok(await getAdminStorefrontCustomer(result.id), 'Đã xóa địa chỉ.');
  } catch (error) {
    return fail(error);
  }
}
