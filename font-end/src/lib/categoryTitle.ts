const FALLBACK_CATEGORY_TITLE = 'Danh mục sản phẩm';
const MIN_SEO_TITLE_LENGTH = 5;

function text(value: unknown) {
  return String(value ?? '').trim();
}

export function getCategoryDisplayTitle(metaTitle: unknown, categoryName: unknown) {
  const seoTitle = text(metaTitle);
  if (seoTitle.length >= MIN_SEO_TITLE_LENGTH) return seoTitle;

  return text(categoryName) || FALLBACK_CATEGORY_TITLE;
}
