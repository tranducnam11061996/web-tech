import { fail, ok, requireAdminWrite } from '@/lib/admin/common';
import { listAdminBanners, saveAdminBanner } from '@/lib/admin/banners';

export async function GET(request: Request) {
  try {
    return ok(await listAdminBanners(new URL(request.url).searchParams));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    requireAdminWrite();
    const body = await request.json().catch(() => ({}));
    return ok(await saveAdminBanner(body), 'Đã tạo banner');
  } catch (error) {
    return fail(error);
  }
}
