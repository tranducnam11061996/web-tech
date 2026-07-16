import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

async function openSection10(page: Page) {
  const browserProductSectionRequests: string[] = [];
  const pageErrors: Error[] = [];

  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("/api/categories/homepage-product-sections") || url.includes("categoryIds=137")) {
      browserProductSectionRequests.push(url);
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error));

  await page.goto("/");
  const section = page.locator("#section-10");
  await expect(section).toBeVisible();
  await section.scrollIntoViewIfNeeded();

  const track = section.locator(".carousel-track");
  await expect.poll(() => track.evaluate((element) => ({
    transform: (element as HTMLElement).style.transform,
    visibleOriginalIndex: (element.children[1] as HTMLElement | undefined)?.dataset.originalIndex,
  }))).toMatchObject({
    transform: expect.stringContaining("translateX(-"),
    visibleOriginalIndex: "0",
  });

  return { browserProductSectionRequests, pageErrors, section, track };
}

async function visibleOriginalIndex(track: Locator) {
  return track.evaluate((element) => (
    (element.children[1] as HTMLElement | undefined)?.dataset.originalIndex || null
  ));
}

test("Section 10 opts into the canonical Section 11 product card contract", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Shared card contract is verified once on desktop");

  const { browserProductSectionRequests, pageErrors, section } = await openSection10(page);
  const originalCards = section.locator(".homepage-product-carousel-item:not(.cloned-item) [data-product-card]");
  await expect(originalCards).toHaveCount(8);

  const section10Card = originalCards.first();
  const section11Card = page.locator("#section-11 [data-product-card]").first();
  await expect(section10Card).toBeVisible();
  await expect(section11Card).toBeVisible();

  const hooks = ["content", "footer", "sale-price", "stock-status", "cart-button"];
  const signature = (card: Locator) => card.evaluate((element, expectedHooks) => expectedHooks.map((hook) => {
    const target = element.querySelector(`[data-product-card-${hook}], [data-product-${hook}]`);
    return target ? `${target.tagName}:${target.className}` : "missing";
  }), hooks);

  expect(await signature(section10Card)).toEqual(await signature(section11Card));
  await expect(section10Card.locator("a").first()).toHaveAttribute("href", /^\/.+/);
  await expect(section.getByRole("link", { name: "Show Now" })).toHaveAttribute("href", /^\/.+/);

  const cartButton = section10Card.locator("[data-product-cart-button]");
  await cartButton.focus();
  await expect(cartButton).toBeFocused();
  await cartButton.press("Enter");
  await expect(cartButton.locator('path[d="M5 13l4 4L19 7"]')).toBeVisible();

  for (const legacySectionId of ["section-6", "section-17"]) {
    await expect(page.locator(`#${legacySectionId} [data-product-card]`)).toHaveCount(0);
  }

  const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(
    accessibility.violations.filter((violation) => ["serious", "critical"].includes(violation.impact || "")),
  ).toEqual([]);
  expect(browserProductSectionRequests).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("Section 10 shared cards preserve responsive carousel geometry without overflow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Explicit responsive widths are verified once");

  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const { section } = await openSection10(page);
    const item = section.locator(".homepage-product-carousel-item").first();
    const image = item.locator(".product-card-image-frame");
    const expectedCardWidth = width <= 768 ? (width - 60) / 2 : 280;

    await expect.poll(() => item.evaluate((element) => (
      Math.round(element.getBoundingClientRect().width * 100) / 100
    ))).toBe(expectedCardWidth);
    await expect.poll(() => image.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return Math.round((box.width / box.height) * 1000) / 1000;
    })).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    expect(await section.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  }
});

test("dragging a Section 10 shared card advances the carousel without opening its product", async ({ page }, testInfo) => {
  const { pageErrors, section, track } = await openSection10(page);
  const homepageUrl = page.url();
  const wrapper = section.locator(".carousel-wrapper");
  const box = await wrapper.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;

  const cardStep = await track.evaluate((element) => {
    const firstCard = element.children[0] as HTMLElement;
    const style = getComputedStyle(element);
    return firstCard.offsetWidth + (parseFloat(style.columnGap) || 16);
  });
  const startX = box.x + Math.min(box.width - 40, cardStep + 40);
  const startY = box.y + box.height / 2;
  const initialVisibleIndex = await visibleOriginalIndex(track);

  if (testInfo.project.name === "mobile-chromium") {
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: startX, y: startY }],
    });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: startX - cardStep * 0.35, y: startY }],
    });
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } else {
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX - cardStep * 0.35, startY, { steps: 5 });
    await page.mouse.up();
  }

  await expect.poll(() => visibleOriginalIndex(track), { timeout: 1400 }).not.toBe(initialVisibleIndex);
  expect(page.url()).toBe(homepageUrl);
  expect(pageErrors).toEqual([]);
});
