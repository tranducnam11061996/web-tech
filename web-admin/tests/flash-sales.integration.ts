import assert from 'node:assert/strict';
import test from 'node:test';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '../src/lib/db';
import {
  ensureFlashSaleTables,
  reserveFlashSalesForOrder,
  transitionFlashSaleAllocations,
  type FlashSaleOffer,
} from '../src/lib/flashSales';

const enabled = process.env.FLASH_SALE_DESTRUCTIVE_TEST === 'true';

test('Flash Sale quota reservation remains atomic under concurrent checkout', async (context) => {
  if (!enabled) {
    context.skip('Set FLASH_SALE_DESTRUCTIVE_TEST=true on a disposable test database to run.');
    return;
  }
  const [databaseRows] = await pool.query<RowDataPacket[]>('SELECT DATABASE() database_name');
  const databaseName = String(databaseRows[0]?.database_name || '');
  if (!/(?:test|flash_sale_clone)/i.test(databaseName)) {
    throw new Error(`Refusing destructive Flash Sale test against database ${databaseName || '(unknown)'}.`);
  }

  process.env.FLASH_SALE_BUYER_HASH_SECRET = 'integration-only-flash-sale-secret';
  await ensureFlashSaleTables(pool);
  const token = `${Date.now()}_${Math.floor(Math.random() * 10_000)}`;
  const productId = 4_000_000_000 + Math.floor(Math.random() * 100_000_000);
  const orderIds = [1_800_000_000 + Math.floor(Math.random() * 100_000), 1_900_000_000 + Math.floor(Math.random() * 100_000)];
  let campaignId = 0;
  let itemId = 0;

  try {
    const [campaignResult] = await pool.query<ResultSetHeader>(`INSERT INTO web_admin_flash_sale_campaigns
      (code,slug,name,status,stacking_mode,audience_mode,countdown_starts_at,starts_at,ends_at)
      VALUES(?,?,?,'published','exclusive','all',UTC_TIMESTAMP()-INTERVAL 2 HOUR,UTC_TIMESTAMP()-INTERVAL 1 HOUR,UTC_TIMESTAMP()+INTERVAL 1 HOUR)`,
      [`TEST_${token}`, `test-${token}`, `Atomic quota ${token}`]);
    campaignId = Number(campaignResult.insertId);
    const [itemResult] = await pool.query<ResultSetHeader>(`INSERT INTO web_admin_flash_sale_items
      (campaign_id,product_id,flash_price,quota_total,min_quantity_per_order,max_quantity_per_order,max_quantity_per_buyer)
      VALUES(?,?,100,1,1,1,1)`, [campaignId, productId]);
    itemId = Number(itemResult.insertId);
    const offer: FlashSaleOffer = {
      campaignId, campaignCode: `TEST_${token}`, campaignSlug: `test-${token}`, campaignName: `Atomic quota ${token}`,
      itemId, productId, flashPrice: 100, regularPrice: 200, quotaTotal: 1, quotaReserved: 0, quotaSold: 0,
      remainingQuantity: 1, minQuantityPerOrder: 1, maxQuantityPerOrder: 1, maxQuantityPerBuyer: 1,
      stackingMode: 'exclusive', audienceMode: 'all', startsAt: new Date(Date.now() - 3_600_000).toISOString(), endsAt: new Date(Date.now() + 3_600_000).toISOString(),
    };
    const reserve = async (orderId: number, phone: string) => {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        await reserveFlashSalesForOrder(connection, [{ productId, quantity: 1, price: 100, regularPrice: 200, available: true, flashSale: offer }], orderId, null, phone);
        await connection.commit();
        return orderId;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    };

    const results = await Promise.allSettled([
      reserve(orderIds[0], '0900000001'),
      reserve(orderIds[1], '0900000002'),
    ]);
    assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
    assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
    const successfulOrderId = (results.find((result): result is PromiseFulfilledResult<number> => result.status === 'fulfilled'))!.value;

    const [counterRows] = await pool.query<RowDataPacket[]>('SELECT quota_reserved,quota_sold FROM web_admin_flash_sale_items WHERE id=?', [itemId]);
    assert.equal(Number(counterRows[0]?.quota_reserved), 1);
    assert.equal(Number(counterRows[0]?.quota_sold), 0);

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      assert.equal(await transitionFlashSaleAllocations(connection, successfulOrderId, 'released'), 1);
      await connection.commit();
    } finally {
      connection.release();
    }
    const [releasedRows] = await pool.query<RowDataPacket[]>('SELECT quota_reserved,quota_sold FROM web_admin_flash_sale_items WHERE id=?', [itemId]);
    assert.deepEqual([Number(releasedRows[0]?.quota_reserved), Number(releasedRows[0]?.quota_sold)], [0, 0]);
  } finally {
    if (campaignId) {
      await pool.query('DELETE FROM web_admin_flash_sale_allocations WHERE campaign_id=?', [campaignId]);
      if (itemId) await pool.query('DELETE FROM web_admin_flash_sale_buyer_usage WHERE item_id=?', [itemId]);
      await pool.query('DELETE FROM web_admin_flash_sale_items WHERE campaign_id=?', [campaignId]);
      await pool.query('DELETE FROM web_admin_flash_sale_campaigns WHERE id=?', [campaignId]);
    }
  }
});

test.after(async () => {
  if (enabled) await pool.end();
});
