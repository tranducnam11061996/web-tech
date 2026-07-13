const LEGACY_NEWS_MEDIA = 'https://hacom.vn/media/news/';

function apiOrigin() {
  const configured = process.env.PUBLIC_API_URL || process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  try { return new URL(configured).origin; } catch { return 'http://localhost:3000'; }
}

export function resolveNewsImageUrl(value: unknown) {
  const raw = String(value || '').trim().replace(/\\/g, '/');
  if (!raw || raw === '0') return '';
  if (/^https:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      return parsed.username || parsed.password ? '' : parsed.toString();
    } catch { return ''; }
  }
  if (/^http:\/\//i.test(raw) || raw.startsWith('//') || /^data:/i.test(raw)) return '';
  if (raw.startsWith('/api/media/')) return `${apiOrigin()}${raw}`;
  if (raw.startsWith('/media/')) return `${apiOrigin()}/api${raw}`;
  if (raw.startsWith('/')) return `${apiOrigin()}${raw}`;
  return `${LEGACY_NEWS_MEDIA}${raw.replace(/^\/+/, '')}`;
}
