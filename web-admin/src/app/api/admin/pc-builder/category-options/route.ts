import { fail, ok } from '@/lib/admin/common';
import { requireAdminPermission } from '@/lib/admin/auth';
import { searchPcBuilderCategoryOptions } from '@/lib/pcBuilder/configuration';

export async function GET(request: Request) {
  try {
    await requireAdminPermission(request, 'catalog.pc_builder.read');
    const query = new URL(request.url).searchParams.get('q') || '';
    return ok(await searchPcBuilderCategoryOptions(query));
  } catch (error) { return fail(error); }
}
