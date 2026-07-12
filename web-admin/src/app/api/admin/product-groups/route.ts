import { fail, ok, requireAdminWrite } from '@/lib/admin/common';
import { requireAdminSession } from '@/lib/admin/auth';
import { listProductGroupsFromRequest, saveProductGroup } from '@/lib/productGroups';

export async function GET(request: Request) {
  try {
    return ok(await listProductGroupsFromRequest(request.url));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminWrite(request);
    const actor = await requireAdminSession(request);
    const body = await request.json().catch(() => ({}));
    return ok(await saveProductGroup(body, actor.name || actor.email || 'Admin'), 'Đã tạo group sản phẩm', 201);
  } catch (error) {
    return fail(error);
  }
}
