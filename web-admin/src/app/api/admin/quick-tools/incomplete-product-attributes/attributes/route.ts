import { fail, ok } from '@/lib/admin/common';
import { listQuickToolAttributes } from '@/lib/admin/quickProductAttributes';

export async function GET(request: Request) {
  try {
    return ok(await listQuickToolAttributes(new URL(request.url).searchParams.get('categoryId')));
  } catch (error) {
    return fail(error);
  }
}
