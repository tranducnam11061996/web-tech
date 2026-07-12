import assert from 'node:assert/strict';
import test from 'node:test';
import { comboOrderSchema } from '../src/lib/commerceValidation';
import { adminComboSetSchema, calculateComboUnitDiscount, comboQuoteSchema, parseLegacyComboConfig, pickHighestComboProduct, serializeLegacyComboConfig } from '../src/lib/comboSets';

test('round-trips legacy number and percent discount types', () => {
  const groups = [{ title: 'Phụ kiện', products: [
    { title: 'Chuột', productId: 11, discount: 150_000, discountType: 'fixed' as const },
    { title: 'Tai nghe', productId: 12, discount: 15, discountType: 'percent' as const },
  ] }];
  assert.deepEqual(parseLegacyComboConfig(serializeLegacyComboConfig(groups)), groups);
});

test('fixed and percent discounts are rounded and capped at one unit price', () => {
  assert.equal(calculateComboUnitDiscount(999_999, { discount: 15, discountType: 'percent' }), 150_000);
  assert.equal(calculateComboUnitDiscount(100_000, { discount: 500_000, discountType: 'fixed' }), 100_000);
  assert.equal(calculateComboUnitDiscount(100_000, { discount: 0, discountType: 'fixed' }), 0);
});

test('highest-price winner uses config order for equal prices', () => {
  const first = { id: 1, price: 500_000, configIndex: 2 };
  const earlier = { id: 2, price: 500_000, configIndex: 0 };
  assert.equal(pickHighestComboProduct([first, earlier])?.id, 2);
  assert.equal(pickHighestComboProduct([{ id: 3, price: 700_000, configIndex: 5 }, earlier])?.id, 3);
});

test('admin validation rejects duplicate group products and invalid periods', () => {
  const result = adminComboSetSchema.safeParse({ title: 'Combo', description: '', status: 1, fromTime: 20, toTime: 10, groups: [{ title: 'Nhóm', products: [
    { title: 'A', productId: 1, discount: 10, discountType: 'percent' },
    { title: 'B', productId: 1, discount: 10, discountType: 'fixed' },
  ] }] });
  assert.equal(result.success, false);
  if (!result.success) assert.ok(result.error.issues.some((issue) => issue.path.join('.').includes('productId')));
});

test('combo quote accepts only the canonical API payload and rejects storage metadata', () => {
  const canonical = {
    anchorProductId: 76158,
    comboSetId: 503,
    revision: 'dfce6dc5462bdec3f275',
    items: [{ groupIndex: 5, productId: 51783, quantity: 1 }],
  };
  assert.equal(comboQuoteSchema.safeParse(canonical).success, true);
  assert.equal(comboQuoteSchema.safeParse({ version: 1, ...canonical }).success, false);
});

test('combo order permits an empty token to reach the explicit local CAPTCHA bypass', () => {
  const result = comboOrderSchema.safeParse({
    anchorProductId: 76158,
    comboSetId: 503,
    revision: 'dfce6dc5462bdec3f275',
    items: [{ groupIndex: 5, productId: 51783, quantity: 1 }],
    recaptchaToken: '',
    website: '',
    customer: { name: 'Test User', phone: '0985266959', email: 'test@example.com' },
    receiver: {},
    delivery: { method: 'shipping', province: 'Hà Nội', ward: 'Bạch Mai', address: '124 Minh Khai', note: '' },
    paymentMethod: 'bank_transfer',
    invoice: {},
    note: '',
  });
  assert.equal(result.success, true);
});
