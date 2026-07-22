import AxeBuilder from '@axe-core/playwright';
import { expect, test, type APIRequestContext } from '@playwright/test';

const slug = process.env.PLAYWRIGHT_NEWS_CATEGORY_SLUG || 'tin-cong-nghe.html';
const categoryPath = `/tin-tuc/${slug}`;

async function categoryPayload(request: APIRequestContext, page = 1, sort = 'latest') {
  const response = await request.get(`/api/news-category/${slug}?page=${page}&limit=21&sort=${sort}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

test('news category uses the template structure and real API data without duplicated cards', async ({ page, request }, testInfo) => {
  const payload = await categoryPayload(request);
  test.skip(payload.news.length < 3, 'category fixture needs at least three public articles');
  await page.goto(categoryPath);

  const heroes = page.locator('[data-news-hero]');
  const listItems = page.locator('[data-news-list-item]');
  await expect(heroes).toHaveCount(3);
  await expect(listItems).toHaveCount(Math.max(0, payload.news.length - 3));
  await expect(page.locator('[data-pc-build-promotion]')).toContainText('HIỆU NĂNG TỐI ĐA');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(payload.data.name);
  await expect(page.locator('main').getByRole('link', { name: 'Tất cả', exact: true })).toHaveCount(0);
  await expect(page.locator('main').getByText('Sắp xếp:', { exact: true })).toHaveCount(0);
  await expect(page.locator('main select')).toHaveCount(0);

  const expectedHeroHrefs = payload.news.slice(0, 3).map((article: { url: string }) => `/tin-tuc/${article.url}`);
  expect(await heroes.evaluateAll((elements) => elements.map((element) => element.getAttribute('href')))).toEqual(expectedHeroHrefs);
  const listHrefs = await listItems.evaluateAll((elements) => elements.map((element) => element.getAttribute('href')));
  expect(listHrefs.some((href) => expectedHeroHrefs.includes(href || ''))).toBeFalsy();

  const featured = payload.categories.filter((category: { isFeatured: boolean }) => category.isFeatured);
  const missingFeaturedIcons = featured.filter((category: { image?: string }) => !category.image);
  await expect(page.locator('[data-featured-news-categories]')).toBeVisible();
  await expect(page.locator('[data-featured-fallback-icon]')).toHaveCount(missingFeaturedIcons.length);
  await expect(page.locator('[data-most-read-news]')).toBeVisible();
  await expect(page.locator('[data-news-sidebar]').getByText(/^\d+(?:[.,]\d+)* lượt xem$/).first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);

  const heroBoxes = await heroes.evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  }));
  const listBox = await page.locator('[data-news-list-column]').boundingBox();
  const sidebarBox = await page.locator('[data-news-sidebar]').boundingBox();
  expect(listBox).not.toBeNull();
  expect(sidebarBox).not.toBeNull();

  if (testInfo.project.name === 'desktop-chromium') {
    expect(Math.max(...heroBoxes.map((box) => box.y)) - Math.min(...heroBoxes.map((box) => box.y))).toBeLessThan(2);
    expect(heroBoxes[0].width).toBeGreaterThan(heroBoxes[1].width * 1.9);
    expect(Math.abs((listBox?.y || 0) - (sidebarBox?.y || 0))).toBeLessThan(2);
    const contentWidth = (listBox?.width || 0) + (sidebarBox?.width || 0);
    expect((listBox?.width || 0) / contentWidth).toBeGreaterThan(0.68);
    expect((listBox?.width || 0) / contentWidth).toBeLessThan(0.72);
  } else {
    expect(heroBoxes[1].y).toBeGreaterThan(heroBoxes[0].y + heroBoxes[0].height - 2);
    expect(heroBoxes[2].y).toBeGreaterThan(heroBoxes[1].y + heroBoxes[1].height - 2);
    expect(sidebarBox?.y || 0).toBeGreaterThan((listBox?.y || 0) + (listBox?.height || 0) - 2);
  }
});

test('share controls and canonical pagination remain functional after removing filters', async ({ page, request, context }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'share and pagination interactions are covered once');
  const payload = await categoryPayload(request);
  await page.goto(`${categoryPath}?page=2`);

  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: 'Sao chép liên kết' }).click();
  await expect(page.getByRole('button', { name: 'Đã sao chép liên kết' })).toBeVisible();

  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Chia sẻ lên Facebook' }).click();
  const popup = await popupPromise;
  expect(popup.url()).toContain('facebook.com/sharer/sharer.php');
  await popup.close();

  if (Number(payload.pagination.totalPages) > 1) {
    const secondPage = await categoryPayload(request, 2);
    await page.goto(categoryPath);
    await page.getByRole('link', { name: 'Trang sau' }).click();
    await expect(page).toHaveURL(new RegExp(`${categoryPath.replace('.', '\\.')}\\?page=2$`));
    const hrefs = await page.locator('[data-news-hero]').evaluateAll((elements) => elements.map((element) => element.getAttribute('href')));
    expect(hrefs).toEqual(secondPage.news.slice(0, 3).map((article: { url: string }) => `/tin-tuc/${article.url}`));
    await expect(page.getByRole('link', { name: 'Trang trước' })).toHaveAttribute('href', categoryPath);

    const popularSecondPage = await categoryPayload(request, 2, 'popular');
    await page.goto(`${categoryPath}?sort=popular&page=2`);
    await expect(page.getByRole('link', { name: 'Trang trước' })).toHaveAttribute('href', `${categoryPath}?sort=popular`);
    const popularHrefs = await page.locator('[data-news-hero]').evaluateAll((elements) => elements.map((element) => element.getAttribute('href')));
    expect(popularHrefs).toHaveLength(Math.min(3, popularSecondPage.news.length));
    expect(new Set(popularHrefs).size).toBe(popularHrefs.length);
    expect(popularHrefs.every((href) => /^\/tin-tuc\/.+/.test(href || ''))).toBeTruthy();
  }

  const accessibility = await new AxeBuilder({ page })
    .include('main button')
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(accessibility.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact || ''))).toEqual([]);
});

test('PC build promotion sticks at 110px only on desktop', async ({ page }, testInfo) => {
  await page.goto(categoryPath);
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
    expect(style.position).toBe('static');
    expect(style.top).toBe('auto');
  }
});

test('empty categories retain the sidebar and pages beyond the range return 404', async ({ page, request }) => {
  const payload = await categoryPayload(request);
  const emptyCategory = payload.categories.find((category: { totalNews: number }) => Number(category.totalNews) === 0);
  test.skip(!emptyCategory, 'requires one active empty category');

  const emptyPath = `/tin-tuc/${emptyCategory.url}`;
  await page.goto(emptyPath);
  await expect(page.locator('[data-news-empty]')).toBeVisible();
  await expect(page.locator('[data-news-sidebar]')).toBeVisible();
  await expect(page.locator('[data-news-hero]')).toHaveCount(0);

  const invalidPage = await request.get(`${categoryPath}?page=999`);
  expect(invalidPage.status()).toBe(404);
});
