import { randomUUID } from 'node:crypto';
import { AdminApiError } from './common';
import {
  buildRichTextImageUrl,
  richTextImageDateFolder,
  validateRichTextImageMetadata,
} from './rich-text-images';

export const MAX_BRAND_IMAGE_LENGTH = 150;

export function normalizeBrandImageValue(value: unknown) {
  if (value === undefined) return undefined;

  const image = String(value ?? '').trim();
  if (!image || image === '0') return image;
  if (image.length > MAX_BRAND_IMAGE_LENGTH) {
    throw new AdminApiError(400, 'BAD_REQUEST', `Logo vuot qua ${MAX_BRAND_IMAGE_LENGTH} ky tu`, {
      image: 'max_length',
    });
  }

  if (image.startsWith('/')) {
    if (
      image.startsWith('//')
      || image.includes('\\')
      || image.split('/').includes('..')
      || /[\u0000-\u001f\u007f]/.test(image)
    ) {
      throw new AdminApiError(400, 'BAD_REQUEST', 'Duong dan logo khong hop le', {
        image: 'invalid',
      });
    }
    return image;
  }

  try {
    const url = new URL(image);
    if (url.protocol !== 'https:' || url.username || url.password) {
      throw new Error('unsafe');
    }
    return image;
  } catch {
    throw new AdminApiError(400, 'BAD_REQUEST', 'Duong dan logo khong hop le', {
      image: 'invalid',
    });
  }
}

export function buildBrandLogoRelativePath(extension: string, date = new Date(), id: string = randomUUID()) {
  return ['brand', richTextImageDateFolder(date), `${id}${extension}`].join('/');
}

export function buildBrandLogoUrl(relativePath: string) {
  return buildRichTextImageUrl(relativePath);
}

export function validateBrandLogoMetadata(file: { name?: string; size?: number; type?: string }) {
  return validateRichTextImageMetadata(file);
}
