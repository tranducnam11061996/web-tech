import { NextResponse } from 'next/server';
import { AdminAuthError, assertSameOrigin, listAdminRoles, requireAdminPermission, saveCustomRole } from '@/lib/admin/auth';

function fail(error: unknown) {
  if (error instanceof AdminAuthError) return NextResponse.json({ success: false, error: { code: error.code, message: error.message } }, { status: error.status });
  console.error('Admin roles API failed:', error);
  return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Khong the xu ly vai tro' } }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    await requireAdminPermission(request, 'admin.roles.read');
    return NextResponse.json({ success: true, data: await listAdminRoles() });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requireAdminPermission(request, 'admin.roles.create');
    const body = await request.json().catch(() => ({}));
    return NextResponse.json({ success: true, data: await saveCustomRole(body, actor, request) }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
