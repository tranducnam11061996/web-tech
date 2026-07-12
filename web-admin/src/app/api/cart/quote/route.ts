import { NextResponse } from 'next/server';
import { buildCartQuote } from '@/lib/cart-quote';
import { cartQuoteSchema } from '@/lib/commerceValidation';
import { assertPublicOrigin, parseJson, publicCorsHeaders, publicError, requestId } from '@/lib/publicRequest';
import { consumeRateLimit, requestIp } from '@/lib/performanceInfrastructure';

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: publicCorsHeaders(request, 'POST, OPTIONS') });
}

export async function POST(request: Request) {
  const headers = publicCorsHeaders(request, 'POST, OPTIONS');
  const id = requestId(request);
  try {
    assertPublicOrigin(request);
    const body = await parseJson(request, cartQuoteSchema, 24_000);
    await consumeRateLimit({ scope: 'cart_quote_ip', key: requestIp(request), limit: 180, windowSeconds: 60, blockSeconds: 60 });
    const quote = await buildCartQuote(body.items, { voucherCode: body.voucherCode });
    return NextResponse.json({ success: true, data: quote }, { headers: { ...headers, 'X-Request-ID': id, 'Cache-Control': 'no-store' } });
  } catch (error) {
    return publicError(error, request, headers);
  }
}
