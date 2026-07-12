import { fail, ok, requireAdminWrite, toInt } from '@/lib/admin/common';
import { requireAdminSession } from '@/lib/admin/auth';
import { deleteAdminStorefrontCustomer, getAdminStorefrontCustomer, updateAdminStorefrontCustomer, writeCustomerAdminAudit } from '@/lib/admin/storefrontCustomers';
import { NextRequest } from 'next/server';

type Context = { params: Promise<{ id: string }> };
async function idFrom(context: Context) { return toInt((await context.params).id); }

export async function GET(request: NextRequest, context: Context) {
  try {
    return ok(await getAdminStorefrontCustomer(await idFrom(context), request.nextUrl.searchParams));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    await requireAdminWrite(request);
    const actor = await requireAdminSession(request);
    const result = await updateAdminStorefrontCustomer(await idFrom(context), await request.json().catch(() => ({})));
    await writeCustomerAdminAudit(result, actor, request);
    return ok(await getAdminStorefrontCustomer(result.id), 'Đã cập nhật khách hàng.');
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request, context: Context) {
  try {
    await requireAdminWrite(request);
    const actor = await requireAdminSession(request);
    const result = await deleteAdminStorefrontCustomer(await idFrom(context));
    await writeCustomerAdminAudit(result, actor, request);
    return ok({ id: result.id }, 'Đã xóa khách hàng chưa phát sinh đơn.');
  } catch (error) {
    return fail(error);
  }
}
