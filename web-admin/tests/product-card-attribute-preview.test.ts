import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPreviewBadges } from '../src/components/product-card-attributes/ProductCardAttributeManager';

const product = {
  id: 1,
  name: 'Preview product',
  slug: 'preview-product',
  thumbnail: '/preview.jpg',
  price: 1_000_000,
  marketPrice: 1_200_000,
  brand: 'PCM',
  attributeValues: [{
    attributeId: 6,
    attributeCode: 'cpu',
    attributeName: 'CPU',
    valueId: 60,
    value: 'Intel Core i5',
  }],
};

const duplicateRules = [
  {
    id: 1,
    attrId: 6,
    attributeCode: 'cpu',
    attributeName: 'CPU',
    slot: 'image_top_left' as const,
    colorVariant: 'red' as const,
    labelTemplate: '',
    valueMode: 'value' as const,
    maxValues: 1,
    ordering: 10,
    status: true,
    inheritToChildren: true,
  },
  {
    id: 2,
    attrId: 6,
    attributeCode: 'cpu',
    attributeName: 'CPU',
    slot: 'image_top_left' as const,
    colorVariant: 'blue' as const,
    labelTemplate: '',
    valueMode: 'value' as const,
    maxValues: 1,
    ordering: 20,
    status: true,
    inheritToChildren: true,
  },
];

test('preview emits one stable badge when draft rules repeat an attribute and slot', () => {
  const badges = buildPreviewBadges(product, duplicateRules, []);
  assert.equal(badges.length, 1);
  assert.deepEqual(badges.map((badge) => badge.key), ['6-60-image_top_left']);
});

test('preview deduplicates repeated legacy attribute values before applying the value limit', () => {
  const badges = buildPreviewBadges(
    { ...product, attributeValues: [...product.attributeValues, ...product.attributeValues] },
    [{ ...duplicateRules[0], maxValues: 2 }],
    [],
  );
  assert.equal(badges.length, 1);
  assert.deepEqual(badges.map((badge) => badge.key), ['6-60-image_top_left']);
});
