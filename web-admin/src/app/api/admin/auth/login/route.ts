import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { AdminAuthError, loginAdmin } from '@/lib/admin/auth';

function fail(error: unknown) {
  if (error instanceof AdminAuthError) {
    return NextResponse.json({ success: false, error: { code: error.code, message: error.message } }, { status: error.status });
  }
  console.error('Admin login failed:', error);
  return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Khong the dang nhap' } }, { status: 500 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const session = await loginAdmin(request, body.email, body.password);
    const cookieStore = await cookies();
    cookieStore.set('admin_session', session.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      expires: session.expiresAt,
    });
    return NextResponse.json({ success: true, data: { user: session.user } });
  } catch (error) {
    return fail(error);
  }
}
