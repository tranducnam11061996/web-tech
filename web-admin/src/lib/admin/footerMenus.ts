import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { AdminApiError, maybeText, requireText, toBoolInt, withTransaction } from '@/lib/admin/common';
import { clearFooterMenuCache } from '@/lib/footerMenus';
import { createFooterMenuDraft } from '@/lib/footer-menu-seed';
import { assertFooterMenuDraft } from '@/lib/admin/managedFooterMenuValidation';
import { ensureHeaderMenuTables, type HeaderMenuDraft, type HeaderMenuDraftNode } from './menus';

const FOOTER_MENU_CODE = 'footer';
const FOOTER_MENU_NAME = 'Footer Menu';
const FOOTER_AREA = 'zones';

type FooterVersionRow = RowDataPacket & {
  id: number;
  menu_id: number;
  version_number: number;
  status: string;
  created_at: Date;
  updated_at: Date;
  published_at: Date | null;
};

type FooterItemRow = RowDataPacket & {
  id: number;
  version_id: number;
  parent_id: number | null;
  node_type: 'zone' | 'group' | 'link';
  label: string;
  suffix_text: string;
  custom_url: string;
  url_override: string;
  ordering: number;
  is_active: number;
  desktop_visible: number;
  mobile_visible: number;
};

function emptyFooterDraft() {
  return createFooterMenuDraft();
}

function footerNodeCount(nodes: HeaderMenuDraftNode[]): number {
  return nodes.reduce((total, node) => total + 1 + footerNodeCount(node.children || []), 0);
}

async function getMenuId(connection: PoolConnection) {
  await connection.query(
    'INSERT INTO web_admin_menus (code, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)',
    [FOOTER_MENU_CODE, FOOTER_MENU_NAME],
  );
  const [rows] = await connection.query<RowDataPacket[]>('SELECT id FROM web_admin_menus WHERE code = ? LIMIT 1', [FOOTER_MENU_CODE]);
  const id = Number(rows[0]?.id || 0);
  if (!id) throw new AdminApiError(500, 'INTERNAL_ERROR', 'Khong the khoi tao Footer Menu');
  return id;
}

async function getVersion(connection: PoolConnection | typeof pool, status: 'draft' | 'published') {
  const [rows] = await connection.query<FooterVersionRow[]>(
    `SELECT v.* FROM web_admin_menu_versions v JOIN web_admin_menus m ON m.id = v.menu_id
     WHERE m.code = ? AND v.status = ? ORDER BY ${status === 'published' ? 'v.published_at DESC,' : ''} v.id DESC LIMIT 1`,
    [FOOTER_MENU_CODE, status],
  );
  return rows[0] || null;
}

async function createVersion(connection: PoolConnection, menuId: number, status: 'draft' | 'published') {
  const [rows] = await connection.query<RowDataPacket[]>('SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version FROM web_admin_menu_versions WHERE menu_id = ?', [menuId]);
  const [result] = await connection.query(
    `INSERT INTO web_admin_menu_versions (menu_id, version_number, status, settings_json, published_at)
     VALUES (?, ?, ?, '{}', ${status === 'published' ? 'CURRENT_TIMESTAMP' : 'NULL'})`,
    [menuId, Number(rows[0]?.next_version || 1), status],
  );
  return Number((result as { insertId?: number }).insertId || 0);
}

async function insertNodes(connection: PoolConnection, versionId: number, parentId: number | null, nodes: HeaderMenuDraftNode[]) {
  for (const [ordering, node] of nodes.entries()) {
    const label = requireText(node.label, 'label', 'Nhan menu', 255);
    const [result] = await connection.query(
      `INSERT INTO web_admin_menu_items
       (version_id, area, parent_id, node_type, label, suffix_text, link_mode, custom_url, url_override, ordering, is_active, desktop_visible, mobile_visible)
       VALUES (?, ?, ?, ?, ?, ?, 'custom', ?, '', ?, ?, ?, ?)`,
      [
        versionId,
        FOOTER_AREA,
        parentId,
        node.nodeType,
        label,
        maybeText(node.suffixText, 64),
        maybeText(node.customUrl || '#', 512) || '#',
        ordering,
        toBoolInt(node.isActive, 1),
        toBoolInt(node.desktopVisible, 1),
        toBoolInt(node.mobileVisible, 1),
      ],
    );
    const id = Number((result as { insertId?: number }).insertId || 0);
    if (node.children?.length) await insertNodes(connection, versionId, id, node.children);
  }
}

async function copyItems(connection: PoolConnection, sourceVersionId: number, targetVersionId: number) {
  const [rows] = await connection.query<FooterItemRow[]>(
    'SELECT * FROM web_admin_menu_items WHERE version_id = ? ORDER BY parent_id ASC, ordering ASC, id ASC',
    [sourceVersionId],
  );
  const children = new Map<number | null, FooterItemRow[]>();
  for (const row of rows) {
    const parent = row.parent_id ? Number(row.parent_id) : null;
    if (!children.has(parent)) children.set(parent, []);
    children.get(parent)!.push(row);
  }
  const idMap = new Map<number, number>();
  const copy = async (parentId: number | null) => {
    for (const row of children.get(parentId) || []) {
      const [result] = await connection.query(
        `INSERT INTO web_admin_menu_items
         (version_id, area, parent_id, node_type, label, suffix_text, link_mode, custom_url, url_override, ordering, is_active, desktop_visible, mobile_visible)
         VALUES (?, ?, ?, ?, ?, ?, 'custom', ?, ?, ?, ?, ?, ?)`,
        [targetVersionId, FOOTER_AREA, parentId ? idMap.get(parentId) || null : null, row.node_type, row.label, row.suffix_text, row.custom_url, row.url_override, row.ordering, row.is_active, row.desktop_visible, row.mobile_visible],
      );
      idMap.set(Number(row.id), Number((result as { insertId?: number }).insertId || 0));
      await copy(Number(row.id));
    }
  };
  await copy(null);
}

function rowToNode(row: FooterItemRow): HeaderMenuDraftNode {
  return {
    id: row.id,
    nodeType: row.node_type,
    label: row.label,
    suffixText: row.suffix_text || '',
    customUrl: row.custom_url || '#',
    linkMode: 'custom',
    ordering: row.ordering,
    isActive: row.is_active === 1,
    desktopVisible: row.desktop_visible === 1,
    mobileVisible: row.mobile_visible === 1,
    children: [],
  };
}

async function loadDraft(versionId: number): Promise<HeaderMenuDraft> {
  const [rows] = await pool.query<FooterItemRow[]>('SELECT * FROM web_admin_menu_items WHERE version_id = ? ORDER BY parent_id ASC, ordering ASC, id ASC', [versionId]);
  const nodes = new Map<number, HeaderMenuDraftNode>();
  const roots: HeaderMenuDraftNode[] = [];
  for (const row of rows) nodes.set(Number(row.id), rowToNode(row));
  for (const row of rows) {
    const node = nodes.get(Number(row.id));
    if (!node) continue;
    const parentId = row.parent_id ? Number(row.parent_id) : null;
    if (parentId && nodes.has(parentId)) nodes.get(parentId)!.children!.push(node);
    else roots.push(node);
  }
  return { zones: roots, faves: [], topNav: [], utilityLinks: [], circleStory: [], shopByCategory: [] };
}

export async function getFooterMenuAdmin() {
  const draftVersion = await getVersion(pool, 'draft');
  const publishedVersion = await getVersion(pool, 'published');
  const menu = draftVersion ? await loadDraft(draftVersion.id) : emptyFooterDraft();
  return {
    menu,
    settings: { zonesLabel: FOOTER_MENU_NAME, favesLabel: '' },
    draft: { versionNumber: draftVersion?.version_number || 0, updatedAt: draftVersion?.updated_at || new Date(0), itemCount: footerNodeCount(menu.zones) },
    published: publishedVersion ? { versionNumber: publishedVersion.version_number, publishedAt: publishedVersion.published_at } : null,
    hasUnpublishedChanges: !draftVersion || !publishedVersion || new Date(draftVersion.updated_at).getTime() > new Date(publishedVersion.published_at || 0).getTime(),
    iconOptions: [],
  };
}

export async function saveFooterMenuDraft(draft: HeaderMenuDraft) {
  assertFooterMenuDraft(draft);
  return withTransaction(async (connection) => {
    await ensureHeaderMenuTables(connection);
    const menuId = await getMenuId(connection);
    let draftVersion = await getVersion(connection, 'draft');
    if (!draftVersion) {
      const draftId = await createVersion(connection, menuId, 'draft');
      draftVersion = { id: draftId } as FooterVersionRow;
    }
    await connection.query('DELETE FROM web_admin_menu_items WHERE version_id = ?', [draftVersion.id]);
    await insertNodes(connection, draftVersion.id, null, draft.zones);
    await connection.query('UPDATE web_admin_menu_versions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', [draftVersion.id]);
    return { id: draftVersion.id, itemCount: footerNodeCount(draft.zones) };
  });
}

export async function publishFooterMenuDraft() {
  return withTransaction(async (connection) => {
    const [menuRows] = await connection.query<RowDataPacket[]>('SELECT id FROM web_admin_menus WHERE code = ? LIMIT 1', [FOOTER_MENU_CODE]);
    const menuId = Number(menuRows[0]?.id || 0);
    const draftVersion = await getVersion(connection, 'draft');
    if (!menuId || !draftVersion) throw new AdminApiError(404, 'NOT_FOUND', 'Khong tim thay ban nhap Footer Menu');
    await connection.query("UPDATE web_admin_menu_versions SET status = 'archived' WHERE menu_id = ? AND status = 'published'", [menuId]);
    const publishedId = await createVersion(connection, menuId, 'published');
    await copyItems(connection, draftVersion.id, publishedId);
    clearFooterMenuCache();
    return { id: publishedId };
  });
}
