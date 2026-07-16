import assert from 'node:assert/strict';
import test from 'node:test';
import {
  aggregatePageViewRows,
  normalizePageViewPath,
  pageViewEventIdBuffer,
  pageViewSourceMatches,
} from '../src/lib/pageViews';

test('page-view paths accept only bounded canonical detail paths', () => {
  assert.equal(normalizePageViewPath('/may-tinh-de-ban'), '/may-tinh-de-ban');
  assert.equal(normalizePageViewPath('/tin-tuc/tin-cong-nghe.html'), '/tin-tuc/tin-cong-nghe.html');
  assert.equal(normalizePageViewPath('/tin-tuc'), '/tin-tuc');
  assert.equal(normalizePageViewPath('//attacker.example/path'), null);
  assert.equal(normalizePageViewPath('/product/'), null);
  assert.equal(normalizePageViewPath('/product?page=2'), null);
  assert.equal(normalizePageViewPath('/product#content'), null);
  assert.equal(normalizePageViewPath(`/${'a'.repeat(301)}`), null);
});

test('page-view event IDs accept only UUID v4 and use a compact binary key', () => {
  const value = pageViewEventIdBuffer('4f7369ae-9e07-4d39-960f-3ff3ea273b66');
  assert.ok(value);
  assert.equal(value.length, 16);
  assert.equal(pageViewEventIdBuffer('4f7369ae-9e07-1d39-960f-3ff3ea273b66'), null);
  assert.equal(pageViewEventIdBuffer('not-a-uuid'), null);
});

test('page-view source requires a same-origin referer for the exact pathname', () => {
  const valid = {
    origin: 'https://shop.example',
    referer: 'https://shop.example/tin-tuc/cong-nghe?sort=popular',
    fetchSite: 'same-origin',
    path: '/tin-tuc/cong-nghe',
  };
  assert.equal(pageViewSourceMatches(valid), true);
  assert.equal(pageViewSourceMatches({ ...valid, origin: null }), false);
  assert.equal(pageViewSourceMatches({ ...valid, referer: null }), false);
  assert.equal(pageViewSourceMatches({ ...valid, referer: 'https://evil.example/tin-tuc/cong-nghe' }), false);
  assert.equal(pageViewSourceMatches({ ...valid, path: '/tin-tuc/khac' }), false);
  assert.equal(pageViewSourceMatches({ ...valid, fetchSite: 'cross-site' }), false);
});

test('page-view batches aggregate independently by entity type and ID', () => {
  assert.deepEqual(aggregatePageViewRows([
    { entity_type: 'product', entity_id: 11 },
    { entity_type: 'product', entity_id: 11 },
    { entity_type: 'product_category', entity_id: 11 },
    { entity_type: 'article', entity_id: 7 },
  ]), [
    { entityType: 'product', entityId: 11, count: 2 },
    { entityType: 'product_category', entityId: 11, count: 1 },
    { entityType: 'article', entityId: 7, count: 1 },
  ]);
});
