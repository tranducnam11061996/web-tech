import assert from 'node:assert/strict';
import test from 'node:test';
import type { RowDataPacket } from 'mysql2/promise';
import pool from '../src/lib/db';
import { bulkAttributeAction, saveAttribute } from '../src/lib/admin/attributes';
import {
  createAttributeSelectionRevision,
  listIncompleteProducts,
  listQuickToolAttributes,
  listQuickToolCategories,
  replaceQuickProductAttributeValues,
  replaceQuickProductAttributeValuesWithAudit,
} from '../src/lib/admin/quickProductAttributes';

test('quick category summaries expose hierarchy metadata and preserve the selected path', async () => {
  const allCategories = await listQuickToolCategories({ includeComplete: true });
  assert.ok(allCategories.length > 0);
  for (const category of allCategories) {
    assert.ok(Number.isInteger(category.parentId));
    assert.ok(Number.isFinite(category.ordering));
  }

  const completedCategory = allCategories.find((category) => category.complete);
  if (!completedCategory) return;
  const selectedCategories = await listQuickToolCategories({ selectedCategoryId: completedCategory.id });
  const selectedIds = new Set(selectedCategories.map((category) => category.id));
  assert.ok(selectedIds.has(completedCategory.id), 'selected complete category must remain available');

  const allById = new Map(allCategories.map((category) => [category.id, category]));
  const visited = new Set<number>();
  let parentId = completedCategory.parentId;
  while (parentId > 0 && !visited.has(parentId)) {
    visited.add(parentId);
    assert.ok(selectedIds.has(parentId), 'selected category ancestors must remain available');
    parentId = allById.get(parentId)?.parentId || 0;
  }
});

test('quick attribute replacement is scoped, revision-safe and cache-aware', async (t) => {
  const [databaseRows] = await pool.query<RowDataPacket[]>('SELECT DATABASE() db');
  const database = String(databaseRows[0]?.db || '');
  if (process.env.QUICK_ATTRIBUTE_DESTRUCTIVE_TEST !== 'true' || !/(?:test|tmp|disposable)/i.test(database)) {
    t.skip('requires QUICK_ATTRIBUTE_DESTRUCTIVE_TEST=true and an explicitly disposable database');
    return;
  }

  const [scopeRows] = await pool.query<RowDataPacket[]>(`
    SELECT pc.category_id, pc.pro_id
    FROM idv_product_category pc
    JOIN idv_seller_category c ON c.id = pc.category_id AND c.status = 1
    JOIN idv_sell_product_store p ON p.id = pc.pro_id
    ORDER BY pc.category_id, pc.pro_id
    LIMIT 1
  `);
  assert.ok(scopeRows[0]);
  const categoryId = Number(scopeRows[0].category_id);
  const productId = Number(scopeRows[0].pro_id);
  const suffix = Date.now().toString(36);
  let attributeId = 0;
  let controlAttributeId = 0;
  try {
    const attribute = await saveAttribute({
      name: 'Quick tool test', code: `quick-${suffix}`.slice(0, 30), filterCode: '', comment: '', scope: 0,
      ordering: 0, isHeader: false, isSearch: true, inSummary: true, productSpec: true,
      forProductOption: false, status: true, categoryIds: [categoryId],
      values: [
        { value: 'Quick A', apiKey: `quick-a-${suffix}`, image: '', description: '', ordering: 0 },
        { value: 'Quick B', apiKey: `quick-b-${suffix}`, image: '', description: '', ordering: 1 },
      ],
    });
    attributeId = Number(attribute.id);
    const valueIds = attribute.values.map((value) => Number(value.id));
    const control = await saveAttribute({
      name: 'Quick control', code: `control-${suffix}`.slice(0, 30), filterCode: '', comment: '', scope: 0,
      ordering: 1, isHeader: false, isSearch: false, inSummary: true, productSpec: true,
      forProductOption: false, status: true, categoryIds: [categoryId],
      values: [{ value: 'Control', apiKey: `control-${suffix}`, image: '', description: '', ordering: 0 }],
    });
    controlAttributeId = Number(control.id);
    const controlValueId = Number(control.values[0].id);
    await pool.query('INSERT INTO idv_product_attribute(pro_id,attr_id,attr_value_id,value_sort) VALUES(?,?,?,0)', [productId, controlAttributeId, controlValueId]);

    const listedAttributes = await listQuickToolAttributes(categoryId);
    assert.ok(listedAttributes.some((item) => item.id === attributeId));
    const missing = await listIncompleteProducts({ categoryId, attributeId, page: 1, limit: 100, q: '', status: 'all', sort: 'id-asc' });
    assert.equal(new Set(missing.items.map((item) => item.id)).size, missing.items.length, 'SKU list must be deduplicated');
    assert.ok(missing.items.some((item) => item.id === productId));

    const [beforeCacheRows] = await pool.query<RowDataPacket[]>('SELECT cache_key, version FROM web_admin_cache_versions WHERE cache_key IN (\'public_products\',\'public_catalog_details\',\'catalog\',\'search\',\'pc_builder\')');
    const beforeVersions = new Map(beforeCacheRows.map((row) => [String(row.cache_key), Number(row.version)]));
    const emptyRevision = createAttributeSelectionRevision([]);
    const saved = await replaceQuickProductAttributeValuesWithAudit(productId, {
      categoryId, attributeId, attributeValueIds: valueIds, expectedRevision: emptyRevision,
    });
    assert.equal(saved.changed, true);
    assert.deepEqual(saved.attributeValueIds, [...valueIds].sort((a, b) => a - b));
    const [controlRows] = await pool.query<RowDataPacket[]>('SELECT attr_value_id FROM idv_product_attribute WHERE pro_id=? AND attr_id=?', [productId, controlAttributeId]);
    assert.equal(Number(controlRows[0]?.attr_value_id), controlValueId, 'unrelated attribute must be preserved');
    const [auditRows] = await pool.query<RowDataPacket[]>(`
      SELECT metadata FROM admin_audit_logs
      WHERE action='quick_product_attribute.values_replaced' AND resource='catalog.attributes' AND resource_id=?
      ORDER BY id DESC LIMIT 1
    `, [productId]);
    const auditMetadata = typeof auditRows[0]?.metadata === 'string' ? JSON.parse(auditRows[0].metadata) : auditRows[0]?.metadata;
    assert.equal(Number(auditMetadata?.attributeId), attributeId);
    assert.deepEqual(auditMetadata?.attributeValueIds, valueIds);

    const idempotent = await replaceQuickProductAttributeValues(productId, {
      categoryId, attributeId, attributeValueIds: valueIds, expectedRevision: emptyRevision,
    });
    assert.equal(idempotent.changed, false, 'same desired state is idempotent even with stale revision');
    await assert.rejects(() => replaceQuickProductAttributeValues(productId, {
      categoryId, attributeId, attributeValueIds: [valueIds[0]], expectedRevision: emptyRevision,
    }), /quản trị viên khác/);
    await assert.rejects(() => replaceQuickProductAttributeValues(productId, {
      categoryId, attributeId, attributeValueIds: [controlValueId], expectedRevision: saved.revision,
    }), /không thuộc thuộc tính/);

    const [outsideRows] = await pool.query<RowDataPacket[]>(`
      WITH RECURSIVE scope AS (
        SELECT id, 0 AS depth, CAST(CONCAT('/', id, '/') AS CHAR(4096)) AS visited
        FROM idv_seller_category WHERE id=? AND status=1
        UNION ALL
        SELECT child.id, scope.depth + 1, CONCAT(scope.visited, child.id, '/')
        FROM scope JOIN idv_seller_category child ON child.parentId=scope.id AND child.status=1
        WHERE scope.depth < 32 AND LOCATE(CONCAT('/', child.id, '/'), scope.visited)=0
      )
      SELECT p.id
      FROM idv_sell_product_store p
      WHERE NOT EXISTS (
        SELECT 1 FROM idv_product_category pc JOIN scope ON scope.id=pc.category_id WHERE pc.pro_id=p.id
      )
      ORDER BY p.id LIMIT 1
    `, [categoryId]);
    if (outsideRows[0]) {
      await assert.rejects(() => replaceQuickProductAttributeValues(Number(outsideRows[0].id), {
        categoryId, attributeId, attributeValueIds: [valueIds[0]], expectedRevision: emptyRevision,
      }), /phạm vi áp dụng/);
    }

    const cleared = await replaceQuickProductAttributeValues(productId, {
      categoryId, attributeId, attributeValueIds: [], expectedRevision: saved.revision,
    });
    assert.equal(cleared.changed, true);
    const [attributeRows] = await pool.query<RowDataPacket[]>('SELECT attr_value_id FROM idv_product_attribute WHERE pro_id=? AND attr_id=?', [productId, attributeId]);
    assert.equal(attributeRows.length, 0);

    await pool.query('UPDATE idv_attribute_category SET status=0 WHERE attr_id=? AND category_id=?', [attributeId, categoryId]);
    await assert.rejects(() => replaceQuickProductAttributeValues(productId, {
      categoryId, attributeId, attributeValueIds: [valueIds[0]], expectedRevision: cleared.revision,
    }), /phạm vi áp dụng/);
    await pool.query('UPDATE idv_attribute_category SET status=1 WHERE attr_id=? AND category_id=?', [attributeId, categoryId]);

    const [afterCacheRows] = await pool.query<RowDataPacket[]>('SELECT cache_key, version FROM web_admin_cache_versions WHERE cache_key IN (\'public_products\',\'public_catalog_details\',\'catalog\',\'search\',\'pc_builder\')');
    for (const row of afterCacheRows) {
      assert.ok(Number(row.version) > (beforeVersions.get(String(row.cache_key)) || 0), `${row.cache_key} cache version should increase`);
    }
  } finally {
    if (attributeId) {
      await pool.query(`DELETE FROM admin_audit_logs
        WHERE action='quick_product_attribute.values_replaced' AND resource='catalog.attributes' AND resource_id=?
          AND JSON_EXTRACT(metadata, '$.attributeId')=?`, [productId, attributeId]).catch(() => undefined);
    }
    if (controlAttributeId) await bulkAttributeAction([controlAttributeId], 'delete-permanent').catch(() => undefined);
    if (attributeId) await bulkAttributeAction([attributeId], 'delete-permanent').catch(() => undefined);
  }
});

test.after(async () => {
  await pool.end();
});
