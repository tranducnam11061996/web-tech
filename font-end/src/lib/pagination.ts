export const CATALOG_PAGE_SIZE = 24;
export const MAX_CATALOG_PAGE = 1_000;

export function normalizeCatalogPage(value: unknown): number {
  const normalizedValue = Array.isArray(value) ? value[0] : value;
  if (typeof normalizedValue !== "string" && typeof normalizedValue !== "number") return 1;

  const rawValue = String(normalizedValue).trim();
  if (!/^\d+$/.test(rawValue)) return 1;

  const page = Number.parseInt(rawValue, 10);
  if (!Number.isSafeInteger(page) || page < 1) return 1;
  return Math.min(page, MAX_CATALOG_PAGE);
}

export function buildQueryPath(
  pathname: string,
  searchQuery: string,
  updates: Record<string, string | null>,
): string {
  const params = new URLSearchParams(searchQuery);

  Object.entries(updates).forEach(([key, value]) => {
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
  });

  const queryString = params.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}
