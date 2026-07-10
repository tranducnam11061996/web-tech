import { fail, ok, requireAdminWrite, toInt, withTransaction } from '@/lib/admin/common';
import { requireAdminSession } from '@/lib/admin/auth';
import { getAdminStorefrontOrder, patchAdminStorefrontOrder } from '@/lib/storefrontOrders';
export async function GET(_: Request, context: { params: Promise<{id:string}> }) { try { const {id}=await context.params; return ok(await getAdminStorefrontOrder(toInt(id))); } catch(error){return fail(error)} }
export async function PATCH(request: Request, context: { params: Promise<{id:string}> }) { try { await requireAdminWrite(request); const actor=await requireAdminSession(request); const {id}=await context.params; const body=await request.json().catch(()=>({})); await withTransaction((connection)=>patchAdminStorefrontOrder(connection,toInt(id),body,actor)); return ok(await getAdminStorefrontOrder(toInt(id)),'Đã cập nhật đơn hàng.'); } catch(error){return fail(error)} }
