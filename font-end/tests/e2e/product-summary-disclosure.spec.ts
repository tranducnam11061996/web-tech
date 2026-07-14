import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const SUMMARY_CASES = [
  {
    slug: "thiet-bi-chuyen-doi-hinh-anh-elgato-4k-s",
    expectedRows: 3,
  },
  {
    slug: "mic-thu-am-elgato-wave-3-black",
    expectedRows: 5,
  },
] as const;

for (const { slug, expectedRows } of SUMMARY_CASES) {
  test(`product summary shows all ${expectedRows} rows without a disclosure`, async ({ page }) => {
    await page.goto(`/${slug}`);

    const summary = page.locator("#sec-specs");
    await expect(summary).toBeVisible();
    await expect(summary.locator("li")).toHaveCount(expectedRows);
    await expect(summary.locator("li:visible")).toHaveCount(expectedRows);
    await expect(summary.locator('button[aria-controls="product-summary-list"]')).toHaveCount(0);
  });
}

test("product summary expands and collapses after the first five rows", async ({ page }) => {
  await page.goto("/pc-amd-ryzen-5-5500x3d-rtx-3050-6gb");

  const summary = page.locator("#sec-specs");
  const rows = summary.locator("li");
  const visibleRows = summary.locator("li:visible");
  const toggle = summary.locator('button[aria-controls="product-summary-list"]');

  await expect(summary).toBeVisible();
  await expect(rows).toHaveCount(8);
  await expect(visibleRows).toHaveCount(5);
  await expect(toggle).toHaveText("Xem thêm thông số kỹ thuật");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");

  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(visibleRows).toHaveCount(8);
  await expect(toggle).toHaveText("Thu gọn thông số");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(toggle).toBeFocused();

  await page.keyboard.press("Space");
  await expect(visibleRows).toHaveCount(5);
  await expect(toggle).toHaveText("Xem thêm thông số kỹ thuật");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();

  const accessibility = await new AxeBuilder({ page })
    .include("#sec-specs")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  const seriousViolations = accessibility.violations.filter((violation) =>
    ["serious", "critical"].includes(violation.impact || ""),
  );
  expect(seriousViolations, JSON.stringify(seriousViolations, null, 2)).toEqual([]);
});
