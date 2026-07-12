import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildPublicProductGroup,
  parseLegacyAttributeConfig,
  parseProductGroupPayload,
  resolveProductGroupThumbnail,
  serializeAttributeConfig,
} from '../src/lib/productGroups';

const attributes = [
  { id: 10, groupId: 3, name: 'Màu sắc', ordering: 0 },
  { id: 11, groupId: 3, name: 'RAM', ordering: 1 },
];
const values = [
  { id: 100, attributeId: 10, name: 'Trắng', description: '', ordering: 0 },
  { id: 101, attributeId: 10, name: 'Đen', description: '', ordering: 1 },
  { id: 110, attributeId: 11, name: '16GB', description: '', ordering: 0 },
];

test('parses legacy PHP config and ignores placeholders, unknown values, and mismatched attributes', () => {
  const raw = 'a:4:{i:10;s:3:"100";i:11;s:16:"--Lựa chọn--";i:99;s:3:"999";i:12;s:3:"110";}';
  const parsed = parseLegacyAttributeConfig(raw, attributes, values);
  assert.deepEqual(parsed.map(({ attribute, value }) => [attribute.id, value.id]), [[10, 100]]);
});

test('round-trips the canonical numeric PHP attribute map', () => {
  const raw = serializeAttributeConfig([{ attributeId: 10, valueId: 100 }, { attributeId: 11, valueId: 110 }]);
  const parsed = parseLegacyAttributeConfig(raw, attributes, values);
  assert.deepEqual(parsed.map(({ attribute, value }) => [attribute.id, value.id]), [[10, 100], [11, 110]]);
});

test('resolves product-group thumbnails from proThum then legacy image_collection', () => {
  assert.equal(resolveProductGroupThumbnail('primary.jpg', ''), 'https://hacom.vn/media/product/primary.jpg');
  assert.equal(resolveProductGroupThumbnail('', 'a:1:{i:0;a:2:{s:10:"image_name";s:12:"fallback.jpg";s:3:"alt";s:0:"";}}'), 'https://hacom.vn/media/product/fallback.jpg');
  assert.equal(resolveProductGroupThumbnail('', ''), '');
});

test('admin payload permits one value per attribute and rejects duplicate SKU or removed value visuals', () => {
  const payload = {
    name: 'Laptop mẫu', description: '',
    attributes: [{ key: 'color', name: 'Màu', values: [{ key: 'white', name: 'Trắng' }] }],
    products: [{ productId: 1, selections: [{ attributeKey: 'color', valueKey: 'white' }] }],
  };
  assert.equal(parseProductGroupPayload(payload).products.length, 1);
  assert.throws(() => parseProductGroupPayload({ ...payload, products: [...payload.products, ...payload.products] }), /chọn trùng/);
  assert.throws(() => parseProductGroupPayload({ ...payload, attributes: [{ ...payload.attributes[0], values: [{ key: 'white', name: 'Trắng', image: '/api/media/value.jpg' }] }] }), /không còn được hỗ trợ/);
  assert.throws(() => parseProductGroupPayload({ ...payload, attributes: [{ ...payload.attributes[0], values: [{ key: 'white', name: 'Trắng', colorCode: '#ffffff' }] }] }), /không còn được hỗ trợ/);
  assert.throws(() => parseProductGroupPayload({ ...payload, attributes: [{ ...payload.attributes[0], values: [{ key: 'white', name: 'Trắng', color_code: '#ffffff' }] }] }), /không còn được hỗ trợ/);
  assert.throws(() => parseProductGroupPayload({ ...payload, attributes: Array.from({ length: 5 }, (_, index) => ({ key: `a-${index}`, name: `A${index}`, values: [{ key: `v-${index}`, name: 'V' }] })) }), /tối đa 4/);
  assert.throws(() => parseProductGroupPayload({ ...payload, products: Array.from({ length: 51 }, (_, index) => ({ productId: index + 1, selections: [{ attributeKey: 'color', valueKey: 'white' }] })) }), /tối đa 50/);
});

test('public group cards expose a thumbnail for each SKU without value visuals', () => {
  const result = buildPublicProductGroup({
    groupId: 3, groupName: 'Sample', currentProductId: 1, attributes: attributes.slice(0, 1), values: values.slice(0, 2),
    productRows: [
      { product_id: 1, attribute_config: serializeAttributeConfig([{ attributeId: 10, valueId: 100 }]), storeSKU: 'A', proName: 'A', price: 10, market_price: 12, slug: 'a', proThum: 'sku-a.jpg' },
      { product_id: 2, attribute_config: serializeAttributeConfig([{ attributeId: 10, valueId: 101 }]), storeSKU: 'B', proName: 'B', price: 20, market_price: 22, slug: 'b', image_collection: 'a:1:{i:0;a:2:{s:10:"image_name";s:12:"sku-b.jpg";s:3:"alt";s:0:"";}}' },
    ],
  });
  assert.deepEqual(result?.items.map((item) => item.thumbnail), [
    'https://hacom.vn/media/product/sku-a.jpg',
    'https://hacom.vn/media/product/sku-b.jpg',
  ]);
  assert.deepEqual(Object.keys(result!.items[0].values[0]).sort(), ['attributeId', 'attributeName', 'valueId', 'valueName']);
});

test('public group is hidden unless two valid sellable rows include the current product', () => {
  const base = {
    groupId: 3, groupName: 'Laptop mẫu', currentProductId: 1, attributes: attributes.slice(0, 1), values: values.slice(0, 2),
  };
  const one = [{ product_id: 1, attribute_config: serializeAttributeConfig([{ attributeId: 10, valueId: 100 }]), storeSKU: 'A', proName: 'A', price: 10, market_price: 12, slug: 'a' }];
  assert.equal(buildPublicProductGroup({ ...base, productRows: one }), null);
  const result = buildPublicProductGroup({ ...base, productRows: [...one, { product_id: 2, attribute_config: serializeAttributeConfig([{ attributeId: 10, valueId: 101 }]), storeSKU: 'B', proName: 'B', price: 20, market_price: 22, slug: 'b' }] });
  assert.equal(result?.displayLabel, 'Màu sắc');
  assert.deepEqual(result?.items.map((item) => item.displayName), ['Trắng', 'Đen']);
  assert.equal(buildPublicProductGroup({ ...base, currentProductId: 99, productRows: result!.items.map((item) => ({ product_id: item.productId, attribute_config: serializeAttributeConfig([{ attributeId: 10, valueId: item.values[0].valueId }]), storeSKU: item.sku, proName: item.name, price: item.price, market_price: item.marketPrice, slug: item.slug })) }), null);
});

test('multi-attribute public cards use Phiên bản and join ordered values', () => {
  const config = serializeAttributeConfig([{ attributeId: 10, valueId: 100 }, { attributeId: 11, valueId: 110 }]);
  const result = buildPublicProductGroup({ groupId: 3, groupName: 'Laptop', currentProductId: 1, attributes, values, productRows: [
    { product_id: 1, attribute_config: config, storeSKU: 'A', proName: 'A', price: 10, market_price: 12, slug: 'a' },
    { product_id: 2, attribute_config: serializeAttributeConfig([{ attributeId: 10, valueId: 101 }, { attributeId: 11, valueId: 110 }]), storeSKU: 'B', proName: 'B', price: 20, market_price: 22, slug: 'b' },
  ] });
  assert.equal(result?.displayLabel, 'Phiên bản');
  assert.equal(result?.items[0].displayName, 'Trắng · 16GB');
});
