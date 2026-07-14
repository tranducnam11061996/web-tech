import { fail, ok, requireAdminWrite } from '@/lib/admin/common';
import { publishBottomFooterMenuDraft } from '@/lib/admin/bottomFooterMenus';

export async function POST(request: Request) {
  try {
    await requireAdminWrite(request);
    return ok(await publishBottomFooterMenuDraft(), 'Đã xuất bản Bottom Footer');
  } catch (error) {
    return fail(error);
  }
}
