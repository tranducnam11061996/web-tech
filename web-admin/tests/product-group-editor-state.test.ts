import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assignQuickValueToProduct,
  createOrReuseProductGroupValue,
  prependProductGroupAttribute,
} from '../src/components/product-group/productGroupEditorState';
import type {
  ProductGroupAttributeForm,
  ProductGroupDetails,
  ProductGroupValueForm,
} from '../src/components/product-group/types';

const value = (key: string, name: string, ordering: number): ProductGroupValueForm => ({
  key,
  name,
  description: '',
  ordering,
});

const attribute = (
  key: string,
  ordering: number,
  values: ProductGroupValueForm[],
): ProductGroupAttributeForm => ({
  key,
  name: key,
  ordering,
  values,
});

test('prepends a new attribute and normalizes attribute and value ordering', () => {
  const existing = attribute('existing', 9, [value('old-a', 'A', 5), value('old-b', 'B', 8)]);
  const incoming = attribute('incoming', 7, [value('new-a', '', 4)]);
  const result = prependProductGroupAttribute([existing], incoming);

  assert.deepEqual(result.map((item) => [item.key, item.ordering]), [
    ['incoming', 0],
    ['existing', 1],
  ]);
  assert.deepEqual(result[1].values.map((item) => item.ordering), [0, 1]);
});

test('creates a value and assigns it to the active SKU in the same state result', () => {
  const group: ProductGroupDetails = {
    name: 'PC',
    description: '',
    attributes: [attribute('gpu', 0, [value('rtx-4060', 'RTX 4060', 0)])],
    products: [{
      productId: 10,
      sku: 'SKU-10',
      name: 'PC 10',
      brandId: 1,
      brandName: 'PCM',
      thumbnail: '',
      price: 1,
      marketPrice: 1,
      status: 1,
      selections: [],
    }],
  };

  const result = assignQuickValueToProduct(group, {
    attributeKey: 'gpu',
    productId: 10,
    name: '  RTX   5070  ',
    createKey: () => 'rtx-5070',
  });

  assert.deepEqual(result.attributes[0].values.map((item) => [item.key, item.name]), [
    ['rtx-4060', 'RTX 4060'],
    ['rtx-5070', 'RTX 5070'],
  ]);
  assert.deepEqual(result.products[0].selections, [{
    attributeKey: 'gpu',
    valueKey: 'rtx-5070',
  }]);
});

test('reuses an existing case-insensitive value instead of creating a duplicate', () => {
  const values = [value('rtx-5070', 'RTX 5070', 0)];
  const result = createOrReuseProductGroupValue(values, '  rtx 5070 ', () => 'unused');

  assert.equal(result.values, values);
  assert.equal(result.valueKey, 'rtx-5070');
});

test('fills the first blank value slot before appending a value', () => {
  const values = [value('blank', '   ', 0), value('existing', 'RTX 4060', 1)];
  const result = createOrReuseProductGroupValue(values, 'RTX 5070', () => 'unused');

  assert.deepEqual(result.values.map((item) => [item.key, item.name]), [
    ['blank', 'RTX 5070'],
    ['existing', 'RTX 4060'],
  ]);
  assert.equal(result.valueKey, 'blank');
});

test('rejects empty, overlong, and over-limit quick values while allowing a blank slot at the limit', () => {
  assert.throws(() => createOrReuseProductGroupValue([], '   ', () => 'unused'), /nhập tên value/);
  assert.throws(() => createOrReuseProductGroupValue([], 'x'.repeat(151), () => 'unused'), /150 ký tự/);

  const full = Array.from({ length: 50 }, (_, index) => value(`v-${index}`, `Value ${index}`, index));
  assert.throws(() => createOrReuseProductGroupValue(full, 'Value 51', () => 'unused'), /tối đa 50/);

  const withBlank = [...full.slice(0, 49), value('blank', '', 49)];
  const result = createOrReuseProductGroupValue(withBlank, 'Value 50', () => 'unused');
  assert.equal(result.values.length, 50);
  assert.equal(result.values[49].name, 'Value 50');
});
