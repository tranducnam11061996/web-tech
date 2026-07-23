import assert from 'node:assert/strict';
import test from 'node:test';
import {
  brandDescriptionPreview,
  normalizeAdminBrandPayload,
} from '../src/lib/admin/brands';
import {
  buildBrandLogoRelativePath,
  buildBrandLogoUrl,
  normalizeBrandImageValue,
  validateBrandLogoMetadata,
} from '../src/lib/admin/brand-images';
import { getApiPermission } from '../src/lib/admin/permissions';

const validPayload = {
  name: 'Intel',
  summary: 'Lời nhắn ngắn',
  description: '<p>Nội dung thương hiệu</p>',
  ordering: 10,
  status: true,
  featured: false,
  metaTitle: 'Intel chính hãng',
  metaKeywords: 'intel,cpu',
  metaDescription: 'Sản phẩm Intel chính hãng',
};

test('brand payload keeps summary and rich-text description as separate fields', () => {
  const result = normalizeAdminBrandPayload(validPayload);
  assert.equal(result.name, 'Intel');
  assert.equal(result.summary, 'Lời nhắn ngắn');
  assert.equal(result.description, '<p>Nội dung thương hiệu</p>');
  assert.equal(result.status, 1);
  assert.equal(result.featured, 0);
});

test('brand payload validates legacy column limits and ordering', () => {
  assert.throws(
    () => normalizeAdminBrandPayload({ ...validPayload, name: '' }),
    /bat buoc/,
  );
  assert.throws(
    () => normalizeAdminBrandPayload({ ...validPayload, name: 'x'.repeat(101) }),
    /100/,
  );
  assert.throws(
    () => normalizeAdminBrandPayload({ ...validPayload, metaTitle: 'x'.repeat(251) }),
    /250/,
  );
  assert.throws(
    () => normalizeAdminBrandPayload({ ...validPayload, ordering: 8_388_608 }),
    /khong hop le/,
  );
  assert.throws(
    () => normalizeAdminBrandPayload({ ...validPayload, ordering: '12abc' }),
    /khong hop le/,
  );
  assert.throws(
    () => normalizeAdminBrandPayload({ ...validPayload, ordering: '' }),
    /khong hop le/,
  );
  assert.equal(normalizeAdminBrandPayload({ ...validPayload, ordering: '-12' }).ordering, -12);
});

test('brand payload accepts an optional safe logo and preserves omission semantics', () => {
  assert.equal(
    normalizeAdminBrandPayload({ ...validPayload, image: '/api/media/brand/24072026/logo.webp' }).image,
    '/api/media/brand/24072026/logo.webp',
  );
  assert.equal(normalizeAdminBrandPayload(validPayload).image, undefined);
  assert.equal(normalizeBrandImageValue('https://pcmarket.vn/media/brand/intel.png'), 'https://pcmarket.vn/media/brand/intel.png');
  assert.throws(() => normalizeBrandImageValue('javascript:alert(1)'), /khong hop le/);
  assert.throws(() => normalizeBrandImageValue('//evil.example/logo.png'), /khong hop le/);
});

test('brand logo upload metadata, path and permission are constrained', () => {
  assert.deepEqual(
    validateBrandLogoMetadata({ name: 'logo.webp', type: 'image/webp', size: 1024 }),
    { mimeType: 'image/webp', extension: '.webp' },
  );
  assert.throws(
    () => validateBrandLogoMetadata({ name: 'logo.svg', type: 'image/svg+xml', size: 1024 }),
    /jpg, png, webp.*gif/i,
  );
  const relativePath = buildBrandLogoRelativePath('.webp', new Date('2026-07-24T00:00:00Z'), 'fixture-id');
  assert.equal(relativePath, 'brand/24072026/fixture-id.webp');
  assert.equal(buildBrandLogoUrl(relativePath), '/api/media/brand/24072026/fixture-id.webp');
  assert.equal(
    getApiPermission('/api/admin/brands/images/upload', 'POST'),
    'catalog.brands.update',
  );
});

test('brand list preview removes editor markup and truncates long content', () => {
  assert.equal(
    brandDescriptionPreview('<style>.x{}</style><p>Intel &amp; AMD&nbsp;</p>'),
    'Intel & AMD',
  );
  assert.equal(brandDescriptionPreview(`<p>${'a'.repeat(30)}</p>`, 20), `${'a'.repeat(19)}…`);
});
