import { expect, test, type Page, type Route } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const components = [
  { code: 'cpu', categoryId: 47, name: 'CPU - Bộ vi xử lý', required: true, minSelections: 1, maxSelections: 1, ordering: 1 },
  { code: 'ssd', categoryId: 139, name: 'Ổ cứng SSD', required: true, minSelections: 1, maxSelections: 4, ordering: 2 },
  { code: 'hdd', categoryId: 143, name: 'Ổ cứng HDD', required: false, minSelections: 0, maxSelections: 4, ordering: 3 },
];

const products = [1, 2].map((id) => ({
  productId: id, name: `CPU catalog ${id}`, sku: `CPU-${id}`, thumbnail: '', brandId: 10,
  brandName: 'AMD', warranty: '36 tháng', price: id * 1_000_000, marketPrice: id * 1_100_000,
  slug: `cpu-${id}`, compatible: true, selected: false, reasons: [],
}));

async function json(route: Route, data: unknown) {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
}

async function mockPcBuilder(page: Page, options: { quoteDelayMs?: number } = {}) {
  const stats = { quoteRequests: 0 };
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
    if (options.quoteDelayMs) await new Promise((resolve) => setTimeout(resolve, options.quoteDelayMs));
    const hasSsd = selections.some((selection: { componentCode: string }) => ['ssd', 'storage'].includes(selection.componentCode));
    const warnings = hasSsd ? [] : [{ ruleCode: 'missing_required_ssd', severity: 'warning', message: 'Cấu hình chưa có Ổ cứng SSD.', componentCodes: ['ssd'] }];
    const items = selections.map((selection: { componentCode: string; productId: number; quantity: number }) => {
      const legacySsd = selection.componentCode === 'storage';
      const price = legacySsd ? 3_890_000 : 1_000_000;
      return {
        ...products[0],
        name: legacySsd ? 'Ổ cứng SSD HIKSEMI legacy 1TB' : products[0].name,
        componentCode: legacySsd ? 'ssd' : selection.componentCode,
        productId: selection.productId,
        quantity: 1,
        price,
        lineTotal: price,
        available: true,
      };
    });
    const total = items.reduce((sum: number, item: { lineTotal: number }) => sum + item.lineTotal, 0);
    await json(route, {
      items,
      totals: { subtotal: total, assemblyFee: 0, total, itemCount: selections.length },
      diagnostics: warnings, compatible: true, requiresConfirmation: warnings.length > 0,
      missingRequiredComponents: hasSsd ? [] : [{ componentCode: 'ssd', name: 'Ổ cứng SSD', minSelections: 1, selectedCount: 0 }],
      ruleRevision: 'v4:test', catalogRevision: 'a'.repeat(64), fingerprint: 'b'.repeat(64), warningSignature: 'c'.repeat(64),
    });
  });
  return stats;
}

test('manual builder has no Auto UI and preserves accessible candidate dialog behavior', async ({ page }) => {
  await mockPcBuilder(page);
  await page.goto('/xay-dung-cau-hinh-pc');
  await expect(page.getByRole('heading', { name: 'Xây dựng cấu hình PC của bạn' })).toBeVisible();
  await expect(page.getByText(/Gaming tự động|benchmark/i)).toHaveCount(0);
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  expect(accessibility.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')).toEqual([]);

  await page.getByRole('article').filter({ hasText: 'CPU - Bộ vi xử lý' }).getByRole('button', { name: /Chọn linh kiện/ }).click();
  const dialog = page.getByRole('dialog', { name: 'CPU - Bộ vi xử lý' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Tìm thấy 2 sản phẩm')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  await page.getByRole('article').filter({ hasText: 'CPU - Bộ vi xử lý' }).getByRole('button', { name: /Chọn linh kiện/ }).click();
  await dialog.getByRole('button', { name: 'Thêm' }).first().click();
  await expect(dialog).toBeHidden();
  await expect(page.getByLabel('Danh sách danh mục linh kiện').getByText('CPU catalog 1')).toBeVisible();
  await expect(page.getByText('Cấu hình chưa có Ổ cứng SSD.')).toBeVisible();

  await page.getByRole('button', { name: 'Đặt mua & lắp ráp' }).click();
  const confirmation = page.getByRole('dialog', { name: 'Cấu hình chưa đầy đủ' });
  await expect(confirmation.getByText('Ổ cứng SSD', { exact: true })).toBeVisible();
});

test('empty draft keeps the builder summary at zero without requesting a quote', async ({ page }) => {
  const stats = await mockPcBuilder(page);
  await page.goto('/xay-dung-cau-hinh-pc');
  const summary = page.locator('#pc-builder-summary');
  await expect(summary.getByText('0 linh kiện')).toBeVisible();
  await expect(summary.getByText('0đ', { exact: true })).toHaveCount(2);
  await expect(summary.getByRole('button', { name: 'Đặt mua & lắp ráp' })).toBeDisabled();
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
  const summary = page.locator('#pc-builder-summary');
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
  await page.getByRole('button', { name: 'Làm lại' }).click();
  const summary = page.locator('#pc-builder-summary');
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
