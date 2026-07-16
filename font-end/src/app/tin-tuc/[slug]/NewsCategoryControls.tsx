'use client';

import { useState } from 'react';

export function NewsCategoryShareControls() {
  const [copied, setCopied] = useState(false);

  function shareFacebook() {
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=720,height=560');
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 uppercase font-bold">Chia sẻ:</span>
      <button type="button" aria-label="Chia sẻ lên Facebook" title="Chia sẻ lên Facebook" onClick={shareFacebook} className="w-8 h-8 rounded-full bg-[#111115] border border-[#1a1a1e] flex items-center justify-center text-gray-400 hover:text-white hover:border-blue-500 transition focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0c]">
        <svg aria-hidden="true" className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
      </button>
      <button type="button" aria-label={copied ? 'Đã sao chép liên kết' : 'Sao chép liên kết'} title={copied ? 'Đã sao chép' : 'Sao chép liên kết'} onClick={copyLink} className="w-8 h-8 rounded-full bg-[#111115] border border-[#1a1a1e] flex items-center justify-center text-gray-400 hover:text-white hover:border-blue-500 transition focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0c]">
        <svg aria-hidden="true" className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
      </button>
      <span className="sr-only" aria-live="polite">{copied ? 'Đã sao chép liên kết.' : ''}</span>
    </div>
  );
}
