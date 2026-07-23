import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';

const SEARCH_QUERY = 'màn hình';
const SEARCH_PATH = `/tim?q=${encodeURIComponent(SEARCH_QUERY)}`;

async function openSearch(page: Page, width: number, height = 900, path = SEARCH_PATH) {
  await page.setViewportSize({ width, height });
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-search-toolbar]:visible')).toBeVisible();
  await expect(page.locator('[data-search-product-grid] [data-product-card]:visible').first()).toBeVisible();
}

async function gridColumnCount(locator: Locator) {
  return locator.evaluate((element) =>
    getComputedStyle(element).gridTemplateColumns.split(' ').filter(Boolean).length,
  );
}

async function expectNoHorizontalOverflow(page: Page) {
  expect(await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  )).toBe(true);
}

async function expectCardsFit(page: Page) {
  const cards = page.locator('[data-search-product-grid] [data-product-card]:visible');
  expect(await cards.count()).toBeGreaterThanOrEqual(2);

  for (let index = 0; index < Math.min(await cards.count(), 4); index += 1) {
    const fit = await cards.nth(index).evaluate((card) => {
      const price = card.querySelector<HTMLElement>('[data-product-sale-price]')?.getBoundingClientRect();
      const cart = card.querySelector<HTMLElement>('[data-product-cart-button]')?.getBoundingClientRect();
      const box = card.getBoundingClientRect();
      return {
        overflow: card.scrollWidth > card.clientWidth + 1,
        insideViewport: box.left >= -1 && box.right <= window.innerWidth + 1,
        priceCartOverlap: !!price && !!cart && !(
          price.right <= cart.left || price.left >= cart.right ||
          price.bottom <= cart.top || price.top >= cart.bottom
        ),
      };
    });
    expect(fit).toEqual({ overflow: false, insideViewport: true, priceCartOverlap: false });
  }
}

async function openMobileFilter(page: Page) {
  const trigger = page.locator('[data-search-filter-trigger]:visible');
  const dialog = page.locator('[data-search-mobile-filter-dialog]');
  await trigger.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  await expect(async () => {
    if (!(await dialog.isVisible())) await trigger.click();
    await expect(dialog).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 8_000 });
  return { dialog, trigger };
}

async function mobilePaginationTokens(page: Page) {
  return page.locator('[data-search-pagination-pages="mobile"]:visible > *')
    .allTextContents()
    .then((tokens) => tokens.map((token) => token.trim()));
}

async function expectPaginationOnOneRow(page: Page) {
  const controls = page.locator(
    '[data-search-pagination] > button:visible, [data-search-pagination-pages="mobile"]:visible > *',
  );
  const tops = await controls.evaluateAll((elements) =>
    elements.map((element) => element.getBoundingClientRect().top),
  );
  expect(tops).toHaveLength(7);
  expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(1);
}

test('search uses two product columns and mobile filter toolbar below 1024px', async ({ page }) => {
  for (const width of [390, 768, 1023, 1024]) {
    await openSearch(page, width);
    const grid = page.locator('[data-search-product-grid]:visible');
    expect(await gridColumnCount(grid)).toBe(width < 1024 ? 2 : 3);

    if (width < 1024) {
      await expect(page.locator('[data-search-filter-trigger]:visible')).toBeVisible();
      await expect(page.locator('[data-search-sort="desktop"]')).toBeHidden();
      await expect(page.locator('[data-search-desktop-filter]')).toBeHidden();
      await expectCardsFit(page);
    } else {
      await expect(page.locator('[data-search-filter-trigger]')).toBeHidden();
      await expect(page.locator('[data-search-sort="desktop"]')).toBeVisible();
      await expect(page.locator('[data-search-desktop-filter]')).toBeVisible();
    }
    await expectNoHorizontalOverflow(page);
  }
});

test('search filter drawer preserves the query while applying and resetting filters', async ({ page }) => {
  await openSearch(page, 390, 844);
  const { dialog, trigger } = await openMobileFilter(page);
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('button', { name: 'Đóng bộ lọc' })).toBeFocused();

  const phoneBox = await dialog.boundingBox();
  expect(phoneBox).not.toBeNull();
  expect(phoneBox!.x).toBe(0);
  expect(phoneBox!.width).toBeLessThanOrEqual(340);
  expect(phoneBox!.height).toBe(844 - 60);

  const sort = dialog.locator('[data-search-sort="mobile"]');
  const sortDecoration = await sort.evaluate((element) => ({
    backgroundImage: getComputedStyle(element).backgroundImage,
    siblingSvgCount: element.parentElement?.querySelectorAll(':scope > svg').length || 0,
  }));
  expect(sortDecoration.backgroundImage).not.toBe('none');
  expect(sortDecoration.siblingSvgCount).toBe(0);

  await sort.selectOption('newest');
  await expect.poll(() => {
    const url = new URL(page.url());
    return { q: url.searchParams.get('q'), sort: url.searchParams.get('sort') };
  }).toEqual({ q: SEARCH_QUERY, sort: 'newest' });
  await expect(dialog).toBeVisible();

  const minPrice = dialog.getByRole('slider', { name: 'Giá tối thiểu' });
  const range = await minPrice.evaluate((input: HTMLInputElement) => ({
    min: Number(input.min),
    max: Number(input.max),
  }));
  const nextMin = Math.round((range.min + (range.max - range.min) * 0.1) / 1000) * 1000;
  await minPrice.fill(String(nextMin));
  await minPrice.dispatchEvent('mouseup');
  await expect.poll(() => new URL(page.url()).searchParams.get('min-price')).toBe(String(nextMin));

  const attributeCheckbox = dialog.locator('[data-group^="mobile-search-filter-attr-"] input[type="checkbox"]').first();
  if (await attributeCheckbox.count()) {
    const beforeAttribute = page.url();
    await attributeCheckbox.locator('xpath=..').click();
    await expect.poll(() => page.url()).not.toBe(beforeAttribute);
  }
  await expect(dialog).toBeVisible();

  await dialog.getByRole('button', { name: 'Đặt lại' }).click();
  await expect.poll(() => {
    const url = new URL(page.url());
    return Array.from(url.searchParams.entries()).sort(([left], [right]) => left.localeCompare(right));
  }).toEqual([['q', SEARCH_QUERY], ['sort', 'newest']]);
  await expect(dialog).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();

  await page.setViewportSize({ width: 768, height: 900 });
  await openMobileFilter(page);
  expect((await dialog.boundingBox())?.height).toBe(900);
  await page.setViewportSize({ width: 1024, height: 900 });
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('[data-search-desktop-filter]')).toBeVisible();
});

test('search mobile pagination stays on one row at the start, middle and end', async ({ page }) => {
  await openSearch(page, 390, 844);
  const firstTokens = await mobilePaginationTokens(page);
  expect(firstTokens).toHaveLength(5);
  const lastPage = Number(firstTokens.at(-1));
  expect(lastPage).toBeGreaterThan(5);
  expect(firstTokens).toEqual(['1', '2', '3', '...', String(lastPage)]);
  await expect(page.getByRole('button', { name: 'Trang trước' })).toBeDisabled();
  await expectPaginationOnOneRow(page);

  await page.getByRole('button', { name: 'Đến trang 2' }).click();
  await expect.poll(() => {
    const url = new URL(page.url());
    return { q: url.searchParams.get('q'), page: url.searchParams.get('page') };
  }).toEqual({ q: SEARCH_QUERY, page: '2' });

  const middlePage = Math.ceil(lastPage / 2);
  await openSearch(page, 390, 844, `${SEARCH_PATH}&page=${middlePage}`);
  expect(await mobilePaginationTokens(page)).toEqual(['1', '...', String(middlePage), '...', String(lastPage)]);
  await expectPaginationOnOneRow(page);

  await openSearch(page, 390, 844, `${SEARCH_PATH}&page=${lastPage - 1}`);
  expect(await mobilePaginationTokens(page)).toEqual([
    '1',
    '...',
    String(lastPage - 2),
    String(lastPage - 1),
    String(lastPage),
  ]);
  await expectPaginationOnOneRow(page);
});

test('search page and open filter drawer have no serious or critical Axe violations', async ({ page }) => {
  await openSearch(page, 390, 844);
  const closedResults = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(closedResults.violations.filter((item) => ['serious', 'critical'].includes(item.impact || ''))).toEqual([]);

  await openMobileFilter(page);
  const openResults = await new AxeBuilder({ page })
    .include('[data-search-mobile-filter-dialog]')
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  expect(openResults.violations.filter((item) => ['serious', 'critical'].includes(item.impact || ''))).toEqual([]);
  await expectNoHorizontalOverflow(page);
});
