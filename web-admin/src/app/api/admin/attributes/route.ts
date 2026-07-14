import { fail, ok, requireAdminWrite } from '@/lib/admin/common';
import { bulkAttributeAction, saveAttribute } from '@/lib/admin/attributes';

export async function POST(request: Request) {
  try {
    await requireAdminWrite(request);
    const body = await request.json().catch(() => ({}));
    return ok(await saveAttribute(body), 'Da tao thuoc tinh', 201);
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdminWrite(request);
    const body = await request.json().catch(() => ({}));
    return ok(await bulkAttributeAction(body.ids, String(body.action)), 'Da cap nhat cac thuoc tinh');
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireAdminWrite(request);
    const body = await request.json().catch(() => ({}));
    return ok(await bulkAttributeAction(body.ids, 'delete-permanent'), 'Da xoa cac thuoc tinh');
  } catch (error) {
    return fail(error);
  }
}
