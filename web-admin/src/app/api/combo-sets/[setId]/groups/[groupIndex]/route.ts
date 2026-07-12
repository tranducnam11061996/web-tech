import { NextResponse } from 'next/server';
import { getPublicComboGroup } from '@/lib/comboSets';
import { PublicRequestError, publicCorsHeaders, publicError, requestId } from '@/lib/publicRequest';
import { withPublicProductResponseCache } from '@/lib/publicProductCache';

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: publicCorsHeaders(request, 'GET, OPTIONS') });
}

export async function GET(request: Request, context: { params: Promise<{ setId: string; groupIndex: string }> }) {
  const headers = publicCorsHeaders(request, 'GET, OPTIONS');
  try {
    const { setId: rawSetId, groupIndex: rawGroupIndex } = await context.params;
    const url = new URL(request.url);
    const setId = Number(rawSetId);
    const groupIndex = Number(rawGroupIndex);
    const anchorProductId = Number(url.searchParams.get('anchorProductId'));
    const revision = String(url.searchParams.get('revision') || '');
    const query = String(url.searchParams.get('q') || '').trim().slice(0, 100);
    const page = Math.max(1, Number(url.searchParams.get('page') || 1));
    const limit = Math.min(48, Math.max(1, Number(url.searchParams.get('limit') || 24)));
    if (!Number.isInteger(setId) || setId <= 0 || !Number.isInteger(groupIndex) || groupIndex < 0 || !Number.isInteger(anchorProductId) || anchorProductId <= 0 || revision.length < 8) {
      throw new PublicRequestError(400, 'VALIDATION_ERROR', 'Tham số nhóm combo không hợp lệ.');
    }
    const cacheKey = `combo-set:${setId}:${groupIndex}:${anchorProductId}:${revision}:${query}:${page}:${limit}`;
    const data = await withPublicProductResponseCache(cacheKey, () => getPublicComboGroup({ setId, groupIndex, anchorProductId, revision, query, page, limit }));
    return NextResponse.json({ success: true, data }, { headers: { ...headers, 'X-Request-ID': requestId(request), 'Cache-Control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300' } });
  } catch (error) {
    return publicError(error, request, headers);
  }
}
