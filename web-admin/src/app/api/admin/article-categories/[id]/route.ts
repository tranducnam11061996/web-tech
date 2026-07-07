import { fail, ok, requireAdminWrite, toInt } from '@/lib/admin/common';
import { deleteCategory, getArticleCategory, saveArticleCategory } from '@/lib/admin/services';

export async function GET(_request: Request, context: RouteContext<'/api/admin/article-categories/[id]'>) {
  try {
    const { id } = await context.params;
    return ok(await getArticleCategory(toInt(id)));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request, context: RouteContext<'/api/admin/article-categories/[id]'>) {
  try {
    requireAdminWrite();
    const { id } = await context.params;
    return ok(await saveArticleCategory(await request.json().catch(() => ({})), toInt(id)), 'Cap nhat danh muc bai viet thanh cong');
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request, context: RouteContext<'/api/admin/article-categories/[id]'>) {
  try {
    requireAdminWrite();
    const { id } = await context.params;
    const mode = new URL(request.url).searchParams.get('mode') || 'hide';
    return ok(await deleteCategory('article-category', 'idv_seller_news_category', toInt(id), mode), mode === 'permanent' ? 'Da xoa vinh vien' : 'Da an danh muc');
  } catch (error) {
    return fail(error);
  }
}

