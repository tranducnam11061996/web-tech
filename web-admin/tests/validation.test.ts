import assert from 'node:assert/strict';
import test from 'node:test';
import { cartQuoteSchema, customerAddressSchema, customerProfileSchema, emailSchema, normalizeVietnamPhone, orderSchema, phoneSchema } from '../src/lib/commerceValidation';

test('normalizes Vietnamese phone numbers and rejects invalid prefixes', () => {
  assert.equal(normalizeVietnamPhone('+84 912 345 678'), '0912345678');
  assert.equal(phoneSchema.parse('84-912-345-678'), '0912345678');
  assert.equal(phoneSchema.safeParse('0123456789').success, false);
});

test('normalizes email and rejects malformed values', () => {
  assert.equal(emailSchema.parse(' Test@Example.COM '), 'test@example.com');
  assert.equal(emailSchema.safeParse('not-an-email').success, false);
});

test('cart has strict quantity and item limits', () => {
  assert.equal(cartQuoteSchema.parse({ items: [{ productId: 1, quantity: 2 }] }).items[0].quantity, 2);
  assert.equal(cartQuoteSchema.safeParse({ items: [{ productId: 1, quantity: 0 }] }).success, false);
  assert.equal(cartQuoteSchema.safeParse({ items: Array.from({ length: 51 }, (_, index) => ({ productId: index + 1, quantity: 1 })) }).success, false);
});

test('order validates customer and delivery data', () => {
  const result = orderSchema.safeParse({
    items: [{ productId: 1, quantity: 1 }], recaptchaToken: 'token', website: '',
    customer: { name: 'Nguyễn Văn An', phone: '0912345678', email: 'an@example.com' },
    delivery: { method: 'shipping', province: 'Hà Nội', ward: 'Ba Đình', address: 'Số 1 Tràng Tiền', note: '' },
    paymentMethod: 'cod', receiver: {}, invoice: {}, note: '', voucherCode: '',
  });
  assert.equal(result.success, true);
  assert.equal(orderSchema.safeParse({ items: [], recaptchaToken: 'token' }).success, false);
});

test('profile date and address schemas reject impossible values', () => {
  assert.equal(customerProfileSchema.safeParse({ name: 'Nguyễn Văn An', gender: '', birthday: '2025-02-30' }).success, false);
  assert.equal(customerAddressSchema.safeParse({ recipientName: 'An', phone: '0912345678', type: 'home', address: '1A', provinceCode: '01', wardCode: '00001' }).success, false);
});
