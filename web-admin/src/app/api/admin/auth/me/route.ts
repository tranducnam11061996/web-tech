import { NextResponse } from 'next/server';
import { AdminAuthError, requireAdminSession } from '@/lib/admin/auth';

export async function GET(request: Request) {
  try {
    return NextResponse.json({ success: true, data: await requireAdminSession(request, true) });
  } catch (error) {
    if (error instanceof AdminAuthError) {
      return NextResponse.json({ success: false, error: { code: error.code, message: error.message } }, { status: error.status });
    }
    return NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Khong the tai phien dang nhap' } }, { status: 500 });
  }
}
