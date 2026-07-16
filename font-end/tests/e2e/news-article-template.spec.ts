import AxeBuilder from '@axe-core/playwright';
import { expect, test, type APIRequestContext } from '@playwright/test';

const slug = process.env.PLAYWRIGHT_NEWS_ARTICLE_SLUG || 'o-cung-ssd-samsung-pcie-6-0-bat-dau-duoc-san-xuat-hang-loat';
const articlePath = `/tin-tuc/${slug}`;

async function articlePayload(request: APIRequestContext) {
  const response = await request.get(`/api/news/${slug}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

test('news article binds the single-article template to public API data', async ({ page, request }, testInfo) => {
  const payload = await articlePayload(request);
  await page.goto(articlePath);

  await expect(page.locator('header').first()).toBeVisible();
  await expect(page.locator('footer').first()).toBeVisible();
  await expect(page.locator('[data-article-template] h1')).toHaveText(payload.data.title);
  await expect(page.locator('[data-article-content]')).toContainText(payload.data.summary);
  await expect(page.locator('[data-article-header] > div').first().locator('span.text-sm.text-gray-500')).toHaveCount(0);
  await expect(page.getByText('Cùng danh mục', { exact: true })).toHaveCount(0);
  await expect(page.locator('[data-featured-news-categories]')).toBeVisible();
  await expect(page.locator('[data-most-read-news]')).toBeVisible();
  await expect(page.locator('[data-pc-build-promotion]')).toBeVisible();

  const sidebarBlocks = await page.locator('[data-article-sidebar] > *').evaluateAll((elements) => elements.map((element) => {
    if (element.hasAttribute('data-featured-news-categories')) return 'featured';
    if (element.hasAttribute('data-most-read-news')) return 'most-read';
    if (element.hasAttribute('data-pc-build-promotion-sticky')) return 'promotion';
    return 'unknown';
  }));
  expect(sidebarBlocks).toEqual(['featured', 'most-read', 'promotion']);

  const related = page.locator('[data-related-article]');
  await expect(related).toHaveCount(payload.data.relatedNews.length);
  expect(await related.evaluateAll((elements) => elements.map((element) => element.getAttribute('href')))).toEqual(
    payload.data.relatedNews.map((article: { url: string }) => `/tin-tuc/${article.url}`),
  );
  expect(await related.evaluateAll((elements, currentPath) => elements.some((element) => element.getAttribute('href') === currentPath), articlePath)).toBeFalsy();

  if (!String(payload.data.tags || '').trim()) {
    await expect(page.locator('[data-article-tags-share]').getByText('Tags:', { exact: true })).toHaveCount(0);
  }
  await expect(page.locator('[data-article-share-controls]')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);

  const mainBox = await page.locator('[data-article-main]').boundingBox();
  const sidebarBox = await page.locator('[data-article-sidebar]').boundingBox();
  expect(mainBox).not.toBeNull();
  expect(sidebarBox).not.toBeNull();
  if (testInfo.project.name === 'desktop-chromium') {
    expect(Math.abs((mainBox?.y || 0) - (sidebarBox?.y || 0))).toBeLessThan(2);
    const columnsWidth = (mainBox?.width || 0) + (sidebarBox?.width || 0);
    expect((mainBox?.width || 0) / columnsWidth).toBeGreaterThan(0.68);
    expect((mainBox?.width || 0) / columnsWidth).toBeLessThan(0.72);
  } else {
    expect(sidebarBox?.y || 0).toBeGreaterThan((mainBox?.y || 0) + (mainBox?.height || 0) - 2);
  }
});

test('article share controls are keyboard-accessible and use the canonical browser URL', async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'share interactions are covered once');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(articlePath);

  const facebookPopupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Chia sẻ bài viết lên Facebook' }).click();
  const facebookPopup = await facebookPopupPromise;
  expect(facebookPopup.url()).toContain('facebook.com/sharer/sharer.php');
  await facebookPopup.close();

  const xPopupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Chia sẻ bài viết lên X' }).click();
  const xPopup = await xPopupPromise;
  expect(xPopup.url()).toMatch(/(?:twitter|x)\.com\/intent\/tweet/);
  await xPopup.close();

  const copyButton = page.getByRole('button', { name: 'Sao chép liên kết bài viết' });
  await copyButton.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Đã sao chép liên kết bài viết' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${new URL(articlePath, page.url()).origin}${articlePath}`);

  const accessibility = await new AxeBuilder({ page })
    .include('[data-article-share-controls]')
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(accessibility.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact || ''))).toEqual([]);
});

test('article promotion sticks 110px below the desktop header and remains in flow on mobile', async ({ page }, testInfo) => {
  await page.goto(articlePath);
  const stickyBanner = page.locator('[data-pc-build-promotion-sticky]');
  await expect(stickyBanner).toBeVisible();
  const style = await stickyBanner.evaluate((element) => ({
    position: getComputedStyle(element).position,
    top: getComputedStyle(element).top,
  }));

  if (testInfo.project.name === 'desktop-chromium') {
    expect(style).toEqual({ position: 'sticky', top: '110px' });
    const documentTop = await stickyBanner.evaluate((element) => element.getBoundingClientRect().top + window.scrollY);
    await page.evaluate((top) => window.scrollTo(0, top - 110 + 240), documentTop);
    await expect.poll(async () => (await stickyBanner.boundingBox())?.y || 0).toBeGreaterThanOrEqual(109);
    await expect.poll(async () => (await stickyBanner.boundingBox())?.y || 0).toBeLessThanOrEqual(111);
  } else {
    expect(style).toEqual({ position: 'static', top: 'auto' });
  }
});
