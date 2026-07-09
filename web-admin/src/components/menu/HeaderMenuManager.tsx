'use client';

import { useMemo, useState, useTransition } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Check,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Link2,
  ListPlus,
  Monitor,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Send,
  Smartphone,
  Trash2,
  Upload,
} from 'lucide-react';
import clsx from 'clsx';

type AreaId = 'zones' | 'faves' | 'topNav' | 'utilityLinks' | 'circleStory';
type NodeType = 'zone' | 'group' | 'link';
type LinkMode = 'custom' | 'entity' | 'system';
type EntityType = 'product-category' | 'article-category';

type MenuNode = {
  id: string;
  nodeType: NodeType;
  label: string;
  iconKey?: string;
  badgeText?: string;
  suffixText?: string;
  backgroundColor?: string;
  imageUrl?: string;
  subText?: string;
  linkMode?: LinkMode;
  entityType?: EntityType;
  entityId?: number;
  customUrl?: string;
  urlOverride?: string;
  ordering?: number;
  isActive?: boolean;
  desktopVisible?: boolean;
  mobileVisible?: boolean;
  children?: MenuNode[];
};

type MenuDraft = Record<AreaId, MenuNode[]>;

type MenuSettings = {
  zonesLabel: string;
  favesLabel: string;
};

type InitialData = {
  menu: Record<AreaId, any[]>;
  settings?: Partial<MenuSettings>;
  draft: { versionNumber: number; updatedAt: string | Date; itemCount: number };
  published: { versionNumber: number; publishedAt: string | Date | null } | null;
  hasUnpublishedChanges: boolean;
  iconOptions: Array<{ key: string; path: string }>;
};

type TargetOption = {
  id: number;
  type: EntityType;
  label: string;
  url: string;
};

type NodePath = {
  area: AreaId;
  node: MenuNode;
  zone?: MenuNode;
  group?: MenuNode;
};

type PreviewContext = {
  area: AreaId;
  selectedId: string | null;
  zone?: MenuNode;
  group?: MenuNode;
  node?: MenuNode;
};

const AREAS: Array<{ id: AreaId; label: string; description: string }> = [
  { id: 'zones', label: 'Danh Mục', description: 'Mega menu trái và các cột bên phải' },
  { id: 'faves', label: 'Nổi bật', description: 'Danh sách nổi bật trong menu' },
  { id: 'topNav', label: 'Thanh điều hướng', description: 'Dải link ngang phía dưới header' },
  { id: 'utilityLinks', label: 'Link tiện ích', description: 'Các link/icon phụ trong header' },
  { id: 'circleStory', label: 'Circle Story', description: 'Dải story vòng tròn phía dưới header' },
];

const STATUS_UNPUBLISHED = 'Có thay đổi chưa xuất bản';
const STATUS_SYNCED = 'Đã đồng bộ bản live';
const STATUS_DRAFT_SAVED = 'Đã lưu nháp';
const STATUS_PUBLISHED = 'Đã xuất bản';
const NODE_TYPE_LABELS: Record<NodeType, string> = {
  zone: 'Danh mục',
  group: 'Nhóm',
  link: 'Link',
};

const DEFAULT_MENU_SETTINGS: MenuSettings = {
  zonesLabel: 'Danh Mục',
  favesLabel: 'Nổi bật',
};

function normalizeSettings(settings?: Partial<MenuSettings>): MenuSettings {
  return {
    zonesLabel: String(settings?.zonesLabel || DEFAULT_MENU_SETTINGS.zonesLabel).trim() || DEFAULT_MENU_SETTINGS.zonesLabel,
    favesLabel: String(settings?.favesLabel || DEFAULT_MENU_SETTINGS.favesLabel).trim() || DEFAULT_MENU_SETTINGS.favesLabel,
  };
}

function areaLabel(area: AreaId, settings?: MenuSettings) {
  if (area === 'zones') return settings?.zonesLabel || DEFAULT_MENU_SETTINGS.zonesLabel;
  if (area === 'faves') return settings?.favesLabel || DEFAULT_MENU_SETTINGS.favesLabel;
  return AREAS.find((item) => item.id === area)?.label || area;
}

function cloneMenu(menu: MenuDraft): MenuDraft {
  return structuredClone(menu);
}

function withStringIds(nodes: any[]): MenuNode[] {
  return (nodes || []).map((node) => ({
    ...node,
    id: String(node.id),
    isActive: node.isActive !== false,
    desktopVisible: node.desktopVisible !== false,
    mobileVisible: node.mobileVisible !== false,
    children: withStringIds(node.children || []),
  }));
}

function normalizeMenu(menu: MenuDraft): MenuDraft {
  return {
    zones: withStringIds(menu.zones),
    faves: withStringIds(menu.faves),
    topNav: withStringIds(menu.topNav),
    utilityLinks: withStringIds(menu.utilityLinks),
    circleStory: withStringIds(menu.circleStory || []),
  };
}

function makeId() {
  return `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function countNodes(nodes: MenuNode[]): number {
  return nodes.reduce((total, node) => total + 1 + countNodes(node.children || []), 0);
}

function findNode(nodes: MenuNode[], id: string): MenuNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = findNode(node.children || [], id);
    if (child) return child;
  }
  return null;
}

function findNodeInMenu(menu: MenuDraft, id: string | null): MenuNode | null {
  if (!id) return null;
  for (const area of AREAS) {
    const node = findNode(menu[area.id], id);
    if (node) return node;
  }
  return null;
}

function findPathInNodes(area: AreaId, nodes: MenuNode[], id: string, ancestors: MenuNode[] = []): NodePath | null {
  for (const node of nodes) {
    const nextAncestors = [...ancestors, node];
    if (node.id === id) {
      return {
        area,
        node,
        zone: area === 'zones' ? nextAncestors.find((item) => item.nodeType === 'zone') : undefined,
        group: area === 'zones' ? nextAncestors.find((item) => item.nodeType === 'group') : undefined,
      };
    }
    const childPath = findPathInNodes(area, node.children || [], id, nextAncestors);
    if (childPath) return childPath;
  }
  return null;
}

function findPathToNode(menu: MenuDraft, selectedId: string | null): NodePath | null {
  if (!selectedId) return null;
  for (const area of AREAS) {
    const path = findPathInNodes(area.id, menu[area.id], selectedId);
    if (path) return path;
  }
  return null;
}

function findAncestorIds(nodes: MenuNode[], id: string, ancestors: string[] = []): string[] | null {
  for (const node of nodes) {
    if (node.id === id) return ancestors;
    const childPath = findAncestorIds(node.children || [], id, [...ancestors, node.id]);
    if (childPath) return childPath;
  }
  return null;
}

function getPreviewContext(menu: MenuDraft, activeArea: AreaId, selectedId: string | null): PreviewContext {
  const selectedPath = findPathToNode(menu, selectedId);
  if (selectedPath) {
    return {
      area: selectedPath.area,
      selectedId,
      node: selectedPath.node,
      zone: selectedPath.zone || (selectedPath.area === 'zones' ? selectedPath.node : undefined),
      group: selectedPath.group,
    };
  }

  if (activeArea === 'zones') {
    const zone = visible(menu.zones, 'desktop')[0] || menu.zones[0];
    return { area: activeArea, selectedId: zone?.id || null, node: zone, zone };
  }

  const node = visible(menu[activeArea], 'desktop')[0] || menu[activeArea][0];
  return { area: activeArea, selectedId: node?.id || null, node };
}

function updateNodes(nodes: MenuNode[], id: string, updater: (node: MenuNode) => MenuNode): MenuNode[] {
  return nodes.map((node) => {
    if (node.id === id) return updater(node);
    return { ...node, children: updateNodes(node.children || [], id, updater) };
  });
}

function removeNode(nodes: MenuNode[], id: string): MenuNode[] {
  return nodes
    .filter((node) => node.id !== id)
    .map((node) => ({ ...node, children: removeNode(node.children || [], id) }));
}

function addChild(nodes: MenuNode[], parentId: string, child: MenuNode): MenuNode[] {
  return nodes.map((node) => {
    if (node.id === parentId) return { ...node, children: [...(node.children || []), child] };
    return { ...node, children: addChild(node.children || [], parentId, child) };
  });
}

function duplicateNode(node: MenuNode): MenuNode {
  return {
    ...node,
    id: makeId(),
    label: `${node.label} copy`,
    children: (node.children || []).map(duplicateNode),
  };
}

function reorderSibling(nodes: MenuNode[], id: string, direction: -1 | 1): { nodes: MenuNode[]; moved: boolean } {
  const index = nodes.findIndex((node) => node.id === id);
  if (index >= 0) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= nodes.length) return { nodes, moved: true };
    const next = [...nodes];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    return { nodes: next, moved: true };
  }

  let moved = false;
  const nextNodes = nodes.map((node) => {
    if (moved) return node;
    const result = reorderSibling(node.children || [], id, direction);
    moved = result.moved;
    return { ...node, children: result.nodes };
  });
  return { nodes: nextNodes, moved };
}

function dragReorder(nodes: MenuNode[], draggedId: string, targetId: string): { nodes: MenuNode[]; moved: boolean } {
  const draggedIndex = nodes.findIndex((node) => node.id === draggedId);
  const targetIndex = nodes.findIndex((node) => node.id === targetId);
  if (draggedIndex >= 0 && targetIndex >= 0) {
    const next = [...nodes];
    const [dragged] = next.splice(draggedIndex, 1);
    next.splice(targetIndex, 0, dragged);
    return { nodes: next, moved: true };
  }

  let moved = false;
  const nextNodes = nodes.map((node) => {
    if (moved) return node;
    const result = dragReorder(node.children || [], draggedId, targetId);
    moved = result.moved;
    return { ...node, children: result.nodes };
  });
  return { nodes: nextNodes, moved };
}

function newNode(type: NodeType): MenuNode {
  return {
    id: makeId(),
    nodeType: type,
    label: type === 'zone' ? 'Danh mục mới' : type === 'group' ? 'Nhóm mới' : 'Link mới',
    iconKey: type === 'zone' ? 'desktop' : '',
    backgroundColor: '',
    imageUrl: '',
    subText: '',
    linkMode: type === 'link' ? 'custom' : 'custom',
    customUrl: type === 'link' ? '#' : '',
    isActive: true,
    desktopVisible: true,
    mobileVisible: true,
    children: [],
  };
}

function flattenForSave(nodes: MenuNode[]): MenuNode[] {
  return nodes.map((node, index) => ({
    ...node,
    ordering: index,
    children: flattenForSave(node.children || []),
  }));
}

function menuForSave(menu: MenuDraft): MenuDraft {
  return {
    zones: flattenForSave(menu.zones),
    faves: flattenForSave(menu.faves),
    topNav: flattenForSave(menu.topNav),
    utilityLinks: flattenForSave(menu.utilityLinks),
    circleStory: flattenForSave(menu.circleStory),
  };
}

function collectDraftMetadataLinks(nodes: MenuNode[], result: MenuNode[] = []) {
  for (const node of nodes) {
    if (node.nodeType === 'link' && node.isActive !== false && (node.iconKey || node.badgeText)) result.push(node);
    collectDraftMetadataLinks(node.children || [], result);
  }
  return result;
}

function collectPublicLinks(data: any) {
  const links: any[] = [];
  for (const zone of data?.zones || []) {
    for (const column of zone?.cols || []) links.push(...(column?.items || []));
  }
  for (const area of ['faves', 'topNav', 'utilityLinks', 'circleStory']) links.push(...(data?.[area] || []));
  return links;
}

function assertPublishedMenuMetadata(menu: MenuDraft, publicData: any) {
  const expected = AREAS.flatMap((area) => collectDraftMetadataLinks(menu[area.id]));
  if (expected.length === 0) return;

  const publicLinks = collectPublicLinks(publicData);
  const missing = expected.find((node) => !publicLinks.some((item) => {
    if (String(item?.label || item?.name || '') !== node.label) return false;
    const iconOk = !node.iconKey || item?.iconKey === node.iconKey || Boolean(item?.icon);
    const expectedBadge = String(node.badgeText || '').trim().toLowerCase();
    const actualBadge = String(item?.badgeText || '').trim().toLowerCase();
    const badgeOk = !expectedBadge || actualBadge === expectedBadge;
    return iconOk && badgeOk;
  }));

  if (missing) throw new Error('Menu da xuat ban nhung public API chua tra metadata moi. Vui long tai lai va thu lai.');
}

function isNodeVisible(node: MenuNode, viewport: 'desktop' | 'mobile') {
  return node.isActive !== false && (viewport === 'desktop' ? node.desktopVisible !== false : node.mobileVisible !== false);
}

function visible(nodes: MenuNode[], viewport: 'desktop' | 'mobile') {
  return nodes.filter((node) => isNodeVisible(node, viewport));
}

function previewItems(nodes: MenuNode[], selectedId: string | null | undefined, limit: number) {
  if (nodes.length <= limit) return nodes;
  const selected = selectedId ? nodes.find((node) => node.id === selectedId) : undefined;
  const sliced = nodes.slice(0, limit);
  if (!selected || sliced.some((node) => node.id === selected.id)) return sliced;
  return [...sliced.slice(0, Math.max(0, limit - 1)), selected];
}

export function HeaderMenuManager({ initialData }: { initialData: InitialData }) {
  const [menu, setMenu] = useState<MenuDraft>(() => normalizeMenu(initialData.menu));
  const [settings, setSettings] = useState<MenuSettings>(() => normalizeSettings(initialData.settings));
  const [activeArea, setActiveArea] = useState<AreaId>('zones');
  const [selectedId, setSelectedId] = useState<string | null>(menu.zones[0]?.id || null);
  const [statusText, setStatusText] = useState(initialData.hasUnpublishedChanges ? STATUS_UNPUBLISHED : STATUS_SYNCED);
  const [errorText, setErrorText] = useState('');
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [quickLinks, setQuickLinks] = useState('');
  const [targetQuery, setTargetQuery] = useState('');
  const [targetOptions, setTargetOptions] = useState<TargetOption[]>([]);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();

  const selectedNode = findNodeInMenu(menu, selectedId);
  const itemCount = useMemo(() => AREAS.reduce((total, area) => total + countNodes(menu[area.id]), 0), [menu]);
  const previewContext = useMemo(() => getPreviewContext(menu, activeArea, selectedId), [menu, activeArea, selectedId]);
  const iconPathByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const option of initialData.iconOptions) map.set(option.key, option.path);
    return map;
  }, [initialData.iconOptions]);

  const updateSelected = (updater: (node: MenuNode) => MenuNode) => {
    if (!selectedId) return;
    setMenu((current) => ({ ...current, [activeArea]: updateNodes(current[activeArea], selectedId, updater) }));
    setStatusText(STATUS_UNPUBLISHED);
  };

  const updateSettings = (patch: Partial<MenuSettings>) => {
    setSettings((current) => normalizeSettings({ ...current, ...patch }));
    setStatusText(STATUS_UNPUBLISHED);
  };

  const selectNode = (id: string) => {
    setSelectedId(id);
    const ancestors = findAncestorIds(menu[activeArea], id) || [];
    if (ancestors.length > 0) {
      setExpandedIds((current) => {
        const next = { ...current };
        for (const ancestorId of ancestors) next[ancestorId] = true;
        return next;
      });
    }
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((current) => ({ ...current, [id]: !current[id] }));
  };

  const addRoot = (type: NodeType) => {
    const node = newNode(type);
    setMenu((current) => ({ ...current, [activeArea]: [...current[activeArea], node] }));
    setSelectedId(node.id);
    setStatusText(STATUS_UNPUBLISHED);
  };

  const addChildToSelected = (type: NodeType) => {
    if (!selectedNode || !selectedId) return;
    const node = newNode(type);
    setMenu((current) => ({ ...current, [activeArea]: addChild(current[activeArea], selectedId, node) }));
    setExpandedIds((current) => ({ ...current, [selectedId]: true }));
    setSelectedId(node.id);
    setStatusText(STATUS_UNPUBLISHED);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setMenu((current) => ({ ...current, [activeArea]: removeNode(current[activeArea], selectedId) }));
    setSelectedId(null);
    setStatusText(STATUS_UNPUBLISHED);
  };

  const duplicateSelected = () => {
    if (!selectedNode) return;
    setMenu((current) => ({ ...current, [activeArea]: [...current[activeArea], duplicateNode(selectedNode)] }));
    setStatusText(STATUS_UNPUBLISHED);
  };

  const moveSelected = (direction: -1 | 1) => {
    if (!selectedId) return;
    setMenu((current) => {
      const result = reorderSibling(current[activeArea], selectedId, direction);
      return { ...current, [activeArea]: result.nodes };
    });
    setStatusText(STATUS_UNPUBLISHED);
  };

  const saveDraft = () => {
    setErrorText('');
    startTransition(async () => {
      try {
        const response = await fetch('/api/admin/menus/header', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ menu: menuForSave(menu), settings }),
        });
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể lưu nháp');
        setStatusText(STATUS_DRAFT_SAVED);
      } catch (error: any) {
        setErrorText(error.message || 'Không thể lưu nháp');
      }
    });
  };

  const publishDraft = () => {
    setErrorText('');
    startTransition(async () => {
      try {
        const saveResponse = await fetch('/api/admin/menus/header', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ menu: menuForSave(menu), settings }),
        });
        const savePayload = await saveResponse.json();
        if (!saveResponse.ok || !savePayload.success) throw new Error(savePayload?.error?.message || 'Khong the luu nhap truoc khi xuat ban');
        const response = await fetch('/api/admin/menus/header/publish', { method: 'POST' });
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể xuất bản');
        const publicResponse = await fetch('/api/menu/header', { cache: 'no-store' });
        const publicPayload = await publicResponse.json();
        if (!publicResponse.ok || !publicPayload.success) throw new Error('Khong the kiem tra menu public sau khi xuat ban');
        assertPublishedMenuMetadata(menu, publicPayload.data);
        setStatusText(STATUS_PUBLISHED);
      } catch (error: any) {
        setErrorText(error.message || 'Không thể xuất bản');
      }
    });
  };

  const reloadDraft = () => {
    setErrorText('');
    startTransition(async () => {
      try {
        const response = await fetch('/api/admin/menus/header');
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể tải lại');
        setMenu(normalizeMenu(payload.data.menu));
        setSettings(normalizeSettings(payload.data.settings));
        setExpandedIds({});
        setSelectedId(payload.data.menu.zones?.[0]?.id ? String(payload.data.menu.zones[0].id) : null);
        setStatusText(payload.data.hasUnpublishedChanges ? STATUS_UNPUBLISHED : STATUS_SYNCED);
      } catch (error: any) {
        setErrorText(error.message || 'Không thể tải lại');
      }
    });
  };

  const searchTargets = () => {
    const entityType = selectedNode?.entityType || 'product-category';
    startTransition(async () => {
      const response = await fetch(`/api/admin/menu-link-targets?type=${entityType}&q=${encodeURIComponent(targetQuery)}`);
      const payload = await response.json();
      setTargetOptions(payload?.data?.items || []);
    });
  };

  const addQuickLinks = () => {
    const lines = quickLinks.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0) return;
    const links = lines.map((line) => {
      const [label, url] = line.split('|').map((part) => part.trim());
      return { ...newNode('link'), label: label || 'Link mới', customUrl: url || '#' };
    });

    if (selectedNode?.nodeType === 'group' && selectedId) {
      setMenu((current) => {
        let next = current[activeArea];
        for (const link of links) next = addChild(next, selectedId, link);
        return { ...current, [activeArea]: next };
      });
      setExpandedIds((current) => ({ ...current, [selectedId]: true }));
    } else if (activeArea !== 'zones') {
      setMenu((current) => ({ ...current, [activeArea]: [...current[activeArea], ...links] }));
    }
    setQuickLinks('');
    setStatusText(STATUS_UNPUBLISHED);
  };

  const onDropNode = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    setMenu((current) => {
      const result = dragReorder(current[activeArea], draggedId, targetId);
      return { ...current, [activeArea]: result.nodes };
    });
    setDraggedId(null);
    setStatusText(STATUS_UNPUBLISHED);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3 text-gray-100">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-800 bg-gray-950/70 px-4 py-3">
        <div>
          <h1 className="text-lg font-bold text-white">Quản lý nội dung menu</h1>
          <p className="mt-1 text-sm text-gray-400">
            Nháp v{initialData.draft.versionNumber} · {itemCount} mục · {statusText}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={reloadDraft} className="rounded-md border border-gray-700 px-3 py-2 text-sm text-gray-200 transition hover:border-gray-500" disabled={isPending}>
            <RefreshCcw className="mr-2 inline h-4 w-4" />Tải lại
          </button>
          <button type="button" onClick={saveDraft} className="rounded-md border border-blue-800 bg-blue-950/40 px-3 py-2 text-sm text-blue-200 transition hover:bg-blue-900/60" disabled={isPending}>
            <Save className="mr-2 inline h-4 w-4" />Lưu nháp
          </button>
          <button type="button" onClick={publishDraft} className="rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50" disabled={isPending}>
            <Send className="mr-2 inline h-4 w-4" />Xuất bản
          </button>
        </div>
      </div>

      {errorText && <div className="rounded-md border border-red-900/70 bg-red-950/50 px-4 py-2 text-sm text-red-200" role="alert">{errorText}</div>}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 xl:grid-cols-[280px_minmax(0,1fr)_360px]">
        <aside className="rounded-lg border border-gray-800 bg-gray-950/70 p-3">
          <div className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Khu vực header</div>
          <div className="space-y-2">
            {AREAS.map((area) => (
              <button
                key={area.id}
                type="button"
                onClick={() => {
                  setActiveArea(area.id);
                  setSelectedId(menu[area.id][0]?.id || null);
                }}
                className={clsx(
                  'w-full rounded-md border px-3 py-3 text-left transition',
                  activeArea === area.id ? 'border-emerald-700 bg-emerald-950/30' : 'border-gray-800 bg-gray-900/50 hover:border-gray-700',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-gray-100">{areaLabel(area.id, settings)}</span>
                  <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-300">{countNodes(menu[area.id])}</span>
                </div>
                <div className="mt-1 text-xs leading-5 text-gray-500">{area.description}</div>
              </button>
            ))}
          </div>
        </aside>

        <main className="min-h-0 rounded-lg border border-gray-800 bg-gray-950/70 p-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-bold text-white">{areaLabel(activeArea, settings)}</h2>
              <p className="text-xs text-gray-500">Kéo thả trong cùng cấp hoặc dùng nút lên/xuống.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeArea === 'zones' ? (
                <>
                  <button type="button" onClick={() => addRoot('zone')} className="rounded-md bg-gray-800 px-3 py-2 text-sm hover:bg-gray-700"><Plus className="mr-1 inline h-4 w-4" />Danh mục</button>
                  <button type="button" onClick={() => addChildToSelected('group')} disabled={selectedNode?.nodeType !== 'zone'} className="rounded-md bg-gray-800 px-3 py-2 text-sm hover:bg-gray-700 disabled:opacity-40"><Plus className="mr-1 inline h-4 w-4" />Nhóm</button>
                  <button type="button" onClick={() => addChildToSelected('link')} disabled={selectedNode?.nodeType !== 'group'} className="rounded-md bg-gray-800 px-3 py-2 text-sm hover:bg-gray-700 disabled:opacity-40"><Plus className="mr-1 inline h-4 w-4" />Link</button>
                </>
              ) : (
                <button type="button" onClick={() => addRoot('link')} className="rounded-md bg-gray-800 px-3 py-2 text-sm hover:bg-gray-700"><Plus className="mr-1 inline h-4 w-4" />Link</button>
              )}
            </div>
          </div>

          {(activeArea === 'zones' || activeArea === 'faves') && (
            <div className="mb-3 rounded-md border border-gray-800 bg-gray-900/40 p-3">
              <label htmlFor={`${activeArea}-frontend-label`} className="mb-1 block text-xs font-semibold text-gray-400">
                Nhãn hiển thị frontend
              </label>
              <input
                id={`${activeArea}-frontend-label`}
                value={activeArea === 'zones' ? settings.zonesLabel : settings.favesLabel}
                onChange={(event) => updateSettings(activeArea === 'zones' ? { zonesLabel: event.target.value } : { favesLabel: event.target.value })}
                className="field-input"
                placeholder={activeArea === 'zones' ? DEFAULT_MENU_SETTINGS.zonesLabel : DEFAULT_MENU_SETTINGS.favesLabel}
              />
              <p className="mt-1 text-xs text-gray-500">Bản xem trước đổi ngay; website chỉ đổi sau khi xuất bản.</p>
            </div>
          )}

          <div className="grid min-h-0 gap-3 lg:grid-cols-2">
            <div className="max-h-[calc(100vh-260px)] overflow-y-auto rounded-md border border-gray-800 bg-black/20 p-2 custom-scrollbar">
              {menu[activeArea].length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">Chưa có mục nào trong khu vực này.</div>
              ) : (
                menu[activeArea].map((node) => (
                  <TreeNode
                    key={node.id}
                    node={node}
                    selectedId={selectedId}
                    depth={0}
                    expandedIds={expandedIds}
                    onSelect={selectNode}
                    onToggleExpanded={toggleExpanded}
                    onDragStart={setDraggedId}
                    onDropNode={onDropNode}
                  />
                ))
              )}
            </div>

            <div className="space-y-3">
              <div className="rounded-md border border-gray-800 bg-gray-900/40 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Xem trước</h3>
                  <div className="flex gap-1 rounded-md bg-gray-950 p-1">
                    <button type="button" onClick={() => setPreviewMode('desktop')} className={clsx('rounded px-2 py-1 text-xs', previewMode === 'desktop' ? 'bg-gray-800 text-white' : 'text-gray-500')} aria-label="Xem trước trên desktop">
                      <Monitor className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => setPreviewMode('mobile')} className={clsx('rounded px-2 py-1 text-xs', previewMode === 'mobile' ? 'bg-gray-800 text-white' : 'text-gray-500')} aria-label="Xem trước trên mobile">
                      <Smartphone className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {previewMode === 'desktop' ? (
                  <DesktopPreview menu={menu} context={previewContext} settings={settings} iconPathByKey={iconPathByKey} />
                ) : (
                  <MobilePreview menu={menu} context={previewContext} settings={settings} iconPathByKey={iconPathByKey} />
                )}
              </div>

              <div className="rounded-md border border-gray-800 bg-gray-900/40 p-3">
                <label className="text-sm font-bold text-white" htmlFor="quick-links">Nhập nhanh link tùy chỉnh</label>
                <textarea
                  id="quick-links"
                  value={quickLinks}
                  onChange={(event) => setQuickLinks(event.target.value)}
                  placeholder="PC Builder | /pc-builder"
                  className="mt-2 h-24 w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-200 outline-none focus:border-emerald-500"
                />
                <button type="button" onClick={addQuickLinks} className="mt-2 rounded-md border border-gray-700 px-3 py-2 text-sm text-gray-200 hover:border-gray-500">
                  <ListPlus className="mr-2 inline h-4 w-4" />Thêm các link
                </button>
              </div>
            </div>
          </div>
        </main>

        <aside className="min-h-0 rounded-lg border border-gray-800 bg-gray-950/70 p-3">
          <EditorPanel
            node={selectedNode}
            activeArea={activeArea}
            iconOptions={initialData.iconOptions}
            targetQuery={targetQuery}
            targetOptions={targetOptions}
            onTargetQuery={setTargetQuery}
            onSearchTargets={searchTargets}
            onUpdate={updateSelected}
            onDelete={deleteSelected}
            onDuplicate={duplicateSelected}
            onMove={moveSelected}
          />
        </aside>
      </div>
    </div>
  );
}

function TreeNode({
  node,
  selectedId,
  depth,
  expandedIds,
  onSelect,
  onToggleExpanded,
  onDragStart,
  onDropNode,
}: {
  node: MenuNode;
  selectedId: string | null;
  depth: number;
  expandedIds: Record<string, boolean>;
  onSelect: (id: string) => void;
  onToggleExpanded: (id: string) => void;
  onDragStart: (id: string) => void;
  onDropNode: (id: string) => void;
}) {
  const children = node.children || [];
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds[node.id] === true;

  return (
    <div>
      <button
        type="button"
        draggable
        onDragStart={() => onDragStart(node.id)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={() => onDropNode(node.id)}
        onClick={() => onSelect(node.id)}
        className={clsx(
          'mb-1 flex w-full items-center gap-2 rounded-md border px-2 py-2 text-left text-sm transition',
          selectedId === node.id ? 'border-emerald-700 bg-emerald-950/30 text-white' : 'border-gray-800 bg-gray-900/40 text-gray-300 hover:border-gray-700',
        )}
        style={{ paddingLeft: `${8 + depth * 18}px` }}
      >
        <GripVertical className="h-4 w-4 shrink-0 text-gray-600" />
        {hasChildren ? (
          <span
            role="button"
            tabIndex={0}
            onClick={(event) => {
              event.stopPropagation();
              onToggleExpanded(node.id);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                onToggleExpanded(node.id);
              }
            }}
            className="rounded p-0.5 text-gray-400 transition hover:bg-gray-800 hover:text-white"
            aria-label={isExpanded ? 'Thu gọn mục' : 'Mở rộng mục'}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
        ) : (
          <span className="h-4 w-4 shrink-0" />
        )}
        <span className={clsx('rounded px-1.5 py-0.5 text-[10px] uppercase', node.nodeType === 'zone' ? 'bg-blue-950 text-blue-300' : node.nodeType === 'group' ? 'bg-purple-950 text-purple-300' : 'bg-gray-800 text-gray-300')}>{NODE_TYPE_LABELS[node.nodeType]}</span>
        <span className="min-w-0 flex-1 truncate">{node.label || 'Chưa đặt tên'}</span>
        {node.isActive === false ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-green-500" />}
      </button>
      {isExpanded && children.map((child) => (
        <TreeNode
          key={child.id}
          node={child}
          selectedId={selectedId}
          depth={depth + 1}
          expandedIds={expandedIds}
          onSelect={onSelect}
          onToggleExpanded={onToggleExpanded}
          onDragStart={onDragStart}
          onDropNode={onDropNode}
        />
      ))}
    </div>
  );
}

function EditorPanel({
  node,
  activeArea,
  iconOptions,
  targetQuery,
  targetOptions,
  onTargetQuery,
  onSearchTargets,
  onUpdate,
  onDelete,
  onDuplicate,
  onMove,
}: {
  node: MenuNode | null;
  activeArea: AreaId;
  iconOptions: Array<{ key: string; path: string }>;
  targetQuery: string;
  targetOptions: TargetOption[];
  onTargetQuery: (value: string) => void;
  onSearchTargets: () => void;
  onUpdate: (updater: (node: MenuNode) => MenuNode) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  if (!node) return <div className="p-6 text-center text-sm text-gray-500">Chọn một mục menu để chỉnh sửa.</div>;

  const setField = (field: keyof MenuNode, value: any) => onUpdate((current) => ({ ...current, [field]: value }));
  const isLink = node.nodeType === 'link';
  const showCircleStorySettings = activeArea === 'circleStory' && isLink;
  const advancedPanelId = `circle-story-settings-${node.id}`;

  const uploadStoryImage = async (file: File | null) => {
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/admin/menus/header/images/upload', { method: 'POST', body: formData });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload?.error?.message || 'Không thể tải ảnh');
      setField('imageUrl', payload.data?.url || '');
    } catch (error: any) {
      window.alert(error.message || 'Không thể tải ảnh');
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3">
        <h2 className="font-bold text-white">Thuộc tính mục</h2>
        <p className="mt-1 text-xs text-gray-500">{NODE_TYPE_LABELS[node.nodeType]} · {node.id}</p>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
        <Field label="Tên hiển thị" id="menu-label">
          <input id="menu-label" value={node.label} onChange={(event) => setField('label', event.target.value)} className="field-input" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Hậu tố" id="menu-suffix">
            <input id="menu-suffix" value={node.suffixText || ''} onChange={(event) => setField('suffixText', event.target.value)} className="field-input" placeholder="🔥" />
          </Field>
          <Field label="Huy hiệu" id="menu-badge">
            <input id="menu-badge" value={node.badgeText || ''} onChange={(event) => setField('badgeText', event.target.value)} className="field-input" placeholder="NEW" />
          </Field>
        </div>

        <Field label="Biểu tượng" id="menu-icon">
          <select id="menu-icon" value={node.iconKey || ''} onChange={(event) => setField('iconKey', event.target.value)} className="field-input">
            <option value="">Không icon</option>
            {iconOptions.map((option) => <option key={option.key} value={option.key}>{option.key}</option>)}
          </select>
        </Field>

        {isLink && (
          <div className="space-y-3 rounded-md border border-gray-800 bg-gray-900/40 p-3">
            <Field label="Kiểu link" id="menu-link-mode">
              <select id="menu-link-mode" value={node.linkMode || 'custom'} onChange={(event) => setField('linkMode', event.target.value)} className="field-input">
                <option value="custom">URL tùy chỉnh</option>
                <option value="entity">Gắn danh mục</option>
                <option value="system">Link hệ thống</option>
              </select>
            </Field>

            {node.linkMode === 'entity' ? (
              <>
                <Field label="Loại danh mục" id="menu-entity-type">
                  <select id="menu-entity-type" value={node.entityType || 'product-category'} onChange={(event) => setField('entityType', event.target.value)} className="field-input">
                    <option value="product-category">Danh mục sản phẩm</option>
                    <option value="article-category">Danh mục bài viết</option>
                  </select>
                </Field>
                <div>
                  <label htmlFor="target-search" className="mb-1 block text-xs font-semibold text-gray-400">Tìm danh mục</label>
                  <div className="flex gap-2">
                    <input id="target-search" value={targetQuery} onChange={(event) => onTargetQuery(event.target.value)} className="field-input" placeholder="Nhập tên danh mục" />
                    <button type="button" onClick={onSearchTargets} className="rounded-md border border-gray-700 px-3 text-gray-200 hover:border-gray-500" aria-label="Tìm danh mục">
                      <Search className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-gray-800 custom-scrollbar">
                    {targetOptions.map((target) => (
                      <button
                        type="button"
                        key={`${target.type}-${target.id}`}
                        onClick={() => onUpdate((current) => ({ ...current, entityType: target.type, entityId: target.id, label: current.label || target.label }))}
                        className="block w-full border-b border-gray-800 px-3 py-2 text-left text-xs text-gray-300 hover:bg-gray-800"
                      >
                        <span className="font-semibold text-gray-100">{target.label}</span>
                        <span className="mt-0.5 block text-gray-500">ID {target.id} · {target.url}</span>
                      </button>
                    ))}
                  </div>
                  {node.entityId ? <p className="mt-2 text-xs text-green-400"><Check className="mr-1 inline h-3 w-3" />Đang gắn ID {node.entityId}</p> : null}
                </div>
                <Field label="URL ghi đè" id="menu-url-override">
                  <input id="menu-url-override" value={node.urlOverride || ''} onChange={(event) => setField('urlOverride', event.target.value)} className="field-input" placeholder="Để trống để tự lấy slug" />
                </Field>
              </>
            ) : (
              <Field label={node.linkMode === 'system' ? 'Khóa hệ thống' : 'URL'} id="menu-custom-url">
                <input id="menu-custom-url" value={node.customUrl || ''} onChange={(event) => setField('customUrl', event.target.value)} className="field-input" placeholder={node.linkMode === 'system' ? 'cart' : '/duong-dan'} />
              </Field>
            )}
          </div>
        )}

        {showCircleStorySettings && (
          <details className="rounded-md border border-gray-800 bg-gray-900/40 p-3">
            <summary
              className="cursor-pointer select-none rounded-md text-sm font-semibold text-emerald-200 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60"
              aria-controls={advancedPanelId}
            >
              Cài đặt khác
            </summary>
            <div id={advancedPanelId} className="mt-3 space-y-3">
              <Field label="Màu nền" id="circle-story-bg">
                <input
                  id="circle-story-bg"
                  value={node.backgroundColor || ''}
                  onChange={(event) => setField('backgroundColor', event.target.value.trim().replace(/^#/, '').toLowerCase())}
                  className="field-input"
                  placeholder="c3c3c3"
                  maxLength={7}
                />
              </Field>
              <div>
                <label htmlFor="circle-story-image" className="mb-1 block text-xs font-semibold text-gray-400">Ảnh icon</label>
                <div className="flex gap-2">
                  <input
                    id="circle-story-image"
                    value={node.imageUrl || ''}
                    onChange={(event) => setField('imageUrl', event.target.value)}
                    className="field-input"
                    placeholder="https://..."
                  />
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-gray-700 px-3 text-xs font-semibold text-gray-200 hover:border-gray-500">
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    Tải ảnh
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="sr-only"
                      onChange={(event) => uploadStoryImage(event.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              </div>
              <Field label="Text phụ" id="circle-story-sub-text">
                <input
                  id="circle-story-sub-text"
                  value={node.subText || ''}
                  onChange={(event) => setField('subText', event.target.value)}
                  className="field-input"
                  placeholder="NEW ARRIVALS"
                />
              </Field>
            </div>
          </details>
        )}

        <div className="grid grid-cols-3 gap-2">
          <Toggle label="Bật" checked={node.isActive !== false} onChange={(checked) => setField('isActive', checked)} />
          <Toggle label="Desktop" checked={node.desktopVisible !== false} onChange={(checked) => setField('desktopVisible', checked)} />
          <Toggle label="Mobile" checked={node.mobileVisible !== false} onChange={(checked) => setField('mobileVisible', checked)} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-gray-800 pt-3">
        <button type="button" onClick={() => onMove(-1)} className="rounded-md border border-gray-700 px-3 py-2 text-sm hover:border-gray-500"><ArrowUp className="mr-1 inline h-4 w-4" />Lên</button>
        <button type="button" onClick={() => onMove(1)} className="rounded-md border border-gray-700 px-3 py-2 text-sm hover:border-gray-500"><ArrowDown className="mr-1 inline h-4 w-4" />Xuống</button>
        <button type="button" onClick={onDuplicate} className="rounded-md border border-blue-800 px-3 py-2 text-sm text-blue-200 hover:bg-blue-950/50"><Copy className="mr-1 inline h-4 w-4" />Nhân bản</button>
        <button type="button" onClick={onDelete} className="rounded-md border border-red-900 px-3 py-2 text-sm text-red-300 hover:bg-red-950/50"><Trash2 className="mr-1 inline h-4 w-4" />Xóa</button>
      </div>
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-gray-400">{label}</label>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-md border border-gray-800 bg-gray-900/50 px-2 py-2 text-xs text-gray-300">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 rounded border-gray-700 bg-gray-950 text-emerald-600 focus:ring-emerald-500/40" />
    </label>
  );
}

function MenuIcon({
  iconKey,
  iconPathByKey,
  className,
}: {
  iconKey?: string;
  iconPathByKey: Map<string, string>;
  className?: string;
}) {
  const path = iconKey ? iconPathByKey.get(iconKey) : '';
  if (!path) return <Link2 className={className || 'h-3 w-3'} aria-hidden="true" />;
  return (
    <svg className={className || 'h-3 w-3'} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d={path} />
    </svg>
  );
}

function PreviewBadge({ value }: { value?: string }) {
  if (!value) return null;
  return (
    <span className="ml-1 inline-flex rounded-sm border border-emerald-700/70 bg-emerald-950/70 px-1 py-0.5 text-[8px] font-bold uppercase leading-none text-emerald-200">
      {value}
    </span>
  );
}

function PreviewLabel({ node, iconPathByKey }: { node: MenuNode; iconPathByKey: Map<string, string> }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1 align-middle">
      {node.iconKey ? <MenuIcon iconKey={node.iconKey} iconPathByKey={iconPathByKey} className="h-3 w-3 shrink-0" /> : null}
      {node.suffixText ? <span className="shrink-0">{node.suffixText}</span> : null}
      <span className="min-w-0 break-words">{node.label}</span>
      <PreviewBadge value={node.badgeText} />
    </span>
  );
}

function storyColor(value?: string) {
  const color = String(value || '').trim().replace(/^#/, '').toLowerCase();
  return /^[0-9a-f]{3}([0-9a-f]{3})?$/.test(color) ? `#${color}` : '#26272d';
}

function CircleStoryItemPreview({ item, selected }: { item: MenuNode; selected?: boolean }) {
  const imageUrl = String(item.imageUrl || '').trim();
  const innerStyle = imageUrl
    ? { backgroundImage: `url("${imageUrl}")` }
    : { backgroundColor: storyColor(item.backgroundColor) };

  return (
    <div className={clsx('w-20 shrink-0 text-center', selected && 'text-emerald-200')}>
      <div className={clsx('mx-auto rounded-full p-[3px]', selected && 'ring-2 ring-emerald-400/70')} style={{ background: 'linear-gradient(45deg, #00d2ff, #3a7bd5, #8a2387, #e94057, #f27121)' }}>
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-cover bg-center px-2 text-center text-[8px] font-black uppercase leading-tight text-white shadow-inner" style={innerStyle}>
          {item.subText ? <span className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.9)]">{item.subText}</span> : null}
        </div>
      </div>
      <div className="mt-2 line-clamp-2 text-[10px] font-semibold leading-tight text-white">{item.label}</div>
    </div>
  );
}

function CircleStoryPreview({ items, selectedId, mode = 'desktop' }: { items: MenuNode[]; selectedId: string | null; mode?: 'desktop' | 'mobile' }) {
  if (items.length === 0) return <PreviewEmpty />;
  const limit = mode === 'mobile' ? 6 : 12;
  return (
    <div className="overflow-hidden rounded-md border border-gray-800 bg-[#111113] p-4 text-[11px]">
      <div className="flex gap-5 overflow-x-auto pb-2 custom-scrollbar">
        {previewItems(items, selectedId, limit).map((item) => (
          <CircleStoryItemPreview key={item.id} item={item} selected={selectedId === item.id} />
        ))}
      </div>
    </div>
  );
}

function PreviewEmpty({ label = 'Chưa có mục để xem trước' }: { label?: string }) {
  return (
    <div className="flex h-48 items-center justify-center rounded-md border border-dashed border-gray-800 bg-gray-950/60 px-4 text-center text-xs text-gray-500">
      {label}
    </div>
  );
}

function DesktopPreview({
  menu,
  context,
  settings,
  iconPathByKey,
}: {
  menu: MenuDraft;
  context: PreviewContext;
  settings: MenuSettings;
  iconPathByKey: Map<string, string>;
}) {
  if (context.area !== 'zones') {
    return <DesktopAreaPreview items={visible(menu[context.area], 'desktop')} area={context.area} selectedId={context.selectedId} settings={settings} iconPathByKey={iconPathByKey} />;
  }

  const visibleZones = visible(menu.zones, 'desktop');
  const zone = context.zone && isNodeVisible(context.zone, 'desktop') ? context.zone : visibleZones[0];
  if (!zone) return <PreviewEmpty />;

  return (
    <div className="overflow-hidden rounded-md border border-gray-800 bg-black text-[11px]">
      <div className="flex h-72">
        <div className="w-36 shrink-0 border-r border-gray-800 bg-[#0c0c0e]">
          <div className="flex border-b border-gray-800 text-[10px]">
            <div className="flex-1 px-2 py-2 text-emerald-300">{settings.zonesLabel}</div>
            <div className="flex-1 px-2 py-2 text-gray-500">{settings.favesLabel}</div>
          </div>
          <div className="max-h-60 overflow-y-auto p-2 custom-scrollbar">
            {previewItems(visible(menu.zones, 'desktop'), zone.id, 10).map((item) => (
              <div key={item.id} className={clsx('mb-1 rounded px-2 py-2 text-gray-400', item.id === zone?.id && 'bg-emerald-950/60 text-white')}>
                <PreviewLabel node={item} iconPathByKey={iconPathByKey} />
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="grid grid-cols-2 gap-4">
            {visible(zone.children || [], 'desktop').length === 0 ? (
              <div className="col-span-2">
                <PreviewEmpty label="Danh mục này chưa có nhóm/link để xem trước" />
              </div>
            ) : previewItems(visible(zone.children || [], 'desktop'), context.group?.id || context.selectedId, 8).map((groupNode) => (
              <div key={groupNode.id} className={clsx('rounded-sm p-1', context.selectedId === groupNode.id && 'bg-emerald-950/35')}>
                <h4 className={clsx('mb-2 font-bold', context.selectedId === groupNode.id ? 'text-emerald-200' : 'text-cyan-100')}>{groupNode.label}</h4>
                <ul className="space-y-1.5 text-gray-400">
                  {previewItems(visible(groupNode.children || [], 'desktop'), context.selectedId, 8).map((item) => (
                    <li key={item.id} className={clsx('rounded px-1 py-0.5', context.selectedId === item.id && 'bg-emerald-950/60 text-white')}>
                      <PreviewLabel node={item} iconPathByKey={iconPathByKey} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DesktopAreaPreview({
  items,
  area,
  selectedId,
  settings,
  iconPathByKey,
}: {
  items: MenuNode[];
  area: AreaId;
  selectedId: string | null;
  settings: MenuSettings;
  iconPathByKey: Map<string, string>;
}) {
  if (items.length === 0) return <PreviewEmpty />;
  if (area === 'circleStory') return <CircleStoryPreview items={items} selectedId={selectedId} mode="desktop" />;
  const title = areaLabel(area, settings);

  if (area === 'topNav') {
    return (
      <div className="rounded-md border border-gray-800 bg-black p-3 text-[11px]">
        <div className="mb-3 text-xs font-bold text-emerald-300">{title}</div>
        <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto custom-scrollbar">
          {previewItems(items, selectedId, 12).map((item) => (
            <div key={item.id} className={clsx('rounded-full border border-gray-800 bg-gray-950 px-3 py-2 text-gray-300', selectedId === item.id && 'border-emerald-700 bg-emerald-950/50 text-white')}>
              <PreviewLabel node={item} iconPathByKey={iconPathByKey} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-gray-800 bg-black p-3 text-[11px]">
      <div className="mb-3 text-xs font-bold text-emerald-300">{title}</div>
      <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto custom-scrollbar">
        {previewItems(items, selectedId, 8).map((item) => (
          <div key={item.id} className={clsx('rounded-md border border-gray-800 bg-gray-950 p-2 text-gray-300', selectedId === item.id && 'border-emerald-700 bg-emerald-950/50 text-white')}>
            <PreviewLabel node={item} iconPathByKey={iconPathByKey} />
          </div>
        ))}
      </div>
    </div>
  );
}

function MobilePreview({
  menu,
  context,
  settings,
  iconPathByKey,
}: {
  menu: MenuDraft;
  context: PreviewContext;
  settings: MenuSettings;
  iconPathByKey: Map<string, string>;
}) {
  if (context.area !== 'zones') {
    return <MobileAreaPreview items={visible(menu[context.area], 'mobile')} area={context.area} selectedId={context.selectedId} settings={settings} iconPathByKey={iconPathByKey} />;
  }

  const visibleZones = visible(menu.zones, 'mobile');
  const zone = context.zone && isNodeVisible(context.zone, 'mobile') ? context.zone : visibleZones[0];
  if (!zone) return <PreviewEmpty />;
  return (
    <div className="mx-auto max-w-[260px] rounded-2xl border border-gray-800 bg-black p-3 text-[11px]">
      <div className="mb-3 flex rounded-full bg-gray-900 p-1">
        <div className="flex-1 rounded-full bg-gray-800 py-1 text-center text-emerald-300">{settings.zonesLabel}</div>
        <div className="flex-1 py-1 text-center text-gray-500">{settings.favesLabel}</div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {previewItems(visible(menu.zones, 'mobile'), zone?.id, 9).map((item) => (
          <div key={item.id} className={clsx('rounded-lg border border-gray-800 bg-gray-900 p-2 text-center text-gray-300', item.id === zone?.id && 'border-emerald-700 bg-emerald-950/50 text-white')}>
            <MenuIcon iconKey={item.iconKey} iconPathByKey={iconPathByKey} className="mx-auto mb-1 h-4 w-4 text-gray-400" />
            <span className="line-clamp-2">{item.suffixText ? `${item.suffixText} ` : ''}{item.label}</span>
          </div>
        ))}
      </div>
      {zone ? (
        <div className="mt-3 max-h-32 overflow-y-auto border-t border-gray-800 pt-3 custom-scrollbar">
          {previewItems(visible(zone.children || [], 'mobile'), context.group?.id || context.selectedId, 6).map((groupNode) => (
            <div key={groupNode.id} className="mb-3">
              <div className="mb-1 font-bold text-emerald-200">{groupNode.label}</div>
              <div className="space-y-1">
                {previewItems(visible(groupNode.children || [], 'mobile'), context.selectedId, 4).map((item) => (
                  <div key={item.id} className={clsx('rounded px-2 py-1 text-gray-400', context.selectedId === item.id && 'bg-emerald-950/60 text-white')}>
                    <PreviewLabel node={item} iconPathByKey={iconPathByKey} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MobileAreaPreview({
  items,
  area,
  selectedId,
  settings,
  iconPathByKey,
}: {
  items: MenuNode[];
  area: AreaId;
  selectedId: string | null;
  settings: MenuSettings;
  iconPathByKey: Map<string, string>;
}) {
  if (items.length === 0) return <PreviewEmpty />;
  if (area === 'circleStory') return <CircleStoryPreview items={items} selectedId={selectedId} mode="mobile" />;
  const title = areaLabel(area, settings);
  return (
    <div className="mx-auto max-w-[260px] rounded-2xl border border-gray-800 bg-black p-3 text-[11px]">
      <div className="mb-3 rounded-full bg-gray-900 px-3 py-2 text-center font-bold text-emerald-300">{title}</div>
      <div className="space-y-2">
        {previewItems(items, selectedId, 8).map((item) => (
          <div key={item.id} className={clsx('rounded-lg border border-gray-800 bg-gray-900 p-2 text-gray-300', selectedId === item.id && 'border-emerald-700 bg-emerald-950/50 text-white')}>
            <PreviewLabel node={item} iconPathByKey={iconPathByKey} />
          </div>
        ))}
      </div>
    </div>
  );
}
