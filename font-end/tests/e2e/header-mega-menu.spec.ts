import { expect, test } from '@playwright/test';

const categoryPath = '/linh-kien-may-tinh.html';

test('desktop mega menu stays attached to the menu bar and closes when the bar hides', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop-only regression.');

  await page.goto(categoryPath);

  const menuButton = page.locator('#menuBorderDesktop');
  await expect(menuButton).toBeVisible();
  await menuButton.click();

  const megaMenu = page.locator('#megaMenu');
  const headerNav = page.locator('#bottom-header-menu');
  await expect(megaMenu).toHaveClass(/show-menu/);
  await expect.poll(async () => {
    const [menuBox, navBox] = await Promise.all([megaMenu.boundingBox(), headerNav.boundingBox()]);
    return Boolean(menuBox && navBox && menuBox.y >= navBox.y + navBox.height - 1);
  }).toBe(true);

  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollTo(0, 900));

  const submenu = page.locator('.header-submenu-motion');
  await expect(submenu).toHaveClass(/is-hidden/);
  await expect(megaMenu).toHaveClass(/hidden-menu/);

  await page.waitForTimeout(500);
  await page.evaluate(() => window.scrollBy(0, -100));
  await expect(submenu).toHaveClass(/is-visible/);
  await expect(megaMenu).toHaveClass(/hidden-menu/);

  await expect(menuButton).toBeVisible();
});

test('mobile mega menu remains between the header and bottom navigation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'Mobile-only regression.');

  await page.goto(categoryPath);
  await page.locator('#menuBorderMobile').click();

  const megaMenu = page.locator('#megaMenu');
  await expect(megaMenu).toHaveClass(/show-menu/);
  await expect.poll(async () => {
    const menuBox = await megaMenu.boundingBox();
    const viewport = page.viewportSize();
    return Boolean(menuBox && viewport && menuBox.y >= 64 && menuBox.y + menuBox.height <= viewport.height - 60 + 1);
  }).toBe(true);
});
