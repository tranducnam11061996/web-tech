import { NextResponse } from 'next/server';
import { pcBuilderSaveSchema } from '@/lib/pcBuilder/types';
import { assertPcBuilderFeature, savePcBuild } from '@/lib/pcBuilder/service';
import { assertPublicOrigin, parseJson, publicCorsHeaders, publicError, requestId } from '@/lib/publicRequest';
import { consumeRateLimit, requestIp } from '@/lib/performanceInfrastructure';

export async function POST(request: Request) {
  const cors = publicCorsHeaders(request, 'POST, OPTIONS');
  try {
    assertPublicOrigin(request);
    assertPcBuilderFeature();
    const body = await parseJson(request, pcBuilderSaveSchema, 32_000);
    await consumeRateLimit({ scope: 'pc_builder_share_ip', key: requestIp(request), limit: 20, windowSeconds: 3600, blockSeconds: 300 });
    const data = await savePcBuild({ ...body, mode: body.mode || 'manual', input: body.input || {} }, null);
    return NextResponse.json({ success: true, data }, { status: 201, headers: { ...cors, 'Cache-Control': 'no-store', 'X-Request-ID': requestId(request) } });
  } catch (error) { return publicError(error, request, cors); }
}
export async function OPTIONS(request: Request) { return new NextResponse(null, { status: 204, headers: publicCorsHeaders(request, 'POST, OPTIONS') }); }
