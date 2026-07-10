export const ADMIN_ACTIONS = ['read', 'create', 'update', 'delete', 'publish', 'execute'] as const;

export const ADMIN_RESOURCES = [
  'catalog.products',
  'catalog.categories',
  'catalog.attributes',
  'catalog.brands',
  'catalog.collections',
  'catalog.combo_sets',
  'catalog.product_frames',
  'catalog.product_groups',
  'catalog.card_rules',
  'content.articles',
  'content.article_categories',
  'content.menus',
  'marketing.banners',
  'marketing.banner_locations',
  'admin.users',
  'admin.roles',
  'admin.audit_logs',
  'admin.migrations',
] as const;

export type AdminAction = (typeof ADMIN_ACTIONS)[number];
export type AdminResource = (typeof ADMIN_RESOURCES)[number];
export type AdminPermission = `${AdminResource}.${AdminAction}` | '*';

export type PermissionDefinition = {
  resource: AdminResource;
  label: string;
  actions: AdminAction[];
  systemOnly?: boolean;
};

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  { resource: 'catalog.products', label: 'San pham', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'catalog.categories', label: 'Danh muc san pham', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'catalog.attributes', label: 'Thuoc tinh', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'catalog.brands', label: 'Thuong hieu', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'catalog.collections', label: 'Bo suu tap', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'catalog.combo_sets', label: 'Combo set', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'catalog.product_frames', label: 'Khung san pham', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'catalog.product_groups', label: 'Nhom san pham', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'catalog.card_rules', label: 'Thong so card', actions: ['read', 'update'] },
  { resource: 'content.articles', label: 'Bai viet', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'content.article_categories', label: 'Danh muc bai viet', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'content.menus', label: 'Menu', actions: ['read', 'create', 'update', 'delete', 'publish'] },
  { resource: 'marketing.banners', label: 'Banner', actions: ['read', 'create', 'update', 'delete', 'publish'] },
  { resource: 'marketing.banner_locations', label: 'Vi tri banner', actions: ['read', 'create', 'update', 'delete'] },
  { resource: 'admin.users', label: 'Tai khoan admin', actions: ['read', 'create', 'update', 'delete'], systemOnly: true },
  { resource: 'admin.roles', label: 'Vai tro admin', actions: ['read', 'create', 'update', 'delete'], systemOnly: true },
  { resource: 'admin.audit_logs', label: 'Nhat ky admin', actions: ['read'], systemOnly: true },
  { resource: 'admin.migrations', label: 'Migration admin', actions: ['execute'], systemOnly: true },
];

export type PermissionOverrides = {
  grant: AdminPermission[];
  revoke: AdminPermission[];
};

const systemResources = new Set(PERMISSION_DEFINITIONS.filter((item) => item.systemOnly).map((item) => item.resource));
const knownPermissions = new Set<string>([
  '*',
  ...PERMISSION_DEFINITIONS.flatMap((definition) => definition.actions.map((action) => `${definition.resource}.${action}`)),
]);

function permissionsForResources(resources: AdminResource[]) {
  return PERMISSION_DEFINITIONS
    .filter((definition) => resources.includes(definition.resource))
    .flatMap((definition) => definition.actions.map((action) => `${definition.resource}.${action}` as AdminPermission));
}

const catalogResources = ADMIN_RESOURCES.filter((resource) => resource.startsWith('catalog.'));
const contentResources = ADMIN_RESOURCES.filter((resource) => resource.startsWith('content.'));
const marketingResources: AdminResource[] = ['marketing.banners', 'marketing.banner_locations', 'catalog.collections'];
const businessResources = ADMIN_RESOURCES.filter((resource) => !resource.startsWith('admin.'));

export const SYSTEM_ROLE_TEMPLATES = [
  { code: 'superadmin', name: 'Superadmin', description: 'Toan quyen he thong', permissions: ['*'] as AdminPermission[], isSystem: true },
  { code: 'catalog_manager', name: 'Quan ly catalog', description: 'Quan ly du lieu san pham', permissions: permissionsForResources(catalogResources), isSystem: true },
  { code: 'content_manager', name: 'Quan ly noi dung', description: 'Quan ly bai viet va menu', permissions: permissionsForResources(contentResources), isSystem: true },
  { code: 'marketing_manager', name: 'Quan ly marketing', description: 'Quan ly banner va bo suu tap', permissions: permissionsForResources(marketingResources), isSystem: true },
  {
    code: 'viewer',
    name: 'Chi xem',
    description: 'Chi duoc xem du lieu nghiep vu',
    permissions: businessResources.map((resource) => `${resource}.read` as AdminPermission),
    isSystem: true,
  },
] as const;

export function normalizePermissions(value: unknown, allowSystem = false): AdminPermission[] {
  const source = Array.isArray(value) ? value : [];
  return Array.from(new Set(source.map((item) => String(item)).filter((permission) => {
    if (!knownPermissions.has(permission)) return false;
    if (permission === '*') return allowSystem;
    const resource = permission.slice(0, permission.lastIndexOf('.')) as AdminResource;
    return allowSystem || !systemResources.has(resource);
  }))) as AdminPermission[];
}

export function normalizeOverrides(value: unknown): PermissionOverrides {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    grant: normalizePermissions(source.grant),
    revoke: normalizePermissions(source.revoke),
  };
}

export function getEffectivePermissions(rolePermissions: unknown, overrides: unknown, roleCode: string): AdminPermission[] {
  if (roleCode === 'superadmin') return ['*'];
  const base = new Set(normalizePermissions(rolePermissions));
  const normalized = normalizeOverrides(overrides);
  normalized.grant.forEach((permission) => base.add(permission));
  normalized.revoke.forEach((permission) => base.delete(permission));
  return Array.from(base) as AdminPermission[];
}

export function hasPermission(permissions: readonly string[], permission: AdminPermission) {
  return permissions.includes('*') || permissions.includes(permission);
}

export function getPagePermission(pathname: string): AdminPermission | null {
  if (pathname.startsWith('/system/users')) return 'admin.users.read';
  if (pathname.startsWith('/system/roles')) return 'admin.roles.read';
  if (pathname.startsWith('/system/audit-logs')) return 'admin.audit_logs.read';
  if (pathname.startsWith('/product/product-list') || pathname.startsWith('/product/edit')) return 'catalog.products.read';
  if (pathname.startsWith('/product/categories')) return 'catalog.categories.read';
  if (pathname.startsWith('/product/attribute')) return 'catalog.attributes.read';
  if (pathname.startsWith('/product/brand')) return 'catalog.brands.read';
  if (pathname.startsWith('/product/collection')) return 'catalog.collections.read';
  if (pathname.startsWith('/product/combo-set')) return 'catalog.combo_sets.read';
  if (pathname.startsWith('/product/product-frame')) return 'catalog.product_frames.read';
  if (pathname.startsWith('/product/product-group')) return 'catalog.product_groups.read';
  if (pathname.startsWith('/product/card-attributes')) return 'catalog.card_rules.read';
  if (pathname.startsWith('/news/news-list') || pathname.startsWith('/news/edit')) return 'content.articles.read';
  if (pathname.startsWith('/news/news-category')) return 'content.article_categories.read';
  if (pathname.startsWith('/content/menu')) return 'content.menus.read';
  if (pathname.startsWith('/banner/banner-list') || pathname.startsWith('/banner/edit')) return 'marketing.banners.read';
  if (pathname.startsWith('/banner/locations')) return 'marketing.banner_locations.read';
  return null;
}

export function getApiPermission(pathname: string, method: string): AdminPermission | null {
  const action = method === 'GET' ? 'read' : method === 'POST' ? 'create' : method === 'PATCH' || method === 'PUT' ? 'update' : method === 'DELETE' ? 'delete' : null;
  if (!action) return null;
  if (pathname.includes('/api/admin/users')) return `admin.users.${pathname.includes('reset-password') ? 'update' : action}` as AdminPermission;
  if (pathname.includes('/api/admin/roles')) return `admin.roles.${action}` as AdminPermission;
  if (pathname.includes('/api/admin/audit-logs')) return 'admin.audit_logs.read';
  if (pathname.includes('/api/admin/migrate')) return 'admin.migrations.execute';
  if (pathname.includes('/api/admin/menus/header/publish')) return 'content.menus.publish';

  const resource = pathname.includes('/api/admin/article-categories') ? 'content.article_categories'
    : pathname.includes('/api/admin/articles') ? 'content.articles'
    : pathname.includes('/api/admin/banner-locations') ? 'marketing.banner_locations'
    : pathname.includes('/api/admin/banners') ? 'marketing.banners'
    : pathname.includes('/api/admin/collections') ? 'catalog.collections'
    : pathname.includes('/api/admin/combo-sets') ? 'catalog.combo_sets'
    : pathname.includes('/api/admin/menus') || pathname.includes('/api/admin/menu-link-targets') ? 'content.menus'
    : pathname.includes('/api/admin/product-card-attribute-rules') ? 'catalog.card_rules'
    : pathname.includes('/api/admin/product-categories') ? 'catalog.categories'
    : pathname.includes('/api/admin/product-groups') ? 'catalog.product_groups'
    : pathname.includes('/api/admin/attributes') ? 'catalog.attributes'
    : pathname.includes('/api/admin/brands') ? 'catalog.brands'
    : pathname.includes('/api/admin/products') ? 'catalog.products'
    : null;

  if (!resource) return null;
  if (pathname.includes('/images/upload') || pathname.endsWith('/images') || pathname.includes('/combo-sets') || pathname.includes('/products/')) {
    return `${resource}.update` as AdminPermission;
  }
  return `${resource}.${action}` as AdminPermission;
}
