import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function openSection5(page: Page) {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));

  await page.goto("/");
  const section = page.locator("#section-5");
  await expect(section).toBeVisible();
  await section.scrollIntoViewIfNeeded();
  await expect(section.locator("[data-section5-card] img")).toHaveCount(5);
  await expect.poll(() => section.locator("img").evaluateAll((images) => (
    images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0)
  ))).toBe(true);

  return { pageErrors, section };
}

test("Section 5 matches the mobile asymmetric composition", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Exact mobile geometry is verified once");
  await page.setViewportSize({ width: 428, height: 900 });

  const { pageErrors, section } = await openSection5(page);
  const grid = section.locator("[data-section5-grid]");
  const laptop = section.locator('[data-section5-card="laptop-deals"]');
  const graphics = section.locator('[data-section5-card="graphics-cards"]');
  const prebuilt = section.locator('[data-section5-card="prebuilt-pc"]');
  const upgrade = section.locator('[data-section5-card="upgrade-kits"]');
  const monitor = section.locator('[data-section5-card="monitor-deals"]');
  const [gridBox, laptopBox, graphicsBox, prebuiltBox, upgradeBox, monitorBox, sectionBox] = await Promise.all([
    grid.boundingBox(),
    laptop.boundingBox(),
    graphics.boundingBox(),
    prebuilt.boundingBox(),
    upgrade.boundingBox(),
    monitor.boundingBox(),
    section.boundingBox(),
  ]);

  expect(gridBox).not.toBeNull();
  expect(laptopBox).not.toBeNull();
  expect(graphicsBox).not.toBeNull();
  expect(prebuiltBox).not.toBeNull();
  expect(upgradeBox).not.toBeNull();
  expect(monitorBox).not.toBeNull();
  expect(sectionBox).not.toBeNull();
  expect(gridBox?.x).toBeCloseTo(16, 0);
  expect(gridBox?.width).toBeCloseTo(396, 0);
  expect(laptopBox?.width).toBeCloseTo(192, 0);
  expect(laptopBox?.height).toBeCloseTo(108, 0);
  expect((graphicsBox?.x || 0) - (laptopBox?.x || 0) - (laptopBox?.width || 0)).toBeCloseTo(12, 0);
  expect(graphicsBox?.y).toBeCloseTo(laptopBox?.y || 0, 0);
  expect(prebuiltBox?.y).toBeCloseTo((laptopBox?.y || 0) + (laptopBox?.height || 0) + 12, 0);
  expect(prebuiltBox?.height).toBeCloseTo(228, 0);
  expect(upgradeBox?.y).toBeCloseTo(prebuiltBox?.y || 0, 0);
  expect(monitorBox?.y).toBeCloseTo((upgradeBox?.y || 0) + (upgradeBox?.height || 0) + 12, 0);
  expect(sectionBox?.height).toBeCloseTo(380, 0);
  await expect(section.locator("[data-section5-cta]").first()).toBeHidden();
  await expect(section.locator("[data-section5-eyebrow]").first()).toHaveCSS("opacity", "1");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(pageErrors).toEqual([]);

  await section.screenshot({ path: testInfo.outputPath("section-5-mobile.png") });
});

test("Section 5 matches the 1800px desktop geometry and featured hover", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Exact desktop geometry is verified once");
  await page.setViewportSize({ width: 2545, height: 1000 });

  const { pageErrors, section } = await openSection5(page);
  const grid = section.locator("[data-section5-grid]");
  const laptop = section.locator('[data-section5-card="laptop-deals"]');
  const graphics = section.locator('[data-section5-card="graphics-cards"]');
  const prebuilt = section.locator('[data-section5-card="prebuilt-pc"]');
  const upgrade = section.locator('[data-section5-card="upgrade-kits"]');
  const monitor = section.locator('[data-section5-card="monitor-deals"]');
  const [gridBox, laptopBox, graphicsBox, prebuiltBox, upgradeBox, monitorBox, sectionBox] = await Promise.all([
    grid.boundingBox(),
    laptop.boundingBox(),
    graphics.boundingBox(),
    prebuilt.boundingBox(),
    upgrade.boundingBox(),
    monitor.boundingBox(),
    section.boundingBox(),
  ]);

  expect(gridBox?.width).toBeCloseTo(1800, 0);
  expect(gridBox?.x).toBeCloseTo((2545 - 1800) / 2, 0);
  expect(gridBox?.height).toBeCloseTo(1800 * 647 / 1920, 0);
  expect(laptopBox?.width).toBeCloseTo(580, 0);
  expect((prebuiltBox?.x || 0) - (laptopBox?.x || 0) - (laptopBox?.width || 0)).toBeCloseTo(30, 0);
  expect((graphicsBox?.x || 0) - (prebuiltBox?.x || 0) - (prebuiltBox?.width || 0)).toBeCloseTo(30, 0);
  expect(upgradeBox?.x).toBeCloseTo(laptopBox?.x || 0, 0);
  expect(monitorBox?.x).toBeCloseTo(graphicsBox?.x || 0, 0);
  expect((upgradeBox?.y || 0) - (laptopBox?.y || 0) - (laptopBox?.height || 0)).toBeCloseTo(30, 0);
  expect(prebuiltBox?.height).toBeCloseTo((laptopBox?.height || 0) * 2 + 30, 0);
  expect(sectionBox?.height).toBeCloseTo(659, 0);
  await expect(laptop.locator("[data-section5-cta]")).toBeVisible();
  await expect(prebuilt.locator("[data-section5-eyebrow]")).toHaveCSS("opacity", "0");

  await prebuilt.hover();
  await expect(prebuilt.locator("[data-section5-eyebrow]")).toHaveCSS("opacity", "1");
  await expect(prebuilt.locator("[data-section5-featured-line]")).toHaveCSS("opacity", "0.9");
  await expect(prebuilt.locator("[data-section5-featured-dots]")).toHaveCSS("opacity", "1");
  expect(pageErrors).toEqual([]);

  await section.screenshot({ path: testInfo.outputPath("section-5-desktop.png") });
});

test("Section 5 preserves links, responsive transitions and accessibility", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Responsive matrix is verified once");

  for (const width of [360, 768, 1024, 1499, 1500]) {
    await page.setViewportSize({ width, height: 1000 });
    const { section } = await openSection5(page);
    const cards = section.locator("[data-section5-card]");
    const firstY = await cards.first().evaluate((element) => element.getBoundingClientRect().y);
    const sameRowCount = await cards.evaluateAll((elements, y) => elements.filter((element) => (
      Math.abs(element.getBoundingClientRect().y - y) < 1
    )).length, firstY);

    expect(sameRowCount).toBe(width < 1024 ? 2 : 3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }

  await page.setViewportSize({ width: 428, height: 900 });
  const { pageErrors, section } = await openSection5(page);
  const expectedLinks = [
    ["laptop-deals", "/laptop"],
    ["prebuilt-pc", "/bo-pc-gaming-livestream.html"],
    ["graphics-cards", "/vga-card-man-hinh.html"],
    ["upgrade-kits", "/linh-kien-may-tinh.html"],
    ["monitor-deals", "/monitor-man-hinh.html"],
  ] as const;

  for (const [id, href] of expectedLinks) {
    const card = section.locator(`[data-section5-card="${id}"]`);
    await expect(card).toHaveAttribute("href", href);
    await expect(card.locator("img")).toHaveAttribute("alt", /\S+/);
  }
  await section.locator('[data-section5-card="laptop-deals"]').focus();
  await expect(section.locator('[data-section5-card="laptop-deals"]')).toBeFocused();

  const accessibility = await new AxeBuilder({ page })
    .include("#section-5")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    accessibility.violations.filter((violation) => ["serious", "critical"].includes(violation.impact || "")),
  ).toEqual([]);
  expect(pageErrors).toEqual([]);
});
