import { fail, ok, requireAdminWrite } from '@/lib/admin/common';
import { writeAdminAudit } from '@/lib/admin/auth';
import { reviewPcBuilderProfile } from '@/lib/pcBuilder/admin';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdminWrite(request);
    const productId = Number((await context.params).id);
    if (!Number.isInteger(productId) || productId <= 0) throw new Error('Product ID không hợp lệ.');
    const body = await request.json();
    const action = body?.action === 'reject' ? 'reject' : body?.action === 'approve' ? 'approve' : null;
    if (!action) throw new Error('Action không hợp lệ.');
    const data = await reviewPcBuilderProfile(productId, action, actor.id, String(body.note || ''));
    await writeAdminAudit({ actorUserId: actor.id, action: `pc_builder.profile_${action}`, resource: 'catalog.pc_builder', resourceId: productId, request });
    return ok(data);
  } catch (error) { return fail(error); }
}
