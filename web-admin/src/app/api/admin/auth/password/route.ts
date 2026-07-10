import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { AdminAuthError, assertSameOrigin, changeOwnPassword } from '@/lib/admin/auth';

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await request.json().catch(() => ({}));
    await changeOwnPassword(request, body.currentPassword, body.newPassword);
    const cookieStore = await cookies();
    cookieStore.set('admin_session', '', { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 0 });
    return NextResponse.json({ success: true, message: 'Da doi mat khau. Vui long dang nhap lai.' });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ success: false, error: { code: error.code, message: error.message } }, { status: error.status });
    }
    console.error('Admin password change failed:', error);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Khong the doi mat khau' } }, { status: 500 });
  }
}
