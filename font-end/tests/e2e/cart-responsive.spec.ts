import { expect, test, type Page } from "@playwright/test";

const cartItems = [
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

async function openCart(page: Page, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.addInitScript((items) => {
    window.localStorage.setItem("hacom.cart.v1", JSON.stringify(items));
  }, cartItems);
  await page.route("**/api/cart/quote", async (route) => {
    const request = route.request().postDataJSON() as {
      items?: Array<{ productId: number; quantity: number }>;
    };
    const quotedItems = (request.items || []).map(({ productId, quantity }) => {
      const item = cartItems.find((candidate) => candidate.productId === productId)!;
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
      body: JSON.stringify({ success: true, data: { items: quotedItems } }),
    });
  });
  await page.goto("/gio-hang", { waitUntil: "domcontentloaded" });
  await expect(page.locator("[data-cart-row]")).toHaveCount(2);
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )).toBe(true);
}

test("cart renders the shared breadcrumb and keeps mobile columns aligned", async ({ page }) => {
  await openCart(page, 390);

  const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
  await expect(breadcrumb.getByRole("link", { name: "Trang chủ" })).toHaveAttribute("href", "/");
  await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText("Giỏ hàng");

  for (const width of [320, 390, 767]) {
    await page.setViewportSize({ width, height: 900 });

    const geometry = await page.locator("[data-cart-layout]").evaluate((layout) => {
      const items = layout.querySelector<HTMLElement>("[data-cart-items]")!.getBoundingClientRect();
      const summary = layout.querySelector<HTMLElement>("[data-cart-summary]")!.getBoundingClientRect();
      const rows = Array.from(layout.querySelectorAll<HTMLElement>("[data-cart-row]"))
        .map((row) => row.getBoundingClientRect());

      return {
        items: { left: items.left, right: items.right, width: items.width },
        summary: { left: summary.left, right: summary.right, width: summary.width },
        rows: rows.map((row) => ({ left: row.left, right: row.right })),
        viewportWidth: window.innerWidth,
      };
    });

    expect(Math.abs(geometry.items.left - geometry.summary.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.items.right - geometry.summary.right)).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.items.width - geometry.summary.width)).toBeLessThanOrEqual(1);
    for (const row of geometry.rows) {
      expect(row.left).toBeGreaterThanOrEqual(geometry.items.left - 1);
      expect(row.right).toBeLessThanOrEqual(geometry.items.right + 1);
      expect(row.right).toBeLessThanOrEqual(geometry.viewportWidth);
    }
    await expectNoHorizontalOverflow(page);
  }
});
