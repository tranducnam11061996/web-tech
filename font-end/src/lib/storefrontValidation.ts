export type FieldErrors = Record<string, string>;

const VIETNAM_MOBILE = /^(?:03[2-9]|05[25689]|07[06-9]|08[1-689]|09\d)\d{7}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TAX_CODE = /^\d{10}(?:-\d{3})?$/;
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;

export function normalizeVietnamPhone(value: string) {
  const compact = value.trim().replace(/[\s().-]/g, "");
  if (compact.startsWith("+84")) return `0${compact.slice(3)}`;
  if (compact.startsWith("84")) return `0${compact.slice(2)}`;
  return compact;
}

export function validateVietnamPhone(value: string, required = true) {
  const raw = value.trim();
  if (!raw) return required ? "Vui lòng nhập số điện thoại." : "";
  if (!/^(?:0|84|\+84)/.test(raw)) return "Số điện thoại phải bắt đầu bằng 0, 84 hoặc +84.";
  const normalized = normalizeVietnamPhone(raw);
  if (!/^\d+$/.test(normalized)) return "Số điện thoại chỉ được chứa chữ số và dấu phân cách thông dụng.";
  if (normalized.length !== 10) return "Số điện thoại phải có 10 chữ số sau khi chuẩn hóa.";
  if (!VIETNAM_MOBILE.test(normalized)) return "Đầu số điện thoại di động Việt Nam không hợp lệ.";
  return "";
}

export function validateName(value: string, label = "Họ tên", min = 2, max = 150) {
  const normalized = value.trim();
  if (!normalized) return `Vui lòng nhập ${label.toLowerCase()}.`;
  if (normalized.length < min) return `${label} phải có ít nhất ${min} ký tự.`;
  if (normalized.length > max) return `${label} không được vượt quá ${max} ký tự.`;
  if (CONTROL_CHARACTERS.test(normalized)) return `${label} chứa ký tự không hợp lệ.`;
  return "";
}

export function validateEmail(value: string, required = true) {
  const normalized = value.trim();
  if (!normalized) return required ? "Vui lòng nhập email." : "";
  if (normalized.length > 255) return "Email không được vượt quá 255 ký tự.";
  if (!EMAIL.test(normalized)) return "Email không đúng định dạng, ví dụ ten@example.com.";
  return "";
}

export function passwordValidationErrors(value: string) {
  const errors: string[] = [];
  if (!value) return ["Vui lòng nhập mật khẩu."];
  if (value.length < 8 || value.length > 128) errors.push("Mật khẩu phải từ 8 đến 128 ký tự.");
  if (!/[A-Z]/.test(value)) errors.push("Mật khẩu phải có ít nhất 1 chữ hoa.");
  if (!/[a-z]/.test(value)) errors.push("Mật khẩu phải có ít nhất 1 chữ thường.");
  if (!/\d/.test(value)) errors.push("Mật khẩu phải có ít nhất 1 chữ số.");
  if (!/[^A-Za-z0-9\s]/.test(value)) errors.push("Mật khẩu phải có ít nhất 1 ký tự đặc biệt.");
  return errors;
}

export function validatePassword(value: string) {
  return passwordValidationErrors(value)[0] || "";
}

export function validatePasswordConfirmation(password: string, confirmation: string) {
  if (!confirmation) return "Vui lòng nhập lại mật khẩu.";
  return password === confirmation ? "" : "Mật khẩu nhập lại chưa khớp.";
}

export function validateOtp(value: string) {
  if (!value.trim()) return "Vui lòng nhập mã xác thực.";
  return /^\d{6}$/.test(value.trim()) ? "" : "Mã xác thực phải gồm đúng 6 chữ số.";
}

export function validateBirthday(value: string) {
  if (!value) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Ngày sinh không hợp lệ.";
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return "Ngày sinh không hợp lệ.";
  if (date.getTime() > Date.now()) return "Ngày sinh không được ở tương lai.";
  return "";
}

export function validateAddress(value: string) {
  return validateName(value, "Địa chỉ", 3, 255);
}

export function validateTaxCode(value: string, required = true) {
  const normalized = value.trim().replace(/\s/g, "");
  if (!normalized) return required ? "Vui lòng nhập mã số thuế." : "";
  return TAX_CODE.test(normalized) ? "" : "Mã số thuế phải gồm 10 chữ số hoặc có dạng 0123456789-001.";
}

export function validateQuantity(value: unknown) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number)) return "Số lượng phải là số nguyên.";
  if (number < 1 || number > 99) return "Số lượng phải từ 1 đến 99.";
  return "";
}

export function validateVoucher(value: string) {
  const normalized = value.trim();
  if (!normalized) return "Vui lòng nhập mã voucher.";
  return normalized.length <= 64 ? "" : "Mã voucher không được vượt quá 64 ký tự.";
}

export function validateSearchQuery(value: string, required = false) {
  const normalized = value.trim();
  if (!normalized) return required ? "Vui lòng nhập từ khóa tìm kiếm." : "";
  return normalized.length <= 100 ? "" : "Từ khóa tìm kiếm không được vượt quá 100 ký tự.";
}

export function validatePriceRange(minValue: unknown, maxValue: unknown, bounds?: { min: number; max: number }) {
  const errors: FieldErrors = {};
  const min = Number(minValue);
  const max = Number(maxValue);
  if (!Number.isInteger(min) || min < 0) errors.minPrice = "Giá từ phải là số nguyên không âm.";
  if (!Number.isInteger(max) || max < 0) errors.maxPrice = "Giá đến phải là số nguyên không âm.";
  if (!errors.minPrice && bounds && (min < bounds.min || min > bounds.max)) errors.minPrice = `Giá từ phải trong khoảng ${bounds.min}–${bounds.max}.`;
  if (!errors.maxPrice && bounds && (max < bounds.min || max > bounds.max)) errors.maxPrice = `Giá đến phải trong khoảng ${bounds.min}–${bounds.max}.`;
  if (!errors.minPrice && !errors.maxPrice && min > max) errors.maxPrice = "Giá đến phải lớn hơn hoặc bằng giá từ.";
  return errors;
}

export function compactErrors(errors: FieldErrors) {
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => Boolean(message)));
}

export function focusFirstInvalidField(form: HTMLFormElement | null, errors: FieldErrors) {
  if (!form) return;
  const firstName = Object.keys(errors)[0];
  if (!firstName) return;
  const escaped = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(firstName) : firstName.replace(/["\\]/g, "\\$&");
  const direct = form.querySelector<HTMLElement>(`[name="${escaped}"], [data-field="${escaped}"]`);
  const locationFallback = firstName === "provinceCode"
    ? form.querySelector<HTMLElement>('[id$="-province"]')
    : firstName === "wardCode"
      ? form.querySelector<HTMLElement>('[id$="-ward"]')
      : null;
  (direct || locationFallback)?.focus();
}
