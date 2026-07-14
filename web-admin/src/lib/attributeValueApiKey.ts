export const ATTRIBUTE_VALUE_API_KEY_MAX_LENGTH = 200;

const ATTRIBUTE_VALUE_API_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function createAttributeValueApiKey(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, ATTRIBUTE_VALUE_API_KEY_MAX_LENGTH)
    .replace(/-+$/g, '');
}

export function isAttributeValueApiKey(value: unknown): value is string {
  const candidate = String(value ?? '');
  return candidate.length > 0
    && candidate.length <= ATTRIBUTE_VALUE_API_KEY_MAX_LENGTH
    && ATTRIBUTE_VALUE_API_KEY_PATTERN.test(candidate);
}
