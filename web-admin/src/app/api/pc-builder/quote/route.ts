import { NextResponse } from 'next/server';
import { pcBuilderQuoteRequestSchema } from '@/lib/pcBuilder/types';
import { assertPcBuilderFeature, buildPcBuilderQuote } from '@/lib/pcBuilder/service';
import { assertPublicOrigin, parseJson, publicCorsHeaders, publicError, requestId } from '@/lib/publicRequest';
import { consumeRateLimit, requestIp } from '@/lib/performanceInfrastructure';

export async function POST(request: Request) {
  const cors = publicCorsHeaders(request, 'POST, OPTIONS');
  try {
    assertPublicOrigin(request);
    assertPcBuilderFeature();
    const body = await parseJson(request, pcBuilderQuoteRequestSchema, 24_000);
    await consumeRateLimit({ scope: 'pc_builder_quote_ip', key: requestIp(request), limit: 120, windowSeconds: 60, blockSeconds: 60 });
    const data = await buildPcBuilderQuote(body.selections, { assemblyRequired: body.assemblyRequired });
    return NextResponse.json({ success: true, data }, { headers: { ...cors, 'Cache-Control': 'no-store', 'X-Request-ID': requestId(request) } });
  } catch (error) { return publicError(error, request, cors); }
}
export async function OPTIONS(request: Request) { return new NextResponse(null, { status: 204, headers: publicCorsHeaders(request, 'POST, OPTIONS') }); }
