"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ShoppingCart, X } from "lucide-react";
import {
  CART_ITEM_ADDED_EVENT,
  formatCurrency,
  type CartItemAddedDetail,
} from "@/lib/cart";

const DISPLAY_DURATION = 6000;
const CLOSE_DURATION = 180;
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function AddToCartSuccessModal() {
  const [detail, setDetail] = useState<CartItemAddedDetail | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [eventId, setEventId] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const autoCloseRef = useRef<number | null>(null);
  const finishCloseRef = useRef<number | null>(null);

  const clearTimers = useCallback(() => {
    if (autoCloseRef.current !== null) window.clearTimeout(autoCloseRef.current);
    if (finishCloseRef.current !== null) window.clearTimeout(finishCloseRef.current);
    autoCloseRef.current = null;
    finishCloseRef.current = null;
  }, []);

  const close = useCallback(() => {
    if (!detail || isClosing) return;
    if (autoCloseRef.current !== null) window.clearTimeout(autoCloseRef.current);
    setIsClosing(true);
    finishCloseRef.current = window.setTimeout(() => {
      setDetail(null);
      setIsClosing(false);
      returnFocusRef.current?.focus();
    }, CLOSE_DURATION);
  }, [detail, isClosing]);

  useEffect(() => {
    const handleAdded = (event: Event) => {
      const customEvent = event as CustomEvent<CartItemAddedDetail>;
      clearTimers();
      returnFocusRef.current = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      setIsClosing(false);
      setDetail(customEvent.detail);
      setEventId((value) => value + 1);
    };

    window.addEventListener(CART_ITEM_ADDED_EVENT, handleAdded);
    return () => {
      window.removeEventListener(CART_ITEM_ADDED_EVENT, handleAdded);
      clearTimers();
    };
  }, [clearTimers]);

  useEffect(() => {
    if (!detail || isClosing) return;
    autoCloseRef.current = window.setTimeout(close, DISPLAY_DURATION);
    return () => {
      if (autoCloseRef.current !== null) window.clearTimeout(autoCloseRef.current);
    };
  }, [close, detail, eventId, isClosing]);

  useEffect(() => {
    if (!detail) return;

    closeButtonRef.current?.focus({ preventScroll: true });
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [close, detail]);

  if (!detail) return null;

  const { item, quantity, batchCount = 1, totalQuantity = quantity } = detail;

  return (
    <div
      className={`cart-success-backdrop ${isClosing ? "is-closing" : ""}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        className="cart-success-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-success-title"
        aria-describedby="cart-success-description"
      >
        <span className="cart-success-corner cart-success-corner-left" aria-hidden="true" />
        <span className="cart-success-corner cart-success-corner-right" aria-hidden="true" />

        <button
          ref={closeButtonRef}
          type="button"
          className="cart-success-close"
          onClick={close}
          aria-label="Đóng thông báo"
        >
          <X aria-hidden="true" size={19} />
        </button>

        <div className="cart-success-heading">
          <div className="cart-success-orbit" aria-hidden="true">
            <span />
            <Check size={29} strokeWidth={3} />
          </div>
          <div>
            <p className="cart-success-kicker">SYSTEM // CART UPDATED</p>
            <h2 id="cart-success-title">Đã thêm vào giỏ hàng</h2>
            <p id="cart-success-description">{batchCount > 1 ? `${batchCount} mẫu linh kiện đã được ghi nhận.` : "Sản phẩm của bạn đã được ghi nhận."}</p>
          </div>
        </div>

        <div className="cart-success-product">
          <div className="cart-success-image">
            {item.thumbnail ? (
              <Image src={item.thumbnail} alt="" fill sizes="72px" className="object-cover" />
            ) : (
              <ShoppingCart aria-hidden="true" size={28} />
            )}
          </div>
          <div className="cart-success-product-copy">
            <p>{batchCount > 1 ? `Cấu hình gồm ${batchCount} mẫu linh kiện` : item.name}</p>
            <span>Tổng số lượng: {totalQuantity}</span>
          </div>
          <strong>{batchCount > 1 ? "Đã thêm" : formatCurrency(item.price * quantity)}</strong>
        </div>

        <Link href="/gio-hang" className="cart-success-action" onClick={close}>
          <ShoppingCart aria-hidden="true" size={18} />
          Xem giỏ hàng
        </Link>

        <div className="cart-success-timer" aria-hidden="true">
          <span key={eventId} />
        </div>
      </div>
    </div>
  );
}
