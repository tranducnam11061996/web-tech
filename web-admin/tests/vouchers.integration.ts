import assert from 'node:assert/strict';
import test from 'node:test';
import type { RowDataPacket } from 'mysql2/promise';
import pool from '../src/lib/db';
import {
  ensureVoucherTables,
  getAdminVoucher,
  getPublicProductVouchers,
  listAdminVouchers,
  quoteVoucher,
  saveAdminVoucher,
} from '../src/lib/vouchers';

let createdVoucherId = 0;

test.after(async () => {
  if (createdVoucherId > 0) {
    await pool.query('DELETE FROM web_admin_voucher_categories WHERE voucher_id = ?', [createdVoucherId]).catch(() => undefined);
    await pool.query('DELETE FROM web_admin_voucher_products WHERE voucher_id = ?', [createdVoucherId]).catch(() => undefined);
    await pool.query('DELETE FROM web_admin_vouchers WHERE id = ?', [createdVoucherId]).catch(() => undefined);
  }
  await pool.end();
});

test('voucher product-scope infrastructure has the expected keys and ownership FK', async () => {
  const [tableRows] = await pool.query<RowDataPacket[]>(`
    SELECT ENGINE, TABLE_COLLATION
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'web_admin_voucher_products'
  `);
  assert.equal(tableRows[0]?.ENGINE, 'InnoDB');
  assert.equal(tableRows[0]?.TABLE_COLLATION, 'utf8mb4_unicode_ci');

  const [indexRows] = await pool.query<RowDataPacket[]>(`
    SELECT INDEX_NAME, NON_UNIQUE, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columns_list
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'web_admin_voucher_products'
    GROUP BY INDEX_NAME, NON_UNIQUE
  `);
  const indexes = new Map(indexRows.map((row) => [String(row.INDEX_NAME), {
    nonUnique: Number(row.NON_UNIQUE),
    columns: String(row.columns_list),
  }]));
  assert.deepEqual(indexes.get('PRIMARY'), { nonUnique: 0, columns: 'voucher_id,product_id' });
  assert.deepEqual(indexes.get('idx_web_admin_voucher_products_product'), { nonUnique: 1, columns: 'product_id,voucher_id' });

  const [foreignKeyRows] = await pool.query<RowDataPacket[]>(`
    SELECT k.REFERENCED_TABLE_NAME, k.REFERENCED_COLUMN_NAME, r.DELETE_RULE
    FROM information_schema.KEY_COLUMN_USAGE k
    JOIN information_schema.REFERENTIAL_CONSTRAINTS r
      ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
    WHERE k.TABLE_SCHEMA = DATABASE()
      AND k.TABLE_NAME = 'web_admin_voucher_products'
      AND k.COLUMN_NAME = 'voucher_id'
  `);
  assert.deepEqual(foreignKeyRows[0], {
    REFERENCED_TABLE_NAME: 'web_admin_vouchers',
    REFERENCED_COLUMN_NAME: 'id',
    DELETE_RULE: 'CASCADE',
  });
});

test('voucher direct products round-trip and combine with category scope without duplicate eligibility', async (t) => {
  const [databaseRows] = await pool.query<RowDataPacket[]>('SELECT DATABASE() AS db');
  const database = String(databaseRows[0]?.db || '');
  if (process.env.VOUCHER_DESTRUCTIVE_TEST !== 'true' || !/(?:test|tmp|disposable)/i.test(database)) {
    t.skip('requires VOUCHER_DESTRUCTIVE_TEST=true and an explicitly disposable database');
    return;
  }

  await ensureVoucherTables();
  const [productRows] = await pool.query<RowDataPacket[]>(`
    SELECT p.id, MIN(pc.category_id) AS category_id, pr.price
    FROM idv_sell_product_store p
    JOIN idv_sell_product_price pr ON pr.id = p.id AND pr.isOn = 1 AND pr.price > 0
    LEFT JOIN idv_product_category pc ON pc.pro_id = p.id
    GROUP BY p.id, pr.price
    ORDER BY p.id ASC
    LIMIT 3
  `);
  assert.ok(productRows.length >= 2, 'disposable catalog requires at least two sellable products');
  const directProductId = Number(productRows[0].id);
  const categoryProductId = Number(productRows[1].id);
  const categoryId = Number(productRows[1].category_id || 0);
  assert.ok(categoryId > 0, 'category-scoped product is required');

  const saved = await saveAdminVoucher({
    code: `VOUCHER_SCOPE_${Date.now()}`,
    title: 'Voucher scope integration',
    description: 'Integration test',
    status: true,
    quantityMode: 'unlimited',
    discountType: 'percent',
    discountValue: 10,
    maxDiscount: 1_000_000,
    minimumOrderValue: 0,
    startsAt: '',
    endsAt: '',
    categoryIds: [categoryId],
    productIds: [directProductId, directProductId],
  });
  createdVoucherId = Number(saved.id);

  const detail = await getAdminVoucher(createdVoucherId);
  assert.deepEqual(detail.productIds, [directProductId]);
  assert.deepEqual(detail.categoryIds, [categoryId]);
  assert.equal(detail.products[0]?.id, directProductId);
  const list = await listAdminVouchers();
  assert.equal(list.find((voucher) => voucher.id === createdVoucherId)?.productCount, 1);

  const directPrice = Number(productRows[0].price);
  const categoryPrice = Number(productRows[1].price);
  const quote = await quoteVoucher(saved.code, [
    { productId: directProductId, quantity: 1, price: directPrice, available: true },
    { productId: categoryProductId, quantity: 1, price: categoryPrice, available: true },
  ], directPrice + categoryPrice);
  assert.equal(quote.status, 'applied');
  assert.equal(quote.eligibleSubtotal, directPrice + categoryPrice);
  assert.equal(quote.eligibleItemCount, 2);
  assert.equal(quote.note, null);

  await saveAdminVoucher({
    ...saved,
    status: true,
    quantityMode: saved.quantityMode,
    discountType: saved.discountType,
    startsAt: '',
    endsAt: '',
    categoryIds: [],
    productIds: [directProductId],
  }, createdVoucherId);
  assert.ok((await getPublicProductVouchers(directProductId)).some((voucher) => voucher.id === createdVoucherId));
  assert.equal((await getPublicProductVouchers(categoryProductId)).some((voucher) => voucher.id === createdVoucherId), false);

  const orphanProductId = 4_000_000_000;
  await pool.query('INSERT INTO web_admin_voucher_products (voucher_id, product_id) VALUES (?, ?)', [createdVoucherId, orphanProductId]);
  assert.deepEqual((await getAdminVoucher(createdVoucherId)).productIds, [directProductId]);
  await saveAdminVoucher({
    ...saved,
    status: true,
    quantityMode: saved.quantityMode,
    discountType: saved.discountType,
    startsAt: '',
    endsAt: '',
    categoryIds: [],
    productIds: [directProductId],
  }, createdVoucherId);
  const [orphanRows] = await pool.query<RowDataPacket[]>(
    'SELECT product_id FROM web_admin_voucher_products WHERE voucher_id = ? AND product_id = ?',
    [createdVoucherId, orphanProductId],
  );
  assert.equal(orphanRows.length, 0);
});
