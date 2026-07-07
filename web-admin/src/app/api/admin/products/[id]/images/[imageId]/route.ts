import { deleteProductImage, groupProductImages, listProductImages } from '@/lib/admin/images';
import { fail, ok, requireAdminWrite, toInt } from '@/lib/admin/common';
import { deleteMediaFile } from '@/lib/admin/media-storage';

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

export async function DELETE(_request: Request, context: RouteContext<'/api/admin/products/[id]/images/[imageId]'>) {
  try {
    requireAdminWrite();
    const { id, imageId } = await context.params;
    const result = await deleteProductImage(toInt(id), toInt(imageId));
    if (result.deletedImage.folder !== 'legacy' && result.deletedImage.relativePath) {
      await deleteMediaFile(result.deletedImage.relativePath);
    }
    const images = result.images;
    return ok(formatImagePayload(images), 'Da xoa anh san pham');
  } catch (error) {
    return fail(error);
  }
}
