import { expect, test, type Page } from "@playwright/test";

const checkoutItems = [
  {
    productId: 12969,
    slug: "pc-amd-gaming-ryzen-7-7700-rtx-5060-8gb-oc-white",
    name: "PC AMD GAMING RYZEN 7 7700 - RTX 5060 8GB OC WHITE",
    sku: "12969",
    thumbnail: "",
    price: 27_280_000,
    marketPrice: 28_990_000,
    quantity: 3,
    selected: true,
    savedForLater: false,
    addedAt: "2026-07-24T00:00:00.000Z",
  },
  {
    productId: 13508,
    slug: "pc-gaming-luxury-ultra-7-270k-plus-rtx-5070-ti",
    name: "PC GAMING LUXURY ULTRA 7 270K PLUS - RTX 5070 TI 16GB OC BLACK",
    sku: "13508",
    thumbnail: "",
    price: 63_980_000,
    marketPrice: 69_990_000,
    quantity: 1,
    selected: true,
    savedForLater: false,
    addedAt: "2026-07-24T00:01:00.000Z",
  },
];

async function openCheckout(page: Page, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.addInitScript((items) => {
    window.localStorage.setItem("hacom.cart.v1", JSON.stringify(items));
  }, checkoutItems);
  await page.route("**/api/customer/me", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        error: { code: "UNAUTHENTICATED", message: "Unauthenticated" },
      }),
    });
  });
  await page.route("**/api/cart/quote", async (route) => {
    const request = route.request().postDataJSON() as {
      items?: Array<{ productId: number; quantity: number }>;
    };
    const quotedItems = (request.items || []).map(({ productId, quantity }) => {
      const item = checkoutItems.find((candidate) => candidate.productId === productId)!;
      return {
        ...item,
        quantity,
        available: true,
        reason: null,
        lineTotal: item.price * quantity,
        lineMarketTotal: item.marketPrice * quantity,
      };
    });

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          items: quotedItems,
          totals: { voucherDiscount: 0, total: 145_820_000 },
          voucher: null,
        },
      }),
    });
  });
  await page.goto("/thanh-toan", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-checkout-summary]")).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )).toBe(true);
}

test("checkout details and summary use the same mobile width", async ({ page }) => {
  await openCheckout(page, 390);

  for (const width of [320, 390, 767]) {
    await page.setViewportSize({ width, height: 900 });

    const geometry = await page.locator("[data-checkout-layout]").evaluate((layout) => {
      const details = layout.querySelector<HTMLElement>("[data-checkout-details]")!.getBoundingClientRect();
      const summary = layout.querySelector<HTMLElement>("[data-checkout-summary]")!.getBoundingClientRect();
      return {
        details: { left: details.left, right: details.right, width: details.width },
        summary: { left: summary.left, right: summary.right, width: summary.width },
        viewportWidth: window.innerWidth,
      };
    });

    expect(Math.abs(geometry.details.left - geometry.summary.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.details.right - geometry.summary.right)).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.details.width - geometry.summary.width)).toBeLessThanOrEqual(1);
    expect(geometry.summary.left).toBeGreaterThanOrEqual(15);
    expect(geometry.summary.right).toBeLessThanOrEqual(geometry.viewportWidth - 15);
    await expectNoHorizontalOverflow(page);
  }
});
