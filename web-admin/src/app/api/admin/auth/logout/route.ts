import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, logoutAdmin } from '@/lib/admin/auth';

export async function POST(request: Request) {
  await logoutAdmin(request);
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 });
  return NextResponse.json({ success: true });
}
