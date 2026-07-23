import { expect, test, type Page } from "@playwright/test";

const PRODUCT_PATH = "/pc-ultra-gaming-i7-14700kf-rtx-5070-12gb";
const STICKY_TOP = 110;

async function openProduct(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.goto(PRODUCT_PATH, { waitUntil: "domcontentloaded" });

  const galleryColumn = page.locator(".product-gallery-column:visible").first();
  await expect(galleryColumn).toBeVisible();
  await expect(galleryColumn).toHaveAttribute("data-gallery-sticky", "true");

  return {
    galleryColumn,
    galleryContent: galleryColumn.locator(":scope > .product-gallery-sticky-content"),
    purchaseColumn: page.locator(".product-purchase-column:visible").first(),
  };
}

test("desktop gallery sticks within the purchase-column boundary", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Desktop sticky geometry is verified once");

  for (const viewport of [
    { width: 1200, height: 900 },
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ]) {
    const { galleryColumn, galleryContent, purchaseColumn } = await openProduct(
      page,
      viewport.width,
      viewport.height,
    );

    const metrics = await galleryColumn.evaluate((outer) => {
      const inner = outer.querySelector<HTMLElement>(".product-gallery-sticky-content")!;
      const purchase = outer
        .closest<HTMLElement>(".product-hero-grid")!
        .querySelector<HTMLElement>(".product-purchase-column")!;
      const innerStyle = getComputedStyle(inner);

      return {
        documentTop: outer.getBoundingClientRect().top + window.scrollY,
        galleryHeight: inner.getBoundingClientRect().height,
        purchaseHeight: purchase.getBoundingClientRect().height,
        boundaryHeight: Number.parseFloat(
          outer.style.getPropertyValue("--product-gallery-sticky-boundary-height"),
        ),
        position: innerStyle.position,
        top: Number.parseFloat(innerStyle.top),
      };
    });

    expect(metrics.galleryHeight).toBeLessThan(metrics.purchaseHeight - 1);
    expect(metrics.boundaryHeight).toBeCloseTo(metrics.purchaseHeight, 0);
    expect(metrics.position).toBe("sticky");
    expect(metrics.top).toBe(STICKY_TOP);

    const stickyTravel = metrics.purchaseHeight - metrics.galleryHeight;
    await page.evaluate(
      ({ documentTop, stickyTravel }) => {
        window.scrollTo(0, documentTop - 110 + stickyTravel / 2);
      },
      { documentTop: metrics.documentTop, stickyTravel },
    );
    await expect
      .poll(() => galleryContent.evaluate((element) => element.getBoundingClientRect().top))
      .toBeCloseTo(STICKY_TOP, 0);

    await page.evaluate(
      ({ documentTop, stickyTravel }) => {
        window.scrollTo(0, documentTop - 110 + stickyTravel + 40);
      },
      { documentTop: metrics.documentTop, stickyTravel },
    );
    await expect
      .poll(async () => {
        const [galleryBox, purchaseBox] = await Promise.all([
          galleryContent.boundingBox(),
          purchaseColumn.boundingBox(),
        ]);
        if (!galleryBox || !purchaseBox) return Number.POSITIVE_INFINITY;
        return Math.abs(
          galleryBox.y + galleryBox.height -
          (purchaseBox.y + purchaseBox.height),
        );
      })
      .toBeLessThanOrEqual(1);

    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      ),
    ).toBe(0);
  }
});

test("gallery disables sticky below 1200px and whenever it is not shorter", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Desktop sticky eligibility is verified once");

  const { galleryColumn, galleryContent, purchaseColumn } = await openProduct(page, 1440, 900);

  await page.setViewportSize({ width: 1199, height: 900 });
  await expect(galleryColumn).not.toHaveAttribute("data-gallery-sticky", "true");
  await expect(galleryContent).toHaveCSS("position", "static");
  expect(
    await galleryColumn.evaluate((element) =>
      element.style.getPropertyValue("--product-gallery-sticky-boundary-height"),
    ),
  ).toBe("");

  await page.setViewportSize({ width: 1200, height: 900 });
  await expect(galleryColumn).toHaveAttribute("data-gallery-sticky", "true");

  const purchaseHeight = await purchaseColumn.evaluate(
    (element) => element.getBoundingClientRect().height,
  );
  await galleryContent.evaluate((element, forcedHeight) => {
    (element as HTMLElement).style.minHeight = `${forcedHeight}px`;
  }, purchaseHeight + 20);
  await expect(galleryColumn).not.toHaveAttribute("data-gallery-sticky", "true");
  await expect(galleryContent).toHaveCSS("position", "static");

  await galleryContent.evaluate((element) => {
    (element as HTMLElement).style.removeProperty("min-height");
  });
  await expect(galleryColumn).toHaveAttribute("data-gallery-sticky", "true");

  const stage = galleryContent.locator(".product-gallery-stage");
  const activeThumbnail = galleryContent.locator(".product-gallery-thumbnail[aria-current='true']");
  await expect(activeThumbnail).toHaveAttribute("aria-label", "Xem ảnh 1");
  await stage.focus();
  await page.keyboard.press("ArrowRight");
  await expect(activeThumbnail).toHaveAttribute("aria-label", "Xem ảnh 2");
});

test("gallery utility controls stay above the previous rail arrow", async ({ page }) => {
  await page.goto(PRODUCT_PATH, { waitUntil: "domcontentloaded" });
  await page.addStyleTag({
    content: "nextjs-portal { display: none !important; }",
  });

  const gallery = page.locator(".product-gallery-column:visible").first();
  const container = gallery.locator(".product-gallery-rail-container");
  const rail = container.locator(".product-gallery-rail");
  const utility = container.getByRole("button", { name: "Mở thông số kỹ thuật" });

  await expect(utility).toBeVisible();
  await utility.evaluate((element) => {
    const box = element.getBoundingClientRect();
    window.scrollBy(0, box.top + box.height / 2 - window.innerHeight / 2);
  });
  await rail.evaluate((element) => {
    element.scrollLeft = 4;
    element.dispatchEvent(new Event("scroll", { bubbles: true }));
  });

  const previous = container.locator(".product-gallery-rail-arrow.is-left");
  await expect(previous).toBeAttached();
  await container.hover({ force: true });
  await expect(previous).toBeVisible();

  const overlap = await utility.evaluate((element) => {
    const containerElement = element.closest<HTMLElement>(".product-gallery-rail-container")!;
    const previousElement = containerElement.querySelector<HTMLElement>(
      ".product-gallery-rail-arrow.is-left",
    )!;
    const utilityBox = element.getBoundingClientRect();
    const previousBox = previousElement.getBoundingClientRect();
    const left = Math.max(utilityBox.left, previousBox.left);
    const right = Math.min(utilityBox.right, previousBox.right);
    const top = Math.max(utilityBox.top, previousBox.top);
    const bottom = Math.min(utilityBox.bottom, previousBox.bottom);
    const point = { x: (left + right) / 2, y: (top + bottom) / 2 };
    const hit = document.elementFromPoint(point.x, point.y);

    return {
      point,
      isolation: getComputedStyle(containerElement).isolation,
      utilityZIndex: Number(getComputedStyle(element).zIndex),
      previousZIndex: Number(getComputedStyle(previousElement).zIndex),
      hasOverlap: right > left && bottom > top,
      hitUtility: hit instanceof Element && hit.closest(".product-gallery-utility") === element,
      hitElement:
        hit instanceof Element
          ? `${hit.tagName.toLowerCase()}.${Array.from(hit.classList).join(".")}`
          : null,
    };
  });

  expect(overlap.isolation).toBe("isolate");
  expect(overlap.hasOverlap).toBe(true);
  expect(overlap.utilityZIndex).toBeGreaterThan(overlap.previousZIndex);
  expect(overlap.hitUtility, JSON.stringify(overlap)).toBe(true);

  const scrollBeforeUtilityClick = await rail.evaluate((element) => element.scrollLeft);
  await page.mouse.click(overlap.point.x, overlap.point.y);
  await expect(page.locator("#specModal")).toBeVisible();
  expect(await rail.evaluate((element) => element.scrollLeft)).toBe(scrollBeforeUtilityClick);
  await page.keyboard.press("Escape");

  const next = container.locator(".product-gallery-rail-arrow.is-right");
  const scrollBeforeNextClick = await rail.evaluate((element) => element.scrollLeft);
  await next.click();
  await expect
    .poll(() => rail.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(scrollBeforeNextClick);

  await expect(previous).toBeVisible();
  const scrollBeforePreviousClick = await rail.evaluate((element) => element.scrollLeft);
  await previous.click();
  await expect
    .poll(() => rail.evaluate((element) => element.scrollLeft))
    .toBeLessThan(scrollBeforePreviousClick);

  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    ),
  ).toBe(0);
});
