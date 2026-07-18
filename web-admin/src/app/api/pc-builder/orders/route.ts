import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { pcBuilderOrderSchema } from '@/lib/commerceValidation';
import { assertPcBuilderFeature, buildPcBuilderQuote } from '@/lib/pcBuilder/service';
import { verifyCustomerCaptcha } from '@/lib/customerRecaptcha';
import { assertPublicOrigin, parseJson, publicCorsHeaders, publicError, PublicRequestError, requestId } from '@/lib/publicRequest';
import { consumeRateLimits, rateLimitSetting, requestIp } from '@/lib/performanceInfrastructure';
import { claimOrderRequest, completeOrderRequest, enqueueOrderEmail, validateIdempotencyKey } from '@/lib/orderInfrastructure';
import { createOrderMeta } from '@/lib/storefrontOrders';
import { linkOrderToCustomer, resolveCustomerSession } from '@/lib/customerAccounts';
import type { EmailCustomer, EmailDelivery, EmailOrderItem, EmailOrderTotals } from '@/lib/email';
import { recordRouteMetric } from '@/lib/runtimeMetrics';

export async function OPTIONS(request: Request) { return new NextResponse(null, { status: 204, headers: publicCorsHeaders(request, 'POST, OPTIONS') }); }
function truncate(value: string, length: number) { return String(value || '').slice(0, length); }
function ascii(value: string) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D'); }
function dbSafe(value: string) { return String(value || '').replace(/[^\x20-\x7E]/g, (char) => `\\u${(char.codePointAt(0) || 0).toString(16).padStart(4, '0')}`); }

export async function POST(request: Request) {
  const startedAt = performance.now();
  const cors = publicCorsHeaders(request, 'POST, OPTIONS');
  const id = requestId(request);
  try {
    assertPublicOrigin(request);
    assertPcBuilderFeature();
    const body = await parseJson(request, pcBuilderOrderSchema, 48_000);
    if (body.website) return NextResponse.json({ success: true }, { status: 202, headers: { ...cors, 'X-Request-ID': id } });
    const idempotencyKey = validateIdempotencyKey(request.headers.get('idempotency-key'));
    await Promise.all([
      consumeRateLimits([
        { scope: 'pc_builder_order_ip', key: requestIp(request), limit: rateLimitSetting('RATE_LIMIT_ORDER_IP', 120), windowSeconds: 300, blockSeconds: 300 },
        { scope: 'pc_builder_order_phone', key: body.customer.phone, limit: rateLimitSetting('RATE_LIMIT_ORDER_PHONE', 8), windowSeconds: 900, blockSeconds: 900 },
      ]),
      verifyCustomerCaptcha(request, body.recaptchaToken, 'pc_builder_order_submit'),
    ]);
    const customer = await resolveCustomerSession(request);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const claimed = await claimOrderRequest(connection, idempotencyKey, body);
      if (claimed.replay) { await connection.commit(); return NextResponse.json(claimed.replay, { headers: { ...cors, 'X-Request-ID': id, 'Idempotency-Replayed': 'true' } }); }
      const quote = await buildPcBuilderQuote(body.selections, { db: connection, assemblyRequired: body.assemblyRequired });
      if (!quote.compatible) throw new PublicRequestError(409, 'INCOMPATIBLE_BUILD', 'Cấu hình không còn tương thích. Vui lòng kiểm tra lại.');
      if (quote.diagnostics.some((item) => item.severity === 'warning') && !body.warningsConfirmed) throw new PublicRequestError(409, 'WARNINGS_NOT_CONFIRMED', 'Vui lòng xác nhận các cảnh báo của cấu hình trước khi đặt hàng.');
      if (quote.items.some((item) => !item.available)) throw new PublicRequestError(409, 'BUILD_UNAVAILABLE', 'Một hoặc nhiều linh kiện không còn khả dụng.');
      const [buildResult] = await connection.query(`INSERT INTO web_admin_pc_builds
        (customer_id,name,mode,input_json,status,expires_at,rule_revision,profile_revision,fingerprint)
        VALUES (?,?,'manual',JSON_OBJECT('assemblyRequired',?),'ordered',NULL,?,?,?)`,
      [customer?.id || null, 'Cấu hình đặt hàng', body.assemblyRequired ? 1 : 0, quote.ruleRevision, quote.profileRevision, quote.fingerprint]);
      const buildId = Number((buildResult as { insertId?: number }).insertId || 0);
      await connection.query('INSERT INTO web_admin_pc_build_items (build_id,component_code,product_id,quantity,ordering) VALUES ?',
        [body.selections.map((item, index) => [buildId, item.componentCode, item.productId, item.quantity, index])]);
      const now = Math.floor(Date.now() / 1000);
      const buyer = { customer: body.customer, receiver: body.receiver, delivery: body.delivery, paymentMethod: body.paymentMethod, invoice: body.invoice, source: 'font-end', orderType: 'pc_builder', pcBuildId: buildId, assemblyRequired: body.assemblyRequired, pcBuilderRevision: quote.ruleRevision, createdAt: new Date().toISOString() };
      const config = { pcBuilder: { buildId, fingerprint: quote.fingerprint, ruleRevision: quote.ruleRevision, profileRevision: quote.profileRevision, assemblyRequired: body.assemblyRequired }, items: quote.items, totals: quote.totals, diagnostics: quote.diagnostics, note: body.note };
      const [orderResult] = await connection.query(`INSERT INTO build_buy(product_title,total_value,product_id,buyer_info,config,status,create_time,last_update)
        VALUES(?,?,?,?,?,1,?,?)`, ['Cau hinh PC lap rap', quote.totals.total, 0, dbSafe(JSON.stringify(buyer)), dbSafe(JSON.stringify(config)), now, now]);
      const orderId = Number((orderResult as { insertId?: number }).insertId || 0);
      await Promise.all([createOrderMeta(connection, orderId, buyer), linkOrderToCustomer(connection, orderId, customer?.id || null)]);
      await connection.query('INSERT INTO build_buy_item(order_id,product_id,title,product_price,quantity) VALUES ?',
        [quote.items.map((item) => [orderId, item.productId, truncate(ascii(item.name), 255), Math.round(item.price), item.quantity])]);
      const emailCustomer: EmailCustomer = { name: body.customer.name, phone: body.customer.phone, email: body.customer.email || '' };
      const emailDelivery: EmailDelivery = { method: body.delivery.method || 'shipping', province: body.delivery.province || '', ward: body.delivery.ward || '', address: body.delivery.address || '', note: body.delivery.note || '' };
      const emailItems: EmailOrderItem[] = quote.items.map((item) => ({ productId: item.productId, title: item.name, quantity: item.quantity, product_price: Math.round(item.price) }));
      const emailTotals: EmailOrderTotals = { subtotal: quote.totals.subtotal, total: quote.totals.total, itemCount: quote.totals.itemCount };
      await enqueueOrderEmail(connection, { to: emailCustomer.email, orderId, items: emailItems, totals: emailTotals, customer: emailCustomer, delivery: emailDelivery, paymentMethod: body.paymentMethod || 'bank_transfer' });
      const responseBody = { success: true, data: { orderId, buildId, total: quote.totals.total, itemCount: quote.totals.itemCount }, message: 'Tạo đơn PC Builder thành công' };
      await completeOrderRequest(connection, claimed.id, orderId, responseBody);
      await connection.commit();
      recordRouteMetric('POST /api/pc-builder/orders', performance.now() - startedAt, 200);
      return NextResponse.json(responseBody, { headers: { ...cors, 'X-Request-ID': id } });
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  } catch (error) {
    const response = publicError(error, request, cors);
    recordRouteMetric('POST /api/pc-builder/orders', performance.now() - startedAt, response.status);
    return response;
  }
}
