import { fail, ok, requireAdminWrite, toInt } from '@/lib/admin/common';
import { addProductToSpecialCollection, listSpecialCollectionProducts } from '@/lib/admin/special-collections';

export async function GET(request: Request, context: RouteContext<'/api/admin/collections/[id]/products'>) {
  try {
    const { id } = await context.params;
    return ok(await listSpecialCollectionProducts(toInt(id), new URL(request.url).searchParams));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request, context: RouteContext<'/api/admin/collections/[id]/products'>) {
  try {
    await requireAdminWrite(request);
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    return ok(await addProductToSpecialCollection(toInt(id), body), 'Da them san pham vao bo suu tap', 201);
  } catch (error) {
    return fail(error);
  }
}
