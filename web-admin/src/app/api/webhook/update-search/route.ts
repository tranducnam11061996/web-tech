import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { mutateSearchCache, searchCache, type SearchWebhookProduct } from '@/lib/searchCache';
import { claimWebhookNonce } from '@/lib/performanceInfrastructure';

type WebhookBody = { id?: number; action?: string; product?: SearchWebhookProduct };

function fail(status: number, code: string, message: string) {
  return NextResponse.json({ success: false, error: { code, message } }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: Request) {
  try {
    const secret = process.env.SEARCH_WEBHOOK_SECRET?.trim();
    if (!secret) return fail(503, 'WEBHOOK_UNAVAILABLE', 'Search webhook secret is not configured');
    const timestamp = String(request.headers.get('x-webhook-timestamp') || '');
    const nonce = String(request.headers.get('x-webhook-nonce') || '');
    const signature = String(request.headers.get('x-webhook-signature') || '').replace(/^sha256=/, '');
    const timestampMs = Number(timestamp) * 1000;
    if (!/^\d{10}$/.test(timestamp) || Math.abs(Date.now() - timestampMs) > 5 * 60_000 || !/^[a-zA-Z0-9._:-]{16,128}$/.test(nonce) || !/^[a-f0-9]{64}$/i.test(signature)) {
      return fail(401, 'INVALID_SIGNATURE', 'Invalid webhook signature');
    }
    const raw = await request.text();
    if (Buffer.byteLength(raw, 'utf8') > 256_000) return fail(413, 'PAYLOAD_TOO_LARGE', 'Webhook payload is too large');
    const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${nonce}.${raw}`).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))) return fail(401, 'INVALID_SIGNATURE', 'Invalid webhook signature');
    if (!await claimWebhookNonce(nonce)) return fail(409, 'REPLAYED_WEBHOOK', 'Webhook nonce has already been used');

    const { id, action, product } = JSON.parse(raw) as WebhookBody;
    if (!Number.isInteger(id) || Number(id) <= 0) return fail(400, 'INVALID_PRODUCT_ID', 'Invalid product id');
    if (!searchCache.cachedProducts) return NextResponse.json({ success: true, message: 'Cache not initialized yet, skipped update' });
    if (action === 'DELETE') await mutateSearchCache(Number(id), 'DELETE');
    else if ((action === 'ADD' || action === 'UPDATE') && product) await mutateSearchCache(Number(id), action, product);
    else return fail(400, 'INVALID_ACTION', 'Invalid action or missing product data');
    return NextResponse.json({ success: true, message: `Cache updated for product ${id}` });
  } catch (error) {
    console.error('[Search Webhook] Update error:', error);
    return fail(500, 'INTERNAL_ERROR', 'Internal Server Error');
  }
}
