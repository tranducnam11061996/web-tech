import { expect, test, type Locator, type Page } from "@playwright/test";

const AUTO_SLIDE_DELAY_MS = 3000;

async function openHomepage(page: Page) {
  const browserCollectionRequests: string[] = [];
  const pageErrors: Error[] = [];

  page.on("request", (request) => {
    const url = request.url();
    if (url.includes("/api/collections") || url.includes("collectionId=896")) {
      browserCollectionRequests.push(url);
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error));

  await page.goto("/");
  const section = page.locator("#section-8");
  await expect(section).toBeVisible();
  await section.scrollIntoViewIfNeeded();

  const track = section.locator(".carousel-track");
  await expect.poll(() => track.evaluate((element) => ({
    transform: (element as HTMLElement).style.transform,
    visibleOriginalIndex: (element.children[1] as HTMLElement | undefined)?.dataset.originalIndex,
  }))).toMatchObject({
    transform: expect.stringContaining("translateX(-"),
    visibleOriginalIndex: "0",
  });

  return { browserCollectionRequests, pageErrors, section, track };
}

async function visibleOriginalIndex(track: Locator) {
  return track.evaluate((element) => (
    (element.children[1] as HTMLElement | undefined)?.dataset.originalIndex || null
  ));
}

async function carouselGeometry(section: Locator) {
  return section.locator(".carousel-wrapper").evaluate((wrapper) => {
    const track = wrapper.querySelector<HTMLElement>(".carousel-track");
    const card = wrapper.querySelector<HTMLElement>(".product-card");
    const image = wrapper.querySelector<HTMLElement>(".product-img");
    if (!track || !card || !image) return null;
    const trackStyle = getComputedStyle(track);
    const cardBox = card.getBoundingClientRect();
    const imageBox = image.getBoundingClientRect();
    return {
      cardWidth: Math.round(cardBox.width * 100) / 100,
      gap: trackStyle.columnGap,
      imageRatio: Math.round((imageBox.width / imageBox.height) * 1000) / 1000,
      paddingLeft: trackStyle.paddingLeft,
      paddingRight: trackStyle.paddingRight,
    };
  });
}

test("homepage carousel script initializes every track and preserves Section 8 geometry", async ({ page }, testInfo) => {
  const { browserCollectionRequests, pageErrors, section, track } = await openHomepage(page);
  const initialGeometry = await carouselGeometry(section);

  const initializedTracks = await page.locator(".carousel-track").evaluateAll((tracks) => tracks
    .filter((candidate) => candidate.children.length > 0 && candidate.id !== "heroTrack")
    .map((candidate) => ({
      hasBufferCard: Boolean((candidate.children[1] as HTMLElement | undefined)?.dataset.originalIndex),
      transform: (candidate as HTMLElement).style.transform,
    })));

  expect(initializedTracks.length).toBeGreaterThan(1);
  expect(initializedTracks.every((candidate) => candidate.hasBufferCard)).toBe(true);
  expect(initializedTracks.every((candidate) => candidate.transform.startsWith("translateX(-"))).toBe(true);

  const initialVisibleIndex = await visibleOriginalIndex(track);
  if (testInfo.project.name === "desktop-chromium") {
    const wrapper = section.locator(".carousel-wrapper");
    await wrapper.hover();
    await page.waitForTimeout(AUTO_SLIDE_DELAY_MS + 350);
    expect(await visibleOriginalIndex(track)).toBe(initialVisibleIndex);

    await page.mouse.move(0, 0);
  }

  await expect.poll(() => visibleOriginalIndex(track), {
    timeout: AUTO_SLIDE_DELAY_MS + 1800,
  }).not.toBe(initialVisibleIndex);

  expect(await carouselGeometry(section)).toEqual(initialGeometry);
  expect(browserCollectionRequests).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("automatic slide keeps the incoming card stationary during the DOM reset", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Frame-level motion is sampled on desktop");

  const { section } = await openHomepage(page);
  const wrapper = section.locator(".carousel-wrapper");
  await wrapper.hover();
  await page.waitForTimeout(100);
  await page.mouse.move(0, 0);

  const samples = await section.locator(".carousel-track").evaluate(async (track) => {
    const incomingCard = track.children[2] as HTMLElement | undefined;
    if (!incomingCard) return [];

    await new Promise((resolve) => window.setTimeout(resolve, 2700));
    return new Promise<number[]>((resolve) => {
      const positions: number[] = [];
      const startedAt = performance.now();
      const sample = (now: number) => {
        positions.push(incomingCard.getBoundingClientRect().left);
        if (now - startedAt < 900) window.requestAnimationFrame(sample);
        else resolve(positions);
      };
      window.requestAnimationFrame(sample);
    });
  });

  expect(samples.length).toBeGreaterThan(20);
  expect(Math.max(...samples) - Math.min(...samples)).toBeGreaterThan(50);
  let minimum = samples[0];
  let maximumRebound = 0;
  for (const position of samples) {
    minimum = Math.min(minimum, position);
    maximumRebound = Math.max(maximumRebound, position - minimum);
  }
  expect(maximumRebound).toBeLessThanOrEqual(2);
});

test("mouse drag and touch swipe use the same twenty-percent threshold as index.html", async ({ page }, testInfo) => {
  const { section, track } = await openHomepage(page);
  const wrapper = section.locator(".carousel-wrapper");
  const box = await wrapper.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;

  const cardStep = await track.evaluate((element) => {
    const firstCard = element.children[0] as HTMLElement;
    const style = getComputedStyle(element);
    return firstCard.offsetWidth + (parseInt(style.gap) || parseInt(style.columnGap) || 16);
  });
  const startX = box.x + Math.min(box.width - 40, cardStep + 40);
  const startY = box.y + box.height / 2;
  const initialVisibleIndex = await visibleOriginalIndex(track);

  if (testInfo.project.name === "mobile-chromium") {
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: startX, y: startY }],
    });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: startX - cardStep * 0.35, y: startY }],
    });
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } else {
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX - cardStep * 0.35, startY, { steps: 5 });
    await page.mouse.up();
  }

  await expect.poll(() => visibleOriginalIndex(track), { timeout: 1400 }).not.toBe(initialVisibleIndex);
  const afterSwipeIndex = await visibleOriginalIndex(track);

  if (testInfo.project.name === "mobile-chromium") {
    const session = await page.context().newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: startX, y: startY }],
    });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: startX - 10, y: startY }],
    });
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } else {
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX - 10, startY, { steps: 2 });
    await page.mouse.up();
  }

  await page.waitForTimeout(500);
  expect(await visibleOriginalIndex(track)).toBe(afterSwipeIndex);
});

test("previous and next controls plus indicator dots follow the index.html DOM ordering", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Button and dot wiring is exercised once on desktop");
  const { section, track } = await openHomepage(page);

  const previousButton = section.getByRole("button", { name: "Sản phẩm trước" });
  const nextButton = section.getByRole("button", { name: "Sản phẩm tiếp theo" });

  await previousButton.click();
  await expect.poll(() => visibleOriginalIndex(track), { timeout: 1400 }).toBe("9");
  await nextButton.click();
  await expect.poll(() => visibleOriginalIndex(track), { timeout: 1400 }).toBe("0");

  const promoSection = page.locator("#section-16");
  const promoTrack = promoSection.locator(".carousel-track");
  const secondDot = promoSection.locator(".indicator-dot").nth(1);
  await secondDot.click();

  await expect(secondDot).toHaveClass(/active/);
  await expect.poll(() => visibleOriginalIndex(promoTrack)).toBe("3");
});

test("raw script init is idempotent and clone cleanup prevents duplicate buffers", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Lifecycle fixture is exercised once on desktop");
  await openHomepage(page);

  const result = await page.evaluate(async () => {
    const controller = window.HacomHomepageCarousel;
    if (!controller) return null;

    const fixture = document.createElement("section");
    fixture.id = "carousel-lifecycle-fixture";
    fixture.innerHTML = `
      <div id="carouselContainer" style="width: 1000px; overflow: hidden">
        <div class="carousel-track" style="display: flex; gap: 16px">
          <div style="width: 100px; flex: 0 0 100px">A</div>
          <div style="width: 100px; flex: 0 0 100px">B</div>
        </div>
      </div>`;
    document.body.appendChild(fixture);

    controller.init(fixture);
    await new Promise((resolve) => window.setTimeout(resolve, 150));
    const track = fixture.querySelector(".carousel-track")!;
    const first = {
      children: track.children.length,
      clones: track.querySelectorAll(".cloned-item").length,
    };

    controller.init(fixture);
    await new Promise((resolve) => window.setTimeout(resolve, 150));
    const second = {
      children: track.children.length,
      clones: track.querySelectorAll(".cloned-item").length,
    };

    controller.destroy();
    const afterDestroy = {
      children: track.children.length,
      clones: track.querySelectorAll(".cloned-item").length,
      transform: (track as HTMLElement).style.transform,
    };
    fixture.remove();
    return { first, second, afterDestroy };
  });

  expect(result).toEqual({
    first: { children: 4, clones: 2 },
    second: { children: 4, clones: 2 },
    afterDestroy: { children: 2, clones: 0, transform: "" },
  });
});
