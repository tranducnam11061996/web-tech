import assert from 'node:assert/strict';
import test from 'node:test';
import type { RowDataPacket } from 'mysql2/promise';
import pool from '../src/lib/db';
import { getProductCardAttributeEditorData } from '../src/lib/productCardAttributes';

test('card-attribute editor previews a sellable product from a selected parent category branch', async (t) => {
  const [rows] = await pool.query<RowDataPacket[]>(`
    WITH RECURSIVE category_tree AS (
      SELECT id AS root_id, id AS category_id
      FROM idv_seller_category
      UNION ALL
      SELECT category_tree.root_id, child.id
      FROM category_tree
      JOIN idv_seller_category child ON child.parentId = category_tree.category_id
      WHERE child.id <> category_tree.category_id
    )
    SELECT category.id
    FROM idv_seller_category category
    JOIN category_tree branch ON branch.root_id = category.id AND branch.category_id <> category.id
    JOIN idv_product_category branch_product
      ON branch_product.category_id = branch.category_id
      AND branch_product.status = 1
    JOIN idv_sell_product_price branch_price
      ON branch_price.id = branch_product.pro_id
      AND branch_price.isOn = 1
      AND branch_price.price > 0
    WHERE category.status = 1
      AND NOT EXISTS (
        SELECT 1
        FROM idv_product_category direct_product
        JOIN idv_sell_product_price direct_price
          ON direct_price.id = direct_product.pro_id
          AND direct_price.isOn = 1
          AND direct_price.price > 0
        WHERE direct_product.category_id = category.id
          AND direct_product.status = 1
      )
    GROUP BY category.id
    ORDER BY COUNT(DISTINCT branch_product.pro_id) DESC, category.id ASC
    LIMIT 1
  `);
  const categoryId = Number(rows[0]?.id || 0);
  if (!categoryId) {
    t.skip('database has no parent category with descendant-only sellable products');
    return;
  }

  const data = await getProductCardAttributeEditorData(categoryId);
  assert.equal(data.selectedCategoryId, categoryId);
  assert.ok(data.previewProduct, 'expected a descendant product in the Preview panel');
  assert.ok(data.previewProduct.id > 0);
  assert.ok(data.previewProduct.name.length > 0);
  assert.ok(data.previewProduct.thumbnail.length > 0);
  assert.ok(data.previewProduct.price > 0);
});

test.after(async () => {
  await pool.end();
});
