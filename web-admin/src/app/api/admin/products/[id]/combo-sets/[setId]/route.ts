import { fail, ok, requireAdminWrite, toInt } from '@/lib/admin/common';
import { listProductComboSets } from '@/lib/admin/services';
import { removeProductComboSet } from '@/lib/comboSets';

export async function DELETE(request: Request, context: { params: Promise<{ id: string; setId: string }> }) {
  try {
    await requireAdminWrite(request);
    const { id, setId } = await context.params;
    const productId = toInt(id);
    await removeProductComboSet(productId, toInt(setId));
    return ok({ items: await listProductComboSets(productId) }, 'Đã gỡ combo set khỏi sản phẩm');
  } catch (error) {
    return fail(error);
  }
}
