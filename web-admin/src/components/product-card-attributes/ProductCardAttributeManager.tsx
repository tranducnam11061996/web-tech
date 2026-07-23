'use client';

import clsx from 'clsx';
import { Eye, Layers, Plus, Save, Search, Trash2 } from 'lucide-react';
import { useMemo, useState, useTransition } from 'react';

type BadgeSlot = 'image_top_left' | 'image_bottom_center';
type ColorVariant = 'red' | 'blue' | 'cyan' | 'green' | 'amber' | 'purple' | 'slate';
type ValueMode = 'value' | 'attribute_value';

type CategoryNode = {
  id: number;
  name: string;
  parentId: number;
  status: number;
  productCount: number;
};

type AttributeOption = {
  id: number;
  attributeCode: string;
  filterCode: string;
  name: string;
  ordering: number;
};

type Rule = {
  id?: number;
  attrId: number;
  attributeCode: string;
  attributeName: string;
  slot: BadgeSlot;
  colorVariant: ColorVariant;
  labelTemplate: string;
  valueMode: ValueMode;
  maxValues: number;
  ordering: number;
  status: boolean;
  inheritToChildren: boolean;
  categoryId?: number;
};

type PreviewProduct = {
  id: number;
  name: string;
  slug: string;
  thumbnail: string;
  price: number;
  marketPrice: number;
  brand: string;
  attributeValues: Array<{
    attributeId: number;
    attributeCode: string;
    attributeName: string;
    valueId: number;
    value: string;
  }>;
};

type EditorData = {
  categories: CategoryNode[];
  selectedCategoryId: number;
  availableAttributes: AttributeOption[];
  rules: Rule[];
  inheritedRules: Rule[];
  previewProduct: PreviewProduct | null;
  migrationRequired: boolean;
};

type DraftRule = Rule & { draftId: string };

const slotLabels: Record<BadgeSlot, string> = {
  image_top_left: 'Góc trái ảnh',
  image_bottom_center: 'Giữa đáy ảnh',
};

const colorLabels: Record<ColorVariant, string> = {
  red: 'Đỏ CPU',
  blue: 'Xanh RAM/SSD',
  cyan: 'Cyan VGA',
  green: 'Xanh lá',
  amber: 'Vàng',
  purple: 'Tím',
  slate: 'Xám',
};

const badgeColorClasses: Record<ColorVariant, string> = {
  red: 'bg-red-500 text-white shadow-red-950/40',
  blue: 'bg-blue-600 text-white shadow-blue-950/40',
  cyan: 'bg-cyan-500 text-white shadow-cyan-950/40',
  green: 'bg-emerald-500 text-white shadow-emerald-950/40',
  amber: 'bg-amber-500 text-zinc-950 shadow-amber-950/40',
  purple: 'bg-violet-500 text-white shadow-violet-950/40',
  slate: 'bg-slate-500 text-white shadow-slate-950/40',
};

function formatPrice(value: number) {
  return new Intl.NumberFormat('vi-VN').format(Math.max(0, Math.round(value || 0)));
}

function makeDraftRule(rule: Rule, index: number): DraftRule {
  return {
    ...rule,
    draftId: `${rule.id || 'rule'}-${rule.attrId}-${rule.slot}-${index}`,
  };
}

function ruleText(rule: Rule, value: PreviewProduct['attributeValues'][number]) {
  if (!value?.value) return '';
  if (rule.labelTemplate) {
    return rule.labelTemplate
      .replace(/\{value\}/gi, value.value)
      .replace(/\{attribute\}/gi, value.attributeName)
      .replace(/\{code\}/gi, rule.attributeCode)
      .trim();
  }
  if (rule.valueMode === 'attribute_value') return `${value.attributeName}: ${value.value}`;
  return value.value;
}

export function buildPreviewBadges(product: PreviewProduct | null, rules: Rule[], inheritedRules: Rule[]) {
  if (!product) return [];
  const uniqueByAttributeAndSlot = (source: Rule[]) => {
    const seen = new Set<string>();
    return source.filter((rule) => {
      const key = `${rule.attrId}:${rule.slot}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };
  const directRules = uniqueByAttributeAndSlot(rules);
  const inherited = uniqueByAttributeAndSlot(inheritedRules);
  const directKeys = new Set(directRules.map((rule) => `${rule.attrId}:${rule.slot}`));
  const effectiveRules = [
    ...inherited.filter((rule) => !directKeys.has(`${rule.attrId}:${rule.slot}`)),
    ...directRules,
  ]
    .filter((rule) => rule.status)
    .sort((left, right) => left.ordering - right.ordering);

  const badges: Array<{
    key: string;
    text: string;
    slot: BadgeSlot;
    colorVariant: ColorVariant;
    ordering: number;
  }> = [];
  const badgeKeys = new Set<string>();
  for (const rule of effectiveRules) {
    const valueKeys = new Set<number>();
    const values = product.attributeValues.filter((value) => {
      if (value.attributeId !== rule.attrId || valueKeys.has(value.valueId)) return false;
      valueKeys.add(value.valueId);
      return true;
    }).slice(0, Math.max(1, Math.min(3, rule.maxValues || 1)));
    for (const value of values) {
      const key = `${rule.attrId}-${value.valueId}-${rule.slot}`;
      const text = ruleText(rule, value);
      if (!text || badgeKeys.has(key)) continue;
      badgeKeys.add(key);
      badges.push({
        key,
        text,
        slot: rule.slot,
        colorVariant: rule.colorVariant,
        ordering: rule.ordering,
      });
    }
  }
  return badges;
}

function categoryDepth(category: CategoryNode, parentById: Map<number, number>) {
  let depth = 0;
  let current = parentById.get(category.id) || 0;
  const seen = new Set<number>();
  while (current > 0 && !seen.has(current) && depth < 6) {
    seen.add(current);
    depth += 1;
    current = parentById.get(current) || 0;
  }
  return depth;
}

export function ProductCardAttributeManager({ initialData }: { initialData: EditorData }) {
  const [data, setData] = useState(initialData);
  const [rules, setRules] = useState<DraftRule[]>(initialData.rules.map(makeDraftRule));
  const [categorySearch, setCategorySearch] = useState('');
  const [isPending, startTransition] = useTransition();
  const [saveState, setSaveState] = useState<'idle' | 'saved' | 'error'>('idle');
  const [error, setError] = useState('');

  const parentById = useMemo(
    () => new Map(data.categories.map((category) => [category.id, category.parentId])),
    [data.categories],
  );

  const visibleCategories = useMemo(() => {
    const keyword = categorySearch.trim().toLowerCase();
    return data.categories
      .filter((category) => !keyword || category.name.toLowerCase().includes(keyword) || String(category.id).includes(keyword))
      .slice(0, keyword ? 120 : 260);
  }, [categorySearch, data.categories]);

  const selectedCategory = data.categories.find((category) => category.id === data.selectedCategoryId);
  const previewBadges = buildPreviewBadges(data.previewProduct, rules, data.inheritedRules);
  const topLeftBadges = previewBadges.filter((badge) => badge.slot === 'image_top_left');
  const bottomBadges = previewBadges.filter((badge) => badge.slot === 'image_bottom_center');

  const loadCategory = (categoryId: number) => {
    startTransition(async () => {
      setError('');
      setSaveState('idle');
      const response = await fetch(`/api/admin/product-card-attribute-rules?categoryId=${categoryId}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        setError(payload?.error?.message || 'Không thể tải cấu hình danh mục');
        return;
      }
      setData(payload.data);
      setRules((payload.data.rules || []).map(makeDraftRule));
    });
  };

  const addRule = () => {
    const used = new Set(rules.map((rule) => `${rule.attrId}:${rule.slot}`));
    const attribute = data.availableAttributes.find((item) => !used.has(`${item.id}:image_top_left`))
      || data.availableAttributes[0];
    if (!attribute) return;
    setRules((current) => [
      ...current,
      {
        draftId: `new-${attribute.id}-${Date.now()}`,
        attrId: attribute.id,
        attributeCode: attribute.attributeCode,
        attributeName: attribute.name,
        slot: 'image_top_left',
        colorVariant: 'blue',
        labelTemplate: '',
        valueMode: 'value',
        maxValues: 1,
        ordering: (current.length + 1) * 10,
        status: true,
        inheritToChildren: true,
      },
    ]);
  };

  const updateRule = (draftId: string, patch: Partial<DraftRule>) => {
    setRules((current) => current.map((rule) => (rule.draftId === draftId ? { ...rule, ...patch } : rule)));
  };

  const changeRuleAttribute = (draftId: string, attrId: number) => {
    const attribute = data.availableAttributes.find((item) => item.id === attrId);
    if (!attribute) return;
    updateRule(draftId, {
      attrId: attribute.id,
      attributeCode: attribute.attributeCode,
      attributeName: attribute.name,
    });
  };

  const removeRule = (draftId: string) => {
    setRules((current) => current.filter((rule) => rule.draftId !== draftId));
  };

  const saveRules = () => {
    startTransition(async () => {
      setError('');
      setSaveState('idle');
      const response = await fetch('/api/admin/product-card-attribute-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: data.selectedCategoryId,
          rules: rules.map(({ draftId: _draftId, ...rule }) => rule),
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        setSaveState('error');
        setError(payload?.error?.message || 'Không thể lưu cấu hình');
        return;
      }
      setData(payload.data);
      setRules((payload.data.rules || []).map(makeDraftRule));
      setSaveState('saved');
    });
  };

  return (
    <div className="grid h-full min-h-0 grid-cols-[300px_minmax(0,1fr)_360px] gap-3">
      <aside className="glass-panel flex min-h-0 flex-col overflow-hidden rounded-xl border border-gray-800 bg-gray-950/70">
        <div className="border-b border-gray-800 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-gray-200">
            <Layers className="h-4 w-4 text-cyan-400" />
            Danh mục
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
            <input
              value={categorySearch}
              onChange={(event) => setCategorySearch(event.target.value)}
              placeholder="Tìm danh mục..."
              className="w-full rounded-lg border border-gray-800 bg-gray-900 py-2 pl-9 pr-3 text-sm text-gray-200 outline-none transition focus:border-cyan-500"
            />
          </div>
        </div>
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
          {visibleCategories.map((category) => {
            const active = category.id === data.selectedCategoryId;
            const depth = categoryDepth(category, parentById);
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => loadCategory(category.id)}
                className={clsx(
                  'mb-1 flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition',
                  active
                    ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-200'
                    : 'border-transparent text-gray-400 hover:border-gray-700 hover:bg-gray-900 hover:text-gray-200',
                )}
                style={{ paddingLeft: `${12 + depth * 14}px` }}
              >
                <span className="line-clamp-1">{category.name}</span>
                <span className="ml-2 rounded-full bg-gray-900 px-2 py-0.5 text-[10px] text-gray-500">{category.productCount}</span>
              </button>
            );
          })}
        </div>
      </aside>

      <main className="glass-panel flex min-h-0 flex-col overflow-hidden rounded-xl border border-gray-800 bg-gray-950/60">
        <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
          <div>
            <h1 className="text-lg font-bold text-white">Cấu hình thông số trên card sản phẩm</h1>
            <p className="mt-1 text-sm text-gray-500">
              {selectedCategory ? `${selectedCategory.name} · ID ${selectedCategory.id}` : 'Chọn danh mục để cấu hình'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={addRule}
              disabled={data.availableAttributes.length === 0 || isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-300 transition hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Thêm rule
            </button>
            <button
              type="button"
              onClick={saveRules}
              disabled={isPending || !data.selectedCategoryId}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Lưu cấu hình
            </button>
          </div>
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-5">
          {data.migrationRequired ? (
            <div className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
              Chưa thấy bảng cấu hình. Lưu lần đầu hoặc chạy admin:migrate sẽ tạo bảng và seed rule laptop mặc định.
            </div>
          ) : null}
          {error ? (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>
          ) : null}
          {saveState === 'saved' ? (
            <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              Đã lưu cấu hình và làm mới cache public.
            </div>
          ) : null}

          {data.inheritedRules.length > 0 ? (
            <section className="mb-5 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
              <div className="mb-3 text-sm font-semibold text-blue-200">Rule kế thừa từ danh mục cha</div>
              <div className="flex flex-wrap gap-2">
                {data.inheritedRules.map((rule) => (
                  <span key={`${rule.categoryId}-${rule.attrId}-${rule.slot}`} className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs text-blue-100">
                    {rule.attributeName} · {slotLabels[rule.slot]}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          <div className="space-y-3">
            {rules.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900/30 p-8 text-center text-gray-500">
                Danh mục này chưa có rule hiển thị badge. Thêm rule nếu muốn card sản phẩm hiện thông số.
              </div>
            ) : (
              rules.map((rule, index) => (
                <div key={rule.draftId} className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="text-sm font-bold text-gray-200">Rule #{index + 1}</div>
                    <button
                      type="button"
                      onClick={() => removeRule(rule.draftId)}
                      className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-red-300 transition hover:bg-red-500/20"
                      aria-label="Xóa rule"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                    <label className="space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Attribute</span>
                      <select
                        value={rule.attrId}
                        onChange={(event) => changeRuleAttribute(rule.draftId, Number(event.target.value))}
                        className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-200 outline-none focus:border-cyan-500"
                      >
                        {data.availableAttributes.map((attribute) => (
                          <option key={attribute.id} value={attribute.id}>
                            {attribute.name} ({attribute.attributeCode || attribute.filterCode || attribute.id})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Vị trí</span>
                      <select
                        value={rule.slot}
                        onChange={(event) => updateRule(rule.draftId, { slot: event.target.value as BadgeSlot })}
                        className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-200 outline-none focus:border-cyan-500"
                      >
                        {Object.entries(slotLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Màu badge</span>
                      <select
                        value={rule.colorVariant}
                        onChange={(event) => updateRule(rule.draftId, { colorVariant: event.target.value as ColorVariant })}
                        className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-200 outline-none focus:border-cyan-500"
                      >
                        {Object.entries(colorLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Thứ tự</span>
                      <input
                        type="number"
                        value={rule.ordering}
                        onChange={(event) => updateRule(rule.draftId, { ordering: Number(event.target.value || 0) })}
                        className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-200 outline-none focus:border-cyan-500"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Kiểu text</span>
                      <select
                        value={rule.valueMode}
                        onChange={(event) => updateRule(rule.draftId, { valueMode: event.target.value as ValueMode })}
                        className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-200 outline-none focus:border-cyan-500"
                      >
                        <option value="value">Chỉ giá trị</option>
                        <option value="attribute_value">Tên + giá trị</option>
                      </select>
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Số value tối đa</span>
                      <input
                        type="number"
                        min={1}
                        max={3}
                        value={rule.maxValues}
                        onChange={(event) => updateRule(rule.draftId, { maxValues: Number(event.target.value || 1) })}
                        className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-200 outline-none focus:border-cyan-500"
                      />
                    </label>
                    <label className="col-span-2 space-y-1">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Template tùy chọn</span>
                      <input
                        value={rule.labelTemplate}
                        onChange={(event) => updateRule(rule.draftId, { labelTemplate: event.target.value })}
                        placeholder="Ví dụ: {value} hoặc {attribute}: {value}"
                        className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-200 outline-none focus:border-cyan-500"
                      />
                    </label>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-400">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={rule.status}
                        onChange={(event) => updateRule(rule.draftId, { status: event.target.checked })}
                        className="rounded border-gray-700 bg-gray-950"
                      />
                      Đang bật
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={rule.inheritToChildren}
                        onChange={(event) => updateRule(rule.draftId, { inheritToChildren: event.target.checked })}
                        className="rounded border-gray-700 bg-gray-950"
                      />
                      Kế thừa xuống danh mục con
                    </label>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      <aside className="glass-panel flex min-h-0 flex-col rounded-xl border border-gray-800 bg-gray-950/70">
        <div className="flex items-center gap-2 border-b border-gray-800 p-4 text-sm font-bold uppercase tracking-wider text-gray-200">
          <Eye className="h-4 w-4 text-emerald-400" />
          Preview
        </div>
        <div className="flex flex-1 items-start justify-center overflow-y-auto p-5">
          <article className="relative w-full max-w-[310px] overflow-hidden rounded-2xl border border-[#27272a] bg-gradient-to-b from-[#1a1a1d] to-[#111113] shadow-2xl">
            <div className="relative flex aspect-[4/3] w-full items-center justify-center bg-[#151518]">
              {data.previewProduct?.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={data.previewProduct.thumbnail} alt="" className="h-full w-full object-cover opacity-80" />
              ) : (
                <div className="text-sm text-gray-600">No preview product</div>
              )}
              <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
                {topLeftBadges.map((badge) => (
                  <span key={badge.key} className={clsx('rounded-md px-2.5 py-1 text-[11px] font-black shadow-lg', badgeColorClasses[badge.colorVariant])}>
                    {badge.text}
                  </span>
                ))}
              </div>
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1.5">
                {bottomBadges.map((badge) => (
                  <span key={badge.key} className={clsx('rounded-md px-2.5 py-1 text-[11px] font-black shadow-lg', badgeColorClasses[badge.colorVariant])}>
                    {badge.text}
                  </span>
                ))}
              </div>
            </div>
            <div className="p-4">
              <div className="mb-4 min-h-12 text-sm font-semibold text-gray-200 line-clamp-2">
                {data.previewProduct?.name || 'Sản phẩm preview'}
              </div>
              <div className="text-xl font-black text-orange-500">
                {formatPrice(data.previewProduct?.price || 0)}đ
              </div>
            </div>
          </article>
        </div>
      </aside>
    </div>
  );
}
