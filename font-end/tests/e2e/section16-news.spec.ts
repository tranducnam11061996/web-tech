import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";

type FeaturedNewsItem = {
  id: number;
  title: string;
  url: string;
  thumnail: string;
  summary: string;
  category_name: string;
};

async function loadFeaturedNews(request: APIRequestContext) {
  const response = await request.get(
    "http://localhost:3000/api/homepage/bootstrap?collectionId=896&collectionSlug=goi-y-cho-ban&collectionLimit=10",
  );
  expect(response.ok()).toBe(true);
  const payload = await response.json();
  return (Array.isArray(payload?.data?.featuredNews) ? payload.data.featuredNews : []) as FeaturedNewsItem[];
}

test("Section 16 renders the ten newest featured-category articles from the homepage bootstrap", async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "The server payload is viewport-independent.");
  const featuredNews = await loadFeaturedNews(request);
  expect(featuredNews).toHaveLength(10);
  expect(new Set(featuredNews.map((article) => article.id)).size).toBe(10);

  const browserNewsRequests: string[] = [];
  page.on("request", (browserRequest) => {
    if (/\/api\/news(?:\/|\?|$)/.test(browserRequest.url())) browserNewsRequests.push(browserRequest.url());
  });
  await page.goto("/");

  const section = page.locator("#section-16");
  await expect(section).toBeVisible();
  await section.scrollIntoViewIfNeeded();
  const originalCards = section.locator("[data-section16-card]:not(.cloned-item)");
  await expect(originalCards).toHaveCount(10);

  for (const article of featuredNews) {
    const resolvedCard = section.locator(`[data-section16-card][data-news-id="${article.id}"]:not(.cloned-item)`).first();
    await expect(resolvedCard).toHaveCount(1);
    await expect(resolvedCard.locator(".promo-title")).toHaveText(article.title);
    await expect(resolvedCard.locator(".promo-desc")).toHaveText(article.summary || "");
    await expect(resolvedCard.locator(".promo-category-tag")).toHaveText(article.category_name);
    await expect(resolvedCard.locator(".promo-link")).toHaveText("✦ Xem thêm →");
    await expect(resolvedCard.locator(".promo-link")).toHaveAttribute("href", `/tin-tuc/${article.url}`);
  }

  expect(browserNewsRequests).toEqual([]);
});

test("Section 16 clamps copy and keeps the category tag and CTA on one row", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Exact computed styles are verified once.");
  await page.setViewportSize({ width: 1920, height: 1000 });
  await page.goto("/");
  const section = page.locator("#section-16");
  await expect(section).toBeVisible();
  await section.scrollIntoViewIfNeeded();
  const cards = section.locator("[data-section16-card]");
  const visibleCardIndex = await cards.evaluateAll((elements) => elements.findIndex((element) => {
    const box = element.getBoundingClientRect();
    return box.right > 0 && box.left < window.innerWidth;
  }));
  expect(visibleCardIndex).toBeGreaterThanOrEqual(0);
  const card = cards.nth(visibleCardIndex);
  const title = card.locator(".promo-title");
  const description = card.locator(".promo-desc");
  const tag = card.locator(".promo-category-tag");
  const link = card.locator(".promo-link");

  await expect(title).toHaveCSS("white-space", "nowrap");
  await expect(title).toHaveCSS("overflow", "hidden");
  await expect(title).toHaveCSS("text-overflow", "ellipsis");
  expect(await description.evaluate((element) => getComputedStyle(element).webkitLineClamp)).toBe("3");
  const [tagBox, linkBox] = await Promise.all([tag.boundingBox(), link.boundingBox()]);
  expect(tagBox).not.toBeNull();
  expect(linkBox).not.toBeNull();
  expect(Math.abs((tagBox?.y || 0) - (linkBox?.y || 0))).toBeLessThan(8);
  expect(tagBox?.x || 0).toBeLessThan(linkBox?.x || 0);
  await expect(tag).toHaveCSS("border-top-style", "solid");
  await expect(card.locator(".promo-img-wrapper")).not.toHaveCSS("background-image", "none");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  const results = await new AxeBuilder({ page }).include("#section-16").withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact || ""))).toEqual([]);
});

test("Section 16 card remains fully visible and stationary on hover", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Desktop hover behavior is verified once.");
  await page.setViewportSize({ width: 1920, height: 1000 });
  await page.goto("/");
  const section = page.locator("#section-16");
  await expect(section).toBeVisible();
  await section.scrollIntoViewIfNeeded();
  const card = section.locator("[data-section16-card]:not(.cloned-item)").first();
  const container = section.locator(".carousel-container");
  const [beforeHover, beforeContainer] = await Promise.all([card.boundingBox(), container.boundingBox()]);
  expect(beforeHover).not.toBeNull();
  expect(beforeContainer).not.toBeNull();

  await card.hover();
  await page.waitForTimeout(250);

  const afterHover = await card.boundingBox();
  const afterContainer = await container.boundingBox();
  expect(afterHover).not.toBeNull();
  expect(afterContainer).not.toBeNull();
  expect((afterHover?.y ?? 0) - (afterContainer?.y ?? 0)).toBeCloseTo(
    (beforeHover?.y ?? 0) - (beforeContainer?.y ?? 0),
    1,
  );
  expect(afterHover?.width).toBeCloseTo(beforeHover?.width ?? 0, 1);
  expect(afterHover?.height).toBeCloseTo(beforeHover?.height ?? 0, 1);
  await expect(card).toHaveCSS("transform", "none");
  expect((afterHover?.y ?? 0) + 0.5).toBeGreaterThanOrEqual(afterContainer?.y ?? 0);
});

test("Section 16 preserves its mobile card geometry without widening the document", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "Mobile geometry is verified in the mobile project.");
  await page.setViewportSize({ width: 397, height: 900 });
  await page.goto("/");
  const section = page.locator("#section-16");
  await expect(section).toBeVisible();
  await section.scrollIntoViewIfNeeded();
  const card = section.locator("[data-section16-card]:not(.cloned-item)").first();
  const tag = card.locator(".promo-category-tag");
  const link = card.locator(".promo-link");
  const [cardBox, tagBox, linkBox] = await Promise.all([card.boundingBox(), tag.boundingBox(), link.boundingBox()]);

  expect(cardBox?.width).toBeCloseTo(240, 0);
  expect(cardBox?.height).toBeCloseTo(380, 0);
  expect(Math.abs((tagBox?.y || 0) - (linkBox?.y || 0))).toBeLessThan(8);
  expect(tagBox?.x || 0).toBeLessThan(linkBox?.x || 0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
