import { fail, ok, requireAdminWrite } from '@/lib/admin/common';
import { getBottomFooterMenuAdmin, saveBottomFooterMenuDraft } from '@/lib/admin/bottomFooterMenus';

export async function GET() {
  try {
    return ok(await getBottomFooterMenuAdmin());
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdminWrite(request);
    const body = await request.json().catch(() => ({}));
    return ok(await saveBottomFooterMenuDraft(body?.menu || body), 'Đã lưu bản nháp Bottom Footer');
  } catch (error) {
    return fail(error);
  }
}
