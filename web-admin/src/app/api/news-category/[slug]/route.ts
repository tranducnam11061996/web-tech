import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = (page - 1) * limit;

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

    // 2. Fetch total count
    const [countRows] = await pool.query(
      `SELECT COUNT(DISTINCT n.id) as total
       FROM idv_seller_news n
       LEFT JOIN idv_article_category ac ON ac.news_id = n.id
       WHERE n.catId = ? OR ac.category_id = ?`,
      [category.id, category.id]
    );
    const totalNews = (countRows as any[])[0].total;

    // 3. Fetch articles for this category
    const [newsRows] = await pool.query(
      `SELECT DISTINCT n.id, n.title, n.url, n.thumnail, n.summary, n.createDate, n.visit, n.createBy
       FROM idv_seller_news n
       LEFT JOIN idv_article_category ac ON ac.news_id = n.id
       WHERE n.catId = ? OR ac.category_id = ?
       ORDER BY n.createDate DESC
       LIMIT ? OFFSET ?`,
      [category.id, category.id, limit, offset]
    );

    const response = NextResponse.json({ 
      data: category,
      news: newsRows,
      totalNews: totalNews
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
