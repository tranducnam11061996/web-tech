import { expect, test, type Page, type Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs/promises';
import ExcelJS from 'exceljs';

const components = [
  { code: 'cpu', categoryId: 47, name: 'CPU - Bộ vi xử lý', required: true, minSelections: 1, maxSelections: 1, ordering: 1 },
  { code: 'ssd', categoryId: 139, name: 'Ổ cứng SSD', required: true, minSelections: 1, maxSelections: 4, ordering: 2 },
  { code: 'hdd', categoryId: 143, name: 'Ổ cứng HDD', required: false, minSelections: 0, maxSelections: 4, ordering: 3 },
];

const products = [1, 2].map((id) => ({
  productId: id, name: `CPU catalog ${id}`, sku: `CPU-${id}`, thumbnail: '', brandId: 10,
  brandName: 'AMD', warranty: '36 tháng', price: id * 1_000_000, marketPrice: id * 1_100_000,
  buildPcPrice: id * 900_000,
  slug: `cpu-${id}`, compatible: true, selected: false, reasons: [],
}));

async function json(route: Route, data: unknown) {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
}

async function mockPcBuilder(page: Page, options: { quoteDelayMs?: number } = {}) {
  const stats = { quoteRequests: 0, lastSelections: [] as Array<{ componentCode: string; productId: number; quantity: number }> };
  await page.route('**/api/pc-builder/bootstrap', (route) => json(route, { enabled: true, ruleRevision: 'v1:test', minimumBudget: 2_000_000, components }));
  await page.route('**/api/pc-builder/candidates', async (route) => {
    const body = JSON.parse(route.request().postData() || '{}');
    await json(route, {
      items: products.map((product) => ({ ...product, selected: body.selections?.some((selection: { productId: number }) => selection.productId === product.productId) })),
      facets: { prices: [{ key: '1m_3m', label: '1 - 3 triệu', min: 1_000_000, max: 2_999_999, count: 2 }], brands: [{ id: 10, name: 'AMD', count: 2 }], attributes: [] },
      pagination: { page: 1, limit: 18, total: 2, totalPages: 1 },
      context: { constrained: false, relations: [] },
    });
  });
  await page.route('**/api/pc-builder/quote', async (route) => {
    stats.quoteRequests += 1;
    const body = JSON.parse(route.request().postData() || '{}');
    const selections = body.selections || [];
    stats.lastSelections = selections;
    if (options.quoteDelayMs) await new Promise((resolve) => setTimeout(resolve, options.quoteDelayMs));
    const hasSsd = selections.some((selection: { componentCode: string }) => ['ssd', 'storage'].includes(selection.componentCode));
    const hasCpu = selections.some((selection: { componentCode: string }) => selection.componentCode === 'cpu');
    const buildPriceEligible = hasCpu && hasSsd;
    const warnings = hasSsd ? [] : [{ ruleCode: 'missing_required_ssd', severity: 'warning', message: 'Cấu hình chưa có Ổ cứng SSD.', componentCodes: ['ssd'] }];
    const items = selections.map((selection: { componentCode: string; productId: number; quantity: number }) => {
      const legacySsd = selection.componentCode === 'storage';
      const regularPrice = legacySsd ? 3_890_000 : selection.productId * 1_000_000;
      const buildPcPrice = legacySsd ? null : selection.productId * 900_000;
      const price = buildPriceEligible && buildPcPrice ? buildPcPrice : regularPrice;
      return {
        ...products[0],
        name: legacySsd ? 'Ổ cứng SSD HIKSEMI legacy 1TB' : products[0].name,
        componentCode: legacySsd ? 'ssd' : selection.componentCode,
        productId: selection.productId,
        quantity: selection.quantity,
        price,
        regularPrice,
        cartPrice: regularPrice,
        buildPcPrice,
        buildPriceApplied: Boolean(buildPriceEligible && buildPcPrice),
        priceSource: buildPriceEligible && buildPcPrice ? 'pc_builder_price' : 'catalog',
        lineDiscount: buildPriceEligible && buildPcPrice ? (regularPrice - buildPcPrice) * selection.quantity : 0,
        promotion: null,
        lineTotal: price * selection.quantity,
        available: true,
      };
    });
    const total = items.reduce((sum: number, item: { lineTotal: number }) => sum + item.lineTotal, 0);
    const cartSubtotal = items.reduce((sum: number, item: { regularPrice: number; quantity: number }) => sum + item.regularPrice * item.quantity, 0);
    await json(route, {
      items,
      totals: { regularSubtotal: cartSubtotal, cartSubtotal, buildDiscount: cartSubtotal - total, subtotal: total, assemblyFee: 0, total, itemCount: selections.reduce((sum: number, selection: { quantity: number }) => sum + selection.quantity, 0) },
      diagnostics: warnings, compatible: true, requiresConfirmation: warnings.length > 0,
      missingRequiredComponents: hasSsd ? [] : [{ componentCode: 'ssd', name: 'Ổ cứng SSD', minSelections: 1, selectedCount: 0 }],
      ruleRevision: 'v6:test', catalogRevision: 'a'.repeat(64), promotionRevision: 'd'.repeat(64), buildPriceRevision: 'e'.repeat(64), buildPriceEligible, fingerprint: 'b'.repeat(64), warningSignature: 'c'.repeat(64),
    });
  });
  return stats;
}

test('quantity 1–4 is persisted, requoted and batch cart keeps cart pricing', async ({ page }) => {
  const stats = await mockPcBuilder(page);
  await page.goto('/xay-dung-cau-hinh-pc');
  const cpuRow = page.getByRole('article').filter({ hasText: 'CPU - Bộ vi xử lý' });
  await cpuRow.getByRole('button', { name: /Chọn CPU/ }).click();
  await page.getByRole('dialog', { name: 'CPU - Bộ vi xử lý' }).getByRole('button', { name: 'Thêm' }).first().click();
  const quantity = cpuRow.getByRole('group', { name: /Số lượng CPU catalog 1/ });
  await expect(quantity).toBeVisible();
  for (let index = 0; index < 3; index += 1) await quantity.getByRole('button', { name: 'Tăng số lượng' }).click();
  await expect(quantity.getByText('4', { exact: true })).toBeVisible();
  await expect(quantity.getByRole('button', { name: 'Tăng số lượng' })).toBeDisabled();
  await expect.poll(() => stats.lastSelections[0]?.quantity).toBe(4);
  await page.evaluate(() => window.addEventListener('hacom-cart-item-added', () => {
    (window as Window & { __batchEvents?: number }).__batchEvents = ((window as Window & { __batchEvents?: number }).__batchEvents || 0) + 1;
  }));
  await page.getByRole('button', { name: 'Thêm vào giỏ hàng' }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('hacom.cart.v1') || '[]')[0]?.quantity)).toBe(4);
  expect(await page.evaluate(() => (window as Window & { __batchEvents?: number }).__batchEvents)).toBe(1);
});

test('SKU Build PC price is previewed while incomplete and applied after every required group is selected', async ({ page }) => {
  await mockPcBuilder(page);
  await page.goto('/xay-dung-cau-hinh-pc');
  await expect(page.getByText(/Đã đủ 0\/2 nhóm bắt buộc/)).toBeVisible();

  const cpuRow = page.getByRole('article').filter({ hasText: 'CPU - Bộ vi xử lý' });
  await cpuRow.getByRole('button', { name: /Chọn CPU/ }).click();
  await expect(page.getByRole('dialog').getByText('Giá Build PC khi đủ bộ: 900.000đ')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Thêm' }).first().click();
  await expect(cpuRow.getByText('Giá Build PC khi đủ bộ: 900.000đ')).toBeVisible();
  await expect(page.getByText(/Đã đủ 1\/2 nhóm bắt buộc/)).toBeVisible();

  const ssdRow = page.getByRole('article').filter({ hasText: 'Ổ cứng SSD' });
  await ssdRow.getByRole('button', { name: /Chọn Ổ cứng SSD/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Thêm' }).nth(1).click();
  await page.keyboard.press('Escape');
  await expect(page.getByText(/Đã đủ 2\/2 nhóm bắt buộc · Giá Build PC đang được áp dụng/)).toBeVisible();
  await expect(cpuRow.getByText('Giá Build PC đang áp dụng: 900.000đ')).toBeVisible();
  await expect(page.locator('#pc-builder-v5-summary').getByText('-300.000đ')).toBeVisible();
});

test('Excel, PNG and print exports contain the current server quote', async ({ page }) => {
  await mockPcBuilder(page);
  await page.goto('/xay-dung-cau-hinh-pc');
  await page.getByRole('article').filter({ hasText: 'CPU - Bộ vi xử lý' }).getByRole('button', { name: /Chọn CPU/ }).click();
  await page.getByRole('dialog', { name: 'CPU - Bộ vi xử lý' }).getByRole('button', { name: 'Thêm' }).first().click();
  await expect(page.locator('#pc-builder-v5-summary').getByText('1 linh kiện')).toBeVisible();

  const excelPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Tải file Excel' }).click();
  const excel = await excelPromise;
  expect(excel.suggestedFilename()).toMatch(/\.xlsx$/);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load((await fs.readFile(await excel.path() as string)) as never);
  const worksheet = workbook.getWorksheet('Cấu hình PC');
  expect(worksheet).toBeTruthy();
  expect(worksheet!.getCell('B3').value).toBe('CPU catalog 1');

  const pngPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Tải ảnh cấu hình' }).click();
  const png = await pngPromise;
  expect(png.suggestedFilename()).toMatch(/\.png$/);
  expect(Array.from((await fs.readFile(await png.path() as string)).subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);

  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('[data-pc-builder-print]')).toBeVisible();
  await expect(page.locator('[data-pc-builder-print]').getByText('CPU catalog 1')).toBeVisible();
});

test('manual builder has no Auto UI and preserves accessible candidate dialog behavior', async ({ page }) => {
  await mockPcBuilder(page);
  await page.goto('/xay-dung-cau-hinh-pc');
  await expect(page.getByRole('heading', { name: 'Xây dựng cấu hình PC', exact: true })).toBeVisible();
  await expect(page.getByText(/Gaming tự động|benchmark/i)).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(accessibility.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')).toEqual([]);

  await page.getByRole('article').filter({ hasText: 'CPU - Bộ vi xử lý' }).getByRole('button', { name: /Chọn CPU/ }).click();
  const dialog = page.getByRole('dialog', { name: 'CPU - Bộ vi xử lý' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Tìm thấy 2 sản phẩm')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  await page.getByRole('article').filter({ hasText: 'CPU - Bộ vi xử lý' }).getByRole('button', { name: /Chọn CPU/ }).click();
  await dialog.getByRole('button', { name: 'Thêm' }).first().click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('article').filter({ hasText: 'CPU - Bộ vi xử lý' }).getByText('CPU catalog 1')).toBeVisible();
  await expect(page.locator('#pc-builder-v5-summary').getByText('Cấu hình chưa có Ổ cứng SSD.')).toBeVisible();

  await page.getByRole('button', { name: 'Đặt hàng ngay' }).click();
  const confirmation = page.getByRole('dialog', { name: 'Cấu hình chưa đầy đủ' });
  await expect(confirmation.getByText('Ổ cứng SSD', { exact: true })).toBeVisible();
});

test('empty draft keeps the builder summary at zero without requesting a quote', async ({ page }) => {
  const stats = await mockPcBuilder(page);
  await page.goto('/xay-dung-cau-hinh-pc');
  const summary = page.locator('#pc-builder-v5-summary');
  await expect(summary.getByText('0 linh kiện')).toBeVisible();
  await expect(summary.getByText('0đ', { exact: true })).toHaveCount(2);
  await expect(summary.getByRole('button', { name: 'Đặt hàng ngay' })).toBeDisabled();
  await page.waitForTimeout(400);
  expect(stats.quoteRequests).toBe(0);
});

test('legacy storage draft is normalized, shown in the SSD row, and persisted canonically', async ({ page }) => {
  await page.addInitScript((draftKey) => {
    localStorage.setItem(draftKey, JSON.stringify({
      version: 1,
      selections: [{ componentCode: 'storage', productId: 12922, quantity: 1 }],
      savedAt: new Date().toISOString(),
    }));
  }, 'hacom:pc-builder:draft:v1');
  await mockPcBuilder(page);
  await page.goto('/xay-dung-cau-hinh-pc');
  const ssdRow = page.getByRole('article').filter({ hasText: 'Ổ cứng SSD' });
  await expect(ssdRow.getByText('Ổ cứng SSD HIKSEMI legacy 1TB')).toBeVisible();
  await expect(page.getByText('Đã khôi phục 1 linh kiện từ cấu hình nháp.')).toBeVisible();
  const summary = page.locator('#pc-builder-v5-summary');
  await expect(summary.getByText('1 linh kiện')).toBeVisible();
  await expect(summary.getByText('3.890.000đ', { exact: true })).toHaveCount(2);
  await expect.poll(() => page.evaluate(() => {
    const draft = JSON.parse(localStorage.getItem('hacom:pc-builder:draft:v1') || '{}');
    return draft.selections?.[0]?.componentCode;
  })).toBe('ssd');
});

test('a delayed legacy quote cannot repopulate the summary after reset', async ({ page }) => {
  await page.addInitScript((draftKey) => {
    localStorage.setItem(draftKey, JSON.stringify({
      version: 1,
      selections: [{ componentCode: 'storage', productId: 12922, quantity: 1 }],
    }));
  }, 'hacom:pc-builder:draft:v1');
  const stats = await mockPcBuilder(page, { quoteDelayMs: 600 });
  await page.goto('/xay-dung-cau-hinh-pc');
  await expect.poll(() => stats.quoteRequests).toBe(1);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Làm lại cấu hình' }).click();
  const summary = page.locator('#pc-builder-v5-summary');
  await expect(summary.getByText('0 linh kiện')).toBeVisible();
  await page.waitForTimeout(800);
  await expect(summary.getByText('0 linh kiện')).toBeVisible();
  await expect(summary.getByText('3.890.000đ', { exact: true })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => {
    const draft = JSON.parse(localStorage.getItem('hacom:pc-builder:draft:v1') || '{}');
    return draft.selections?.length;
  })).toBe(0);
});

test('checkout requote replaces legacy storage before submitting the order', async ({ page }) => {
  await page.addInitScript((draftKey) => {
    localStorage.setItem(draftKey, JSON.stringify({
      version: 1,
      selections: [{ componentCode: 'storage', productId: 12922, quantity: 1 }],
    }));
    Object.defineProperty(window, 'grecaptcha', {
      configurable: true,
      value: { ready: (callback: () => void) => callback(), execute: async () => 'test-token' },
    });
  }, 'hacom:pc-builder:draft:v1');
  await mockPcBuilder(page);
  let submittedSelections: Array<{ componentCode: string }> = [];
  await page.route('**/api/pc-builder/orders', async (route) => {
    submittedSelections = JSON.parse(route.request().postData() || '{}').selections || [];
    await json(route, { orderId: 999 });
  });
  await page.goto('/thanh-toan-pc-builder');
  await expect(page.getByRole('heading', { name: 'Thông tin đặt hàng' })).toBeVisible();
  await page.getByLabel('Họ tên').fill('Nguyễn Văn Test');
  await page.getByLabel('Số điện thoại').fill('0912345678');
  await page.getByRole('textbox', { name: 'Email', exact: true }).fill('test@example.com');
  await page.getByRole('button', { name: /Đặt hàng/ }).click();
  await expect(page.getByText('Đặt cấu hình thành công')).toBeVisible();
  expect(submittedSelections).toEqual([{ componentCode: 'ssd', productId: 12922, quantity: 1 }]);
});
