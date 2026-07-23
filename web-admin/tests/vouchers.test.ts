import assert from 'node:assert/strict';
import test from 'node:test';
import {
  filterCategoryTreeForSearch,
  nextCategoryScopeSelection,
  normalizeCategorySearch,
  type CategoryScopeItem,
  type VisibleCategoryScopeNode,
} from '../src/components/shared/CategoryScopeSelector';
import {
  normalizeVoucherDigits,
  validateVoucherNumericFields,
} from '../src/components/vouchers/voucherForm';
import {
  normalizeVoucherProductIds,
  productMatchesVoucherCategories,
  productMatchesVoucherScope,
} from '../src/lib/vouchers';

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

test('voucher product scope applies globally only when both scope lists are empty', () => {
  assert.equal(productMatchesVoucherScope(100, [610], [], [], parentById), true);
  assert.equal(productMatchesVoucherScope(100, [610], [200], [], parentById), false);
  assert.equal(productMatchesVoucherScope(100, [610], [], [6], parentById), false);
});

test('voucher product and category scopes are combined with OR semantics', () => {
  assert.equal(productMatchesVoucherScope(100, [610], [100], [6], parentById), true);
  assert.equal(productMatchesVoucherScope(200, [600], [100], [6], parentById), true);
  assert.equal(productMatchesVoucherScope(300, [610], [100], [6], parentById), false);
});

test('voucher product ids are normalized, deduplicated and bounded', () => {
  assert.deepEqual(normalizeVoucherProductIds([3, '2', 3, 0, -1, 'invalid']), [3, 2]);
  assert.deepEqual(normalizeVoucherProductIds(undefined), []);
  assert.throws(
    () => normalizeVoucherProductIds(Array.from({ length: 501 }, (_, index) => index + 1)),
    /tối đa 500/,
  );
});

test('voucher numeric text input keeps only digits', () => {
  assert.equal(normalizeVoucherDigits('1.000 đ'), '1000');
  assert.equal(normalizeVoucherDigits(' 25% '), '25');
  assert.equal(normalizeVoucherDigits(''), '');
});

test('valid voucher numeric text is converted to the API number payload', () => {
  const result = validateVoucherNumericFields({
    quantityMode: 'limited',
    totalQuantity: '25',
    discountType: 'percent',
    discountValue: '15',
    maxDiscount: '50000',
    minimumOrderValue: '',
  });
  assert.deepEqual(result.errors, {});
  assert.deepEqual(result.payload, {
    totalQuantity: 25,
    discountValue: 15,
    maxDiscount: 50000,
    minimumOrderValue: 0,
  });
});

test('voucher numeric validation enforces limited quantity and percentage boundaries', () => {
  const result = validateVoucherNumericFields({
    quantityMode: 'limited',
    totalQuantity: '',
    discountType: 'percent',
    discountValue: '101',
    maxDiscount: '1500',
    minimumOrderValue: '0',
  });
  assert.equal(result.payload, null);
  assert.ok(result.errors.totalQuantity);
  assert.ok(result.errors.discountValue);
  assert.ok(result.errors.maxDiscount);
  assert.equal(result.errors.minimumOrderValue, undefined);
});

test('fixed vouchers ignore hidden percentage-only numeric fields', () => {
  const result = validateVoucherNumericFields({
    quantityMode: 'unlimited',
    totalQuantity: '',
    discountType: 'fixed',
    discountValue: '1000',
    maxDiscount: '',
    minimumOrderValue: '250000',
  });
  assert.deepEqual(result.errors, {});
  assert.deepEqual(result.payload, {
    totalQuantity: 1,
    discountValue: 1000,
    maxDiscount: 1000,
    minimumOrderValue: 250000,
  });
});

test('category search is accent-insensitive and retains the matching ancestor path', () => {
  const tree: VisibleCategoryScopeNode[] = [{
    id: 1,
    name: 'Thiết bị',
    parentId: 0,
    status: 1,
    children: [{
      id: 2,
      name: 'Màn hình Gaming',
      parentId: 1,
      status: 1,
      children: [],
    }],
  }];
  const result = filterCategoryTreeForSearch(tree, normalizeCategorySearch('man hinh'));
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 1);
  assert.deepEqual(result[0].children.map((category) => category.id), [2]);
});

test('selecting a category removes conflicting ancestors and descendants', () => {
  const categories: CategoryScopeItem[] = [
    { id: 1, name: 'Laptop', parentId: 0, status: 1 },
    { id: 2, name: 'Laptop theo hãng', parentId: 1, status: 1 },
    { id: 3, name: 'Laptop ASUS', parentId: 2, status: 1 },
  ];
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const childrenByParent = new Map<number, number[]>([[0, [1]], [1, [2]], [2, [3]]]);

  assert.deepEqual(nextCategoryScopeSelection(2, [1], categoryById, childrenByParent), [2]);
  assert.deepEqual(nextCategoryScopeSelection(1, [3], categoryById, childrenByParent), [1]);
  assert.deepEqual(nextCategoryScopeSelection(2, [2], categoryById, childrenByParent), []);
});
