'use client';

import { useState } from 'react';

export default function ArticleShareControls({ title }: { title: string }) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');

  function openShareWindow(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer,width=720,height=560');
  }

  function shareFacebook() {
    openShareWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`);
  }

  function shareX() {
    const url = new URL('https://twitter.com/intent/tweet');
    url.searchParams.set('url', window.location.href);
    url.searchParams.set('text', title);
    openShareWindow(url.toString());
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyStatus('copied');
      window.setTimeout(() => setCopyStatus('idle'), 2_000);
    } catch {
      setCopyStatus('failed');
    }
  }

  const focusClass = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0c]';

  return (
    <div data-article-share-controls className="flex items-center gap-3">
      <span className="text-sm font-bold text-white">Chia sẻ:</span>
      <button type="button" onClick={shareFacebook} aria-label="Chia sẻ bài viết lên Facebook" title="Chia sẻ lên Facebook" className={`w-8 h-8 rounded-full bg-[#1877F2] flex items-center justify-center text-white hover:opacity-80 transition ${focusClass}`}>
        <svg aria-hidden="true" className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
      </button>
      <button type="button" onClick={shareX} aria-label="Chia sẻ bài viết lên X" title="Chia sẻ lên X" className={`w-8 h-8 rounded-full bg-[#1DA1F2] flex items-center justify-center text-white hover:opacity-80 transition ${focusClass}`}>
        <svg aria-hidden="true" className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" /></svg>
      </button>
      <button type="button" onClick={copyLink} aria-label={copyStatus === 'copied' ? 'Đã sao chép liên kết bài viết' : 'Sao chép liên kết bài viết'} title={copyStatus === 'copied' ? 'Đã sao chép' : 'Sao chép liên kết'} className={`w-8 h-8 rounded-full bg-[#111115] border border-[#1a1a1e] flex items-center justify-center text-white hover:bg-[#27272a] transition ${focusClass}`}>
        <svg aria-hidden="true" className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
      </button>
      <span className="sr-only" aria-live="polite">
        {copyStatus === 'copied' ? 'Đã sao chép liên kết bài viết.' : copyStatus === 'failed' ? 'Không thể sao chép liên kết bài viết.' : ''}
      </span>
    </div>
  );
}
