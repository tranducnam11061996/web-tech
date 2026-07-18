import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { AdminApiError } from '@/lib/admin/common';
import { refreshCustomerMetrics } from '@/lib/customerAccounts';
import { releaseVoucherForOrder } from '@/lib/vouchers';

const ORDER_STATUSES = new Set([1, 2, 3, 4, 5]);

function decodeJson(value: unknown) {
  try { return JSON.parse(String(value || '{}')); } catch { return {}; }
}
function snapshot(value: unknown) {
  const data = decodeJson(value);
  return data && typeof data === 'object' ? data as Record<string, any> : {};
}
function statusLabel(status: number) { return ({ 1: 'Chờ xử lý', 2: 'Xác nhận', 3: 'Hoàn tất', 4: 'Thất bại', 5: 'Đã hủy' } as Record<number, string>)[status] || 'Không xác định'; }

export async function ensureStorefrontOrderTables() {
  await pool.query(`CREATE TABLE IF NOT EXISTS web_admin_storefront_order_meta (
    order_id int NOT NULL PRIMARY KEY, customer_name varchar(150) NOT NULL DEFAULT '', customer_phone varchar(32) NOT NULL DEFAULT '', customer_email varchar(255) NOT NULL DEFAULT '',
    payment_method varchar(40) NOT NULL DEFAULT '', delivery_method varchar(40) NOT NULL DEFAULT '', payment_status varchar(24) NOT NULL DEFAULT 'unpaid', shipping_status varchar(24) NOT NULL DEFAULT 'pending',
    assigned_admin_user_id int NULL, assigned_admin_name varchar(255) NOT NULL DEFAULT '', created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    order_type enum('standard','combo','pc_builder') NOT NULL DEFAULT 'standard', combo_set_id int NULL, combo_anchor_product_id int NULL,
    pc_build_id bigint unsigned NULL, assembly_required tinyint(1) NOT NULL DEFAULT 0, pc_builder_revision varchar(64) NOT NULL DEFAULT '',
    KEY idx_web_admin_order_meta_phone (customer_phone), KEY idx_web_admin_order_meta_payment_shipping (payment_status, shipping_status, order_id), KEY idx_web_admin_order_meta_assignee (assigned_admin_user_id, order_id),
    KEY idx_web_admin_order_meta_type (order_type,order_id), KEY idx_web_admin_order_meta_combo (combo_set_id,order_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const ensureColumn = async (name: string, statement: string) => {
    const [found] = await pool.query<RowDataPacket[]>('SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? AND column_name=? LIMIT 1', ['web_admin_storefront_order_meta', name]);
    if (!found[0]) await pool.query(statement);
  };
  await ensureColumn('order_type', "ALTER TABLE web_admin_storefront_order_meta ADD COLUMN order_type enum('standard','combo','pc_builder') NOT NULL DEFAULT 'standard'");
  await ensureColumn('combo_set_id', 'ALTER TABLE web_admin_storefront_order_meta ADD COLUMN combo_set_id int NULL');
  await ensureColumn('combo_anchor_product_id', 'ALTER TABLE web_admin_storefront_order_meta ADD COLUMN combo_anchor_product_id int NULL');
  await pool.query(`CREATE TABLE IF NOT EXISTS web_admin_storefront_order_events (
    id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY, order_id int NOT NULL, event_type varchar(32) NOT NULL, from_value varchar(255) NULL, to_value varchar(255) NULL, note text NULL,
    actor_user_id int NULL, actor_name varchar(255) NOT NULL DEFAULT 'Hệ thống', created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_web_admin_order_events_order (order_id, id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const ensureIndex = async (name: string, statement: string) => {
    const [found] = await pool.query<RowDataPacket[]>('SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name=? AND index_name=? LIMIT 1', ['build_buy', name]);
    if (!found[0]) await pool.query(statement);
  };
  await ensureIndex('idx_web_admin_build_buy_status_id', 'CREATE INDEX idx_web_admin_build_buy_status_id ON build_buy (status, id)');
  await ensureIndex('idx_web_admin_build_buy_created_id', 'CREATE INDEX idx_web_admin_build_buy_created_id ON build_buy (create_time, id)');
  const ensureMetaIndex = async (name: string, statement: string) => {
    const [found] = await pool.query<RowDataPacket[]>('SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name=? AND index_name=? LIMIT 1', ['web_admin_storefront_order_meta', name]);
    if (!found[0]) await pool.query(statement);
  };
  await ensureMetaIndex('idx_web_admin_order_meta_type', 'CREATE INDEX idx_web_admin_order_meta_type ON web_admin_storefront_order_meta(order_type,order_id)');
  await ensureMetaIndex('idx_web_admin_order_meta_combo', 'CREATE INDEX idx_web_admin_order_meta_combo ON web_admin_storefront_order_meta(combo_set_id,order_id)');
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT o.id,o.buyer_info FROM build_buy o LEFT JOIN web_admin_storefront_order_meta m ON m.order_id=o.id WHERE m.order_id IS NULL LIMIT 1000`);
  for (const row of rows) await createOrderMeta(pool as any, Number(row.id), snapshot(row.buyer_info), true);
  await pool.query(`INSERT INTO web_admin_storefront_order_events (order_id,event_type,to_value,note)
    SELECT o.id,'created',CAST(o.status AS CHAR),'Đơn hàng đã tồn tại trước khi migration'
    FROM build_buy o LEFT JOIN web_admin_storefront_order_events e ON e.order_id=o.id AND e.event_type='created'
    WHERE e.id IS NULL`);
}

export async function createOrderMeta(db: PoolConnection | typeof pool, orderId: number, buyerInfo: Record<string, any>, addEvent = true) {
  const customer = buyerInfo.customer || {}; const delivery = buyerInfo.delivery || {};
  const orderType = buyerInfo.orderType === 'combo' ? 'combo' : buyerInfo.orderType === 'pc_builder' ? 'pc_builder' : 'standard';
  await db.query(`INSERT IGNORE INTO web_admin_storefront_order_meta
    (order_id,customer_name,customer_phone,customer_email,payment_method,delivery_method,order_type,combo_set_id,combo_anchor_product_id,pc_build_id,assembly_required,pc_builder_revision)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`, [orderId, String(customer.name || '').slice(0, 150), String(customer.phone || '').slice(0, 32), String(customer.email || '').slice(0, 255), String(buyerInfo.paymentMethod || ''), String(delivery.method || ''), orderType, buyerInfo.comboSetId || null, buyerInfo.comboAnchorProductId || null, buyerInfo.pcBuildId || null, buyerInfo.assemblyRequired ? 1 : 0, String(buyerInfo.pcBuilderRevision || '').slice(0, 64)]);
  if (addEvent) await db.query(`INSERT INTO web_admin_storefront_order_events (order_id,event_type,to_value,note) VALUES (?, 'created', '1', 'Đơn hàng được tạo từ storefront')`, [orderId]);
}

export async function listAdminStorefrontOrders(params: URLSearchParams) {
  const limit = Math.min(100, Math.max(1, Number(params.get('limit') || 50)));
  const cursor = Math.max(0, Number(params.get('cursor') || 0));
  const values: any[] = []; const where: string[] = [];
  if (cursor) { where.push('o.id < ?'); values.push(cursor); }
  const status = Number(params.get('status') || 0); if (ORDER_STATUSES.has(status)) { where.push('o.status = ?'); values.push(status); }
  const phone = String(params.get('phone') || '').replace(/\D/g, ''); if (phone) { where.push('m.customer_phone = ?'); values.push(phone); }
  const orderId = Number(params.get('q') || 0); if (orderId > 0) { where.push('o.id = ?'); values.push(orderId); }
  const payment = String(params.get('paymentStatus') || ''); if (payment) { where.push('m.payment_status = ?'); values.push(payment); }
  const shipping = String(params.get('shippingStatus') || ''); if (shipping) { where.push('m.shipping_status = ?'); values.push(shipping); }
  const assignee = Number(params.get('assigneeId') || 0); if (assignee) { where.push('m.assigned_admin_user_id = ?'); values.push(assignee); }
  const from = Number(params.get('from') || 0); if (from) { where.push('o.create_time >= ?'); values.push(from); }
  const to = Number(params.get('to') || 0); if (to) { where.push('o.create_time < ?'); values.push(to); }
  const orderType = String(params.get('orderType') || ''); if (orderType === 'combo' || orderType === 'standard') { where.push('m.order_type = ?'); values.push(orderType); }
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT o.id,o.product_title,o.total_value,o.status,o.create_time,m.customer_name,m.customer_phone,m.payment_status,m.shipping_status,m.assigned_admin_name,m.order_type,m.combo_set_id,m.combo_anchor_product_id,r.code_snapshot,r.discount_amount,(SELECT COUNT(*) FROM build_buy_item i WHERE i.order_id=o.id) item_count FROM build_buy o LEFT JOIN web_admin_storefront_order_meta m ON m.order_id=o.id LEFT JOIN web_admin_voucher_redemptions r ON r.order_id=o.id ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY o.id DESC LIMIT ?`, [...values, limit + 1]);
  const hasMore = rows.length > limit; const items = rows.slice(0, limit).map((row) => ({ id:Number(row.id), productTitle:String(row.product_title||''), totalValue:Number(row.total_value||0), status:Number(row.status), statusLabel:statusLabel(Number(row.status)), createTime:Number(row.create_time||0), customerName:String(row.customer_name||''), customerPhone:String(row.customer_phone||''), paymentStatus:String(row.payment_status||'unpaid'), shippingStatus:String(row.shipping_status||'pending'), assignedAdminName:String(row.assigned_admin_name||''), orderType:String(row.order_type||'standard'), comboSetId:row.combo_set_id?Number(row.combo_set_id):null, comboAnchorProductId:row.combo_anchor_product_id?Number(row.combo_anchor_product_id):null, voucherCode:row.code_snapshot||null, voucherDiscount:Number(row.discount_amount||0), itemCount:Number(row.item_count||0) }));
  return { items, nextCursor: hasMore ? items.at(-1)?.id || null : null, hasMore };
}

export async function getAdminStorefrontOrder(id: number) {
  const [headers] = await pool.query<RowDataPacket[]>(`SELECT o.*,m.customer_name,m.customer_phone,m.customer_email,m.payment_method,m.delivery_method,m.payment_status,m.shipping_status,m.assigned_admin_user_id,m.assigned_admin_name,m.order_type,m.combo_set_id,m.combo_anchor_product_id,r.code_snapshot,r.title_snapshot,r.discount_amount,r.eligible_subtotal FROM build_buy o LEFT JOIN web_admin_storefront_order_meta m ON m.order_id=o.id LEFT JOIN web_admin_voucher_redemptions r ON r.order_id=o.id WHERE o.id=? LIMIT 1`, [id]);
  const order = headers[0]; if (!order) throw new AdminApiError(404,'NOT_FOUND','Không tìm thấy đơn hàng.');
  const buyer = snapshot(order.buyer_info); const config = snapshot(order.config);
  const [items] = await pool.query<RowDataPacket[]>(`SELECT i.*,p.storeSKU,p.proThum,u.request_path AS slug FROM build_buy_item i LEFT JOIN idv_sell_product_store p ON p.id=i.product_id LEFT JOIN idv_url u ON u.id_path=CONCAT('module:product/view:product-detail/view_id:',i.product_id) WHERE i.order_id=? ORDER BY i.id`, [id]);
  const [events] = await pool.query<RowDataPacket[]>(`SELECT * FROM web_admin_storefront_order_events WHERE order_id=? ORDER BY id DESC LIMIT 100`, [id]);
  const [admins] = await pool.query<RowDataPacket[]>(`SELECT id,name,email FROM admin_users WHERE status=1 ORDER BY name`);
  return { id:Number(order.id), title:String(order.product_title||''), totalValue:Number(order.total_value||0), status:Number(order.status), statusLabel:statusLabel(Number(order.status)), createTime:Number(order.create_time||0), orderType:String(order.order_type||'standard'), combo:config.combo||null, customer:buyer.customer||{}, receiver:buyer.receiver||{}, delivery:buyer.delivery||{}, invoice:buyer.invoice||{}, note:config.note||'', totals:config.totals||{}, voucher:order.code_snapshot?{code:order.code_snapshot,title:order.title_snapshot,discount:Number(order.discount_amount||0),eligibleSubtotal:Number(order.eligible_subtotal||0)}:null, meta:{paymentMethod:order.payment_method||buyer.paymentMethod||'',deliveryMethod:order.delivery_method||buyer.delivery?.method||'',paymentStatus:order.payment_status||'unpaid',shippingStatus:order.shipping_status||'pending',assignedAdminUserId:order.assigned_admin_user_id||null,assignedAdminName:order.assigned_admin_name||'',comboSetId:order.combo_set_id||null,comboAnchorProductId:order.combo_anchor_product_id||null}, items:items.map((x)=>({productId:Number(x.product_id),title:String(x.title||''),sku:x.storeSKU||'',slug:x.slug||'',thumbnail:x.proThum||'',price:Number(x.product_price||0),quantity:Number(x.quantity||0),lineTotal:Number(x.product_price||0)*Number(x.quantity||0)})), events:events.map((x)=>({id:Number(x.id),type:x.event_type,from:x.from_value,to:x.to_value,note:x.note,actor:x.actor_name,createdAt:x.created_at})), admins:admins.map((x)=>({id:Number(x.id),name:String(x.name),email:String(x.email)})) };
}

export async function patchAdminStorefrontOrder(connection: PoolConnection, id:number, payload:any, actor:{id:number;name:string}) {
  const [rows] = await connection.query<RowDataPacket[]>('SELECT id,status FROM build_buy WHERE id=? FOR UPDATE',[id]); const order=rows[0]; if(!order) throw new AdminApiError(404,'NOT_FOUND','Không tìm thấy đơn hàng.');
  const event = async(type:string,from:any,to:any,note='')=>connection.query(`INSERT INTO web_admin_storefront_order_events (order_id,event_type,from_value,to_value,note,actor_user_id,actor_name) VALUES (?,?,?,?,?,?,?)`,[id,type,from===undefined?null:String(from),to===undefined?null:String(to),String(note||''),actor.id,actor.name]);
  if(payload.orderStatus!==undefined){const next=Number(payload.orderStatus);const current=Number(order.status);if(!ORDER_STATUSES.has(next))throw new AdminApiError(400,'BAD_REQUEST','Trạng thái đơn hàng không hợp lệ.');if([3,4,5].includes(current)&&next!==current)throw new AdminApiError(409,'CONFLICT','Đơn hàng đã kết thúc.');if([4,5].includes(next))await releaseVoucherForOrder(connection,id);if(next!==current){await connection.query('UPDATE build_buy SET status=?,last_update=?,last_update_by=? WHERE id=?',[next,Math.floor(Date.now()/1000),actor.name,id]);await event('order_status',current,next);}}
  const [linkedCustomers]=await connection.query<RowDataPacket[]>('SELECT customer_id FROM web_admin_storefront_order_customer WHERE order_id=? LIMIT 1',[id]);
  if (payload.orderStatus !== undefined && linkedCustomers[0] && Number(order.status) !== Number(payload.orderStatus)) await refreshCustomerMetrics(connection, Number(linkedCustomers[0].customer_id));
  const [metas]=await connection.query<RowDataPacket[]>('SELECT * FROM web_admin_storefront_order_meta WHERE order_id=? FOR UPDATE',[id]); const meta=metas[0]||{};
  if(payload.paymentStatus && payload.paymentStatus!==meta.payment_status){await connection.query('UPDATE web_admin_storefront_order_meta SET payment_status=? WHERE order_id=?',[payload.paymentStatus,id]);await event('payment_status',meta.payment_status,payload.paymentStatus);}
  if(payload.shippingStatus && payload.shippingStatus!==meta.shipping_status){await connection.query('UPDATE web_admin_storefront_order_meta SET shipping_status=? WHERE order_id=?',[payload.shippingStatus,id]);await event('shipping_status',meta.shipping_status,payload.shippingStatus);}
  if(payload.assigneeId!==undefined){const aid=Number(payload.assigneeId)||null;let name='';if(aid){const [a]=await connection.query<RowDataPacket[]>('SELECT name FROM admin_users WHERE id=? AND status=1',[aid]);if(!a[0])throw new AdminApiError(400,'BAD_REQUEST','Nhân sự không hợp lệ.');name=String(a[0].name)}await connection.query('UPDATE web_admin_storefront_order_meta SET assigned_admin_user_id=?,assigned_admin_name=? WHERE order_id=?',[aid,name,id]);await event('assignee',meta.assigned_admin_name||'',name);}
  if(String(payload.note||'').trim()) await event('note','', '',String(payload.note).trim());
}
