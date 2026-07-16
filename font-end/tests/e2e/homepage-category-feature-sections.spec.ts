import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function openHomepage(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const section = page.locator('[data-category-feature-section]').first();
  await expect(section).toBeVisible();
  await section.scrollIntoViewIfNeeded();
  return {
    root: section.locator('xpath=ancestor::section[1]'),
    section,
    grid: section.locator('[data-category-feature-grid]'),
    feature: section.locator('[data-category-feature-box]'),
    products: section.locator('[data-product-card]'),
  };
}

async function waitForSection11Carousel(section: ReturnType<Page['locator']>) {
  const carousel = section.locator('[data-section11-carousel]');
  const track = section.locator('[data-section11-carousel-track]');
  await expect(carousel).toHaveAttribute('data-homepage-carousel-active', 'true');
  await expect.poll(() => track.evaluate((node) => (node as HTMLElement).style.transform)).toContain('translateX(-');
  return { carousel, track };
}

async function visibleOriginalIndex(track: ReturnType<Page['locator']>) {
  return track.evaluate((node) => (
    (node.children[1] as HTMLElement | undefined)?.dataset.originalIndex || null
  ));
}

test('desktop category feature section renders a half-width hero plus nine ordered products', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop six-column geometry is verified once');
  const { section, grid, feature, products } = await openHomepage(page);

  await expect(products).toHaveCount(9);
  await expect(feature).toHaveAttribute('target', '_blank');
  await expect(section).toHaveAttribute('style', /background-color/i);
  await expect(section.locator('[data-category-feature-title]')).not.toContainText(/Deals/i);
  await expect(section.getByRole('link', { name: 'Xem tất cả' })).toBeVisible();
  await expect(section.getByRole('link', { name: 'View All' })).toHaveCount(0);
  await expect(feature.locator('span.h-px[aria-hidden="true"]')).toHaveCount(0);

  const subheading = feature.locator('[data-feature-subheading]');
  const headline = feature.locator('[data-feature-headline]');
  if (await subheading.count()) {
    expect(await feature.evaluate((node) => {
      const subtitle = node.querySelector('[data-feature-subheading]');
      const title = node.querySelector('[data-feature-headline]');
      return Boolean(subtitle && title && (subtitle.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING));
    })).toBe(true);
  }
  await expect(headline).toHaveCSS('white-space', 'pre-line');
  expect(Number.parseFloat(await headline.evaluate((node) => getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(48);
  const featureCta = feature.locator('[data-feature-cta]');
  await expect(featureCta).toBeVisible();
  expect(Number.parseFloat(await featureCta.evaluate((node) => getComputedStyle(node).fontSize))).toBeGreaterThanOrEqual(14);

  const gridBox = await grid.boundingBox();
  const featureBox = await feature.boundingBox();
  const productBoxes = await products.evaluateAll((nodes) => nodes.map((node) => {
    const box = node.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  }));
  expect(gridBox).not.toBeNull();
  expect(featureBox).not.toBeNull();
  expect(featureBox!.width).toBeGreaterThan(gridBox!.width * 0.47);
  expect(featureBox!.width).toBeLessThan(gridBox!.width * 0.53);

  const topRow = productBoxes.filter((box) => Math.abs(box.y - featureBox!.y) < 2);
  const lowerRow = productBoxes.filter((box) => box.y > featureBox!.y + 2);
  expect(topRow).toHaveLength(3);
  expect(lowerRow).toHaveLength(6);

  const boxPosition = await feature.getAttribute('data-box-position');
  if (boxPosition === 'right') {
    expect(Math.max(...topRow.map((box) => box.x))).toBeLessThan(featureBox!.x);
    await expect(feature).toHaveAttribute('data-content-position', 'left');
  } else {
    expect(featureBox!.x).toBeLessThan(Math.min(...topRow.map((box) => box.x)));
    await expect(feature).toHaveAttribute('data-content-position', 'right');
  }
});

test('mobile category feature section places the hero first without horizontal overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'Mobile stacking is verified once');
  const { section, feature, products } = await openHomepage(page);

  await expect(products).toHaveCount(9);
  const featureBox = await feature.boundingBox();
  const firstProductBox = await products.first().boundingBox();
  expect(featureBox).not.toBeNull();
  expect(firstProductBox).not.toBeNull();
  expect(featureBox!.y).toBeLessThan(firstProductBox!.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  await expect(section.locator('[data-section11-carousel]')).toHaveCSS('overflow-x', 'hidden');
});

test('Section 11 matches the compact 397px mobile composition and shared autoplay carousel', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Exact mobile reference geometry is verified once');
  await page.setViewportSize({ width: 397, height: 515 });

  const pageErrors: Error[] = [];
  page.on('pageerror', (error) => pageErrors.push(error));
  const { root, section, feature, products } = await openHomepage(page);
  const header = section.locator('[data-section11-header]');
  const title = section.locator('[data-category-feature-title]');
  const viewAll = header.getByRole('link', { name: 'Xem tất cả' });
  const slides = section.locator('[data-section11-slide]');
  const cta = feature.locator('[data-feature-cta]');
  const headline = feature.locator('[data-feature-headline]');
  const subheading = feature.locator('[data-feature-subheading]');

  await expect(products).toHaveCount(9);
  await expect(slides).toHaveCount(9);
  await expect(cta).toBeHidden();
  const { carousel, track } = await waitForSection11Carousel(section);
  await track.locator(':scope > [data-section11-slide]').nth(1).locator('a').first().focus();
  await page.waitForTimeout(450);
  const firstVisibleSlide = track.locator(':scope > [data-section11-slide]').nth(1);
  const secondVisibleSlide = track.locator(':scope > [data-section11-slide]').nth(2);
  const [rootBox, sectionBox, featureBox, headerBox, carouselBox, firstSlideBox, secondSlideBox] = await Promise.all([
    root.boundingBox(),
    section.boundingBox(),
    feature.boundingBox(),
    header.boundingBox(),
    carousel.boundingBox(),
    firstVisibleSlide.boundingBox(),
    secondVisibleSlide.boundingBox(),
  ]);

  expect(rootBox?.width).toBeCloseTo(397, 0);
  expect(sectionBox?.x).toBeCloseTo(0, 0);
  expect(sectionBox?.width).toBeCloseTo(397, 0);
  await expect(section).toHaveCSS('padding', '0px');
  await expect(section).toHaveCSS('border-top-width', '0px');
  await expect(section).toHaveCSS('border-radius', '0px');
  await expect(section).toHaveCSS('box-shadow', 'none');
  expect(featureBox?.x).toBeCloseTo(16, 0);
  expect(featureBox?.width).toBeCloseTo(365, 0);
  expect(featureBox?.height).toBeCloseTo(130, 0);
  expect((headerBox?.y || 0) - (featureBox?.y || 0) - (featureBox?.height || 0)).toBeCloseTo(16, 0);
  expect((carouselBox?.y || 0) - (headerBox?.y || 0) - (headerBox?.height || 0)).toBeCloseTo(16, 0);
  expect(firstSlideBox?.x).toBeCloseTo(22, 0);
  expect(firstSlideBox?.width).toBeGreaterThanOrEqual(194);
  expect(firstSlideBox?.width).toBeLessThanOrEqual(196);
  expect((secondSlideBox?.x || 0) - (firstSlideBox?.x || 0) - (firstSlideBox?.width || 0)).toBeCloseTo(16, 0);
  expect((secondSlideBox?.x || 0) + (secondSlideBox?.width || 0)).toBeGreaterThan(397);
  await expect(title).toHaveCSS('font-size', '20px');
  await expect(viewAll).toHaveCSS('font-size', '11px');
  if (await headline.count()) await expect(headline).toHaveCSS('font-size', '28px');
  if (await subheading.count()) await expect(subheading).toHaveCSS('font-size', '10px');

  expect(await carousel.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
  await expect(carousel).toHaveCSS('overflow-x', 'hidden');
  await expect(carousel).toHaveCSS('touch-action', 'pan-y');
  expect(await visibleOriginalIndex(track)).not.toBeNull();
  const homepageUrl = page.url();
  expect(page.url()).toBe(homepageUrl);
  await expect(firstVisibleSlide.locator('a').first()).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  const accessibility = await new AxeBuilder({ page })
    .include('#section-11')
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(
    accessibility.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact || '')),
  ).toEqual([]);
  expect(pageErrors).toEqual([]);

  await expect.poll(() => products.locator('img').evaluateAll((images) => images.slice(0, 2).every((image) => (
    (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0
  )))).toBe(true);
  await page.setViewportSize({ width: 397, height: 1000 });
  await root.scrollIntoViewIfNeeded();
  await root.screenshot({ path: testInfo.outputPath('section-11-mobile-397.png') });
});

test('Section 11 autoplay pauses offscreen and on focus, then resumes without navigation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Autoplay lifecycle timing is verified once');
  await page.setViewportSize({ width: 397, height: 515 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  const section = page.locator('[data-category-feature-section]').first();
  await expect(section).toBeAttached();
  const { track } = await waitForSection11Carousel(section);
  const homepageUrl = page.url();
  const initialIndex = await visibleOriginalIndex(track);
  expect(initialIndex).toBe('0');

  await page.waitForTimeout(3300);
  expect(await visibleOriginalIndex(track)).toBe(initialIndex);

  await section.scrollIntoViewIfNeeded();
  await expect.poll(() => visibleOriginalIndex(track), { timeout: 4200 }).not.toBe(initialIndex);
  expect(await track.evaluate((node) => Array.from(node.children).slice(1).every((child) => (
    getComputedStyle(child).visibility === 'visible'
  )))).toBe(true);
  const focusedIndex = await visibleOriginalIndex(track);
  const visibleSlide = track.locator(`[data-original-index="${focusedIndex}"]`);
  await visibleSlide.locator('a').first().focus();
  await expect(visibleSlide.locator('a').first()).toBeFocused();

  await page.waitForTimeout(3300);
  expect(await visibleOriginalIndex(track)).toBe(focusedIndex);

  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expect.poll(() => visibleOriginalIndex(track), { timeout: 4200 }).not.toBe(focusedIndex);
  expect(page.url()).toBe(homepageUrl);
});

test('Section 11 touch swipe keeps the shared threshold and restarts autoplay', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'Native touch input is verified once');
  await page.setViewportSize({ width: 397, height: 800 });
  const { section } = await openHomepage(page);
  const { carousel, track } = await waitForSection11Carousel(section);
  const box = await carousel.boundingBox();
  expect(box).not.toBeNull();
  if (!box) return;

  const cardStep = await track.evaluate((node) => {
    const firstCard = node.children[0] as HTMLElement;
    const style = getComputedStyle(node);
    return firstCard.offsetWidth + (Number.parseFloat(style.columnGap) || 16);
  });
  const startX = box.x + Math.min(box.width - 40, cardStep + 30);
  const startY = box.y + Math.min(box.height - 30, box.height / 2);
  const homepageUrl = page.url();
  const initialIndex = await visibleOriginalIndex(track);
  const session = await page.context().newCDPSession(page);

  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: startX, y: startY }],
  });
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: startX - cardStep * 0.35, y: startY }],
  });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => visibleOriginalIndex(track), { timeout: 1400 }).not.toBe(initialIndex);

  const afterSwipeIndex = await visibleOriginalIndex(track);
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: startX, y: startY }],
  });
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: startX - 10, y: startY }],
  });
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(500);
  expect(await visibleOriginalIndex(track)).toBe(afterSwipeIndex);

  await expect.poll(() => visibleOriginalIndex(track), { timeout: 4200 }).not.toBe(afterSwipeIndex);
  expect(page.url()).toBe(homepageUrl);
});

test('Section 11 keeps native mobile scrolling when reduced motion is requested', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Reduced-motion fallback is verified once');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 397, height: 800 });
  const { section } = await openHomepage(page);
  const carousel = section.locator('[data-section11-carousel]');
  const track = section.locator('[data-section11-carousel-track]');

  await expect(carousel).not.toHaveAttribute('data-homepage-carousel-active', 'true');
  await expect(carousel).toHaveCSS('overflow-x', 'auto');
  expect(await track.evaluate((node) => (node as HTMLElement).style.transform)).toBe('');
  await page.waitForTimeout(3300);
  expect(await track.locator('[data-original-index]').count()).toBe(0);

  await carousel.evaluate((node) => node.scrollTo({ left: 240, behavior: 'instant' }));
  await expect.poll(() => carousel.evaluate((node) => node.scrollLeft)).toBeGreaterThan(0);
});

test('Section 11 changes from shared mobile autoplay to the existing grid at 640px', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Responsive matrix is verified once');

  for (const width of [360, 390, 428, 639, 640]) {
    await page.setViewportSize({ width, height: 900 });
    const { section, feature } = await openHomepage(page);
    const slides = section.locator('[data-section11-slide]');
    const carousel = section.locator('[data-section11-carousel]');
    const cta = feature.locator('[data-feature-cta]');

    if (width < 640) {
      await waitForSection11Carousel(section);
      const slide = section.locator('[data-section11-slide][data-original-index="0"]');
      const box = await slide.boundingBox();
      expect(box?.width).toBeCloseTo((width - 45) / 1.8, 0);
      await expect(carousel).toHaveCSS('overflow-x', 'hidden');
      await expect(cta).toBeHidden();
    } else {
      await expect(slides.first()).toHaveCSS('display', 'contents');
      await expect(carousel).toHaveCSS('display', 'contents');
      await expect(carousel).not.toHaveAttribute('data-homepage-carousel-active', 'true');
      await expect(cta).toBeVisible();
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  }

  await page.setViewportSize({ width: 639, height: 900 });
  const { section } = await openHomepage(page);
  const carousel = section.locator('[data-section11-carousel]');
  const track = section.locator('[data-section11-carousel-track]');
  await waitForSection11Carousel(section);
  await page.setViewportSize({ width: 640, height: 900 });
  await expect(carousel).not.toHaveAttribute('data-homepage-carousel-active', 'true');
  await expect.poll(() => track.evaluate((node) => (node as HTMLElement).style.transform)).toBe('');
  await expect(track.locator('[data-original-index]')).toHaveCount(0);

  await page.setViewportSize({ width: 639, height: 900 });
  await waitForSection11Carousel(section);
  await expect(track.locator('[data-section11-slide]')).toHaveCount(9);
  await expect(track.locator('.cloned-item')).toHaveCount(0);
});
