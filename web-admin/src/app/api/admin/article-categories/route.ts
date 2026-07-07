import { fail, ok, parseIdList, requireAdminWrite } from '@/lib/admin/common';
import { bulkCategoryStatus, deleteCategory, listArticleCategories, saveArticleCategory } from '@/lib/admin/services';

export async function GET() {
  try {
    return ok({ items: await listArticleCategories() });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    requireAdminWrite();
    const body = await request.json().catch(() => ({}));
    if (body?.action) {
      const ids = parseIdList(body.ids);
      if (body.action === 'delete-permanent') {
        for (const id of ids) await deleteCategory('article-category', 'idv_seller_news_category', id, 'permanent');
      } else {
        await bulkCategoryStatus('idv_seller_news_category', ids, String(body.action));
      }
      return ok({ ids, action: body.action }, 'Bulk action thanh cong');
    }
    return ok(await saveArticleCategory(body), 'Tao danh muc bai viet thanh cong', 201);
  } catch (error) {
    return fail(error);
  }
}
