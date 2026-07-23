import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  catalogPageHref,
  collectionPaginationRange,
} from "../../src/lib/collectionPage";
import { hasMeaningfulLegacyHtml } from "../../src/lib/sanitizeHtml";

const brandSlug = process.env.PLAYWRIGHT_BRAND_SLUG || "intel";
const brandPath = `/brand/${brandSlug}`;
const collectionSlug = process.env.PLAYWRIGHT_COLLECTION_SLUG || "goi-y-cho-ban";
const collectionPath = `/collection/${collectionSlug}`;

async function requireBrandFixture(page: Page) {
  const response = await page.request.get(`/api/brands/${brandSlug}?page=1&limit=24`);
  test.skip(!response.ok(), "Brand API fixture is unavailable");
  const payload = await response.json();
  test.skip(!payload?.success || !payload?.data?.products?.length, "Brand has no sellable products");
  return payload.data;
}

async function expectColumnCount(page: Page, width: number, expectedColumns: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(brandPath);
  const grid = page.locator("[data-brand-product-grid]");
  await expect(grid.locator("[data-product-card]").first()).toBeVisible();
  await expect.poll(() => grid.evaluate((element) => (
    getComputedStyle(element).gridTemplateColumns.split(" ").length
  ))).toBe(expectedColumns);
  await expect.poll(() => page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ))).toBe(0);
}

test("brand uses the shared collection detail geometry at every breakpoint", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Desktop project covers the breakpoint matrix");
  await requireBrandFixture(page);

  await expectColumnCount(page, 1920, 6);
  await expectColumnCount(page, 1440, 6);
  await expectColumnCount(page, 1100, 4);
  await expectColumnCount(page, 800, 3);
  await expectColumnCount(page, 390, 2);

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(brandPath);
  const brandSignature = await page.locator("main").evaluate((main) => ({
    grid: main.querySelector("[data-brand-product-grid]")?.className,
    count: main.querySelector("[data-brand-product-count]")?.className,
  }));

  const collectionResponse = await page.request.get(`/api/collections/${collectionSlug}?page=1&limit=24`);
  if (collectionResponse.ok()) {
    const collectionPayload = await collectionResponse.json();
    if (collectionPayload?.data?.length) {
      await page.goto(collectionPath);
      const collectionSignature = await page.locator("main").evaluate((main) => ({
        grid: main.querySelector("[data-collection-product-grid]")?.className,
        count: main.querySelector("[data-collection-product-count]")?.className,
      }));
      expect(brandSignature).toEqual(collectionSignature);
    }
  }
});

test("brand editor content precedes products and price sorting stays canonical", async ({ page }) => {
  const fixture = await requireBrandFixture(page);
  await page.goto(`${brandPath}?page=2`);

  const heading = page.locator("[data-brand-heading]");
  const grid = page.locator("[data-brand-product-grid]");
  if (hasMeaningfulLegacyHtml(fixture.brand.description, 10)) {
    await expect(heading).toHaveText(fixture.brand.name);
  } else {
    await expect(heading).toHaveCount(0);
  }
  await expect(page.getByRole("link", { name: "Giá từ Thấp - Cao" })).toHaveAttribute(
    "href",
    `${brandPath}?sort=price_asc`,
  );
  await expect(page.getByRole("link", { name: "Giá từ Cao - Thấp" })).toHaveAttribute(
    "href",
    `${brandPath}?sort=price_desc`,
  );
  await expect(page.locator("main input, main select")).toHaveCount(0);

  const description = page.locator("[data-brand-description]");
  if (fixture.brand.description) {
    await expect(description).toBeVisible();
    expect(await description.evaluate((element, productGrid) => (
      Boolean(element.compareDocumentPosition(productGrid as Node) & Node.DOCUMENT_POSITION_FOLLOWING)
    ), await grid.elementHandle())).toBeTruthy();
    await expect(description.locator("script")).toHaveCount(0);
  } else {
    await expect(description).toHaveCount(0);
  }

  await page.getByRole("link", { name: "Giá từ Thấp - Cao" }).click();
  await expect(page).toHaveURL(new RegExp(`${brandPath}\\?sort=price_asc$`));
  await expect(page.getByRole("link", { name: "Giá từ Thấp - Cao" })).toHaveAttribute("aria-current", "true");

  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(
    results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact || "")),
  ).toEqual([]);
});

test("shared catalog href and pagination helpers support brand routes", () => {
  expect(catalogPageHref(brandPath, "", 1)).toBe(brandPath);
  expect(catalogPageHref(brandPath, "price_asc", 1)).toBe(`${brandPath}?sort=price_asc`);
  expect(catalogPageHref(brandPath, "price_desc", 3)).toBe(`${brandPath}?sort=price_desc&page=3`);
  expect(collectionPaginationRange(6, 12)).toEqual([1, "...", 5, 6, 7, "...", 12]);
});

test("brand heading considers readable text or a safe banner image meaningful", () => {
  expect(hasMeaningfulLegacyHtml("")).toBe(false);
  expect(hasMeaningfulLegacyHtml("<p><br></p>")).toBe(false);
  expect(hasMeaningfulLegacyHtml("<p>Ngắn</p>")).toBe(false);
  expect(hasMeaningfulLegacyHtml("<p>Nội dung mô tả thương hiệu</p>")).toBe(true);
  expect(hasMeaningfulLegacyHtml(
    '<p style="text-align: center;"><img src="https://pcmarket.vn/media/banner/PCM-021.jpg" alt="" width="2560" height="975"></p>',
  )).toBe(true);
  expect(hasMeaningfulLegacyHtml('<p><img src="/api/media/brand/banner.webp" alt=""></p>')).toBe(true);
  expect(hasMeaningfulLegacyHtml('<p><img src="javascript:alert(1)" alt=""></p>')).toBe(false);
  expect(hasMeaningfulLegacyHtml('<p><img src="javascript&colon;alert(1)" alt=""></p>')).toBe(false);
  expect(hasMeaningfulLegacyHtml('<p><img data-src="https://pcmarket.vn/banner.jpg" alt=""></p>')).toBe(false);
});

test("Corsair heading follows the editor content rule", async ({ page }) => {
  const corsairResponse = await page.request.get("/api/brands/corsair?page=1&limit=1");
  test.skip(!corsairResponse.ok(), "Corsair brand fixture is unavailable");
  const payload = await corsairResponse.json();
  test.skip(!payload?.success || !payload?.data?.brand, "Corsair brand fixture is unavailable");

  await page.goto("/brand/corsair");
  const heading = page.locator("[data-brand-heading]");
  if (hasMeaningfulLegacyHtml(payload.data.brand.description, 10)) {
    await expect(heading).toHaveText(payload.data.brand.name);
  } else {
    await expect(heading).toHaveCount(0);
  }
});
