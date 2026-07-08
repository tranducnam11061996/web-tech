import { fail, ok, requireAdminWrite } from '@/lib/admin/common';
import { getHeaderMenuAdmin, saveHeaderMenuDraft } from '@/lib/admin/menus';

export async function GET() {
  try {
    return ok(await getHeaderMenuAdmin());
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(request: Request) {
  try {
    requireAdminWrite();
    const body = await request.json().catch(() => ({}));
    return ok(await saveHeaderMenuDraft(body?.menu || body, body?.settings), 'Da luu ban nhap menu');
  } catch (error) {
    return fail(error);
  }
}
