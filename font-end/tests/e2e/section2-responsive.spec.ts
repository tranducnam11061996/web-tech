import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

async function openSection2(page: Page) {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));

  await page.goto("/", { waitUntil: "domcontentloaded" });
  const section = page.locator("#section-2");
  const carousel = section.locator("[data-section2-carousel]");
  const track = section.locator("[data-section2-track]");
  await expect(section).toBeVisible();
  await section.scrollIntoViewIfNeeded();
  await expect(section.locator("[data-section2-slide]")).not.toHaveCount(0);

  return { carousel, pageErrors, section, track };
}

async function pauseMobileCarousel(section: Locator, page: Page) {
  await section.hover();
  await page.waitForTimeout(450);
}

test("Section 2 matches the compact 397px mobile reference", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Exact mobile geometry is verified once.");
  await page.setViewportSize({ width: 397, height: 700 });

  const { carousel, pageErrors, section, track } = await openSection2(page);
  await expect(carousel).toHaveAttribute("data-homepage-carousel-active", "true");
  await expect.poll(() => track.evaluate((element) => (element as HTMLElement).style.transform)).toContain("translateX(-");
  await pauseMobileCarousel(section, page);

  const sectionBox = await section.boundingBox();
  const visibleSlides = await section.locator("[data-section2-slide]").evaluateAll((slides) => slides
    .map((slide) => {
      const slideBox = slide.getBoundingClientRect();
      const ring = slide.querySelector<HTMLElement>("[data-section2-ring]");
      const ringBox = ring?.getBoundingClientRect();
      return {
        x: ringBox?.x || 0,
        right: ringBox?.right || 0,
        width: ringBox?.width || 0,
        visibility: getComputedStyle(slide).visibility,
        slideRight: slideBox.right,
      };
    })
    .filter((slide) => slide.visibility !== "hidden" && slide.slideRight > 0 && slide.x < window.innerWidth)
    .sort((a, b) => a.x - b.x));

  expect(sectionBox?.height).toBeCloseTo(130, 0);
  expect(visibleSlides).toHaveLength(5);
  for (const slide of visibleSlides) expect(slide.width).toBeCloseTo(73, 0);
  expect(visibleSlides.map((slide) => Math.round(slide.x))).toEqual([16, 97, 178, 259, 340]);
  expect(visibleSlides[3]?.right).toBeLessThanOrEqual(397);
  expect(visibleSlides[4]?.x).toBeLessThan(397);
  expect(visibleSlides[4]?.right).toBeGreaterThan(397);
  const [mobileRingBox, mobileSpacerBox, mobileArtworkBox] = await Promise.all([
    section.locator("[data-section2-ring]").first().boundingBox(),
    section.locator("[data-section2-spacer]").first().boundingBox(),
    section.locator("[data-section2-artwork]").first().boundingBox(),
  ]);
  expect(mobileSpacerBox?.width).toBeCloseTo(67, 0);
  expect(mobileArtworkBox?.width).toBeCloseTo(61, 0);
  expect((mobileSpacerBox?.x || 0) - (mobileRingBox?.x || 0)).toBeCloseTo(3, 0);
  expect((mobileArtworkBox?.x || 0) - (mobileRingBox?.x || 0)).toBeCloseTo(6, 0);
  await expect(section.locator("[data-section2-spacer]").first()).toHaveCSS("background-color", "rgb(17, 17, 17)");
  await expect(section.locator("[data-section2-label]").first()).toHaveCSS("font-size", "10px");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(pageErrors).toEqual([]);

  await section.screenshot({ path: testInfo.outputPath("section-2-mobile.png") });
});

test("Section 2 matches the centered 1920px desktop reference", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Exact desktop geometry is verified once.");
  await page.setViewportSize({ width: 2542, height: 900 });

  const { carousel, pageErrors, section, track } = await openSection2(page);
  const rail = section.locator(":scope > div");
  const rings = section.locator("[data-section2-ring]");
  const [sectionBox, railBox, trackBox] = await Promise.all([
    section.boundingBox(),
    rail.boundingBox(),
    track.boundingBox(),
  ]);
  const ringBoxes = await rings.evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect();
    return { x: box.x, right: box.right, width: box.width, height: box.height };
  }));

  expect(sectionBox?.height).toBeCloseTo(168, 0);
  expect(railBox?.width).toBeCloseTo(1920, 0);
  expect(railBox?.x).toBeCloseTo((2542 - 1920) / 2, 0);
  expect(trackBox?.width).toBeCloseTo(1920, 0);
  expect(ringBoxes).toHaveLength(14);
  for (const ring of ringBoxes) {
    expect(ring.width).toBeCloseTo(96, 0);
    expect(ring.height).toBeCloseTo(96, 0);
  }
  expect(ringBoxes[0]?.x).toBeCloseTo(391, 0);
  expect((ringBoxes[1]?.x || 0) - (ringBoxes[0]?.x || 0)).toBeCloseTo(128, 0);
  expect(ringBoxes.at(-1)?.right).toBeCloseTo(2151, 0);
  const [desktopRingBox, desktopSpacerBox, desktopArtworkBox] = await Promise.all([
    section.locator("[data-section2-ring]").first().boundingBox(),
    section.locator("[data-section2-spacer]").first().boundingBox(),
    section.locator("[data-section2-artwork]").first().boundingBox(),
  ]);
  expect(desktopSpacerBox?.width).toBeCloseTo(90, 0);
  expect(desktopArtworkBox?.width).toBeCloseTo(84, 0);
  expect((desktopSpacerBox?.x || 0) - (desktopRingBox?.x || 0)).toBeCloseTo(3, 0);
  expect((desktopArtworkBox?.x || 0) - (desktopRingBox?.x || 0)).toBeCloseTo(6, 0);
  await expect(section.locator("[data-section2-label]").first()).toHaveCSS("font-size", "12px");
  await expect(carousel).not.toHaveAttribute("data-homepage-carousel-active", "true");
  await expect(track).toHaveCSS("transform", "none");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(pageErrors).toEqual([]);

  await section.screenshot({ path: testInfo.outputPath("section-2-desktop.png") });
});

test("Section 2 preserves breakpoints, autoplay, links and accessibility", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Responsive behavior is verified once.");
  await page.setViewportSize({ width: 397, height: 700 });

  const { carousel, pageErrors, section, track } = await openSection2(page);
  await expect(carousel).toHaveAttribute("data-homepage-carousel-active", "true");
  await page.mouse.move(0, 500);
  const visibleIndex = () => track.evaluate((element) => (
    (element.children[1] as HTMLElement | undefined)?.dataset.originalIndex || null
  ));
  const indexBefore = await visibleIndex();
  await expect.poll(visibleIndex, { timeout: 6_500 }).not.toBe(indexBefore);

  const cases = [
    { width: 360, ring: 73, gap: "8px", active: true },
    { width: 428, ring: 73, gap: "8px", active: true },
    { width: 639, ring: 73, gap: "8px", active: true },
    { width: 640, ring: 73, gap: "8px", active: false },
    { width: 767, ring: 73, gap: "8px", active: false },
    { width: 768, ring: 96, gap: "32px", active: false },
    { width: 1024, ring: 96, gap: "32px", active: false },
    { width: 1920, ring: 96, gap: "32px", active: false },
  ] as const;

  for (const expected of cases) {
    await page.setViewportSize({ width: expected.width, height: 700 });
    await section.scrollIntoViewIfNeeded();
    await page.waitForTimeout(150);
    await expect(section.locator("[data-section2-ring]").first()).toHaveCSS("width", `${expected.ring}px`);
    await expect(track).toHaveCSS("gap", expected.gap);
    if (expected.active) await expect(carousel).toHaveAttribute("data-homepage-carousel-active", "true");
    else await expect(carousel).not.toHaveAttribute("data-homepage-carousel-active", "true");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }

  const firstItem = section.locator("[data-section2-item]").first();
  await firstItem.focus();
  await expect(firstItem).toBeFocused();
  await expect(firstItem).toHaveAttribute("href");

  const accessibility = await new AxeBuilder({ page })
    .include("#section-2")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    accessibility.violations.filter((violation) => ["serious", "critical"].includes(violation.impact || "")),
  ).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("Section 2 keeps native scrolling when reduced motion is requested", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Reduced motion is verified once.");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 397, height: 700 });

  const { carousel, pageErrors, section, track } = await openSection2(page);
  await expect(carousel).not.toHaveAttribute("data-homepage-carousel-active", "true");
  await expect(track).toHaveCSS("transform", "none");
  await expect(carousel).toHaveCSS("overflow-x", "auto");
  await carousel.evaluate((element) => {
    element.scrollLeft = 81;
  });
  await expect.poll(() => carousel.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(pageErrors).toEqual([]);
});
