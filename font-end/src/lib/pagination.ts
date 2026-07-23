export const CATALOG_PAGE_SIZE = 24;
export const MAX_CATALOG_PAGE = 1_000;
export type PaginationItem = number | "...";

export function buildDesktopPaginationItems(
  currentPage: number,
  totalPages: number,
): PaginationItem[] {
  const range: number[] = [];
  const items: PaginationItem[] = [];
  let previousPage: number | undefined;

  for (let page = 1; page <= totalPages; page += 1) {
    if (
      page === 1 ||
      page === totalPages ||
      (currentPage <= 3 && page <= 5) ||
      (currentPage >= totalPages - 2 && page >= totalPages - 4) ||
      (page >= currentPage - 1 && page <= currentPage + 1)
    ) {
      range.push(page);
    }
  }

  for (const page of range) {
    if (previousPage) {
      if (page - previousPage === 2) items.push(previousPage + 1);
      else if (page - previousPage !== 1) items.push("...");
    }
    items.push(page);
    previousPage = page;
  }

  return items;
}

export function buildMobilePaginationItems(
  currentPage: number,
  totalPages: number,
): PaginationItem[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  if (currentPage <= 3) return [1, 2, 3, "...", totalPages];
  if (currentPage >= totalPages - 2) {
    return [1, "...", totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, "...", currentPage, "...", totalPages];
}

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
