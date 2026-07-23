import assert from 'node:assert/strict';
import test from 'node:test';
import { comboOrderSchema } from '../src/lib/commerceValidation';
import { adminComboSetSchema, calculateComboUnitDiscount, comboQuoteSchema, parseLegacyComboConfig, pickHighestComboProduct, serializeLegacyComboConfig } from '../src/lib/comboSets';
import { getApiPermission, getPagePermission } from '../src/lib/admin/permissions';
import {
  comboEndTimeMode,
  defaultLimitedEndTime,
  parseComboDatetimeLocal,
  resolveComboEndTime,
} from '../src/components/products/combo-set/edit/comboSetTime';
import {
  normalizeComboNumericText,
  prependComboItem,
} from '../src/components/products/combo-set/edit/comboSetEditorState';
import {
  canonicalizeCategoryRoots,
  collectCategoryDescendants,
} from '../src/lib/categoryHierarchy';

test('combo-set create navigation and API permissions use the intended contracts', () => {
  assert.equal(getPagePermission('/product/combo-set/edit'), 'catalog.combo_sets.read');
  assert.equal(getApiPermission('/api/admin/combo-sets', 'POST'), 'catalog.combo_sets.create');
  assert.equal(getApiPermission('/api/admin/combo-sets/12', 'PATCH'), 'catalog.combo_sets.update');
  assert.equal(getApiPermission('/api/admin/combo-sets/12/scope', 'PATCH'), 'catalog.combo_sets.update');
  assert.equal(getApiPermission('/api/admin/combo-sets/12', 'DELETE'), 'catalog.combo_sets.delete');
});

test('combo category scope keeps minimal roots and expands descendants without cycling', () => {
  const rows = [
    { id: 1, parentId: 0 },
    { id: 2, parentId: 1 },
    { id: 3, parentId: 2 },
    { id: 4, parentId: 4 },
  ];
  const parents = new Map(rows.map((row) => [row.id, row.parentId]));
  assert.deepEqual(canonicalizeCategoryRoots([3, 1, 2, 1], parents), [1]);
  assert.deepEqual(collectCategoryDescendants([1], rows), [1, 2, 3]);
  assert.deepEqual(collectCategoryDescendants([4], rows), [4]);
});

test('combo end-time mode treats zero as unlimited and positive timestamps as limited', () => {
  assert.equal(comboEndTimeMode(0), 'unlimited');
  assert.equal(comboEndTimeMode(1_800_000_000), 'limited');
  assert.deepEqual(
    resolveComboEndTime({ mode: 'unlimited', fromTimeValue: '2026-08-01T10:00', toTimeValue: '' }),
    { toTime: 0, error: '' },
  );
});

test('limited combo end time defaults to thirty days after its start', () => {
  const start = '2026-08-01T10:00';
  const end = defaultLimitedEndTime(start, 0);
  assert.equal(
    parseComboDatetimeLocal(end) - parseComboDatetimeLocal(start),
    30 * 24 * 60 * 60,
  );

  const fixedNow = new Date(2026, 6, 24, 9, 30).getTime();
  assert.equal(
    parseComboDatetimeLocal(defaultLimitedEndTime('', fixedNow)) - Math.floor(fixedNow / 1000),
    30 * 24 * 60 * 60,
  );
});

test('limited combo end time validates missing and non-increasing dates', () => {
  assert.match(
    resolveComboEndTime({ mode: 'limited', fromTimeValue: '2026-08-01T10:00', toTimeValue: '' }).error,
    /chọn thời gian kết thúc/i,
  );
  assert.match(
    resolveComboEndTime({
      mode: 'limited',
      fromTimeValue: '2026-08-01T10:00',
      toTimeValue: '2026-08-01T09:00',
    }).error,
    /sau thời gian bắt đầu/i,
  );
  assert.equal(
    resolveComboEndTime({
      mode: 'limited',
      fromTimeValue: '2026-08-01T10:00',
      toTimeValue: '2026-08-31T10:00',
    }).toTime,
    parseComboDatetimeLocal('2026-08-31T10:00'),
  );
});

test('admin combo validation accepts the zero unlimited-time sentinel', () => {
  assert.equal(adminComboSetSchema.safeParse({
    title: 'Combo không giới hạn',
    description: '',
    status: 1,
    fromTime: 1_800_000_000,
    toTime: 0,
    groups: [],
  }).success, true);
});

test('combo editor normalizes numeric text and prepends a newly created group', () => {
  assert.equal(normalizeComboNumericText('100.000đ'), '100000');
  assert.equal(normalizeComboNumericText(''), '');
  assert.deepEqual(
    prependComboItem(
      [{ title: 'Nhóm cũ' }],
      { title: 'Nhóm mới' },
    ),
    [{ title: 'Nhóm mới' }, { title: 'Nhóm cũ' }],
  );
});

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
    delivery: { method: 'shipping', provinceCode: '01', province: 'Hà Nội', wardCode: '00001', ward: 'Bạch Mai', address: '124 Minh Khai', note: '' },
    paymentMethod: 'bank_transfer',
    invoice: {},
    note: '',
  });
  assert.equal(result.success, true);
});
