import { fail, ok, requireAdminWrite, toInt } from '@/lib/admin/common';
import { deleteProduct, getProduct, saveProduct, updateProductSection } from '@/lib/admin/services';
import { writeAdminAudit } from '@/lib/admin/auth';

export async function GET(_request: Request, context: RouteContext<'/api/admin/products/[id]'>) {
  try {
    const { id } = await context.params;
    return ok(await getProduct(toInt(id)));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request, context: RouteContext<'/api/admin/products/[id]'>) {
  try {
    const actor = await requireAdminWrite(request);
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    if (body?.section) {
      const saved = await updateProductSection(toInt(id), body.section, body.data || {});
      if (body.section === 'basic') await writeAdminAudit({ actorUserId: actor.id, action: 'product.build_pc_price_saved',
        resource: 'product', resourceId: id, request, metadata: {
          previousBuildPcPrice: (saved as { previousBuildPcPrice?: number | null }).previousBuildPcPrice ?? null,
          buildPcPrice: (saved as { buildPcPrice?: number | null }).buildPcPrice ?? null,
        } });
      return ok(
        saved,
        'Cap nhat tab san pham thanh cong',
      );
    }
    const saved = await saveProduct(body, toInt(id));
    await writeAdminAudit({ actorUserId: actor.id, action: 'product.build_pc_price_saved', resource: 'product',
      resourceId: id, request, metadata: { buildPcPrice: body?.buildPcPrice ?? null } });
    return ok(saved, 'Cap nhat san pham thanh cong');
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request, context: RouteContext<'/api/admin/products/[id]'>) {
  try {
    await requireAdminWrite(request);
    const { id } = await context.params;
    const mode = new URL(request.url).searchParams.get('mode') || 'hide';
    return ok(await deleteProduct(toInt(id), mode), mode === 'permanent' ? 'Da xoa vinh vien' : 'Da an san pham');
  } catch (error) {
    return fail(error);
  }
}
