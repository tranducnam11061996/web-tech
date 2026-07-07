import { fail, ok, parseIdList, requireAdminWrite } from '@/lib/admin/common';
import { bulkArticleStatus, deleteArticle, listArticlesFromRequest, saveArticle } from '@/lib/admin/services';

export async function GET(request: Request) {
  try {
    return ok(await listArticlesFromRequest(request.url));
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
        for (const id of ids) await deleteArticle(id, 'permanent');
      } else {
        await bulkArticleStatus(ids, String(body.action));
      }
      return ok({ ids, action: body.action }, 'Bulk action thanh cong');
    }
    return ok(await saveArticle(body), 'Tao bai viet thanh cong', 201);
  } catch (error) {
    return fail(error);
  }
}
