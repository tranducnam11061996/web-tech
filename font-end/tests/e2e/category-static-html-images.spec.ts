import { expect, test, type Locator, type Page } from '@playwright/test';

const CATEGORY_PATH = '/bo-pc-gaming-livestream.html';

async function openStaticHtml(page: Page) {
  await page.goto(CATEGORY_PATH, { waitUntil: 'domcontentloaded' });

  const content = page.locator('[data-category-static-html]:visible').first();
  const imageOnlyParagraph = content.locator(':scope > p > img:only-child').first();

  await expect(content).toBeVisible();
  await expect(imageOnlyParagraph).toBeVisible();

  return { content, imageOnlyParagraph };
}

async function expectDesktopImageGeometry(image: Locator) {
  await expect.poll(() => image.evaluate((element) => {
    const contentElement = element.closest<HTMLElement>('[data-category-static-html]');
    if (!contentElement) return null;
    const contentBox = contentElement.getBoundingClientRect();
    const imageBox = element.getBoundingClientRect();
    const computed = getComputedStyle(element);

    return {
      validWidth: imageBox.width >= contentBox.width * 0.6 - 1 &&
        imageBox.width <= contentBox.width + 1,
      centered: Math.abs(
        imageBox.left + imageBox.width / 2 -
        (contentBox.left + contentBox.width / 2),
      ) <= 1,
      display: computed.display,
      marginTop: computed.marginTop,
      marginBottom: computed.marginBottom,
      maxWidth: computed.maxWidth,
      borderRadius: computed.borderRadius,
    };
  })).toMatchObject({
    validWidth: true,
    centered: true,
    display: 'block',
    marginTop: '20px',
    marginBottom: '20px',
    maxWidth: '100%',
    borderRadius: '12px',
  });
}

test('desktop centers and widens standalone category static HTML images', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-chromium', 'Desktop image geometry is verified once');
  await page.setViewportSize({ width: 1920, height: 1080 });

  const { content, imageOnlyParagraph } = await openStaticHtml(page);
  await expectDesktopImageGeometry(imageOnlyParagraph);

  await content.evaluate((element) => {
    const directImage = document.createElement('img');
    directImage.dataset.testDirectStaticImage = 'true';
    directImage.width = 100;
    directImage.height = 50;
    directImage.alt = 'Direct static content test image';
    element.append(directImage);

    const multiImageParagraph = document.createElement('p');
    multiImageParagraph.dataset.testMultiImageParagraph = 'true';
    for (let index = 0; index < 2; index += 1) {
      const image = document.createElement('img');
      image.width = 100;
      image.height = 50;
      image.alt = `Multi-image test ${index + 1}`;
      multiImageParagraph.append(image);
    }
    element.append(multiImageParagraph);
  });

  const directImage = content.locator('[data-test-direct-static-image]');
  await expectDesktopImageGeometry(directImage);

  const multiImage = content.locator('[data-test-multi-image-paragraph] > img').first();
  await expect(multiImage).toHaveCSS('min-width', '0px');
  await expect(multiImage).toHaveCSS('margin-top', '0px');

  const disclosure = content.locator('xpath=..');
  const collapsedHeight = await content.evaluate((element) => element.clientHeight);
  await disclosure.getByRole('button', { name: 'Xem thêm' }).click();
  await expect(disclosure.getByRole('button', { name: 'Thu gọn' })).toBeVisible();
  await expect.poll(() => content.evaluate((element) => element.clientHeight)).toBeGreaterThan(collapsedHeight);
});

test('mobile keeps existing category static HTML image sizing', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-chromium', 'Mobile behavior is verified once');
  await page.setViewportSize({ width: 390, height: 844 });

  const { imageOnlyParagraph } = await openStaticHtml(page);
  await expect(imageOnlyParagraph).toHaveCSS('min-width', '0px');
  await expect(imageOnlyParagraph).toHaveCSS('margin-top', '0px');
  await expect(imageOnlyParagraph).toHaveCSS('margin-bottom', '0px');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
});
