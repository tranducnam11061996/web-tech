import assert from 'node:assert/strict';
import test from 'node:test';
import { AdminApiError } from '../src/lib/admin/common';
import {
  collectCategoryAncestors,
  normalizePromotionDetailUrl,
  parseProductPromotionPayload,
  resolveProductPromotionState,
} from '../src/lib/productPromotions';

test('product promotion accepts safe internal and HTTPS detail URLs', () => {
  assert.equal(normalizePromotionDetailUrl('/khuyen-mai/laptop'), '/khuyen-mai/laptop');
  assert.equal(normalizePromotionDetailUrl('https://example.com/deal?a=1'), 'https://example.com/deal?a=1');
  for (const value of ['//evil.example', 'http://example.com', 'javascript:alert(1)', '/safe\\unsafe', '/unsafe path', "/unsafe\npath"]) {
    assert.throws(() => normalizePromotionDetailUrl(value), (error: unknown) => error instanceof AdminApiError && error.status === 400);
  }
});

test('product promotion requires a bounded non-global scope', () => {
  assert.throws(
    () => parseProductPromotionPayload({ displayText: 'Ưu đãi', detailUrl: '/uu-dai', status: true, displayOrder: 0, productIds: [], categoryIds: [] }),
    (error: unknown) => error instanceof AdminApiError && error.fields?.scope === 'required',
  );
  const parsed = parseProductPromotionPayload({
    displayText: '  Tặng balo  ', detailUrl: '/uu-dai', status: true, displayOrder: 2,
    startsAt: '2026-07-13T08:00', endsAt: '2026-07-14T08:00', productIds: [1, 1, 2], categoryIds: [6],
  });
  assert.equal(parsed.displayText, 'Tặng balo');
  assert.deepEqual(parsed.productIds, [1, 2]);
  assert.deepEqual(parsed.categoryIds, [6]);
  assert.equal(parsed.startsAt, '2026-07-13 01:00:00');
});

test('product promotion validates complete ordered Vietnam-time ranges', () => {
  const base = { displayText: 'Ưu đãi', detailUrl: '/uu-dai', status: true, displayOrder: 0, productIds: [1], categoryIds: [] };
  assert.throws(() => parseProductPromotionPayload({ ...base, startsAt: '2026-07-13T08:00', endsAt: '' }));
  assert.throws(() => parseProductPromotionPayload({ ...base, startsAt: '2026-07-14T08:00', endsAt: '2026-07-13T08:00' }));
});

test('product promotion state handles disabled, scheduled, active and end boundary', () => {
  const now = new Date('2026-07-13T02:00:00Z');
  assert.equal(resolveProductPromotionState(0, null, null, now), 'disabled');
  assert.equal(resolveProductPromotionState(1, '2026-07-13T03:00:00Z', '2026-07-13T04:00:00Z', now), 'scheduled');
  assert.equal(resolveProductPromotionState(1, '2026-07-13T01:00:00Z', '2026-07-13T03:00:00Z', now), 'active');
  assert.equal(resolveProductPromotionState(1, '2026-07-13T01:00:00Z', '2026-07-13T02:00:00Z', now), 'expired');
});

test('category ancestor collection includes descendants once and terminates on cycles', () => {
  const parents = new Map<number, number>([[600, 60], [60, 6], [6, 0], [1, 2], [2, 1]]);
  assert.deepEqual(collectCategoryAncestors([600], parents), [600, 60, 6]);
  assert.deepEqual(collectCategoryAncestors([1], parents), [1, 2]);
});
