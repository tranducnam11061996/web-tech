import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function openSection15(page: Page) {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  await page.goto("/");

  const section = page.locator("#section-15");
  await expect(section).toBeVisible();
  await section.scrollIntoViewIfNeeded();
  const cards = section.locator("[data-section15-card]");
  await expect.poll(() => cards.count()).toBeGreaterThan(8);

  return { cards, pageErrors, section };
}

test("Section 15 matches the compact two-column mobile composition", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Exact mobile geometry is verified once.");
  await page.setViewportSize({ width: 397, height: 900 });

  const { cards, pageErrors, section } = await openSection15(page);
  const shell = section.locator("[data-section15-shell]");
  const scroll = section.locator("[data-section15-scroll]");
  const fade = section.locator("[data-section15-fade]");
  const button = section.locator("[data-section15-view-all]");
  const innerFrame = section.locator("[data-section15-inner-frame]");
  const title = section.locator("#homepage-brands-title");
  const shellBox = await shell.boundingBox();
  const scrollMetrics = await scroll.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    overflowY: getComputedStyle(element).overflowY,
  }));
  const boxes = await cards.evaluateAll((elements) => elements.slice(0, 8).map((element) => {
    const box = element.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  }));

  expect(shellBox).not.toBeNull();
  expect(shellBox?.x).toBeCloseTo(0, 0);
  expect(shellBox?.width).toBeCloseTo(397, 0);
  await expect(shell).toHaveCSS("border-radius", "0px");
  await expect(innerFrame).toBeHidden();
  await expect(title).toHaveCSS("font-size", "24px");
  expect((await button.boundingBox())?.height).toBeGreaterThanOrEqual(28);
  expect(scrollMetrics.clientHeight).toBeCloseTo(366, 0);
  expect(scrollMetrics.scrollHeight).toBeGreaterThan(scrollMetrics.clientHeight);
  expect(scrollMetrics.overflowY).toBe("auto");
  expect((await fade.boundingBox())?.height).toBeCloseTo(56, 0);

  expect(boxes[0].x).toBeCloseTo(16, 0);
  expect(boxes[0].width).toBeCloseTo(174.5, 0);
  expect(boxes[0].height).toBeCloseTo(80, 0);
  expect(boxes[1].x - boxes[0].x - boxes[0].width).toBeCloseTo(16, 0);
  expect(boxes[2].y - boxes[0].y - boxes[0].height).toBeCloseTo(16, 0);
  expect(boxes[6].y - boxes[4].y - boxes[4].height).toBeCloseTo(16, 0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(pageErrors).toEqual([]);
});

test("Section 15 matches the centered six-column desktop composition", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Exact desktop geometry is verified once.");
  await page.setViewportSize({ width: 2537, height: 1000 });

  const { cards, pageErrors, section } = await openSection15(page);
  const shell = section.locator("[data-section15-shell]");
  const innerFrame = section.locator("[data-section15-inner-frame]");
  const scroll = section.locator("[data-section15-scroll]");
  const shellBox = await shell.boundingBox();
  const innerFrameBox = await innerFrame.boundingBox();
  const scrollMetrics = await scroll.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    overflowY: getComputedStyle(element).overflowY,
  }));
  const boxes = await cards.evaluateAll((elements) => elements.slice(0, 12).map((element) => {
    const box = element.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  }));

  expect(shellBox).not.toBeNull();
  expect(shellBox?.width).toBeCloseTo(1920, 0);
  expect(shellBox?.x).toBeCloseTo((2537 - 1920) / 2, 0);
  await expect(shell).toHaveCSS("border-radius", "16px");
  expect(innerFrameBox).not.toBeNull();
  expect(innerFrameBox?.x).toBeCloseTo((shellBox?.x ?? 0) + 16, 0);
  expect(innerFrameBox?.y).toBeCloseTo((shellBox?.y ?? 0) + 16, 0);
  expect((shellBox?.x ?? 0) + (shellBox?.width ?? 0) - ((innerFrameBox?.x ?? 0) + (innerFrameBox?.width ?? 0))).toBeCloseTo(16, 0);
  expect((shellBox?.y ?? 0) + (shellBox?.height ?? 0) - ((innerFrameBox?.y ?? 0) + (innerFrameBox?.height ?? 0))).toBeCloseTo(16, 0);
  await expect(innerFrame).toHaveCSS("border-radius", "24px");
  await expect(section.locator("#homepage-brands-title")).toHaveCSS("font-size", "30px");
  expect(scrollMetrics.clientHeight).toBeCloseTo(378, 0);
  expect(scrollMetrics.scrollHeight).toBeGreaterThan(scrollMetrics.clientHeight);
  expect(scrollMetrics.overflowY).toBe("auto");
  expect(boxes.slice(0, 6).every((box) => Math.abs(box.y - boxes[0].y) < 1)).toBe(true);
  expect(boxes[6].y - boxes[0].y - boxes[0].height).toBeCloseTo(20, 0);
  for (const box of boxes) expect(box.height).toBeCloseTo(80, 0);
  for (let index = 1; index < 6; index += 1) {
    expect(boxes[index].x - boxes[index - 1].x - boxes[index - 1].width).toBeCloseTo(20, 0);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(pageErrors).toEqual([]);
});

test("Section 15 preserves its 2/3/4/5/6-column breakpoint matrix", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "The responsive matrix is verified once.");
  test.setTimeout(120_000);

  const widths = [360, 639, 640, 767, 768, 1023, 1024, 1279, 1280, 1535, 1536, 1920];

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    const { cards } = await openSection15(page);
    const section = page.locator("#section-15");
    const shell = section.locator("[data-section15-shell]");
    const innerFrame = section.locator("[data-section15-inner-frame]");
    const firstY = await cards.first().evaluate((element) => element.getBoundingClientRect().y);
    const firstRowCount = await cards.evaluateAll((elements, y) => elements.filter((element) => (
      Math.abs(element.getBoundingClientRect().y - y) < 1
    )).length, firstY);
    const expected = width < 640 ? 2 : width < 768 ? 3 : width < 1280 ? 4 : width < 1536 ? 5 : 6;

    expect(firstRowCount).toBe(expected);
    await expect(shell).toHaveCSS("border-radius", width >= 1024 ? "16px" : "0px");
    if (width >= 1024) {
      await expect(innerFrame).toBeVisible();
      await expect(innerFrame).toHaveCSS("border-radius", "24px");
    } else {
      await expect(innerFrame).toBeHidden();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }
});

test("Section 15 scrolls, expands, collapses and remains accessible", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Interaction and accessibility are verified once.");
  await page.setViewportSize({ width: 397, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });

  const { cards, pageErrors, section } = await openSection15(page);
  const scroll = section.locator("[data-section15-scroll]");
  const viewAll = section.locator("[data-section15-view-all]");
  const toggle = section.locator("[data-section15-toggle]");

  await scroll.evaluate((element) => { element.scrollTop = 120; });
  expect(await scroll.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await viewAll.click();
  await expect(viewAll).toHaveText("Thu gọn");
  await expect(viewAll).toHaveAttribute("aria-expanded", "true");
  await expect(scroll).toHaveCSS("overflow-y", "visible");
  expect(await scroll.evaluate((element) => element.scrollTop)).toBe(0);
  await toggle.click();
  await expect(viewAll).toHaveText("Xem tất cả");
  await expect(viewAll).toHaveAttribute("aria-expanded", "false");
  await expect(scroll).toHaveCSS("overflow-y", "auto");

  await cards.first().focus();
  await expect(cards.first()).toBeFocused();
  await expect(cards.first()).toHaveAttribute("href", /^\/brand\/[a-z0-9._-]+$/);
  expect(await section.locator("[data-section15-brand-fallback]").count()).toBeGreaterThan(0);
  const animationName = await section.locator(".section15-blob").first().evaluate((element) => (
    getComputedStyle(element).animationName
  ));
  expect(animationName).toBe("none");

  const accessibility = await new AxeBuilder({ page })
    .include("#section-15")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    accessibility.violations.filter((violation) => ["serious", "critical"].includes(violation.impact || "")),
  ).toEqual([]);
  expect(pageErrors).toEqual([]);
});
