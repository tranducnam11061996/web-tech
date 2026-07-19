import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test('Flash Sale renders the shared shell, dark layout, and accessible quota states', async ({ page }) => {
  await page.goto('/flash-sale', { waitUntil: 'domcontentloaded' });

  const main = page.locator('main');
  await expect(page.locator('header')).toBeVisible();
  await expect(page.getByRole('heading', { name: /flash sale/i, level: 1 })).toBeVisible();
  await expect(main).toHaveCSS('background-color', 'rgb(7, 7, 10)');
  await expect(page.locator('footer')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);

  const progressBars = page.getByRole('progressbar');
  for (let index = 0; index < await progressBars.count(); index += 1) {
    const progress = progressBars.nth(index);
    await expect(progress).toHaveAttribute('aria-valuemin', '0');
    await expect(progress).toHaveAttribute('aria-valuemax', /\d+/);
    await expect(progress).toHaveAttribute('aria-valuenow', /\d+/);
  }

  const accessibility = await new AxeBuilder({ page }).analyze();
  expect(accessibility.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact || ''))).toEqual([]);
});
