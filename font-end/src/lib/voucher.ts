export const VOUCHER_STORAGE_KEY = 'hacom.cart.voucher.v1';

export function getAppliedVoucherCode() {
  if (typeof window === 'undefined') return '';
  try { return String(window.localStorage.getItem(VOUCHER_STORAGE_KEY) || '').trim().toUpperCase(); } catch { return ''; }
}

export function setAppliedVoucherCode(code: string) {
  if (typeof window === 'undefined') return;
  const normalized = String(code || '').trim().toUpperCase();
  try {
    if (normalized) window.localStorage.setItem(VOUCHER_STORAGE_KEY, normalized);
    else window.localStorage.removeItem(VOUCHER_STORAGE_KEY);
  } catch {}
}
