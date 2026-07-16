import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  insertPageViewEvent,
  normalizePageViewPath,
  pageViewSourceMatches,
  pageViewTrackingEnabled,
  resolvePageViewEntity,
} from '@/lib/pageViews';
import {
  PublicRequestError,
  assertPublicOrigin,
  parseJson,
  publicCorsHeaders,
  publicError,
} from '@/lib/publicRequest';
import {
  consumeRateLimits,
  rateLimitSetting,
  requestIp,
} from '@/lib/performanceInfrastructure';
import { recordRouteMetric } from '@/lib/runtimeMetrics';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  eventId: z.string().regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    'eventId khong hop le.',
  ),
  path: z.string().min(2).max(300),
}).strict();

function assertPageViewSource(request: Request, path: string) {
  const origin = String(request.headers.get('origin') || '').replace(/\/$/, '');
  if (!origin) throw new PublicRequestError(403, 'INVALID_ORIGIN', 'Nguon gui yeu cau khong duoc phep.');
  assertPublicOrigin(request);

  if (!pageViewSourceMatches({
    origin,
    referer: request.headers.get('referer'),
    fetchSite: request.headers.get('sec-fetch-site'),
    path,
  })) throw new PublicRequestError(403, 'INVALID_REFERER', 'Trang gui yeu cau khong hop le.');
}

function responseHeaders(request: Request) {
  return {
    ...publicCorsHeaders(request, 'POST, OPTIONS'),
    'Cache-Control': 'no-store',
  };
}

export async function POST(request: NextRequest) {
  const startedAt = performance.now();
  const headers = responseHeaders(request);
  try {
    const body = await parseJson(request, bodySchema, 512);
    const path = normalizePageViewPath(body.path);
    if (!path) throw new PublicRequestError(400, 'INVALID_PATH', 'Duong dan khong hop le.');
    assertPageViewSource(request, path);

    if (!pageViewTrackingEnabled()) {
      recordRouteMetric('POST /api/page-views', performance.now() - startedAt, 202);
      return NextResponse.json(
        { success: true, data: { accepted: false, disabled: true } },
        { status: 202, headers },
      );
    }

    const ip = requestIp(request);
    await consumeRateLimits([
      {
        scope: 'page_view_ip',
        key: ip,
        limit: rateLimitSetting('RATE_LIMIT_PAGE_VIEW_IP', 300),
        windowSeconds: 60,
        blockSeconds: 60,
      },
      {
        scope: 'page_view_ip_path',
        key: `${ip}:${path}`,
        limit: rateLimitSetting('RATE_LIMIT_PAGE_VIEW_IP_PATH', 120),
        windowSeconds: 60,
        blockSeconds: 60,
      },
    ]);

    const entity = await resolvePageViewEntity(path);
    if (!entity) throw new PublicRequestError(404, 'PAGE_NOT_FOUND', 'Trang khong ton tai.');
    await insertPageViewEvent(body.eventId, entity);
    recordRouteMetric('POST /api/page-views', performance.now() - startedAt, 202);
    return NextResponse.json({ success: true, data: { accepted: true } }, { status: 202, headers });
  } catch (error) {
    const response = publicError(error, request, headers);
    recordRouteMetric('POST /api/page-views', performance.now() - startedAt, response.status);
    return response;
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: responseHeaders(request) });
}
