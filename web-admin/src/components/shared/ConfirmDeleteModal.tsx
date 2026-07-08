'use client';

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
  if (!open) return null;

  const visibleDetails = details.filter((detail) => detail.value !== undefined && detail.value !== null && detail.value !== '');

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-delete-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) onCancel();
      }}
    >
      <div className="w-full max-w-md rounded-lg border border-red-900/70 bg-gray-950 p-5 shadow-[0_0_40px_rgba(239,68,68,0.25)]">
        <div className="flex items-start gap-3">
          <div className="rounded-full border border-red-800 bg-red-950/60 p-2 text-red-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h2 id="confirm-delete-title" className="text-base font-bold text-gray-100">
                {title}
              </h2>
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="rounded-sm p-1 text-gray-500 transition hover:bg-gray-800 hover:text-gray-200 disabled:opacity-50"
                aria-label="Đóng modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-sm leading-6 text-gray-300">{description}</p>
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
          <div className="mt-4 rounded-md border border-red-900/60 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-md border border-gray-700 bg-gray-900 px-4 py-2 text-sm font-semibold text-gray-200 transition hover:border-gray-500 hover:text-white disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || confirmDisabled}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500 disabled:opacity-50"
          >
            {loading ? loadingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
