import { NextRequest, NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '@/lib/admin/auth';
import { getApiPermission, getPagePermission, hasPermission } from '@/lib/admin/permissions';

function apiError(status: number, code: string, message: string) {
  return NextResponse.json({ success: false, error: { code, message } }, { status });
}

function isUnsafeMethod(method: string) {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method);
}

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  return Boolean(origin) && origin === request.nextUrl.origin;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith('/_next/') || pathname === '/favicon.ico') return NextResponse.next();
  if (pathname === '/login') return NextResponse.next();
  if (!pathname.startsWith('/api/admin') && pathname.startsWith('/api/')) return NextResponse.next();

  const isAdminApi = pathname.startsWith('/api/admin');
  if (pathname === '/api/admin/auth/login') {
    if (request.method !== 'POST' || !isSameOrigin(request)) return apiError(403, 'INVALID_ORIGIN', 'Yeu cau khong cung nguon goc');
    return NextResponse.next();
  }

  const session = await getAdminSessionFromRequest(request);
  if (!session) {
    if (isAdminApi) return apiError(401, 'UNAUTHENTICATED', 'Can dang nhap de tiep tuc');
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  const passwordRoute = pathname === '/change-password' || pathname === '/api/admin/auth/password' || pathname === '/api/admin/auth/logout' || pathname === '/api/admin/auth/me';
  if (session.mustChangePassword && !passwordRoute) {
    if (isAdminApi) return apiError(403, 'PASSWORD_CHANGE_REQUIRED', 'Can doi mat khau truoc khi tiep tuc');
    return NextResponse.redirect(new URL('/change-password', request.url));
  }

  if (isAdminApi) {
    if (isUnsafeMethod(request.method) && !isSameOrigin(request)) return apiError(403, 'INVALID_ORIGIN', 'Yeu cau khong cung nguon goc');
    if (pathname.startsWith('/api/admin/auth/')) return NextResponse.next();
    const permission = getApiPermission(pathname, request.method);
    if (!permission || !hasPermission(session.permissions, permission)) return apiError(403, 'FORBIDDEN', 'Ban khong co quyen thuc hien thao tac nay');
    return NextResponse.next();
  }

  const permission = getPagePermission(pathname);
  if (permission && !hasPermission(session.permissions, permission)) return NextResponse.redirect(new URL('/forbidden', request.url));
  return NextResponse.next();
}

// Only admin pages and protected admin APIs need the session/permission proxy.
// Matching all paths makes Turbopack compile this module for every public API,
// static chunk and favicon request during local development.
export const config = {
  matcher: [
    '/',
    '/login',
    '/change-password',
    '/forbidden',
    '/product/:path*',
    '/news/:path*',
    '/content/:path*',
    '/banner/:path*',
    '/sales/:path*',
    '/customers/:path*',
    '/quick-tools/:path*',
    '/system/:path*',
    '/api/admin/:path*',
  ],
};
