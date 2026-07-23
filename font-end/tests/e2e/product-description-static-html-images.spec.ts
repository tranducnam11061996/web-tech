import { expect, test, type Locator, type Page } from '@playwright/test';

const PRODUCT_PATH = '/pc-mini-gaming-i5-12400f-rtx-5060-8gb-black';

async function openProductDescription(page: Page) {
  await page.goto(PRODUCT_PATH, { waitUntil: 'domcontentloaded' });

  const content = page.locator('[data-product-static-html]:visible').first();
  const wrappedImage = content
    .locator(':scope > p > :is(span, a):only-child > img:only-child')
    .first();

  await expect(content).toBeVisible();
  await expect(wrappedImage).toBeVisible();
  await expect
    .poll(() => wrappedImage.evaluate((image) => (image as HTMLImageElement).naturalWidth))
    .toBeGreaterThan(0);

  return { content, wrappedImage };
}

async function expectDesktopImageGeometry(image: Locator) {
  const geometry = await image.evaluate((element) => {
    const imageElement = element as HTMLImageElement;
    const contentElement = imageElement.closest<HTMLElement>('[data-product-static-html]')!;
    const contentBox = contentElement.getBoundingClientRect();
    const imageBox = imageElement.getBoundingClientRect();
    const computed = getComputedStyle(imageElement);

    return {
      contentWidth: contentBox.width,
      imageWidth: imageBox.width,
      imageHeight: imageBox.height,
      centerDelta: Math.abs(
        imageBox.left + imageBox.width / 2 -
        (contentBox.left + contentBox.width / 2),
      ),
      naturalWidth: imageElement.naturalWidth,
      naturalHeight: imageElement.naturalHeight,
      display: computed.display,
      marginTop: computed.marginTop,
      marginBottom: computed.marginBottom,
      maxWidth: computed.maxWidth,
    };
  });

  expect(geometry.imageWidth).toBeGreaterThanOrEqual(geometry.contentWidth * 0.6 - 1);
  expect(geometry.imageWidth).toBeLessThanOrEqual(geometry.contentWidth + 1);
  expect(geometry.centerDelta).toBeLessThanOrEqual(1);
  expect(geometry.imageWidth / geometry.imageHeight).toBeCloseTo(
    geometry.naturalWidth / geometry.naturalHeight,
    2,
  );
  expect(geometry).toMatchObject({
    display: 'block',
    marginTop: '20px',
    marginBottom: '20px',
    maxWidth: '100%',
  });
}

test('desktop centers standalone product-description images without changing multi-image rows', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop image geometry is verified once');
  await page.setViewportSize({ width: 1920, height: 1080 });

  const { content, wrappedImage } = await openProductDescription(page);
  await expectDesktopImageGeometry(wrappedImage);

  await content.evaluate((element) => {
    const sourceImage = element.querySelector<HTMLImageElement>('img')!;

    const directImage = sourceImage.cloneNode(true) as HTMLImageElement;
    directImage.dataset.testDirectProductImage = 'true';
    element.append(directImage);

    const singleImageParagraph = document.createElement('p');
    singleImageParagraph.dataset.testSingleImageParagraph = 'true';
    singleImageParagraph.append(sourceImage.cloneNode(true));
    element.append(singleImageParagraph);

    const multiImageParagraph = document.createElement('p');
    multiImageParagraph.dataset.testMultiImageParagraph = 'true';
    multiImageParagraph.append(sourceImage.cloneNode(true), sourceImage.cloneNode(true));
    element.append(multiImageParagraph);
  });

  await expectDesktopImageGeometry(content.locator('[data-test-direct-product-image]'));
  await expectDesktopImageGeometry(
    content.locator('[data-test-single-image-paragraph] > img'),
  );

  const multiImage = content.locator('[data-test-multi-image-paragraph] > img').first();
  await expect(multiImage).toHaveCSS('min-width', '0px');
  await expect(multiImage).toHaveCSS('margin-top', '0px');

  const disclosure = content.locator(
    'xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " product-description-disclosure ")][1]',
  );
  await disclosure.getByRole('button', { name: 'Xem thêm' }).click();
  await expect(disclosure.getByRole('button', { name: 'Thu gọn' })).toBeVisible();
});

test('viewports below 1024px keep the existing product-description image presentation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'Mobile image behavior is verified once');

  for (const width of [390, 1023]) {
    await page.setViewportSize({ width, height: 844 });
    const { wrappedImage } = await openProductDescription(page);

    await expect(wrappedImage).toHaveCSS('min-width', '0px');
    await expect(wrappedImage).toHaveCSS('margin-top', '0px');
    await expect(wrappedImage).toHaveCSS('margin-bottom', '0px');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
  }
});
