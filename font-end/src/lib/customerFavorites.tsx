"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { customerFetch, useCustomerSession } from "@/lib/customer";

const STATUS_BATCH_SIZE = 100;
const STATUS_BATCH_DELAY_MS = 24;

type FavoriteSnapshot = {
  favorited: boolean | undefined;
  checking: boolean;
  pending: boolean;
  error: string;
};

type FavoriteNotice = {
  message: string;
  tone: "success" | "error";
};

const EMPTY_SNAPSHOT: FavoriteSnapshot = {
  favorited: undefined,
  checking: false,
  pending: false,
  error: "",
};

type NoticeHandler = (notice: FavoriteNotice) => void;

class CustomerFavoriteStore {
  private customerId: number | null = null;
  private snapshots = new Map<number, FavoriteSnapshot>();
  private listeners = new Map<number, Set<() => void>>();
  private registeredCounts = new Map<number, number>();
  private queuedIds = new Set<number>();
  private batchTimer: ReturnType<typeof setTimeout> | null = null;
  private announce: NoticeHandler = () => undefined;

  setNoticeHandler(handler: NoticeHandler) {
    this.announce = handler;
  }

  setCustomer(customerId: number | null) {
    if (this.customerId === customerId) return;
    this.customerId = customerId;
    this.snapshots.clear();
    this.queuedIds.clear();
    if (this.batchTimer) clearTimeout(this.batchTimer);
    this.batchTimer = null;
    for (const productId of Array.from(this.registeredCounts.keys())) {
      this.emit(productId);
      if (customerId) this.queueStatus(productId);
    }
  }

  destroy() {
    if (this.batchTimer) clearTimeout(this.batchTimer);
    this.batchTimer = null;
    this.listeners.clear();
    this.registeredCounts.clear();
    this.queuedIds.clear();
    this.snapshots.clear();
  }

  subscribe(productId: number, listener: () => void) {
    const productListeners = this.listeners.get(productId) || new Set<() => void>();
    productListeners.add(listener);
    this.listeners.set(productId, productListeners);
    return () => {
      productListeners.delete(listener);
      if (productListeners.size === 0) this.listeners.delete(productId);
    };
  }

  getSnapshot(productId: number) {
    return this.snapshots.get(productId) || EMPTY_SNAPSHOT;
  }

  register(productId: number) {
    this.registeredCounts.set(productId, (this.registeredCounts.get(productId) || 0) + 1);
    if (this.customerId && !this.snapshots.has(productId)) this.queueStatus(productId);
    return () => {
      const nextCount = (this.registeredCounts.get(productId) || 1) - 1;
      if (nextCount > 0) this.registeredCounts.set(productId, nextCount);
      else this.registeredCounts.delete(productId);
    };
  }

  primeFavoriteIds(productIds: number[]) {
    for (const productId of productIds) {
      if (!Number.isSafeInteger(productId) || productId <= 0) continue;
      this.setSnapshot(productId, {
        favorited: true,
        checking: false,
        pending: false,
        error: "",
      });
      this.queuedIds.delete(productId);
    }
  }

  async toggle(productId: number) {
    if (!this.customerId) return null;
    const previous = this.getSnapshot(productId);
    if (previous.pending || previous.checking) return previous.favorited ?? null;
    const nextFavorite = previous.favorited !== true;
    this.setSnapshot(productId, {
      favorited: nextFavorite,
      checking: false,
      pending: true,
      error: "",
    });
    try {
      await customerFetch(`/api/customer/favorites/${productId}`, {
        method: nextFavorite ? "PUT" : "DELETE",
      });
      this.setSnapshot(productId, {
        favorited: nextFavorite,
        checking: false,
        pending: false,
        error: "",
      });
      this.announce({
        message: nextFavorite
          ? "Đã thêm sản phẩm vào danh sách yêu thích."
          : "Đã bỏ sản phẩm khỏi danh sách yêu thích.",
        tone: "success",
      });
      return nextFavorite;
    } catch (reason) {
      const message = reason instanceof Error
        ? reason.message
        : "Không thể cập nhật danh sách yêu thích.";
      this.setSnapshot(productId, {
        favorited: previous.favorited,
        checking: false,
        pending: false,
        error: message,
      });
      this.announce({ message, tone: "error" });
      throw reason;
    }
  }

  private queueStatus(productId: number) {
    if (!this.customerId || this.queuedIds.has(productId)) return;
    this.queuedIds.add(productId);
    this.setSnapshot(productId, {
      favorited: undefined,
      checking: true,
      pending: false,
      error: "",
    });
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.batchTimer = null;
        void this.flushStatusQueue();
      }, STATUS_BATCH_DELAY_MS);
    }
  }

  private async flushStatusQueue() {
    const customerId = this.customerId;
    if (!customerId || this.queuedIds.size === 0) return;
    const ids = Array.from(this.queuedIds);
    this.queuedIds.clear();
    const chunks: number[][] = [];
    for (let index = 0; index < ids.length; index += STATUS_BATCH_SIZE) {
      chunks.push(ids.slice(index, index + STATUS_BATCH_SIZE));
    }
    await Promise.all(chunks.map(async (chunk) => {
      try {
        const data = await customerFetch(`/api/customer/favorites/status?ids=${chunk.join(",")}`);
        if (this.customerId !== customerId) return;
        const favoriteIds = new Set<number>(
          Array.isArray(data?.favoriteProductIds)
            ? data.favoriteProductIds.map(Number).filter((id: number) => Number.isSafeInteger(id) && id > 0)
            : [],
        );
        for (const productId of chunk) {
          this.setSnapshot(productId, {
            favorited: favoriteIds.has(productId),
            checking: false,
            pending: false,
            error: "",
          });
        }
      } catch (reason) {
        if (this.customerId !== customerId) return;
        const message = reason instanceof Error
          ? reason.message
          : "Không thể kiểm tra danh sách yêu thích.";
        for (const productId of chunk) {
          this.setSnapshot(productId, {
            favorited: undefined,
            checking: false,
            pending: false,
            error: message,
          });
        }
        this.announce({ message, tone: "error" });
      }
    }));
  }

  private setSnapshot(productId: number, snapshot: FavoriteSnapshot) {
    this.snapshots.set(productId, snapshot);
    this.emit(productId);
  }

  private emit(productId: number) {
    for (const listener of Array.from(this.listeners.get(productId) || [])) listener();
  }
}

type CustomerFavoritesContextValue = {
  store: CustomerFavoriteStore;
  primeFavoriteIds: (productIds: number[]) => void;
};

const CustomerFavoritesContext = createContext<CustomerFavoritesContextValue | null>(null);

export function CustomerFavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useCustomerSession();
  const [notice, setNotice] = useState<FavoriteNotice | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const announce = useCallback((nextNotice: FavoriteNotice) => {
    setNotice(nextNotice);
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 2600);
  }, []);
  const [store] = useState(() => new CustomerFavoriteStore());

  useEffect(() => {
    store.setNoticeHandler(announce);
    return () => store.setNoticeHandler(() => undefined);
  }, [announce, store]);

  useEffect(() => {
    store.setCustomer(user?.id || null);
  }, [store, user?.id]);

  useEffect(() => () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    store.destroy();
  }, [store]);

  const value = useMemo<CustomerFavoritesContextValue>(() => ({
    store,
    primeFavoriteIds: (productIds) => store.primeFavoriteIds(productIds),
  }), [store]);

  return (
    <CustomerFavoritesContext.Provider value={value}>
      {children}
      <div
        className={`customer-favorite-toast ${notice ? "is-visible" : ""} ${notice?.tone === "error" ? "is-error" : "is-success"}`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {notice?.message || ""}
      </div>
    </CustomerFavoritesContext.Provider>
  );
}

export function useCustomerFavorite(productId: number) {
  const context = useContext(CustomerFavoritesContext);
  if (!context) throw new Error("useCustomerFavorite must be used within CustomerFavoritesProvider");
  const { store } = context;
  useEffect(() => store.register(productId), [productId, store]);
  const subscribe = useCallback((listener: () => void) => store.subscribe(productId, listener), [productId, store]);
  const getSnapshot = useCallback(() => store.getSnapshot(productId), [productId, store]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const toggle = useCallback(() => store.toggle(productId), [productId, store]);
  return { ...snapshot, toggle };
}

export function usePrimeCustomerFavorites() {
  const context = useContext(CustomerFavoritesContext);
  if (!context) throw new Error("usePrimeCustomerFavorites must be used within CustomerFavoritesProvider");
  return context.primeFavoriteIds;
}
