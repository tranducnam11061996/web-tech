import { expect, test } from "@playwright/test";
import {
  normalizeVietnamPhone,
  validateEmail,
  validatePriceRange,
  validateQuantity,
  validateTaxCode,
  validateVietnamPhone,
  validateVoucher,
} from "../../src/lib/storefrontValidation";
import { mapCheckoutServerFields, validateCheckoutForm } from "../../src/lib/checkoutValidation";

test("chuẩn hóa và giải thích lỗi số điện thoại Việt Nam", () => {
  expect(normalizeVietnamPhone("+84 985-266-959")).toBe("0985266959");
  expect(validateVietnamPhone("")).toContain("nhập số điện thoại");
  expect(validateVietnamPhone("985266959")).toContain("bắt đầu");
  expect(validateVietnamPhone("09852669")).toContain("10 chữ số");
  expect(validateVietnamPhone("0123456789")).toContain("Đầu số");
  expect(validateVietnamPhone("0985 266 959")).toBe("");
});

test("validate các control nhẹ mà không cần request", () => {
  expect(validateEmail("sai-email")).toContain("không đúng định dạng");
  expect(validateQuantity(0)).toContain("1 đến 99");
  expect(validateQuantity(Number.NaN)).toContain("số nguyên");
  expect(validateVoucher("A".repeat(65))).toContain("64");
  expect(validateTaxCode("0123456789-001")).toBe("");
  expect(validatePriceRange(2_000_000, 1_000_000).maxPrice).toContain("lớn hơn");
});

test("checkout chỉ yêu cầu các nhóm điều kiện đang bật", () => {
  const base = {
    customerName: "Nguyễn Văn An", customerPhone: "0985266959", customerEmail: "",
    receiverEnabled: false, receiverName: "", receiverPhone: "", deliveryMethod: "pickup" as const,
    provinceCode: "", province: "", wardCode: "", ward: "", address: "", note: "",
    invoiceEnabled: false, companyName: "", taxCode: "", invoiceAddress: "", invoiceEmail: "",
    paymentMethod: "cod" as const,
  };
  expect(validateCheckoutForm(base)).toEqual({});
  const errors = validateCheckoutForm({ ...base, receiverEnabled: true, deliveryMethod: "shipping", invoiceEnabled: true });
  for (const field of ["receiverName", "receiverPhone", "provinceCode", "wardCode", "address", "companyName", "taxCode", "invoiceAddress", "invoiceEmail"]) expect(errors[field]).toBeTruthy();
});

test("ánh xạ field path từ API checkout về đúng input", () => {
  expect(mapCheckoutServerFields({ "customer.phone": "Sai số", "invoice.taxCode": "Sai MST" })).toEqual({ customerPhone: "Sai số", taxCode: "Sai MST" });
});

test("màn đăng ký báo lỗi điện thoại ngay dưới input sau blur", async ({ page }) => {
  await page.goto("/tai-khoan/dang-ky");
  const phone = page.locator("#register-phone");
  await phone.fill("985266959");
  await phone.blur();
  await expect(page.locator("#register-phone-error")).toContainText("bắt đầu bằng 0, 84 hoặc +84");
  await expect(phone).toHaveAttribute("aria-invalid", "true");
});
