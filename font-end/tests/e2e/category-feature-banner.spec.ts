import { expect, test } from '@playwright/test';

const CATEGORY_PATH = '/bo-pc-gaming-livestream.html';

test('category page binds its configured feature data into the top banner', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop category-banner geometry is verified once');

  const apiResponse = await page.request.get('http://localhost:3000/api/products/bo-pc-gaming-livestream.html?include=core');
  expect(apiResponse.ok()).toBe(true);
  const apiPayload = await apiResponse.json();
  const configuredFeature = apiPayload?.data?.featureBox;
  expect(configuredFeature?.backgroundImageUrl).toBeTruthy();

  await page.goto(CATEGORY_PATH, { waitUntil: 'domcontentloaded' });
  const bannerSlot = page.locator('[data-category-page-feature]:visible').first();
  const feature = bannerSlot.locator('[data-category-feature-box]');
  await expect(bannerSlot).toBeVisible();
  await expect(feature).toHaveAttribute('href', configuredFeature.targetUrl);
  await expect(feature).toHaveAttribute('target', '_blank');
  await expect(feature.locator('img')).toHaveAttribute('src', /category|api\/media/i);
  await expect(feature.locator('[data-feature-headline]')).toHaveText(configuredFeature.headline);
  if (configuredFeature.subheading) {
    await expect(feature.locator('[data-feature-subheading]')).toHaveText(configuredFeature.subheading);
  }
  await expect(feature.locator('[data-feature-cta]')).toHaveCount(0);
  await expect(page.locator('[data-category-summary][data-summary-fallback]:visible').first()).toHaveText(
    'Sẵn kho - Đa dạng - Giá tốt - Bảo hành chính hãng',
  );
  await expect(page.locator('#productGrid [data-category-feature-box]')).toHaveCount(0);

  const bannerBox = await bannerSlot.boundingBox();
  const heroRowBox = await bannerSlot.locator('xpath=..').boundingBox();
  expect(bannerBox).not.toBeNull();
  expect(heroRowBox).not.toBeNull();
  expect(bannerBox!.width).toBeGreaterThan(heroRowBox!.width * 0.45);
  expect(bannerBox!.width).toBeLessThan(heroRowBox!.width * 0.52);
  expect(bannerBox!.width / bannerBox!.height).toBeGreaterThan(2.3);
  expect(bannerBox!.width / bannerBox!.height).toBeLessThan(2.8);
});

test('category feature banner remains first and contained on mobile', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'Mobile category-banner behavior is verified once');

  await page.goto(CATEGORY_PATH, { waitUntil: 'domcontentloaded' });
  const bannerSlot = page.locator('[data-category-page-feature]:visible').first();
  await expect(bannerSlot).toBeVisible();
  await expect(bannerSlot.locator('[data-category-feature-box]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(await bannerSlot.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
});
