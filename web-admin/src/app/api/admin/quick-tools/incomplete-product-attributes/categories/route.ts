import { fail, ok } from '@/lib/admin/common';
import { listQuickToolCategories } from '@/lib/admin/quickProductAttributes';

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    return ok(await listQuickToolCategories({
      includeComplete: searchParams.get('includeComplete') === '1',
      q: searchParams.get('q') || '',
      selectedCategoryId: Number(searchParams.get('selectedCategoryId') || 0),
    }));
  } catch (error) {
    return fail(error);
  }
}
