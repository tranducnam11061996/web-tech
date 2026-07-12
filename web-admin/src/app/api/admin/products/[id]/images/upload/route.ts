import path from 'node:path';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { AdminApiError, fail, ok, requireAdminWrite, toInt } from '@/lib/admin/common';
import {
  addUploadedProductImages,
  groupProductImages,
  listProductImages,
  normalizeImageType,
  type UploadedImageInput,
} from '@/lib/admin/images';
import { getMediaRoot, isPathInside, matchesImageSignature } from '@/lib/admin/media-storage';

export const runtime = 'nodejs';

const MAX_BATCH_SIZE = 50 * 1024 * 1024;
const ALLOWED_MIME = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
]);
const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

function dateFolder(date = new Date()) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = String(date.getFullYear());
  return `${dd}${mm}${yyyy}`;
}

function sanitizeName(name: string, fallback: string) {
  const parsed = path.parse(name || fallback);
  const base = (parsed.name || fallback)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || fallback;
  return base.toLowerCase();
}

async function uniqueFilePath(folderPath: string, baseName: string, extension: string) {
  let counter = 0;
  while (counter < 1000) {
    const suffix = counter === 0 ? '' : `-${counter}`;
    const fileName = `${baseName}${suffix}${extension}`;
    const targetPath = path.resolve(/*turbopackIgnore: true*/ folderPath, fileName);
    try {
      await access(targetPath, constants.F_OK);
      counter += 1;
    } catch {
      return { fileName, targetPath };
    }
  }
  throw new AdminApiError(409, 'CONFLICT', 'Khong the tao ten file khong trung');
}

function readImageDimensions(buffer: Buffer, mimeType: string) {
  if (mimeType === 'image/png' && buffer.length >= 24) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (mimeType === 'image/gif' && buffer.length >= 10) {
    return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
  }
  if (mimeType === 'image/jpeg') {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3 && offset + 8 < buffer.length) {
        return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
      }
      offset += 2 + length;
    }
  }
  if (mimeType === 'image/webp' && buffer.length >= 30 && buffer.toString('ascii', 0, 4) === 'RIFF') {
    const chunk = buffer.toString('ascii', 12, 16);
    if (chunk === 'VP8X' && buffer.length >= 30) {
      return {
        width: 1 + buffer.readUIntLE(24, 3),
        height: 1 + buffer.readUIntLE(27, 3),
      };
    }
  }
  return { width: 0, height: 0 };
}

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

export async function POST(request: Request, context: RouteContext<'/api/admin/products/[id]/images/upload'>) {
  try {
    await requireAdminWrite(request);
    const { id } = await context.params;
    const productId = toInt(id);
    if (!productId) throw new AdminApiError(400, 'BAD_REQUEST', 'Product id khong hop le');

    const formData = await request.formData();
    const type = normalizeImageType(formData.get('type'));
    const files = [...formData.getAll('files'), ...formData.getAll('file')].filter(
      (value): value is File => typeof value === 'object' && value !== null && 'arrayBuffer' in value,
    );
    if (files.length === 0) throw new AdminApiError(400, 'BAD_REQUEST', 'Chua chon file anh');

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > MAX_BATCH_SIZE) throw new AdminApiError(400, 'BAD_REQUEST', 'Tong dung luong anh tai len toi da la 50MB');

    const mediaRoot = getMediaRoot();
    const folder = dateFolder();
    const folderPath = path.resolve(/*turbopackIgnore: true*/ mediaRoot, folder);
    if (!isPathInside(mediaRoot, folderPath)) throw new AdminApiError(400, 'BAD_REQUEST', 'Duong dan media khong hop le');
    await mkdir(folderPath, { recursive: true });

    const uploaded: UploadedImageInput[] = [];
    const errors: string[] = [];

    for (const [index, file] of files.entries()) {
      const mimeType = String(file.type || '').toLowerCase();
      const originalExt = path.extname(file.name || '').toLowerCase();
      const extension = originalExt === '.jpeg' ? '.jpg' : originalExt || ALLOWED_MIME.get(mimeType) || '';
      if (!ALLOWED_MIME.has(mimeType) || !ALLOWED_EXTENSIONS.has(extension)) {
        errors.push(`${file.name || `file ${index + 1}`}: chi ho tro jpg, png, webp, gif`);
        continue;
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      if (!matchesImageSignature(buffer, mimeType)) { errors.push(`${file.name || `file ${index + 1}`}: nội dung file không đúng định dạng ảnh`); continue; }
      const baseName = sanitizeName(file.name, `product-${productId}-${Date.now()}-${index + 1}`);
      const { fileName, targetPath } = await uniqueFilePath(folderPath, baseName, extension);
      if (!isPathInside(mediaRoot, targetPath)) {
        errors.push(`${file.name || `file ${index + 1}`}: duong dan file khong hop le`);
        continue;
      }

      await writeFile(targetPath, buffer);
      const dimensions = readImageDimensions(buffer, mimeType);
      uploaded.push({
        type,
        fileName,
        folder,
        relativePath: `${folder}/${fileName}`,
        alt: path.parse(file.name || fileName).name,
        sizeBytes: buffer.length,
        mimeType,
        width: dimensions.width,
        height: dimensions.height,
      });
    }

    if (errors.length > 0 && uploaded.length === 0) {
      throw new AdminApiError(400, 'BAD_REQUEST', errors.join('; '));
    }

    const images = await addUploadedProductImages(productId, uploaded);
    return ok(formatImagePayload(images), errors.length ? `Da tai len ${uploaded.length} anh. ${errors.join('; ')}` : 'Tai anh thanh cong');
  } catch (error) {
    return fail(error);
  }
}
