import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PRODUCT_PATH = "/pc-fps-gaming-i5-10400f-rtx-3050-8gb";

test("managed promotions precede numbered rich-text editor promotions", async ({ page }) => {
  await page.goto(PRODUCT_PATH);

  const promotionSection = page.locator('section[aria-label="Khuyến mãi theo sản phẩm"]');
  const items = promotionSection.locator(".purchase-promo-item");
  await expect(promotionSection).toBeVisible();
  await expect(items).toHaveCount(3);
  await expect(items.locator(".purchase-promo-number")).toHaveText(["1", "2", "3"]);
  await expect(items.nth(0)).toHaveAttribute("data-promotion-source", "managed");
  await expect(items.nth(1)).toHaveAttribute("data-promotion-source", "product-editor");
  await expect(items.nth(2)).toHaveAttribute("data-promotion-source", "product-editor");
  await expect(items.nth(0)).toContainText("Tặng chuột không dây Edra EM611W");
  await expect(items.nth(1)).toContainText("Lưu ý về Hệ điều hành");
  await expect(items.nth(2)).toContainText("Bộ PC này đã áp dụng CTKM SHOCK");
  await expect(items.nth(0).locator(".purchase-promo-text > strong")).toContainText(
    "Tặng chuột không dây Edra EM611W",
  );
  await expect(promotionSection.locator('[data-promotion-source="product-editor"] strong')).toHaveCount(2);
  await expect(promotionSection.getByText("Xem chi tiết")).toHaveCount(0);

  const hasHorizontalOverflow = await page.evaluate(() =>
    document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);

  const accessibility = await new AxeBuilder({ page })
    .include('section[aria-label="Khuyến mãi theo sản phẩm"]')
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  const seriousViolations = accessibility.violations.filter((violation) =>
    ["serious", "critical"].includes(violation.impact || ""),
  );
  expect(seriousViolations, JSON.stringify(seriousViolations, null, 2)).toEqual([]);
});
