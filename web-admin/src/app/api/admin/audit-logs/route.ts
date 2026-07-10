import { NextResponse } from 'next/server';
import { AdminAuthError, listAdminAuditLogs, requireAdminPermission } from '@/lib/admin/auth';

export async function GET(request: Request) {
  try {
    await requireAdminPermission(request, 'admin.audit_logs.read');
    const limit = Number(new URL(request.url).searchParams.get('limit') || 100);
    return NextResponse.json({ success: true, data: await listAdminAuditLogs(limit) });
  } catch (error) {
    if (error instanceof AdminAuthError) return NextResponse.json({ success: false, error: { code: error.code, message: error.message } }, { status: error.status });
    console.error('Admin audit API failed:', error);
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Khong the tai nhat ky admin' } }, { status: 500 });
  }
}
