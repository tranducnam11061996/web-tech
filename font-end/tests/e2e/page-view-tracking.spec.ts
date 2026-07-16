import { expect, test, type APIRequestContext } from '@playwright/test';

type TrackedView = { eventId: string; path: string };

async function sampleProductPath(request: APIRequestContext) {
  const response = await request.get('/api/products?limit=10&page=1');
  if (!response.ok()) return null;
  const payload = await response.json();
  const product = (payload.data || []).find((entry: { slug?: string }) => entry.slug && !entry.slug.startsWith('product-'));
  return product?.slug ? `/${encodeURIComponent(product.slug)}` : null;
}

async function sampleProductCategoryPath(request: APIRequestContext) {
  const response = await request.get('/api/categories?parentId=0');
  if (!response.ok()) return null;
  const payload = await response.json();
  const category = (payload.data || []).find((entry: { slug?: string }) => entry.slug?.startsWith('/') && !entry.slug.startsWith('/category?'));
  return category?.slug || null;
}

async function sampleNewsPaths(request: APIRequestContext) {
  const categorySlug = process.env.PLAYWRIGHT_NEWS_CATEGORY_SLUG || 'tin-cong-nghe.html';
  const response = await request.get(`/api/news-category/${encodeURIComponent(categorySlug)}?page=1&limit=21&sort=latest`);
  if (!response.ok()) return { category: null, article: null };
  const payload = await response.json();
  return {
    category: `/tin-tuc/${encodeURIComponent(categorySlug)}`,
    article: payload.news?.[0]?.url ? `/tin-tuc/${encodeURIComponent(payload.news[0].url)}` : null,
  };
}

test('the four detail/category screens emit one idempotent page-view event per navigation and refresh', async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'tracking behavior is viewport independent');
  const news = await sampleNewsPaths(request);
  const paths = [
    await sampleProductPath(request),
    await sampleProductCategoryPath(request),
    news.article,
    news.category,
  ].filter((path): path is string => Boolean(path));
  test.skip(paths.length < 4, 'requires one public route for each tracked entity type');

  const tracked: TrackedView[] = [];
  await page.route('**/api/page-views', async (route) => {
    const body = route.request().postDataJSON() as TrackedView;
    tracked.push(body);
    await route.fulfill({
      status: 202,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: { accepted: true } }),
    });
  });

  for (const path of paths) {
    await page.goto(path);
    await expect.poll(() => new Set(tracked.filter((entry) => entry.path === path).map((entry) => entry.eventId)).size).toBe(1);
    const entries = tracked.filter((entry) => entry.path === path);
    expect(entries.every((entry) => /^[0-9a-f-]{36}$/i.test(entry.eventId))).toBeTruthy();
  }
  expect(new Set(tracked.map((entry) => entry.eventId)).size).toBe(paths.length);

  const refreshedPath = paths.at(-1)!;
  await page.reload();
  await expect.poll(() => new Set(tracked.filter((entry) => entry.path === refreshedPath).map((entry) => entry.eventId)).size).toBe(2);
  expect(new Set(tracked.map((entry) => entry.eventId)).size).toBe(paths.length + 1);
});

test('static and not-found pages do not mount the page-view tracker', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'tracking behavior is viewport independent');
  const tracked: TrackedView[] = [];
  await page.route('**/api/page-views', async (route) => {
    tracked.push(route.request().postDataJSON() as TrackedView);
    await route.fulfill({ status: 202, contentType: 'application/json', body: '{"success":true}' });
  });
  await page.goto('/gio-hang');
  await page.waitForTimeout(250);
  await page.goto('/__page-view-not-found__');
  await page.waitForTimeout(250);
  expect(tracked).toEqual([]);
});
