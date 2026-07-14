import { fail, ok, requireAdminWrite } from '@/lib/admin/common';
import { getFooterMenuAdmin, saveFooterMenuDraft } from '@/lib/admin/footerMenus';

export async function GET() {
  try {
    return ok(await getFooterMenuAdmin());
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdminWrite(request);
    const body = await request.json().catch(() => ({}));
    return ok(await saveFooterMenuDraft(body?.menu || body), 'Đã lưu bản nháp Footer Menu');
  } catch (error) {
    return fail(error);
  }
}
