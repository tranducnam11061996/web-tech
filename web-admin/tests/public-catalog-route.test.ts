import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyPublicCatalogRoute } from '../src/lib/publicCatalogRoute';

test('classifies canonical and legacy catalog route metadata from exact id paths', () => {
  assert.deepEqual(
    classifyPublicCatalogRoute('module:product/view:category/view_id:521', 'product:category'),
    { entityId: 521, type: 'category' },
  );
  assert.deepEqual(
    classifyPublicCatalogRoute('module:product/view:category/view_id:521', '0'),
    { entityId: 521, type: 'category' },
  );
  assert.deepEqual(
    classifyPublicCatalogRoute('module:product/view:product-detail/view_id:13532', 'product:product-detail'),
    { entityId: 13532, type: 'product' },
  );
});

test('rejects news paths, malformed IDs and conflicting catalog route types', () => {
  assert.equal(classifyPublicCatalogRoute('module:article/view:detail/view_id:521', '0'), null);
  assert.equal(classifyPublicCatalogRoute('module:product/view:category/view_id:0', '0'), null);
  assert.equal(classifyPublicCatalogRoute('module:product/view:category/view_id:521/extra', '0'), null);
  assert.equal(classifyPublicCatalogRoute('module:product/view:category/view_id:521', 'product:product-detail'), null);
});
