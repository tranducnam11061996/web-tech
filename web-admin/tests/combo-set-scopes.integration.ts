import assert from 'node:assert/strict';
import test from 'node:test';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '../src/lib/db';
import { serializeLegacyComboConfig } from '../src/lib/comboSets';
import {
  ensureComboSetCategoryTable,
  getAdminComboSetScope,
  getApplicableComboSetIds,
  updateAdminComboSetScope,
} from '../src/lib/comboSetScopes';

let createdComboSetId = 0;

test('combo category scope migration is idempotent and dynamic scope deduplicates direct products', async (t) => {
  if (process.env.ADMIN_WRITE_ENABLED !== 'true') {
    t.skip('ADMIN_WRITE_ENABLED=true is required for combo scope integration writes');
    return;
  }
  await ensureComboSetCategoryTable();
  await ensureComboSetCategoryTable();
  const [tableRows] = await pool.query<RowDataPacket[]>(`
    SELECT ENGINE,TABLE_COLLATION
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='web_admin_combo_set_categories'
  `);
  assert.equal(tableRows.length, 1);
  assert.equal(tableRows[0].ENGINE, 'InnoDB');
  assert.match(String(tableRows[0].TABLE_COLLATION), /^utf8mb4/);
  const [[indexRows], [foreignKeyRows]] = await Promise.all([
    pool.query<RowDataPacket[]>(`
      SELECT DISTINCT INDEX_NAME
      FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='web_admin_combo_set_categories'
        AND INDEX_NAME IN ('PRIMARY','idx_combo_set_categories_category')
    `),
    pool.query<RowDataPacket[]>(`
      SELECT DELETE_RULE
      FROM information_schema.REFERENTIAL_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA=DATABASE()
        AND TABLE_NAME='web_admin_combo_set_categories'
        AND CONSTRAINT_NAME='fk_combo_set_categories_combo_set'
    `),
  ]);
  assert.deepEqual(new Set(indexRows.map((row) => String(row.INDEX_NAME))), new Set(['PRIMARY', 'idx_combo_set_categories_category']));
  assert.equal(String(foreignKeyRows[0]?.DELETE_RULE), 'CASCADE');

  const [fixtureRows] = await pool.query<RowDataPacket[]>(`
    SELECT pc.pro_id AS product_id,c.id AS category_id,c.parentId
    FROM idv_product_category pc
    JOIN idv_seller_category c ON c.id=pc.category_id
    JOIN idv_sell_product_store p ON p.id=pc.pro_id
    WHERE pc.status=1 AND c.parentId>0
    ORDER BY pc.pro_id DESC LIMIT 1
  `);
  const productId = Number(fixtureRows[0]?.product_id || 0);
  const categoryRoot = Number(fixtureRows[0]?.parentId || 0);
  if (!productId || !categoryRoot) {
    t.skip('database has no product/category descendant fixture');
    return;
  }

  const unixTime = Math.floor(Date.now() / 1000);
  const [insertResult] = await pool.query<ResultSetHeader>(`
    INSERT INTO combo_set
      (title,description,config,product_count,status,from_time,to_time,create_time,create_by,last_update,last_update_by)
    VALUES (?,?,?,0,1,0,0,?,'Integration',?,'Integration')
  `, ['Integration combo category scope', '', serializeLegacyComboConfig([]), unixTime, unixTime]);
  createdComboSetId = Number(insertResult.insertId);
  await updateAdminComboSetScope(createdComboSetId, { action: 'replace-categories', categoryIds: [categoryRoot] }, 'Integration');
  assert.ok((await getApplicableComboSetIds(pool, productId)).includes(createdComboSetId));

  await updateAdminComboSetScope(createdComboSetId, { action: 'add-product', productId }, 'Integration');
  const mixedScope = await getAdminComboSetScope(createdComboSetId, 1, 20);
  const productRows = mixedScope.products.filter((product) => product.id === productId);
  assert.equal(productRows.length, 1);
  assert.equal(productRows[0].direct, true);
  assert.ok(productRows[0].categorySources.some((category) => category.id === categoryRoot));

  await updateAdminComboSetScope(createdComboSetId, { action: 'remove-product', productId }, 'Integration');
  const inheritedScope = await getAdminComboSetScope(createdComboSetId, 1, 20);
  assert.equal(inheritedScope.products.find((product) => product.id === productId)?.direct, false);
});

test.after(async () => {
  if (createdComboSetId > 0) {
    await pool.query('DELETE FROM combo_set WHERE id=?', [createdComboSetId]);
    const [scopeRows] = await pool.query<RowDataPacket[]>('SELECT combo_set_id FROM web_admin_combo_set_categories WHERE combo_set_id=?', [createdComboSetId]);
    assert.equal(scopeRows.length, 0);
  }
  await pool.end();
});
