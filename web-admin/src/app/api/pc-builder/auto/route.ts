import { NextResponse } from 'next/server';
import { pcBuilderAutoRequestSchema } from '@/lib/pcBuilder/types';
import { assertPcBuilderFeature, buildAutomaticGamingPcs } from '@/lib/pcBuilder/service';
import { assertPublicOrigin, parseJson, publicCorsHeaders, publicError, requestId } from '@/lib/publicRequest';
import { consumeRateLimit, requestIp } from '@/lib/performanceInfrastructure';

export async function POST(request: Request) {
  const cors = publicCorsHeaders(request, 'POST, OPTIONS');
  try {
    assertPublicOrigin(request);
    assertPcBuilderFeature(true);
    const body = await parseJson(request, pcBuilderAutoRequestSchema, 16_000);
    await consumeRateLimit({ scope: 'pc_builder_auto_ip', key: requestIp(request), limit: 20, windowSeconds: 60, blockSeconds: 120 });
    const data = await buildAutomaticGamingPcs({ ...body, cpuBrandIds: body.cpuBrandIds || [], gpuBrandIds: body.gpuBrandIds || [] });
    return NextResponse.json({ success: true, data }, { headers: { ...cors, 'Cache-Control': 'no-store', 'X-Request-ID': requestId(request) } });
  } catch (error) { return publicError(error, request, cors); }
}
export async function OPTIONS(request: Request) { return new NextResponse(null, { status: 204, headers: publicCorsHeaders(request, 'POST, OPTIONS') }); }
