import assert from 'node:assert/strict';
import test from 'node:test';
import type { RowDataPacket } from 'mysql2/promise';
import { normalizeSpecialCollectionPayload } from '../src/lib/admin/special-collections';

test('collection payload defaults legacy icon and boolean states when creating', () => {
  const payload = normalizeSpecialCollectionPayload({
    name: 'Gợi ý cho bạn',
    url: 'goi-y-cho-ban',
    ordering: '12',
    status: '1',
  });

  assert.equal(payload.iconUrl, 'Gợi ý cho bạn');
  assert.equal(payload.ordering, 12);
  assert.equal(payload.status, 1);
  assert.equal(payload.homePage, '0');
});

test('collection payload preserves an existing legacy icon when edit omits iconUrl', () => {
  const existing = {
    icon_url: 'legacy-collection-icon',
    parent_id: 0,
    ordering: 7,
    home_page: '1',
    status: 1,
    create_by: 'legacy-admin',
  } as RowDataPacket;

  const payload = normalizeSpecialCollectionPayload({
    name: 'Tên bộ sưu tập mới',
    url: 'ten-bo-suu-tap-moi',
  }, existing);

  assert.equal(payload.iconUrl, 'legacy-collection-icon');
  assert.equal(payload.ordering, 7);
  assert.equal(payload.status, 1);
  assert.equal(payload.homePage, '1');
});

test('collection payload keeps explicit icon compatibility and normalizes zero states', () => {
  const payload = normalizeSpecialCollectionPayload({
    name: 'Bộ sưu tập',
    url: 'bo-suu-tap',
    iconUrl: 'explicit-icon',
    status: '0',
    homePage: '0',
  });

  assert.equal(payload.iconUrl, 'explicit-icon');
  assert.equal(payload.status, 0);
  assert.equal(payload.homePage, '0');
});
