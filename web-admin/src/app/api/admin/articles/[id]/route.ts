import { fail, ok, requireAdminWrite, toInt } from '@/lib/admin/common';
import { deleteArticle, getArticle, saveArticle } from '@/lib/admin/services';

export async function GET(_request: Request, context: RouteContext<'/api/admin/articles/[id]'>) {
  try {
    const { id } = await context.params;
    return ok(await getArticle(toInt(id)));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request, context: RouteContext<'/api/admin/articles/[id]'>) {
  try {
    await requireAdminWrite(request);
    const { id } = await context.params;
    return ok(await saveArticle(await request.json().catch(() => ({})), toInt(id)), 'Cap nhat bai viet thanh cong');
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request, context: RouteContext<'/api/admin/articles/[id]'>) {
  try {
    await requireAdminWrite(request);
    const { id } = await context.params;
    const mode = new URL(request.url).searchParams.get('mode') || 'hide';
    return ok(await deleteArticle(toInt(id), mode), mode === 'permanent' ? 'Da xoa vinh vien' : 'Da an bai viet');
  } catch (error) {
    return fail(error);
  }
}

