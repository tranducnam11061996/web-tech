import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { AdminApiError, maybeText, requireText, toBoolInt, toInt, withTransaction } from '@/lib/admin/common';
import { HEADER_MENU_ICON_PATHS, HEADER_MENU_SEED, type HeaderMenuSeed, type HeaderMenuSeedNode } from '@/lib/header-menu-seed';
import { resolveHeaderSystemKey, resolveHeaderSystemUrl } from '@/lib/headerMenuUtilities';
import { clearPublicMenuCache as clearPublicMenuRuntimeCache } from '@/lib/publicMenus';

export type HeaderMenuArea = 'zones' | 'faves' | 'topNav' | 'utilityLinks' | 'circleStory' | 'shopByCategory';
export type HeaderMenuNodeType = 'zone' | 'group' | 'link';
export type HeaderMenuLinkMode = 'custom' | 'entity' | 'system';
export type HeaderMenuEntityType = 'product-category' | 'article-category';

export type HeaderMenuDraftNode = {
  id?: number | string;
  area?: HeaderMenuArea;
  nodeType: HeaderMenuNodeType;
  label: string;
  iconKey?: string;
  badgeText?: string;
  suffixText?: string;
  backgroundColor?: string;
  imageUrl?: string;
  subText?: string;
  linkMode?: HeaderMenuLinkMode;
  entityType?: HeaderMenuEntityType;
  entityId?: number;
  customUrl?: string;
  urlOverride?: string;
  ordering?: number;
  isActive?: boolean | number;
  desktopVisible?: boolean | number;
  mobileVisible?: boolean | number;
  children?: HeaderMenuDraftNode[];
};

export type HeaderMenuDraft = Record<HeaderMenuArea, HeaderMenuDraftNode[]>;

export type HeaderMenuSettings = {
  zonesLabel: string;
  favesLabel: string;
};

type MenuVersionRow = RowDataPacket & {
  id: number;
  menu_id: number;
  version_number: number;
  status: string;
  created_at: Date;
  updated_at: Date;
  published_at: Date | null;
  settings_json: string | null;
};

type MenuItemRow = RowDataPacket & {
  id: number;
  version_id: number;
  area: HeaderMenuArea;
  parent_id: number | null;
  node_type: HeaderMenuNodeType;
  label: string;
  icon_key: string;
  badge_text: string;
  suffix_text: string;
  background_color: string;
  image_url: string;
  sub_text: string;
  link_mode: HeaderMenuLinkMode;
  entity_type: HeaderMenuEntityType | '';
  entity_id: number | null;
  custom_url: string;
  url_override: string;
  ordering: number;
  is_active: number;
  desktop_visible: number;
  mobile_visible: number;
};

const HEADER_MENU_CODE = 'header';
const HEADER_MENU_AREAS: HeaderMenuArea[] = ['zones', 'faves', 'topNav', 'utilityLinks', 'circleStory', 'shopByCategory'];
const HEADER_RUNTIME_AREAS: HeaderMenuArea[] = ['zones', 'faves', 'topNav', 'utilityLinks'];
const HOMEPAGE_RUNTIME_AREAS: HeaderMenuArea[] = ['circleStory', 'shopByCategory'];
const DEFAULT_HEADER_MENU_SETTINGS: HeaderMenuSettings = {
  zonesLabel: 'Danh Mục',
  favesLabel: 'Nổi bật',
};
const PUBLIC_MENU_CACHE_TTL_MS = 5 * 60 * 1000;
const PUBLIC_MENU_FALLBACK_CACHE_TTL_MS = 10 * 1000;

type PublicMenuCacheKey = 'header' | 'homepage';
type PublicMenuPayload = Record<string, unknown> & {
  meta?: Record<string, unknown> & { fallback?: boolean };
};
type PublicMenuCacheEntry = {
  value: PublicMenuPayload;
  expiresAt: number;
};

const publicMenuCache = new Map<PublicMenuCacheKey, PublicMenuCacheEntry>();
const publicMenuInflight = new Map<PublicMenuCacheKey, Promise<PublicMenuPayload>>();
let publicMenuCacheGeneration = 0;

const MENU_TEXT_REPAIRS: Array<[RegExp, string]> = [
  [/Danh M\u00e1\u00bb\u00a5c/g, 'Danh Mục'],
  [/N\u00e1\u00bb\u2022i b\u00e1\u00ba\u00adt/g, 'Nổi bật'],
  [/\u00f0\u0178\u201d\u00a5/g, '\uD83D\uDD25'],
  [/\u00f0\u0178\u2019\u00bb/g, '\uD83D\uDCBB'],
  [/\u00f0\u0178\u00a4\u2013/g, '\uD83E\uDD16'],
  [/\u00f0\u0178\u008f\u00b7\u00ef\u00b8\u008f/g, '\uD83C\uDFF7\uFE0F'],
  [/\u00e2\u008f\u00b3/g, '\u23F3'],
  [/\u00e2\u203a\u201e/g, '\u26C4'],
  [/\u00e2\u0153\u00a8/g, '\u2728'],
  [/\u00e2\u0161\u00a1/g, '\u26A1'],
  [/\u00e2\u0161\u2122\u00ef\u00b8\u008f/g, '\u2699\uFE0F'],
];

function repairMenuText(value: unknown) {
  let text = String(value || '');
  for (const [broken, fixed] of MENU_TEXT_REPAIRS) {
    text = text.replace(broken, fixed);
  }
  return text;
}

function normalizeHeaderMenuSettings(value: unknown): HeaderMenuSettings {
  const parsed = typeof value === 'string' && value.trim()
    ? (() => {
        try {
          return JSON.parse(value);
        } catch {
          return {};
        }
      })()
    : typeof value === 'object' && value
      ? value as Record<string, unknown>
      : {};

  return {
    zonesLabel: repairMenuText(requireText((parsed as Record<string, unknown>).zonesLabel || DEFAULT_HEADER_MENU_SETTINGS.zonesLabel, 'zonesLabel', 'Nhan Danh Muc', 80)),
    favesLabel: repairMenuText(requireText((parsed as Record<string, unknown>).favesLabel || DEFAULT_HEADER_MENU_SETTINGS.favesLabel, 'favesLabel', 'Nhan Noi bat', 80)),
  };
}

function settingsJson(settings?: unknown) {
  return JSON.stringify(normalizeHeaderMenuSettings(settings || DEFAULT_HEADER_MENU_SETTINGS));
}

export async function ensureHeaderMenuTables(db: PoolConnection | typeof pool = pool) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS web_admin_menus (
      id int unsigned NOT NULL AUTO_INCREMENT,
      code varchar(64) NOT NULL,
      name varchar(255) NOT NULL,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_web_admin_menus_code (code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS web_admin_menu_versions (
      id int unsigned NOT NULL AUTO_INCREMENT,
      menu_id int unsigned NOT NULL,
      version_number int unsigned NOT NULL DEFAULT 1,
      status varchar(24) NOT NULL,
      settings_json text NULL,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      published_at timestamp NULL DEFAULT NULL,
      PRIMARY KEY (id),
      KEY idx_web_admin_menu_versions_menu_status (menu_id, status),
      KEY idx_web_admin_menu_versions_published (menu_id, published_at),
      CONSTRAINT fk_web_admin_menu_versions_menu
        FOREIGN KEY (menu_id) REFERENCES web_admin_menus(id)
        ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [versionColumns] = await db.query<RowDataPacket[]>(
    `SHOW COLUMNS FROM web_admin_menu_versions LIKE 'settings_json'`,
  );
  if (versionColumns.length === 0) {
    await db.query(`ALTER TABLE web_admin_menu_versions ADD COLUMN settings_json text NULL AFTER status`);
  }
  await db.query(
    `UPDATE web_admin_menu_versions SET settings_json = ? WHERE settings_json IS NULL OR settings_json = ''`,
    [settingsJson()],
  );

  await db.query(`
    CREATE TABLE IF NOT EXISTS web_admin_menu_items (
      id int unsigned NOT NULL AUTO_INCREMENT,
      version_id int unsigned NOT NULL,
      area varchar(32) NOT NULL,
      parent_id int unsigned NULL,
      node_type varchar(24) NOT NULL,
      label varchar(255) NOT NULL,
      icon_key varchar(64) NOT NULL DEFAULT '',
      badge_text varchar(64) NOT NULL DEFAULT '',
      suffix_text varchar(64) NOT NULL DEFAULT '',
      background_color varchar(6) NOT NULL DEFAULT '',
      image_url varchar(512) NOT NULL DEFAULT '',
      sub_text varchar(255) NOT NULL DEFAULT '',
      link_mode varchar(24) NOT NULL DEFAULT 'custom',
      entity_type varchar(64) NOT NULL DEFAULT '',
      entity_id int unsigned NULL,
      custom_url varchar(512) NOT NULL DEFAULT '',
      url_override varchar(512) NOT NULL DEFAULT '',
      ordering int NOT NULL DEFAULT 0,
      is_active tinyint(1) NOT NULL DEFAULT 1,
      desktop_visible tinyint(1) NOT NULL DEFAULT 1,
      mobile_visible tinyint(1) NOT NULL DEFAULT 1,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_web_admin_menu_items_version_area (version_id, area, parent_id, ordering),
      KEY idx_web_admin_menu_items_parent (parent_id),
      KEY idx_web_admin_menu_items_entity (entity_type, entity_id),
      CONSTRAINT fk_web_admin_menu_items_version
        FOREIGN KEY (version_id) REFERENCES web_admin_menu_versions(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT fk_web_admin_menu_items_parent
        FOREIGN KEY (parent_id) REFERENCES web_admin_menu_items(id)
        ON DELETE CASCADE ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const itemColumns: Array<[string, string]> = [
    ['background_color', `ALTER TABLE web_admin_menu_items ADD COLUMN background_color varchar(6) NOT NULL DEFAULT '' AFTER suffix_text`],
    ['image_url', `ALTER TABLE web_admin_menu_items ADD COLUMN image_url varchar(512) NOT NULL DEFAULT '' AFTER background_color`],
    ['sub_text', `ALTER TABLE web_admin_menu_items ADD COLUMN sub_text varchar(255) NOT NULL DEFAULT '' AFTER image_url`],
  ];
  for (const [column, statement] of itemColumns) {
    const [columns] = await db.query<RowDataPacket[]>(`SHOW COLUMNS FROM web_admin_menu_items LIKE ?`, [column]);
    if (columns.length === 0) await db.query(statement);
  }
}

async function getHeaderMenuId(connection: PoolConnection) {
  await connection.query(
    'INSERT INTO web_admin_menus (code, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)',
    [HEADER_MENU_CODE, 'Header menu'],
  );
  const [rows] = await connection.query<RowDataPacket[]>('SELECT id FROM web_admin_menus WHERE code = ? LIMIT 1', [HEADER_MENU_CODE]);
  const id = Number(rows[0]?.id || 0);
  if (!id) throw new AdminApiError(500, 'INTERNAL_ERROR', 'Khong the khoi tao menu header');
  return id;
}

async function createVersion(
  connection: PoolConnection,
  menuId: number,
  status: 'draft' | 'published' | 'archived',
  settings: Partial<HeaderMenuSettings> | null = DEFAULT_HEADER_MENU_SETTINGS,
) {
  const [maxRows] = await connection.query<RowDataPacket[]>(
    'SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version FROM web_admin_menu_versions WHERE menu_id = ?',
    [menuId],
  );
  const versionNumber = Number(maxRows[0]?.next_version || 1);
  const [result] = await connection.query(
    `
      INSERT INTO web_admin_menu_versions (menu_id, version_number, status, settings_json, published_at)
      VALUES (?, ?, ?, ?, ${status === 'published' ? 'CURRENT_TIMESTAMP' : 'NULL'})
    `,
    [menuId, versionNumber, status, settingsJson(settings)],
  );
  return Number((result as { insertId?: number }).insertId || 0);
}

function normalizeArea(value: unknown): HeaderMenuArea {
  return HEADER_MENU_AREAS.includes(value as HeaderMenuArea) ? (value as HeaderMenuArea) : 'zones';
}

function normalizeNodeType(value: unknown, fallback: HeaderMenuNodeType): HeaderMenuNodeType {
  return ['zone', 'group', 'link'].includes(String(value)) ? (String(value) as HeaderMenuNodeType) : fallback;
}

function normalizeLinkMode(value: unknown): HeaderMenuLinkMode {
  return ['entity', 'system'].includes(String(value)) ? (String(value) as HeaderMenuLinkMode) : 'custom';
}

function normalizeEntityType(value: unknown): HeaderMenuEntityType | '' {
  return ['product-category', 'article-category'].includes(String(value)) ? (String(value) as HeaderMenuEntityType) : '';
}

function cleanUrl(value: unknown) {
  return maybeText(value, 512);
}

function cleanHexColor(value: unknown) {
  const text = String(value || '').trim().replace(/^#/, '').toLowerCase();
  return /^[0-9a-f]{3}([0-9a-f]{3})?$/.test(text) ? text.slice(0, 6) : '';
}

async function insertNodeTree(
  connection: PoolConnection,
  versionId: number,
  area: HeaderMenuArea,
  parentId: number | null,
  nodes: HeaderMenuDraftNode[] | HeaderMenuSeedNode[],
  fallbackType: HeaderMenuNodeType,
) {
  for (const [index, rawNode] of nodes.entries()) {
    const nodeType = normalizeNodeType(rawNode.nodeType, fallbackType);
    const label = requireText(rawNode.label, 'label', 'Ten menu', 255);
    const linkMode = normalizeLinkMode(rawNode.linkMode);
    const entityType = normalizeEntityType(rawNode.entityType);
    const entityId = toInt(rawNode.entityId);
    const [result] = await connection.query(
      `
        INSERT INTO web_admin_menu_items
          (version_id, area, parent_id, node_type, label, icon_key, badge_text, suffix_text,
           background_color, image_url, sub_text, link_mode, entity_type, entity_id, custom_url,
           url_override, ordering, is_active, desktop_visible, mobile_visible)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        versionId,
        area,
        parentId,
        nodeType,
        label,
        maybeText(rawNode.iconKey, 64),
        maybeText(rawNode.badgeText, 64),
        maybeText(rawNode.suffixText, 64),
        cleanHexColor(rawNode.backgroundColor),
        cleanUrl(rawNode.imageUrl),
        maybeText(rawNode.subText, 255),
        linkMode,
        entityType,
        entityId > 0 ? entityId : null,
        cleanUrl(rawNode.customUrl),
        cleanUrl(rawNode.urlOverride),
        toInt((rawNode as HeaderMenuDraftNode).ordering, index),
        toBoolInt(rawNode.isActive, 1),
        toBoolInt(rawNode.desktopVisible, 1),
        toBoolInt(rawNode.mobileVisible, 1),
      ],
    );
    const id = Number((result as { insertId?: number }).insertId || 0);
    const childFallback = nodeType === 'zone' ? 'group' : 'link';
    if (id && rawNode.children?.length) {
      await insertNodeTree(connection, versionId, area, id, rawNode.children, childFallback);
    }
  }
}

async function populateVersion(connection: PoolConnection, versionId: number, data: HeaderMenuDraft | HeaderMenuSeed) {
  for (const area of HEADER_MENU_AREAS) {
    const fallbackType: HeaderMenuNodeType = area === 'zones' ? 'zone' : 'link';
    await insertNodeTree(connection, versionId, area, null, data[area] || [], fallbackType);
  }
}

async function backfillSeedArea(connection: PoolConnection, versionId: number, area: HeaderMenuArea) {
  const seedNodes = HEADER_MENU_SEED[area] || [];
  if (seedNodes.length === 0) return;

  const [rows] = await connection.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS total FROM web_admin_menu_items WHERE version_id = ? AND area = ?',
    [versionId, area],
  );
  if (Number(rows[0]?.total || 0) > 0) {
    if (area === 'shopByCategory') {
      for (const node of seedNodes) {
        await connection.query(
          `
            UPDATE web_admin_menu_items
            SET
              icon_key = CASE WHEN icon_key = '' THEN ? ELSE icon_key END,
              badge_text = CASE WHEN badge_text = '' THEN ? ELSE badge_text END,
              background_color = CASE WHEN background_color = '' THEN ? ELSE background_color END,
              image_url = CASE WHEN image_url = '' THEN ? ELSE image_url END,
              custom_url = CASE WHEN custom_url = '' THEN ? ELSE custom_url END
            WHERE version_id = ?
              AND area = ?
              AND parent_id IS NULL
              AND node_type = 'link'
              AND label = ?
          `,
          [
            node.iconKey || '',
            node.badgeText || '',
            node.backgroundColor || '',
            node.imageUrl || '',
            node.customUrl || '#',
            versionId,
            area,
            node.label,
          ],
        );
      }
    }
    return;
  }

  await insertNodeTree(connection, versionId, area, null, seedNodes, area === 'zones' ? 'zone' : 'link');
}

async function backfillNewSeedAreas(connection: PoolConnection, menuId: number) {
  const [versions] = await connection.query<RowDataPacket[]>('SELECT id FROM web_admin_menu_versions WHERE menu_id = ?', [menuId]);
  for (const version of versions) {
    await backfillSeedArea(connection, Number(version.id), 'shopByCategory');
  }
}

async function copyItemsToVersion(connection: PoolConnection, sourceVersionId: number, targetVersionId: number) {
  const [rows] = await connection.query<MenuItemRow[]>(
    'SELECT * FROM web_admin_menu_items WHERE version_id = ? ORDER BY parent_id ASC, ordering ASC, id ASC',
    [sourceVersionId],
  );
  const byParent = new Map<number | null, MenuItemRow[]>();
  for (const row of rows) {
    const parent = row.parent_id ? Number(row.parent_id) : null;
    if (!byParent.has(parent)) byParent.set(parent, []);
    byParent.get(parent)!.push(row);
  }
  const idMap = new Map<number, number>();

  async function copyChildren(parentId: number | null) {
    const children = byParent.get(parentId) || [];
    for (const row of children) {
      const [result] = await connection.query(
        `
          INSERT INTO web_admin_menu_items
            (version_id, area, parent_id, node_type, label, icon_key, badge_text, suffix_text,
             background_color, image_url, sub_text, link_mode, entity_type, entity_id, custom_url,
             url_override, ordering, is_active, desktop_visible, mobile_visible)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          targetVersionId,
          row.area,
          parentId ? idMap.get(parentId) || null : null,
          row.node_type,
          row.label,
          row.icon_key,
          row.badge_text,
          row.suffix_text,
          row.background_color,
          row.image_url,
          row.sub_text,
          row.link_mode,
          row.entity_type,
          row.entity_id,
          row.custom_url,
          row.url_override,
          row.ordering,
          row.is_active,
          row.desktop_visible,
          row.mobile_visible,
        ],
      );
      idMap.set(Number(row.id), Number((result as { insertId?: number }).insertId || 0));
      await copyChildren(Number(row.id));
    }
  }

  await copyChildren(null);
}

export async function ensureHeaderMenuSeeded(connection?: PoolConnection) {
  const run = async (conn: PoolConnection) => {
    await ensureHeaderMenuTables(conn);
    const menuId = await getHeaderMenuId(conn);
    const [versions] = await conn.query<RowDataPacket[]>('SELECT id, status FROM web_admin_menu_versions WHERE menu_id = ?', [menuId]);

    if (versions.length === 0) {
      const draftId = await createVersion(conn, menuId, 'draft');
      await populateVersion(conn, draftId, HEADER_MENU_SEED);
      const publishedId = await createVersion(conn, menuId, 'published');
      await populateVersion(conn, publishedId, HEADER_MENU_SEED);
      return { menuId, draftId, publishedId };
    }

    const hasDraft = versions.some((row) => row.status === 'draft');
    if (!hasDraft) {
      const draftId = await createVersion(conn, menuId, 'draft');
      const [publishedRows] = await conn.query<RowDataPacket[]>(
        `SELECT id FROM web_admin_menu_versions WHERE menu_id = ? AND status = 'published' ORDER BY published_at DESC, id DESC LIMIT 1`,
        [menuId],
      );
      if (publishedRows[0]?.id) {
        await copyItemsToVersion(conn, Number(publishedRows[0].id), draftId);
      } else {
        await populateVersion(conn, draftId, HEADER_MENU_SEED);
      }
    }

    await backfillNewSeedAreas(conn, menuId);

    return { menuId };
  };

  if (connection) return run(connection);
  return withTransaction(run);
}

async function getVersion(connection: PoolConnection | typeof pool, status: 'draft' | 'published') {
  const [rows] = await connection.query<MenuVersionRow[]>(
    `
      SELECT v.*
      FROM web_admin_menu_versions v
      JOIN web_admin_menus m ON m.id = v.menu_id
      WHERE m.code = ? AND v.status = ?
      ORDER BY ${status === 'published' ? 'v.published_at DESC,' : ''} v.id DESC
      LIMIT 1
    `,
    [HEADER_MENU_CODE, status],
  );
  return rows[0] || null;
}

async function loadItems(connection: PoolConnection | typeof pool, versionId: number) {
  const [rows] = await connection.query<MenuItemRow[]>(
    'SELECT * FROM web_admin_menu_items WHERE version_id = ? ORDER BY area ASC, parent_id ASC, ordering ASC, id ASC',
    [versionId],
  );
  return rows;
}

function rowToDraftNode(row: MenuItemRow): HeaderMenuDraftNode {
  return {
    id: row.id,
    area: row.area,
    nodeType: row.node_type,
    label: row.label,
    iconKey: row.icon_key || '',
    badgeText: row.badge_text || '',
    suffixText: row.suffix_text || '',
    backgroundColor: row.background_color || '',
    imageUrl: row.image_url || '',
    subText: row.sub_text || '',
    linkMode: row.link_mode || 'custom',
    entityType: row.entity_type || undefined,
    entityId: row.entity_id || undefined,
    customUrl: row.custom_url || '',
    urlOverride: row.url_override || '',
    ordering: row.ordering || 0,
    isActive: row.is_active === 1,
    desktopVisible: row.desktop_visible === 1,
    mobileVisible: row.mobile_visible === 1,
    children: [],
  };
}

function buildDraftTree(rows: MenuItemRow[]): HeaderMenuDraft {
  const nodeMap = new Map<number, HeaderMenuDraftNode>();
  const draft: HeaderMenuDraft = { zones: [], faves: [], topNav: [], utilityLinks: [], circleStory: [], shopByCategory: [] };

  for (const row of rows) nodeMap.set(Number(row.id), rowToDraftNode(row));
  for (const row of rows) {
    const node = nodeMap.get(Number(row.id));
    if (!node) continue;
    const parentId = row.parent_id ? Number(row.parent_id) : null;
    if (parentId && nodeMap.has(parentId)) {
      nodeMap.get(parentId)!.children!.push(node);
    } else {
      draft[normalizeArea(row.area)].push(node);
    }
  }
  return draft;
}

function countNodes(nodes: HeaderMenuDraftNode[]): number {
  return nodes.reduce((total, node) => total + 1 + countNodes(node.children || []), 0);
}

function countDraft(draft: HeaderMenuDraft) {
  return HEADER_MENU_AREAS.reduce((total, area) => total + countNodes(draft[area] || []), 0);
}

export async function getHeaderMenuAdmin() {
  await ensureHeaderMenuSeeded();
  const draftVersion = await getVersion(pool, 'draft');
  if (!draftVersion) throw new AdminApiError(404, 'NOT_FOUND', 'Khong tim thay ban nhap menu header');
  const publishedVersion = await getVersion(pool, 'published');
  const draft = buildDraftTree(await loadItems(pool, draftVersion.id));

  return {
    menu: draft,
    settings: normalizeHeaderMenuSettings(draftVersion.settings_json),
    draft: {
      id: draftVersion.id,
      versionNumber: draftVersion.version_number,
      updatedAt: draftVersion.updated_at,
      itemCount: countDraft(draft),
    },
    published: publishedVersion
      ? {
          id: publishedVersion.id,
          versionNumber: publishedVersion.version_number,
          publishedAt: publishedVersion.published_at,
        }
      : null,
    hasUnpublishedChanges: !publishedVersion || new Date(draftVersion.updated_at).getTime() > new Date(publishedVersion.published_at || 0).getTime(),
    iconOptions: Object.keys(HEADER_MENU_ICON_PATHS).map((key) => ({ key, path: HEADER_MENU_ICON_PATHS[key] })),
  };
}

export async function saveHeaderMenuDraft(draft: HeaderMenuDraft, settings?: Partial<HeaderMenuSettings> | null) {
  return withTransaction(async (connection) => {
    await ensureHeaderMenuSeeded(connection);
    const draftVersion = await getVersion(connection, 'draft');
    if (!draftVersion) throw new AdminApiError(404, 'NOT_FOUND', 'Khong tim thay ban nhap menu header');
    await connection.query('DELETE FROM web_admin_menu_items WHERE version_id = ?', [draftVersion.id]);
    await populateVersion(connection, draftVersion.id, draft);
    await connection.query(
      'UPDATE web_admin_menu_versions SET settings_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [settingsJson(settings || draftVersion.settings_json), draftVersion.id],
    );
    return { id: draftVersion.id, itemCount: countDraft(draft) };
  });
}

export async function publishHeaderMenuDraft() {
  return withTransaction(async (connection) => {
    await ensureHeaderMenuSeeded(connection);
    const [menuRows] = await connection.query<RowDataPacket[]>('SELECT id FROM web_admin_menus WHERE code = ? LIMIT 1', [HEADER_MENU_CODE]);
    const menuId = Number(menuRows[0]?.id || 0);
    const draftVersion = await getVersion(connection, 'draft');
    if (!menuId || !draftVersion) throw new AdminApiError(404, 'NOT_FOUND', 'Khong tim thay ban nhap menu header');
    await connection.query(`UPDATE web_admin_menu_versions SET status = 'archived' WHERE menu_id = ? AND status = 'published'`, [menuId]);
    const publishedId = await createVersion(connection, menuId, 'published', normalizeHeaderMenuSettings(draftVersion.settings_json));
    await copyItemsToVersion(connection, draftVersion.id, publishedId);
    clearPublicMenuRuntimeCache();
    return { id: publishedId };
  });
}

type UrlMaps = {
  product: Map<number, string>;
  article: Map<number, string>;
};

async function loadUrlMaps(rows: MenuItemRow[]): Promise<UrlMaps> {
  const productIds = Array.from(new Set(rows.filter((row) => row.entity_type === 'product-category' && row.entity_id).map((row) => Number(row.entity_id))));
  const articleIds = Array.from(new Set(rows.filter((row) => row.entity_type === 'article-category' && row.entity_id).map((row) => Number(row.entity_id))));
  const product = new Map<number, string>();
  const article = new Map<number, string>();

  if (productIds.length > 0) {
    const [catRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, url FROM idv_seller_category WHERE id IN (${productIds.map(() => '?').join(',')})`,
      productIds,
    );
    for (const row of catRows) product.set(Number(row.id), row.url ? `/${String(row.url).replace(/^\/+/, '')}` : `/category?id=${row.id}`);
  }

  if (articleIds.length > 0) {
    const [catRows] = await pool.query<RowDataPacket[]>(
      `SELECT id, url FROM idv_seller_news_category WHERE id IN (${articleIds.map(() => '?').join(',')})`,
      articleIds,
    );
    for (const row of catRows) article.set(Number(row.id), row.url ? `/tin-tuc/${String(row.url).replace(/^\/+/, '')}` : `/tin-tuc?category=${row.id}`);
  }

  return { product, article };
}

function resolveItemUrl(row: MenuItemRow, maps: UrlMaps) {
  if (row.url_override) return row.url_override;
  if (row.link_mode === 'entity' && row.entity_type === 'product-category' && row.entity_id) {
    return maps.product.get(Number(row.entity_id)) || `/category?id=${row.entity_id}`;
  }
  if (row.link_mode === 'entity' && row.entity_type === 'article-category' && row.entity_id) {
    return maps.article.get(Number(row.entity_id)) || `/tin-tuc?category=${row.entity_id}`;
  }
  if (row.link_mode === 'system') return resolveHeaderSystemUrl(row.custom_url);
  return row.custom_url || '#';
}

function rowToPublicLink(row: MenuItemRow, maps: UrlMaps) {
  const label = repairMenuText(row.label);
  const badgeText = repairMenuText(row.badge_text);
  const suffixText = repairMenuText(row.suffix_text);

  return {
    id: String(row.id),
    label,
    name: label,
    url: resolveItemUrl(row, maps),
    iconKey: row.icon_key || '',
    icon: row.icon_key ? HEADER_MENU_ICON_PATHS[row.icon_key] || HEADER_MENU_ICON_PATHS.more : '',
    badgeText,
    suffixText,
    suffix: suffixText,
    backgroundColor: row.background_color || '',
    imageUrl: row.image_url || '',
    subText: repairMenuText(row.sub_text || ''),
    linkMode: row.link_mode,
    systemKey: resolveHeaderSystemKey(row.link_mode, row.custom_url),
    entityType: row.entity_type || undefined,
    entityId: row.entity_id || undefined,
    isActive: row.is_active === 1,
    desktopVisible: row.desktop_visible === 1,
    mobileVisible: row.mobile_visible === 1,
  };
}

async function getCachedPublicMenu(key: PublicMenuCacheKey, loader: () => Promise<PublicMenuPayload>) {
  const now = Date.now();
  const cached = publicMenuCache.get(key);
  if (cached && cached.expiresAt > now) return cached.value;

  const inflight = publicMenuInflight.get(key);
  if (inflight) return inflight;

  const generation = publicMenuCacheGeneration;
  const promise = loader()
    .then((payload) => {
      const cachedAt = new Date().toISOString();
      const value = {
        ...payload,
        meta: {
          ...(payload.meta || {}),
          cacheKey: key,
          cacheCreatedAt: cachedAt,
        },
      };
      const ttl = value.meta?.fallback ? PUBLIC_MENU_FALLBACK_CACHE_TTL_MS : PUBLIC_MENU_CACHE_TTL_MS;
      if (generation === publicMenuCacheGeneration) {
        publicMenuCache.set(key, { value, expiresAt: Date.now() + ttl });
      }
      return value;
    })
    .finally(() => {
      if (generation === publicMenuCacheGeneration) {
        publicMenuInflight.delete(key);
      }
    });

  publicMenuInflight.set(key, promise);
  return promise;
}

export function clearPublicMenuCache() {
  publicMenuCacheGeneration += 1;
  publicMenuCache.clear();
  publicMenuInflight.clear();
}

async function buildPublishedPublicMenu() {
  try {
    const version = await getVersion(pool, 'published');
    if (!version) return buildPublicMenuFromSeed();
    const rows = (await loadItems(pool, version.id)).filter((row) => row.is_active === 1);
    const maps = await loadUrlMaps(rows);
    return buildPublicMenu(rows, maps, {
      versionNumber: version.version_number,
      publishedAt: version.published_at,
      fallback: false,
      labels: normalizeHeaderMenuSettings(version.settings_json),
    });
  } catch (error) {
    console.error('[HeaderMenu] Falling back to seed:', error);
    return buildPublicMenuFromSeed();
  }
}

function pickHeaderMenu(menu: ReturnType<typeof buildPublicMenu>) {
  return {
    zones: menu.zones,
    faves: menu.faves,
    topNav: menu.topNav,
    utilityLinks: menu.utilityLinks,
    labels: menu.labels,
    settings: menu.settings,
    meta: {
      ...(menu.meta || {}),
      areas: HEADER_RUNTIME_AREAS,
    },
  };
}

function pickHomepageMenu(menu: ReturnType<typeof buildPublicMenu>) {
  return {
    circleStory: menu.circleStory,
    shopByCategory: menu.shopByCategory,
    meta: {
      ...(menu.meta || {}),
      areas: HOMEPAGE_RUNTIME_AREAS,
    },
  };
}

export async function getPublishedHeaderMenu() {
  return getCachedPublicMenu('header', async () => pickHeaderMenu(await buildPublishedPublicMenu()));
}

export async function getPublishedHomepageMenu() {
  return getCachedPublicMenu('homepage', async () => pickHomepageMenu(await buildPublishedPublicMenu()));
}

function buildPublicMenu(rows: MenuItemRow[], maps: UrlMaps, meta: Record<string, unknown>) {
  const settings = normalizeHeaderMenuSettings(meta.labels || DEFAULT_HEADER_MENU_SETTINGS);
  const labels = { zones: settings.zonesLabel, faves: settings.favesLabel };
  const byParent = new Map<number | null, MenuItemRow[]>();
  for (const row of rows) {
    const parent = row.parent_id ? Number(row.parent_id) : null;
    if (!byParent.has(parent)) byParent.set(parent, []);
    byParent.get(parent)!.push(row);
  }
  for (const siblings of byParent.values()) siblings.sort((a, b) => (a.ordering - b.ordering) || (a.id - b.id));

  const zoneRows = (byParent.get(null) || []).filter((row) => row.area === 'zones' && row.node_type === 'zone');
  const zones = zoneRows.map((zoneRow) => {
    const groupRows = byParent.get(Number(zoneRow.id)) || [];
    return {
      ...rowToPublicLink(zoneRow, maps),
      cols: groupRows
        .filter((groupRow) => groupRow.node_type === 'group')
        .map((groupRow) => ({
          id: String(groupRow.id),
          title: repairMenuText(groupRow.label),
          label: repairMenuText(groupRow.label),
          items: (byParent.get(Number(groupRow.id)) || [])
            .filter((itemRow) => itemRow.node_type === 'link')
            .map((itemRow) => rowToPublicLink(itemRow, maps)),
        })),
    };
  });

  const rootLinks = (area: HeaderMenuArea) =>
    (byParent.get(null) || [])
      .filter((row) => row.area === area && row.node_type === 'link')
      .map((row) => rowToPublicLink(row, maps));

  return {
    zones,
    faves: rootLinks('faves'),
    topNav: rootLinks('topNav'),
    utilityLinks: rootLinks('utilityLinks'),
    circleStory: rootLinks('circleStory'),
    shopByCategory: rootLinks('shopByCategory'),
    labels,
    settings,
    meta: { ...meta, labels, settings },
  };
}

function seedToRows(data: HeaderMenuSeed) {
  let id = 1;
  const rows: MenuItemRow[] = [];

  function add(area: HeaderMenuArea, parentId: number | null, nodes: HeaderMenuSeedNode[]) {
    for (const [index, node] of nodes.entries()) {
      const rowId = id++;
      rows.push({
        id: rowId,
        version_id: 0,
        area,
        parent_id: parentId,
        node_type: node.nodeType,
        label: node.label,
        icon_key: node.iconKey || '',
        badge_text: node.badgeText || '',
        suffix_text: node.suffixText || '',
        background_color: node.backgroundColor || '',
        image_url: node.imageUrl || '',
        sub_text: node.subText || '',
        link_mode: node.linkMode || 'custom',
        entity_type: node.entityType || '',
        entity_id: node.entityId || null,
        custom_url: node.customUrl || '#',
        url_override: node.urlOverride || '',
        ordering: index,
        is_active: node.isActive === false ? 0 : 1,
        desktop_visible: node.desktopVisible === false ? 0 : 1,
        mobile_visible: node.mobileVisible === false ? 0 : 1,
      } as MenuItemRow);
      if (node.children?.length) add(area, rowId, node.children);
    }
  }

  for (const area of HEADER_MENU_AREAS) add(area, null, data[area] || []);
  return rows;
}

export function buildPublicMenuFromSeed() {
  return buildPublicMenu(seedToRows(HEADER_MENU_SEED), { product: new Map(), article: new Map() }, { fallback: true, labels: DEFAULT_HEADER_MENU_SETTINGS });
}

export async function searchMenuLinkTargets(type: string, query: string) {
  const normalizedType = type === 'article-category' ? 'article-category' : 'product-category';
  const search = `%${String(query || '').trim()}%`;
  if (normalizedType === 'article-category') {
    const [rows] = await pool.query<RowDataPacket[]>(
      `
        SELECT id, name, url
        FROM idv_seller_news_category
        WHERE status = 1 AND (? = '%%' OR name LIKE ? OR url LIKE ?)
        ORDER BY ordering DESC, id DESC
        LIMIT 30
      `,
      [search, search, search],
    );
    return rows.map((row) => ({
      id: Number(row.id),
      type: normalizedType,
      label: String(row.name || ''),
      url: row.url ? `/tin-tuc/${String(row.url).replace(/^\/+/, '')}` : `/tin-tuc?category=${row.id}`,
    }));
  }

  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT id, name, url
      FROM idv_seller_category
      WHERE status = 1 AND (? = '%%' OR name LIKE ? OR url LIKE ?)
      ORDER BY ordering DESC, id DESC
      LIMIT 30
    `,
    [search, search, search],
  );
  return rows.map((row) => ({
    id: Number(row.id),
    type: normalizedType,
    label: String(row.name || ''),
    url: row.url ? `/${String(row.url).replace(/^\/+/, '')}` : `/category?id=${row.id}`,
  }));
}
