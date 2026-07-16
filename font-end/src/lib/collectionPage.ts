export type CollectionSort = "" | "price_asc" | "price_desc";

export function normalizeCollectionSort(value: string | string[] | undefined): CollectionSort {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === "price_asc" || candidate === "price_desc" ? candidate : "";
}

export function normalizeCollectionPage(value: string | string[] | undefined) {
  const candidate = Array.isArray(value) ? value[0] : value;
  const page = Number(candidate || 1);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function collectionPageHref(slug: string, sort: CollectionSort, page = 1) {
  const params = new URLSearchParams();
  if (sort) params.set("sort", sort);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return `/collection/${encodeURIComponent(slug)}${query ? `?${query}` : ""}`;
}

export function collectionPaginationRange(currentPage: number, totalPages: number) {
  const range: number[] = [];
  const result: Array<number | "..."> = [];
  let lastPage: number | undefined;

  for (let page = 1; page <= totalPages; page += 1) {
    if (page === 1 || page === totalPages) range.push(page);
    else if (currentPage <= 3 && page <= 5) range.push(page);
    else if (currentPage >= totalPages - 2 && page >= totalPages - 4) range.push(page);
    else if (page >= currentPage - 1 && page <= currentPage + 1) range.push(page);
  }

  for (const page of range) {
    if (lastPage !== undefined) {
      if (page - lastPage === 2) result.push(lastPage + 1);
      else if (page - lastPage !== 1) result.push("...");
    }
    result.push(page);
    lastPage = page;
  }

  return result;
}
