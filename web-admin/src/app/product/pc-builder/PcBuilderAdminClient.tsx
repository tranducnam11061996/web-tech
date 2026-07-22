"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pencil, Plus, Save, Search, Tag, Trash2, X } from "lucide-react";

type Relation = {
  id?: number;
  relatedComponentCode: string;
  attributeId: number;
  attributeName?: string;
  ordering: number;
  sourceProductCount?: number;
  sourceAttributeProductCount?: number;
  relatedProductCount?: number;
  relatedAttributeProductCount?: number;
  enforceable?: boolean;
};
type ComponentRow = {
  code?: string;
  categoryId: number;
  categoryName: string;
  name: string;
  required: boolean;
  minSelections?: number;
  maxSelections: number;
  ordering: number;
  status: boolean;
  productCount: number;
  relations: Relation[];
};
type Configuration = { version: string; components: ComponentRow[] };
type Dashboard = {
  installed: boolean;
  minimumBudget: number;
  componentConfiguration: Configuration | null;
};
type CategoryOption = {
  id: number;
  name: string;
  parentId: number;
  ordering: number;
  productCount: number;
};
type AttributeOption = {
  id: number;
  name: string;
  attributeCode: string;
  sourceProducts: number;
  relatedProducts: number;
  sourceTotal: number;
  relatedTotal: number;
  enforceable: boolean;
};
type PromotionTarget = { type: "product" | "category"; id: number };
type PromotionRequirement = { componentCode: string; minDistinctSkus: number };
type PromotionRow = {
  id?: number;
  name: string;
  discountType: "fixed" | "percent";
  discountValue: number;
  maxDiscount: number | null;
  priority: number;
  status: boolean;
  startsAt: string | null;
  endsAt: string | null;
  targets: PromotionTarget[];
  requirements: PromotionRequirement[];
};
type PromotionConfiguration = { installed?: boolean; version: string; promotions: PromotionRow[] };

function coveragePercent(covered = 0, total = 0) {
  return total > 0 ? Math.round((covered / total) * 100) : 0;
}

const emptyRow = (): ComponentRow => ({
  categoryId: 0,
  categoryName: "",
  name: "",
  required: false,
  maxSelections: 1,
  ordering: 10,
  status: true,
  productCount: 0,
  relations: [],
});
const emptyPromotion = (): PromotionRow => ({
  name: "",
  discountType: "fixed",
  discountValue: 100_000,
  maxDiscount: null,
  priority: 0,
  status: true,
  startsAt: null,
  endsAt: null,
  targets: [{ type: "category", id: 0 }],
  requirements: [],
});

function toLocalDateTimeInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function flattenCategories(options: CategoryOption[]) {
  const byParent = new Map<number, CategoryOption[]>();
  const ids = new Set(options.map((item) => item.id));
  for (const option of options) {
    const parent = ids.has(option.parentId) ? option.parentId : 0;
    byParent.set(parent, [...(byParent.get(parent) || []), option]);
  }
  const output: Array<CategoryOption & { depth: number }> = [];
  const visit = (parentId: number, depth: number) => {
    const children = [...(byParent.get(parentId) || [])].sort(
      (a, b) => b.ordering - a.ordering || a.name.localeCompare(b.name, "vi"),
    );
    for (const child of children) {
      output.push({ ...child, depth });
      visit(child.id, depth + 1);
    }
  };
  visit(0, 0);
  return output;
}

function CategoryPicker({
  value,
  options,
  disabledIds,
  allowedIds,
  onChange,
}: {
  value: number;
  options: CategoryOption[];
  disabledIds?: Set<number>;
  allowedIds?: Set<number>;
  onChange: (category: CategoryOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((item) => item.id === value);
  const flat = useMemo(() => flattenCategories(options), [options]);
  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("vi");
    if (!term) return flat;
    return flat.filter(
      (item) =>
        String(item.id) === term ||
        item.name.toLocaleLowerCase("vi").includes(term),
    );
  }, [flat, query]);
  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-left text-sm text-white"
      >
        {selected ? `#${selected.id} — ${selected.name}` : "Chọn danh mục…"}
      </button>
      {open ? (
        <div className="absolute z-30 mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-2 shadow-2xl">
          <label className="flex min-h-11 items-center gap-2 rounded-md border border-slate-700 px-3">
            <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <span className="sr-only">Tìm danh mục sản phẩm</span>
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm theo ID hoặc tên danh mục…"
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            />
          </label>
          <div className="mt-2 max-h-72 overflow-y-auto" role="listbox">
            {visible.map((item) => {
              const disabled =
                (allowedIds && !allowedIds.has(item.id) && item.id !== value) ||
                (disabledIds?.has(item.id) && item.id !== value);
              return (
                <button
                  type="button"
                  key={item.id}
                  disabled={disabled}
                  onClick={() => {
                    onChange(item);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex min-h-10 w-full items-center justify-between rounded px-2 text-left text-sm text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-35"
                  style={{ paddingLeft: `${8 + item.depth * 18}px` }}
                  role="option"
                  aria-selected={item.id === value}
                >
                  <span>{item.depth ? `${"– ".repeat(Math.min(item.depth, 3))}${item.name}` : item.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-slate-500">#{item.id} · {item.productCount} SKU</span>
                </button>
              );
            })}
            {!visible.length ? <p className="p-3 text-sm text-slate-400">Không tìm thấy danh mục.</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function PcBuilderAdminClient({ initialData }: { initialData: Dashboard }) {
  const [activeTab, setActiveTab] = useState<"components" | "promotions">("components");
  const [configuration, setConfiguration] = useState<Configuration | null>(initialData.componentConfiguration);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<ComponentRow>(emptyRow());
  const [attributes, setAttributes] = useState<Record<number, AttributeOption[]>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [promotionConfiguration, setPromotionConfiguration] = useState<PromotionConfiguration | null>(null);
  const [promotionDraft, setPromotionDraft] = useState<PromotionRow>(emptyPromotion());
  const [promotionEditingIndex, setPromotionEditingIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const promotionDialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    fetch("/api/admin/pc-builder/category-options")
      .then((response) => response.json())
      .then((payload) => setCategories(payload.data || []))
      .catch(() => setMessage("Không tải được cây danh mục sản phẩm."));
  }, []);
  useEffect(() => {
    fetch("/api/admin/pc-builder/promotions")
      .then((response) => response.json())
      .then((payload) => setPromotionConfiguration(payload.data || null))
      .catch(() => setMessage("Không tải được cấu hình khuyến mãi Build PC."));
  }, []);

  const components = configuration?.components || [];
  const usedCategoryIds = useMemo(() => new Set(components.map((item) => item.categoryId)), [components]);
  const componentCategoryIds = useMemo(() => new Set(components.filter((item) => item.code && item.code !== draft.code).map((item) => item.categoryId)), [components, draft.code]);
  const componentByCode = useMemo(() => new Map(components.map((item) => [item.code || "", item])), [components]);

  const openEditor = (index: number | null) => {
    const source = index === null ? emptyRow() : components[index];
    setDraft({ ...source, relations: source.relations.map((relation) => ({ ...relation })) });
    setEditingIndex(index);
    setAttributes({});
    dialogRef.current?.showModal();
  };

  const loadAttributes = async (relationIndex: number, relatedCode: string) => {
    const related = componentByCode.get(relatedCode);
    if (!draft.categoryId || !related?.categoryId) return;
    const response = await fetch(
      `/api/admin/pc-builder/relation-attributes?sourceCategoryId=${draft.categoryId}&relatedCategoryId=${related.categoryId}`,
    );
    const payload = await response.json();
    setAttributes((current) => ({ ...current, [relationIndex]: payload.data || [] }));
  };

  const commitDraft = () => {
    if (!draft.categoryId || !draft.name.trim()) {
      setMessage("Hãy chọn danh mục và nhập text hiển thị.");
      return;
    }
    if (draft.relations.some((relation) => !relation.relatedComponentCode || !relation.attributeId)) {
      setMessage("Hãy chọn đầy đủ danh mục liên quan và thuộc tính tham chiếu.");
      return;
    }
    const next = [...components];
    if (editingIndex === null) next.push(draft);
    else next[editingIndex] = draft;
    setConfiguration((current) => current && { ...current, components: next });
    dialogRef.current?.close();
    setMessage("Đã cập nhật bản nháp. Bấm “Lưu cấu hình” để ghi dữ liệu.");
  };

  const save = async () => {
    if (!configuration) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/pc-builder/components", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version: configuration.version,
          components: configuration.components.map((component) => ({
            code: component.code,
            categoryId: component.categoryId,
            name: component.name,
            required: component.required,
            maxSelections: component.maxSelections,
            ordering: component.ordering,
            status: component.status,
            relations: component.relations.map((relation, index) => ({
              relatedComponentCode: relation.relatedComponentCode,
              attributeId: relation.attributeId,
              ordering: index,
            })),
          })),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || "Không thể lưu cấu hình.");
      setConfiguration(payload.data);
      setMessage("Đã lưu cấu hình catalog-live.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể lưu cấu hình.");
    } finally {
      setBusy(false);
    }
  };

  const openPromotionEditor = (index: number | null) => {
    const source = index === null ? emptyPromotion() : promotionConfiguration!.promotions[index];
    setPromotionDraft({ ...source, targets: source.targets.map((target) => ({ ...target })), requirements: source.requirements.map((item) => ({ ...item })) });
    setPromotionEditingIndex(index);
    promotionDialogRef.current?.showModal();
  };

  const commitPromotionDraft = () => {
    if (!promotionDraft.name.trim() || promotionDraft.targets.some((target) => target.id <= 0)) {
      setMessage("Hãy nhập tên và chọn đầy đủ SKU/category mục tiêu.");
      return;
    }
    setPromotionConfiguration((current) => {
      if (!current) return current;
      const promotions = [...current.promotions];
      if (promotionEditingIndex === null) promotions.push(promotionDraft);
      else promotions[promotionEditingIndex] = promotionDraft;
      return { ...current, promotions };
    });
    promotionDialogRef.current?.close();
    setMessage("Đã cập nhật bản nháp khuyến mãi. Bấm “Lưu khuyến mãi” để ghi dữ liệu.");
  };

  const savePromotions = async () => {
    if (!promotionConfiguration) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/pc-builder/promotions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(promotionConfiguration),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error?.message || "Không thể lưu khuyến mãi.");
      setPromotionConfiguration(payload.data);
      setMessage("Đã lưu khuyến mãi Build PC.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể lưu khuyến mãi.");
    } finally {
      setBusy(false);
    }
  };

  if (!initialData.installed || !configuration)
    return (
      <main className="p-6 text-white">
        <h1 className="text-2xl font-black">Quản lý Build PC</h1>
        <p className="mt-5 rounded-lg border border-amber-700 bg-amber-950/40 p-4 text-amber-200">
          Schema PC Builder catalog-live v4 chưa được cài đặt. Hãy chạy migration sau khi backup và restore-verify.
        </p>
      </main>
    );

  return (
    <main className="min-h-screen bg-[#070910] p-4 text-white md:p-8">
      <div className="mx-auto max-w-[1500px]">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-400">PC Builder Catalog-live</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black">Quản lý Build PC</h1>
            <p className="mt-1 text-sm text-slate-400">Danh mục động, quan hệ thuộc tính và toàn bộ SKU đang bán.</p>
          </div>
          <div className="flex gap-2">
            {activeTab === "components" ? <>
              <button type="button" onClick={() => openEditor(null)} className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-700 px-4 font-bold hover:bg-slate-900"><Plus className="h-4 w-4" aria-hidden="true" /> Thêm danh mục</button>
              <button type="button" disabled={busy} onClick={save} className="flex min-h-11 items-center gap-2 rounded-lg bg-red-600 px-4 font-bold hover:bg-red-500 disabled:opacity-50"><Save className="h-4 w-4" aria-hidden="true" /> {busy ? "Đang lưu…" : "Lưu cấu hình"}</button>
            </> : <>
              <button type="button" disabled={promotionConfiguration?.installed === false} onClick={() => openPromotionEditor(null)} className="flex min-h-11 items-center gap-2 rounded-lg border border-slate-700 px-4 font-bold hover:bg-slate-900 disabled:opacity-50"><Plus className="h-4 w-4" aria-hidden="true" /> Thêm khuyến mãi</button>
              <button type="button" disabled={busy || !promotionConfiguration || promotionConfiguration.installed === false} onClick={savePromotions} className="flex min-h-11 items-center gap-2 rounded-lg bg-red-600 px-4 font-bold hover:bg-red-500 disabled:opacity-50"><Save className="h-4 w-4" aria-hidden="true" /> {busy ? "Đang lưu…" : "Lưu khuyến mãi"}</button>
            </>}
          </div>
        </div>
        {message ? <p className="mt-4 rounded-lg border border-slate-800 bg-slate-950 p-3 text-sm" role="status">{message}</p> : null}
        {activeTab === "promotions" && promotionConfiguration?.installed === false ? (
          <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-100" role="status">
            Schema khuyến mãi PC Builder v5 chưa được cài đặt. Hãy chạy migration chuyên dụng sau khi backup và restore-verify.
          </p>
        ) : null}

        <div className="mt-6 flex gap-1 border-b border-slate-800" role="tablist" aria-label="Quản lý PC Builder">
          <button type="button" role="tab" aria-selected={activeTab === "components"} onClick={() => setActiveTab("components")} className={`min-h-11 border-b-2 px-4 text-sm font-bold ${activeTab === "components" ? "border-red-500 text-white" : "border-transparent text-slate-400"}`}>Danh mục linh kiện</button>
          <button type="button" role="tab" aria-selected={activeTab === "promotions"} onClick={() => setActiveTab("promotions")} className={`min-h-11 border-b-2 px-4 text-sm font-bold ${activeTab === "promotions" ? "border-red-500 text-white" : "border-transparent text-slate-400"}`}><Tag className="mr-2 inline h-4 w-4" aria-hidden="true" />Khuyến mãi Build PC</button>
        </div>

        {activeTab === "components" ? <section className="mt-6 overflow-hidden rounded-xl border border-slate-800 bg-[#090d19]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-slate-900/80 text-xs uppercase text-slate-400">
                <tr>
                  <th className="p-3">STT</th><th className="p-3">ID</th><th className="p-3">Tên category</th>
                  <th className="p-3">Text hiển thị</th><th className="p-3">Bắt buộc</th><th className="p-3">Tối đa SKU</th>
                  <th className="p-3">Danh mục liên quan / thuộc tính</th><th className="p-3">SKU đang bán</th><th className="p-3">Trạng thái</th><th className="p-3">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {[...components].sort((a, b) => a.ordering - b.ordering).map((component) => {
                  const originalIndex = components.indexOf(component);
                  return (
                    <tr key={component.code || component.categoryId} className="border-t border-slate-800 align-top">
                      <td className="p-3 tabular-nums">{component.ordering}</td>
                      <td className="p-3 text-sky-300">{component.categoryId}</td>
                      <td className="p-3 font-semibold">{component.categoryName}</td>
                      <td className="p-3">{component.name}</td>
                      <td className="p-3">{component.required ? <span className="rounded-full bg-red-950 px-2 py-1 text-red-300">Bắt buộc</span> : <span className="text-slate-500">Tùy chọn</span>}</td>
                      <td className="p-3 tabular-nums">{component.maxSelections}</td>
                      <td className="p-3 text-xs text-slate-300">
                        {component.relations.length ? (
                          <div className="space-y-2">
                            {component.relations.map((relation) => (
                              <div key={`${relation.relatedComponentCode}:${relation.attributeId}`}>
                                <span>
                                  {componentByCode.get(relation.relatedComponentCode)?.name || relation.relatedComponentCode}
                                  {" / "}
                                  {relation.attributeName || `#${relation.attributeId}`}
                                </span>
                                {relation.enforceable === false ? (
                                  <span className="mt-1 block rounded border border-amber-800/70 bg-amber-950/40 px-2 py-1 text-[11px] leading-4 text-amber-300">
                                    Tạm bỏ qua khi lọc: dữ liệu thuộc tính chỉ phủ {coveragePercent(relation.sourceAttributeProductCount, relation.sourceProductCount)}% và {coveragePercent(relation.relatedAttributeProductCount, relation.relatedProductCount)}% SKU; yêu cầu tối thiểu 90% ở cả hai danh mục.
                                  </span>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : "—"}
                      </td>
                      <td className="p-3 font-bold tabular-nums text-emerald-400">{component.productCount}</td>
                      <td className="p-3 text-emerald-400">{component.status ? "Đang hiển thị" : "Đã ẩn"}</td>
                      <td className="p-3"><button type="button" onClick={() => openEditor(originalIndex)} className="min-h-10 rounded border border-slate-700 px-3 hover:bg-slate-800">Sửa</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section> : <section className="mt-6 overflow-hidden rounded-xl border border-slate-800 bg-[#090d19]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-900/80 text-xs uppercase text-slate-400"><tr><th className="p-3">Tên</th><th className="p-3">Mức giảm</th><th className="p-3">Mục tiêu</th><th className="p-3">Điều kiện</th><th className="p-3">Thời gian</th><th className="p-3">Ưu tiên</th><th className="p-3">Trạng thái</th><th className="p-3">Thao tác</th></tr></thead>
              <tbody>{promotionConfiguration?.promotions.map((promotion, index) => <tr key={promotion.id || `draft-${index}`} className="border-t border-slate-800 align-top">
                <td className="p-3 font-bold">{promotion.name}</td>
                <td className="p-3 tabular-nums text-red-300">{promotion.discountType === "percent" ? `${promotion.discountValue}%${promotion.maxDiscount ? ` · tối đa ${promotion.maxDiscount.toLocaleString("vi-VN")}đ` : ""}` : `${promotion.discountValue.toLocaleString("vi-VN")}đ/SKU`}</td>
                <td className="p-3 text-xs text-slate-300">{promotion.targets.map((target) => `${target.type === "category" ? "Category" : "SKU"} #${target.id}`).join(", ")}</td>
                <td className="p-3 text-xs text-slate-300">{promotion.requirements.length ? promotion.requirements.map((item) => `${componentByCode.get(item.componentCode)?.name || item.componentCode} ≥ ${item.minDistinctSkus}`).join(" + ") : "Không yêu cầu thêm"}</td>
                <td className="p-3 text-xs text-slate-400">{promotion.startsAt ? new Date(promotion.startsAt).toLocaleString("vi-VN") : "Ngay"}<br />→ {promotion.endsAt ? new Date(promotion.endsAt).toLocaleString("vi-VN") : "Không giới hạn"}</td>
                <td className="p-3 tabular-nums">{promotion.priority}</td>
                <td className={`p-3 ${promotion.status ? "text-emerald-400" : "text-slate-500"}`}>{promotion.status ? "Đang bật" : "Đã tắt"}</td>
                <td className="p-3"><div className="flex gap-2"><button type="button" onClick={() => openPromotionEditor(index)} className="grid min-h-10 min-w-10 place-items-center rounded border border-slate-700 hover:bg-slate-800" aria-label={`Sửa ${promotion.name}`}><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => setPromotionConfiguration((current) => current && ({ ...current, promotions: current.promotions.filter((_, itemIndex) => itemIndex !== index) }))} className="grid min-h-10 min-w-10 place-items-center rounded border border-red-900 text-red-400 hover:bg-red-950" aria-label={`Xóa ${promotion.name}`}><Trash2 className="h-4 w-4" /></button></div></td>
              </tr>)}</tbody>
            </table>
            {!promotionConfiguration?.promotions.length ? <p className="p-8 text-center text-sm text-slate-400">Chưa có chính sách giảm giá Build PC.</p> : null}
          </div>
        </section>}
      </div>

      <dialog ref={dialogRef} className="m-auto w-[min(760px,calc(100%-24px))] rounded-xl border border-slate-700 bg-[#070b17] p-0 text-white backdrop:bg-black/75">
        <form method="dialog" onSubmit={(event) => event.preventDefault()}>
          <header className="flex items-start justify-between border-b border-slate-800 p-5">
            <div><h2 className="text-xl font-black">{editingIndex === null ? "Thêm danh mục" : "Sửa danh mục"}</h2><p className="text-sm text-slate-400">Cấu hình riêng cho màn Build PC.</p></div>
            <button type="button" onClick={() => dialogRef.current?.close()} aria-label="Đóng" className="grid min-h-11 min-w-11 place-items-center rounded hover:bg-slate-800"><X aria-hidden="true" /></button>
          </header>
          <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
            <label className="block text-sm font-bold">Danh mục sản phẩm<CategoryPicker value={draft.categoryId} options={categories} disabledIds={usedCategoryIds} onChange={(category) => setDraft((current) => ({ ...current, categoryId: category.id, categoryName: category.name, name: current.name || category.name, productCount: category.productCount, relations: [] }))} /></label>
            <label className="block text-sm font-bold">Text hiển thị<input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3" /></label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-sm font-bold">STT Build PC<input type="number" value={draft.ordering} onChange={(event) => setDraft((current) => ({ ...current, ordering: Number(event.target.value) }))} className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3" /></label>
              <label className="text-sm font-bold">Tối đa SKU<input type="number" min={1} max={8} value={draft.maxSelections} onChange={(event) => setDraft((current) => ({ ...current, maxSelections: Number(event.target.value) }))} className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3" /></label>
              <div className="flex items-end gap-4 pb-2 text-sm"><label><input type="checkbox" checked={draft.required} onChange={(event) => setDraft((current) => ({ ...current, required: event.target.checked }))} /> Bắt buộc</label><label><input type="checkbox" checked={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.checked }))} /> Hiển thị</label></div>
            </div>
            <section className="rounded-lg border border-slate-800 p-4">
              <div className="flex items-center justify-between"><h3 className="font-bold">Quan hệ thuộc tính</h3><button type="button" onClick={() => setDraft((current) => ({ ...current, relations: [...current.relations, { relatedComponentCode: "", attributeId: 0, ordering: current.relations.length }] }))} className="min-h-10 rounded border border-slate-700 px-3 text-sm">+ Thêm quan hệ</button></div>
              <div className="mt-3 space-y-3">
                {draft.relations.map((relation, index) => (
                  <div key={index} className="grid gap-2 rounded-lg bg-slate-950 p-3 sm:grid-cols-[1fr_1fr_auto]">
                    <label className="text-xs font-bold text-slate-400">Danh mục liên quan
                      <CategoryPicker
                        value={componentByCode.get(relation.relatedComponentCode)?.categoryId || 0}
                        options={categories}
                        allowedIds={componentCategoryIds}
                        onChange={(category) => {
                          const code = components.find((item) => item.categoryId === category.id)?.code || "";
                          setDraft((current) => ({ ...current, relations: current.relations.map((item, itemIndex) => itemIndex === index ? { ...item, relatedComponentCode: code, attributeId: 0 } : item) }));
                          void loadAttributes(index, code);
                        }}
                      />
                    </label>
                    <label className="text-xs font-bold text-slate-400">Thuộc tính tham chiếu
                      <select value={relation.attributeId} onFocus={() => void loadAttributes(index, relation.relatedComponentCode)} onChange={(event) => { const id=Number(event.target.value); const name=attributes[index]?.find((item)=>item.id===id)?.name; setDraft((current) => ({ ...current, relations: current.relations.map((item, itemIndex) => itemIndex === index ? { ...item, attributeId: id, attributeName: name } : item) })); }} className="mt-1 min-h-11 w-full rounded border border-slate-700 bg-slate-900 px-2 text-white">
                        <option value={0}>Chọn thuộc tính…</option>
                        {relation.attributeId && !(attributes[index] || []).some((item) => item.id === relation.attributeId) ? <option value={relation.attributeId}>{relation.attributeName || `#${relation.attributeId}`}</option> : null}
                        {(attributes[index] || []).map((item) => <option key={item.id} value={item.id}>{item.name} ({item.sourceProducts}/{item.sourceTotal} và {item.relatedProducts}/{item.relatedTotal} SKU){item.enforceable ? "" : " — chưa đủ 90%, sẽ tạm bỏ qua"}</option>)}
                      </select>
                    </label>
                    <button type="button" aria-label="Xóa quan hệ" onClick={() => setDraft((current) => ({ ...current, relations: current.relations.filter((_, itemIndex) => itemIndex !== index) }))} className="mt-5 grid min-h-11 min-w-11 place-items-center rounded text-red-400 hover:bg-red-950"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
                  </div>
                ))}
              </div>
            </section>
          </div>
          <footer className="flex justify-end gap-2 border-t border-slate-800 p-4"><button type="button" onClick={() => dialogRef.current?.close()} className="min-h-11 rounded border border-slate-700 px-4">Hủy</button><button type="button" onClick={commitDraft} className="min-h-11 rounded bg-red-600 px-4 font-bold">Cập nhật bản nháp</button></footer>
        </form>
      </dialog>

      <dialog ref={promotionDialogRef} className="m-auto w-[min(820px,calc(100%-24px))] rounded-xl border border-slate-700 bg-[#070b17] p-0 text-white backdrop:bg-black/75">
        <form method="dialog" onSubmit={(event) => event.preventDefault()}>
          <header className="flex items-start justify-between border-b border-slate-800 p-5"><div><h2 className="text-xl font-black">{promotionEditingIndex === null ? "Thêm khuyến mãi" : "Sửa khuyến mãi"}</h2><p className="text-sm text-slate-400">Giá được server kiểm tra lại khi quote và đặt hàng.</p></div><button type="button" onClick={() => promotionDialogRef.current?.close()} aria-label="Đóng" className="grid min-h-11 min-w-11 place-items-center rounded hover:bg-slate-800"><X /></button></header>
          <div className="max-h-[72vh] space-y-5 overflow-y-auto p-5">
            <label className="block text-sm font-bold">Tên chính sách<input value={promotionDraft.name} onChange={(event) => setPromotionDraft((current) => ({ ...current, name: event.target.value }))} className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3" /></label>
            <div className="grid gap-3 sm:grid-cols-4">
              <label className="text-sm font-bold">Loại giảm<select value={promotionDraft.discountType} onChange={(event) => setPromotionDraft((current) => ({ ...current, discountType: event.target.value as "fixed" | "percent", maxDiscount: event.target.value === "fixed" ? null : current.maxDiscount }))} className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3"><option value="fixed">Số tiền/SKU</option><option value="percent">Phần trăm</option></select></label>
              <label className="text-sm font-bold">Giá trị<input type="number" min={1} value={promotionDraft.discountValue} onChange={(event) => setPromotionDraft((current) => ({ ...current, discountValue: Number(event.target.value) }))} className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3" /></label>
              <label className="text-sm font-bold">Giảm tối đa<input type="number" min={1} disabled={promotionDraft.discountType === "fixed"} value={promotionDraft.maxDiscount || ""} onChange={(event) => setPromotionDraft((current) => ({ ...current, maxDiscount: event.target.value ? Number(event.target.value) : null }))} className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 disabled:opacity-40" /></label>
              <label className="text-sm font-bold">Ưu tiên<input type="number" value={promotionDraft.priority} onChange={(event) => setPromotionDraft((current) => ({ ...current, priority: Number(event.target.value) }))} className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3" /></label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold">Bắt đầu<input type="datetime-local" value={toLocalDateTimeInput(promotionDraft.startsAt)} onChange={(event) => setPromotionDraft((current) => ({ ...current, startsAt: event.target.value ? new Date(event.target.value).toISOString() : null }))} className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3" /></label><label className="text-sm font-bold">Kết thúc<input type="datetime-local" value={toLocalDateTimeInput(promotionDraft.endsAt)} onChange={(event) => setPromotionDraft((current) => ({ ...current, endsAt: event.target.value ? new Date(event.target.value).toISOString() : null }))} className="mt-1 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3" /></label></div>
            <section className="rounded-lg border border-slate-800 p-4"><div className="flex items-center justify-between"><h3 className="font-bold">SKU/category mục tiêu</h3><button type="button" onClick={() => setPromotionDraft((current) => ({ ...current, targets: [...current.targets, { type: "category", id: 0 }] }))} className="min-h-10 rounded border border-slate-700 px-3 text-sm">+ Thêm mục tiêu</button></div><div className="mt-3 space-y-3">{promotionDraft.targets.map((target, index) => <div key={index} className="grid gap-2 rounded-lg bg-slate-950 p-3 sm:grid-cols-[150px_1fr_auto]"><select value={target.type} onChange={(event) => setPromotionDraft((current) => ({ ...current, targets: current.targets.map((item, itemIndex) => itemIndex === index ? { type: event.target.value as "product" | "category", id: 0 } : item) }))} className="min-h-11 rounded border border-slate-700 bg-slate-900 px-2"><option value="category">Category</option><option value="product">SKU</option></select>{target.type === "category" ? <CategoryPicker value={target.id} options={categories} onChange={(category) => setPromotionDraft((current) => ({ ...current, targets: current.targets.map((item, itemIndex) => itemIndex === index ? { ...item, id: category.id } : item) }))} /> : <input type="number" min={1} value={target.id || ""} placeholder="Nhập ID SKU" onChange={(event) => setPromotionDraft((current) => ({ ...current, targets: current.targets.map((item, itemIndex) => itemIndex === index ? { ...item, id: Number(event.target.value) } : item) }))} className="min-h-11 rounded border border-slate-700 bg-slate-900 px-3" />}<button type="button" onClick={() => setPromotionDraft((current) => ({ ...current, targets: current.targets.filter((_, itemIndex) => itemIndex !== index) }))} aria-label="Xóa mục tiêu" className="grid min-h-11 min-w-11 place-items-center rounded text-red-400 hover:bg-red-950"><Trash2 className="h-4 w-4" /></button></div>)}</div></section>
            <section className="rounded-lg border border-slate-800 p-4"><h3 className="font-bold">Điều kiện component (AND)</h3><div className="mt-3 grid gap-2 sm:grid-cols-2">{components.map((component) => { const requirement=promotionDraft.requirements.find((item) => item.componentCode === component.code); return <label key={component.code} className="flex min-h-11 items-center gap-3 rounded bg-slate-950 px-3 text-sm"><input type="checkbox" checked={Boolean(requirement)} onChange={(event) => setPromotionDraft((current) => ({ ...current, requirements: event.target.checked ? [...current.requirements, { componentCode: component.code || "", minDistinctSkus: 1 }] : current.requirements.filter((item) => item.componentCode !== component.code) }))} /><span className="min-w-0 flex-1 truncate">{component.name}</span>{requirement ? <input aria-label={`Số SKU tối thiểu ${component.name}`} type="number" min={1} max={component.maxSelections} value={requirement.minDistinctSkus} onChange={(event) => setPromotionDraft((current) => ({ ...current, requirements: current.requirements.map((item) => item.componentCode === component.code ? { ...item, minDistinctSkus: Number(event.target.value) } : item) }))} className="w-16 rounded border border-slate-700 bg-slate-900 px-2 py-1" /> : null}</label>; })}</div></section>
            <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={promotionDraft.status} onChange={(event) => setPromotionDraft((current) => ({ ...current, status: event.target.checked }))} /> Kích hoạt chính sách</label>
          </div>
          <footer className="flex justify-end gap-2 border-t border-slate-800 p-4"><button type="button" onClick={() => promotionDialogRef.current?.close()} className="min-h-11 rounded border border-slate-700 px-4">Hủy</button><button type="button" onClick={commitPromotionDraft} className="min-h-11 rounded bg-red-600 px-4 font-bold">Cập nhật bản nháp</button></footer>
        </form>
      </dialog>
    </main>
  );
}
