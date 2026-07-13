import { NextRequest, NextResponse } from 'next/server';

const reserved = new Set([
  '', '__catalog-not-found', 'category', 'gio-hang', 'gio-hang-combo', 'tai-khoan',
  'thanh-toan', 'thanh-toan-combo', 'tim', 'tin-tuc', 'collection',
]);

export async function proxy(request: NextRequest) {
  const slug = decodeURIComponent(request.nextUrl.pathname.replace(/^\/+|\/+$/g, ''));
  if (!slug || slug.includes('/') || reserved.has(slug)) return NextResponse.next();
  const apiBase = (process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/+$/, '');
  try {
    const response = await fetch(`${apiBase}/api/categories/route-status?slug=${encodeURIComponent(slug)}`, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    });
    if (response.status === 404) {
      return NextResponse.rewrite(new URL('/__catalog-not-found', request.url), { status: 404 });
    }
  } catch {
    // The page's normal API error handling remains authoritative during an API outage.
  }
  return NextResponse.next();
}

export const config = { matcher: '/:slug' };
