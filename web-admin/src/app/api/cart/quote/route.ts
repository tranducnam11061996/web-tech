import { NextResponse } from 'next/server';
import { buildCartQuote } from '@/lib/cart-quote';
import { cartQuoteSchema } from '@/lib/commerceValidation';
import { assertPublicOrigin, parseJson, publicCorsHeaders, publicError, requestId } from '@/lib/publicRequest';
import { consumeRateLimit, rateLimitSetting, requestIp } from '@/lib/performanceInfrastructure';
import { recordRouteMetric } from '@/lib/runtimeMetrics';

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: publicCorsHeaders(request, 'POST, OPTIONS') });
}

export async function POST(request: Request) {
  const startedAt = performance.now();
  const headers = publicCorsHeaders(request, 'POST, OPTIONS');
  const id = requestId(request);
  try {
    assertPublicOrigin(request);
    const body = await parseJson(request, cartQuoteSchema, 24_000);
    await consumeRateLimit({ scope: 'cart_quote_ip', key: requestIp(request), limit: rateLimitSetting('RATE_LIMIT_CART_QUOTE_IP', 180), windowSeconds: 60, blockSeconds: 60 });
    const quote = await buildCartQuote(body.items, { voucherCode: body.voucherCode });
    const duration = performance.now() - startedAt;
    recordRouteMetric('POST /api/cart/quote', duration, 200);
    return NextResponse.json({ success: true, data: quote }, { headers: { ...headers, 'X-Request-ID': id, 'Cache-Control': 'no-store', 'Server-Timing': `app;dur=${duration.toFixed(1)}` } });
  } catch (error) {
    const response = publicError(error, request, headers);
    recordRouteMetric('POST /api/cart/quote', performance.now() - startedAt, response.status);
    return response;
  }
}
