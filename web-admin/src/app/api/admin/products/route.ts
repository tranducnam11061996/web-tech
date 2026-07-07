import { fail, ok, parseIdList, requireAdminWrite } from '@/lib/admin/common';
import { bulkProducts, listProductsFromRequest, saveProduct } from '@/lib/admin/services';

export async function GET(request: Request) {
  try {
    return ok(await listProductsFromRequest(request.url));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    requireAdminWrite();
    const body = await request.json().catch(() => ({}));
    if (body?.action) {
      return ok(await bulkProducts(parseIdList(body.ids), String(body.action)), 'Bulk action thanh cong');
    }
    return ok(await saveProduct(body), 'Tao san pham thanh cong', 201);
  } catch (error) {
    return fail(error);
  }
}

