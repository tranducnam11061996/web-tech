import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { z, type ZodType } from 'zod';
import { RateLimitError } from '@/lib/performanceInfrastructure';

export class PublicRequestError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string>,
  ) { super(message); }
}

export function requestId(request: Request) {
  const supplied = String(request.headers.get('x-request-id') || '').trim();
  return /^[a-zA-Z0-9._:-]{8,100}$/.test(supplied) ? supplied : crypto.randomUUID();
}

function configuredOrigins() {
  return [process.env.STOREFRONT_ORIGIN, process.env.STOREFRONT_ORIGINS]
    .filter(Boolean).flatMap((value) => String(value).split(','))
    .map((value) => value.trim().replace(/\/$/, '')).filter(Boolean);
}

export function publicCorsHeaders(request: Request, methods: string) {
  const origin = String(request.headers.get('origin') || '').replace(/\/$/, '');
  const url = new URL(request.url);
  const localOrigin = /^http:\/\/(localhost|127\.0\.0\.1):3001$/.test(origin);
  const allowed = origin && (configuredOrigins().includes(origin) || (['localhost', '127.0.0.1'].includes(url.hostname) && localOrigin));
  return {
    ...(allowed ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}),
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type, Idempotency-Key, X-Request-ID',
    'Access-Control-Max-Age': '600',
  };
}

export function assertPublicOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return;
  if (!publicCorsHeaders(request, request.method)['Access-Control-Allow-Origin']) {
    throw new PublicRequestError(403, 'INVALID_ORIGIN', 'Nguồn gửi yêu cầu không được phép.');
  }
}

export async function parseJson<T>(request: Request, schema: ZodType<T>, maxBytes = 32_768): Promise<T> {
  const contentType = String(request.headers.get('content-type') || '').toLowerCase();
  if (!contentType.startsWith('application/json')) throw new PublicRequestError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Yêu cầu phải dùng application/json.');
  const declared = Number(request.headers.get('content-length') || 0);
  if (declared > maxBytes) throw new PublicRequestError(413, 'PAYLOAD_TOO_LARGE', 'Dữ liệu gửi lên quá lớn.');
  const raw = await request.text();
  if (Buffer.byteLength(raw, 'utf8') > maxBytes) throw new PublicRequestError(413, 'PAYLOAD_TOO_LARGE', 'Dữ liệu gửi lên quá lớn.');
  let json: unknown;
  try { json = JSON.parse(raw); } catch { throw new PublicRequestError(400, 'INVALID_JSON', 'Dữ liệu JSON không hợp lệ.'); }
  const result = schema.safeParse(json);
  if (!result.success) {
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) fields[issue.path.join('.') || 'body'] = issue.message;
    throw new PublicRequestError(400, 'VALIDATION_ERROR', 'Vui lòng kiểm tra lại thông tin đã nhập.', fields);
  }
  return result.data;
}

export function publicError(error: unknown, request: Request, extraHeaders: Record<string, string> = {}) {
  const id = requestId(request);
  if (error instanceof RateLimitError) {
    return NextResponse.json(
      { success: false, error: { code: 'RATE_LIMITED', message: error.message, requestId: id } },
      { status: 429, headers: { ...extraHeaders, 'Retry-After': String(error.retryAfter), 'X-Request-ID': id } },
    );
  }
  if (error instanceof PublicRequestError) {
    return NextResponse.json(
      { success: false, error: { code: error.code, message: error.message, ...(error.fields ? { fields: error.fields } : {}), requestId: id } },
      { status: error.status, headers: { ...extraHeaders, 'X-Request-ID': id } },
    );
  }
  const shaped = error as { status?: number; statusCode?: number; code?: string; message?: string; fields?: Record<string, string> } | null;
  const shapedStatus = Number(shaped?.status || shaped?.statusCode || 0);
  if (shapedStatus >= 400 && shapedStatus < 500) {
    return NextResponse.json(
      { success: false, error: { code: shaped?.code || 'BAD_REQUEST', message: shaped?.message || 'Yêu cầu không hợp lệ.', ...(shaped?.fields ? { fields: shaped.fields } : {}), requestId: id } },
      { status: shapedStatus, headers: { ...extraHeaders, 'X-Request-ID': id } },
    );
  }
  console.error(`[public-api:${id}]`, error);
  return NextResponse.json(
    { success: false, error: { code: 'INTERNAL_ERROR', message: 'Không thể xử lý yêu cầu. Vui lòng thử lại.', requestId: id } },
    { status: 500, headers: { ...extraHeaders, 'X-Request-ID': id } },
  );
}

export const emptyObjectSchema = z.object({}).passthrough();
