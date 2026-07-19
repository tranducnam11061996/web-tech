import { expect, test } from "@playwright/test";

test("Section 4 shows exactly two complete category cards on mobile", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Responsive geometry is verified once.");

  for (const width of [360, 390, 428, 639, 640]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");

    const section = page.locator("#section-4");
    const track = section.locator(".carousel-track");
    await expect(section).toBeVisible();
    await section.scrollIntoViewIfNeeded();
    await expect.poll(() => track.evaluate((element) => ({
      transform: (element as HTMLElement).style.transform,
      visibleOriginalIndex: (element.children[1] as HTMLElement | undefined)?.dataset.originalIndex || null,
    }))).toMatchObject({
      transform: expect.stringContaining("translateX(-"),
      visibleOriginalIndex: expect.any(String),
    });
    await section.locator("#carouselContainer").hover();
    await page.waitForTimeout(450);

    if (width < 640) {
      const geometry = await track.evaluate((element) => {
        const first = element.children[1] as HTMLElement;
        const second = element.children[2] as HTMLElement;
        const third = element.children[3] as HTMLElement;
        return {
          firstX: Math.round(first.getBoundingClientRect().x),
          cardWidth: Math.round(first.getBoundingClientRect().width * 100) / 100,
          secondRight: Math.round(second.getBoundingClientRect().right),
          thirdX: Math.round(third.getBoundingClientRect().x),
        };
      });

      expect(geometry.firstX).toBe(12);
      expect(geometry.cardWidth).toBe((width - 40) / 2);
      expect(geometry.secondRight).toBe(width - 12);
      expect(geometry.thirdX).toBeGreaterThanOrEqual(width);
    } else {
      await expect(section.locator(".section-4-carousel-item").first()).toHaveCSS("width", "160px");
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }
});
