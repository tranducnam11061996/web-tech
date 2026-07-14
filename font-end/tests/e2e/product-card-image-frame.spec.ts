import { expect, test, type Locator, type Page } from "@playwright/test";

type ProductSummary = {
  id: number;
  slug: string;
  name: string;
  thumbnail?: string;
  sku?: string;
  price?: number;
  marketPrice?: number;
  brand?: string;
  cardBadges?: unknown[];
};

function capturePageErrors(page: Page) {
  const errors: Error[] = [];
  page.on("pageerror", (error) => errors.push(error));
  return errors;
}

async function getProducts(page: Page, path = "/api/search?q=laptop&limit=24&page=1") {
  const response = await page.request.get(path);
  expect(response.ok()).toBeTruthy();
  const payload = await response.json();
  return (Array.isArray(payload?.data) ? payload.data : []) as ProductSummary[];
}

async function expectSquareContainedFrames(frames: Locator, minimum = 1) {
  await expect
    .poll(() =>
      frames.evaluateAll((elements) =>
        elements.filter((element) => {
          const box = element.getBoundingClientRect();
          return box.width > 0 && box.height > 0;
        }).length,
      ),
    )
    .toBeGreaterThanOrEqual(minimum);
  const results = await frames.evaluateAll((elements) =>
    elements
      .map((element) => {
        const frame = element as HTMLElement;
        const image = frame.querySelector("img");
        const frameStyle = getComputedStyle(frame);
        const imageStyle = image ? getComputedStyle(image) : null;
        const box = frame.getBoundingClientRect();
        return {
          width: box.width,
          height: box.height,
          overflow: frameStyle.overflow,
          objectFit: imageStyle?.objectFit || "",
          objectPosition: imageStyle?.objectPosition || "",
          naturalWidth: image?.naturalWidth || 0,
          naturalHeight: image?.naturalHeight || 0,
        };
      })
      .filter((result) => result.width > 0 && result.height > 0),
  );

  expect(results.length).toBeGreaterThanOrEqual(minimum);
  for (const result of results) {
    expect(result.width).toBeGreaterThan(0);
    expect(Math.abs(result.width - result.height)).toBeLessThanOrEqual(1);
    expect(result.overflow).toBe("hidden");
    expect(result.objectFit).toBe("contain");
    expect(["50% 50%", "center"]).toContain(result.objectPosition);
  }
  return results;
}

function svgImage(width: number, height: number, color: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="${width}" height="${height}" fill="${color}"/></svg>`;
}

test("product cards contain portrait, landscape, and square images in square frames", async ({ page }) => {
  const pageErrors = capturePageErrors(page);
  const products = (await getProducts(page)).filter((product) => product.thumbnail).slice(0, 3);
  expect(products).toHaveLength(3);

  const fixtures = [
    { width: 40, height: 80, color: "#ef4444" },
    { width: 80, height: 40, color: "#22c55e" },
    { width: 80, height: 80, color: "#3b82f6" },
  ];

  for (let index = 0; index < products.length; index += 1) {
    const product = products[index];
    await page.route(String(product.thumbnail), async (route) => {
      const fixture = fixtures[index];
      await route.fulfill({
        status: 200,
        contentType: "image/svg+xml",
        body: svgImage(fixture.width, fixture.height, fixture.color),
      });
    });
  }

  await page.goto("/tim?q=laptop");
  const frames = page.locator("main article .product-card-image-frame").filter({ has: page.locator("img") });
  await expect.poll(() => frames.count()).toBeGreaterThanOrEqual(3);
  await expect
    .poll(() =>
      frames
        .evaluateAll((elements) =>
          elements.slice(0, 3).map((element) => {
            const image = element.querySelector("img") as HTMLImageElement | null;
            return [image?.naturalWidth || 0, image?.naturalHeight || 0];
          }),
        ),
    )
    .toEqual([[40, 80], [80, 40], [80, 80]]);

  const results = await expectSquareContainedFrames(frames, 3);
  expect(results.slice(0, 3).map(({ naturalWidth, naturalHeight }) => [naturalWidth, naturalHeight])).toEqual([
    [40, 80],
    [80, 40],
    [80, 80],
  ]);
  expect(pageErrors).toEqual([]);
});

test("shared product-card surfaces use the canonical square frame", async ({ page }) => {
  test.slow();
  const pageErrors = capturePageErrors(page);
  const surfaces = [
    { path: "/", selector: ".product-card-image-frame" },
    { path: "/linh-kien-may-tinh.html", selector: "main .product-card-image-frame" },
    { path: "/brand/pcm", selector: ".product-card-image-frame" },
  ];

  for (const surface of surfaces) {
    await page.goto(surface.path);
    const frames = page.locator(surface.selector).filter({ has: page.locator("img") });
    await expectSquareContainedFrames(frames, 1);
  }
  expect(pageErrors).toEqual([]);
});

test("product-card frames remain square at supported responsive breakpoints", async ({ page }) => {
  const pageErrors = capturePageErrors(page);
  for (const width of [320, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/linh-kien-may-tinh.html");
    const frames = page.locator("main .product-card-image-frame").filter({ has: page.locator("img") });
    await expectSquareContainedFrames(frames, 1);
  }
  expect(pageErrors).toEqual([]);
});

test("similar and recently viewed cards retain square contained media", async ({ page }) => {
  test.slow();
  const pageErrors = capturePageErrors(page);
  const products = (await getProducts(page, "/api/products?limit=10&page=1"))
    .filter((product) => product.slug && !product.slug.startsWith("product-"));
  test.skip(products.length < 2, "Two public product slugs are required for related-card checks");

  await page.goto("/");
  await page.evaluate((product) => {
    window.localStorage.setItem(
      "hacom.recently-viewed.v1",
      JSON.stringify({
        version: 1,
        items: [{ ...product, viewedAt: new Date().toISOString() }],
      }),
    );
  }, products[0]);
  await page.goto(`/${encodeURIComponent(products[1].slug)}`);
  await page.locator('[data-testid="deferred-recently-viewed"]:visible').scrollIntoViewIfNeeded();

  const recentlyViewed = page.locator("#recently-viewed-grid .product-card-image-frame").filter({ has: page.locator("img") });
  await expectSquareContainedFrames(recentlyViewed, 1);

  const similar = page.locator("#similar-products-grid .product-card-image-frame").filter({ has: page.locator("img") });
  await expectSquareContainedFrames(similar, 1);
  expect(pageErrors).toEqual([]);
});
