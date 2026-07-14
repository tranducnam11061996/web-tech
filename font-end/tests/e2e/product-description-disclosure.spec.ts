import { expect, test } from "@playwright/test";

test("product description keeps a visible preview and expands without hiding its content", async ({ page }) => {
  await page.goto("/pc-amd-gaming-ryzen-7-7700-rtx-5060-8gb-oc-white");

  const description = page.locator("#cot-motasanpham");
  const content = description.getByTestId("product-description-content");
  const toggle = description.locator(".product-description-toggle");

  await expect(description.getByRole("heading", { name: /Đánh giá:/ })).toBeVisible();
  await expect(content).toBeVisible();
  await expect(toggle).toHaveText("Xem thêm");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");

  const collapsedHeight = await content.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
  }));
  expect(collapsedHeight.clientHeight).toBeGreaterThan(0);
  expect(collapsedHeight.scrollHeight).toBeGreaterThan(collapsedHeight.clientHeight);

  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(toggle).toHaveText("Thu gọn");
  await expect.poll(() => content.evaluate((element) => element.clientHeight)).toBeGreaterThan(collapsedHeight.clientHeight);
  await expect(toggle).toBeFocused();

  await page.keyboard.press("Space");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toHaveText("Xem thêm");
  await expect(toggle).toBeFocused();
});
