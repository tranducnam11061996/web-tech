import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

const CATEGORY_PATH = '/bo-pc-gaming-livestream.html';

async function openCategory(page: Page, width: number, height = 900) {
  await page.setViewportSize({ width, height });
  await page.goto(CATEGORY_PATH, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-category-toolbar]:visible')).toBeVisible();
  await expect(page.locator('#productGrid [data-product-card]:visible').first()).toBeVisible();
}

async function gridColumnCount(locator: Locator) {
  return locator.evaluate((element) =>
    getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length,
  );
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
}

async function expectCardsFit(page: Page) {
  const cards = page.locator('#productGrid [data-product-card]:visible');
  const count = await cards.count();
  expect(count).toBeGreaterThanOrEqual(2);

  for (let index = 0; index < Math.min(count, 4); index += 1) {
    const fits = await cards.nth(index).evaluate((card) => {
      const footer = card.querySelector<HTMLElement>('[data-product-card-footer]');
      const price = card.querySelector<HTMLElement>('[data-product-sale-price]');
      const cart = card.querySelector<HTMLElement>('[data-product-cart-button]');
      const cardRect = card.getBoundingClientRect();
      const footerRect = footer?.getBoundingClientRect();
      const priceRect = price?.getBoundingClientRect();
      const cartRect = cart?.getBoundingClientRect();

      return {
        cardOverflow: card.scrollWidth > card.clientWidth + 1,
        footerOverflow: !!footer && footer.scrollWidth > footer.clientWidth + 1,
        priceCartOverlap: !!priceRect && !!cartRect && !(
          priceRect.right <= cartRect.left || priceRect.left >= cartRect.right ||
          priceRect.bottom <= cartRect.top || priceRect.top >= cartRect.bottom
        ),
        insideViewport: cardRect.left >= -1 && cardRect.right <= window.innerWidth + 1,
        footerInsideCard: !footerRect || footerRect.right <= cardRect.right + 1,
      };
    });

    expect(fits).toEqual({
      cardOverflow: false,
      footerOverflow: false,
      priceCartOverlap: false,
      insideViewport: true,
      footerInsideCard: true,
    });
  }
}

async function visibleMobilePaginationTokens(page: Page) {
  return page
    .locator('[data-category-pagination-pages="mobile"]:visible > *')
    .allTextContents()
    .then((tokens) => tokens.map((token) => token.trim()));
}

async function expectPaginationOnOneRow(page: Page) {
  const controls = page.locator(
    '[data-category-pagination] > button:visible, [data-category-pagination-pages="mobile"]:visible > *',
  );
  const boxes = await controls.evaluateAll((elements) =>
    elements.map((element) => {
      const box = element.getBoundingClientRect();
      return { top: box.top, bottom: box.bottom };
    }),
  );

  expect(boxes).toHaveLength(7);
  expect(Math.max(...boxes.map((box) => box.top)) - Math.min(...boxes.map((box) => box.top))).toBeLessThanOrEqual(1);
  expect(Math.max(...boxes.map((box) => box.bottom)) - Math.min(...boxes.map((box) => box.bottom))).toBeLessThanOrEqual(1);
}

async function openMobileFilter(page: Page) {
  const trigger = page.locator('[data-category-filter-trigger]:visible');
  const dialog = page.locator('[data-category-mobile-filter-dialog]');
  await trigger.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  await expect(async () => {
    if (!(await dialog.isVisible())) await trigger.click();
    await expect(dialog).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 8_000 });
  return { dialog, trigger };
}

test('category layout uses two columns below 1024px and desktop layout at 1024px', async ({ page }) => {
  for (const width of [390, 768, 1023, 1024]) {
    await openCategory(page, width);

    const subcategoryGrid = page.locator('[data-category-subcategory-grid]:visible');
    const productGrid = page.locator('#productGrid:visible');
    const subcategoryCards = subcategoryGrid.locator('[data-category-subcategory-card]');

    await expect(subcategoryCards).toHaveCount(4);
    expect(await gridColumnCount(subcategoryGrid)).toBe(width < 1024 ? 2 : 4);
    expect(await gridColumnCount(productGrid)).toBe(width < 1024 ? 2 : 3);

    if (width < 1024) {
      await expect(page.locator('[data-category-filter-trigger]:visible')).toBeVisible();
      await expect(page.locator('[data-category-sort="desktop"]')).toBeHidden();
      await expect(page.locator('[data-category-desktop-filter]')).toBeHidden();
      await expectCardsFit(page);
    } else {
      await expect(page.locator('[data-category-filter-trigger]')).toBeHidden();
      await expect(page.locator('[data-category-sort="desktop"]')).toBeVisible();
      await expect(page.locator('[data-category-desktop-filter]')).toBeVisible();
    }

    await expectNoHorizontalOverflow(page);
  }
});

test('mobile category polish keeps one select arrow, compact pagination and aligned static content', async ({ page }) => {
  await openCategory(page, 390, 844);

  const trigger = page.locator('[data-category-filter-trigger]:visible');
  const triggerStyle = await trigger.evaluate((element) => {
    const iconBox = element.querySelector('svg')?.getBoundingClientRect();
    return {
      backgroundColor: getComputedStyle(element).backgroundColor,
      color: getComputedStyle(element).color,
      iconSize: iconBox?.width,
    };
  });
  expect(triggerStyle).toEqual({
    backgroundColor: 'rgb(11, 99, 229)',
    color: 'rgb(255, 255, 255)',
    iconSize: 18,
  });

  await openMobileFilter(page);
  const mobileSort = page.locator('[data-category-sort="mobile"]');
  const sortArrowState = await mobileSort.evaluate((element) => ({
    backgroundImage: getComputedStyle(element).backgroundImage,
    siblingSvgCount: element.parentElement?.querySelectorAll(':scope > svg').length || 0,
  }));
  expect(sortArrowState.backgroundImage).not.toBe('none');
  expect(sortArrowState.siblingSvgCount).toBe(0);
  await page.getByRole('button', { name: 'Đóng bộ lọc' }).click();

  const firstPageTokens = await visibleMobilePaginationTokens(page);
  expect(firstPageTokens).toHaveLength(5);
  const lastPage = Number(firstPageTokens.at(-1));
  expect(lastPage).toBeGreaterThan(5);
  expect(firstPageTokens).toEqual(['1', '2', '3', '...', String(lastPage)]);
  await expect(page.getByRole('button', { name: 'Trang trước' })).toBeDisabled();
  await expectPaginationOnOneRow(page);

  await page.getByRole('button', { name: 'Đến trang 2' }).click();
  await expect.poll(() => new URL(page.url()).searchParams.get('page')).toBe('2');
  await expect(page.locator('[data-category-pagination-pages="mobile"] [aria-current="page"]')).toHaveText('2');

  const middlePage = Math.ceil(lastPage / 2);
  await page.goto(`${CATEGORY_PATH}?page=${middlePage}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#productGrid [data-product-card]:visible').first()).toBeVisible();
  expect(await visibleMobilePaginationTokens(page)).toEqual(['1', '...', String(middlePage), '...', String(lastPage)]);
  await expectPaginationOnOneRow(page);

  await page.goto(`${CATEGORY_PATH}?page=${lastPage - 1}`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#productGrid [data-product-card]:visible').first()).toBeVisible();
  expect(await visibleMobilePaginationTokens(page)).toEqual(['1', '...', String(lastPage - 2), String(lastPage - 1), String(lastPage)]);
  await expectPaginationOnOneRow(page);

  await page.goto(CATEGORY_PATH, { waitUntil: 'domcontentloaded' });
  const productGridBox = await page.locator('#productGrid:visible').boundingBox();
  const staticContentBox = await page.locator('[data-category-static-html]:visible').boundingBox();
  const mobileStaticPadding = await page.locator('[data-category-static-frame]').evaluate((element) => getComputedStyle(element).paddingLeft);
  expect(productGridBox).not.toBeNull();
  expect(staticContentBox).not.toBeNull();
  expect(staticContentBox!.x).toBeCloseTo(productGridBox!.x, 0);
  expect(staticContentBox!.width).toBeCloseTo(productGridBox!.width, 0);
  expect(mobileStaticPadding).toBe('0px');

  for (const width of [768, 1023, 1024]) {
    await page.setViewportSize({ width, height: 900 });
    const staticPadding = await page.locator('[data-category-static-frame]').evaluate((element) => getComputedStyle(element).paddingLeft);
    expect(staticPadding).toBe('32px');
  }
  await expectNoHorizontalOverflow(page);
});

test('mobile filter drawer supports focus, backdrop, Escape and responsive height', async ({ page }) => {
  await openCategory(page, 390, 844);

  const { dialog, trigger } = await openMobileFilter(page);
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: 'Đóng bộ lọc' })).toBeFocused();

  const phoneBox = await dialog.boundingBox();
  expect(phoneBox).not.toBeNull();
  expect(phoneBox!.x).toBe(0);
  expect(phoneBox!.width).toBeLessThanOrEqual(340);
  expect(phoneBox!.height).toBe(844 - 60);

  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await page.mouse.click(380, 100);
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();

  await page.setViewportSize({ width: 768, height: 900 });
  await trigger.click();
  const tabletBox = await dialog.boundingBox();
  expect(tabletBox).not.toBeNull();
  expect(tabletBox!.height).toBe(900);

  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('[data-category-desktop-filter]')).toBeVisible();
});

test('mobile drawer keeps open while sort, price and attributes update the URL; reset preserves sort', async ({ page }) => {
  await openCategory(page, 390, 844);
  const { dialog } = await openMobileFilter(page);

  const sort = dialog.locator('[data-category-sort="mobile"]');
  await sort.selectOption('price_asc');
  await expect.poll(() => new URL(page.url()).searchParams.get('sort')).toBe('price_asc');
  await expect(dialog).toBeVisible();

  const minPrice = dialog.getByRole('slider', { name: 'Giá tối thiểu' });
  const priceRange = await minPrice.evaluate((input: HTMLInputElement) => ({
    min: Number(input.min),
    max: Number(input.max),
  }));
  const nextMin = Math.round((priceRange.min + (priceRange.max - priceRange.min) * 0.1) / 1000) * 1000;
  await minPrice.fill(String(nextMin));
  await minPrice.dispatchEvent('mouseup');
  await expect.poll(() => new URL(page.url()).searchParams.get('min-price')).toBe(String(nextMin));
  await expect(dialog).toBeVisible();

  const attributeCheckbox = dialog.locator('[data-group^="mobile-category-filter-attr-"] input[type="checkbox"]').first();
  if (await attributeCheckbox.count()) {
    const urlBeforeAttribute = page.url();
    await attributeCheckbox.locator('xpath=..').click();
    await expect.poll(() => page.url()).not.toBe(urlBeforeAttribute);
    await expect(dialog).toBeVisible();
  }

  await dialog.getByRole('button', { name: 'Đặt lại' }).click();
  await expect.poll(() => {
    const url = new URL(page.url());
    return {
      sort: url.searchParams.get('sort'),
      minPrice: url.searchParams.get('min-price'),
      maxPrice: url.searchParams.get('max-price'),
    };
  }).toEqual({ sort: 'price_asc', minPrice: null, maxPrice: null });
  await expect(dialog).toBeVisible();
});

test('category and open filter drawer have no serious or critical Axe violations', async ({ page }) => {
  await openCategory(page, 390, 844);

  const closedResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(closedResults.violations.filter((item) => ['serious', 'critical'].includes(item.impact || ''))).toEqual([]);

  await openMobileFilter(page);
  const openResults = await new AxeBuilder({ page })
    .include('[data-category-mobile-filter-dialog]')
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(openResults.violations.filter((item) => ['serious', 'critical'].includes(item.impact || ''))).toEqual([]);
  await expectNoHorizontalOverflow(page);
});
