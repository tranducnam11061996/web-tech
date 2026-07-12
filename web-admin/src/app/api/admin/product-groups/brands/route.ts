import { fail, ok } from '@/lib/admin/common';
import { listProductGroupBrands } from '@/lib/productGroups';

export async function GET() {
  try {
    return ok(await listProductGroupBrands());
  } catch (error) {
    return fail(error);
  }
}
