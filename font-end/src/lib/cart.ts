"use client";

import { useMemo, useSyncExternalStore } from "react";

export const CART_STORAGE_KEY = "hacom.cart.v1";
const CART_CHANGED_EVENT = "hacom-cart-change";
export const CART_ITEM_ADDED_EVENT = "hacom-cart-item-added";
const MAX_QUANTITY = 99;
const EMPTY_CART: CartItem[] = [];

export type CartItem = {
  productId: number;
  slug: string;
  name: string;
  sku: string;
  thumbnail: string;
  price: number;
  marketPrice: number;
  quantity: number;
  selected: boolean;
  savedForLater: boolean;
  addedAt: string;
};

export type CartInput = Omit<CartItem, "quantity" | "selected" | "savedForLater" | "addedAt">;

export type CartItemAddedDetail = {
  item: CartInput;
  quantity: number;
  batchCount?: number;
  totalQuantity?: number;
};

let cartCache: CartItem[] | null = null;

export function clampQuantity(quantity: number) {
  if (!Number.isFinite(quantity)) return 1;
  return Math.min(MAX_QUANTITY, Math.max(1, Math.floor(quantity)));
}

export function formatCurrency(value: number) {
  return `${new Intl.NumberFormat("vi-VN").format(Math.max(0, Math.round(value || 0)))}đ`;
}

function isBrowser() {
  return typeof window !== "undefined";
}

function normalizeCartItem(item: Partial<CartItem>): CartItem | null {
  const productId = Number(item.productId);
  if (!Number.isFinite(productId) || productId <= 0) return null;

  return {
    productId,
    slug: String(item.slug || `product-${productId}`).replace(/^\/+/, ""),
    name: String(item.name || "Sản phẩm"),
    sku: String(item.sku || ""),
    thumbnail: String(item.thumbnail || ""),
    price: Number(item.price || 0),
    marketPrice: Number(item.marketPrice || 0),
    quantity: clampQuantity(Number(item.quantity || 1)),
    selected: item.selected !== false,
    savedForLater: item.savedForLater === true,
    addedAt: item.addedAt || new Date().toISOString(),
  };
}

function normalizeCartItems(items: Partial<CartItem>[]) {
  const byProduct = new Map<number, CartItem>();

  for (const rawItem of items) {
    const item = normalizeCartItem(rawItem);
    if (!item) continue;

    const existing = byProduct.get(item.productId);
    if (existing) {
      byProduct.set(item.productId, {
        ...existing,
        ...item,
        quantity: clampQuantity(existing.quantity + item.quantity),
        selected: existing.selected || item.selected,
        savedForLater: existing.savedForLater && item.savedForLater,
        addedAt: existing.addedAt,
      });
    } else {
      byProduct.set(item.productId, item);
    }
  }

  return Array.from(byProduct.values()).sort((a, b) => {
    return new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime();
  });
}

function loadCartFromStorage() {
  if (!isBrowser()) return [];

  try {
    const stored = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? normalizeCartItems(parsed) : [];
  } catch {
    return [];
  }
}

function emitCartChanged() {
  if (!isBrowser()) return;
  window.dispatchEvent(new Event(CART_CHANGED_EVENT));
}

export function getCartItems() {
  if (!isBrowser()) return EMPTY_CART;
  if (!cartCache) cartCache = loadCartFromStorage();
  return cartCache;
}

export function setCartItems(items: Partial<CartItem>[]) {
  if (!isBrowser()) return;
  cartCache = normalizeCartItems(items);
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartCache));
  emitCartChanged();
}

function subscribeCart(callback: () => void) {
  if (!isBrowser()) return () => {};

  const onStorage = (event: StorageEvent) => {
    if (event.key === CART_STORAGE_KEY) {
      cartCache = loadCartFromStorage();
      callback();
    }
  };

  window.addEventListener(CART_CHANGED_EVENT, callback);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(CART_CHANGED_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCartItems() {
  return useSyncExternalStore(subscribeCart, getCartItems, () => EMPTY_CART);
}

export function useCartSummary() {
  const items = useCartItems();

  return useMemo(() => {
    const activeItems = items.filter((item) => !item.savedForLater);
    return {
      totalQuantity: activeItems.reduce((total, item) => total + item.quantity, 0),
      activeCount: activeItems.length,
      selectedCount: activeItems.filter((item) => item.selected).length,
      savedCount: items.length - activeItems.length,
    };
  }, [items]);
}

export function addCartItem(item: CartInput, quantity = 1, options?: { selectOnly?: boolean }) {
  const qty = clampQuantity(quantity);
  const currentItems = getCartItems();
  const existing = currentItems.find((cartItem) => cartItem.productId === item.productId);
  const now = new Date().toISOString();

  let nextItems = currentItems.map((cartItem) => {
    if (options?.selectOnly && !cartItem.savedForLater) {
      return { ...cartItem, selected: false };
    }
    return cartItem;
  });

  if (existing) {
    nextItems = nextItems.map((cartItem) => {
      if (cartItem.productId !== item.productId) return cartItem;
      return {
        ...cartItem,
        ...item,
        slug: item.slug.replace(/^\/+/, ""),
        quantity: clampQuantity(cartItem.quantity + qty),
        selected: true,
        savedForLater: false,
      };
    });
  } else {
    nextItems.push({
      ...item,
      slug: item.slug.replace(/^\/+/, ""),
      quantity: qty,
      selected: true,
      savedForLater: false,
      addedAt: now,
    });
  }

  setCartItems(nextItems);

  if (!options?.selectOnly) {
    window.dispatchEvent(
      new CustomEvent<CartItemAddedDetail>(CART_ITEM_ADDED_EVENT, {
        detail: { item, quantity: qty },
      }),
    );
  }
}

export function addCartItems(entries: Array<{ item: CartInput; quantity: number }>) {
  if (!isBrowser() || entries.length === 0) return;
  let nextItems = getCartItems();
  const now = new Date().toISOString();
  for (const entry of entries) {
    const qty = clampQuantity(entry.quantity);
    const existing = nextItems.find((cartItem) => cartItem.productId === entry.item.productId);
    if (existing) {
      nextItems = nextItems.map((cartItem) => cartItem.productId === entry.item.productId ? {
        ...cartItem,
        ...entry.item,
        slug: entry.item.slug.replace(/^\/+/, ""),
        quantity: clampQuantity(cartItem.quantity + qty),
        selected: true,
        savedForLater: false,
      } : cartItem);
    } else {
      nextItems = [...nextItems, {
        ...entry.item,
        slug: entry.item.slug.replace(/^\/+/, ""),
        quantity: qty,
        selected: true,
        savedForLater: false,
        addedAt: now,
      }];
    }
  }
  setCartItems(nextItems);
  const first = entries[0];
  window.dispatchEvent(new CustomEvent<CartItemAddedDetail>(CART_ITEM_ADDED_EVENT, {
    detail: {
      item: first.item,
      quantity: first.quantity,
      batchCount: entries.length,
      totalQuantity: entries.reduce((total, entry) => total + entry.quantity, 0),
    },
  }));
}

export function updateCartQuantity(productId: number, quantity: number) {
  setCartItems(
    getCartItems().map((item) =>
      item.productId === productId ? { ...item, quantity: clampQuantity(quantity) } : item,
    ),
  );
}

export function setCartItemSelected(productId: number, selected: boolean) {
  setCartItems(
    getCartItems().map((item) =>
      item.productId === productId && !item.savedForLater ? { ...item, selected } : item,
    ),
  );
}

export function setAllActiveCartItemsSelected(selected: boolean) {
  setCartItems(
    getCartItems().map((item) =>
      item.savedForLater ? item : { ...item, selected },
    ),
  );
}

export function setCartItemSavedForLater(productId: number, savedForLater: boolean) {
  setCartItems(
    getCartItems().map((item) =>
      item.productId === productId
        ? { ...item, savedForLater, selected: !savedForLater }
        : item,
    ),
  );
}

export function removeCartItem(productId: number) {
  setCartItems(getCartItems().filter((item) => item.productId !== productId));
}

export function removeSelectedCartItems() {
  setCartItems(getCartItems().filter((item) => item.savedForLater || !item.selected));
}

export function removePurchasedCartItems(productIds: number[]) {
  const purchased = new Set(productIds);
  setCartItems(getCartItems().filter((item) => !purchased.has(item.productId)));
}
