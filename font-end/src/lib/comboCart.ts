"use client";

import { useSyncExternalStore } from "react";

export const COMBO_CART_STORAGE_KEY = "hacom.combo-cart.v1";
const CHANGE_EVENT = "hacom-combo-cart-change";

export type ComboCartItem = { groupIndex: number; productId: number; quantity: number };
export type ComboCart = {
  version: 1;
  anchorProductId: number;
  comboSetId: number;
  revision: string;
  items: ComboCartItem[];
};

export type ComboApiPayload = Omit<ComboCart, "version">;

export function toComboApiPayload(cart: ComboCart): ComboApiPayload {
  return {
    anchorProductId: cart.anchorProductId,
    comboSetId: cart.comboSetId,
    revision: cart.revision,
    items: cart.items.map((item) => ({
      groupIndex: item.groupIndex,
      productId: item.productId,
      quantity: item.quantity,
    })),
  };
}

let cache: ComboCart | null | undefined;

function normalize(value: unknown): ComboCart | null {
  const input = value as Partial<ComboCart> | null;
  if (!input || input.version !== 1 || !Number.isInteger(input.anchorProductId) || Number(input.anchorProductId) <= 0 || !Number.isInteger(input.comboSetId) || Number(input.comboSetId) <= 0 || typeof input.revision !== "string" || !Array.isArray(input.items)) return null;
  const seen = new Set<number>();
  const items = input.items.flatMap((item) => {
    const productId = Number(item?.productId);
    const groupIndex = Number(item?.groupIndex);
    const quantity = Math.min(99, Math.max(1, Math.floor(Number(item?.quantity) || 1)));
    if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(groupIndex) || groupIndex < 0 || seen.has(productId)) return [];
    seen.add(productId);
    return [{ productId, groupIndex, quantity }];
  });
  return { version: 1, anchorProductId: Number(input.anchorProductId), comboSetId: Number(input.comboSetId), revision: input.revision, items };
}

export function getComboCart() {
  if (typeof window === "undefined") return null;
  if (cache !== undefined) return cache;
  try { cache = normalize(JSON.parse(window.localStorage.getItem(COMBO_CART_STORAGE_KEY) || "null")); } catch { cache = null; }
  return cache;
}

export function setComboCart(value: ComboCart | null) {
  if (typeof window === "undefined") return;
  cache = value ? normalize(value) : null;
  if (cache) window.localStorage.setItem(COMBO_CART_STORAGE_KEY, JSON.stringify(cache));
  else window.localStorage.removeItem(COMBO_CART_STORAGE_KEY);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback: () => void) {
  const change = () => { cache = undefined; callback(); };
  window.addEventListener(CHANGE_EVENT, change);
  window.addEventListener("storage", change);
  return () => { window.removeEventListener(CHANGE_EVENT, change); window.removeEventListener("storage", change); };
}

export function useComboCart() {
  return useSyncExternalStore(subscribe, getComboCart, () => null);
}
