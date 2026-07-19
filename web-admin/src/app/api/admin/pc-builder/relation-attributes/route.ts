import { AdminApiError, fail, ok } from '@/lib/admin/common';
import { requireAdminPermission } from '@/lib/admin/auth';
import { getPcBuilderRelationAttributeOptions } from '@/lib/pcBuilder/configuration';

export async function GET(request: Request) {
  try {
    await requireAdminPermission(request, 'catalog.pc_builder.read');
    const params = new URL(request.url).searchParams;
    const sourceCategoryId = Number(params.get('sourceCategoryId'));
    const relatedCategoryId = Number(params.get('relatedCategoryId'));
    if (!Number.isSafeInteger(sourceCategoryId) || sourceCategoryId <= 0 || !Number.isSafeInteger(relatedCategoryId) || relatedCategoryId <= 0) {
      throw new AdminApiError(400, 'BAD_REQUEST', 'Danh mục nguồn và liên quan không hợp lệ.');
    }
    return ok(await getPcBuilderRelationAttributeOptions(sourceCategoryId, relatedCategoryId));
  } catch (error) { return fail(error); }
}
