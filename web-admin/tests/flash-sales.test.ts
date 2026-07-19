import assert from 'node:assert/strict';
import test from 'node:test';
import { AdminApiError } from '../src/lib/admin/common';
import { parseFlashSalePayload, resolveFlashSaleState } from '../src/lib/flashSales';

const validPayload = () => ({
  code: 'fs-weekend-01',
  name: 'Flash Sale cuối tuần',
  slug: 'flash-sale-cuoi-tuan',
  status: 'draft',
  stackingMode: 'exclusive',
  audienceMode: 'all',
  countdownStartsAt: '2026-07-17T13:00',
  startsAt: '2026-07-17T14:00',
  endsAt: '2026-07-19T23:30',
  items: [{
    productId: 101,
    flashPrice: 249_000,
    quotaTotal: 12,
    minQuantityPerOrder: 1,
    maxQuantityPerOrder: 2,
    maxQuantityPerBuyer: 3,
  }],
});

function expectFieldError(action: () => unknown, field: string) {
  assert.throws(action, (error: unknown) => {
    assert.ok(error instanceof AdminApiError);
    assert.equal(error.status, 400);
    assert.ok(error.fields?.[field] || error.fields?.items);
    return true;
  });
}

test('Flash Sale form times are normalized from Vietnam time to UTC', () => {
  const parsed = parseFlashSalePayload(validPayload());
  assert.equal(parsed.code, 'FS-WEEKEND-01');
  assert.equal(parsed.countdownStartsAt, '2026-07-17 06:00:00');
  assert.equal(parsed.startsAt, '2026-07-17 07:00:00');
  assert.equal(parsed.endsAt, '2026-07-19 16:30:00');
  assert.equal(parsed.items[0].maxQuantityPerBuyer, 3);
});

test('Flash Sale runtime state uses half-open start/end boundaries', () => {
  const start = '2026-07-17 07:00:00';
  const end = '2026-07-19 16:30:00';
  assert.equal(resolveFlashSaleState('published', start, end, new Date('2026-07-17T06:59:59Z')), 'scheduled');
  assert.equal(resolveFlashSaleState('published', start, end, new Date('2026-07-17T07:00:00Z')), 'active');
  assert.equal(resolveFlashSaleState('published', start, end, new Date('2026-07-19T16:30:00Z')), 'ended');
  assert.equal(resolveFlashSaleState('paused', start, end), 'paused');
});

test('Flash Sale rejects duplicate SKU rows', () => {
  const payload = validPayload();
  payload.items.push({ ...payload.items[0] });
  expectFieldError(() => parseFlashSalePayload(payload), 'items');
});

test('Flash Sale enforces order limits within the promotional quota', () => {
  const payload = validPayload();
  payload.items[0].quotaTotal = 1;
  payload.items[0].maxQuantityPerOrder = 2;
  expectFieldError(() => parseFlashSalePayload(payload), 'items.0.maxQuantityPerOrder');
});

test('Flash Sale rejects countdowns after opening and invalid date ranges', () => {
  const lateCountdown = validPayload();
  lateCountdown.countdownStartsAt = '2026-07-17T15:00';
  expectFieldError(() => parseFlashSalePayload(lateCountdown), 'countdownStartsAt');

  const reversed = validPayload();
  reversed.endsAt = reversed.startsAt;
  expectFieldError(() => parseFlashSalePayload(reversed), 'endsAt');
});
