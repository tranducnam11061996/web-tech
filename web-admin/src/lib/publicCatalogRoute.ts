export type PublicCatalogEntity = {
  entityId: number;
  type: 'category' | 'product';
};

const LEGACY_ROUTE_TYPES = new Set(['', '0']);
const CATEGORY_ID_PATH = /^module:product\/view:category\/view_id:(\d+)$/;
const PRODUCT_ID_PATH = /^module:product\/view:product-detail\/view_id:(\d+)$/;

function resolvedId(match: RegExpMatchArray | null) {
  const value = Number(match?.[1] || 0);
  return Number.isSafeInteger(value) && value > 0 ? value : 0;
}

export function classifyPublicCatalogRoute(idPathValue: unknown, urlTypeValue: unknown): PublicCatalogEntity | null {
  const idPath = String(idPathValue || '').trim();
  const urlType = String(urlTypeValue ?? '').trim();
  const categoryId = resolvedId(idPath.match(CATEGORY_ID_PATH));
  if (categoryId && (urlType === 'product:category' || LEGACY_ROUTE_TYPES.has(urlType))) {
    return { entityId: categoryId, type: 'category' };
  }
  const productId = resolvedId(idPath.match(PRODUCT_ID_PATH));
  if (productId && (urlType === 'product:product-detail' || LEGACY_ROUTE_TYPES.has(urlType))) {
    return { entityId: productId, type: 'product' };
  }
  return null;
}
