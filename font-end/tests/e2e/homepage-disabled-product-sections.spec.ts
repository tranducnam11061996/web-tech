import { expect, test } from "@playwright/test";

const disabledSectionIds = ["section-6", "section-10", "section-12", "section-13"];

test("homepage omits dormant sections without disturbing surrounding sections", async ({ page }) => {
  const browserProductSectionRequests: string[] = [];
  const pageErrors: Error[] = [];

  page.on("request", (request) => {
    if (request.url().includes("/api/categories/homepage-product-sections")) {
      browserProductSectionRequests.push(request.url());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error));

  await page.goto("/");

  for (const sectionId of disabledSectionIds) {
    await expect(page.locator(`#${sectionId}`)).toHaveCount(0);
  }

  const retainedSections = page.locator("#section-5, #section-7, #section-9, #section-11, #section-14");
  await expect(retainedSections).toHaveCount(5);
  await expect(page.locator("#section-5")).toBeVisible();
  await expect(page.locator("#section-7")).toBeVisible();
  await expect(page.locator("#section-9")).toBeVisible();
  await expect(page.locator("#section-11")).toBeVisible();
  await expect(page.locator("#section-14")).toBeVisible();

  expect(await retainedSections.evaluateAll((sections) => sections.map((section) => section.id))).toEqual([
    "section-5",
    "section-7",
    "section-9",
    "section-11",
    "section-14",
  ]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(browserProductSectionRequests).toEqual([]);
  expect(pageErrors).toEqual([]);
});

test("homepage bootstrap loads product data only for the retained Section 17 pipeline", async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "The backend contract is viewport-independent.");

  const response = await request.get("http://localhost:3000/api/homepage/bootstrap?collectionId=896&collectionSlug=goi-y-cho-ban&collectionLimit=10");
  expect(response.ok()).toBe(true);
  const payload = await response.json();
  const sections = Array.isArray(payload?.data?.productSections?.sections)
    ? payload.data.productSections.sections
    : [];
  const categoryIds = sections.map((section: { category?: { id?: number } }) => Number(section.category?.id || 0));

  expect(categoryIds).not.toContain(178);
  expect(categoryIds).not.toContain(521);
  expect(categoryIds.every((categoryId: number) => categoryId === 1087)).toBe(true);
});
