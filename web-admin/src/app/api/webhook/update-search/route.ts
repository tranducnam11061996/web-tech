import { NextResponse } from 'next/server';
import {
  mutateSearchCache,
  searchCache,
  type SearchWebhookProduct,
} from '@/lib/searchCache';

type WebhookBody = {
  id?: number;
  action?: string;
  product?: SearchWebhookProduct;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as WebhookBody;
    const { id, action, product } = body;

    if (!searchCache.cachedProducts) {
      return NextResponse.json({
        success: true,
        message: 'Cache not initialized yet, skipped update',
      });
    }

    if (!Number.isInteger(id)) {
      return NextResponse.json({ success: false, error: 'Invalid product id' }, { status: 400 });
    }

    if (action === 'DELETE') {
      await mutateSearchCache(Number(id), 'DELETE');
    } else if (action === 'ADD' || action === 'UPDATE') {
      if (!product) {
        return NextResponse.json({ success: false, error: 'Missing product data' }, { status: 400 });
      }
      await mutateSearchCache(Number(id), action, product);
    } else {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: `Cache updated for product ${id}` });
  } catch (error) {
    console.error('[Search Webhook] Update error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
