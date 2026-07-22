import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function openSection3(page: Page) {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));

  await page.goto("/", { waitUntil: "domcontentloaded" });
  const section = page.locator("#section-3");
  const carousel = section.locator("[data-section3-carousel]");
  await expect(section).toBeVisible();
  await section.scrollIntoViewIfNeeded();
  await expect(section.locator("[data-section3-slide]")).not.toHaveCount(0);
  await expect.poll(() => section.locator("[data-section3-slide][data-active=true] img").evaluate((image) => ({
    complete: (image as HTMLImageElement).complete,
    naturalWidth: (image as HTMLImageElement).naturalWidth,
  }))).toEqual({ complete: true, naturalWidth: expect.any(Number) });

  return { carousel, pageErrors, section };
}

test("Section 3 matches the 401px mobile reference", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Exact mobile geometry is verified once.");
  await page.setViewportSize({ width: 401, height: 800 });

  const { carousel, pageErrors, section } = await openSection3(page);
  const activeSlide = section.locator("[data-section3-slide][data-active=true]");
  const overlay = activeSlide.locator("[data-section3-overlay]");
  const headline = activeSlide.locator("[data-section3-headline]");
  const subheading = activeSlide.locator("[data-section3-subheading]");
  const cta = activeSlide.locator("[data-section3-cta]");
  const indicators = section.locator("[data-section3-indicators]");
  const [carouselBox, slideBox, overlayBox] = await Promise.all([
    carousel.boundingBox(),
    activeSlide.boundingBox(),
    overlay.boundingBox(),
  ]);

  expect(carouselBox?.x).toBeCloseTo(16, 0);
  expect(carouselBox?.width).toBeCloseTo(369, 0);
  expect(carouselBox?.height).toBeCloseTo(369 * 397 / 1024, 0);
  expect(slideBox?.width).toBeCloseTo(carouselBox?.width || 0, 0);
  expect(slideBox?.height).toBeCloseTo(carouselBox?.height || 0, 0);
  expect(overlayBox?.x).toBeCloseTo((carouselBox?.x || 0) + 24, 0);
  await expect(carousel).toHaveCSS("border-radius", "16px");
  await expect(headline).toHaveCSS("font-size", "22.4px");
  await expect(subheading).toBeHidden();
  await expect(cta).toHaveCSS("font-size", "12px");
  await expect(indicators).toBeHidden();
  await expect(section.getByRole("button", { name: /banner trước|banner tiếp theo/i })).toHaveCount(0);

  const image = activeSlide.locator("img");
  await expect.poll(() => image.evaluate((element) => ({
    width: (element as HTMLImageElement).naturalWidth,
    height: (element as HTMLImageElement).naturalHeight,
    src: (element as HTMLImageElement).currentSrc,
  }))).toMatchObject({ width: 1024, height: 397, src: expect.stringContaining("/api/media/") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(pageErrors).toEqual([]);

  await section.screenshot({ path: testInfo.outputPath("section-3-mobile.png") });
});

test("Section 3 matches the centered desktop reference", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Exact desktop geometry is verified once.");
  await page.setViewportSize({ width: 2534, height: 900 });

  const { carousel, pageErrors, section } = await openSection3(page);
  const activeSlide = section.locator("[data-section3-slide][data-active=true]");
  const overlay = activeSlide.locator("[data-section3-overlay]");
  const headline = activeSlide.locator("[data-section3-headline]");
  const subheading = activeSlide.locator("[data-section3-subheading]");
  const cta = activeSlide.locator("[data-section3-cta]");
  const indicators = section.locator("[data-section3-indicators]");
  const [sectionBox, carouselBox, overlayBox] = await Promise.all([
    section.boundingBox(),
    carousel.boundingBox(),
    overlay.boundingBox(),
  ]);

  expect(sectionBox?.width).toBeCloseTo(1920, 0);
  expect(sectionBox?.x).toBeCloseTo((2534 - 1920) / 2, 0);
  expect(carouselBox?.x).toBeCloseTo((2534 - 1920) / 2 + 32, 0);
  expect(carouselBox?.width).toBeCloseTo(1856, 0);
  expect(carouselBox?.height).toBeCloseTo(1856 * 394 / 1920, 0);
  expect(overlayBox?.x).toBeCloseTo((carouselBox?.x || 0) + 96, 0);
  await expect(carousel).toHaveCSS("border-radius", "16px");
  await expect(headline).toHaveCSS("font-size", "72px");
  await expect(subheading).toBeVisible();
  await expect(subheading).toHaveCSS("font-size", "16px");
  await expect(cta).toHaveCSS("font-size", "14px");
  await expect(indicators).toBeVisible();
  await expect(section.getByRole("button", { name: /banner trước|banner tiếp theo/i })).toHaveCount(0);

  const image = activeSlide.locator("img");
  await expect.poll(() => image.evaluate((element) => ({
    width: (element as HTMLImageElement).naturalWidth,
    height: (element as HTMLImageElement).naturalHeight,
    src: (element as HTMLImageElement).currentSrc,
  }))).toMatchObject({ width: 1920, height: 394, src: expect.stringContaining("/api/media/") });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(pageErrors).toEqual([]);

  await section.screenshot({ path: testInfo.outputPath("section-3-desktop.png") });
});

test("Section 3 locks its responsive art direction and typography breakpoints", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Responsive behavior is verified once.");
  await page.setViewportSize({ width: 401, height: 900 });
  const { carousel, pageErrors, section } = await openSection3(page);
  await carousel.hover();

  const cases = [
    { width: 360, margin: 16, mobileArt: true, indicators: false, subheading: false, headline: "22.4px" },
    { width: 575, margin: 16, mobileArt: true, indicators: false, subheading: false, headline: "28.75px" },
    { width: 576, margin: 16, mobileArt: true, indicators: false, subheading: true, headline: "28.8px" },
    { width: 639, margin: 16, mobileArt: true, indicators: false, subheading: true, headline: "31.95px" },
    { width: 640, margin: 16, mobileArt: true, indicators: true, subheading: true, headline: "32px" },
    { width: 1024, margin: 32, mobileArt: true, indicators: true, subheading: false, headline: "60px" },
    { width: 1025, margin: 32, mobileArt: false, indicators: true, subheading: false, headline: "60px" },
    { width: 1499, margin: 32, mobileArt: false, indicators: true, subheading: false, headline: "60px" },
    { width: 1500, margin: 32, mobileArt: false, indicators: true, subheading: true, headline: "72px" },
    { width: 1920, margin: 32, mobileArt: false, indicators: true, subheading: true, headline: "72px" },
  ] as const;

  for (const expected of cases) {
    await page.setViewportSize({ width: expected.width, height: 900 });
    await section.scrollIntoViewIfNeeded();
    const activeSlide = section.locator("[data-section3-slide][data-active=true]");
    const carouselBox = await carousel.boundingBox();
    const slideBox = await activeSlide.boundingBox();
    const availableWidth = Math.min(expected.width, 1920) - expected.margin * 2;
    const expectedRatio = expected.mobileArt ? 1024 / 397 : 1920 / 394;

    expect(carouselBox?.width).toBeCloseTo(availableWidth, 0);
    expect(slideBox?.height).toBeCloseTo(availableWidth / expectedRatio, 0);
    await expect(activeSlide.locator("[data-section3-headline]")).toHaveCSS("font-size", expected.headline);
    if (expected.subheading) await expect(activeSlide.locator("[data-section3-subheading]")).toBeVisible();
    else await expect(activeSlide.locator("[data-section3-subheading]")).toBeHidden();
    if (expected.indicators) await expect(section.locator("[data-section3-indicators]")).toBeVisible();
    else await expect(section.locator("[data-section3-indicators]")).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }

  expect(pageErrors).toEqual([]);
});

test("Section 3 autoplay, keyboard, swipe and accessibility remain usable", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Interaction behavior is verified once.");
  await page.setViewportSize({ width: 401, height: 900 });
  const { carousel, pageErrors, section } = await openSection3(page);
  await page.mouse.move(0, 0);

  const activeId = () => section.locator("[data-section3-slide][data-active=true]").getAttribute("id");
  const beforeAutoplay = await activeId();
  await expect.poll(activeId, { timeout: 6_500 }).not.toBe(beforeAutoplay);

  await carousel.focus();
  const beforeKeyboard = await activeId();
  await page.keyboard.press("ArrowRight");
  await expect.poll(activeId).not.toBe(beforeKeyboard);
  const focusedSlide = await activeId();
  await page.waitForTimeout(5_300);
  expect(await activeId()).toBe(focusedSlide);

  await page.keyboard.press("Home");
  const beforeSwipe = await activeId();
  await page.evaluate(() => {
    const target = document.querySelector<HTMLElement>("[data-section3-carousel]");
    if (!target) return;
    const touch = (clientX: number) => new Touch({ identifier: 1, target, clientX, clientY: 400 });
    target.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, touches: [touch(330)] }));
    target.dispatchEvent(new TouchEvent("touchmove", { bubbles: true, touches: [touch(250)] }));
    target.dispatchEvent(new TouchEvent("touchend", { bubbles: true, changedTouches: [touch(250)] }));
  });
  await expect.poll(activeId).not.toBe(beforeSwipe);
  const urlBeforeClick = page.url();
  await section.locator("a").first().evaluate((element) => (element as HTMLAnchorElement).click());
  await page.waitForTimeout(100);
  expect(page.url()).toBe(urlBeforeClick);

  const accessibility = await new AxeBuilder({ page })
    .include("#section-3")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    accessibility.violations.filter((violation) => ["serious", "critical"].includes(violation.impact || "")),
  ).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("Section 3 keeps a stable reduced-motion fallback", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Reduced motion is verified once.");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 401, height: 900 });
  const { pageErrors, section } = await openSection3(page);
  const track = section.locator("[data-section3-track]");
  const activeId = () => section.locator("[data-section3-slide][data-active=true]").getAttribute("id");
  const before = await activeId();

  expect(await track.evaluate((element) => Number.parseFloat(getComputedStyle(element).transitionDuration))).toBeLessThanOrEqual(0.001);
  await page.waitForTimeout(5_300);
  expect(await activeId()).toBe(before);
  expect(pageErrors).toEqual([]);
});
