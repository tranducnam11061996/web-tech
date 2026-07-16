export type CollectionOption = {
  id: number;
  name: string;
  parentId: number;
};

export type CollectionParentOption = CollectionOption & {
  level: number;
};

export function normalizeCollectionSearch(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

export function buildCollectionParentOptions(
  collections: CollectionOption[],
  currentId: number,
): CollectionParentOption[] {
  const childrenByParent = new Map<number, CollectionOption[]>();

  collections.forEach((collection) => {
    const parentId = Number(collection.parentId || 0);
    const children = childrenByParent.get(parentId) || [];
    children.push(collection);
    childrenByParent.set(parentId, children);
  });

  const excludedIds = new Set<number>();
  const excludeBranch = (collectionId: number) => {
    if (excludedIds.has(collectionId)) return;
    excludedIds.add(collectionId);
    (childrenByParent.get(collectionId) || []).forEach((child) => excludeBranch(child.id));
  };
  if (currentId > 0) excludeBranch(currentId);

  const flattened: CollectionParentOption[] = [];
  const visitedIds = new Set<number>();
  const appendBranch = (parentId: number, level: number) => {
    (childrenByParent.get(parentId) || []).forEach((collection) => {
      if (excludedIds.has(collection.id) || visitedIds.has(collection.id)) return;
      visitedIds.add(collection.id);
      flattened.push({ ...collection, level });
      appendBranch(collection.id, level + 1);
    });
  };

  appendBranch(0, 0);

  collections.forEach((collection) => {
    if (excludedIds.has(collection.id) || visitedIds.has(collection.id)) return;
    visitedIds.add(collection.id);
    flattened.push({ ...collection, level: 0 });
    appendBranch(collection.id, 1);
  });

  return flattened;
}

export function filterCollectionParentOptions(
  options: CollectionParentOption[],
  query: string,
) {
  const keyword = normalizeCollectionSearch(query.trim());
  if (!keyword) return options;
  return options.filter((collection) => (
    normalizeCollectionSearch(`${collection.name} ${collection.id}`).includes(keyword)
  ));
}
