import { NextResponse } from 'next/server';
import { AdminAuthError, assertSameOrigin, requireAdminPermission, resetAdminPassword } from '@/lib/admin/auth';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const actor = await requireAdminPermission(request, 'admin.users.update');
    const { id } = await context.params;
    const userId = Number(id);
    if (!Number.isInteger(userId) || userId <= 0) throw new AdminAuthError(400, 'INVALID_USER', 'Tai khoan khong hop le');
    const body = await request.json().catch(() => ({}));
    await resetAdminPassword(userId, body.password, actor, request);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ success: false, error: { code: error.code, message: error.message } }, { status: error.status });
    console.error('Admin password reset failed:', error);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Khong the dat lai mat khau' } }, { status: 500 });
  }
}
