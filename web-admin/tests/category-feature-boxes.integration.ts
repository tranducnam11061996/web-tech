import assert from 'node:assert/strict';
import test from 'node:test';
import type { RowDataPacket } from 'mysql2/promise';
import pool from '../src/lib/db';
import {
  getHomepageCategoryFeatureSections,
  invalidateCategoryFeatureBoxCaches,
} from '../src/lib/categoryFeatureBoxes';

test.after(async () => {
  await pool.end();
});

test('homepage category feature sections include descendants and honor product display ordering', async (context) => {
  const [featureRows] = await pool.query<RowDataPacket[]>(`
    SELECT category_id
    FROM web_admin_category_feature_boxes
    WHERE homepage_enabled = 1
    ORDER BY category_id
    LIMIT 1
  `);
  const categoryId = Number(featureRows[0]?.category_id || 0);
  if (!categoryId) {
    context.skip('requires one enabled homepage category feature fixture');
    return;
  }

  const [expectedRows] = await pool.query<RowDataPacket[]>(`
    WITH RECURSIVE category_scope AS (
      SELECT c.id, 0 AS depth, CAST(CONCAT(',', c.id, ',') AS CHAR(12000)) AS visited
      FROM idv_seller_category c
      WHERE c.id = ? AND c.status = 1
      UNION ALL
      SELECT child.id, scope.depth + 1, CONCAT(scope.visited, child.id, ',')
      FROM category_scope scope
      JOIN idv_seller_category child ON child.parentId = scope.id AND child.status = 1
      WHERE scope.depth < 32 AND LOCATE(CONCAT(',', child.id, ','), scope.visited) = 0
    )
    SELECT p.id
    FROM idv_sell_product_store p
    JOIN idv_sell_product_price pr ON pr.id = p.id
    JOIN (
      SELECT DISTINCT pc.pro_id
      FROM idv_product_category pc
      JOIN category_scope scope ON scope.id = pc.category_id
    ) scoped_products ON scoped_products.pro_id = p.id
    WHERE pr.isOn = 1
    ORDER BY pr.ordering DESC, p.id DESC
    LIMIT 9
  `, [categoryId]);

  invalidateCategoryFeatureBoxCaches(categoryId);
  const payload = await getHomepageCategoryFeatureSections(12, 24);
  const section = payload.sections.find((item) => item.category.id === categoryId);

  assert.ok(section, `missing homepage feature section for category ${categoryId}`);
  assert.deepEqual(
    section.products.map((product) => product.id),
    expectedRows.map((row) => Number(row.id)),
  );
  assert.equal(new Set(section.products.map((product) => product.id)).size, section.products.length);
});
