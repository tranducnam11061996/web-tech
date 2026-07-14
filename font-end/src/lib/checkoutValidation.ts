import {
  compactErrors,
  validateAddress,
  validateEmail,
  validateName,
  validateTaxCode,
  validateVietnamPhone,
  type FieldErrors,
} from "@/lib/storefrontValidation";

export type CheckoutValues = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  receiverEnabled: boolean;
  receiverName: string;
  receiverPhone: string;
  deliveryMethod: "shipping" | "pickup";
  provinceCode: string;
  province: string;
  wardCode: string;
  ward: string;
  address: string;
  note: string;
  invoiceEnabled: boolean;
  companyName: string;
  taxCode: string;
  invoiceAddress: string;
  invoiceEmail: string;
  paymentMethod: "cod" | "bank_transfer";
};

export function validateCheckoutForm(form: CheckoutValues) {
  const errors: FieldErrors = {
    customerName: validateName(form.customerName),
    customerPhone: validateVietnamPhone(form.customerPhone),
    customerEmail: validateEmail(form.customerEmail, false),
  };
  if (form.receiverEnabled) {
    errors.receiverName = validateName(form.receiverName, "Họ tên người nhận");
    errors.receiverPhone = validateVietnamPhone(form.receiverPhone);
  }
  if (form.deliveryMethod === "shipping") {
    if (!form.provinceCode || !form.province.trim()) errors.provinceCode = "Vui lòng chọn tỉnh/thành phố.";
    if (!form.wardCode || !form.ward.trim()) errors.wardCode = "Vui lòng chọn phường/xã/đặc khu.";
    errors.address = validateAddress(form.address);
  }
  if (form.note.length > 1000) errors.note = "Ghi chú không được vượt quá 1.000 ký tự.";
  if (form.invoiceEnabled) {
    errors.companyName = validateName(form.companyName, "Tên công ty", 2, 255);
    errors.taxCode = validateTaxCode(form.taxCode);
    errors.invoiceAddress = validateAddress(form.invoiceAddress);
    errors.invoiceEmail = validateEmail(form.invoiceEmail);
  }
  if (!(["cod", "bank_transfer"] as string[]).includes(form.paymentMethod)) errors.paymentMethod = "Phương thức thanh toán không hợp lệ.";
  return compactErrors(errors);
}

const SERVER_FIELD_MAP: Record<string, string> = {
  "customer.name": "customerName",
  "customer.phone": "customerPhone",
  "customer.email": "customerEmail",
  "receiver.name": "receiverName",
  "receiver.phone": "receiverPhone",
  "delivery.provinceCode": "provinceCode",
  "delivery.wardCode": "wardCode",
  "delivery.address": "address",
  "delivery.note": "note",
  "invoice.companyName": "companyName",
  "invoice.taxCode": "taxCode",
  "invoice.address": "invoiceAddress",
  "invoice.email": "invoiceEmail",
  paymentMethod: "paymentMethod",
};

export function mapCheckoutServerFields(fields: FieldErrors) {
  const mapped: FieldErrors = {};
  for (const [field, message] of Object.entries(fields)) mapped[SERVER_FIELD_MAP[field] || field] = message;
  return mapped;
}
