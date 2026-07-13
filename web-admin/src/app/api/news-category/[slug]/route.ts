import { NextRequest, NextResponse } from 'next/server';
import { jsonWithEtag } from '@/lib/httpCache';
import { loadPublicNewsCategory } from '@/lib/publicNews';
import { PublicRequestError, publicCorsHeaders, publicError } from '@/lib/publicRequest';

const cache = 'public, max-age=0, s-maxage=60, stale-while-revalidate=300';

function query(request: NextRequest) {
  const page = Number(request.nextUrl.searchParams.get('page') || 1);
  const limit = Number(request.nextUrl.searchParams.get('limit') || 20);
  if (!Number.isInteger(page) || page < 1 || page > 1_000) throw new PublicRequestError(400, 'INVALID_PAGE', 'Trang không hợp lệ.');
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new PublicRequestError(400, 'INVALID_LIMIT', 'Giới hạn không hợp lệ.');
  return { page, limit };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const headers = { ...publicCorsHeaders(request, 'GET, OPTIONS'), 'Cache-Control': cache };
  try {
    const { slug } = await params;
    if (!slug || slug.length > 250) throw new PublicRequestError(404, 'NEWS_CATEGORY_NOT_FOUND', 'Danh mục không tồn tại.');
    const result = await loadPublicNewsCategory(slug, query(request));
    if (!result) throw new PublicRequestError(404, 'NEWS_CATEGORY_NOT_FOUND', 'Danh mục không tồn tại.');
    return jsonWithEtag(request, result, { headers });
  } catch (error) {
    return publicError(error, request, headers);
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: publicCorsHeaders(request, 'GET, OPTIONS') });
}
