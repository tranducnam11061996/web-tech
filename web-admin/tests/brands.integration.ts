import assert from 'node:assert/strict';
import test from 'node:test';
import type { RowDataPacket } from 'mysql2/promise';
import pool from '../src/lib/db';
import { getAdminBrand, updateAdminBrand } from '../src/lib/admin/brands';

test('brand editor updates summary and seller-zero rich text transactionally', async (t) => {
  const [databaseRows] = await pool.query<RowDataPacket[]>('SELECT DATABASE() db');
  const database = String(databaseRows[0]?.db || '');
  if (process.env.BRAND_EDIT_DESTRUCTIVE_TEST !== 'true' || !/(?:test|tmp|disposable)/i.test(database)) {
    t.skip('requires BRAND_EDIT_DESTRUCTIVE_TEST=true and an explicitly disposable database');
    return;
  }

  const [brandRows] = await pool.query<RowDataPacket[]>('SELECT id FROM idv_brand ORDER BY id LIMIT 1');
  const brandId = Number(brandRows[0]?.id || 0);
  assert.ok(brandId > 0);
  const original = await getAdminBrand(brandId);
  const marker = `brand-editor-${Date.now()}`;

  try {
    const updated = await updateAdminBrand(brandId, {
      ...original,
      summary: `summary-${marker}`,
      description: `<p>${marker}</p>`,
      featured: original.featured,
      status: original.status,
    });
    assert.equal(updated.summary, `summary-${marker}`);
    assert.equal(updated.description, `<p>${marker}</p>`);

    const [infoRows] = await pool.query<RowDataPacket[]>(
      'SELECT description FROM idv_brand_info WHERE id = ? AND sellerId = 0',
      [brandId],
    );
    assert.equal(infoRows.length, 1);
    assert.equal(String(infoRows[0].description), `<p>${marker}</p>`);

    await updateAdminBrand(brandId, {
      ...updated,
      featured: updated.featured,
      status: updated.status,
    });
    const [unchangedRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM idv_brand_info WHERE id = ? AND sellerId = 0',
      [brandId],
    );
    assert.equal(unchangedRows.length, 1);

    await pool.query('DELETE FROM idv_brand_info WHERE id = ? AND sellerId = 0', [brandId]);
    const recreated = await updateAdminBrand(brandId, {
      ...updated,
      description: `<p>recreated-${marker}</p>`,
      featured: updated.featured,
      status: updated.status,
    });
    assert.equal(recreated.description, `<p>recreated-${marker}</p>`);
    const [recreatedRows] = await pool.query<RowDataPacket[]>(
      'SELECT id FROM idv_brand_info WHERE id = ? AND sellerId = 0',
      [brandId],
    );
    assert.equal(recreatedRows.length, 1);
  } finally {
    await updateAdminBrand(brandId, {
      ...original,
      featured: original.featured,
      status: original.status,
    });
  }
});

test.after(async () => {
  await pool.end();
});
