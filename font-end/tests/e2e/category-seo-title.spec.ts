import { expect, test } from '@playwright/test';
import { getCategoryDisplayTitle } from '../../src/lib/categoryTitle';

test('category title resolver rejects invalid SEO titles after trimming', () => {
  expect(getCategoryDisplayTitle(null, 'PC SSD 512GB')).toBe('PC SSD 512GB');
  expect(getCategoryDisplayTitle('', 'PC SSD 512GB')).toBe('PC SSD 512GB');
  expect(getCategoryDisplayTitle('  0  ', 'PC SSD 512GB')).toBe('PC SSD 512GB');
  expect(getCategoryDisplayTitle('  CPU ', 'PC SSD 512GB')).toBe('PC SSD 512GB');
  expect(getCategoryDisplayTitle('  SSD Gaming  ', 'PC SSD 512GB')).toBe('SSD Gaming');
  expect(getCategoryDisplayTitle('', '   ')).toBe('Danh mục sản phẩm');
});

test('category title falls back to the category name and keeps only sorting control', async ({ page }) => {
  await page.goto('/pc-ssd-512gb');

  await expect(page).toHaveTitle('PC SSD 512GB');
  await expect(page.getByRole('heading', { name: 'PC SSD 512GB (423 sản phẩm)' }).first()).toBeVisible();
  await expect(page.getByPlaceholder('Search...')).toHaveCount(0);

  let sort = page.locator('[data-category-sort="desktop"]');
  if ((page.viewportSize()?.width || 0) < 1024) {
    await page.locator('[data-category-filter-trigger]').click();
    sort = page.locator('[data-category-sort="mobile"]');
  }
  await expect(sort).toBeVisible();
  await sort.selectOption('price_asc');
  await expect(page).toHaveURL(/pc-ssd-512gb\?sort=price_asc$/);
});

test('category with a valid SEO title keeps it in the document title', async ({ page }) => {
  await page.goto('/linh-kien-may-tinh.html');
  await expect(page).toHaveTitle('Linh kiện máy tính - Chính Hãng - Giá tốt');
});
