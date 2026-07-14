import assert from 'node:assert/strict';
import test from 'node:test';
import type { RowDataPacket } from 'mysql2/promise';
import pool from '../src/lib/db';
import { bulkAttributeAction, getAttribute, saveAttribute } from '../src/lib/admin/attributes';

test('attribute CRUD is transactional and cascades values and relations', async (t) => {
  const [databaseRows] = await pool.query<RowDataPacket[]>('SELECT DATABASE() db');
  const database = String(databaseRows[0]?.db || '');
  if (process.env.ATTRIBUTE_CRUD_DESTRUCTIVE_TEST !== 'true' || !/(?:test|tmp|disposable)/i.test(database)) {
    t.skip('requires ATTRIBUTE_CRUD_DESTRUCTIVE_TEST=true and an explicitly disposable database');
    return;
  }

  const [[category], [product]] = await Promise.all([
    pool.query<RowDataPacket[]>('SELECT id FROM idv_seller_category ORDER BY id LIMIT 1'),
    pool.query<RowDataPacket[]>('SELECT id FROM idv_sell_product_store ORDER BY id LIMIT 1'),
  ]);
  assert.ok(category[0]?.id);
  const code = `crud-test-${Date.now()}`.slice(0, 30);
  let attributeId = 0;
  try {
    const created = await saveAttribute({
      name: 'CRUD test', code, filterCode: '', comment: '', scope: 0, ordering: 0,
      isHeader: false, isSearch: true, inSummary: true, productSpec: true, forProductOption: false,
      categoryIds: [Number(category[0].id)], values: [{ value: 'Old', apiKey: 'old', image: '', description: '', ordering: 0 }],
    });
    attributeId = Number(created.id);
    assert.ok(attributeId > 0);
    assert.equal(created.values.length, 1);
    const oldValueId = Number(created.values[0].id);

    if (product[0]?.id) {
      await pool.query('INSERT INTO idv_product_attribute(pro_id,attr_id,attr_value_id,value_sort) VALUES(?,?,?,0)', [Number(product[0].id), attributeId, oldValueId]);
    }
    const updated = await saveAttribute({ ...created, scope: 1, categoryIds: [], values: [{ value: 'New', apiKey: 'new', image: '', description: '', ordering: 0 }] }, attributeId);
    assert.equal(updated.scope, 1);
    assert.equal(updated.categoryIds.length, 0);
    const [oldLinks] = await pool.query<RowDataPacket[]>('SELECT pro_id FROM idv_product_attribute WHERE attr_value_id=?', [oldValueId]);
    assert.equal(oldLinks.length, 0);

    await bulkAttributeAction([attributeId], 'hide');
    assert.equal((await getAttribute(attributeId)).status, false);
    await bulkAttributeAction([attributeId], 'activate');
    assert.equal((await getAttribute(attributeId)).status, true);
    await bulkAttributeAction([attributeId], 'delete-permanent');
    attributeId = 0;
    await assert.rejects(() => getAttribute(Number(created.id)), /Khong tim thay/);
  } finally {
    if (attributeId) await bulkAttributeAction([attributeId], 'delete-permanent').catch(() => undefined);
  }
});

test.after(async () => {
  await pool.end();
});
