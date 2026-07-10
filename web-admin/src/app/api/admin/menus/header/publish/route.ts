import { fail, ok, requireAdminWrite } from '@/lib/admin/common';
import { publishHeaderMenuDraft } from '@/lib/admin/menus';

export async function POST(request: Request) {
  try {
    await requireAdminWrite(request);
    return ok(await publishHeaderMenuDraft(), 'Da xuat ban menu header');
  } catch (error) {
    return fail(error);
  }
}
