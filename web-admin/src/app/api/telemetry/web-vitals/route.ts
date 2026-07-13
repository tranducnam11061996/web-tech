import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertPublicOrigin, parseJson, publicCorsHeaders, publicError } from '@/lib/publicRequest';

const vitalSchema = z.object({
  name: z.enum(['CLS', 'FCP', 'INP', 'LCP', 'TTFB']),
  value: z.number().finite().min(0).max(3_600_000),
  rating: z.enum(['good', 'needs-improvement', 'poor']),
  navigationType: z.string().trim().max(32),
}).strict();

const bodySchema = z.object({
  metrics: z.array(vitalSchema).min(1).max(5),
  page: z.enum(['home', 'product', 'category', 'search', 'cart', 'checkout', 'account', 'other']),
}).strict();

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: publicCorsHeaders(request, 'POST, OPTIONS') });
}

export async function POST(request: Request) {
  const cors = publicCorsHeaders(request, 'POST, OPTIONS');
  try {
    assertPublicOrigin(request);
    const body = await parseJson(request, bodySchema, 2_048);
    console.info('[web-vitals]', body);
    return new NextResponse(null, { status: 204, headers: { ...cors, 'Cache-Control': 'no-store' } });
  } catch (error) {
    return publicError(error, request, cors);
  }
}
