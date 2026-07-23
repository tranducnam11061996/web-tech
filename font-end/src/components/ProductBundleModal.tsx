"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  Boxes,
  ChevronLeft,
  ChevronRight,
  PackageSearch,
  RefreshCw,
  Search,
  SearchX,
  X,
} from "lucide-react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { ComboGroupSummary } from "@/types/product-detail";
import ProductGridCard from "./ProductGridCard";
import { useDialogAccessibility } from "./useDialogAccessibility";

export type BundleProduct = {
  id: number;
  name: string;
  sku: string;
  slug: string;
  thumbnail: string;
  brand: string;
  price: number;
  marketPrice: number;
  potentialDiscount: number;
  comboUnitPrice: number;
};

export type SelectedBundleProduct = {
  id: number;
  groupIndex: number;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  setId: number;
  anchorProductId: number;
  revision: string;
  groups: ComboGroupSummary[];
  initialGroupIndex: number;
  selectedProducts: SelectedBundleProduct[];
  onToggle: (groupIndex: number, product: BundleProduct) => void;
};

type GroupPayload = {
  success?: boolean;
  data?: {
    products?: BundleProduct[];
    pagination?: {
      totalItems?: number;
      totalPages?: number;
    };
  };
  error?: { message?: string };
};

const SKELETON_COUNT = 12;

export default function ProductBundleModal({
  isOpen,
  onClose,
  setId,
  anchorProductId,
  revision,
  groups,
  initialGroupIndex,
  selectedProducts,
  onToggle,
}: Props) {
  const defaultGroup = groups.some((group) => group.groupIndex === initialGroupIndex)
    ? initialGroupIndex
    : (groups[0]?.groupIndex ?? 0);
  const [activeGroup, setActiveGroup] = useState(defaultGroup);
  const [products, setProducts] = useState<BundleProduct[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const dialogRef = useDialogAccessibility(isOpen, onClose);
  const tabRefs = useRef(new Map<number, HTMLButtonElement>());
  const instanceId = useId();

  const activeGroupData =
    groups.find((group) => group.groupIndex === activeGroup) || groups[0];
  const selectedIds = new Set(selectedProducts.map((product) => product.id));
  const selectedCountByGroup = new Map<number, number>();
  for (const product of selectedProducts) {
    selectedCountByGroup.set(
      product.groupIndex,
      (selectedCountByGroup.get(product.groupIndex) || 0) + 1,
    );
  }

  useEffect(() => {
    if (!isOpen) return;
    setActiveGroup(defaultGroup);
    setPage(1);
    setQuery("");
    setError("");
  }, [defaultGroup, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const url = new URL(
          `/api/combo-sets/${setId}/groups/${activeGroup}`,
          window.location.origin,
        );
        url.searchParams.set("anchorProductId", String(anchorProductId));
        url.searchParams.set("revision", revision);
        url.searchParams.set("page", String(page));
        url.searchParams.set("limit", "24");
        if (query.trim()) url.searchParams.set("q", query.trim());

        const response = await fetch(url, { signal: controller.signal });
        const payload = (await response.json()) as GroupPayload;
        if (!response.ok || !payload.success) {
          throw new Error(
            payload.error?.message || "Không thể tải sản phẩm combo.",
          );
        }

        setProducts(payload.data?.products || []);
        setPages(Math.max(1, Number(payload.data?.pagination?.totalPages || 1)));
        setTotalItems(Math.max(0, Number(payload.data?.pagination?.totalItems || 0)));
      } catch (cause) {
        if (!controller.signal.aborted) {
          setProducts([]);
          setTotalItems(0);
          setError(
            cause instanceof Error
              ? cause.message
              : "Không thể tải sản phẩm combo.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, query ? 250 : 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [
    activeGroup,
    anchorProductId,
    isOpen,
    page,
    query,
    retryKey,
    revision,
    setId,
  ]);

  if (!isOpen) return null;

  const selectGroup = (groupIndex: number, focusTab = false) => {
    setActiveGroup(groupIndex);
    setPage(1);
    if (focusTab) {
      window.requestAnimationFrame(() => tabRefs.current.get(groupIndex)?.focus());
    }
  };

  const handleTabKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    groupIndex: number,
  ) => {
    const currentIndex = groups.findIndex((group) => group.groupIndex === groupIndex);
    if (currentIndex < 0) return;

    let nextIndex = currentIndex;
    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % groups.length;
    else if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + groups.length) % groups.length;
    } else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = groups.length - 1;
    else return;

    event.preventDefault();
    selectGroup(groups[nextIndex].groupIndex, true);
  };

  const dialogTitleId = `${instanceId}-combo-dialog-title`;
  const panelId = `${instanceId}-combo-panel-${activeGroup}`;
  const activeTabId = `${instanceId}-combo-tab-${activeGroup}`;
  const hasSearchQuery = Boolean(query.trim());

  return (
    <div
      className="bundle-list-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="bundle-list-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        tabIndex={-1}
      >
        <header className="bundle-list-header">
          <div className="bundle-list-header-main">
            <span className="bundle-list-emblem" aria-hidden="true">
              <Boxes />
            </span>
            <div className="bundle-list-heading-copy">
              <span className="bundle-list-eyebrow">Mua kèm · Giá sốc</span>
              <h3 id={dialogTitleId}>Chọn sản phẩm mua kèm</h3>
              <p>Hoàn thiện cấu hình với mức giá dành riêng cho combo.</p>
            </div>
          </div>
          <div className="bundle-list-selected-summary" aria-live="polite">
            <strong>{selectedProducts.length}</strong>
            <span>đã chọn</span>
          </div>
          <button
            type="button"
            className="bundle-list-close"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X />
          </button>
        </header>

        <div className="bundle-list-tabs-container">
          <div
            className="bundle-list-tabs"
            role="tablist"
            aria-label="Nhóm sản phẩm combo"
          >
            {groups.map((group) => {
              const isActive = activeGroup === group.groupIndex;
              const selectedCount = selectedCountByGroup.get(group.groupIndex) || 0;
              return (
                <button
                  key={group.groupIndex}
                  ref={(node) => {
                    if (node) tabRefs.current.set(group.groupIndex, node);
                    else tabRefs.current.delete(group.groupIndex);
                  }}
                  id={`${instanceId}-combo-tab-${group.groupIndex}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`${instanceId}-combo-panel-${group.groupIndex}`}
                  tabIndex={isActive ? 0 : -1}
                  className={`bundle-list-tab ${isActive ? "is-active" : ""}`}
                  onClick={() => selectGroup(group.groupIndex)}
                  onKeyDown={(event) => handleTabKeyDown(event, group.groupIndex)}
                >
                  <span>{group.title}</span>
                  {selectedCount > 0 ? (
                    <span className="bundle-list-tab-count" aria-label={`${selectedCount} sản phẩm đã chọn`}>
                      {selectedCount}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bundle-list-toolbar">
          <div className="bundle-list-search">
            <Search aria-hidden="true" />
            <label className="sr-only" htmlFor={`${instanceId}-combo-product-search`}>
              Tìm sản phẩm trong nhóm {activeGroupData?.title}
            </label>
            <input
              id={`${instanceId}-combo-product-search`}
              maxLength={100}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Tìm tên hoặc mã sản phẩm"
            />
            {query ? (
              <button
                type="button"
                className="bundle-list-search-clear"
                onClick={() => {
                  setQuery("");
                  setPage(1);
                }}
                aria-label="Xóa nội dung tìm kiếm"
              >
                <X />
              </button>
            ) : null}
          </div>
          <div className="bundle-list-group-meta">
            <span>
              <strong>{loading ? "…" : totalItems}</strong> sản phẩm
            </span>
            {activeGroupData?.discountLabel ? (
              <span className="bundle-list-discount-label">
                {activeGroupData.discountLabel}
              </span>
            ) : null}
          </div>
        </div>

        <section
          id={panelId}
          className="bundle-list-content"
          role="tabpanel"
          aria-labelledby={activeTabId}
          aria-busy={loading}
        >
          {loading ? (
            <>
              <p className="sr-only" role="status">
                Đang tải sản phẩm combo…
              </p>
              <div className="bundle-list-grid bundle-list-skeleton-grid" aria-hidden="true">
                {Array.from({ length: SKELETON_COUNT }, (_, index) => (
                  <div className="bundle-list-card-skeleton" key={index}>
                    <span className="bundle-list-skeleton-image" />
                    <span className="bundle-list-skeleton-line is-long" />
                    <span className="bundle-list-skeleton-line" />
                    <span className="bundle-list-skeleton-price" />
                  </div>
                ))}
              </div>
            </>
          ) : error ? (
            <div className="bundle-list-state is-error" role="alert">
              <PackageSearch aria-hidden="true" />
              <h4>Chưa tải được sản phẩm</h4>
              <p>{error}</p>
              <button type="button" onClick={() => setRetryKey((value) => value + 1)}>
                <RefreshCw aria-hidden="true" />
                Thử lại
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="bundle-list-state">
              <SearchX aria-hidden="true" />
              <h4>{hasSearchQuery ? "Không tìm thấy sản phẩm" : "Nhóm chưa có sản phẩm"}</h4>
              <p>
                {hasSearchQuery
                  ? `Không có kết quả phù hợp với “${query.trim()}”.`
                  : "Hãy chọn một nhóm sản phẩm khác để tiếp tục."}
              </p>
              {hasSearchQuery ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setPage(1);
                  }}
                >
                  Xóa tìm kiếm
                </button>
              ) : null}
            </div>
          ) : (
            <div className="bundle-list-grid" data-product-count={products.length}>
              {products.map((product) => (
                <ProductGridCard
                  key={product.id}
                  product={{
                    id: product.id,
                    slug: product.slug,
                    name: product.name,
                    sku: product.sku,
                    thumbnail: product.thumbnail,
                    brand: product.brand,
                    price: product.comboUnitPrice,
                    marketPrice: product.price,
                  }}
                  action={{
                    type: "combo",
                    selected: selectedIds.has(product.id),
                    onToggle: () => onToggle(activeGroup, product),
                  }}
                  productLinkTarget="_blank"
                />
              ))}
            </div>
          )}
        </section>

        {pages > 1 ? (
          <footer className="bundle-list-footer" aria-label="Phân trang sản phẩm combo">
            <button
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={page === 1}
              aria-label="Trang trước"
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <span>
              Trang <strong>{page}</strong> / {pages}
            </span>
            <button
              type="button"
              onClick={() => setPage((value) => Math.min(pages, value + 1))}
              disabled={page === pages}
              aria-label="Trang sau"
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
