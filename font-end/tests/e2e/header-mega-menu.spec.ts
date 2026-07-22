import { expect, test } from '@playwright/test';

const categoryPath = '/linh-kien-may-tinh.html';
const utilityOrder = ['account', 'cart', 'favorites', 'assistant'];

test('desktop header utilities use the published admin order without changing geometry', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop-only regression.');

  await page.goto(categoryPath);
  const utilities = page.locator('[data-header-utilities="desktop"]');
  const items = utilities.locator(':scope > [data-header-utility]');
  await expect(items).toHaveCount(4);
  expect(await items.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-header-utility')))).toEqual(utilityOrder);
  expect(await utilities.evaluate((node) => getComputedStyle(node).columnGap)).toBe('24px');
  await expect(items.nth(0).locator('svg')).toHaveCSS('width', '20px');

  await items.nth(0).hover();
  await expect(page.locator('.customer-account-menu [role="menu"]')).toBeVisible();
  await expect(items.nth(1)).toHaveAttribute('href', '/gio-hang');
  await expect(items.nth(1).locator('span')).toHaveText(/\d+/);
  await expect(items.nth(2)).toHaveAttribute('href', '/yeu-thich');
  await expect(items.nth(3)).toHaveJSProperty('tagName', 'BUTTON');

  const currentUrl = page.url();
  await items.nth(3).click();
  expect(page.url()).toBe(currentUrl);
});

test('mobile header utilities use the same published order and visibility metadata', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'Mobile-only regression.');

  await page.goto(categoryPath);
  const utilities = page.locator('[data-header-utilities="mobile"]');
  const items = utilities.locator(':scope > [data-header-utility]');
  await expect(items).toHaveCount(4);
  expect(await items.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-header-utility')))).toEqual(utilityOrder);
  await expect(items.nth(0).locator('svg')).toHaveCSS('width', '24px');
  await expect(items.nth(1)).toHaveAttribute('href', '/gio-hang');
  await expect(items.nth(2)).toHaveAttribute('href', '/yeu-thich');
  await expect(items.nth(3)).toHaveJSProperty('tagName', 'BUTTON');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('desktop mega menu stays attached to the menu bar and closes when the bar hides', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop-only regression.');

  await page.goto(categoryPath);

  await expect(page.getByRole('button', { name: 'Chế độ tối' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Thêm tùy chọn' })).toHaveCount(0);
  await expect(page.locator('header .w-px.bg-dark-border')).toHaveCount(0);

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
  await expect(page.getByRole('button', { name: 'Mở thêm tùy chọn' })).toHaveCount(0);
  await page.locator('#menuBorderMobile').click();

  const megaMenu = page.locator('#megaMenu');
  await expect(megaMenu).toHaveClass(/show-menu/);
  await expect.poll(async () => {
    const menuBox = await megaMenu.boundingBox();
    const viewport = page.viewportSize();
    return Boolean(menuBox && viewport && menuBox.y >= 64 && menuBox.y + menuBox.height <= viewport.height - 60 + 1);
  }).toBe(true);
});
