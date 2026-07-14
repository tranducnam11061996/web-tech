import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPublicAttributeFilterIndex,
  groupPublicCategoryAttributeRows,
  selectEligiblePublicCategoryAttributeRows,
  type PublicCategoryAttributeRow,
} from '../src/lib/publicCategoryAttributes';

function row(overrides: Partial<PublicCategoryAttributeRow> = {}) {
  return {
    attr_id: 1,
    attr_name: 'CPU',
    attribute_icon: '📌',
    filter_code: 'cpu',
    attribute_code: 'cpu',
    val_id: 10,
    val_name: 'Intel Core i5',
    val_api_key: 'intel-core-i5',
    product_count: 0,
    category_ordering: 0,
    value_ordering: 0,
    attribute_status: 1,
    is_search: 1,
    attribute_scope: 0,
    is_mapped: 0,
    ...overrides,
  } as PublicCategoryAttributeRow;
}

test('category attribute eligibility includes global, mapped and actually assigned local values', () => {
  const selected = selectEligiblePublicCategoryAttributeRows([
    row({ attr_id: 1, attribute_scope: 1 }),
    row({ attr_id: 2, is_mapped: 1 }),
    row({ attr_id: 3, product_count: 4 }),
    row({ attr_id: 4 }),
    row({ attr_id: 5, attribute_status: 0, product_count: 3 }),
    row({ attr_id: 6, is_search: 0, product_count: 3 }),
    row({ attr_id: 7, product_count: 3, val_name: 'javascript:alert(1)' }),
    row({ attr_id: 8, product_count: 3, val_api_key: '' }),
  ], true);

  assert.deepEqual(selected.map((item) => item.attr_id), [1, 2, 3]);
});

test('attribute filter index accepts only the stored ApiKey and not a slug rebuilt from the label', () => {
  const index = buildPublicAttributeFilterIndex([
    row({ attr_id: 5, val_id: 56, val_name: 'AMD Ryzen 7', val_api_key: 'ryzen-seven' }),
  ]);
  assert.deepEqual(index.get('cpu')?.valuesByApiKey.get('ryzen-seven'), [56]);
  assert.equal(index.get('cpu')?.valuesByApiKey.has('amd-ryzen-7'), false);
});

test('unscoped product filtering preserves every safe active searchable attribute value', () => {
  const selected = selectEligiblePublicCategoryAttributeRows([
    row({ attr_id: 1 }),
    row({ attr_id: 2, attribute_scope: 1 }),
    row({ attr_id: 3, is_search: 0 }),
  ], false);

  assert.deepEqual(selected.map((item) => item.attr_id), [1, 2]);
});

test('category attribute grouping preserves row order, counts and safe public metadata', () => {
  const grouped = groupPublicCategoryAttributeRows([
    row({ attr_id: 5, val_id: 50, product_count: 12 }),
    row({ attr_id: 5, val_id: 51, val_name: 'Intel Core i7', val_api_key: 'intel-core-i7', product_count: 8 }),
    row({ attr_id: 6, attr_name: 'RAM', filter_code: 'ram', attribute_code: 'ram', val_id: 60, val_name: '16GB', product_count: 9, attribute_icon: 'https://unsafe/icon' }),
  ]);

  assert.deepEqual(grouped.map((attribute) => attribute.id), [5, 6]);
  assert.deepEqual(grouped[0].values, [
    { id: 50, name: 'Intel Core i5', apiKey: 'intel-core-i5', productCount: 12 },
    { id: 51, name: 'Intel Core i7', apiKey: 'intel-core-i7', productCount: 8 },
  ]);
  assert.equal(grouped[1].icon, null);
});
