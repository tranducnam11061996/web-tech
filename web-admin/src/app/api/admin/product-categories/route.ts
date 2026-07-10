import { fail, ok, parseIdList, requireAdminWrite } from '@/lib/admin/common';
import { bulkCategoryStatus, deleteCategory, listProductCategories, saveProductCategory } from '@/lib/admin/services';

export async function GET() {
  try {
    return ok({ items: await listProductCategories() });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminWrite(request);
    const body = await request.json().catch(() => ({}));
    if (body?.action) {
      const ids = parseIdList(body.ids);
      if (body.action === 'delete-permanent') {
        for (const id of ids) await deleteCategory('product-category', 'idv_seller_category', id, 'permanent');
      } else {
        await bulkCategoryStatus('idv_seller_category', ids, String(body.action));
      }
      return ok({ ids, action: body.action }, 'Bulk action thanh cong');
    }
    return ok(await saveProductCategory(body), 'Tao danh muc san pham thanh cong', 201);
  } catch (error) {
    return fail(error);
  }
}
