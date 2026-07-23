import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { AdminApiError, fail, ok, requireAdminWrite } from '@/lib/admin/common';
import {
  buildBrandLogoRelativePath,
  buildBrandLogoUrl,
  validateBrandLogoMetadata,
} from '@/lib/admin/brand-images';
import { getMediaRoot, isPathInside, matchesImageSignature } from '@/lib/admin/media-storage';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    await requireAdminWrite(request);
    const formData = await request.formData();
    const file = formData.get('file');
    if (typeof file !== 'object' || file === null || !('arrayBuffer' in file)) {
      throw new AdminApiError(400, 'BAD_REQUEST', 'Chua chon file logo');
    }

    const { mimeType, extension } = validateBrandLogoMetadata(file);
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!matchesImageSignature(buffer, mimeType)) {
      throw new AdminApiError(400, 'BAD_REQUEST', 'Noi dung file khong dung dinh dang anh');
    }

    const relativePath = buildBrandLogoRelativePath(extension, new Date(), randomUUID());
    const mediaRoot = getMediaRoot();
    const targetPath = path.resolve(/*turbopackIgnore: true*/ mediaRoot, ...relativePath.split('/'));
    const folderPath = path.dirname(targetPath);
    if (!isPathInside(mediaRoot, folderPath) || !isPathInside(mediaRoot, targetPath)) {
      throw new AdminApiError(400, 'BAD_REQUEST', 'Duong dan media khong hop le');
    }

    await mkdir(folderPath, { recursive: true });
    await writeFile(targetPath, buffer);

    return ok(
      { relativePath, url: buildBrandLogoUrl(relativePath) },
      'Tai logo thanh cong',
    );
  } catch (error) {
    return fail(error);
  }
}
