import assert from 'node:assert/strict';
import test from 'node:test';
import { productMatchesVoucherCategories } from '../src/lib/vouchers';

const parentById = new Map<number, number>([
  [6, 0],
  [60, 6],
  [600, 60],
  [137, 0],
  [610, 137],
]);

test('a voucher without category restrictions applies globally', () => {
  assert.equal(productMatchesVoucherCategories([610], [], parentById), true);
});

test('a voucher category applies to products linked to any descendant', () => {
  assert.equal(productMatchesVoucherCategories([600], [6], parentById), true);
  assert.equal(productMatchesVoucherCategories([6], [6], parentById), true);
});

test('a voucher category does not apply outside its category tree', () => {
  assert.equal(productMatchesVoucherCategories([610], [6], parentById), false);
  assert.equal(productMatchesVoucherCategories([], [6], parentById), false);
});

test('category matching terminates safely when legacy category data cycles', () => {
  const cyclicParents = new Map<number, number>([[1, 2], [2, 1]]);
  assert.equal(productMatchesVoucherCategories([1], [3], cyclicParents), false);
});
