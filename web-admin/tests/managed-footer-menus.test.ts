import assert from 'node:assert/strict';
import test from 'node:test';
import {
  assertBottomFooterMenuDraft,
  assertFooterMenuDraft,
  MAX_MANAGED_FOOTER_MENU_NODES,
} from '../src/lib/admin/managedFooterMenuValidation';
import type { HeaderMenuDraft, HeaderMenuDraftNode } from '../src/lib/admin/menus';
import {
  projectPublishedFooterMenu,
  type FooterMenuProjectionRow,
} from '../src/lib/footerMenus';
import {
  projectPublishedBottomFooterMenu,
  type BottomFooterMenuProjectionRow,
} from '../src/lib/bottomFooterMenus';
import { duplicateTreeNodeAtSameLevel, getMenuEditorPolicy } from '../src/lib/menuEditorPolicy';

function link(label: string, overrides: Partial<HeaderMenuDraftNode> = {}): HeaderMenuDraftNode {
  return {
    nodeType: 'link',
    label,
    linkMode: 'custom',
    customUrl: '#',
    children: [],
    ...overrides,
  };
}

function group(label: string, links: HeaderMenuDraftNode[] = []): HeaderMenuDraftNode {
  return { nodeType: 'group', label, children: links };
}

function draft(groups: HeaderMenuDraftNode[]): HeaderMenuDraft {
  return {
    zones: [{ nodeType: 'zone', label: 'Technical Footer Root', children: groups }],
    faves: [],
    topNav: [],
    utilityLinks: [],
    circleStory: [],
    shopByCategory: [],
  };
}

test('managed Footer validators accept dynamic names, groups, links, and explicit empties', () => {
  assert.doesNotThrow(() => assertFooterMenuDraft(draft([])));
  assert.doesNotThrow(() => assertFooterMenuDraft(draft([
    group('Sản phẩm', []),
    group('Hỗ trợ mới', [link('Tra cứu'), link('Liên hệ'), link('Chính sách')]),
    group('Thông tin', [link('Về chúng tôi')]),
  ])));

  assert.doesNotThrow(() => assertBottomFooterMenuDraft(draft([
    group('Đối tác công nghệ', []),
  ])));
  assert.doesNotThrow(() => assertBottomFooterMenuDraft(draft([
    group('Thương hiệu nổi bật', [link('AMD'), link('ASUS')]),
  ])));
});

test('managed Footer validators reject invalid depth, cardinality, modes, and oversized trees', () => {
  const twoRoots = draft([]);
  twoRoots.zones.push({ nodeType: 'zone', label: 'Another root', children: [] });
  assert.throws(() => assertFooterMenuDraft(twoRoots), /một nút gốc duy nhất/);

  assert.throws(() => assertBottomFooterMenuDraft(draft([])), /đúng một nhóm/);
  assert.throws(() => assertBottomFooterMenuDraft(draft([group('One'), group('Two')])), /đúng một nhóm/);
  assert.throws(() => assertFooterMenuDraft(draft([link('Wrong level')])), /phải có kiểu nhóm/);
  assert.throws(() => assertFooterMenuDraft(draft([
    group('Links', [link('Entity', { linkMode: 'entity' })]),
  ])), /chỉ hỗ trợ link tùy chỉnh/);
  assert.throws(() => assertFooterMenuDraft(draft([
    group('Links', [link('Nested', { children: [link('Child')] })]),
  ])), /không được chứa mục con/);

  const excessiveLinks = Array.from(
    { length: MAX_MANAGED_FOOTER_MENU_NODES - 1 },
    (_, index) => link(`Link ${index + 1}`),
  );
  assert.throws(() => assertFooterMenuDraft(draft([group('Too many', excessiveLinks)])), /tối đa 200 mục/);
});

function footerRow(
  id: number,
  parentId: number | null,
  nodeType: FooterMenuProjectionRow['node_type'],
  label: string,
  overrides: Partial<FooterMenuProjectionRow> = {},
): FooterMenuProjectionRow {
  return {
    id,
    area: 'zones',
    parent_id: parentId,
    node_type: nodeType,
    label,
    suffix_text: '',
    custom_url: '#',
    url_override: '',
    ordering: id,
    is_active: 1,
    desktop_visible: 1,
    mobile_visible: 1,
    ...overrides,
  };
}

test('Footer public projection keeps dynamic order and omits inactive or empty groups', () => {
  const rows: FooterMenuProjectionRow[] = [
    footerRow(1, null, 'zone', 'Footer'),
    footerRow(2, 1, 'group', 'Empty'),
    footerRow(3, 1, 'group', 'Dynamic'),
    footerRow(4, 3, 'link', 'First', { custom_url: '/first', suffix_text: '★' }),
    footerRow(5, 3, 'link', 'Hidden', { is_active: 0 }),
    footerRow(6, 1, 'group', 'Disabled group', { is_active: 0 }),
    footerRow(7, 6, 'link', 'Ignored'),
  ];

  const projected = projectPublishedFooterMenu(rows, { versionNumber: 9, publishedAt: null });
  assert.deepEqual(projected, {
    groups: [{
      id: '3',
      label: 'Dynamic',
      links: [{ id: '4', label: 'First', url: '/first', suffixText: '★' }],
    }],
    meta: { fallback: false, versionNumber: 9, publishedAt: null },
  });

  const disabledRoot = rows.map((row) => row.id === 1 ? { ...row, is_active: 0 } : row);
  assert.deepEqual(projectPublishedFooterMenu(disabledRoot, { versionNumber: 10, publishedAt: null })?.groups, []);
});

function bottomRow(
  id: number,
  parentId: number | null,
  nodeType: BottomFooterMenuProjectionRow['node_type'],
  label: string,
  overrides: Partial<BottomFooterMenuProjectionRow> = {},
): BottomFooterMenuProjectionRow {
  return {
    id,
    area: 'zones',
    parent_id: parentId,
    node_type: nodeType,
    label,
    custom_url: '#',
    url_override: '',
    ordering: id,
    is_active: 1,
    ...overrides,
  };
}

test('Bottom Footer public projection accepts a renamed heading and any active link count', () => {
  const rows: BottomFooterMenuProjectionRow[] = [
    bottomRow(1, null, 'zone', 'Bottom Footer'),
    bottomRow(2, 1, 'group', 'Đối tác chiến lược'),
    bottomRow(3, 2, 'link', 'AMD', { custom_url: '/amd' }),
    bottomRow(4, 2, 'link', 'Hidden', { is_active: 0 }),
  ];

  assert.deepEqual(projectPublishedBottomFooterMenu(rows, { versionNumber: 3, publishedAt: null }), {
    heading: 'Đối tác chiến lược',
    links: [{ id: '3', label: 'AMD', url: '/amd' }],
    meta: { fallback: false, versionNumber: 3, publishedAt: null },
  });
  assert.deepEqual(
    projectPublishedBottomFooterMenu(
      rows.map((row) => row.id === 2 ? { ...row, is_active: 0 } : row),
      { versionNumber: 4, publishedAt: null },
    )?.links,
    [],
  );
});

test('public projections reject malformed trees instead of treating them as dynamic data', () => {
  assert.equal(projectPublishedFooterMenu([
    footerRow(1, null, 'zone', 'Footer'),
    footerRow(2, 1, 'link', 'Wrong level'),
  ], { versionNumber: 1, publishedAt: null }), null);

  assert.equal(projectPublishedBottomFooterMenu([
    bottomRow(1, null, 'zone', 'Bottom'),
    bottomRow(2, 1, 'group', 'One'),
    bottomRow(3, 1, 'group', 'Two'),
  ], { versionNumber: 1, publishedAt: null }), null);
});

test('Footer editor profiles protect structural nodes and keep intended actions available', () => {
  const footerRoot = getMenuEditorPolicy('footer', 'zone', 4);
  assert.equal(footerRoot.allowRootCreate, false);
  assert.equal(footerRoot.allowGroupCreate, true);
  assert.equal(footerRoot.canDelete, false);
  assert.equal(footerRoot.canEditLabel, false);
  assert.equal(footerRoot.showAreaLabelEditor, false);

  const footerGroup = getMenuEditorPolicy('footer', 'group');
  assert.equal(footerGroup.allowLinkCreate, true);
  assert.equal(footerGroup.canDelete, true);
  assert.equal(footerGroup.customLinksOnly, true);

  const bottomRoot = getMenuEditorPolicy('bottom-footer', 'zone', 1);
  assert.equal(bottomRoot.allowGroupCreate, false);
  const bottomGroup = getMenuEditorPolicy('bottom-footer', 'group');
  assert.equal(bottomGroup.canDelete, false);
  assert.equal(bottomGroup.canDuplicate, false);
  assert.equal(bottomGroup.canEditLabel, true);
});

test('Footer editor duplicates groups and links beside their source instead of at the root', () => {
  type TreeNode = { id: string; children?: TreeNode[] };
  const tree: TreeNode[] = [{
    id: 'root',
    children: [{
      id: 'group',
      children: [{ id: 'link', children: [] }],
    }],
  }];

  const duplicatedGroup = duplicateTreeNodeAtSameLevel(
    tree,
    'group',
    (node) => ({ ...node, id: `${node.id}-copy` }),
  );
  assert.equal(duplicatedGroup.nodes.length, 1);
  assert.deepEqual(duplicatedGroup.nodes[0].children?.map((node) => node.id), ['group', 'group-copy']);

  const duplicatedLink = duplicateTreeNodeAtSameLevel(
    tree,
    'link',
    (node) => ({ ...node, id: `${node.id}-copy` }),
  );
  assert.deepEqual(
    duplicatedLink.nodes[0].children?.[0].children?.map((node) => node.id),
    ['link', 'link-copy'],
  );
});
