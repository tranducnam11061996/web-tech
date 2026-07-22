import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function openSection4(page: Page) {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));

  await page.goto("/");
  const section = page.locator("#section-4");
  const track = section.locator("[data-section4-track]");
  await expect(section).toBeVisible();
  await section.scrollIntoViewIfNeeded();
  await expect(section.locator("[data-section4-slide]")).not.toHaveCount(0);
  await expect.poll(() => track.evaluate((element) => ({
    transform: (element as HTMLElement).style.transform,
    visibleOriginalIndex: (element.children[1] as HTMLElement | undefined)?.dataset.originalIndex || null,
  }))).toMatchObject({
    transform: expect.stringContaining("translateX(-"),
    visibleOriginalIndex: expect.any(String),
  });

  return { pageErrors, section, track };
}

async function pauseCarousel(section: ReturnType<Page["locator"]>, page: Page) {
  await section.locator("[data-section4-carousel]").hover();
  await page.waitForTimeout(450);
}

test("Section 4 matches the compact 398px mobile reference", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Exact mobile geometry is verified once.");
  await page.setViewportSize({ width: 398, height: 900 });

  const { pageErrors, section } = await openSection4(page);
  await pauseCarousel(section, page);

  const heading = section.locator("h2");
  const viewAll = section.locator("[data-section4-view-all]");
  const nextButton = section.getByRole("button", { name: "Next" });
  const visibleImages = section.locator('[data-section4-slide][data-original-index="0"] img, [data-section4-slide][data-original-index="1"] img, [data-section4-slide][data-original-index="2"] img, [data-section4-slide][data-original-index="3"] img');
  const sectionBox = await section.boundingBox();
  const headingBox = await heading.boundingBox();
  const viewAllBox = await viewAll.boundingBox();
  const originalCards = await section.locator('[data-section4-slide][data-original-index="0"], [data-section4-slide][data-original-index="1"], [data-section4-slide][data-original-index="2"], [data-section4-slide][data-original-index="3"]').evaluateAll((slides) => slides.map((slide) => {
    const card = slide.querySelector<HTMLElement>("[data-section4-card]");
    const box = card?.getBoundingClientRect();
    return box ? { x: box.x, width: box.width, height: box.height, right: box.right } : null;
  }));

  expect(sectionBox?.height).toBeCloseTo(173, 0);
  expect(headingBox?.x).toBeCloseTo(16, 0);
  expect(await heading.evaluate((element) => getComputedStyle(element).fontSize)).toBe("24px");
  expect(viewAllBox?.width).toBeCloseTo(77, 0);
  expect(viewAllBox?.height).toBeCloseTo(30, 0);
  await expect(viewAll).toHaveAttribute("href", "/category");
  await expect(nextButton).toBeHidden();

  expect(originalCards).toHaveLength(4);
  for (const card of originalCards) {
    expect(card?.width).toBeCloseTo(90, 0);
    expect(card?.height).toBeCloseTo(95, 0);
  }
  expect(originalCards[0]?.x).toBeCloseTo(16, 0);
  expect((originalCards[1]?.x || 0) - (originalCards[0]?.x || 0)).toBeCloseTo(100, 0);
  expect((originalCards[2]?.x || 0) - (originalCards[1]?.x || 0)).toBeCloseTo(100, 0);
  expect((originalCards[3]?.x || 0) - (originalCards[2]?.x || 0)).toBeCloseTo(100, 0);
  expect(originalCards[2]?.right).toBeLessThanOrEqual(398);
  expect(originalCards[3]?.x).toBeLessThan(398);
  expect(originalCards[3]?.right).toBeGreaterThan(398);

  await expect(visibleImages).toHaveCount(4);
  await expect.poll(() => visibleImages.evaluateAll((images) => images.every((image) => (
    (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0
  )))).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(pageErrors).toEqual([]);
});

test("Section 4 matches the centered 1920px desktop reference", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Exact desktop geometry is verified once.");
  await page.setViewportSize({ width: 2542, height: 900 });

  const { pageErrors, section, track } = await openSection4(page);
  await pauseCarousel(section, page);

  const rail = section.locator(":scope > div");
  const heading = section.locator("h2");
  const nextButton = section.getByRole("button", { name: "Next" });
  const viewAll = section.locator("[data-section4-view-all]");
  const sectionBox = await section.boundingBox();
  const railBox = await rail.boundingBox();
  const headingBox = await heading.boundingBox();
  const nextBox = await nextButton.boundingBox();
  const originalCards = await section.locator("[data-section4-slide][data-original-index]").evaluateAll((slides) => slides
    .map((slide) => ({
      index: Number((slide as HTMLElement).dataset.originalIndex),
      card: slide.querySelector<HTMLElement>("[data-section4-card]"),
    }))
    .filter(({ index }) => index >= 0 && index <= 12)
    .sort((a, b) => a.index - b.index)
    .map(({ card }) => {
      const box = card?.getBoundingClientRect();
      return box ? { x: box.x, width: box.width, height: box.height, right: box.right } : null;
    }));

  expect(sectionBox?.height).toBeCloseTo(244, 0);
  expect(railBox?.width).toBeCloseTo(1920, 0);
  expect(railBox?.x).toBeCloseTo((2542 - 1920) / 2, 0);
  expect(headingBox?.x).toBeCloseTo((2542 - 1920) / 2 + 32, 0);
  expect(await heading.evaluate((element) => getComputedStyle(element).fontSize)).toBe("30px");
  expect(nextBox?.width).toBeCloseTo(36, 0);
  expect(nextBox?.height).toBeCloseTo(36, 0);
  await expect(nextButton).toBeVisible();
  await expect(viewAll).toBeVisible();

  expect(originalCards).toHaveLength(13);
  for (const card of originalCards) {
    expect(card?.width).toBeCloseTo(130, 0);
    expect(card?.height).toBeCloseTo(110, 0);
  }
  expect(originalCards[0]?.x).toBeCloseTo((2542 - 1920) / 2 + 32, 0);
  expect((originalCards[1]?.x || 0) - (originalCards[0]?.x || 0)).toBeCloseTo(154, 0);
  expect(originalCards[11]?.right).toBeLessThanOrEqual((railBox?.x || 0) + (railBox?.width || 0));
  expect(originalCards[12]?.x).toBeLessThan((railBox?.x || 0) + (railBox?.width || 0));
  expect(originalCards[12]?.right).toBeGreaterThan((railBox?.x || 0) + (railBox?.width || 0));

  const visibleBefore = await track.evaluate((element) => (element.children[1] as HTMLElement).dataset.originalIndex);
  await nextButton.click();
  await page.waitForTimeout(450);
  const visibleAfter = await track.evaluate((element) => (element.children[1] as HTMLElement).dataset.originalIndex);
  expect(visibleAfter).not.toBe(visibleBefore);

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(pageErrors).toEqual([]);
});

test("Section 4 preserves responsive density, autoplay and accessibility", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Responsive behavior is verified once.");

  const expectedWidths = [
    [360, { slide: 99, card: 90 }],
    [390, { slide: 99, card: 90 }],
    [428, { slide: 99, card: 90 }],
    [639, { slide: 99, card: 90 }],
    [640, { slide: 114, card: 105 }],
    [768, { slide: 129, card: 114 }],
    [1024, { slide: 153, card: 130 }],
    [1920, { slide: 153, card: 130 }],
  ] as const;

  for (const [width, expected] of expectedWidths) {
    await page.setViewportSize({ width, height: 900 });
    const { section } = await openSection4(page);
    await pauseCarousel(section, page);
    const slide = section.locator('[data-section4-slide][data-original-index="0"]');
    const card = slide.locator("[data-section4-card]");
    await expect(slide).toHaveCSS("width", `${expected.slide}px`);
    await expect(card).toHaveCSS("width", `${expected.card}px`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }

  await page.setViewportSize({ width: 398, height: 900 });
  const { pageErrors, section, track } = await openSection4(page);
  await page.mouse.move(0, 0);
  const visibleBefore = await track.evaluate((element) => (element.children[1] as HTMLElement).dataset.originalIndex);
  await expect.poll(async () => track.evaluate((element) => (
    (element.children[1] as HTMLElement).dataset.originalIndex
  )), { timeout: 6_500 }).not.toBe(visibleBefore);

  const firstCard = section.locator('[data-section4-slide][data-original-index="0"] [data-section4-card]');
  await firstCard.focus();
  await expect(firstCard).toBeFocused();
  await expect(firstCard).toHaveAttribute("href");
  await expect(firstCard.locator("img")).toHaveAttribute("alt", /\S+/);

  const accessibility = await new AxeBuilder({ page })
    .include("#section-4")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    accessibility.violations.filter((violation) => ["serious", "critical"].includes(violation.impact || "")),
  ).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("Section 4 keeps a stable reduced-motion fallback", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Reduced motion is verified once.");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 398, height: 900 });
  await page.goto("/");

  const section = page.locator("#section-4");
  const track = section.locator("[data-section4-track]");
  await section.scrollIntoViewIfNeeded();
  await expect(track).toHaveCSS("transform", "none");
  await expect(section.locator("[data-section4-card]").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});
