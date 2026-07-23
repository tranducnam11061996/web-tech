export type VoucherNumericField =
  | 'totalQuantity'
  | 'discountValue'
  | 'maxDiscount'
  | 'minimumOrderValue';

export type VoucherNumericInput = {
  quantityMode: 'limited' | 'unlimited';
  totalQuantity: string;
  discountType: 'fixed' | 'percent';
  discountValue: string;
  maxDiscount: string;
  minimumOrderValue: string;
};

export type VoucherNumericPayload = {
  totalQuantity: number;
  discountValue: number;
  maxDiscount: number;
  minimumOrderValue: number;
};

export type VoucherNumericValidation = {
  errors: Partial<Record<VoucherNumericField, string>>;
  payload: VoucherNumericPayload | null;
};

export function normalizeVoucherDigits(value: string) {
  return value.replace(/\D/g, '');
}

function parseSafeInteger(value: string) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function validateVoucherNumericFields(input: VoucherNumericInput): VoucherNumericValidation {
  const errors: Partial<Record<VoucherNumericField, string>> = {};
  const totalQuantity = parseSafeInteger(input.totalQuantity);
  const discountValue = parseSafeInteger(input.discountValue);
  const maxDiscount = parseSafeInteger(input.maxDiscount);
  const minimumOrderValue = input.minimumOrderValue === '' ? 0 : parseSafeInteger(input.minimumOrderValue);

  if (input.quantityMode === 'limited' && (totalQuantity === null || totalQuantity <= 0)) {
    errors.totalQuantity = 'Tổng lượt sử dụng phải là số nguyên lớn hơn 0.';
  }

  if (discountValue === null || discountValue <= 0) {
    errors.discountValue = 'Giá trị giảm phải là số nguyên lớn hơn 0.';
  } else if (input.discountType === 'percent' && discountValue > 100) {
    errors.discountValue = 'Phần trăm giảm không được vượt quá 100.';
  }

  if (input.discountType === 'percent') {
    if (maxDiscount === null || maxDiscount <= 0) {
      errors.maxDiscount = 'Mức giảm tối đa phải là số nguyên lớn hơn 0.';
    } else if (maxDiscount % 1000 !== 0) {
      errors.maxDiscount = 'Mức giảm tối đa phải chia hết cho 1.000.';
    }
  }

  if (minimumOrderValue === null || minimumOrderValue < 0) {
    errors.minimumOrderValue = 'Giá trị đơn tối thiểu phải là số nguyên không âm.';
  }

  if (Object.keys(errors).length > 0) {
    return { errors, payload: null };
  }

  return {
    errors,
    payload: {
      totalQuantity: totalQuantity ?? 1,
      discountValue: discountValue!,
      maxDiscount: maxDiscount ?? 1000,
      minimumOrderValue: minimumOrderValue!,
    },
  };
}
