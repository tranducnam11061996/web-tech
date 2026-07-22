import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const adminBaseUrl = process.env.WEB_ADMIN_E2E_BASE_URL || '';
const sessionToken = process.env.WEB_ADMIN_E2E_SESSION_TOKEN || '';

test.describe('admin banner locations', () => {
  test.skip(!adminBaseUrl || !sessionToken, 'requires an isolated web-admin server and disposable admin session');

  test.beforeEach(async ({ context }) => {
    const target = new URL(adminBaseUrl);
    await context.addCookies([{
      name: 'admin_session',
      value: sessionToken,
      domain: target.hostname,
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
      secure: target.protocol === 'https:',
    }]);
  });

  test('deletes a location through an accessible confirmation and preserves its banner', async ({ page }) => {
    const suffix = Date.now().toString(36);
    const locationKey = `e2e_delete_${suffix}`;
    const locationName = `E2E location ${suffix}`;
    const bannerName = `E2E banner ${suffix}`;
    let bannerId = 0;

    const createLocation = await page.request.post(`${adminBaseUrl}/api/admin/banner-locations`, {
      headers: { Origin: adminBaseUrl },
      data: { templatePage: 'homepage', key: locationKey, name: locationName, description: 'Playwright fixture' },
    });
    expect(createLocation.ok()).toBeTruthy();
    const locationId = Number((await createLocation.json()).data.id);

    try {
      const createBanner = await page.request.post(`${adminBaseUrl}/api/admin/banners`, {
        headers: { Origin: adminBaseUrl },
        data: {
          locationId,
          name: bannerName,
          imageUrl: '/e2e-banner.jpg',
          width: 1200,
          height: 300,
          status: 1,
        },
      });
      expect(createBanner.ok()).toBeTruthy();
      bannerId = Number((await createBanner.json()).data.id);

      await page.goto(`${adminBaseUrl}/banner/locations`);
      const row = page.getByRole('row', { name: new RegExp(locationName) });
      await expect(row).toBeVisible();
      const deleteButton = row.getByRole('button', { name: `Xóa vị trí ${locationName}` });
      await deleteButton.click();
      const dialog = page.getByRole('dialog', { name: 'Xóa vĩnh viễn vị trí banner?' });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByText('Tổng banner: 1')).toBeVisible();
      await expect(dialog.getByRole('button', { name: 'Hủy' })).toBeFocused();

      await page.keyboard.press('Escape');
      await expect(dialog).toBeHidden();
      await expect(deleteButton).toBeFocused();

      await deleteButton.click();
      const accessibility = await new AxeBuilder({ page }).include('[role="dialog"]').analyze();
      expect(accessibility.violations.filter((item) => ['serious', 'critical'].includes(item.impact || ''))).toEqual([]);
      await dialog.getByRole('button', { name: 'Xác nhận xóa' }).click();
      await expect(dialog).toBeHidden();
      await expect(page.getByRole('status')).toContainText('1 banner đã được chuyển');
      await expect(row).toHaveCount(0);

      const bannersResponse = await page.request.get(`${adminBaseUrl}/api/admin/banners?q=${encodeURIComponent(bannerName)}`);
      expect(bannersResponse.ok()).toBeTruthy();
      const banners = (await bannersResponse.json()).data.items;
      expect(banners).toHaveLength(1);
      expect(banners[0]).toMatchObject({ id: bannerId, locationKey: 'unassigned', templatePage: 'unassigned', status: 0 });

      const publicResponse = await page.request.get(`${adminBaseUrl}/api/banners/location/unassigned`);
      expect(publicResponse.ok()).toBeTruthy();
      expect((await publicResponse.json()).data.locations).toEqual([]);

      const defaultRow = page.getByRole('row', { name: /Chưa có vị trí/ });
      await expect(defaultRow.getByText('Mặc định')).toBeVisible();
      await expect(defaultRow.getByRole('button', { name: /Xóa vị trí/ })).toHaveCount(0);
      await defaultRow.getByRole('button', { name: 'Sửa' }).click();
      await expect(page.getByLabel('Template page')).toBeDisabled();
      await expect(page.getByLabel('Mã vị trí')).toBeDisabled();
    } finally {
      await page.request.delete(`${adminBaseUrl}/api/admin/banner-locations/${locationId}`, {
        headers: { Origin: adminBaseUrl },
      });
      if (bannerId) {
        await page.request.delete(`${adminBaseUrl}/api/admin/banners/${bannerId}?mode=permanent`, {
          headers: { Origin: adminBaseUrl },
        });
      }
    }
  });
});
