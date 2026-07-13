const LEGACY_PRODUCT_MEDIA = 'https://hacom.vn/media/product';

export function resolveProductImageUrl(value: unknown, fallback = '') {
  const raw = String(value || '').trim();
  if (!raw || raw === '0') return fallback;
  if (raw.startsWith('/')) return raw;
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'https:' ? parsed.toString() : fallback;
  } catch {
    return `${LEGACY_PRODUCT_MEDIA}/${raw.replace(/^\/+/, '')}`;
  }
}
