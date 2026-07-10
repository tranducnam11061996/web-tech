import { fail, ok, requireAdminWrite } from '@/lib/admin/common';
import { listSpecialCollectionOptions, listSpecialCollections, saveSpecialCollection } from '@/lib/admin/special-collections';

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    if (searchParams.get('mode') === 'options') {
      return ok({ items: await listSpecialCollectionOptions() });
    }
    return ok(await listSpecialCollections(searchParams));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminWrite(request);
    const body = await request.json().catch(() => ({}));
    return ok(await saveSpecialCollection(body), 'Da tao bo suu tap', 201);
  } catch (error) {
    return fail(error);
  }
}
