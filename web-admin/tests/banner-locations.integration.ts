import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '../src/lib/db';
import { AdminApiError } from '../src/lib/admin/common';
import {
  DEFAULT_BANNER_LOCATION_KEY,
  DEFAULT_BANNER_LOCATION_TEMPLATE,
  deleteBannerLocationInTransaction,
  deleteBannerLocation,
  saveAdminBanner,
  verifyBannerLocationInfrastructure,
} from '../src/lib/admin/banners';

test.after(async () => {
  await pool.end();
});

test('banner-location deletion reassigns and hides banners without deleting related data', async () => {
  await verifyBannerLocationInfrastructure(pool);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 16);
    const [locationResult] = await connection.query<ResultSetHeader>(`
      INSERT INTO idv_seller_ad_location (template_page, index_key, name, description, last_update)
      VALUES ('homepage', ?, 'Integration location', '', NOW())
    `, [`integration_${suffix}`]);
    const locationId = Number(locationResult.insertId);
    const now = Math.trunc(Date.now() / 1000);
    const [bannerResult] = await connection.query<ResultSetHeader>(`
      INSERT INTO idv_seller_ad
        (template_page, location, location_index, name, fileUrl, width, height, status, lastUpdate)
      VALUES ('homepage', ?, ?, 'Integration banner', '/integration-banner.jpg', 1200, 300, 1, ?)
    `, [locationId, `integration_${suffix}`, now]);
    const bannerId = Number(bannerResult.insertId);
    await connection.query('INSERT INTO web_admin_banner_meta (ad_id, alt_text) VALUES (?, ?)', [bannerId, 'Integration banner']);
    await connection.query('INSERT INTO idv_seller_ad_category (adId, catId, sellerId) VALUES (?, 0, 0)', [bannerId]);
    await connection.query(
      'INSERT INTO idv_seller_ad_log (adId, timeVisit, dateFull, isHuman, ip, referer) VALUES (?, NOW(), CURDATE(), 1, ?, ?)',
      [bannerId, '127.0.0.1', 'integration-test'],
    );

    const deleted = await deleteBannerLocationInTransaction(connection, locationId);
    assert.equal(deleted.id, locationId);
    assert.equal(deleted.reassignedBannerCount, 1);
    assert.equal(deleted.defaultLocation.key, DEFAULT_BANNER_LOCATION_KEY);

    const [locationRows] = await connection.query<RowDataPacket[]>('SELECT id FROM idv_seller_ad_location WHERE id = ?', [locationId]);
    assert.equal(locationRows.length, 0);
    const [bannerRows] = await connection.query<RowDataPacket[]>(
      'SELECT location, location_index, template_page, status FROM idv_seller_ad WHERE id = ?',
      [bannerId],
    );
    assert.equal(Number(bannerRows[0]?.location), deleted.defaultLocation.id);
    assert.equal(String(bannerRows[0]?.location_index), DEFAULT_BANNER_LOCATION_KEY);
    assert.equal(String(bannerRows[0]?.template_page), DEFAULT_BANNER_LOCATION_TEMPLATE);
    assert.equal(Number(bannerRows[0]?.status), 0);

    for (const [table, column] of [
      ['web_admin_banner_meta', 'ad_id'],
      ['idv_seller_ad_category', 'adId'],
      ['idv_seller_ad_log', 'adId'],
    ] as const) {
      const [relatedRows] = await connection.query<RowDataPacket[]>(`SELECT COUNT(*) AS total FROM ${table} WHERE ${column} = ?`, [bannerId]);
      assert.equal(Number(relatedRows[0]?.total), 1, `${table} relation must be retained`);
    }
    await connection.rollback();
  } finally {
    connection.release();
  }
});

test('the default banner location is protected and unknown ids return not found', async () => {
  await verifyBannerLocationInfrastructure(pool);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [defaultRows] = await connection.query<RowDataPacket[]>(
      'SELECT id FROM idv_seller_ad_location WHERE index_key = ? LIMIT 1',
      [DEFAULT_BANNER_LOCATION_KEY],
    );
    const defaultId = Number(defaultRows[0]?.id || 0);
    await assert.rejects(
      () => deleteBannerLocationInTransaction(connection, defaultId),
      (error: unknown) => error instanceof AdminApiError && error.status === 409 && error.fields?.location === 'default_location_protected',
    );
    await assert.rejects(
      () => deleteBannerLocationInTransaction(connection, 2_147_483_647),
      (error: unknown) => error instanceof AdminApiError && error.status === 404,
    );
    await connection.rollback();
  } finally {
    connection.release();
  }
});

test('concurrent banner save and location delete never create an orphan', async (context) => {
  const [databaseRows] = await pool.query<RowDataPacket[]>('SELECT DATABASE() AS database_name');
  const databaseName = String(databaseRows[0]?.database_name || '');
  if (process.env.BANNER_LOCATION_DESTRUCTIVE_TEST !== 'true' || !/^it_tech_db_(?:banner_location_clone_\d{8,14}|backup_test_\d+_[a-f0-9]+)$/.test(databaseName)) {
    context.skip('requires BANNER_LOCATION_DESTRUCTIVE_TEST=true on a disposable banner-location clone');
    return;
  }

  const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 16);
  const locationKey = `concurrent_${suffix}`;
  const bannerName = `Concurrent banner ${suffix}`;
  let locationId = 0;
  let bannerId = 0;
  try {
    const [locationResult] = await pool.query<ResultSetHeader>(`
      INSERT INTO idv_seller_ad_location (template_page, index_key, name, description, last_update)
      VALUES ('homepage', ?, 'Concurrent location', '', NOW())
    `, [locationKey]);
    locationId = Number(locationResult.insertId);
    const [saveResult, deleteResult] = await Promise.allSettled([
      saveAdminBanner({
        locationId,
        name: bannerName,
        imageUrl: '/concurrent-banner.jpg',
        width: 1200,
        height: 300,
        status: 1,
      }),
      deleteBannerLocation(locationId),
    ]);
    assert.equal(deleteResult.status, 'fulfilled');
    if (saveResult.status === 'fulfilled') bannerId = Number(saveResult.value.id);
    else assert.ok(saveResult.reason instanceof AdminApiError);

    const [remainingLocations] = await pool.query<RowDataPacket[]>('SELECT id FROM idv_seller_ad_location WHERE id = ?', [locationId]);
    assert.equal(remainingLocations.length, 0);
    const [orphans] = await pool.query<RowDataPacket[]>(`
      SELECT COUNT(*) AS total
      FROM idv_seller_ad ad
      LEFT JOIN idv_seller_ad_location loc ON loc.id = ad.location
      WHERE ad.name = ? AND loc.id IS NULL
    `, [bannerName]);
    assert.equal(Number(orphans[0]?.total || 0), 0);
    if (bannerId) {
      const [savedRows] = await pool.query<RowDataPacket[]>(
        'SELECT location_index, template_page, status FROM idv_seller_ad WHERE id = ?',
        [bannerId],
      );
      assert.equal(String(savedRows[0]?.location_index), DEFAULT_BANNER_LOCATION_KEY);
      assert.equal(String(savedRows[0]?.template_page), DEFAULT_BANNER_LOCATION_TEMPLATE);
      assert.equal(Number(savedRows[0]?.status), 0);
    }
  } finally {
    const [bannerRows] = await pool.query<RowDataPacket[]>('SELECT id FROM idv_seller_ad WHERE name = ?', [bannerName]);
    for (const row of bannerRows) {
      const id = Number(row.id);
      await pool.query('DELETE FROM idv_seller_ad_category WHERE adId = ?', [id]);
      await pool.query('DELETE FROM web_admin_banner_meta WHERE ad_id = ?', [id]);
      await pool.query('DELETE FROM idv_seller_ad_log WHERE adId = ?', [id]);
      await pool.query('DELETE FROM idv_seller_ad WHERE id = ?', [id]);
    }
    if (locationId) await pool.query('DELETE FROM idv_seller_ad_location WHERE id = ?', [locationId]);
  }
});
