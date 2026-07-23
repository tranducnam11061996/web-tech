import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PRODUCT_PATH = "/pc-ultra-gaming-i7-14700kf-rtx-5070-12gb";

function comboProducts() {
  return Array.from({ length: 12 }, (_, index) => ({
    id: 98000 + index,
    name: `Sản phẩm combo kiểm thử ${index + 1}`,
    sku: `COMBO-${index + 1}`,
    slug: `san-pham-combo-kiem-thu-${index + 1}`,
    thumbnail: "",
    brand: "PCM",
    price: 10_000_000 + index * 100_000,
    marketPrice: 12_000_000 + index * 100_000,
    potentialDiscount: 1_000_000,
    comboUnitPrice: 9_000_000 + index * 100_000,
  }));
}

async function openComboModal(page: import("@playwright/test").Page) {
  const opener = page.locator(".product-bundle-item-btn").first();
  await opener.click();
  const dialog = page.getByRole("dialog", { name: "Chọn sản phẩm mua kèm" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("[data-product-card]")).toHaveCount(12);
  return { dialog, opener };
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/combo-sets/*/groups/*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          products: comboProducts(),
          pagination: {
            currentPage: 1,
            pageSize: 24,
            totalItems: 12,
            totalPages: 1,
          },
        },
      }),
    });
  });
});

test("uses shared cards and toggles Combo without changing the normal cart", async ({ page }) => {
  await page.goto(PRODUCT_PATH);
  const { dialog, opener } = await openComboModal(page);
  const firstCard = dialog.locator("[data-product-card]").first();
  const action = firstCard.locator("[data-product-combo-button]");
  const productLink = firstCard.locator("a").first();

  await expect(dialog.locator(".bundle-grid-item")).toHaveCount(0);
  await expect(dialog.locator("[data-product-cart-button]")).toHaveCount(0);
  await expect(action).toHaveAttribute("aria-pressed", "false");
  await expect(productLink).toHaveAttribute("target", "_blank");
  await expect(productLink).toHaveAttribute("rel", "noopener noreferrer");
  await expect(firstCard.locator("[data-product-sale-price]")).toContainText("9.000.000");
  await expect(firstCard.locator("[data-product-market-price]")).toContainText("10.000.000");

  const accessibility = await new AxeBuilder({ page })
    .include(".bundle-list-modal")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    accessibility.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    ),
  ).toEqual([]);

  const cartBefore = await page.evaluate(() => window.localStorage.getItem("hacom.cart.v1"));
  await action.click();
  const cartAfter = await page.evaluate(() => window.localStorage.getItem("hacom.cart.v1"));
  expect(cartAfter).toBe(cartBefore);
  await expect(action).toHaveAttribute("aria-pressed", "true");
  await expect(firstCard).toHaveAttribute("data-combo-selected", "true");
  await expect(dialog.locator(".bundle-list-selected-summary strong")).toHaveText("1");
  await expect(dialog.getByRole("tab", { selected: true }).locator(".bundle-list-tab-count")).toHaveText("1");

  const popupPromise = page.waitForEvent("popup");
  await productLink.locator(".product-grid-card-title").click();
  const popup = await popupPromise;
  await expect.poll(() => new URL(popup.url()).pathname).toBe("/san-pham-combo-kiem-thu-1");
  await popup.close();

  await action.click();
  await expect(action).toHaveAttribute("aria-pressed", "false");
  await expect(dialog.locator(".bundle-list-selected-summary strong")).toHaveText("0");

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test("keeps the configurator responsive and keyboard-operable", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Viewport matrix runs once in desktop Chromium.");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(PRODUCT_PATH);
  const { dialog } = await openComboModal(page);
  const activeTab = dialog.getByRole("tab", { selected: true });
  const search = dialog.getByRole("textbox", { name: /Tìm sản phẩm trong nhóm/ });

  await search.fill("COMBO");
  await activeTab.press("ArrowRight");
  const nextTab = dialog.getByRole("tab", { selected: true });
  await expect(nextTab).toBeFocused();
  await expect(search).toHaveValue("COMBO");

  const matrix = [
    { width: 390, height: 844, columns: 2 },
    { width: 768, height: 900, columns: 3 },
    { width: 1024, height: 900, columns: 4 },
    { width: 1440, height: 900, columns: 5 },
    { width: 1920, height: 1080, columns: 6 },
  ];

  for (const viewport of matrix) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await expect
      .poll(async () =>
        dialog.locator("[data-product-card]").evaluateAll((cards) => {
          const top = cards[0]?.getBoundingClientRect().top || 0;
          return cards.filter((card) => Math.abs(card.getBoundingClientRect().top - top) < 2).length;
        }),
      )
      .toBe(viewport.columns);

    const geometry = await page.evaluate(() => ({
      horizontalOverflow:
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
      bodyOverflow: window.getComputedStyle(document.body).overflow,
    }));
    expect(geometry.horizontalOverflow).toBe(0);
    expect(geometry.bodyOverflow).toBe("hidden");
  }
});
