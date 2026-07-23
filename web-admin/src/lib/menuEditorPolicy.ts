export type MenuEditorProfile = 'header' | 'footer' | 'bottom-footer';
export type MenuEditorNodeType = 'zone' | 'group' | 'link';

export type MenuEditorPolicy = {
  allowRootCreate: boolean;
  allowGroupCreate: boolean;
  allowLinkCreate: boolean;
  canEditLabel: boolean;
  canMove: boolean;
  canDuplicate: boolean;
  canDelete: boolean;
  customLinksOnly: boolean;
  showAreaLabelEditor: boolean;
};

export function getMenuEditorPolicy(
  profile: MenuEditorProfile,
  nodeType: MenuEditorNodeType | null,
  childCount = 0,
): MenuEditorPolicy {
  const isManagedFooter = profile !== 'header';
  const isProtectedRoot = isManagedFooter && nodeType === 'zone';
  const isProtectedBottomFooterGroup = profile === 'bottom-footer' && nodeType === 'group';
  const isProtectedNode = isProtectedRoot || isProtectedBottomFooterGroup;

  return {
    allowRootCreate: profile === 'header',
    allowGroupCreate: nodeType === 'zone' && (profile !== 'bottom-footer' || childCount === 0),
    allowLinkCreate: nodeType === 'group',
    canEditLabel: !isProtectedRoot,
    canMove: !isProtectedNode,
    canDuplicate: !isProtectedNode,
    canDelete: !isProtectedNode,
    customLinksOnly: isManagedFooter,
    showAreaLabelEditor: profile === 'header',
  };
}

export function duplicateTreeNodeAtSameLevel<T extends { id: string; children?: T[] }>(
  nodes: T[],
  id: string,
  duplicate: (node: T) => T,
): { nodes: T[]; duplicated: boolean } {
  const index = nodes.findIndex((node) => node.id === id);
  if (index >= 0) {
    const next = [...nodes];
    next.splice(index + 1, 0, duplicate(nodes[index]));
    return { nodes: next, duplicated: true };
  }

  let duplicated = false;
  const nextNodes = nodes.map((node) => {
    if (duplicated) return node;
    const result = duplicateTreeNodeAtSameLevel(node.children || [], id, duplicate);
    duplicated = result.duplicated;
    return duplicated ? { ...node, children: result.nodes } : node;
  });
  return { nodes: nextNodes, duplicated };
}
