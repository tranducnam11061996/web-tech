import path from 'node:path';
import { AdminApiError } from './common';
import type { RichTextImageScope } from './rich-text-image-scopes';

export type { RichTextImageScope } from './rich-text-image-scopes';

export const MAX_RICH_TEXT_IMAGE_SIZE = 10 * 1024 * 1024;

const MIME_CONFIG: Record<string, { extension: string; acceptedExtensions: ReadonlySet<string> }> = {
  'image/jpeg': { extension: '.jpg', acceptedExtensions: new Set(['.jpg', '.jpeg']) },
  'image/png': { extension: '.png', acceptedExtensions: new Set(['.png']) },
  'image/webp': { extension: '.webp', acceptedExtensions: new Set(['.webp']) },
  'image/gif': { extension: '.gif', acceptedExtensions: new Set(['.gif']) },
};

export function validateRichTextImageMetadata(file: { name?: string; size?: number; type?: string }) {
  const size = Number(file.size || 0);
  if (!Number.isFinite(size) || size <= 0) {
    throw new AdminApiError(400, 'BAD_REQUEST', 'File ảnh không có nội dung');
  }
  if (size > MAX_RICH_TEXT_IMAGE_SIZE) {
    throw new AdminApiError(400, 'BAD_REQUEST', 'Dung lượng ảnh tối đa là 10MB');
  }

  const mimeType = String(file.type || '').trim().toLowerCase();
  const config = MIME_CONFIG[mimeType];
  const originalExtension = path.extname(String(file.name || '')).toLowerCase();
  if (!config || !config.acceptedExtensions.has(originalExtension)) {
    throw new AdminApiError(400, 'BAD_REQUEST', 'Chỉ hỗ trợ ảnh jpg, png, webp hoặc gif đúng định dạng');
  }

  return { mimeType, extension: config.extension };
}

export function richTextImageDateFolder(date = new Date()) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}${mm}${date.getFullYear()}`;
}

export function buildRichTextImageRelativePath(
  scope: RichTextImageScope,
  fileName: string,
  date = new Date(),
) {
  return ['rich-text', scope, richTextImageDateFolder(date), fileName].join('/');
}

export function buildRichTextImageUrl(relativePath: string) {
  return `/api/media/${relativePath.split('/').map(encodeURIComponent).join('/')}`;
}
