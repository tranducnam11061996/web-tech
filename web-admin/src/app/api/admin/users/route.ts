import { NextResponse } from 'next/server';
import { AdminAuthError, assertSameOrigin, createAdminUser, listAdminUsers, requireAdminPermission } from '@/lib/admin/auth';

function fail(error: unknown) {
  if (error instanceof AdminAuthError) {
    return NextResponse.json({ success: false, error: { code: error.code, message: error.message } }, { status: error.status });
  }
  console.error('Admin users API failed:', error);
  return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Khong the xu ly tai khoan admin' } }, { status: 500 });
}

export async function GET(request: Request) {
  try {
    await requireAdminPermission(request, 'admin.users.read');
    return NextResponse.json({ success: true, data: await listAdminUsers() });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requireAdminPermission(request, 'admin.users.create');
    const body = await request.json().catch(() => ({}));
    return NextResponse.json({ success: true, data: await createAdminUser(body, actor, request) }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
