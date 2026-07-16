import AxeBuilder from '@axe-core/playwright';
import { expect, test, type APIRequestContext } from '@playwright/test';

async function landingPayload(request: APIRequestContext) {
  const response = await request.get('/api/news/landing');
  expect(response.ok()).toBeTruthy();
  return (await response.json()).data;
}

test('news landing binds the template 2 + 3 + 6 structure without duplicated articles', async ({ page, request }, testInfo) => {
  const payload = await landingPayload(request);
  await page.goto('/tin-tuc');

  const hero = page.locator('[data-news-landing-hero]');
  const list = page.locator('[data-news-landing-list-item]');
  await expect(hero).toHaveCount(Math.min(5, payload.news.length));
  await expect(list).toHaveCount(Math.max(0, Math.min(11, payload.news.length) - 5));

  const expectedHeroHrefs = payload.news.slice(0, 5).map((article: { url: string }) => `/tin-tuc/${article.url}`);
  const expectedListHrefs = payload.news.slice(5, 11).map((article: { url: string }) => `/tin-tuc/${article.url}`);
  expect(await hero.evaluateAll((elements) => elements.map((element) => element.getAttribute('href')))).toEqual(expectedHeroHrefs);
  expect(await list.locator('h4 a').evaluateAll((elements) => elements.map((element) => element.getAttribute('href')))).toEqual(expectedListHrefs);
  expect(expectedListHrefs.some((href: string) => expectedHeroHrefs.includes(href))).toBeFalsy();

  await expect(page.getByRole('link', { name: 'XEM THÊM' }).first()).toHaveAttribute('href', '/tin-tuc/tin-cong-nghe.html');
  await expect(page.getByRole('link', { name: 'XEM THÊM' }).last()).toHaveAttribute('href', '/tin-tuc/review-san-pham');
  await expect(page.locator('[data-featured-news-categories]')).toBeVisible();
  await expect(page.locator('[data-pc-build-promotion]')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);

  if (payload.reviews.length === 0) {
    await expect(page.locator('[data-news-reviews-empty]')).toBeVisible();
  } else {
    await expect(page.locator('[data-news-review-large]')).toHaveCount(Math.min(2, payload.reviews.length));
    await expect(page.locator('[data-news-review-small]')).toHaveCount(Math.max(0, payload.reviews.length - 2));
  }

  const listBox = await page.locator('[data-news-landing-list]').boundingBox();
  const sidebarBox = await page.locator('[data-news-landing-sidebar]').boundingBox();
  expect(listBox).not.toBeNull();
  expect(sidebarBox).not.toBeNull();
  if (testInfo.project.name === 'desktop-chromium') {
    expect(Math.abs((listBox?.y || 0) - (sidebarBox?.y || 0))).toBeLessThan(2);
    const combinedWidth = (listBox?.width || 0) + (sidebarBox?.width || 0);
    expect((listBox?.width || 0) / combinedWidth).toBeGreaterThan(0.68);
    expect((listBox?.width || 0) / combinedWidth).toBeLessThan(0.72);
  } else {
    expect(sidebarBox?.y || 0).toBeGreaterThan((listBox?.y || 0) + (listBox?.height || 0) - 2);
  }
});

test('landing promotion stays in normal flow and PCM playlist is keyboard-accessible', async ({ page, request }, testInfo) => {
  const payload = await landingPayload(request);
  await page.route('https://www.youtube-nocookie.com/**', (route) => route.abort());
  await page.goto('/tin-tuc');

  const promotionWrapper = page.locator('[data-news-landing-promotion]');
  const style = await promotionWrapper.evaluate((element) => ({
    position: getComputedStyle(element).position,
    top: getComputedStyle(element).top,
  }));
  expect(style).toEqual({ position: 'static', top: 'auto' });

  if (payload.youtube.available && payload.youtube.videos.length > 0) {
    const playlistItems = page.locator('[data-pcm-youtube-playlist-item]');
    await expect(playlistItems).toHaveCount(payload.youtube.videos.length);
    await expect(playlistItems.first()).toHaveAttribute('aria-pressed', 'true');
    if (payload.youtube.videos.length > 1) {
      await playlistItems.nth(1).focus();
      await page.keyboard.press('Enter');
      await expect(playlistItems.nth(1)).toHaveAttribute('aria-pressed', 'true');
    }
    await page.getByRole('button', { name: /^Phát video / }).click();
    await expect(page.locator('[data-pcm-youtube-player]')).toHaveAttribute('src', /youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]{11}/);
  } else {
    await expect(page.locator('[data-pcm-youtube-unavailable]')).toBeVisible();
  }

  if (testInfo.project.name === 'desktop-chromium') {
    const accessibility = await new AxeBuilder({ page })
      .include('[data-pcm-official]')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    expect(accessibility.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact || ''))).toEqual([]);
  }
});
