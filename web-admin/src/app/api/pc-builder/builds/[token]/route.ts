import { NextResponse } from 'next/server';
import { assertPcBuilderFeature, getSharedPcBuild } from '@/lib/pcBuilder/service';
import { publicCorsHeaders, publicError, requestId } from '@/lib/publicRequest';

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const cors = publicCorsHeaders(request, 'GET, OPTIONS');
  try {
    assertPcBuilderFeature();
    const { token } = await context.params;
    const data = await getSharedPcBuild(token);
    return NextResponse.json({ success: true, data }, { headers: { ...cors, 'Cache-Control': 'no-store', 'X-Request-ID': requestId(request) } });
  } catch (error) { return publicError(error, request, cors); }
}
export async function OPTIONS(request: Request) { return new NextResponse(null, { status: 204, headers: publicCorsHeaders(request, 'GET, OPTIONS') }); }
