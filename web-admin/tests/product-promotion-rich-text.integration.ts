import assert from 'node:assert/strict';
import test from 'node:test';
import type { RowDataPacket } from 'mysql2/promise';
import pool from '../src/lib/db';
import { loadProductCorePayload } from '../src/lib/publicProductDetail';
import { parseProductEditorPromotions } from '../src/lib/productPromotionRichText';

test('public product detail appends sanitized editor promotions after managed promotions', async (t) => {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT p.id, p.specialOffer, u.request_path
    FROM idv_sell_product_store p
    JOIN idv_url u ON u.id_path=CONCAT('module:product/view:product-detail/view_id:', p.id)
    WHERE p.specialOffer IS NOT NULL AND TRIM(p.specialOffer)<>''
      AND u.request_path LIKE '/%'
    ORDER BY p.id DESC
    LIMIT 1
  `);
  const row = rows[0];
  if (!row) {
    t.skip('catalog has no routed product with editor promotions');
    return;
  }

  const productId = Number(row.id);
  const expectedEditorPromotions = parseProductEditorPromotions(productId, row.specialOffer);
  const slug = String(row.request_path).replace(/^\/+/, '');
  const payload = await loadProductCorePayload(slug);
  assert.equal(payload.success, true);
  assert.ok('data' in payload);
  const data = payload.data as Record<string, unknown>;
  const promotions = data.productPromotions as Array<{ id: number | string; source: string; html?: string }>;
  const firstEditorIndex = promotions.findIndex((promotion) => promotion.source === 'product-editor');

  assert.ok(firstEditorIndex >= 0);
  assert.ok(promotions.slice(0, firstEditorIndex).every((promotion) => promotion.source === 'managed'));
  assert.ok(promotions.slice(firstEditorIndex).every((promotion) => promotion.source === 'product-editor'));
  assert.equal(promotions.length - firstEditorIndex, expectedEditorPromotions.length);
  assert.ok(promotions.slice(firstEditorIndex).every((promotion) => typeof promotion.html === 'string'));
  assert.equal('specialOffer' in data, false);
});

test.after(async () => {
  await pool.end();
});
