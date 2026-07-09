import { fail, ok, requireAdminWrite } from '@/lib/admin/common';
import { listBannerLocations, saveBannerLocation } from '@/lib/admin/banners';

export async function GET(request: Request) {
  try {
    return ok(await listBannerLocations(new URL(request.url).searchParams));
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    requireAdminWrite();
    const body = await request.json().catch(() => ({}));
    return ok(await saveBannerLocation(body), 'Đã tạo vị trí banner');
  } catch (error) {
    return fail(error);
  }
}
