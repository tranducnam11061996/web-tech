import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { RowDataPacket } from 'mysql2/promise';
import { loadEnvConfig } from '@next/env';
import pool from '../src/lib/db';
import { hashPassword } from '../src/lib/passwordHash';
import {
  ADMIN_SESSION_COOKIE,
  changeOwnPassword,
  loginAdmin,
  requireAdminPermission,
  resetAdminPassword,
  revokeAdminSessions,
  writeAdminAudit,
} from '../src/lib/admin/auth';
import { POST as createStandardOrder } from '../src/app/api/orders/route';
import { POST as createPcBuilderOrder } from '../src/app/api/pc-builder/orders/route';
import { patchAdminStorefrontOrder } from '../src/lib/storefrontOrders';

loadEnvConfig(process.cwd());

function args() {
  const result = new Map<string, string>();
  for (let index = 2; index < process.argv.length; index += 1) {
    const value = process.argv[index];
    if (!value.startsWith('--')) continue;
    const [key, inline] = value.slice(2).split('=', 2);
    const next = process.argv[index + 1];
    if (inline !== undefined) result.set(key, inline);
    else if (next && !next.startsWith('--')) { result.set(key, next); index += 1; }
    else result.set(key, 'true');
  }
  return result;
}

function temporaryPassword() { return crypto.randomBytes(18).toString('base64url'); }
function qaRequest(url: string, body: unknown, idempotencyKey: string) {
  return new Request(url, { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': idempotencyKey }, body: JSON.stringify(body) });
}

async function main() {
  const input = args();
  const database = String(input.get('database') || '');
  const backupHash = String(input.get('backup-sha256') || '').toLowerCase();
  if (!(database === 'it_tech_db' || /^it_tech_db_pc_builder_clone_\d{8,14}$/.test(database))) throw new Error('Unsafe QA database.');
  if (process.env.ADMIN_WRITE_ENABLED !== 'true') throw new Error('QA requires ADMIN_WRITE_ENABLED=true in this process only.');
  if (process.env.NODE_ENV === 'production' || process.env.RECAPTCHA_DEVELOPMENT_BYPASS !== 'true') throw new Error('QA requires the explicit non-production CAPTCHA bypass.');
  if (process.env.PC_BUILDER_ENABLED !== 'true' || process.env.PC_BUILDER_AUTO_ENABLED === 'true') throw new Error('QA requires manual PC Builder enabled and Auto disabled.');
  if (!/^[a-f0-9]{64}$/.test(backupHash) || backupHash !== String(process.env.PC_BUILDER_RESTORE_VERIFIED_SHA256 || '').toLowerCase()) throw new Error('QA backup hash mismatch.');
  const expectedToken = String(process.env.PC_BUILDER_CONFIRMATION_TOKEN || '');
  if (!expectedToken || process.env.PC_BUILDER_CONFIRMATION_INPUT !== expectedToken) throw new Error('QA confirmation guard failed.');
  const [databaseRows] = await pool.query<RowDataPacket[]>('SELECT DATABASE() database_name');
  if (String(databaseRows[0]?.database_name || '') !== database) throw new Error('QA connected database mismatch.');

  const qaEmail = 'tiendinh.ntd+qa@gmail.com';
  const initialPassword = temporaryPassword();
  const overrides = JSON.stringify({ grant: ['sales.orders.read', 'sales.orders.update'], revoke: [] });
  const [existing] = await pool.query<RowDataPacket[]>('SELECT id FROM admin_users WHERE email=? LIMIT 1', [qaEmail]);
  let userId = Number(existing[0]?.id || 0);
  if (userId) {
    await pool.query(`UPDATE admin_users SET name='PC Builder QA',password=?,role='catalog_manager',permissions=?,status=1,
      must_change_password=1,password_changed_at=NOW(),auth_version=auth_version+1 WHERE id=?`, [await hashPassword(initialPassword), overrides, userId]);
  } else {
    const [created] = await pool.query(`INSERT INTO admin_users (email,password,name,role,permissions,status,must_change_password,password_changed_at,auth_version)
      VALUES (?,?,'PC Builder QA','catalog_manager',?,1,1,NOW(),1)`, [qaEmail, await hashPassword(initialPassword), overrides]);
    userId = Number((created as { insertId?: number }).insertId || 0);
  }
  await revokeAdminSessions(userId);
  await writeAdminAudit({ action: 'pc_builder.qa_account_provisioned', resource: 'admin.users', resourceId: userId, metadata: { role: 'catalog_manager' } });

  const loginRequest = new Request('http://localhost:3000/api/admin/auth/login', { headers: { 'x-forwarded-for': '127.0.0.1', 'user-agent': 'PC Builder QA runner' } });
  const firstLogin = await loginAdmin(loginRequest, qaEmail, initialPassword);
  if (!firstLogin.user.mustChangePassword) throw new Error('QA account did not enforce the first password change.');
  const firstSession = new Request('http://localhost:3000/product/pc-builder', { headers: { cookie: `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(firstLogin.token)}` } });
  let passwordGateVerified = false;
  try { await requireAdminPermission(firstSession, 'catalog.pc_builder.read'); }
  catch (error) { passwordGateVerified = Boolean(error && typeof error === 'object' && 'code' in error && error.code === 'PASSWORD_CHANGE_REQUIRED'); }
  if (!passwordGateVerified) throw new Error('QA password-change permission gate was not enforced.');
  const operationalPassword = temporaryPassword();
  await changeOwnPassword(firstSession, initialPassword, operationalPassword);
  const secondLogin = await loginAdmin(loginRequest, qaEmail, operationalPassword);
  const permissions = new Set(secondLogin.user.permissions);
  for (const permission of ['catalog.pc_builder.read', 'catalog.pc_builder.update', 'catalog.pc_builder.publish', 'sales.orders.read', 'sales.orders.update']) {
    if (!permissions.has(permission as never)) throw new Error(`QA permission missing: ${permission}`);
  }
  if (permissions.has('admin.users.read' as never) || permissions.has('admin.roles.read' as never)) throw new Error('QA account has prohibited admin user/role access.');

  const [standardProducts] = await pool.query<RowDataPacket[]>(`SELECT p.id FROM idv_sell_product_store p
    JOIN idv_sell_product_price pr ON pr.id=p.id AND pr.isOn=1 AND pr.price>0 WHERE p.url<>'' ORDER BY p.id LIMIT 1`);
  const standardProductId = Number(standardProducts[0]?.id || 0);
  if (!standardProductId) throw new Error('No stable sellable standard QA product found.');
  const customer = { name: 'QA Build PC', phone: '0900000000', email: 'tiendinh.ntd@gmail.com' };
  const base = {
    recaptchaToken: '', website: '', customer, receiver: { enabled: false, name: '', phone: '' },
    delivery: { method: 'pickup', provinceCode: '', province: '', wardCode: '', ward: '', address: '', note: 'QA pickup' },
    paymentMethod: 'bank_transfer', invoice: { enabled: false, companyName: '', taxCode: '', address: '', email: '' }, note: 'PC Builder live commerce QA',
  };
  const suffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
  const standardResponse = await createStandardOrder(qaRequest('http://localhost:3000/api/orders', { ...base, items: [{ productId: standardProductId, quantity: 1 }], voucherCode: '' }, `qa-standard-${suffix}`));
  const standardBody = await standardResponse.json();
  const selections = [
    { componentCode: 'cpu', productId: 12445, quantity: 1 }, { componentCode: 'mainboard', productId: 11241, quantity: 1 },
    { componentCode: 'ram', productId: 11447, quantity: 1 }, { componentCode: 'storage', productId: 12922, quantity: 1 },
    { componentCode: 'case', productId: 12817, quantity: 1 }, { componentCode: 'psu', productId: 10478, quantity: 1 },
    { componentCode: 'gpu', productId: 11722, quantity: 1 },
  ];
  const pcResponse = await createPcBuilderOrder(qaRequest('http://localhost:3000/api/pc-builder/orders', { ...base, selections, assemblyRequired: true, warningsConfirmed: true }, `qa-pc-builder-${suffix}`));
  const pcBody = await pcResponse.json();
  if (!standardBody.success || !pcBody.success) throw new Error(`QA order creation failed: ${JSON.stringify({ standard: standardBody, pcBuilder: pcBody })}`);
  const orderIds = [Number(standardBody.data.orderId), Number(pcBody.data.orderId)];
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    for (const orderId of orderIds) await patchAdminStorefrontOrder(connection, orderId, { orderStatus: 3, paymentStatus: 'paid', shippingStatus: 'delivered', note: 'PC Builder QA completed' }, { id: userId, name: 'PC Builder QA' });
    await connection.commit();
  } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  const [outbox] = await pool.query<RowDataPacket[]>(`SELECT event_type,aggregate_id,status FROM web_admin_email_outbox
    WHERE aggregate_id IN (?) AND event_type IN ('order_confirmation','order_completed') ORDER BY aggregate_id,event_type`, [orderIds.map(String)]);
  if (outbox.length !== 4) throw new Error(`Expected four QA email events, received ${outbox.length}.`);
  const [orders] = await pool.query<RowDataPacket[]>(`SELECT o.id,o.product_title,o.status,m.order_type,m.pc_build_id,m.assembly_required,m.pc_builder_revision
    FROM build_buy o JOIN web_admin_storefront_order_meta m ON m.order_id=o.id WHERE o.id IN (?) ORDER BY o.id`, [orderIds]);
  if (orders.length !== 2 || orders.some((order) => Number(order.status) !== 3)) throw new Error('QA orders were not completed.');

  const finalPassword = temporaryPassword();
  const sessionRequest = new Request('http://localhost:3000/system/users', { headers: { cookie: `${ADMIN_SESSION_COOKIE}=${encodeURIComponent(secondLogin.token)}` } });
  await resetAdminPassword(userId, finalPassword, secondLogin.user, sessionRequest);
  const credentialPath = path.resolve(String(input.get('credential-file') || path.resolve(process.cwd(), '..', 'tmp', `pc-builder-qa-credential-${Date.now()}.json`)));
  fs.mkdirSync(path.dirname(credentialPath), { recursive: true });
  fs.writeFileSync(credentialPath, JSON.stringify({ email: qaEmail, temporaryPassword: finalPassword, mustChangePassword: true, userId }, null, 2), { encoding: 'utf8', mode: 0o600, flag: 'wx' });
  process.stdout.write(`${JSON.stringify({ success: true, database, userId, credentialPath, orderIds, pcBuildId: Number(pcBody.data.buildId), standardProductId, outbox, orders, passwordGateVerified })}\n`);
}

void main().then(async () => { await pool.end(); process.exit(0); }).catch(async (error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  await pool.end().catch(() => undefined);
  process.exit(1);
});
