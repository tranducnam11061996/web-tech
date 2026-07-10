import { NextResponse } from 'next/server';
import { AdminAuthError, assertSameOrigin, requireAdminPermission, saveCustomRole } from '@/lib/admin/auth';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(request);
    const actor = await requireAdminPermission(request, 'admin.roles.update');
    const { id } = await context.params;
    const roleId = Number(id);
    if (!Number.isInteger(roleId) || roleId <= 0) throw new AdminAuthError(400, 'INVALID_ROLE', 'Vai tro khong hop le');
    const body = await request.json().catch(() => ({}));
    return NextResponse.json({ success: true, data: await saveCustomRole(body, actor, request, roleId) });
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ success: false, error: { code: error.code, message: error.message } }, { status: error.status });
    console.error('Admin role update failed:', error);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Khong the cap nhat vai tro' } }, { status: 500 });
  }
}
