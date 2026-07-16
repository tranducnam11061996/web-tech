import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  collectionPageHref,
  collectionPaginationRange,
} from "../../src/lib/collectionPage";
import { sanitizeLegacyHtml } from "../../src/lib/sanitizeHtml";

const collectionSlug = process.env.PLAYWRIGHT_COLLECTION_SLUG || "goi-y-cho-ban";
const collectionPath = `/collection/${collectionSlug}`;

async function expectColumnCount(page: Page, width: number, expectedColumns: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(collectionPath);
  const grid = page.locator("[data-collection-product-grid]").first();
  await expect(grid.locator("[data-product-card]").first()).toBeVisible();
  await expect.poll(() => grid.evaluate((element) => (
    getComputedStyle(element).gridTemplateColumns.split(" ").length
  ))).toBe(expectedColumns);
  await expect.poll(() => page.evaluate(() => (
    document.documentElement.scrollWidth - document.documentElement.clientWidth
  ))).toBe(0);
  await expect.poll(() => grid.locator("[data-product-card]").first().evaluate((element) => (
    element.scrollWidth - element.clientWidth
  ))).toBe(0);
  const firstCard = grid.locator("[data-product-card]").first();
  const cardWidth = await firstCard.evaluate((element) => element.getBoundingClientRect().width);
  const stockStatus = firstCard.locator("[data-product-stock-status]");
  const stockLabel = firstCard.locator("[data-product-stock-label]");
  const cartButton = firstCard.locator("[data-product-cart-button]");
  await expect.poll(() => grid.locator("[data-product-sale-price]").evaluateAll((elements) => (
    Math.max(...elements.map((element) => element.scrollWidth - element.clientWidth))
  ))).toBeLessThanOrEqual(0);
  if (await stockStatus.count()) {
    await expect(stockStatus).toBeVisible();
    await expect(cartButton).toBeVisible();
    await expect(stockStatus).toContainText("Sẵn hàng");
    await expect(stockLabel).toHaveCSS("position", cardWidth < 260 ? "absolute" : "static");
    await expect.poll(async () => {
      const [statusBox, cartBox] = await Promise.all([
        stockStatus.boundingBox(),
        cartButton.boundingBox(),
      ]);
      if (!statusBox || !cartBox) return Number.POSITIVE_INFINITY;
      return Math.abs(
        statusBox.y + statusBox.height / 2 - (cartBox.y + cartBox.height / 2),
      );
    }).toBeLessThanOrEqual(1);
  }

  const discountedCard = grid.locator("[data-product-card]:has([data-product-market-price])").first();
  if (await discountedCard.count()) {
    await expect.poll(async () => {
      const [marketBox, saleBox] = await Promise.all([
        discountedCard.locator("[data-product-market-price]").boundingBox(),
        discountedCard.locator("[data-product-sale-price]").boundingBox(),
      ]);
      if (!marketBox || !saleBox) return Number.POSITIVE_INFINITY;
      return saleBox.y - (marketBox.y + marketBox.height);
    }).toBeGreaterThanOrEqual(0);
    await expect.poll(async () => {
      const [marketBox, saleBox] = await Promise.all([
        discountedCard.locator("[data-product-market-price]").boundingBox(),
        discountedCard.locator("[data-product-sale-price]").boundingBox(),
      ]);
      if (!marketBox || !saleBox) return Number.POSITIVE_INFINITY;
      return saleBox.y - (marketBox.y + marketBox.height);
    }).toBeLessThanOrEqual(4);
  }
}

test("collection description, dark catalog controls, and responsive product grid match the requested layout", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Desktop test covers all explicit grid breakpoints");

  await expectColumnCount(page, 1920, 6);
  await expectColumnCount(page, 1440, 6);
  const pageHeading = page.locator("[data-collection-heading]");
  const description = page.locator("[data-collection-description]");
  const grid = page.locator("[data-collection-product-grid]");
  const productHeading = page.locator("#collection-products-heading");
  const collectionName = (await pageHeading.textContent())?.trim() || "";

  await expect(pageHeading).toBeVisible();
  expect(collectionName).not.toBe("");
  await expect(productHeading.locator("[data-collection-title-gradient]")).toHaveText(collectionName);
  await expect(productHeading.locator("[data-collection-product-count]")).toHaveText(/\([\d.]+ sản phẩm\)/);
  await expect(productHeading).toContainText(collectionName);
  const gradientStyle = await productHeading.locator("[data-collection-title-gradient]").evaluate((element) => {
    const style = getComputedStyle(element);
    return { backgroundImage: style.backgroundImage, backgroundClip: style.backgroundClip };
  });
  expect(gradientStyle.backgroundImage).toContain("linear-gradient");
  expect(gradientStyle.backgroundClip).toBe("text");

  if (await description.count()) {
    await expect(description).toBeVisible();
    expect(await pageHeading.evaluate((element, descriptionElement) => (
      Boolean(element.compareDocumentPosition(descriptionElement as Node) & Node.DOCUMENT_POSITION_FOLLOWING)
    ), await description.elementHandle())).toBeTruthy();
    expect(await description.evaluate((element, productGrid) => (
      Boolean(element.compareDocumentPosition(productGrid as Node) & Node.DOCUMENT_POSITION_FOLLOWING)
    ), await grid.elementHandle())).toBeTruthy();
  }

  await expect(page.getByRole("link", { name: "Giá từ Thấp - Cao" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Giá từ Cao - Thấp" })).toBeVisible();
  await expect(page.locator("main input[type='number']")).toHaveCount(0);
  await expect(page.locator("main select")).toHaveCount(0);
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(15, 15, 17)");

  await expectColumnCount(page, 1100, 4);
  await expectColumnCount(page, 800, 3);
  await expectColumnCount(page, 390, 2);
});

test("Section 11 and collection render the same shared product card structure", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Shared desktop card structure is verified once");
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/");

  const sectionCard = page.locator("#section-11 [data-product-card]").first();
  await expect(sectionCard).toBeVisible();
  const sectionSignature = await sectionCard.evaluate((card) => {
    const hooks = ["content", "footer", "sale-price", "stock-status", "cart-button"];
    return hooks.map((hook) => {
      const element = card.querySelector(`[data-product-card-${hook}], [data-product-${hook}]`);
      return element ? `${element.tagName}:${element.className}` : "missing";
    });
  });

  await page.goto(collectionPath);
  const collectionCard = page.locator("[data-collection-product-grid] [data-product-card]").first();
  await expect(collectionCard).toBeVisible();
  const collectionSignature = await collectionCard.evaluate((card) => {
    const hooks = ["content", "footer", "sale-price", "stock-status", "cart-button"];
    return hooks.map((hook) => {
      const element = card.querySelector(`[data-product-card-${hook}], [data-product-${hook}]`);
      return element ? `${element.tagName}:${element.className}` : "missing";
    });
  });

  expect(collectionSignature).toEqual(sectionSignature);
  await expect(collectionCard.locator("a").first()).toHaveAttribute("href", /^\/.+/);
  const cartButton = collectionCard.locator("[data-product-cart-button]");
  await cartButton.focus();
  await expect(cartButton).toBeFocused();
  await cartButton.press("Enter");
  await expect(cartButton.locator('path[d="M5 13l4 4L19 7"]')).toBeVisible();
});

test("collection price sort is URL-driven, canonical, and accessible", async ({ page }) => {
  const ascendingResponse = await page.request.get(`/api/collections/${collectionSlug}?page=1&limit=24&sort=price_asc`);
  const descendingResponse = await page.request.get(`/api/collections/${collectionSlug}?page=1&limit=24&sort=price_desc`);
  test.skip(!ascendingResponse.ok() || !descendingResponse.ok(), "Collection API fixture is unavailable");
  const ascending = await ascendingResponse.json();
  const descending = await descendingResponse.json();
  test.skip(!ascending?.data?.length || !descending?.data?.length, "Collection has no sellable products");

  await page.goto(`${collectionPath}?page=2`);
  const ascendingSort = page.getByRole("link", { name: "Giá từ Thấp - Cao" });
  await expect(ascendingSort).toHaveAttribute("href", `${collectionPath}?sort=price_asc`);
  await ascendingSort.click();
  await expect(page).toHaveURL(new RegExp(`${collectionPath}\\?sort=price_asc$`));
  await expect(page.getByRole("link", { name: "Giá từ Thấp - Cao" })).toHaveAttribute("aria-current", "true");
  await expect(page.locator("[data-collection-product-grid] article a").first()).toHaveAttribute(
    "href",
    `/${ascending.data[0].slug}`,
  );

  await page.getByRole("link", { name: "Giá từ Cao - Thấp" }).click();
  await expect(page).toHaveURL(new RegExp(`${collectionPath}\\?sort=price_desc$`));
  await expect(page.getByRole("link", { name: "Giá từ Cao - Thấp" })).toHaveAttribute("aria-current", "true");
  await expect(page.locator("[data-collection-product-grid] article a").first()).toHaveAttribute(
    "href",
    `/${descending.data[0].slug}`,
  );

  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`${collectionPath}\\?sort=price_asc$`));
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(
    results.violations.filter((violation) => ["serious", "critical"].includes(violation.impact || "")),
  ).toEqual([]);
});

test("collection pagination helpers keep sort and omit canonical page one", async ({ page }) => {
  expect(collectionPageHref(collectionSlug, "price_asc", 1)).toBe(`${collectionPath}?sort=price_asc`);
  expect(collectionPageHref(collectionSlug, "price_desc", 3)).toBe(`${collectionPath}?sort=price_desc&page=3`);
  expect(collectionPaginationRange(6, 12)).toEqual([1, "...", 5, 6, 7, "...", 12]);

  const response = await page.request.get(`/api/collections/${collectionSlug}?page=1&limit=24`);
  test.skip(!response.ok(), "Collection API fixture is unavailable");
  const payload = await response.json();
  test.skip(Number(payload?.pagination?.totalPages || 0) <= 1, "Collection currently has only one page");

  await page.goto(collectionPath);
  await page.getByRole("link", { name: "Đến trang 2" }).click();
  await expect(page).toHaveURL(new RegExp(`${collectionPath}\\?page=2$`));
  await expect(page.getByLabel("Trang 2")).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: "Trang trước" }).click();
  await expect(page).toHaveURL(new RegExp(`${collectionPath}$`));
});

test("collection HTML sanitizer keeps inline presentation and removes executable content", () => {
  const sanitized = sanitizeLegacyHtml(
    '<p class="campaign" style="color:#ef4444;text-align:center" onclick="alert(1)">Nội dung</p><script>alert(2)</script><a href="javascript:alert(3)">Link</a>',
  );

  expect(sanitized).toContain('class="campaign"');
  expect(sanitized).toContain('style="color:#ef4444;text-align:center"');
  expect(sanitized).not.toContain("onclick");
  expect(sanitized).not.toContain("<script");
  expect(sanitized).not.toContain("javascript:");
});
