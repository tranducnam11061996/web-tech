import { fail, ok, parseIdList, requireAdminWrite } from '@/lib/admin/common';
import { bulkProducts, listProductsFromRequest, saveProduct } from '@/lib/admin/services';
import { writeAdminAudit } from '@/lib/admin/auth';

export async function GET(request: Request) {
  try {
    return ok(await listProductsFromRequest(request.url));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAdminWrite(request);
    const body = await request.json().catch(() => ({}));
    if (body?.action) {
      return ok(await bulkProducts(parseIdList(body.ids), String(body.action)), 'Bulk action thanh cong');
    }
    const saved = await saveProduct(body);
    await writeAdminAudit({ actorUserId: actor.id, action: 'product.build_pc_price_saved', resource: 'product',
      resourceId: saved.id, request, metadata: { buildPcPrice: body?.buildPcPrice ?? null } });
    return ok(saved, 'Tao san pham thanh cong', 201);
  } catch (error) {
    return fail(error);
  }
}
