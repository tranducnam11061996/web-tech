import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { buildCartQuote } from '@/lib/cart-quote';
import { reserveVoucherForOrder } from '@/lib/vouchers';
import { clearPublicCatalogDetailCache } from '@/lib/publicProductCache';
import { createOrderMeta } from '@/lib/storefrontOrders';
import { linkOrderToCustomer, resolveCustomerSession } from '@/lib/customerAccounts';
import { orderSchema } from '@/lib/commerceValidation';
import { verifyCustomerCaptcha } from '@/lib/customerRecaptcha';
import { assertPublicOrigin, parseJson, publicCorsHeaders, publicError, PublicRequestError, requestId } from '@/lib/publicRequest';
import { consumeRateLimits, rateLimitSetting, requestIp } from '@/lib/performanceInfrastructure';
import { claimOrderRequest, completeOrderRequest, enqueueOrderEmail, validateIdempotencyKey } from '@/lib/orderInfrastructure';
import type { EmailCustomer, EmailDelivery, EmailOrderItem, EmailOrderTotals } from '@/lib/email';
import { recordRouteMetric } from '@/lib/runtimeMetrics';

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: publicCorsHeaders(request, 'POST, OPTIONS') });
}

function truncate(value: string, maxLength: number) { return String(value || '').slice(0, maxLength); }
function toAscii(value: string) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}
function toDbSafeText(value: string) {
  return String(value || '').replace(/[^\x20-\x7E]/g, (char) => `\\u${(char.codePointAt(0) ?? 0).toString(16).padStart(4, '0')}`);
}

export async function POST(request: Request) {
  const startedAt = performance.now();
  const cors = publicCorsHeaders(request, 'POST, OPTIONS');
  const id = requestId(request);
  try {
    assertPublicOrigin(request);
    const body = await parseJson(request, orderSchema, 48_000);
    if (body.website) return NextResponse.json({ success: true }, { status: 202, headers: { ...cors, 'X-Request-ID': id } });
    const idempotencyKey = validateIdempotencyKey(request.headers.get('idempotency-key'));
    await Promise.all([
      consumeRateLimits([
        { scope: 'order_ip', key: requestIp(request), limit: rateLimitSetting('RATE_LIMIT_ORDER_IP', 120), windowSeconds: 300, blockSeconds: 300 },
        { scope: 'order_phone', key: body.customer.phone, limit: rateLimitSetting('RATE_LIMIT_ORDER_PHONE', 8), windowSeconds: 900, blockSeconds: 900 },
      ]),
      verifyCustomerCaptcha(request, body.recaptchaToken, 'order_submit'),
    ]);

    const sessionCustomer = await resolveCustomerSession(request);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const claimed = await claimOrderRequest(connection, idempotencyKey, body);
      if (claimed.replay) {
        await connection.commit();
        return NextResponse.json(claimed.replay, { headers: { ...cors, 'X-Request-ID': id, 'Idempotency-Replayed': 'true' } });
      }

      const quote = await buildCartQuote(body.items, { voucherCode: body.voucherCode, db: connection, lockVoucher: true });
      const invalidItems = quote.items.filter((item) => !item.available);
      const orderItems = quote.items.filter((item) => item.available);
      if (!orderItems.length || invalidItems.length || (body.voucherCode && quote.voucher.status !== 'applied')) {
        throw new PublicRequestError(400, 'INVALID_CART', quote.voucher.message || 'Giỏ hàng hoặc voucher không còn hợp lệ.');
      }

      const now = Math.floor(Date.now() / 1000);
      const productTitle = orderItems.length === 1 ? orderItems[0].name : `Đơn hàng website (${orderItems.length} sản phẩm)`;
      const buyerInfo = JSON.stringify({ customer: body.customer, receiver: body.receiver, delivery: body.delivery, paymentMethod: body.paymentMethod, invoice: body.invoice, source: 'font-end', createdAt: new Date().toISOString() });
      const config = JSON.stringify({ items: orderItems, totals: quote.totals, voucher: quote.voucher, note: body.note });
      const [orderResult] = await connection.query(
        `INSERT INTO build_buy(product_title,total_value,product_id,buyer_info,config,status,create_time,last_update)
         VALUES(?,?,?,?,?,1,?,?)`,
        [truncate(toAscii(productTitle), 255), quote.totals.total, orderItems.length === 1 ? orderItems[0].productId : 0, toDbSafeText(buyerInfo), toDbSafeText(config), now, now],
      );
      const orderId = Number((orderResult as { insertId?: number }).insertId || 0);
      await Promise.all([
        createOrderMeta(connection, orderId, JSON.parse(buyerInfo)),
        linkOrderToCustomer(connection, orderId, sessionCustomer?.id || null),
      ]);
      const voucherAvailabilityChanged = await reserveVoucherForOrder(connection, quote.voucher, orderId, quote.totals.subtotal);
      await connection.query(
        `INSERT INTO build_buy_item(order_id,product_id,title,product_price,quantity) VALUES ?`,
        [orderItems.map((item) => [orderId, item.productId, truncate(toAscii(item.name), 255), Math.round(item.price), item.quantity])],
      );

      const emailCustomer: EmailCustomer = { name: body.customer.name, phone: body.customer.phone, email: body.customer.email || '' };
      const emailDelivery: EmailDelivery = { method: body.delivery.method || 'shipping', province: body.delivery.province || '', ward: body.delivery.ward || '', address: body.delivery.address || '', note: body.delivery.note || '' };
      const emailItems: EmailOrderItem[] = orderItems.map((item) => ({ productId: item.productId, title: item.name, quantity: item.quantity, product_price: Math.round(item.price) }));
      const emailTotals: EmailOrderTotals = { subtotal: quote.totals.subtotal, total: quote.totals.total, itemCount: quote.totals.itemCount };
      await enqueueOrderEmail(connection, { to: emailCustomer.email, orderId, items: emailItems, totals: emailTotals, customer: emailCustomer, delivery: emailDelivery, paymentMethod: body.paymentMethod || 'bank_transfer' });

      const responseBody = { success: true, data: { orderId, total: quote.totals.total, itemCount: quote.totals.itemCount }, message: 'Tạo đơn hàng thành công' };
      await completeOrderRequest(connection, claimed.id, orderId, responseBody);
      await connection.commit();
      if (voucherAvailabilityChanged) clearPublicCatalogDetailCache();
      const duration = performance.now() - startedAt;
      recordRouteMetric('POST /api/orders', duration, 200);
      return NextResponse.json(responseBody, { headers: { ...cors, 'X-Request-ID': id, 'Server-Timing': `app;dur=${duration.toFixed(1)}` } });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    const response = publicError(error, request, cors);
    recordRouteMetric('POST /api/orders', performance.now() - startedAt, response.status);
    return response;
  }
}
