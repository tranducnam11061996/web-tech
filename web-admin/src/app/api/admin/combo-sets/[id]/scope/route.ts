import { fail, ok, requireAdminWrite, toInt } from '@/lib/admin/common';
import { parsePaginationParams } from '@/lib/admin/pagination';
import { getAdminComboSetScope, updateAdminComboSetScope } from '@/lib/comboSetScopes';

type ComboSetScopeRouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: ComboSetScopeRouteContext) {
  try {
    const { id } = await context.params;
    const { page, limit } = parsePaginationParams(new URL(request.url).searchParams);
    return ok(await getAdminComboSetScope(toInt(id), page, limit));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request, context: ComboSetScopeRouteContext) {
  try {
    const actor = await requireAdminWrite(request);
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const result = await updateAdminComboSetScope(
      toInt(id),
      body,
      actor.name || actor.email || 'Admin',
    );
    return ok(result, 'Đã cập nhật phạm vi áp dụng combo.');
  } catch (error) {
    return fail(error);
  }
}
