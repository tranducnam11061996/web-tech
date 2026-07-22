import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function openSection9(page: Page) {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));

  await page.goto("/");
  const section = page.locator("#section-9");
  await expect(section).toBeVisible();
  await section.scrollIntoViewIfNeeded();
  await expect(section.locator("[data-section9-card] img")).toHaveCount(5);
  await expect.poll(() => section.locator("img").evaluateAll((images) => (
    images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0)
  ))).toBe(true);

  return { pageErrors, section };
}

test("Section 9 matches the mobile 2/3 card composition", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Exact mobile geometry is verified once");
  await page.setViewportSize({ width: 429, height: 900 });

  const { pageErrors, section } = await openSection9(page);
  const cards = section.locator("[data-section9-card]");
  const boxes = await cards.evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  }));

  expect(boxes).toHaveLength(5);
  expect(boxes[0].x).toBeCloseTo(16, 0);
  expect(boxes[0].width).toBeCloseTo(192.5, 0);
  expect(boxes[0].height).toBeCloseTo(boxes[0].width * 2 / 3, 0);
  expect(boxes[1].x - boxes[0].x - boxes[0].width).toBeCloseTo(12, 0);
  expect(boxes[2].x).toBeCloseTo(16, 0);
  expect(boxes[2].width).toBeCloseTo(124.33, 0);
  expect(boxes[2].height).toBeCloseTo(boxes[2].width * 23 / 25, 0);
  expect(boxes[2].y - boxes[0].y - boxes[0].height).toBeCloseTo(12, 0);
  expect(boxes[3].x - boxes[2].x - boxes[2].width).toBeCloseTo(12, 0);
  expect(boxes[4].x - boxes[3].x - boxes[3].width).toBeCloseTo(12, 0);

  const titleArtworkGaps = await cards.evaluateAll((elements) => elements.map((element) => {
    const title = element.querySelector<HTMLElement>("[data-section9-title]");
    const artwork = element.querySelector<HTMLElement>("[data-section9-artwork]");
    if (!title || !artwork) return null;
    return artwork.getBoundingClientRect().top - title.getBoundingClientRect().bottom;
  }));
  expect(titleArtworkGaps[0]).toBeCloseTo(11, 0);
  expect(titleArtworkGaps[1]).toBeCloseTo(11, 0);
  expect(titleArtworkGaps[2]).toBeCloseTo(5, 0);
  expect(titleArtworkGaps[3]).toBeCloseTo(5, 0);
  expect(titleArtworkGaps[4]).toBeCloseTo(5, 0);

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(pageErrors).toEqual([]);
});

test("Section 9 matches the centered 1700px five-card desktop geometry", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Exact desktop geometry is verified once");

  for (const width of [1920, 2537, 2540]) {
    await page.setViewportSize({ width, height: 1000 });

    const { pageErrors, section } = await openSection9(page);
    const grid = section.locator("[data-section9-grid]");
    const cards = section.locator("[data-section9-card]");
    const gridBox = await grid.boundingBox();
    const boxes = await cards.evaluateAll((elements) => elements.map((element) => {
      const box = element.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    }));

    expect(gridBox).not.toBeNull();
    expect(gridBox?.width).toBeCloseTo(1700, 0);
    expect(gridBox?.x).toBeCloseTo((width - 1700) / 2, 0);
    expect(boxes).toHaveLength(5);
    for (const box of boxes) {
      expect(box.width).toBeCloseTo(316, 0);
      expect(box.height).toBeCloseTo(box.width * 6 / 5, 0);
      expect(box.y).toBeCloseTo(boxes[0].y, 0);
    }
    for (let index = 1; index < boxes.length; index += 1) {
      expect(boxes[index].x - boxes[index - 1].x - boxes[index - 1].width).toBeCloseTo(30, 0);
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    expect(pageErrors).toEqual([]);
  }
});

test("Section 9 preserves responsive transitions, links and accessibility", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Responsive matrix is verified once");

  for (const width of [360, 768, 1024, 1499, 1500]) {
    await page.setViewportSize({ width, height: 1000 });
    const { section } = await openSection9(page);
    const cards = section.locator("[data-section9-card]");
    const firstRowY = await cards.first().evaluate((element) => element.getBoundingClientRect().y);
    const sameRowCount = await cards.evaluateAll((elements, y) => elements.filter((element) => (
      Math.abs(element.getBoundingClientRect().y - y) < 1
    )).length, firstRowY);

    expect(sameRowCount).toBe(width < 768 ? 2 : width < 1500 ? 3 : 5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }

  await page.setViewportSize({ width: 429, height: 900 });
  const { pageErrors, section } = await openSection9(page);
  const expectedLinks = [
    "/tim?q=tai%20nghe%20gaming",
    "/tim?q=ban%20phim%20gaming",
    "/tim?q=chuot%20gaming",
    "/tim?sort=newest",
    "/tim?q=open%20box",
  ];
  const cards = section.locator("[data-section9-card]");

  for (let index = 0; index < expectedLinks.length; index += 1) {
    await expect(cards.nth(index)).toHaveAttribute("href", expectedLinks[index]);
    await expect(cards.nth(index).locator("img")).toHaveAttribute("alt", /\S+/);
  }
  await cards.first().focus();
  await expect(cards.first()).toBeFocused();

  const accessibility = await new AxeBuilder({ page })
    .include("#section-9")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    accessibility.violations.filter((violation) => ["serious", "critical"].includes(violation.impact || "")),
  ).toEqual([]);
  expect(pageErrors).toEqual([]);
});
