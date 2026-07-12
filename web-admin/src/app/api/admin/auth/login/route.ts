import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ADMIN_SESSION_COOKIE, AdminAuthError, loginAdmin } from '@/lib/admin/auth';
import { parseJson, PublicRequestError } from '@/lib/publicRequest';
import { consumeRateLimit, RateLimitError, requestIp } from '@/lib/performanceInfrastructure';
import { verifyCustomerCaptcha } from '@/lib/customerRecaptcha';

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(1).max(128),
  recaptchaToken: z.string().max(4096),
}).strict();

function fail(error: unknown) {
  if (error instanceof RateLimitError) return NextResponse.json({ success: false, error: { code: 'RATE_LIMITED', message: error.message } }, { status: 429, headers: { 'Retry-After': String(error.retryAfter) } });
  if (error instanceof PublicRequestError || error instanceof AdminAuthError) return NextResponse.json({ success: false, error: { code: error.code, message: error.message } }, { status: error.status });
  console.error('Admin login failed:', error);
  return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Không thể đăng nhập' } }, { status: 500 });
}

export async function POST(request: Request) {
  try {
    const body = await parseJson(request, schema, 12_000);
    await Promise.all([
      consumeRateLimit({ scope: 'admin_login_ip', key: requestIp(request), limit: 20, windowSeconds: 900, blockSeconds: 900 }),
      consumeRateLimit({ scope: 'admin_login_email', key: body.email, limit: 8, windowSeconds: 900, blockSeconds: 900 }),
      verifyCustomerCaptcha(request, body.recaptchaToken, 'admin_login'),
    ]);
    const session = await loginAdmin(request, body.email, body.password);
    const cookieStore = await cookies();
    cookieStore.set(ADMIN_SESSION_COOKIE, session.token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', expires: session.expiresAt });
    return NextResponse.json({ success: true, data: { user: session.user } });
  } catch (error) { return fail(error); }
}
