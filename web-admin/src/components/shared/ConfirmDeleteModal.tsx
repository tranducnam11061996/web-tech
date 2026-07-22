'use client';

import { useEffect, useId, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

type Detail = {
  label: string;
  value?: string | number | null;
};

type ConfirmDeleteModalProps = {
  open: boolean;
  title: string;
  description: string;
  itemName?: string;
  details?: Detail[];
  error?: string;
  loading?: boolean;
  confirmDisabled?: boolean;
  confirmLabel?: string;
  loadingLabel?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDeleteModal({
  open,
  title,
  description,
  itemName,
  details = [],
  error = '',
  loading = false,
  confirmDisabled = false,
  confirmLabel = 'Xác nhận xóa',
  loadingLabel = 'Đang xóa...',
  onCancel,
  onConfirm,
}: ConfirmDeleteModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => cancelButtonRef.current?.focus());
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open]);

  if (!open) return null;

  const visibleDetails = details.filter((detail) => detail.value !== undefined && detail.value !== null && detail.value !== '');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={loading}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !loading) {
          event.preventDefault();
          event.stopPropagation();
          onCancel();
          return;
        }
        if (event.key !== 'Tab') return;
        const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ) || []);
        if (focusable.length === 0) {
          event.preventDefault();
          dialogRef.current?.focus();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onCancel();
      }}
    >
      <div ref={dialogRef} tabIndex={-1} className="w-full max-w-md rounded-lg border border-red-900/70 bg-gray-950 p-5 shadow-[0_0_40px_rgba(239,68,68,0.25)] outline-none">
        <div className="flex items-start gap-3">
          <div className="rounded-full border border-red-800 bg-red-950/60 p-2 text-red-400">
            <AlertTriangle aria-hidden="true" className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h2 id={titleId} className="text-base font-bold text-gray-100">
                {title}
              </h2>
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="rounded-sm p-1 text-gray-500 transition hover:bg-gray-800 hover:text-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:opacity-50 motion-reduce:transition-none"
                aria-label="Đóng modal"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
            <p id={descriptionId} className="mt-2 text-sm leading-6 text-gray-300">{description}</p>
          </div>
        </div>

        {(itemName || visibleDetails.length > 0) && (
          <div className="mt-4 rounded-md border border-gray-800 bg-gray-900/70 p-4">
            {itemName && <div className="text-sm font-semibold text-gray-100">{itemName}</div>}
            {visibleDetails.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-2 text-xs font-mono text-gray-400">
                {visibleDetails.map((detail) => (
                  <span key={detail.label}>{detail.label}: {detail.value}</span>
                ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <div role="alert" className="mt-4 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-md border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-gray-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 disabled:opacity-50 motion-reduce:transition-none"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || confirmDisabled}
            className="rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:opacity-50 motion-reduce:transition-none"
          >
            {loading ? loadingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
