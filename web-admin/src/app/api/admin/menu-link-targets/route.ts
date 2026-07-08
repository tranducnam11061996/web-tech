import { fail, ok } from '@/lib/admin/common';
import { searchMenuLinkTargets } from '@/lib/admin/menus';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    return ok({
      items: await searchMenuLinkTargets(
        searchParams.get('type') || 'product-category',
        searchParams.get('q') || '',
      ),
    });
  } catch (error) {
    return fail(error);
  }
}
