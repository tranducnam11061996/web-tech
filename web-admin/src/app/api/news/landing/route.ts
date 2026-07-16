import { NextRequest, NextResponse } from 'next/server';
import { jsonWithEtag } from '@/lib/httpCache';
import { loadPublicNewsLanding } from '@/lib/publicNews';
import { publicCorsHeaders, publicError } from '@/lib/publicRequest';
import { loadPcmYoutubeChannel } from '@/lib/youtubeChannelFeed';

const cache = 'public, max-age=0, s-maxage=60, stale-while-revalidate=300';

export async function GET(request: NextRequest) {
  const headers = { ...publicCorsHeaders(request, 'GET, OPTIONS'), 'Cache-Control': cache };
  try {
    const [landing, youtube] = await Promise.all([
      loadPublicNewsLanding(),
      loadPcmYoutubeChannel(),
    ]);
    return jsonWithEtag(request, { data: { ...landing, youtube } }, { headers });
  } catch (error) {
    return publicError(error, request, headers);
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: publicCorsHeaders(request, 'GET, OPTIONS') });
}
