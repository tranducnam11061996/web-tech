import assert from 'node:assert/strict';
import test from 'node:test';
import type { RowDataPacket } from 'mysql2/promise';
import {
  displayedNewsCategoryId,
  mapPublicNewsCategory,
  NEWS_LANDING_CATEGORY_SLUGS,
  NEWS_LANDING_REVIEW_SLUG,
  parsePublicNewsSort,
  publicNewsOrderBy,
  resolveLandingCategoryScopes,
} from '../src/lib/publicNews';

test('displayed news category uses only the final valid breadcrumb category', () => {
  assert.equal(displayedNewsCategoryId(undefined), null);
  assert.equal(displayedNewsCategoryId([]), null);
  assert.equal(displayedNewsCategoryId([{ id: 1 }, { id: 4 }]), 4);
  assert.equal(displayedNewsCategoryId([{ id: 1 }, { id: 0 }]), null);
});

test('public news sort accepts only latest and popular', () => {
  assert.equal(parsePublicNewsSort(undefined), 'latest');
  assert.equal(parsePublicNewsSort(''), 'latest');
  assert.equal(parsePublicNewsSort('latest'), 'latest');
  assert.equal(parsePublicNewsSort('popular'), 'popular');
  assert.equal(parsePublicNewsSort('oldest'), null);
  assert.equal(parsePublicNewsSort('POPULAR'), null);
});

test('public news sort maps to fixed deterministic SQL fragments', () => {
  assert.equal(publicNewsOrderBy('latest'), 'n.createDate DESC,n.id DESC');
  assert.equal(publicNewsOrderBy('popular'), 'visit DESC,n.createDate DESC,n.id DESC');
});

test('public category mapping exposes featured as a boolean and safe public fields', () => {
  const mapped = mapPublicNewsCategory({
    id: 7,
    name: 'Tin công nghệ',
    url: 'tin-cong-nghe.html',
    summary: '',
    description: '',
    imgUrl: '0',
    totalNews: '12',
    visit: '9000000',
    is_featured: 1,
    admin_note: 'must not leak',
  } as RowDataPacket);

  assert.deepEqual(mapped, {
    id: 7,
    name: 'Tin công nghệ',
    url: 'tin-cong-nghe.html',
    summary: '',
    description: '',
    image: '',
    totalNews: 12,
    visit: 9000000,
    isFeatured: true,
  });
  assert.equal('admin_note' in mapped, false);
});

test('news landing resolves configured active category scopes in presentation order', () => {
  const rows = [
    { id: 79, name: 'Ứng dụng, Phần mềm', url: 'ung-dung-phan-mem' },
    { id: 1, name: 'Tin Công Nghệ', url: 'tin-cong-nghe.html' },
    { id: 76, name: 'Review Sản Phẩm', url: 'review-san-pham' },
    { id: 77, name: 'Game', url: 'game' },
  ] as RowDataPacket[];
  const scopes = resolveLandingCategoryScopes(rows);
  assert.deepEqual(scopes.newsCategories.map((category) => category.url), [
    'tin-cong-nghe.html',
    'game',
    'ung-dung-phan-mem',
  ]);
  assert.deepEqual(scopes.newsCategories.map((category) => category.priority), [0, 2, 4]);
  assert.equal(scopes.reviewCategory?.url, NEWS_LANDING_REVIEW_SLUG);
  assert.deepEqual(NEWS_LANDING_CATEGORY_SLUGS, [
    'tin-cong-nghe.html',
    'thu-thuat-may-tinh.html',
    'game',
    'tin-khuyen-mai',
    'ung-dung-phan-mem',
  ]);
});
