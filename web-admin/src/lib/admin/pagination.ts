export const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
export const DEFAULT_PAGE_SIZE = 20;

type PaginationSearchParams =
  | URLSearchParams
  | Record<string, string | string[] | undefined>
  | null
  | undefined;

function firstParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getSearchParam(searchParams: PaginationSearchParams, name: string) {
  if (!searchParams) return undefined;
  if (searchParams instanceof URLSearchParams) return searchParams.get(name) ?? undefined;
  return firstParamValue(searchParams[name]);
}

function normalizePage(value: unknown) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function normalizePageSize(value: unknown) {
  const pageSize = Number(value);
  return PAGE_SIZE_OPTIONS.includes(pageSize as (typeof PAGE_SIZE_OPTIONS)[number])
    ? pageSize
    : DEFAULT_PAGE_SIZE;
}

export function parsePaginationParams(searchParams: PaginationSearchParams) {
  const page = normalizePage(getSearchParam(searchParams, 'page'));
  const limit = normalizePageSize(getSearchParam(searchParams, 'limit'));
  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
}

export function buildPagination(total: number, page: number, limit: number) {
  const safeTotal = Math.max(0, Number(total) || 0);
  const safePage = normalizePage(page);
  const safeLimit = normalizePageSize(limit);
  const totalPages = Math.max(1, Math.ceil(safeTotal / safeLimit));

  return {
    currentPage: safePage,
    page: safePage,
    totalPages,
    totalItems: safeTotal,
    total: safeTotal,
    pageSize: safeLimit,
    limit: safeLimit,
  };
}
