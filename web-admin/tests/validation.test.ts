import assert from 'node:assert/strict';
import test from 'node:test';
import { cartQuoteSchema, customerAddressSchema, customerProfileSchema, customerRegistrationSchema, emailSchema, normalizeVietnamPhone, orderSchema, phoneSchema } from '../src/lib/commerceValidation';

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
    delivery: { method: 'shipping', provinceCode: '01', province: 'Hà Nội', wardCode: '00001', ward: 'Ba Đình', address: 'Số 1 Tràng Tiền', note: '' },
    paymentMethod: 'cod', receiver: {}, invoice: {}, note: '', voucherCode: '',
  });
  assert.equal(result.success, true);
  assert.equal(orderSchema.safeParse({ items: [], recaptchaToken: 'token' }).success, false);
});

test('order reports conditional receiver, delivery and invoice field paths', () => {
  const result = orderSchema.safeParse({
    items: [{ productId: 1, quantity: 1 }], recaptchaToken: '', website: '',
    customer: { name: 'Nguyễn Văn An', phone: '0912345678', email: '' },
    receiver: { enabled: true, name: '', phone: '' },
    delivery: { method: 'shipping', provinceCode: '', province: '', wardCode: '', ward: '', address: '', note: '' },
    invoice: { enabled: true, companyName: '', taxCode: '123', address: '', email: '' },
    paymentMethod: 'cod', note: '', voucherCode: '',
  });
  assert.equal(result.success, false);
  if (result.success) return;
  const paths = new Set(result.error.issues.map((issue) => issue.path.join('.')));
  for (const path of ['receiver.name', 'receiver.phone', 'delivery.provinceCode', 'delivery.wardCode', 'delivery.address', 'invoice.companyName', 'invoice.taxCode', 'invoice.address', 'invoice.email']) assert.equal(paths.has(path), true, path);
});

test('registration requires strong matching passwords but lets verifier handle an empty captcha token', () => {
  const valid = customerRegistrationSchema.safeParse({ name: 'Nguyễn Văn An', email: 'an@example.com', phone: '+84 912 345 678', password: 'Secure1@', confirm: 'Secure1@', website: '', recaptchaToken: '' });
  assert.equal(valid.success, true);
  assert.equal(customerRegistrationSchema.safeParse({ name: 'Nguyễn Văn An', email: 'an@example.com', phone: '0912345678', password: 'weakpass', confirm: 'different', website: '', recaptchaToken: '' }).success, false);
});

test('profile date and address schemas reject impossible values', () => {
  assert.equal(customerProfileSchema.safeParse({ name: 'Nguyễn Văn An', gender: '', birthday: '2025-02-30' }).success, false);
  assert.equal(customerAddressSchema.safeParse({ recipientName: 'An', phone: '0912345678', type: 'home', address: '1A', provinceCode: '01', wardCode: '00001' }).success, false);
});
