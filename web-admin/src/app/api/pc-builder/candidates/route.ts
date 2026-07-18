import { NextResponse } from 'next/server';
import { pcBuilderCandidateRequestSchema } from '@/lib/pcBuilder/types';
import { assertPcBuilderFeature, listPcBuilderCandidates } from '@/lib/pcBuilder/service';
import { assertPublicOrigin, parseJson, publicCorsHeaders, publicError, requestId } from '@/lib/publicRequest';
import { consumeRateLimit, requestIp } from '@/lib/performanceInfrastructure';

export async function POST(request: Request) {
  const cors = publicCorsHeaders(request, 'POST, OPTIONS');
  try {
    assertPublicOrigin(request);
    assertPcBuilderFeature();
    const body = await parseJson(request, pcBuilderCandidateRequestSchema, 24_000);
    await consumeRateLimit({ scope: 'pc_builder_candidates_ip', key: requestIp(request), limit: 180, windowSeconds: 60, blockSeconds: 60 });
    const data = await listPcBuilderCandidates({
      ...body,
      selections: body.selections || [], cursor: body.cursor || 0, limit: body.limit || 24,
      query: body.query || '', brandIds: body.brandIds || [],
    });
    return NextResponse.json({ success: true, data }, { headers: { ...cors, 'Cache-Control': 'no-store', 'X-Request-ID': requestId(request) } });
  } catch (error) { return publicError(error, request, cors); }
}
export async function OPTIONS(request: Request) { return new NextResponse(null, { status: 204, headers: publicCorsHeaders(request, 'POST, OPTIONS') }); }
