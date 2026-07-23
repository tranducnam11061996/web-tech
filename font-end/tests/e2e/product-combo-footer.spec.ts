import { expect, test } from "@playwright/test";

const PRODUCT_PATH = "/pc-ultra-gaming-i7-14700kf-rtx-5070-12gb";

test("combo footer exists only while at least one add-on product is selected", async ({ page }) => {
  await page.route("**/api/combo-cart/quote", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 400));
    await route.continue();
  });
  await page.goto(PRODUCT_PATH);

  const builder = page.locator(".product-bundle-card");
  const footer = builder.locator(".product-bundle-footer");
  await expect(builder).toBeVisible();
  await expect(footer).toHaveCount(0);

  await builder.getByRole("button", { name: "Chọn thêm" }).first().click();
  const dialog = page.getByRole("dialog", { name: "Chọn sản phẩm mua kèm" });
  await expect(dialog).toBeVisible();
  const comboAction = dialog.locator("[data-product-combo-button]").first();
  await comboAction.click();
  await expect(comboAction).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("button", { name: "Đóng" }).click();

  await expect(footer).toBeVisible();
  await expect(footer.getByRole("button", { name: "Mua combo" })).toBeDisabled();
  await expect(footer.getByText("Đang tính...", { exact: true })).toBeVisible();
  await expect(footer.getByRole("button", { name: "Mua combo" })).toBeEnabled();

  await builder.locator(".product-bundle-demo-remove").first().click();
  await expect(footer).toHaveCount(0);
  await expect(builder.getByRole("button", { name: "Mua combo" })).toHaveCount(0);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
  ).toBe(0);
});
