export interface SidebarFilterValue {
  name: string;
}

export interface SidebarSectionVisibility<T> {
  visibleValues: T[];
  collapsedValues: T[];
  collapsedCount: number;
  shouldRenderSection: boolean;
  sectionNameMatches: boolean;
  hasMatchedValues: boolean;
}

interface BuildSidebarSectionVisibilityArgs<T> {
  values: T[];
  keyword: string;
  sectionName: string;
  selectedSlugs: Set<string>;
  slugify: (value: string) => string;
  visibleLimit?: number;
}

function normalizeKeyword(value: string) {
  return normalizeText(value);
}

function normalizeText(value: string) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function textMatches(candidate: string, keyword: string) {
  const normalizedCandidate = normalizeText(candidate);
  const normalizedKeyword = normalizeKeyword(keyword);
  if (!normalizedKeyword) return true;
  return normalizedCandidate.includes(normalizedKeyword);
}

function dedupeVisibleValues<T extends SidebarFilterValue>(
  values: T[],
  visibleNames: Set<string>,
) {
  return values.filter((value) => visibleNames.has(value.name));
}

export function buildSidebarSectionVisibility<T extends SidebarFilterValue>({
  values,
  keyword,
  sectionName,
  selectedSlugs,
  slugify,
  visibleLimit = 4,
}: BuildSidebarSectionVisibilityArgs<T>): SidebarSectionVisibility<T> {
  const normalizedKeyword = normalizeKeyword(keyword);
  const sectionNameMatches = textMatches(sectionName, normalizedKeyword);

  if (!normalizedKeyword) {
    const visibleValues = values.slice(0, visibleLimit);
    const collapsedValues = values.slice(visibleLimit);

    return {
      visibleValues,
      collapsedValues,
      collapsedCount: collapsedValues.length,
      shouldRenderSection: visibleValues.length > 0,
      sectionNameMatches: false,
      hasMatchedValues: false,
    };
  }

  const matchedValues = values.filter((value) => textMatches(value.name, normalizedKeyword));
  const selectedValues = values.filter(
    (value) =>
      !matchedValues.includes(value) && selectedSlugs.has(slugify(value.name)),
  );

  if (!sectionNameMatches && matchedValues.length === 0 && selectedValues.length === 0) {
    return {
      visibleValues: [],
      collapsedValues: [],
      collapsedCount: 0,
      shouldRenderSection: false,
      sectionNameMatches: false,
      hasMatchedValues: false,
    };
  }

  if (matchedValues.length === 0 && sectionNameMatches) {
    const baseVisibleValues = values.slice(0, visibleLimit);
    const visibleNames = new Set(baseVisibleValues.map((value) => value.name));

    for (const value of selectedValues) {
      visibleNames.add(value.name);
    }

    const visibleValues = dedupeVisibleValues(values, visibleNames);
    const collapsedValues = values.filter((value) => !visibleNames.has(value.name));

    return {
      visibleValues,
      collapsedValues,
      collapsedCount: collapsedValues.length,
      shouldRenderSection: true,
      sectionNameMatches: true,
      hasMatchedValues: false,
    };
  }

  const visibleNames = new Set<string>();

  for (const value of matchedValues) {
    visibleNames.add(value.name);
  }

  for (const value of selectedValues) {
    visibleNames.add(value.name);
  }

  const visibleValues = dedupeVisibleValues(values, visibleNames);
  const collapsedValues = values.filter((value) => !visibleNames.has(value.name));

  return {
    visibleValues,
    collapsedValues,
    collapsedCount: collapsedValues.length,
    shouldRenderSection: visibleValues.length > 0 || sectionNameMatches,
    sectionNameMatches,
    hasMatchedValues: matchedValues.length > 0,
  };
}
