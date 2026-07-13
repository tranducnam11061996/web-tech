import assert from 'node:assert/strict';
import test from 'node:test';
import type { RowDataPacket } from 'mysql2/promise';
import pool from '../src/lib/db';
import {
  deleteAdminProductPromotion,
  ensureProductPromotionTables,
  getPublicProductPromotions,
  saveAdminProductPromotion,
} from '../src/lib/productPromotions';

const createdIds: number[] = [];

test('product promotion migration is idempotent and mixed scope resolves once in manual order', async (t) => {
  await ensureProductPromotionTables();
  await ensureProductPromotionTables();
  const [tableRows] = await pool.query<RowDataPacket[]>(`
    SELECT TABLE_NAME, ENGINE, TABLE_COLLATION FROM information_schema.TABLES
    WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (
      'web_admin_product_promotions','web_admin_product_promotion_products','web_admin_product_promotion_categories'
    )
  `);
  assert.equal(tableRows.length, 3);
  assert.ok(tableRows.every((row) => row.ENGINE === 'InnoDB' && String(row.TABLE_COLLATION).startsWith('utf8mb4')));

  const [catalogRows] = await pool.query<RowDataPacket[]>(`
    SELECT pc.pro_id AS product_id, c.parentId AS category_root
    FROM idv_product_category pc
    JOIN idv_seller_category c ON c.id=pc.category_id
    JOIN idv_sell_product_store p ON p.id=pc.pro_id
    WHERE pc.status=1 AND c.parentId>0
    ORDER BY pc.pro_id DESC LIMIT 1
  `);
  const productId = Number(catalogRows[0]?.product_id || 0);
  const categoryRoot = Number(catalogRows[0]?.category_root || 0);
  if (!productId || !categoryRoot) {
    t.skip('category-only database has no product-promotion fixture');
    return;
  }
  assert.ok(productId > 0 && categoryRoot > 0);

  const first = await saveAdminProductPromotion({ displayText: 'Integration priority 20', detailUrl: '/integration-20', status: true, displayOrder: 20, productIds: [productId], categoryIds: [categoryRoot] });
  createdIds.push(first.id);
  const second = await saveAdminProductPromotion({ displayText: 'Integration priority 10', detailUrl: 'https://example.com/integration-10', status: true, displayOrder: 10, productIds: [productId], categoryIds: [] });
  createdIds.push(second.id);
  const publicItems = await getPublicProductPromotions(productId);
  assert.equal(publicItems.filter((item) => item.id === first.id).length, 1);
  assert.ok(publicItems.findIndex((item) => item.id === second.id) < publicItems.findIndex((item) => item.id === first.id));

  await assert.rejects(() => saveAdminProductPromotion({ displayText: 'Invalid relation', detailUrl: '/invalid', status: true, displayOrder: 1, productIds: [2_147_483_647], categoryIds: [] }));
  const [invalidRows] = await pool.query<RowDataPacket[]>("SELECT id FROM web_admin_product_promotions WHERE display_text='Invalid relation'");
  assert.equal(invalidRows.length, 0);
});

test('deleting a product promotion cascades its SKU and category scopes', async (t) => {
  const id = createdIds[0];
  if (!id) {
    t.skip('category-only database has no created product-promotion fixture');
    return;
  }
  assert.ok(id > 0);
  await deleteAdminProductPromotion(id);
  createdIds.splice(createdIds.indexOf(id), 1);
  const [[productRows], [categoryRows]] = await Promise.all([
    pool.query<RowDataPacket[]>('SELECT promotion_id FROM web_admin_product_promotion_products WHERE promotion_id=?', [id]),
    pool.query<RowDataPacket[]>('SELECT promotion_id FROM web_admin_product_promotion_categories WHERE promotion_id=?', [id]),
  ]);
  assert.equal(productRows.length, 0);
  assert.equal(categoryRows.length, 0);
});

test.after(async () => {
  for (const id of createdIds) await pool.query('DELETE FROM web_admin_product_promotions WHERE id=?', [id]);
  await pool.end();
});
