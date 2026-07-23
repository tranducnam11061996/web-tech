import { expect, test, type Locator, type Page } from "@playwright/test";

const PRODUCT_PATH = "/pc-amd-gaming-ryzen-7-7700-rtx-5060-8gb";
const PRODUCT_SLUG = PRODUCT_PATH.slice(1);
const STORAGE_KEY = "hacom.recently-viewed.v1";

type ProductCard = {
  id: number;
  slug: string;
  name: string;
  sku?: string;
  thumbnail?: string;
  price?: number;
  marketPrice?: number;
  brand?: string;
  cardBadges?: unknown[];
};

async function getHistoryCandidates(page: Page) {
  const response = await page.request.get("/api/products?limit=24&page=1");
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  const products = (Array.isArray(payload?.data) ? payload.data : []) as ProductCard[];
  const candidates = products.filter((product) => product.slug && product.slug !== PRODUCT_SLUG);
  expect(candidates.length).toBeGreaterThanOrEqual(14);
  return candidates;
}

async function seedHistory(page: Page, products: ProductCard[]) {
  await page.evaluate(
    ({ key, items }) => {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          version: 1,
          items: items.map((item, index) => ({
            ...item,
            viewedAt: new Date(Date.now() - index * 1_000).toISOString(),
          })),
        }),
      );
    },
    { key: STORAGE_KEY, items: products },
  );
}

async function activateRecentlyViewed(page: Page) {
  await expect
    .poll(() =>
      page.evaluate((key) => {
        document.querySelector('[data-testid="deferred-recently-viewed"]')?.scrollIntoView({ block: "center" });
        const value = JSON.parse(window.localStorage.getItem(key) || "null");
        return value?.items?.[0]?.slug || "";
      }, STORAGE_KEY),
    )
    .toBe(PRODUCT_SLUG);
}

async function firstRowCount(grid: Locator) {
  return grid.evaluate((element) => {
    const cards = Array.from(element.children);
    const firstTop = cards[0]?.getBoundingClientRect().top;
    return cards.filter((card) => Math.abs(card.getBoundingClientRect().top - firstTop) <= 1).length;
  });
}

test("similar products show six cards and expand to a maximum of twelve", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Related-product behavior is verified once.");

  await page.setViewportSize({ width: 1920, height: 1000 });
  await page.goto(PRODUCT_PATH);

  const section = page.locator('section[aria-labelledby="similar-products-title"]');
  const initialGrid = section.locator("#similar-products-grid");
  const summary = section.locator("summary");
  await expect(initialGrid.locator("article")).toHaveCount(6);
  await expect(section.locator("details article")).toHaveCount(6);
  await expect(section.locator("article:visible")).toHaveCount(6);
  await expect(section.getByText("Xem thêm (6)", { exact: true })).toBeVisible();
  expect(await firstRowCount(initialGrid)).toBe(6);

  await summary.focus();
  await summary.press("Enter");
  await expect(section.locator("details")).toHaveAttribute("open", "");
  await expect(section.locator("article:visible")).toHaveCount(12);
  await expect(section.getByText("Thu gọn", { exact: true })).toBeVisible();

  await summary.press("Enter");
  await expect(section.locator("details")).not.toHaveAttribute("open", "");
  await expect(section.locator("article:visible")).toHaveCount(6);
});

test("related-product grids switch to six columns at 1536px without overflow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "The responsive matrix is verified once.");

  await page.goto(PRODUCT_PATH);
  const grid = page.locator("#similar-products-grid");
  const matrix = [
    { width: 390, columns: 2 },
    { width: 768, columns: 3 },
    { width: 1024, columns: 5 },
    { width: 1535, columns: 5 },
    { width: 1536, columns: 6 },
    { width: 1920, columns: 6 },
  ];

  for (const { width, columns } of matrix) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(grid.locator("article")).toHaveCount(6);
    expect(await firstRowCount(grid)).toBe(columns);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
    ).toBe(0);

    const frame = await grid.locator(".product-card-image-frame").first().boundingBox();
    expect(frame).not.toBeNull();
    expect(Math.abs((frame?.width || 0) - (frame?.height || 0))).toBeLessThanOrEqual(1);
  }
});

test("recently viewed caps history and revalidation at twelve products", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Recently-viewed storage and request bounds are verified once.");
  test.slow();

  const candidates = await getHistoryCandidates(page);
  await page.goto("/");
  await seedHistory(page, candidates.slice(0, 14));

  const revalidationRequest = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname === "/api/products" && url.searchParams.has("ids");
  });
  await page.setViewportSize({ width: 1536, height: 1000 });
  await page.goto(PRODUCT_PATH);
  await activateRecentlyViewed(page);

  const request = await revalidationRequest;
  const requestedIds = new URL(request.url()).searchParams.get("ids")?.split(",") || [];
  expect(requestedIds).toHaveLength(12);

  const section = page.locator('section[aria-labelledby="recently-viewed-title"]');
  const grid = section.locator("#recently-viewed-grid");
  const toggle = section.getByRole("button", { name: "Xem thêm (6)" });
  await expect(grid.locator("article")).toHaveCount(6);
  await expect(toggle).toHaveAttribute("aria-controls", "recently-viewed-grid");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(section.locator(`a[href="${PRODUCT_PATH}"]`)).toHaveCount(0);
  expect(await firstRowCount(grid)).toBe(6);

  await toggle.focus();
  await toggle.press("Enter");
  await expect(grid.locator("article")).toHaveCount(12);
  await expect(section.getByRole("button", { name: "Thu gọn" })).toHaveAttribute("aria-expanded", "true");

  const storedHistory = await page.evaluate((key) => {
    const value = JSON.parse(window.localStorage.getItem(key) || "null");
    return value?.items || [];
  }, STORAGE_KEY);
  expect(storedHistory).toHaveLength(13);
  expect(storedHistory[0].slug).toBe(PRODUCT_SLUG);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
  ).toBe(0);
});

for (const count of [0, 5, 6, 9, 12]) {
  test(`recently viewed handles a ${count}-product history`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop-chromium", "Recently-viewed count boundaries are verified once.");
    test.slow();

    const candidates = await getHistoryCandidates(page);
    await page.goto("/");
    await seedHistory(page, candidates.slice(0, count));
    await page.goto(PRODUCT_PATH);
    await activateRecentlyViewed(page);

    const section = page.locator('section[aria-labelledby="recently-viewed-title"]');
    if (count === 0) {
      await expect(section).toHaveCount(0);
      return;
    }

    const grid = section.locator("#recently-viewed-grid");
    await expect(grid.locator("article")).toHaveCount(Math.min(count, 6));
    if (count <= 6) {
      await expect(section.locator('button[aria-controls="recently-viewed-grid"]')).toHaveCount(0);
      return;
    }

    const additionalCount = count - 6;
    const toggle = section.getByRole("button", { name: `Xem thêm (${additionalCount})` });
    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(grid.locator("article")).toHaveCount(count);
    await expect(section.getByRole("button", { name: "Thu gọn" })).toBeVisible();
  });
}
