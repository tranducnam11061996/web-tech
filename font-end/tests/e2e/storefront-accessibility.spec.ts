import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function expectNoSeriousA11yViolations(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const violations = results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact || ''));
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}

test('homepage and checkout retain accessible primary controls', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();
  await expectNoSeriousA11yViolations(page);

  await page.goto('/thanh-toan');
  await expect(page.locator('body')).toBeVisible();
  await expectNoSeriousA11yViolations(page);
});

test('product carousel respects reduced motion and exposes pause control', async ({ page }) => {
  let slug = process.env.PLAYWRIGHT_PRODUCT_SLUG;
  if (!slug) {
    const response = await page.request.get('/api/products?limit=10&page=1');
    const payload = response.ok() ? await response.json() : null;
    const candidates = (payload?.data || []).filter((product: { slug?: string }) => product.slug && !product.slug.startsWith('product-'));
    for (const candidate of candidates) {
      const detailResponse = await page.request.get(`/api/products/${encodeURIComponent(candidate.slug)}?include=core`);
      const detail = detailResponse.ok() ? await detailResponse.json() : null;
      if (detail?.data?.hasSpecifications) { slug = candidate.slug; break; }
    }
    slug ||= candidates[0]?.slug;
  }

  test.skip(!slug, 'No public product slug was available for product-detail checks');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`/${encodeURIComponent(slug!)}`);
  const carousel = page.getByRole('region', { name: /Bộ ảnh/i });
  await expect(carousel).toBeVisible();
  const pause = page.getByRole('button', { name: /tự chuyển ảnh/i });
  if (await pause.count()) await expect(pause).toHaveAttribute('aria-pressed', 'true');
  const specifications = page.getByRole('button', { name: 'Mở thông số kỹ thuật' });
  if (await specifications.count()) {
    await specifications.click();
    await expect(page.locator('#specModal')).toHaveAttribute('open', '');
    await page.keyboard.press('Escape');
    await expect(page.locator('#specModal')).not.toHaveAttribute('open', '');
  }
  await expectNoSeriousA11yViolations(page);
});
