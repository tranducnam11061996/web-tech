import { NextRequest, NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  const slug = String(request.nextUrl.searchParams.get('slug') || '').trim();
  if (!slug || slug.length > 180 || slug.includes('/') || slug.includes('\\')) {
    return NextResponse.json({ success: false, message: 'Invalid category path' }, { status: 400 });
  }
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT c.status
       FROM idv_url u
       JOIN idv_seller_category c
         ON u.id_path=CONCAT('module:product/view:category/view_id:',c.id)
      WHERE u.request_path=?
      LIMIT 1`,
    [`/${slug}`],
  );
  if (!rows.length) return new NextResponse(null, { status: 204 });
  if (Number(rows[0].status) !== 1) return NextResponse.json({ success: false, message: 'Category not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
