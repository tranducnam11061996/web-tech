import { NextResponse } from 'next/server';
import { getPcBuilderBootstrap } from '@/lib/pcBuilder/service';
import { publicCorsHeaders, publicError, requestId } from '@/lib/publicRequest';

export async function GET(request: Request) {
  const cors = publicCorsHeaders(request, 'GET, OPTIONS');
  try {
    const { data, etag } = await getPcBuilderBootstrap();
    const headers = { ...cors, ETag: etag, 'Cache-Control': 'public, max-age=30, stale-while-revalidate=120', 'X-Request-ID': requestId(request) };
    if (request.headers.get('if-none-match') === etag) return new NextResponse(null, { status: 304, headers });
    return NextResponse.json({ success: true, data }, { headers });
  } catch (error) { return publicError(error, request, cors); }
}

export async function OPTIONS(request: Request) { return new NextResponse(null, { status: 204, headers: publicCorsHeaders(request, 'GET, OPTIONS') }); }
