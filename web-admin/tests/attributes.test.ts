import assert from 'node:assert/strict';
import test from 'node:test';
import { parseAttributePayload } from '../src/lib/admin/attributes';
import { createAttributeValueApiKey, isAttributeValueApiKey } from '../src/lib/attributeValueApiKey';

const validPayload = {
  name: 'Dung lượng', code: 'dung-luong', comment: '', filterCode: 'capacity', scope: 0,
  ordering: 1, isHeader: false, isSearch: true, inSummary: true, productSpec: true,
  forProductOption: false, status: true, categoryIds: [10],
  values: [{ value: '1 TB', apiKey: '1-tb', image: '', description: '', ordering: 0 }],
};

test('normalizes a complete local attribute payload', () => {
  const result = parseAttributePayload(validPayload);
  assert.equal(result.name, 'Dung lượng');
  assert.deepEqual(result.categoryIds, [10]);
  assert.equal(result.values[0].apiKey, '1-tb');
  assert.equal(result.isSearch, true);
});

test('global attributes ignore category links', () => {
  const result = parseAttributePayload({ ...validPayload, scope: 1, categoryIds: [10, 11] });
  assert.equal(result.scope, 1);
  assert.deepEqual(result.categoryIds, []);
});

test('rejects local attributes without a category and duplicate value ids or api keys', () => {
  assert.throws(() => parseAttributePayload({ ...validPayload, categoryIds: [] }), /Local/);
  assert.throws(() => parseAttributePayload({ ...validPayload, values: [
    { id: 3, value: 'A', apiKey: 'a' }, { id: 3, value: 'B', apiKey: 'b' },
  ] }), /ID gia tri bi trung/);
  assert.throws(() => parseAttributePayload({ ...validPayload, values: [
    { value: 'A', apiKey: 'same' }, { value: 'B', apiKey: 'same' },
  ] }), /ApiKey gia tri bi trung/);
});

test('enforces legacy column limits and rejects unsafe image values', () => {
  assert.throws(() => parseAttributePayload({ ...validPayload, code: 'x'.repeat(31) }), /30/);
  assert.throws(() => parseAttributePayload({ ...validPayload, filterCode: 'x'.repeat(21) }), /20/);
  assert.throws(() => parseAttributePayload({ ...validPayload, values: [{ value: 'A', apiKey: 'a', image: 'javascript:alert(1)' }] }), /khong hop le/);
});

test('creates canonical Vietnamese ApiKeys and validates the public slug format', () => {
  assert.equal(createAttributeValueApiKey('  AMD Ryzen 7  '), 'amd-ryzen-7');
  assert.equal(createAttributeValueApiKey('Độ phân giải: 2K+'), 'do-phan-giai-2k');
  assert.equal(createAttributeValueApiKey(`${'a'.repeat(199)} -- b`).length, 199);
  assert.equal(isAttributeValueApiKey('amd-ryzen-7'), true);
  assert.equal(isAttributeValueApiKey('AMD Ryzen 7'), false);
});

test('requires a canonical ApiKey for every attribute value', () => {
  assert.throws(() => parseAttributePayload({ ...validPayload, values: [{ value: 'A', apiKey: '' }] }), /bat buoc/);
  assert.throws(() => parseAttributePayload({ ...validPayload, values: [{ value: 'A', apiKey: 'A value' }] }), /khong hop le/);
});
