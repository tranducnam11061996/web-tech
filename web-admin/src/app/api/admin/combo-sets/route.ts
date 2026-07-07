import { fail, ok } from '@/lib/admin/common';
import { listComboSetCatalogFromRequest } from '@/lib/admin/services';

export async function GET(request: Request) {
  try {
    return ok(await listComboSetCatalogFromRequest(request.url));
  } catch (error) {
    return fail(error);
  }
}
