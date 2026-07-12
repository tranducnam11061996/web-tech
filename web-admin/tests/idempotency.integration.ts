import assert from 'node:assert/strict';
import test from 'node:test';
import pool from '../src/lib/db';
import { claimOrderRequest, completeOrderRequest } from '../src/lib/orderInfrastructure';
import { PublicRequestError } from '../src/lib/publicRequest';

test('order idempotency replays matching payload and rejects a different payload', async () => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const key = `integration-${Date.now()}-${Math.random()}`;
    const first = await claimOrderRequest(connection, key, { items: [{ productId: 1, quantity: 1 }] });
    assert.equal(first.replay, null);
    const response = { success: true, data: { orderId: 999999, total: 1000, itemCount: 1 } };
    await completeOrderRequest(connection, first.id, 999999, response);
    const replay = await claimOrderRequest(connection, key, { items: [{ productId: 1, quantity: 1 }] });
    assert.deepEqual(replay.replay, response);
    await assert.rejects(
      claimOrderRequest(connection, key, { items: [{ productId: 1, quantity: 2 }] }),
      (error: unknown) => error instanceof PublicRequestError && error.code === 'IDEMPOTENCY_CONFLICT',
    );
    await connection.rollback();
  } finally { connection.release(); }
});

test.after(async () => { await pool.end(); });
