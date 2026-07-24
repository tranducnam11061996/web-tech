function normalizedHttpOrigin(value: string | null | undefined) {
  const candidate = String(value || '').trim();
  if (!candidate) return '';
  try {
    const url = new URL(candidate);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : '';
  } catch {
    return '';
  }
}

export function expectedAdminOrigin(request: Request) {
  return normalizedHttpOrigin(process.env.NEXTAUTH_URL) || new URL(request.url).origin;
}

export function isSameAdminOrigin(request: Request) {
  const suppliedOrigin = normalizedHttpOrigin(request.headers.get('origin'));
  return Boolean(suppliedOrigin) && suppliedOrigin === expectedAdminOrigin(request);
}
