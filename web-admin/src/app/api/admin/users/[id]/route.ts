import { NextResponse } from 'next/server';
import { AdminAuthError, assertSameOrigin, requireAdminPermission, updateAdminUser } from '@/lib/admin/auth';

type UserRouteContext = { params: Promise<{ id: string }> };

function userIdFromParams(params: Promise<{ id: string }>) {
  return params.then(({ id }) => Number(id));
}

function fail(error: unknown) {
  if (error instanceof AdminAuthError) return NextResponse.json({ success: false, error: { code: error.code, message: error.message } }, { status: error.status });
  console.error('Admin user update failed:', error);
  return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Khong the cap nhat tai khoan admin' } }, { status: 500 });
}

export async function PATCH(request: Request, context: UserRouteContext) {
  try {
    assertSameOrigin(request);
    const actor = await requireAdminPermission(request, 'admin.users.update');
    const id = await userIdFromParams(context.params);
    if (!Number.isInteger(id) || id <= 0) throw new AdminAuthError(400, 'INVALID_USER', 'Tai khoan khong hop le');
    const body = await request.json().catch(() => ({}));
    return NextResponse.json({ success: true, data: await updateAdminUser(id, body, actor, request) });
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE(request: Request, context: UserRouteContext) {
  try {
    assertSameOrigin(request);
    const actor = await requireAdminPermission(request, 'admin.users.delete');
    const id = await userIdFromParams(context.params);
    if (!Number.isInteger(id) || id <= 0) throw new AdminAuthError(400, 'INVALID_USER', 'Tai khoan khong hop le');
    return NextResponse.json({ success: true, data: await updateAdminUser(id, { status: false }, actor, request) });
  } catch (error) {
    return fail(error);
  }
}
