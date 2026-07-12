import { fail, ok, requireAdminWrite, toInt } from '@/lib/admin/common';
import { getAdminBuyingGuide, saveAdminBuyingGuide } from '@/lib/buyingGuides';

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: Context) {
  try {
    const { id } = await context.params;
    return ok(await getAdminBuyingGuide('product_category', toInt(id)));
  } catch (error) {
    return fail(error);
  }
}

export async function PUT(request: Request, context: Context) {
  try {
    await requireAdminWrite(request);
    const { id } = await context.params;
    return ok(
      await saveAdminBuyingGuide('product_category', toInt(id), await request.json().catch(() => ({}))),
      'Đã lưu nội dung Lý do nên mua',
    );
  } catch (error) {
    return fail(error);
  }
}
