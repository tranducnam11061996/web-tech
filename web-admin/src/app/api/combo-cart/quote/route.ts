import { NextResponse } from 'next/server';
import { buildComboQuote, comboQuoteSchema } from '@/lib/comboSets';
import { assertPublicOrigin, parseJson, publicCorsHeaders, publicError, requestId } from '@/lib/publicRequest';
import { consumeRateLimit, requestIp } from '@/lib/performanceInfrastructure';

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: publicCorsHeaders(request, 'POST, OPTIONS') });
}

export async function POST(request: Request) {
  const headers = publicCorsHeaders(request, 'POST, OPTIONS');
  try {
    assertPublicOrigin(request);
    const body = await parseJson(request, comboQuoteSchema, 24_000);
    await consumeRateLimit({ scope: 'combo_quote_ip', key: requestIp(request), limit: 180, windowSeconds: 60, blockSeconds: 60 });
    const data = await buildComboQuote(body);
    return NextResponse.json({ success: true, data }, { headers: { ...headers, 'X-Request-ID': requestId(request), 'Cache-Control': 'no-store' } });
  } catch (error) {
    return publicError(error, request, headers);
  }
}
