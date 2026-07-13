import { expect, test, type Page } from "@playwright/test";

const categoryPath = "/linh-kien-may-tinh.html";

function capturePageErrors(page: Page) {
  const errors: Error[] = [];
  page.on("pageerror", (error) => errors.push(error));
  return errors;
}

async function expectLoadedProductImagesToBeClear(page: Page) {
  const images = page.locator("main article img");
  await expect(images.first()).toBeAttached();
  await expect
    .poll(async () => {
      return images.evaluateAll((elements) =>
        elements.filter((element) => {
          const image = element as HTMLImageElement;
          return image.complete && image.naturalWidth > 0;
        }).length,
      );
    })
    .toBeGreaterThan(0);

  await expect
    .poll(async () => {
      return images.evaluateAll((elements) =>
        elements.filter((element) => {
          const image = element as HTMLImageElement;
          if (!image.complete || image.naturalWidth <= 0) return false;
          return ["blur-sm", "blur-md", "opacity-60", "scale-95"].some((className) =>
            image.classList.contains(className),
          );
        }).length,
      );
    })
    .toBe(0);
}

test("category pagination is URL-driven, reloadable, and resets for filters", async ({ page }) => {
  const pageErrors = capturePageErrors(page);
  await page.goto(categoryPath);

  const pageTwo = page.getByRole("button", { name: "Đến trang 2" });
  await expect(pageTwo).toBeVisible();

  const responsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === "/api/products" && url.searchParams.get("page") === "2";
  });
  await pageTwo.click();
  await expect(page).toHaveURL(/linh-kien-may-tinh\.html\?page=2$/);
  await expect(page.getByRole("button", { name: "Đến trang 2" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect((await responsePromise).ok()).toBeTruthy();
  await expect(page.getByRole("heading", { name: "Chưa thể tải nội dung" })).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole("button", { name: "Đến trang 2" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`${categoryPath.replace(".", "\\.")}$`));
  await page.goForward();
  await expect(page).toHaveURL(/linh-kien-may-tinh\.html\?page=2$/);

  await page.locator("select").first().selectOption("price_asc");
  await expect(page).toHaveURL(/linh-kien-may-tinh\.html\?sort=price_asc$/);
  expect(pageErrors).toEqual([]);
});

test("category pagination failure stays local and retry succeeds", async ({ page }) => {
  const pageErrors = capturePageErrors(page);
  let failedOnce = false;

  await page.route("**/api/products?*", async (route) => {
    const url = new URL(route.request().url());
    if (url.searchParams.get("page") === "2" && !failedOnce) {
      failedOnce = true;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ success: false, message: "Dịch vụ tạm thời gián đoạn" }),
      });
      return;
    }
    await route.continue();
  });

  await page.goto(categoryPath);
  await page.getByRole("button", { name: "Đến trang 2" }).click();
  await expect(page.getByRole("heading", { name: "Không thể tải sản phẩm" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Chưa thể tải nội dung" })).toHaveCount(0);

  await page.getByRole("button", { name: "Thử lại" }).click();
  await expect(page.getByRole("button", { name: "Đến trang 2" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByRole("heading", { name: "Không thể tải sản phẩm" })).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});

test("search pagination uses the URL and survives a direct page-two load", async ({ page }) => {
  const pageErrors = capturePageErrors(page);
  await page.goto("/tim?q=case");

  const responsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === "/api/search" && url.searchParams.get("page") === "2";
  });
  await page.getByRole("button", { name: "Đến trang 2" }).click();
  await expect(page).toHaveURL(/\/tim\?q=case&page=2$/);
  expect((await responsePromise).ok()).toBeTruthy();
  await expect(page.getByRole("button", { name: "Đến trang 2" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await page.reload();
  await expect(page.getByRole("button", { name: "Đến trang 2" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(pageErrors).toEqual([]);
});

test("invalid and out-of-range category pages are canonicalized", async ({ page }) => {
  await page.goto(`${categoryPath}?page=invalid`);
  await expect(page).toHaveURL(new RegExp(`${categoryPath.replace(".", "\\.")}$`));

  await page.goto(`${categoryPath}?page=1000`);
  await expect(page).toHaveURL(/linh-kien-may-tinh\.html\?page=65$/);
  await expect(page.getByRole("button", { name: "Đến trang 65" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("cached progressive images become clear after hard refresh and search pagination", async ({ page }) => {
  test.slow();
  const pageErrors = capturePageErrors(page);
  const hydrationErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /hydration/i.test(message.text())) {
      hydrationErrors.push(message.text());
    }
  });

  await page.goto("/tim?q=laptop", { waitUntil: "networkidle" });
  await expectLoadedProductImagesToBeClear(page);

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 6 });
  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await page.reload({ waitUntil: "domcontentloaded" });
      await expectLoadedProductImagesToBeClear(page);
    }
  } finally {
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  }

  await page.getByRole("button", { name: "Đến trang 2" }).click();
  await expect(page).toHaveURL(/\/tim\?q=laptop&page=2$/);
  await expectLoadedProductImagesToBeClear(page);
  expect(pageErrors).toEqual([]);
  expect(hydrationErrors).toEqual([]);
});

test("a failed progressive image switches once to a clear placeholder", async ({ page }) => {
  const response = await page.request.get("/api/search?q=laptop&limit=24&page=1");
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  const thumbnail = String(payload?.data?.[0]?.thumbnail || "");
  expect(thumbnail).toMatch(/^https:\/\//);
  const thumbnailPath = new URL(thumbnail).pathname;

  let failedRequests = 0;
  await page.context().route("**/*", async (route) => {
    const request = route.request();
    if (
      request.resourceType() !== "image" ||
      new URL(request.url()).pathname !== thumbnailPath
    ) {
      await route.continue();
      return;
    }
    failedRequests += 1;
    await route.fulfill({ status: 404, body: "not found" });
  });

  await page.goto("/tim?q=laptop");
  const firstImage = page.locator("main article img").first();
  await expect(firstImage).toHaveAttribute("src", /^data:image\/svg\+xml/);
  await expect(firstImage).toHaveClass(/opacity-100/);
  await expect(firstImage).toHaveClass(/blur-0/);
  expect(failedRequests).toBe(1);
});
