import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { CUSTOMER_SESSION_COOKIE, CustomerAuthError, REGISTRATION_COOKIE } from '@/lib/customerAccounts';
import { PublicRequestError } from '@/lib/publicRequest';
import { RateLimitError } from '@/lib/performanceInfrastructure';

export function customerOk(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status, headers: { 'Cache-Control': 'no-store', 'X-Request-ID': crypto.randomUUID() } });
}

export function customerError(error: unknown) {
  const requestId = crypto.randomUUID();
  const headers = { 'Cache-Control': 'no-store', 'X-Request-ID': requestId };
  if (error instanceof RateLimitError) return NextResponse.json({ success: false, error: { code: 'RATE_LIMITED', message: error.message, retryAfter: error.retryAfter, requestId } }, { status: 429, headers: { ...headers, 'Retry-After': String(error.retryAfter) } });
  if (error instanceof PublicRequestError) return NextResponse.json({ success: false, error: { code: error.code, message: error.message, ...(error.fields ? { fields: error.fields } : {}), requestId } }, { status: error.status, headers });
  if (error instanceof CustomerAuthError) return NextResponse.json({ success: false, error: { code: error.code, message: error.message, ...(error.details || {}), requestId } }, { status: error.status, headers });
  console.error(`Customer API failed [${requestId}]:`, error);
  return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Không thể xử lý yêu cầu. Vui lòng thử lại.', requestId } }, { status: 500, headers });
}

const cookieOptions = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/' };
export function setCustomerSession(response: NextResponse, token: string, maxAgeSeconds: number) { response.cookies.set(CUSTOMER_SESSION_COOKIE, token, { ...cookieOptions, maxAge: maxAgeSeconds }); return response; }
export function setCustomerRegistration(response: NextResponse, token: string, maxAgeSeconds: number) { response.cookies.set(REGISTRATION_COOKIE, token, { ...cookieOptions, maxAge: maxAgeSeconds }); return response; }
export function clearCustomerSession(response: NextResponse) { response.cookies.set(CUSTOMER_SESSION_COOKIE, '', { ...cookieOptions, expires: new Date(0) }); return response; }
export function clearCustomerRegistration(response: NextResponse) { response.cookies.set(REGISTRATION_COOKIE, '', { ...cookieOptions, maxAge: 0 }); return response; }
