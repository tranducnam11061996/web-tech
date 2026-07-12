import assert from 'node:assert/strict';
import test from 'node:test';
import type { RowDataPacket } from 'mysql2/promise';
import pool from '../src/lib/db';
import { getAdminProductGroup, getPublicProductGroup, removeProductGroupValueVisualColumns } from '../src/lib/productGroups';

test('product-group index and visual-column migration are idempotent, and a real sellable group resolves current SKU', async () => {
  const [indexRows] = await pool.query<RowDataPacket[]>(
    `SELECT NON_UNIQUE FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'config_group_product'
       AND INDEX_NAME = 'uq_config_group_product_product' LIMIT 1`,
  );
  assert.equal(Number(indexRows[0]?.NON_UNIQUE), 0);
  const secondMigration = await removeProductGroupValueVisualColumns();
  assert.equal(secondMigration.changed, false);
  const [visualColumnRows] = await pool.query<RowDataPacket[]>(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'config_group_attribute_value'
       AND COLUMN_NAME IN ('image', 'color_code')`,
  );
  assert.equal(visualColumnRows.length, 0);

  const [productRows] = await pool.query<RowDataPacket[]>(
    `SELECT gp.product_id, gp.group_id
     FROM config_group_product gp
     JOIN idv_sell_product_store p ON p.id = gp.product_id
     JOIN idv_sell_product_price pr ON pr.id = p.id AND pr.isOn = 1 AND pr.price > 0
     JOIN config_group_attribute a ON a.group_id = gp.group_id
     JOIN config_group_attribute_value v ON v.attr_id = a.id
     GROUP BY gp.group_id, gp.product_id
     HAVING (SELECT COUNT(*) FROM config_group_product member
             JOIN idv_sell_product_store member_product ON member_product.id = member.product_id
             JOIN idv_sell_product_price member_price ON member_price.id = member.product_id AND member_price.isOn = 1 AND member_price.price > 0
             WHERE member.group_id = gp.group_id) >= 2
     ORDER BY gp.group_id DESC LIMIT 1`,
  );
  const productId = Number(productRows[0]?.product_id || 0);
  const groupId = Number(productRows[0]?.group_id || 0);
  assert.ok(productId > 0);
  assert.ok(groupId > 0);
  const group = await getPublicProductGroup(productId);
  assert.ok(group);
  assert.ok(group.items.length >= 2);
  assert.equal(group.items.filter((item) => item.isCurrent).length, 1);
  assert.ok(group.items.every((item) => typeof item.thumbnail === 'string'));
  assert.ok(group.items.some((item) => item.thumbnail.length > 0));
  const adminGroup = await getAdminProductGroup(groupId);
  assert.ok(adminGroup.attributes.every((attribute) => attribute.values.every((value) => !Object.hasOwn(value, 'image') && !Object.hasOwn(value, 'colorCode'))));
});

test.after(async () => { await pool.end(); });
