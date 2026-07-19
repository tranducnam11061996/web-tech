import { fail, ok } from '@/lib/admin/common';
import { listIncompleteProducts } from '@/lib/admin/quickProductAttributes';

export async function GET(request: Request) {
  try {
    return ok(await listIncompleteProducts(new URL(request.url).searchParams));
  } catch (error) {
    return fail(error);
  }
}
