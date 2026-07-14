import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const ARTICLE_PRODUCT_PATH = "/pc-amd-gaming-ryzen-7-7700-rtx-5060-8gb-oc-white";
const FALLBACK_PRODUCT_PATH = "/pc-amd-ryzen-5-5500x3d-rx-7600-8gb-oc";

test("product with an article keeps the evaluated description disclosure", async ({ page }) => {
  await page.goto(ARTICLE_PRODUCT_PATH);
  await page.locator("#content-sanpham").scrollIntoViewIfNeeded();

  const descriptionColumn = page.locator("#cot-motasanpham");

  await expect(
    descriptionColumn.getByTestId("product-description-content").locator("h2").first(),
  ).toContainText("Đánh giá:");
  await expect(descriptionColumn.locator(".product-description-disclosure")).toBeVisible();
  await expect(descriptionColumn.getByTestId("product-description-fallback")).toHaveCount(0);
});

test("product without an article renders thumbnail and unstyled summary fallback", async ({ page }) => {
  await page.goto(FALLBACK_PRODUCT_PATH);
  await page.locator("#content-sanpham").scrollIntoViewIfNeeded();

  const descriptionColumn = page.locator("#cot-motasanpham");
  const heading = descriptionColumn.getByRole("heading", { level: 2 });
  const content = descriptionColumn.getByTestId("product-description-content");
  const toggle = descriptionColumn.locator(".product-description-toggle");
  const fallback = descriptionColumn.getByTestId("product-description-fallback");
  const summary = fallback.getByTestId("product-description-fallback-summary");

  await expect(descriptionColumn).toBeVisible();
  await expect(heading).toContainText(/PC AMD.*5500X3D/i);
  await expect(heading).not.toContainText("Đánh giá:");
  await expect(descriptionColumn.locator(".product-description-disclosure")).toBeVisible();
  await expect(content).toBeVisible();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(fallback).toBeVisible();
  await expect(fallback.locator(".product-description-fallback-image")).toHaveCount(0);
  await expect(
    fallback.getByRole("img", { name: /PC AMD RYZEN 5 5500X3D/i }),
  ).toBeVisible();
  expect(await summary.locator("li").count()).toBeGreaterThan(0);
  await expect(summary.locator("svg")).toHaveCount(0);

  const layout = await fallback.evaluate((element) => {
    const image = element.querySelector<HTMLImageElement>("img")!;
    const list = element.querySelector<HTMLElement>(".product-description-fallback-summary")!;
    const containerBox = element.getBoundingClientRect();
    const imageBox = image.getBoundingClientRect();
    const listBox = list.getBoundingClientRect();

    return {
      containerLeft: containerBox.left,
      containerWidth: containerBox.width,
      imageWidth: imageBox.width,
      imageBottom: imageBox.bottom,
      listLeft: listBox.left,
      listTop: listBox.top,
    };
  });

  expect(layout.imageWidth).toBeCloseTo(layout.containerWidth, 1);
  expect(layout.listLeft).toBeCloseTo(layout.containerLeft, 1);
  expect(layout.listTop).toBeGreaterThan(layout.imageBottom);

  const isDesktop = (page.viewportSize()?.width || 0) >= 1024;
  const specifications = page.locator("#cot-thongsokythuat");
  const collapsedStickyBoundary = isDesktop
    ? await specifications.evaluate((element) => element.getBoundingClientRect().height)
    : null;

  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  if (isDesktop && collapsedStickyBoundary !== null) {
    await expect
      .poll(() => specifications.evaluate((element) => element.getBoundingClientRect().height))
      .toBeGreaterThan(collapsedStickyBoundary + 50);
    await expect
      .poll(() => page.evaluate(() => {
        const left = document.getElementById("cot-motasanpham");
        const right = document.getElementById("cot-thongsokythuat");
        if (!left || !right) return Number.POSITIVE_INFINITY;
        return Math.abs(
          left.getBoundingClientRect().height - right.getBoundingClientRect().height,
        );
      }))
      .toBeLessThanOrEqual(1);
  }
  await page.keyboard.press("Space");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");

  if (isDesktop) {
    await expect.poll(() => page.locator("#specCol").getAttribute("data-preview-state")).not.toBe("pending");
    await expect
      .poll(() => specifications.evaluate((element) => element.getBoundingClientRect().height))
      .toBeCloseTo(collapsedStickyBoundary!, 0);
  }

  await expect
    .poll(() =>
      summary.evaluate((element) => ({
        list: getComputedStyle(element).listStyleType,
        item: getComputedStyle(element.querySelector("li")!).listStyleType,
      })),
    )
    .toEqual({ list: "none", item: "none" });

  const accessibility = await new AxeBuilder({ page })
    .include("#content-sanpham")
    .analyze();
  const seriousIssues = accessibility.violations.filter((violation) =>
    ["serious", "critical"].includes(violation.impact || ""),
  );

  expect(seriousIssues).toEqual([]);
});
