'use client';

import { useEffect, useState } from 'react';

export default function PageViewTracker({ path }: { path: string }) {
  const [eventId] = useState(() => globalThis.crypto.randomUUID());

  useEffect(() => {
    void fetch('/api/page-views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      cache: 'no-store',
      keepalive: true,
      body: JSON.stringify({ eventId, path }),
    }).catch(() => {
      // View tracking is intentionally best-effort and must never block the page.
    });
  }, [eventId, path]);

  return null;
}
