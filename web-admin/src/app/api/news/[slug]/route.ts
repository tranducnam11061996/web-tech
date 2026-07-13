import { NextRequest, NextResponse } from 'next/server';
import { jsonWithEtag } from '@/lib/httpCache';
import { loadPublicNewsArticle } from '@/lib/publicNews';
import { PublicRequestError, publicCorsHeaders, publicError } from '@/lib/publicRequest';

const cache = 'public, max-age=0, s-maxage=60, stale-while-revalidate=300';

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const headers = { ...publicCorsHeaders(request, 'GET, OPTIONS'), 'Cache-Control': cache };
  try {
    const { slug } = await params;
    if (!slug || slug.length > 250) throw new PublicRequestError(404, 'NEWS_NOT_FOUND', 'Bài viết không tồn tại.');
    const article = await loadPublicNewsArticle(slug);
    if (!article) throw new PublicRequestError(404, 'NEWS_NOT_FOUND', 'Bài viết không tồn tại.');
    return jsonWithEtag(request, { data: article }, { headers });
  } catch (error) {
    return publicError(error, request, headers);
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: publicCorsHeaders(request, 'GET, OPTIONS') });
}
