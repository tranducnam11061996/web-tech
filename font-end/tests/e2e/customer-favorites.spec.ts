import { expect, test, type Page, type Route } from "@playwright/test";
import { SHOW_PRODUCT_CARD_FAVORITES } from "../../src/lib/storefrontFeatureFlags";

const customer = {
  id: 9001,
  name: "Favorite Test",
  email: "favorite@example.test",
  phone: "0900000000",
  gender: "",
  birthday: null,
  emailVerified: true,
  defaultAddress: null,
};

async function fulfillJson(route: Route, data: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(data),
  });
}

async function mockCustomer(page: Page, authenticated: boolean) {
  await page.route("**/api/customer/me", async (route) => {
    if (authenticated) {
      await fulfillJson(route, { success: true, data: { user: customer } });
      return;
    }
    await fulfillJson(route, {
      success: false,
      error: { code: "UNAUTHENTICATED", message: "Vui lòng đăng nhập." },
    }, 401);
  });
}

function product(id: number) {
  return {
    id,
    slug: `favorite-product-${id}`,
    name: `Sản phẩm yêu thích ${id}`,
    sku: `FAV-${id}`,
    thumbnail: "",
    price: 10_000_000 + id,
    marketPrice: 11_000_000 + id,
    savings: 1_000_000,
    brand: "TrucTiepGAME",
    cardBadges: [],
  };
}

test("catalog cards temporarily hide favorite controls without favorite API requests", async ({ page }) => {
  await mockCustomer(page, false);
  const favoriteRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/customer/favorites")) {
      favoriteRequests.push(request.url());
    }
  });

  await page.goto("/tim?q=laptop");
  if (!SHOW_PRODUCT_CARD_FAVORITES) {
    await expect(page.locator(".favorite-card-button")).toHaveCount(0);
    expect(favoriteRequests).toEqual([]);
    return;
  }
  const heart = page.getByRole("button", { name: "Thêm sản phẩm vào danh sách yêu thích" }).first();
  await expect(heart).toBeVisible();
  await heart.click();

  await expect(page).toHaveURL(/\/tai-khoan\/dang-nhap\?favoriteProductId=\d+&returnTo=%2Fyeu-thich$/);
  expect(favoriteRequests).toEqual([]);
});

test("authenticated catalog cards do not request status while favorite controls are hidden", async ({ page }) => {
  await mockCustomer(page, true);
  const batches: number[][] = [];
  await page.route("**/api/customer/favorites/status?*", async (route) => {
    const ids = (new URL(route.request().url()).searchParams.get("ids") || "")
      .split(",")
      .filter(Boolean)
      .map(Number);
    batches.push(ids);
    await fulfillJson(route, { success: true, data: { favoriteProductIds: [] } });
  });

  await page.goto("/tim?q=laptop");
  if (!SHOW_PRODUCT_CARD_FAVORITES) {
    await expect(page.locator(".favorite-card-button")).toHaveCount(0);
    expect(batches).toEqual([]);
    return;
  }
  const hearts = page.getByRole("button", { name: "Thêm sản phẩm vào danh sách yêu thích" });
  await expect(hearts.first()).toBeEnabled();
  const heartCount = await hearts.count();
  await expect.poll(() => new Set(batches.flat()).size).toBe(heartCount);

  expect(batches).toHaveLength(1);
  expect(batches[0].length).toBeGreaterThan(1);
  expect(batches[0].length).toBeLessThanOrEqual(100);
  expect(new Set(batches[0]).size).toBe(batches[0].length);
});

test("favorite cards temporarily hide their favorite control", async ({ page }) => {
  await mockCustomer(page, true);
  const discounted = product(200);
  const regular = { ...product(201), marketPrice: product(201).price };
  await page.route("**/api/customer/favorites?*", async (route) => {
    await fulfillJson(route, { success: true, data: { items: [discounted, regular], nextCursor: null } });
  });
  await page.route("**/api/customer/favorites/status?*", async (route) => {
    await fulfillJson(route, { success: true, data: { favoriteProductIds: [] } });
  });

  await page.goto("/yeu-thich");
  await expect(page.getByText(discounted.name, { exact: true })).toBeVisible();
  if (!SHOW_PRODUCT_CARD_FAVORITES) {
    await expect(page.locator(".favorite-card-button")).toHaveCount(0);
    return;
  }

  const layouts = await page.locator("article").evaluateAll((articles) => articles.slice(0, 2).map((article) => {
    const card = article.getBoundingClientRect();
    const control = article.querySelector<HTMLElement>(".favorite-card-button")?.getBoundingClientRect();
    const visual = article.querySelector<HTMLElement>(".favorite-card-button-visual")?.getBoundingClientRect();
    const icon = article.querySelector<SVGElement>(".favorite-card-button-visual svg")?.getBoundingClientRect();
    const badge = Array.from(article.children).find((child) => child.textContent?.trim().startsWith("Giảm"))?.getBoundingClientRect();
    return {
      card,
      control,
      visual,
      icon,
      badge,
      viewportWidth: window.innerWidth,
    };
  }));

  const [discountedLayout, regularLayout] = layouts;
  expect(discountedLayout.control).toBeTruthy();
  expect(discountedLayout.visual).toBeTruthy();
  expect(discountedLayout.icon).toBeTruthy();
  expect(discountedLayout.badge).toBeTruthy();
  const mobile = discountedLayout.viewportWidth <= 767;
  expect(discountedLayout.control!.width).toBe(mobile ? 36 : 40);
  expect(discountedLayout.visual!.width).toBe(mobile ? 29 : 32);
  expect(discountedLayout.icon!.width).toBe(15);
  expect(discountedLayout.card.right - discountedLayout.visual!.right).toBeCloseTo(12, 0);
  expect(discountedLayout.visual!.top - discountedLayout.badge!.bottom).toBeCloseTo(14, 0);
  expect(regularLayout.badge).toBeFalsy();
  expect(regularLayout.card.right - regularLayout.visual!.right).toBeCloseTo(12, 0);
  expect(regularLayout.visual!.top - regularLayout.card.top).toBeCloseTo(57, 0);
  await expect(page.getByRole("button", { name: "Bỏ sản phẩm khỏi danh sách yêu thích" }).first()).toHaveAttribute("aria-pressed", "true");
});

test("product card hover changes only its frame, not its overlays", async ({ page }) => {
  await mockCustomer(page, true);
  const discounted = product(210);
  await page.route("**/api/customer/favorites?*", async (route) => {
    await fulfillJson(route, { success: true, data: { items: [discounted], nextCursor: null } });
  });
  await page.route("**/api/customer/favorites/status?*", async (route) => {
    await fulfillJson(route, { success: true, data: { favoriteProductIds: [] } });
  });

  await page.goto("/yeu-thich");
  const card = page.getByText(discounted.name, { exact: true }).locator("xpath=ancestor::article");
  await expect(card).toBeVisible();

  const measure = () => card.evaluate((article) => {
    const cardBox = article.getBoundingClientRect();
    const relativeBox = (element: Element | undefined) => {
      if (!element) return null;
      const box = element.getBoundingClientRect();
      return {
        top: box.top - cardBox.top,
        right: cardBox.right - box.right,
        bottom: cardBox.bottom - box.bottom,
      };
    };
    const badge = Array.from(article.children).find((child) => child.textContent?.trim().startsWith("Giảm"));
    const cartButton = Array.from(article.querySelectorAll("button")).find((button) => !button.classList.contains("favorite-card-button"));
    const styles = window.getComputedStyle(article);
    return {
      transform: styles.transform,
      borderColor: styles.borderColor,
      boxShadow: styles.boxShadow,
      favorite: relativeBox(article.querySelector(".favorite-card-button") || undefined),
      badge: relativeBox(badge),
      cart: relativeBox(cartButton),
    };
  });

  const before = await measure();
  const cardBox = await card.boundingBox();
  await card.hover({ position: { x: (cardBox?.width || 0) / 2, y: (cardBox?.height || 0) / 2 } });
  await page.waitForTimeout(250);
  const after = await measure();

  expect(before.transform).toBe("none");
  expect(after.transform).toBe("none");
  expect(after.borderColor).not.toBe(before.borderColor);
  expect(after.boxShadow).not.toBe(before.boxShadow);
  expect(after.favorite).toEqual(before.favorite);
  expect(after.badge).toEqual(before.badge);
  expect(after.cart).toEqual(before.cart);
});

test("favorites page supports load more while its card favorite control is hidden", async ({ page }) => {
  await mockCustomer(page, true);
  const firstPage = Array.from({ length: 24 }, (_, index) => product(100 + index));
  const secondPage = [product(124)];
  let listRequests = 0;
  const deleted: number[] = [];

  await page.route("**/api/customer/favorites?*", async (route) => {
    listRequests += 1;
    const cursor = new URL(route.request().url()).searchParams.get("cursor");
    await fulfillJson(route, {
      success: true,
      data: cursor
        ? { items: secondPage, nextCursor: null }
        : { items: firstPage, nextCursor: 100 },
    });
  });
  await page.route("**/api/customer/favorites/*", async (route) => {
    const productId = Number(new URL(route.request().url()).pathname.split("/").at(-1));
    if (route.request().method() === "DELETE") deleted.push(productId);
    await fulfillJson(route, { success: true, data: { productId, favorited: false } });
  });

  await page.goto("/yeu-thich");
  await expect(page.getByRole("heading", { name: "Sản phẩm đã lưu" })).toBeVisible();
  await expect(page.getByText("Sản phẩm yêu thích 100", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Xem thêm" }).click();
  await expect(page.getByText("Sản phẩm yêu thích 124", { exact: true })).toBeVisible();
  expect(listRequests).toBe(2);

  if (!SHOW_PRODUCT_CARD_FAVORITES) {
    await expect(page.locator(".favorite-card-button")).toHaveCount(0);
    expect(deleted).toEqual([]);
    return;
  }

  const firstCard = page.getByText("Sản phẩm yêu thích 100", { exact: true }).locator("xpath=ancestor::article");
  await firstCard.getByRole("button", { name: "Bỏ sản phẩm khỏi danh sách yêu thích" }).click();
  await expect(page.getByText("Sản phẩm yêu thích 100", { exact: true })).toHaveCount(0);
  expect(deleted).toEqual([100]);
});

test("guest favorites page redirects before requesting the list", async ({ page }) => {
  await mockCustomer(page, false);
  let listRequests = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/customer/favorites") listRequests += 1;
  });

  await page.goto("/yeu-thich");
  await expect(page).toHaveURL(/\/tai-khoan\/dang-nhap\?returnTo=%2Fyeu-thich$/);
  expect(listRequests).toBe(0);
});
