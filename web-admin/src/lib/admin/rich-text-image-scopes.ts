export const RICH_TEXT_IMAGE_SCOPE_PERMISSIONS = {
  products: 'catalog.products.update',
  'product-categories': 'catalog.categories.update',
  collections: 'catalog.collections.update',
  articles: 'content.articles.update',
  'article-categories': 'content.article_categories.update',
} as const;

export type RichTextImageScope = keyof typeof RICH_TEXT_IMAGE_SCOPE_PERMISSIONS;
export type RichTextImagePermission = (typeof RICH_TEXT_IMAGE_SCOPE_PERMISSIONS)[RichTextImageScope];

export const RICH_TEXT_IMAGE_SCOPES = Object.freeze(
  Object.keys(RICH_TEXT_IMAGE_SCOPE_PERMISSIONS) as RichTextImageScope[],
);

export function isRichTextImageScope(value: unknown): value is RichTextImageScope {
  return Object.hasOwn(RICH_TEXT_IMAGE_SCOPE_PERMISSIONS, String(value));
}

export function getRichTextImagePermission(scope: unknown): RichTextImagePermission | null {
  return isRichTextImageScope(scope) ? RICH_TEXT_IMAGE_SCOPE_PERMISSIONS[scope] : null;
}

export function getRichTextImagePermissionFromPath(pathname: string): RichTextImagePermission | null {
  const match = pathname.match(/^\/api\/admin\/editor-images\/([^/]+)\/upload\/?$/);
  return match ? getRichTextImagePermission(match[1]) : null;
}
