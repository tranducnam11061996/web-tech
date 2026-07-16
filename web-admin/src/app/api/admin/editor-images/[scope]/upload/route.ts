import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { AdminApiError, fail, ok, requireAdminWrite } from '@/lib/admin/common';
import { getMediaRoot, isPathInside, matchesImageSignature } from '@/lib/admin/media-storage';
import {
  buildRichTextImageRelativePath,
  buildRichTextImageUrl,
  validateRichTextImageMetadata,
} from '@/lib/admin/rich-text-images';
import { isRichTextImageScope } from '@/lib/admin/rich-text-image-scopes';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  context: RouteContext<'/api/admin/editor-images/[scope]/upload'>,
) {
  try {
    await requireAdminWrite(request);
    const { scope } = await context.params;
    if (!isRichTextImageScope(scope)) {
      throw new AdminApiError(400, 'BAD_REQUEST', 'Phạm vi editor không hợp lệ');
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (typeof file !== 'object' || file === null || !('arrayBuffer' in file)) {
      throw new AdminApiError(400, 'BAD_REQUEST', 'Chưa chọn file ảnh');
    }

    const { mimeType, extension } = validateRichTextImageMetadata(file);
    const buffer = Buffer.from(await file.arrayBuffer());
    if (!matchesImageSignature(buffer, mimeType)) {
      throw new AdminApiError(400, 'BAD_REQUEST', 'Nội dung file không đúng định dạng ảnh');
    }

    const fileName = `${randomUUID()}${extension}`;
    const relativePath = buildRichTextImageRelativePath(scope, fileName);
    const mediaRoot = getMediaRoot();
    const targetPath = path.resolve(/*turbopackIgnore: true*/ mediaRoot, ...relativePath.split('/'));
    const folderPath = path.dirname(targetPath);
    if (!isPathInside(mediaRoot, folderPath) || !isPathInside(mediaRoot, targetPath)) {
      throw new AdminApiError(400, 'BAD_REQUEST', 'Đường dẫn media không hợp lệ');
    }

    await mkdir(folderPath, { recursive: true });
    await writeFile(targetPath, buffer);

    return ok(
      { fileName, relativePath, url: buildRichTextImageUrl(relativePath) },
      'Tải ảnh thành công',
    );
  } catch (error) {
    return fail(error);
  }
}
