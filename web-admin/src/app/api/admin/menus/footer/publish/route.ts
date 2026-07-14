import { fail, ok, requireAdminWrite } from '@/lib/admin/common';
import { publishFooterMenuDraft } from '@/lib/admin/footerMenus';

export async function POST(request: Request) {
  try {
    await requireAdminWrite(request);
    return ok(await publishFooterMenuDraft(), 'Đã xuất bản Footer Menu');
  } catch (error) {
    return fail(error);
  }
}
