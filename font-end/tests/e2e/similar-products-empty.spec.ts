import { expect, test } from "@playwright/test";

test("product detail omits the similar-products section when no recommendations are available", async ({ page }) => {
  await page.goto("/lenovo-loq-essential-15arp10e-83s0000dvn");

  await expect(page.locator('section[aria-labelledby="similar-products-title"]')).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Sản phẩm tương tự" })).toHaveCount(0);
  await expect(page.locator("#similar-products-grid")).toHaveCount(0);
});
