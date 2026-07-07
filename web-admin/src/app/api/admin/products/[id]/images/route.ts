import { fail, ok, requireAdminWrite, toInt } from '@/lib/admin/common';
import { groupProductImages, listProductImages, patchProductImages } from '@/lib/admin/images';
import pool from '@/lib/db';
import type { RowDataPacket } from 'mysql2/promise';

function formatImagePayload(images: Awaited<ReturnType<typeof listProductImages>>) {
  const groups = groupProductImages(images);
  return {
    items: images,
    groups,
    counts: {
      product: images.filter((image) => image.type === 'product').length,
      self: images.filter((image) => image.type === 'self').length,
      customer: images.filter((image) => image.type === 'customer').length,
    },
  };
}

export async function GET(_request: Request, context: RouteContext<'/api/admin/products/[id]/images'>) {
  try {
    const { id } = await context.params;
    const productId = toInt(id);
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT proThum, image_collection FROM idv_sell_product_store WHERE id = ? LIMIT 1',
      [productId],
    );
    const product = rows[0];
    const images = await listProductImages(productId, product?.image_collection || '', product?.proThum || '');
    return ok(formatImagePayload(images));
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request, context: RouteContext<'/api/admin/products/[id]/images'>) {
  try {
    requireAdminWrite();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const patches = Array.isArray(body?.images) ? body.images : [];
    const images = await patchProductImages(toInt(id), patches);
    return ok(formatImagePayload(images), 'Cap nhat anh san pham thanh cong');
  } catch (error) {
    return fail(error);
  }
}

