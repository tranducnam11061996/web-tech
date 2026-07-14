import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PRODUCT_PATH = "/pc-workstation-3d-render-edit-video-i7-14700kf-rtx-5070-ti-16gb-oc";

test("desktop specifications follow the collapsed description height only when needed", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === "mobile-chromium", "Desktop layout behavior");

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(PRODUCT_PATH);
  await page.waitForSelector("#content-sanpham", { state: "attached" });
  await page.evaluate(() => document.getElementById("content-sanpham")?.scrollIntoView());

  const description = page.locator("#cot-motasanpham");
  const specifications = page.locator("#cot-thongsokythuat");
  const preview = page.locator("#specCol");
  const naturalContent = preview.locator("[data-specifications-natural-content]");
  const openButton = preview.getByRole("button", { name: "Xem thêm cấu hình chi tiết" });

  await expect(preview).toHaveAttribute("data-preview-state", "clipped");
  const clippedMetrics = await page.evaluate(() => {
    const left = document.getElementById("cot-motasanpham");
    const right = document.getElementById("cot-thongsokythuat");
    const natural = document.querySelector<HTMLElement>("[data-specifications-natural-content]");
    if (!left || !right || !natural) throw new Error("Missing product-detail columns");
    return {
      left: left.getBoundingClientRect().height,
      right: right.getBoundingClientRect().height,
      preview: document.getElementById("specCol")!.getBoundingClientRect().height,
      natural: natural.getBoundingClientRect().height,
    };
  });

  expect(clippedMetrics.natural).toBeGreaterThan(clippedMetrics.left + 1);
  expect(Math.abs(clippedMetrics.preview - clippedMetrics.left)).toBeLessThanOrEqual(1);
  expect(clippedMetrics.right).toBeGreaterThanOrEqual(clippedMetrics.preview + 23);
  await expect(preview).toHaveCSS("overflow", "hidden");
  await expect(openButton).toBeVisible();

  const stickyContainer = specifications.locator(":scope > div");
  await expect(stickyContainer).toHaveCSS("position", "sticky");
  const expectedStickyTop = 110;
  await expect
    .poll(() => stickyContainer.evaluate((element) => Number.parseFloat(getComputedStyle(element).top)))
    .toBeCloseTo(expectedStickyTop, 0);
  await expect
    .poll(() =>
      specifications.evaluate((element) =>
        Number.parseFloat(
          getComputedStyle(element).getPropertyValue(
            "--product-specifications-sticky-boundary-height",
          ),
        ),
      ),
    )
    .toBeGreaterThan(clippedMetrics.preview);
  const stickyTop = await stickyContainer.evaluate((element, expectedTop) => {
    window.scrollBy(0, Math.max(0, element.getBoundingClientRect().top - expectedTop));
    return element.getBoundingClientRect().top;
  }, expectedStickyTop);
  expect(stickyTop).toBeLessThanOrEqual(expectedStickyTop + 1);
  await openButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#specModal")).toHaveAttribute("open", "");
  await page.keyboard.press("Escape");
  await expect(page.locator("#specModal")).not.toHaveAttribute("open", "");
  await expect(openButton).toBeFocused();

  const accessibility = await new AxeBuilder({ page })
    .include("#content-sanpham")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  const seriousViolations = accessibility.violations.filter((violation) =>
    ["serious", "critical"].includes(violation.impact || ""),
  );
  expect(seriousViolations, JSON.stringify(seriousViolations, null, 2)).toEqual([]);

  const collapsedBoundaryHeight = clippedMetrics.right;
  const collapsedPreviewHeight = clippedMetrics.preview;
  const descriptionToggle = description.locator(".product-description-toggle");
  await descriptionToggle.click();
  await expect(descriptionToggle).toHaveAttribute("aria-expanded", "true");
  await expect(preview).toHaveAttribute("data-preview-state", "clipped");
  await expect
    .poll(() => description.evaluate((element) => element.getBoundingClientRect().height))
    .toBeGreaterThan(clippedMetrics.left + 500);

  const expandedMetrics = await page.evaluate(() => {
    const left = document.getElementById("cot-motasanpham");
    const right = document.getElementById("cot-thongsokythuat");
    const sticky = right?.firstElementChild;
    const preview = document.getElementById("specCol");
    if (!left || !right || !sticky || !preview) throw new Error("Missing expanded columns");
    return {
      columnDocumentTop: right.getBoundingClientRect().top + window.scrollY,
      left: left.getBoundingClientRect().height,
      right: right.getBoundingClientRect().height,
      sticky: sticky.getBoundingClientRect().height,
      preview: preview.getBoundingClientRect().height,
    };
  });

  expect(expandedMetrics.right).toBeGreaterThan(collapsedBoundaryHeight + 500);
  expect(Math.abs(expandedMetrics.right - expandedMetrics.left)).toBeLessThanOrEqual(1);
  expect(Math.abs(expandedMetrics.preview - collapsedPreviewHeight)).toBeLessThanOrEqual(1);

  const stickyTravel = expandedMetrics.right - expandedMetrics.sticky - expectedStickyTop;
  expect(stickyTravel).toBeGreaterThan(720);
  for (const offset of [120, 720]) {
    await page.evaluate(
      ({ top, offset }) => window.scrollTo(0, top + offset),
      { top: expandedMetrics.columnDocumentTop, offset },
    );
    await expect
      .poll(() => stickyContainer.evaluate((element) => element.getBoundingClientRect().top))
      .toBeCloseTo(expectedStickyTop, 0);
  }

  await page.evaluate(
    ({ top, offset }) => window.scrollTo(0, top + offset),
    { top: expandedMetrics.columnDocumentTop, offset: stickyTravel + 40 },
  );
  await expect
    .poll(() => stickyContainer.evaluate((element) => element.getBoundingClientRect().top))
    .toBeLessThan(expectedStickyTop - 1);

  await page.evaluate((top) => window.scrollTo(0, top), expandedMetrics.columnDocumentTop);
  await descriptionToggle.click();
  await expect(descriptionToggle).toHaveAttribute("aria-expanded", "false");
  await expect
    .poll(() => specifications.evaluate((element) => element.getBoundingClientRect().height))
    .toBeCloseTo(collapsedBoundaryHeight, 0);

  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect(preview).toHaveAttribute("data-preview-state", "full");
  await expect(preview).toHaveCSS("max-height", "none");
  await expect(preview).toHaveCSS("overflow", "visible");
  await expect(openButton).toBeHidden();

  const fullMetrics = await Promise.all([
    description.evaluate((element) => element.getBoundingClientRect().height),
    preview.evaluate((element) => element.getBoundingClientRect().height),
    naturalContent.evaluate((element) => element.getBoundingClientRect().height),
  ]);
  expect(fullMetrics[2]).toBeLessThanOrEqual(fullMetrics[0] + 1);
  expect(Math.abs(fullMetrics[1] - fullMetrics[2])).toBeLessThanOrEqual(1);
});

test("mobile specifications keep the existing 66vh modal preview", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium", "Mobile regression behavior");

  await page.setViewportSize({ width: 412, height: 915 });
  await page.goto(PRODUCT_PATH);
  await page.waitForSelector("#content-sanpham", { state: "attached" });
  await page.evaluate(() => document.getElementById("content-sanpham")?.scrollIntoView());

  const preview = page.locator("#specCol");
  const openButton = preview.getByRole("button", { name: "Xem thêm cấu hình chi tiết" });
  const metrics = await preview.evaluate((element) => ({
    height: element.getBoundingClientRect().height,
    naturalHeight: element.scrollHeight,
    viewportHeight: window.innerHeight,
  }));

  expect(metrics.naturalHeight).toBeGreaterThan(metrics.height);
  expect(Math.abs(metrics.height - metrics.viewportHeight * 0.66)).toBeLessThanOrEqual(1);
  await expect(preview).toHaveCSS("overflow", "hidden");
  await expect(openButton).toBeVisible();
});
