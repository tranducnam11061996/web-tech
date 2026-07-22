import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

const viewports = [429, 768, 1024, 1499, 1500, 1920, 2537];

async function waitForArtwork(section: Locator, cardSelector: string) {
  await expect(section.locator(`${cardSelector} img`)).toHaveCount(5);
  await expect.poll(() => section.locator("img").evaluateAll((images) => (
    images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0)
  ))).toBe(true);
}

async function readGeometry(section: Locator, gridSelector: string, cardSelector: string) {
  return section.evaluate((element, selectors) => {
    const grid = element.querySelector<HTMLElement>(selectors.gridSelector);
    const cards = Array.from(element.querySelectorAll<HTMLElement>(selectors.cardSelector));
    if (!grid || cards.length !== 5) return null;

    const gridBox = grid.getBoundingClientRect();
    const cardBoxes = cards.map((card) => card.getBoundingClientRect());
    const firstY = cardBoxes[0].y;

    return {
      gridWidth: gridBox.width,
      gridX: gridBox.x,
      cards: cardBoxes.map((box) => ({
        x: box.x - gridBox.x,
        y: box.y - firstY,
        width: box.width,
        height: box.height,
      })),
      firstRowCount: cardBoxes.filter((box) => Math.abs(box.y - firstY) < 1).length,
    };
  }, { gridSelector, cardSelector });
}

async function openHomepage(page: Page) {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  await page.goto("/");

  const section9 = page.locator("#section-9");
  const section14 = page.locator("#section-14");
  await expect(section9).toHaveCount(1);
  await expect(section14).toHaveCount(1);
  await section9.scrollIntoViewIfNeeded();
  await waitForArtwork(section9, "[data-section9-card]");
  await section14.scrollIntoViewIfNeeded();
  await waitForArtwork(section14, "[data-section14-card]");

  return { pageErrors, section9, section14 };
}

test("Section 14 is source-independent from Section 9", async ({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "The source contract is viewport-independent.");

  const source = await readFile(path.join(process.cwd(), "src/components/sections/Section14.tsx"), "utf8");
  expect(source).toContain("const SECTION_14_CARDS");
  expect(source).toContain("--section14-accent");
  expect(source).not.toMatch(/from\s+["'][^"']*Section9["']/);
  expect(source).not.toContain("SECTION_9_CARDS");
});

test("Section 14 matches Section 9 across responsive breakpoints", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "The responsive matrix is verified once.");
  test.setTimeout(90_000);

  for (const width of viewports) {
    await page.setViewportSize({ width, height: 1000 });
    const { pageErrors, section9, section14 } = await openHomepage(page);
    const section9Geometry = await readGeometry(section9, "[data-section9-grid]", "[data-section9-card]");
    const section14Geometry = await readGeometry(section14, "[data-section14-grid]", "[data-section14-card]");

    expect(section9Geometry).not.toBeNull();
    expect(section14Geometry).not.toBeNull();
    expect(section14Geometry?.gridWidth).toBeCloseTo(section9Geometry?.gridWidth || 0, 1);
    expect(section14Geometry?.gridX).toBeCloseTo(section9Geometry?.gridX || 0, 1);
    expect(section14Geometry?.firstRowCount).toBe(section9Geometry?.firstRowCount);

    for (let index = 0; index < 5; index += 1) {
      const section9Card = section9Geometry?.cards[index];
      const section14Card = section14Geometry?.cards[index];
      expect(section14Card?.x).toBeCloseTo(section9Card?.x || 0, 1);
      expect(section14Card?.y).toBeCloseTo(section9Card?.y || 0, 1);
      expect(section14Card?.width).toBeCloseTo(section9Card?.width || 0, 1);
      expect(section14Card?.height).toBeCloseTo(section9Card?.height || 0, 1);
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    expect(pageErrors).toEqual([]);
  }
});

test("Section 14 preserves links, focus, reduced motion and accessibility", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Interaction and accessibility are verified once.");
  await page.setViewportSize({ width: 429, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });

  const { pageErrors, section14 } = await openHomepage(page);
  const cards = section14.locator("[data-section14-card]");
  const expectedLinks = [
    "/tim?q=tai%20nghe%20gaming",
    "/tim?q=ban%20phim%20gaming",
    "/tim?q=chuot%20gaming",
    "/tim?sort=newest",
    "/tim?q=open%20box",
  ];

  for (let index = 0; index < expectedLinks.length; index += 1) {
    await expect(cards.nth(index)).toHaveAttribute("href", expectedLinks[index]);
    await expect(cards.nth(index).locator("img")).toHaveAttribute("alt", /\S+/);
  }

  await cards.first().focus();
  await expect(cards.first()).toBeFocused();
  const reducedTransitionSeconds = await section14.locator("[data-section14-artwork]").first().evaluate((element) => (
    Number.parseFloat(getComputedStyle(element).transitionDuration)
  ));
  expect(reducedTransitionSeconds).toBeLessThan(0.001);

  const accessibility = await new AxeBuilder({ page })
    .include("#section-14")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    accessibility.violations.filter((violation) => ["serious", "critical"].includes(violation.impact || "")),
  ).toEqual([]);
  expect(pageErrors).toEqual([]);
});
