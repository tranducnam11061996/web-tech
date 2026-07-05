import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const [rows] = await pool.query(
      `SELECT n.*, c.name as category_name, nc.content 
       FROM idv_seller_news n 
       LEFT JOIN idv_seller_news_category c ON n.catId = c.id 
       LEFT JOIN idv_seller_news_content nc ON n.id = nc.id
       WHERE n.url = ?`, 
      [slug]
    );
    
    if ((rows as any[]).length === 0) {
      const notFoundRes = NextResponse.json({ error: 'Bài viết không tồn tại' }, { status: 404 });
      notFoundRes.headers.set('Access-Control-Allow-Origin', '*');
      return notFoundRes;
    }

    const response = NextResponse.json({ data: (rows as any[])[0] });
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
  } catch (error) {
    console.error("API Error fetching news:", error);
    const errResponse = NextResponse.json({ error: 'Lỗi máy chủ' }, { status: 500 });
    errResponse.headers.set('Access-Control-Allow-Origin', '*');
    return errResponse;
  }
}

export async function OPTIONS(request: NextRequest) {
  const response = new NextResponse(null, { status: 204 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  return response;
}
