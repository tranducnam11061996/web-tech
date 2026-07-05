import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    // 1. Fetch category info
    const [catRows] = await pool.query(
      `SELECT * FROM idv_seller_news_category WHERE url = ?`,
      [slug]
    );

    if ((catRows as any[]).length === 0) {
      const notFoundRes = NextResponse.json({ error: 'Danh mục không tồn tại' }, { status: 404 });
      notFoundRes.headers.set('Access-Control-Allow-Origin', '*');
      return notFoundRes;
    }

    const category = (catRows as any[])[0];

    // 2. Fetch articles for this category
    const [newsRows] = await pool.query(
      `SELECT id, title, url, thumnail, summary, createDate, visit, createBy 
       FROM idv_seller_news 
       WHERE catId = ? OR article_category LIKE ? 
       ORDER BY createDate DESC 
       LIMIT 20`,
      [category.id, `%${category.id}%`]
    );

    const response = NextResponse.json({ 
      data: category,
      news: newsRows
    });
    
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
  } catch (error) {
    console.error("API Error fetching category:", error);
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
