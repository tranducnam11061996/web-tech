import { expect, test } from "@playwright/test";

test("Section 7 presents the laptop AI card in Vietnamese", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const section = page.locator("#section-7");
  const laptopCard = section.locator(".feature-card").first();
  await expect(laptopCard).toBeVisible();
  await expect(laptopCard.locator(".top-badge")).toHaveText(/AI hỗ trợ/i);
  await expect(laptopCard.locator(".feature-heading")).toContainText("Chưa Biết Chọn");
  await expect(laptopCard.locator(".feature-heading")).toContainText("Laptop Nào?");
  await expect(laptopCard.locator(".feature-desc")).toContainText("AI của TrucTiepGAME");
  await expect(laptopCard.locator(".cta-outlined")).toHaveText("✦ Xem chi tiết →");
  await expect(laptopCard.locator(".stat-row")).toContainText("8 triệu+ Ngân sách");
  await expect(laptopCard.locator(".stat-row")).toContainText("~40 giây Tốc độ");
  await expect(laptopCard.locator(".stat-row")).toContainText("200+ Mẫu máy");

  await expect(laptopCard).not.toContainText("Not Sure Which");
  await expect(laptopCard).not.toContainText("Launch Finder");
  expect(await laptopCard.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
});
