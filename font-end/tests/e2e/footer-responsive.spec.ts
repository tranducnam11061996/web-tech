import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const GROUP_LENGTHS = [9, 5, 7, 5];

async function mockFooterMenus(page: Page) {
  await page.route("**/api/menu/footer", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          groups: GROUP_LENGTHS.map((length, groupIndex) => ({
            id: `qa-group-${groupIndex}`,
            label: groupIndex === 0 ? "SHOP QA" : `GROUP ${groupIndex + 1}`,
            links: Array.from({ length }, (_, linkIndex) => ({
              id: `qa-link-${groupIndex}-${linkIndex}`,
              label: groupIndex === 0 && linkIndex === 0 ? "Liên kết động QA" : `Link ${groupIndex + 1}.${linkIndex + 1}`,
              url: groupIndex === 0 && linkIndex === 0 ? "/category" : "#",
              suffixText: groupIndex === 0 && linkIndex === 0 ? "✦" : "",
            })),
          })),
        },
      }),
    });
  });

  await page.route("**/api/menu/bottom-footer", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: {
          heading: "ĐỐI TÁC QA",
          links: Array.from({ length: 19 }, (_, index) => ({
            id: `qa-partner-${index}`,
            label: `Đối tác ${index + 1}`,
            url: "#",
          })),
        },
      }),
    });
  });
}

async function openFooter(page: Page, path = "/") {
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));
  await mockFooterMenus(page);
  await page.goto(path);

  const footer = page.locator("[data-footer-root]");
  await expect(footer).toBeVisible();
  await footer.scrollIntoViewIfNeeded();
  await expect(footer.getByText("Liên kết động QA")).toBeVisible();
  await expect(footer.getByText("ĐỐI TÁC QA")).toBeVisible();

  return { footer, pageErrors };
}

test("Footer matches the 1800px centered desktop composition", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Exact desktop geometry is verified once.");
  await page.setViewportSize({ width: 2542, height: 1200 });

  const { footer, pageErrors } = await openFooter(page);
  const container = footer.locator("[data-footer-container]");
  const groups = footer.locator("[data-footer-group]");
  const contacts = footer.locator("[data-footer-contact-card]");
  const partnerTrack = footer.locator("[data-footer-partner-track]");
  const footerBox = await footer.boundingBox();
  const containerBox = await container.boundingBox();
  const groupBoxes = await groups.evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width };
  }));
  const contactBoxes = await contacts.evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width };
  }));
  const partnerAlignment = await partnerTrack.evaluate((element) => {
    const trackBox = element.getBoundingClientRect();
    const links = Array.from(element.querySelectorAll("a"));
    const firstBox = links[0].getBoundingClientRect();
    const lastBox = links[links.length - 1].getBoundingClientRect();
    return {
      left: firstBox.left - trackBox.left,
      right: trackBox.right - lastBox.right,
    };
  });

  expect(footerBox?.height).toBeLessThan(1095);
  expect(containerBox?.width).toBeCloseTo(1800, 0);
  expect(containerBox?.x).toBeCloseTo((2542 - 1800) / 2, 0);
  expect(groupBoxes).toHaveLength(4);
  expect(groupBoxes.every((box) => Math.abs(box.y - groupBoxes[0].y) < 1)).toBe(true);
  expect(groupBoxes[0].x).toBeGreaterThan((containerBox?.x ?? 0) + (containerBox?.width ?? 0) / 3);
  expect(contactBoxes).toHaveLength(4);
  expect(contactBoxes.every((box) => Math.abs(box.y - contactBoxes[0].y) < 1)).toBe(true);
  expect(contactBoxes.map((box) => Math.round(box.width))).toEqual([160, 230, 400, 210]);
  await expect(groups.first().locator("h4")).toHaveCSS("font-size", "13px");
  await expect(groups.first().locator("li").first()).toHaveCSS("font-size", "14px");
  await expect(contacts.first().locator("p")).toHaveCSS("font-size", "14px");
  await expect(footer.locator("[data-footer-socials]")).toBeVisible();
  await expect(footer.locator("[data-footer-certifications]")).toBeVisible();
  await expect(footer.locator("[data-footer-legal]")).toBeVisible();
  expect(partnerAlignment.left).toBeCloseTo(partnerAlignment.right, 0);
  const finalLine = footer.getByText(/Build PC/).last();
  const finalLineBox = await finalLine.boundingBox();
  expect((footerBox?.y ?? 0) + (footerBox?.height ?? 0) - ((finalLineBox?.y ?? 0) + (finalLineBox?.height ?? 0))).toBeCloseTo(64, 0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(pageErrors).toEqual([]);
});

test("Footer follows the mobile information sequence without horizontal overflow", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Exact mobile geometry is verified once.");
  await page.setViewportSize({ width: 395, height: 900 });

  const { footer, pageErrors } = await openFooter(page);
  const container = footer.locator("[data-footer-container]");
  const groups = footer.locator("[data-footer-group]");
  const contacts = footer.locator("[data-footer-contact-card]");
  const certifications = footer.locator("[data-footer-certifications] a");
  const containerBox = await container.boundingBox();
  const groupBoxes = await groups.evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width };
  }));
  const contactBoxes = await contacts.evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width };
  }));
  const certificationBoxes = await certifications.evaluateAll((elements) => elements.map((element) => {
    const box = element.getBoundingClientRect();
    return { y: box.y, width: box.width };
  }));

  expect(containerBox?.x).toBeCloseTo(0, 0);
  expect(containerBox?.width).toBeCloseTo(395, 0);
  expect(groupBoxes[0].x).toBeCloseTo(24, 0);
  expect(groupBoxes[1].x).toBeGreaterThan(groupBoxes[0].x + groupBoxes[0].width);
  expect(groupBoxes[2].y).toBeGreaterThan(groupBoxes[0].y);
  expect(contactBoxes.every((box) => Math.abs(box.x - 24) < 1 && Math.abs(box.width - 347) < 1)).toBe(true);
  expect(contactBoxes[1].y).toBeGreaterThan(contactBoxes[0].y);
  expect(certificationBoxes).toHaveLength(2);
  expect(certificationBoxes[0].y).toBeCloseTo(certificationBoxes[1].y, 0);
  await expect(footer.locator("[data-footer-payments]")).toHaveCSS("flex-wrap", "nowrap");
  const newsletterEmail = footer.locator("input[aria-label='Email nhận bản tin']");
  await expect(newsletterEmail).toBeEnabled();
  await newsletterEmail.fill("test.footer@tructiepgame.vn");
  await expect(newsletterEmail).toHaveValue("test.footer@tructiepgame.vn");
  await expect(footer.locator("[data-footer-newsletter] button")).toBeDisabled();
  await expect(footer.locator("#newsletter-unavailable")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  expect(pageErrors).toEqual([]);
});

test("Footer keeps its responsive column matrix at the locked breakpoints", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "The responsive matrix is verified once.");
  test.setTimeout(120_000);

  const widths = [360, 393, 396, 639, 640, 767, 768, 1014, 1015, 1279, 1280, 1535, 1536, 1800, 1920, 2542];

  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    const { footer } = await openFooter(page);
    const groups = footer.locator("[data-footer-group]");
    const contacts = footer.locator("[data-footer-contact-card]");
    const container = footer.locator("[data-footer-container]");
    const firstGroupY = await groups.first().evaluate((element) => element.getBoundingClientRect().y);
    const groupColumns = await groups.evaluateAll((elements, firstY) => elements.filter((element) => (
      Math.abs(element.getBoundingClientRect().y - firstY) < 1
    )).length, firstGroupY);
    const firstContactY = await contacts.first().evaluate((element) => element.getBoundingClientRect().y);
    const contactColumns = await contacts.evaluateAll((elements, firstY) => elements.filter((element) => (
      Math.abs(element.getBoundingClientRect().y - firstY) < 1
    )).length, firstContactY);

    expect(groupColumns).toBe(width < 768 ? 2 : 4);
    expect(contactColumns).toBe(width < 640 ? 1 : width < 1024 ? 2 : 4);
    expect((await container.boundingBox())?.width).toBeCloseTo(Math.min(width, 1800), 0);
    await expect(groups.first().locator("h4")).toHaveCSS("font-size", width < 1280 ? "12px" : "13px");
    await expect(groups.first().locator("li").first()).toHaveCSS("font-size", width < 1280 ? "13px" : "14px");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.unrouteAll({ behavior: "ignoreErrors" });
  }
});

test("Footer renders on shared routes and has no serious accessibility violations", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium", "Shared-route and accessibility checks run once.");
  await page.setViewportSize({ width: 395, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });

  const { footer, pageErrors } = await openFooter(page, "/flash-sale");
  await expect(footer.getByRole("link", { name: "Liên kết động QA" })).toHaveAttribute("href", "/category");
  await footer.getByRole("link", { name: "Instagram" }).focus();
  await expect(footer.getByRole("link", { name: "Instagram" })).toBeFocused();
  const partnerRail = footer.locator("[data-footer-partner-rail]");
  const partnerTrack = footer.locator("[data-footer-partner-track]");
  await expect(partnerRail).toHaveCSS("overflow-x", "auto");
  await expect(partnerTrack).toHaveCSS("justify-content", "center");

  const accessibility = await new AxeBuilder({ page })
    .include("[data-footer-root]")
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    accessibility.violations.filter((violation) => ["serious", "critical"].includes(violation.impact || "")),
  ).toEqual([]);
  expect(pageErrors).toEqual([]);
});
