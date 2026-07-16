import { expect, test, type Page } from '@playwright/test';

async function openHomepage(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const section = page.locator('[data-category-feature-section]').first();
  await expect(section).toBeVisible();
  return {
    section,
    grid: section.locator('[data-category-feature-grid]'),
    feature: section.locator('[data-category-feature-box]'),
    products: section.locator('[data-product-card]'),
  };
}

test('desktop category feature section renders a half-width hero plus nine ordered products', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop six-column geometry is verified once');
  const { section, grid, feature, products } = await openHomepage(page);

  await expect(products).toHaveCount(9);
  await expect(feature).toHaveAttribute('target', '_blank');
  await expect(section).toHaveAttribute('style', /background-color/i);
  await expect(section.locator('[data-category-feature-title]')).not.toContainText(/Deals/i);
  await expect(section.getByRole('link', { name: 'Xem tất cả' })).toBeVisible();
  await expect(section.getByRole('link', { name: 'View All' })).toHaveCount(0);
  await expect(feature.locator('span.h-px[aria-hidden="true"]')).toHaveCount(0);

  const subheading = feature.locator('[data-feature-subheading]');
  const headline = feature.locator('[data-feature-headline]');
  if (await subheading.count()) {
    expect(await feature.evaluate((node) => {
      const subtitle = node.querySelector('[data-feature-subheading]');
      const title = node.querySelector('[data-feature-headline]');
      return Boolean(subtitle && title && (subtitle.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING));
    })).toBe(true);
  }
  await expect(headline).toHaveCSS('white-space', 'pre-line');
  expect(Number.parseFloat(await headline.evaluate((node) => getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(48);
  const featureCta = feature.locator('[data-feature-cta]');
  await expect(featureCta).toBeVisible();
  expect(Number.parseFloat(await featureCta.evaluate((node) => getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(14);

  const gridBox = await grid.boundingBox();
  const featureBox = await feature.boundingBox();
  const productBoxes = await products.evaluateAll((nodes) => nodes.map((node) => {
    const box = node.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  }));
  expect(gridBox).not.toBeNull();
  expect(featureBox).not.toBeNull();
  expect(featureBox!.width).toBeGreaterThan(gridBox!.width * 0.47);
  expect(featureBox!.width).toBeLessThan(gridBox!.width * 0.53);

  const topRow = productBoxes.filter((box) => Math.abs(box.y - featureBox!.y) < 2);
  const lowerRow = productBoxes.filter((box) => box.y > featureBox!.y + 2);
  expect(topRow).toHaveLength(3);
  expect(lowerRow).toHaveLength(6);

  const boxPosition = await feature.getAttribute('data-box-position');
  if (boxPosition === 'right') {
    expect(Math.max(...topRow.map((box) => box.x))).toBeLessThan(featureBox!.x);
    await expect(feature).toHaveAttribute('data-content-position', 'left');
  } else {
    expect(featureBox!.x).toBeLessThan(Math.min(...topRow.map((box) => box.x)));
    await expect(feature).toHaveAttribute('data-content-position', 'right');
  }
});

test('mobile category feature section places the hero first without horizontal overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'Mobile stacking is verified once');
  const { section, feature, products } = await openHomepage(page);

  await expect(products).toHaveCount(9);
  const featureBox = await feature.boundingBox();
  const firstProductBox = await products.first().boundingBox();
  expect(featureBox).not.toBeNull();
  expect(firstProductBox).not.toBeNull();
  expect(featureBox!.y).toBeLessThan(firstProductBox!.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(await section.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
});
