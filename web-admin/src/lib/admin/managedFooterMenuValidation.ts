import { AdminApiError, requireText } from '@/lib/admin/common';
import type { HeaderMenuArea, HeaderMenuDraft, HeaderMenuDraftNode } from '@/lib/admin/menus';

export const MAX_MANAGED_FOOTER_MENU_NODES = 200;

const OTHER_AREAS: HeaderMenuArea[] = ['faves', 'topNav', 'utilityLinks', 'circleStory', 'shopByCategory'];

function nodesAt(value: unknown, field: string): HeaderMenuDraftNode[] {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    throw new AdminApiError(400, 'BAD_REQUEST', `${field} phải là một danh sách`);
  }
  return value as HeaderMenuDraftNode[];
}

function childrenOf(node: HeaderMenuDraftNode, field: string) {
  return nodesAt(node.children, field);
}

function countNodes(nodes: HeaderMenuDraftNode[]): number {
  let total = 0;
  const stack = nodes.map((node, index) => ({ node, field: `nodes.${index}` }));
  while (stack.length > 0) {
    const current = stack.pop()!;
    total += 1;
    if (total > MAX_MANAGED_FOOTER_MENU_NODES) return total;
    const children = childrenOf(current.node, `${current.field}.children`);
    children.forEach((node, index) => stack.push({ node, field: `${current.field}.children.${index}` }));
  }
  return total;
}

function assertCustomLink(link: HeaderMenuDraftNode, field: string) {
  if (link.nodeType !== 'link') {
    throw new AdminApiError(400, 'BAD_REQUEST', `${field} phải là link`);
  }
  requireText(link.label, `${field}.label`, 'Nhãn link', 255);
  if (String(link.linkMode || 'custom') !== 'custom') {
    throw new AdminApiError(400, 'BAD_REQUEST', 'Footer chỉ hỗ trợ link tùy chỉnh');
  }
  if (childrenOf(link, `${field}.children`).length > 0) {
    throw new AdminApiError(400, 'BAD_REQUEST', 'Link Footer không được chứa mục con');
  }
}

function assertBaseDraft(draftValue: unknown, menuLabel: string) {
  const draft = (draftValue && typeof draftValue === 'object' ? draftValue : {}) as Partial<HeaderMenuDraft>;
  const zones = nodesAt(draft.zones, 'zones');
  const allAreas = [zones, ...OTHER_AREAS.map((area) => nodesAt(draft[area], area))];
  const totalNodes = allAreas.reduce((total, nodes) => total + countNodes(nodes), 0);

  if (totalNodes > MAX_MANAGED_FOOTER_MENU_NODES) {
    throw new AdminApiError(
      400,
      'BAD_REQUEST',
      `${menuLabel} chỉ hỗ trợ tối đa ${MAX_MANAGED_FOOTER_MENU_NODES} mục`,
    );
  }
  if (zones.length !== 1 || zones[0]?.nodeType !== 'zone') {
    throw new AdminApiError(400, 'BAD_REQUEST', `${menuLabel} phải có một nút gốc duy nhất`);
  }
  requireText(zones[0].label, 'menu.label', 'Tên menu', 255);

  for (let index = 0; index < OTHER_AREAS.length; index += 1) {
    if (allAreas[index + 1].length > 0) {
      throw new AdminApiError(400, 'BAD_REQUEST', `${menuLabel} chỉ hỗ trợ cấu trúc nhóm và link Footer`);
    }
  }

  return { draft: draft as HeaderMenuDraft, root: zones[0], totalNodes };
}

export function assertFooterMenuDraft(draftValue: unknown) {
  const { draft, root, totalNodes } = assertBaseDraft(draftValue, 'Footer Menu');
  const groups = childrenOf(root, 'zones.0.children');

  groups.forEach((group, groupIndex) => {
    if (group.nodeType !== 'group') {
      throw new AdminApiError(400, 'BAD_REQUEST', `Nhóm thứ ${groupIndex + 1} phải có kiểu nhóm`);
    }
    requireText(group.label, `groups.${groupIndex}.label`, 'Tên nhóm', 255);
    childrenOf(group, `groups.${groupIndex}.children`).forEach((link, linkIndex) => {
      assertCustomLink(link, `groups.${groupIndex}.links.${linkIndex}`);
    });
  });

  return { draft, totalNodes };
}

export function assertBottomFooterMenuDraft(draftValue: unknown) {
  const { draft, root, totalNodes } = assertBaseDraft(draftValue, 'Bottom Footer');
  const groups = childrenOf(root, 'zones.0.children');
  if (groups.length !== 1 || groups[0]?.nodeType !== 'group') {
    throw new AdminApiError(400, 'BAD_REQUEST', 'Bottom Footer phải có đúng một nhóm');
  }

  const group = groups[0];
  requireText(group.label, 'group.label', 'Tên nhóm', 255);
  childrenOf(group, 'group.children').forEach((link, linkIndex) => {
    assertCustomLink(link, `links.${linkIndex}`);
  });

  return { draft, totalNodes };
}
