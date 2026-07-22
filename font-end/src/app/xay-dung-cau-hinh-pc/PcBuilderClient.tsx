"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Filter,
  Loader2,
  Plus,
  Search,
  X,
} from "lucide-react";
import { addCartItems } from "@/lib/cart";
import {
  downloadPcBuilderExcel,
  downloadPcBuilderPng,
} from "@/lib/pcBuilderExports";
import PcBuilderV5View from "./PcBuilderV5View";
import {
  formatPcPrice,
  parsePcBuilderDraft,
  pcBuilderApi,
  pcBuilderSelectionSignature,
  pcBuilderSelectionsFromQuote,
  PC_BUILDER_DRAFT_KEY,
  PC_BUILDER_WARNING_CONFIRMATION_KEY,
  serializePcBuilderDraft,
  type PcBuilderCandidate,
  type PcBuilderDiagnostic,
  type PcBuilderQuote,
  type PcBuilderSelection,
} from "@/lib/pcBuilder";

type Component = {
  code: string;
  categoryId: number;
  name: string;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  ordering: number;
};
type Bootstrap = {
  enabled: boolean;
  migrationRequired?: boolean;
  disabledReason?: string;
  ruleRevision: string;
  minimumBudget: number;
  components: Component[];
};
type CandidateFacets = {
  prices: Array<{
    key: string;
    label: string;
    min: number;
    max: number | null;
    count: number;
  }>;
  brands: Array<{ id: number; name: string; count: number }>;
  attributes: Array<{
    id: number;
    code: string;
    name: string;
    values: Array<{ id: number; label: string; count: number }>;
  }>;
};
type CandidateResponse = {
  items: PcBuilderCandidate[];
  facets: CandidateFacets;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  context: {
    constrained: boolean;
    relations: Array<{
      selectedComponentCode: string;
      attributeName: string;
    }>;
  };
};
type Filters = {
  query: string;
  sort: "default" | "price_asc" | "price_desc" | "newest";
  minPrice: number | null;
  maxPrice: number | null;
  brandIds: number[];
  attributeFilters: Record<string, number[]>;
  page: number;
};

const emptyFacets: CandidateFacets = { prices: [], brands: [], attributes: [] };
const LEGACY_DRAFT_INVALID_CODES = new Set([
  "BUILD_UNAVAILABLE",
  "COMPONENT_CATEGORY_MISMATCH",
  "INVALID_COMPONENT",
]);
const defaultFilters = (): Filters => ({
  query: "",
  sort: "default",
  minPrice: null,
  maxPrice: null,
  brandIds: [],
  attributeFilters: {},
  page: 1,
});

function DiagnosticList({ items }: { items: PcBuilderDiagnostic[] }) {
  if (!items.length) return null;
  return (
    <div className="space-y-2" aria-live="polite">
      {items.map((item) => (
        <div
          key={`${item.ruleCode}-${item.componentCodes.join("-")}`}
          className={`flex gap-2 rounded-xl border p-3 text-sm ${item.severity === "error" ? "border-red-500/30 bg-red-500/10 text-red-100" : "border-amber-500/30 bg-amber-500/10 text-amber-100"}`}
        >
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0"
            aria-hidden="true"
          />
          <span>{item.message}</span>
        </div>
      ))}
    </div>
  );
}

function FilterControls({
  facets,
  filters,
  setFilters,
}: {
  facets: CandidateFacets;
  filters: Filters;
  setFilters: React.Dispatch<React.SetStateAction<Filters>>;
}) {
  const toggleBrand = (id: number) =>
    setFilters((current) => ({
      ...current,
      page: 1,
      brandIds: current.brandIds.includes(id)
        ? current.brandIds.filter((value) => value !== id)
        : [...current.brandIds, id],
    }));
  const toggleAttribute = (attributeId: number, valueId: number) =>
    setFilters((current) => {
      const key = String(attributeId);
      const selected = current.attributeFilters[key] || [];
      return {
        ...current,
        page: 1,
        attributeFilters: {
          ...current.attributeFilters,
          [key]: selected.includes(valueId)
            ? selected.filter((item) => item !== valueId)
            : [...selected, valueId],
        },
      };
    });
  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => setFilters(defaultFilters())}
        className="min-h-11 w-full rounded-xl border border-white/10 px-3 text-sm font-bold text-zinc-300 hover:bg-white/5"
      >
        Xóa toàn bộ bộ lọc
      </button>
      <details open>
        <summary className="mb-3 min-h-11 cursor-pointer py-3 text-sm font-black">Khoảng giá</summary>
        <div className="space-y-2">
          {facets.prices.map((bucket) => (
            <label
              key={bucket.key}
              className="flex cursor-pointer items-center justify-between gap-3 text-sm text-zinc-300"
            >
              <span>
                <input
                  type="radio"
                  name="pc-price"
                  checked={
                    filters.minPrice === bucket.min &&
                    filters.maxPrice === bucket.max
                  }
                  onChange={() =>
                    setFilters((current) => ({
                      ...current,
                      page: 1,
                      minPrice: bucket.min,
                      maxPrice: bucket.max,
                    }))
                  }
                  className="mr-2 accent-red-500"
                />
                {bucket.label}
              </span>
              <span className="text-xs text-zinc-600">{bucket.count}</span>
            </label>
          ))}
        </div>
        {filters.minPrice !== null ? (
          <button
            type="button"
            onClick={() =>
              setFilters((current) => ({
                ...current,
                page: 1,
                minPrice: null,
                maxPrice: null,
              }))
            }
            className="mt-3 text-xs font-bold text-red-400"
          >
            Bỏ lọc giá
          </button>
        ) : null}
      </details>
      {facets.brands.length ? (
        <details open>
          <summary className="mb-3 min-h-11 cursor-pointer py-3 text-sm font-black">Hãng sản xuất ({facets.brands.length})</summary>
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {facets.brands.map((brand) => (
              <label
                key={brand.id}
                className="flex cursor-pointer items-center justify-between gap-3 text-sm text-zinc-300"
              >
                <span>
                  <input
                    type="checkbox"
                    checked={filters.brandIds.includes(brand.id)}
                    onChange={() => toggleBrand(brand.id)}
                    className="mr-2 accent-red-500"
                  />
                  {brand.name}
                </span>
                <span className="text-xs text-zinc-600">{brand.count}</span>
              </label>
            ))}
          </div>
        </details>
      ) : null}
      {facets.attributes.map((attribute) => (
        <details
          key={attribute.id}
          className="border-t border-white/10 pt-4"
        >
          <summary className="mb-3 min-h-11 cursor-pointer py-3 text-sm font-black">{attribute.name} ({attribute.values.length})</summary>
          <div className="max-h-52 space-y-2 overflow-y-auto">
            {attribute.values.map((value) => (
              <label
                key={value.id}
                className="flex cursor-pointer items-center justify-between gap-3 text-sm text-zinc-300"
              >
                <span>
                  <input
                    type="checkbox"
                    checked={(
                      filters.attributeFilters[String(attribute.id)] || []
                    ).includes(value.id)}
                    onChange={() =>
                      toggleAttribute(attribute.id, value.id)
                    }
                    className="mr-2 accent-red-500"
                  />
                  {value.label}
                </span>
                <span className="text-xs text-zinc-600">{value.count}</span>
              </label>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

export default function PcBuilderClient() {
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null);
  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [selections, setSelections] = useState<PcBuilderSelection[]>([]);
  const [quote, setQuote] = useState<PcBuilderQuote | null>(null);
  const [quoteSelectionSignature, setQuoteSelectionSignature] = useState("");
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState("");
  const [activeComponent, setActiveComponent] = useState<string | null>(null);
  const [candidateData, setCandidateData] = useState<CandidateResponse>({
    items: [],
    facets: emptyFacets,
    pagination: { page: 1, limit: 18, total: 0, totalPages: 1 },
    context: { constrained: false, relations: [] },
  });
  const [candidateLoading, setCandidateLoading] = useState(false);
  const [candidateError, setCandidateError] = useState("");
  const [filters, setFilters] = useState<Filters>(defaultFilters());
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [exporting, setExporting] = useState<"excel" | "png" | null>(null);
  const [error, setError] = useState("");
  const [confirmCheckout, setConfirmCheckout] = useState(false);
  const candidateDialogRef = useRef<HTMLDialogElement>(null);
  const confirmationDialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const quoteRequestIdRef = useRef(0);
  const restoredLocalDraftRef = useRef(false);

  const updateSelections = useCallback(
    (
      updater:
        | PcBuilderSelection[]
        | ((current: PcBuilderSelection[]) => PcBuilderSelection[]),
    ) => {
      quoteRequestIdRef.current += 1;
      setSelections(updater);
    },
    [],
  );

  const loadBootstrap = useCallback(async () => {
    setBootstrapLoading(true);
    setError("");
    try {
      setBootstrap(await pcBuilderApi<Bootstrap>("/api/pc-builder/bootstrap"));
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Không tải được cấu hình Build PC.",
      );
    } finally {
      setBootstrapLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const token = new URLSearchParams(window.location.search).get("share");
    const hydrate = async () => {
      try {
        if (token) {
          const shared = await pcBuilderApi<{ quote: PcBuilderQuote }>(
            `/api/pc-builder/builds/${encodeURIComponent(token)}`,
            { signal: controller.signal },
          );
          if (!cancelled)
            setSelections(pcBuilderSelectionsFromQuote(shared.quote));
        } else {
          let rawDraft: string | null = null;
          try {
            rawDraft = localStorage.getItem(PC_BUILDER_DRAFT_KEY);
          } catch {
            /* Storage may be unavailable in private browsing. */
          }
          const restored = parsePcBuilderDraft(rawDraft);
          restoredLocalDraftRef.current = restored.length > 0;
          if (!cancelled) setSelections(restored);
        }
      } catch (reason) {
        if (!cancelled && (reason as Error).name !== "AbortError")
          setError(
            reason instanceof Error
              ? reason.message
              : "Không thể khởi tạo cấu hình PC.",
          );
      } finally {
        if (!cancelled) setDraftHydrated(true);
      }
    };
    void hydrate();
    void loadBootstrap();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [loadBootstrap]);

  useEffect(() => {
    if (!draftHydrated) return;
    try {
      localStorage.setItem(
        PC_BUILDER_DRAFT_KEY,
        serializePcBuilderDraft(selections),
      );
    } catch {
      /* The builder remains usable when browser storage is unavailable. */
    }
  }, [draftHydrated, selections]);

  useEffect(() => {
    const requestId = ++quoteRequestIdRef.current;
    if (!selections.length) {
      setQuote(null);
      setQuoteSelectionSignature("");
      setQuoteLoading(false);
      sessionStorage.removeItem(PC_BUILDER_WARNING_CONFIRMATION_KEY);
      return;
    }
    const requestedSignature = pcBuilderSelectionSignature(selections);
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setQuoteLoading(true);
      pcBuilderApi<PcBuilderQuote>("/api/pc-builder/quote", {
        method: "POST",
        signal: controller.signal,
        body: JSON.stringify({ selections, assemblyRequired: true }),
      })
        .then((nextQuote) => {
          if (
            controller.signal.aborted ||
            requestId !== quoteRequestIdRef.current
          )
            return;
          const normalizedSelections = pcBuilderSelectionsFromQuote(nextQuote);
          const normalizedSignature = pcBuilderSelectionSignature(
            normalizedSelections,
          );
          setQuote(nextQuote);
          setQuoteSelectionSignature(normalizedSignature);
          if (normalizedSignature !== requestedSignature)
            setSelections((current) =>
              pcBuilderSelectionSignature(current) === requestedSignature
                ? normalizedSelections
                : current,
            );
          setError("");
          if (restoredLocalDraftRef.current) {
            setRestoreMessage(
              `Đã khôi phục ${normalizedSelections.length} linh kiện từ cấu hình nháp.`,
            );
            restoredLocalDraftRef.current = false;
          }
          const saved = sessionStorage.getItem(
            PC_BUILDER_WARNING_CONFIRMATION_KEY,
          );
          if (saved) {
            try {
              const confirmation = JSON.parse(saved);
              if (
                confirmation.fingerprint !== nextQuote.fingerprint ||
                confirmation.warningSignature !== nextQuote.warningSignature
              )
                sessionStorage.removeItem(PC_BUILDER_WARNING_CONFIRMATION_KEY);
            } catch {
              sessionStorage.removeItem(PC_BUILDER_WARNING_CONFIRMATION_KEY);
            }
          }
        })
        .catch((reason) => {
          if (
            reason.name === "AbortError" ||
            requestId !== quoteRequestIdRef.current
          )
            return;
          const requestError = reason as Error & { code?: string };
          const hasLegacyStorage = selections.some(
            (selection) => selection.componentCode === "storage",
          );
          if (
            hasLegacyStorage &&
            requestError.code &&
            LEGACY_DRAFT_INVALID_CODES.has(requestError.code)
          ) {
            setSelections((current) =>
              pcBuilderSelectionSignature(current) === requestedSignature
                ? current.filter(
                    (selection) => selection.componentCode !== "storage",
                  )
                : current,
            );
            restoredLocalDraftRef.current = false;
            setRestoreMessage("");
            setError(
              "Một linh kiện trong cấu hình nháp cũ không còn hợp lệ và đã được loại bỏ.",
            );
            return;
          }
          setError(reason.message);
        })
        .finally(() => {
          if (requestId === quoteRequestIdRef.current)
            setQuoteLoading(false);
        });
    }, 250);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [selections]);

  useEffect(() => {
    const dialog = candidateDialogRef.current;
    if (!dialog) return;
    if (activeComponent && !dialog.open) dialog.showModal();
    if (!activeComponent && dialog.open) dialog.close();
  }, [activeComponent]);
  useEffect(() => {
    const dialog = confirmationDialogRef.current;
    if (!dialog) return;
    if (confirmCheckout && !dialog.open) dialog.showModal();
    if (!confirmCheckout && dialog.open) dialog.close();
  }, [confirmCheckout]);

  const closeCandidates = () => {
    setActiveComponent(null);
    window.setTimeout(() => openerRef.current?.focus(), 0);
  };
  const openCandidates = (componentCode: string, opener: HTMLElement) => {
    openerRef.current = opener;
    setFilters(defaultFilters());
    setCandidateData({
      items: [],
      facets: emptyFacets,
      pagination: { page: 1, limit: 18, total: 0, totalPages: 1 },
      context: { constrained: false, relations: [] },
    });
    setCandidateError("");
    setActiveComponent(componentCode);
  };

  useEffect(() => {
    if (!activeComponent) return;
    const controller = new AbortController();
    const timer = window.setTimeout(
      async () => {
        setCandidateLoading(true);
        setCandidateError("");
        try {
          const data = await pcBuilderApi<CandidateResponse>(
            "/api/pc-builder/candidates",
            {
              method: "POST",
              signal: controller.signal,
              body: JSON.stringify({
                componentCode: activeComponent,
                selections,
                page: filters.page,
                limit: 18,
                query: filters.query,
                sort: filters.sort,
                minPrice: filters.minPrice,
                maxPrice: filters.maxPrice,
                brandIds: filters.brandIds,
                attributeFilters: filters.attributeFilters,
              }),
            },
          );
          setCandidateData(data);
        } catch (reason) {
          if ((reason as Error).name !== "AbortError")
            setCandidateError(
              reason instanceof Error
                ? reason.message
                : "Không tải được sản phẩm.",
            );
        } finally {
          setCandidateLoading(false);
        }
      },
      filters.query ? 350 : 0,
    );
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [activeComponent, filters, selections]);

  const components = useMemo(
    () =>
      [...(bootstrap?.components || [])].sort(
        (a, b) => a.ordering - b.ordering,
      ),
    [bootstrap],
  );
  const currentSelectionSignature = pcBuilderSelectionSignature(selections);
  const activeQuote =
    quote && quoteSelectionSignature === currentSelectionSignature
      ? quote
      : null;
  const visibleSelectionCount = useMemo(() => {
    const componentCodes = new Set(components.map((component) => component.code));
    return selections.filter((selection) =>
      componentCodes.has(selection.componentCode),
    ).length;
  }, [components, selections]);
  const activeConfig = components.find(
    (component) => component.code === activeComponent,
  );
  const selectedItems = useMemo(
    () =>
      new Map(
        (activeQuote?.items || []).map((item) => [item.productId, item]),
      ),
    [activeQuote],
  );

  const chooseCandidate = (candidate: PcBuilderCandidate) => {
    if (!activeComponent || !activeConfig) return;
    updateSelections((current) => {
      const currentForComponent = current.filter(
        (item) => item.componentCode === activeComponent,
      );
      if (candidate.selected)
        return current.filter(
          (item) =>
            !(
              item.componentCode === activeComponent &&
              item.productId === candidate.productId
            ),
        );
      if (activeConfig.maxSelections === 1)
        return [
          ...current.filter((item) => item.componentCode !== activeComponent),
          {
            componentCode: activeComponent,
            productId: candidate.productId,
            quantity: 1,
          },
        ];
      if (currentForComponent.length >= activeConfig.maxSelections)
        return current;
      return [
        ...current,
        {
          componentCode: activeComponent,
          productId: candidate.productId,
          quantity: 1,
        },
      ];
    });
    if (activeConfig.maxSelections === 1) closeCandidates();
  };

  const reset = () => {
    if (
      !selections.length ||
      window.confirm("Xóa toàn bộ linh kiện đã chọn?")
    ) {
      updateSelections([]);
      setQuote(null);
      setQuoteSelectionSignature("");
      setQuoteLoading(false);
      setRestoreMessage("");
      sessionStorage.removeItem(PC_BUILDER_WARNING_CONFIRMATION_KEY);
    }
  };
  const share = async () => {
    try {
      const data = await pcBuilderApi<{ shareToken: string }>(
        "/api/pc-builder/builds",
        {
          method: "POST",
          body: JSON.stringify({
            name: "Cấu hình PC của tôi",
            mode: "manual",
            selections,
            input: {},
          }),
        },
      );
      const url = `${location.origin}/xay-dung-cau-hinh-pc?share=${data.shareToken}`;
      await navigator.clipboard.writeText(url);
      setError("Đã sao chép liên kết chia sẻ, có hiệu lực 90 ngày.");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Không thể chia sẻ cấu hình.",
      );
    }
  };
  const saveToAccount = async () => {
    try {
      const data = await pcBuilderApi<{ id: number }>(
        "/api/customer/pc-builds",
        {
          method: "POST",
          body: JSON.stringify({
            name: "Cấu hình PC của tôi",
            mode: "manual",
            selections,
            input: {},
          }),
        },
      );
      setError(`Đã lưu cấu hình #${data.id} vào tài khoản.`);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Không thể lưu cấu hình.",
      );
    }
  };
  const updateQuantity = (
    componentCode: string,
    productId: number,
    quantity: number,
  ) => {
    const nextQuantity = Math.max(1, Math.min(4, Math.trunc(quantity)));
    updateSelections((current) =>
      current.map((selection) =>
        selection.componentCode === componentCode &&
        selection.productId === productId
          ? { ...selection, quantity: nextQuantity }
          : selection,
      ),
    );
  };
  const addBuildToCart = () => {
    if (!activeQuote?.compatible || !activeQuote.items.length) return;
    addCartItems(
      activeQuote.items.map((item) => ({
        item: {
          productId: item.productId,
          slug: item.slug,
          name: item.name,
          sku: item.sku,
          thumbnail: item.thumbnail,
          price: item.cartPrice,
          marketPrice: item.regularPrice,
        },
        quantity: item.quantity,
      })),
    );
    setError(
      `Đã thêm ${activeQuote.items.length} mẫu linh kiện vào giỏ. Giá trong giỏ được tính lại theo giá thường/Flash Sale và không giữ ưu đãi Build PC.`,
    );
  };
  const exportExcel = async () => {
    if (!activeQuote) return;
    setExporting("excel");
    try {
      await downloadPcBuilderExcel(activeQuote, components);
      setError("Đã tải file Excel cấu hình PC.");
    } catch {
      setError("Không thể tạo file Excel. Vui lòng thử lại.");
    } finally {
      setExporting(null);
    }
  };
  const exportPng = async () => {
    if (!activeQuote) return;
    setExporting("png");
    try {
      await downloadPcBuilderPng(activeQuote, components);
      setError("Đã tải ảnh cấu hình PC.");
    } catch {
      setError("Không thể tạo ảnh cấu hình. Vui lòng thử lại.");
    } finally {
      setExporting(null);
    }
  };
  const startCheckout = () => {
    if (!activeQuote?.compatible) return;
    if (activeQuote.requiresConfirmation) {
      setConfirmCheckout(true);
      return;
    }
    sessionStorage.removeItem(PC_BUILDER_WARNING_CONFIRMATION_KEY);
    window.location.assign("/thanh-toan-pc-builder");
  };
  const confirmAndCheckout = () => {
    if (!activeQuote) return;
    sessionStorage.setItem(
      PC_BUILDER_WARNING_CONFIRMATION_KEY,
      JSON.stringify({
        fingerprint: activeQuote.fingerprint,
        warningSignature: activeQuote.warningSignature,
        confirmedAt: new Date().toISOString(),
      }),
    );
    window.location.assign("/thanh-toan-pc-builder");
  };

  if (bootstrapLoading)
    return (
      <main className="grid min-h-[65vh] place-items-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-9 w-9 animate-spin text-red-500" />
          <p className="mt-3 text-sm text-zinc-500">
            Đang tải cấu hình Build PC…
          </p>
        </div>
      </main>
    );
  if (!bootstrap)
    return (
      <main className="mx-auto grid min-h-[65vh] max-w-xl place-items-center px-4 text-center">
        <div className="rounded-3xl border border-white/10 bg-[#151518] p-8">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-400" />
          <h1 className="mt-4 text-2xl font-black">
            Không tải được PC Builder
          </h1>
          <p className="mt-2 text-zinc-400">{error}</p>
          <button
            onClick={() => void loadBootstrap()}
            className="mt-6 rounded-xl bg-red-600 px-6 py-3 font-bold"
          >
            Thử lại
          </button>
        </div>
      </main>
    );
  if (!bootstrap.enabled)
    return (
      <main className="mx-auto grid min-h-[65vh] max-w-2xl place-items-center px-4 text-center">
        <div className="rounded-3xl border border-white/10 bg-[#151518] p-8 sm:p-12">
          <Cpu className="mx-auto h-14 w-14 text-zinc-700" />
          <h1 className="mt-5 text-3xl font-black">
            PC Builder đang được chuẩn bị
          </h1>
          <p className="mt-3 leading-7 text-zinc-400">
            Catalog hoặc cấu hình danh mục chưa đạt điều kiện mở bán an toàn.
          </p>
          <button
            onClick={() => void loadBootstrap()}
            className="mt-7 rounded-xl border border-white/10 px-5 py-3 font-bold"
          >
            Tải lại
          </button>
        </div>
      </main>
    );

  return (
    <main className="mx-auto min-h-screen max-w-[1500px] px-4 pb-28 pt-6 sm:px-6 lg:px-8">
      {error ? (
        <div
          className="mb-5 flex items-center justify-between rounded-xl border border-blue-500/25 bg-blue-500/10 p-4 text-sm text-blue-100"
          role="status"
        >
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Đóng thông báo">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}
      {restoreMessage ? (
        <div
          className="mb-5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-100"
          role="status"
          aria-live="polite"
        >
          {restoreMessage}
        </div>
      ) : null}

      <PcBuilderV5View
        components={components}
        selections={selections}
        quote={activeQuote}
        quoteLoading={quoteLoading}
        visibleSelectionCount={visibleSelectionCount}
        exporting={exporting}
        onChoose={openCandidates}
        onRemove={(componentCode, productId) =>
          updateSelections((current) =>
            current.filter(
              (selection) =>
                !(
                  selection.componentCode === componentCode &&
                  selection.productId === productId
                ),
            ),
          )
        }
        onQuantity={updateQuantity}
        onReset={reset}
        onSave={() => void saveToAccount()}
        onExcel={() => void exportExcel()}
        onPng={() => void exportPng()}
        onShare={() => void share()}
        onAddCart={addBuildToCart}
        onCheckout={startCheckout}
      />
    <dialog
      ref={candidateDialogRef}
      aria-labelledby="pc-builder-candidate-title"
        onCancel={(event) => {
          event.preventDefault();
          closeCandidates();
        }}
        onClose={() => activeComponent && closeCandidates()}
        className="fixed inset-0 m-0 h-[100dvh] max-h-none w-screen max-w-none border-0 bg-[#0f0f12] p-0 text-white backdrop:bg-black/75 lg:inset-4 lg:m-auto lg:h-[calc(100dvh-2rem)] lg:w-[calc(100vw-2rem)] lg:rounded-2xl lg:border lg:border-white/10"
      >
        <div className="flex h-full flex-col">
          <header className="flex items-center justify-between border-b border-white/10 bg-[#192a55] px-4 py-4 sm:px-6">
            <div>
              <p className="text-xs uppercase tracking-widest text-blue-200">
                Chọn linh kiện
              </p>
              <h2 id="pc-builder-candidate-title" className="mt-1 text-xl font-black">{activeConfig?.name}</h2>
            </div>
            <button
              onClick={closeCandidates}
              aria-label="Đóng cửa sổ chọn linh kiện"
              className="rounded-xl p-2 hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
          </header>
          <div className="border-b border-white/10 p-3 lg:hidden">
            <details>
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm font-bold">
                <Filter className="h-4 w-4" />
                Bộ lọc sản phẩm
              </summary>
              <div className="mt-4 max-h-[45vh] overflow-y-auto px-1 pb-2">
                <FilterControls
                  facets={candidateData.facets}
                  filters={filters}
                  setFilters={setFilters}
                />
              </div>
            </details>
          </div>
          <div className="grid min-h-0 flex-1 lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="hidden overflow-y-auto border-r border-white/10 p-5 lg:block">
              <h3 className="mb-5 font-black">Lọc sản phẩm theo</h3>
              <FilterControls
                facets={candidateData.facets}
                filters={filters}
                setFilters={setFilters}
              />
            </aside>
            <div className="flex min-w-0 flex-col">
              <div className="grid gap-3 border-b border-white/10 p-4 sm:grid-cols-[minmax(0,1fr)_210px]">
                <label className="relative">
                  <span className="sr-only">Tìm sản phẩm</span>
                  <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-zinc-500" />
                  <input
                    autoFocus
                    value={filters.query}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        page: 1,
                        query: event.target.value,
                      }))
                    }
                    placeholder="Tìm kiếm theo tên hoặc SKU…"
                    className="w-full rounded-xl border border-white/10 bg-black/30 py-3 pl-11 pr-4 text-sm outline-none focus:border-red-500"
                  />
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <span className="shrink-0 text-zinc-500">Sắp xếp:</span>
                  <select
                    value={filters.sort}
                    onChange={(event) =>
                      setFilters((current) => ({
                        ...current,
                        page: 1,
                        sort: event.target.value as Filters["sort"],
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#1b1b20] px-3 py-3"
                  >
                    <option value="default">Mặc định</option>
                    <option value="price_asc">Giá tăng dần</option>
                    <option value="price_desc">Giá giảm dần</option>
                    <option value="newest">Mới nhất</option>
                  </select>
                </label>
              </div>
              {candidateData.context.constrained ? (
                <div className="border-b border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-100" role="status">
                  {candidateData.context.relations.map((relation, index) => (
                    <span key={`${relation.selectedComponentCode}-${relation.attributeName}`}>
                      {index ? " · " : ""}Đang lọc linh kiện tương thích {relation.attributeName} với {components.find((item) => item.code === relation.selectedComponentCode)?.name || relation.selectedComponentCode} đã chọn
                    </span>
                  ))}
                </div>
              ) : null}
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-sm text-zinc-400">
                <span aria-live="polite">
                  Tìm thấy{" "}
                  <strong className="text-white">
                    {candidateData.pagination.total}
                  </strong>{" "}
                  sản phẩm
                </span>
                <span>
                  Trang {candidateData.pagination.page}/
                  {candidateData.pagination.totalPages}
                </span>
              </div>
              <div
                className="min-h-0 flex-1 overflow-y-auto"
                aria-busy={candidateLoading}
              >
                {candidateLoading ? (
                  <div className="grid h-64 place-items-center">
                    <Loader2
                      className="h-8 w-8 animate-spin text-red-500"
                      aria-label="Đang tải sản phẩm"
                    />
                  </div>
                ) : candidateError ? (
                  <div className="grid h-64 place-items-center p-6 text-center">
                    <div>
                      <AlertTriangle className="mx-auto h-9 w-9 text-amber-400" />
                      <p className="mt-3 text-sm text-zinc-300">
                        {candidateError}
                      </p>
                      <button
                        onClick={() =>
                          setFilters((current) => ({ ...current }))
                        }
                        className="mt-4 rounded-xl border border-white/10 px-4 py-2 text-sm font-bold"
                      >
                        Thử lại
                      </button>
                    </div>
                  </div>
                ) : candidateData.items.length ? (
                  <ul className="divide-y divide-white/10">
                    {candidateData.items.map((candidate) => {
                      const selected = selections.some(
                        (selection) =>
                          selection.componentCode === activeComponent &&
                          selection.productId === candidate.productId,
                      );
                      const full =
                        selections.filter(
                          (selection) =>
                            selection.componentCode === activeComponent,
                        ).length >= (activeConfig?.maxSelections || 1) &&
                        !selected;
                      return (
                        <li
                          key={candidate.productId}
                          className="flex gap-4 p-4 sm:p-5"
                        >
                          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white sm:h-24 sm:w-24">
                            {candidate.thumbnail ? (
                              <Image
                                src={candidate.thumbnail}
                                alt=""
                                fill
                                sizes="96px"
                                className="object-contain"
                              />
                            ) : null}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-sm font-bold sm:text-base">
                              {candidate.name}
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                              Mã SP: {candidate.sku || "—"}
                              {candidate.warranty
                                ? ` · Bảo hành: ${candidate.warranty}`
                                : ""}
                            </p>
                            <p className="mt-2 text-lg font-black text-red-400">
                              {formatPcPrice(candidate.price)}{" "}
                              <span className="ml-2 text-xs font-bold text-emerald-400">
                                Có thể đặt hàng
                              </span>
                              {candidate.buildPcPrice ? (
                                <span className="mt-1 block text-xs font-bold text-cyan-300">
                                  Giá Build PC khi đủ bộ: {formatPcPrice(candidate.buildPcPrice)}
                                </span>
                              ) : null}
                            </p>
                          </div>
                          <button
                            onClick={() =>
                              chooseCandidate({ ...candidate, selected })
                            }
                            disabled={full}
                            className={`self-center rounded-xl px-4 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-40 ${selected ? "border border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "bg-[#243f7d] text-white hover:bg-[#31529b]"}`}
                          >
                            {selected ? (
                              <span className="flex items-center gap-2">
                                <Check className="h-4 w-4" />
                                Đã thêm
                              </span>
                            ) : (
                              <span className="flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                Thêm
                              </span>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="grid h-64 place-items-center p-6 text-center text-sm text-zinc-500">
                    Không có sản phẩm phù hợp với bộ lọc và các linh kiện đã
                    chọn.
                  </div>
                )}
              </div>
              <footer className="flex items-center justify-center gap-2 border-t border-white/10 p-4">
                <button
                  disabled={candidateData.pagination.page <= 1}
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      page: current.page - 1,
                    }))
                  }
                  aria-label="Trang trước"
                  className="rounded-lg border border-white/10 p-2 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="px-3 text-sm">
                  {candidateData.pagination.page} /{" "}
                  {candidateData.pagination.totalPages}
                </span>
                <button
                  disabled={
                    candidateData.pagination.page >=
                    candidateData.pagination.totalPages
                  }
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      page: current.page + 1,
                    }))
                  }
                  aria-label="Trang sau"
                  className="rounded-lg border border-white/10 p-2 disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </footer>
            </div>
          </div>
        </div>
      </dialog>

    <dialog
      ref={confirmationDialogRef}
      aria-labelledby="pc-builder-confirmation-title"
        onCancel={(event) => {
          event.preventDefault();
          setConfirmCheckout(false);
        }}
        onClose={() => setConfirmCheckout(false)}
        className="m-auto w-[min(560px,calc(100%-2rem))] rounded-2xl border border-amber-500/30 bg-[#151518] p-0 text-white shadow-2xl backdrop:bg-black/75"
      >
        <div className="p-6">
          <AlertTriangle className="h-10 w-10 text-amber-400" />
          <h2 id="pc-builder-confirmation-title" className="mt-4 text-xl font-black">Cấu hình chưa đầy đủ</h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Bạn vẫn có thể đặt hàng, nhưng cần xác nhận đã biết các cảnh báo
            sau:
          </p>
          {activeQuote?.missingRequiredComponents.length ? (
            <ul className="mt-4 list-inside list-disc space-y-2 text-sm text-amber-100">
              {activeQuote.missingRequiredComponents.map((component) => (
                <li key={component.componentCode}>{component.name}</li>
              ))}
            </ul>
          ) : null}
          <div className="mt-4">
            <DiagnosticList
              items={(activeQuote?.diagnostics || []).filter(
                (item) => item.severity === "warning" && !item.ruleCode.startsWith("missing_required_"),
              )}
            />
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button
              onClick={() => setConfirmCheckout(false)}
              className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold"
            >
              Quay lại chọn
            </button>
            <button
              onClick={confirmAndCheckout}
              className="rounded-xl bg-red-600 px-4 py-3 text-sm font-black"
            >
              Tôi hiểu, tiếp tục
            </button>
          </div>
        </div>
      </dialog>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#111113]/95 p-3 backdrop-blur xl:hidden">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
          <div>
            <p className="text-xs text-zinc-500">Tổng cấu hình</p>
            <p className="font-black text-red-500">
              {formatPcPrice(activeQuote?.totals.total || 0)}
            </p>
          </div>
          <Link
            href="#pc-builder-summary"
            className="rounded-xl bg-red-600 px-5 py-3 text-sm font-black"
          >
            Xem cấu hình
          </Link>
        </div>
      </div>
    </main>
  );
}
