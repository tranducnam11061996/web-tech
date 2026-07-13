"use client";

export function openProductSpecifications() {
  const dialog = document.getElementById('specModal');
  if (dialog instanceof HTMLDialogElement && !dialog.open) dialog.showModal();
}

export default function ProductSpecificationsOpenButton() {
  return (
    <button type="button" className="px-6 py-2.5 bg-red-600/90 backdrop-blur-md text-white text-sm font-bold rounded-lg hover:bg-red-500 transition flex items-center gap-2 shadow-md shadow-black/20" onClick={openProductSpecifications}>
      Xem thêm cấu hình chi tiết
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
    </button>
  );
}
