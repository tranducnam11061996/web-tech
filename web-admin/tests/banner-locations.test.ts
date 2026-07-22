import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BANNER_LOCATION_KEY_UNIQUE_INDEX,
  DEFAULT_BANNER_LOCATION_KEY,
  DEFAULT_BANNER_LOCATION_NAME,
  DEFAULT_BANNER_LOCATION_TEMPLATE,
} from '../src/lib/admin/banners';
import { getApiPermission } from '../src/lib/admin/permissions';

test('banner location delete uses the existing least-privilege permission', () => {
  assert.equal(
    getApiPermission('/api/admin/banner-locations/42', 'DELETE'),
    'marketing.banner_locations.delete',
  );
});

test('the reserved banner location contract is stable', () => {
  assert.equal(DEFAULT_BANNER_LOCATION_KEY, 'unassigned');
  assert.equal(DEFAULT_BANNER_LOCATION_TEMPLATE, 'unassigned');
  assert.equal(DEFAULT_BANNER_LOCATION_NAME, 'Chưa có vị trí');
  assert.equal(BANNER_LOCATION_KEY_UNIQUE_INDEX, 'uk_idv_seller_ad_location_index_key');
});
