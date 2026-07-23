import assert from 'node:assert/strict';
import test from 'node:test';
import { getApiPermission } from '../src/lib/admin/permissions';
import { isPathInside, matchesImageSignature } from '../src/lib/admin/media-storage';
import {
  buildRichTextImageRelativePath,
  buildRichTextImageUrl,
  MAX_RICH_TEXT_IMAGE_SIZE,
  validateRichTextImageMetadata,
} from '../src/lib/admin/rich-text-images';
import {
  getRichTextImagePermission,
  getRichTextImagePermissionFromPath,
  isRichTextImageScope,
} from '../src/lib/admin/rich-text-image-scopes';

test('rich-text image scopes map to their existing update permissions', () => {
  const cases = [
    ['products', 'catalog.products.update'],
    ['product-categories', 'catalog.categories.update'],
    ['collections', 'catalog.collections.update'],
    ['brands', 'catalog.brands.update'],
    ['articles', 'content.articles.update'],
    ['article-categories', 'content.article_categories.update'],
  ] as const;

  for (const [scope, permission] of cases) {
    const pathname = `/api/admin/editor-images/${scope}/upload`;
    assert.equal(isRichTextImageScope(scope), true);
    assert.equal(getRichTextImagePermission(scope), permission);
    assert.equal(getRichTextImagePermissionFromPath(pathname), permission);
    assert.equal(getApiPermission(pathname, 'POST'), permission);
    assert.equal(getApiPermission(pathname, 'GET'), null);
  }
  assert.equal(isRichTextImageScope('unknown'), false);
  assert.equal(getRichTextImagePermissionFromPath('/api/admin/editor-images/unknown/upload'), null);
  assert.equal(getApiPermission('/api/admin/editor-images/unknown/upload', 'POST'), null);
});

test('rich-text image metadata enforces size, MIME and matching extension', () => {
  assert.deepEqual(
    validateRichTextImageMetadata({ name: 'Ảnh sản phẩm.JPEG', size: 1024, type: 'image/jpeg' }),
    { mimeType: 'image/jpeg', extension: '.jpg' },
  );
  assert.throws(
    () => validateRichTextImageMetadata({ name: 'image.svg', size: 1024, type: 'image/svg+xml' }),
    /Chỉ hỗ trợ ảnh/,
  );
  assert.throws(
    () => validateRichTextImageMetadata({ name: 'renamed.jpg', size: 1024, type: 'image/png' }),
    /đúng định dạng/,
  );
  assert.throws(
    () => validateRichTextImageMetadata({ name: 'empty.png', size: 0, type: 'image/png' }),
    /không có nội dung/,
  );
  assert.throws(
    () => validateRichTextImageMetadata({ name: 'large.webp', size: MAX_RICH_TEXT_IMAGE_SIZE + 1, type: 'image/webp' }),
    /10MB/,
  );
});

test('rich-text image paths are scoped, dated, encoded and remain under MEDIA_ROOT', () => {
  const relativePath = buildRichTextImageRelativePath(
    'articles',
    '11111111-1111-4111-8111-111111111111.jpg',
    new Date(2026, 6, 16),
  );
  assert.equal(relativePath, 'rich-text/articles/16072026/11111111-1111-4111-8111-111111111111.jpg');
  assert.equal(
    buildRichTextImageUrl('rich-text/articles/16072026/a b.jpg'),
    '/api/media/rich-text/articles/16072026/a%20b.jpg',
  );
  assert.equal(isPathInside('D:\\web-tech\\media', 'D:\\web-tech\\media\\rich-text\\articles\\a.jpg'), true);
  assert.equal(isPathInside('D:\\web-tech\\media', 'D:\\web-tech\\outside\\a.jpg'), false);
});

test('image signatures reject content that does not match the declared MIME', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  assert.equal(matchesImageSignature(png, 'image/png'), true);
  assert.equal(matchesImageSignature(png, 'image/jpeg'), false);
  assert.equal(matchesImageSignature(Buffer.from('<svg></svg>'), 'image/png'), false);
});
