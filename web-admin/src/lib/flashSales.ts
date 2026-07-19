import crypto from 'crypto';
import type { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { AdminApiError, maybeText, normalizeSlug, requireText, toBoolInt, toInt, withTransaction } from '@/lib/admin/common';
import { PublicRequestError } from '@/lib/publicRequest';
import { resolveProductImageUrl } from '@/lib/productImageUrl';

type DbExecutor = Pool | PoolConnection;
export type FlashSaleRuntimeState = 'draft' | 'scheduled' | 'active' | 'ended' | 'paused' | 'archived';
export type FlashSaleStackingMode = 'exclusive' | 'allow_voucher';

export type FlashSaleOffer = {
  campaignId: number;
  campaignCode: string;
  campaignSlug: string;
  campaignName: string;
  itemId: number;
  productId: number;
  flashPrice: number;
  regularPrice: number;
  quotaTotal: number;
  quotaReserved: number;
  quotaSold: number;
  remainingQuantity: number;
  minQuantityPerOrder: number;
  maxQuantityPerOrder: number;
  maxQuantityPerBuyer: number | null;
  stackingMode: FlashSaleStackingMode;
  audienceMode: 'all' | 'authenticated';
  startsAt: string;
  endsAt: string;
};

export type FlashSaleQuotedItem = {
  productId: number;
  quantity: number;
  price: number;
  regularPrice: number;
  available: boolean;
  flashSale: FlashSaleOffer | null;
};

type ParsedCampaignItem = {
  id: number;
  productId: number;
  flashPrice: number;
  quotaTotal: number;
  minQuantityPerOrder: number;
  maxQuantityPerOrder: number;
  maxQuantityPerBuyer: number | null;
  displayOrder: number;
  featured: number;
  status: number;
  revision: number;
};

type ParsedCampaign = {
  code: string;
  slug: string;
  name: string;
  description: string;
  internalNote: string;
  status: 'draft' | 'published' | 'paused' | 'archived';
  stackingMode: FlashSaleStackingMode;
  audienceMode: 'all' | 'authenticated';
  countdownStartsAt: string;
  startsAt: string;
  endsAt: string;
  bannerDesktopUrl: string;
  bannerMobileUrl: string;
  displayOrder: number;
  revision: number;
  items: ParsedCampaignItem[];
};

const MAX_CAMPAIGN_ITEMS = 500;
const PUBLIC_ITEM_LIMIT = 96;

function boundedInteger(value: unknown, field: string, minimum: number, maximum: number, fallback?: number) {
  const raw = value === '' || value === undefined || value === null ? fallback : Number(value);
  if (!Number.isInteger(raw) || Number(raw) < minimum || Number(raw) > maximum) {
    throw new AdminApiError(400, 'BAD_REQUEST', `${field} không hợp lệ.`, { [field]: 'invalid' });
  }
  return Number(raw);
}

function parseVietnamDateTime(value: unknown, field: string) {
  const text = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(text)) {
    throw new AdminApiError(400, 'BAD_REQUEST', 'Thời gian không hợp lệ.', { [field]: 'invalid' });
  }
  const date = new Date(`${text}:00+07:00`);
  if (Number.isNaN(date.getTime())) throw new AdminApiError(400, 'BAD_REQUEST', 'Thời gian không hợp lệ.', { [field]: 'invalid' });
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function databaseDateTime(value: unknown) {
  if (value instanceof Date) {
    const two = (part: number) => String(part).padStart(2, '0');
    return `${value.getFullYear()}-${two(value.getMonth() + 1)}-${two(value.getDate())} ${two(value.getHours())}:${two(value.getMinutes())}:${two(value.getSeconds())}`;
  }
  return String(value || '').trim();
}

function publicIso(value: unknown) {
  const text = databaseDateTime(value);
  return text ? `${text.replace(' ', 'T')}Z` : '';
}

function parseItems(value: unknown): ParsedCampaignItem[] {
  if (!Array.isArray(value) || value.length === 0) return [];
  if (value.length > MAX_CAMPAIGN_ITEMS) throw new AdminApiError(400, 'BAD_REQUEST', `Mỗi chiến dịch hỗ trợ tối đa ${MAX_CAMPAIGN_ITEMS} SKU.`);
  const seen = new Set<number>();
  return value.map((source, index) => {
    const item = source && typeof source === 'object' ? source as Record<string, unknown> : {};
    const productId = boundedInteger(item.productId, `items.${index}.productId`, 1, 4_294_967_295);
    if (seen.has(productId)) throw new AdminApiError(400, 'BAD_REQUEST', 'Một SKU chỉ được xuất hiện một lần trong chiến dịch.', { items: 'duplicate_product' });
    seen.add(productId);
    const quotaTotal = boundedInteger(item.quotaTotal, `items.${index}.quotaTotal`, 1, 1_000_000);
    const minQuantityPerOrder = boundedInteger(item.minQuantityPerOrder, `items.${index}.minQuantityPerOrder`, 1, 99, 1);
    const maxQuantityPerOrder = boundedInteger(item.maxQuantityPerOrder, `items.${index}.maxQuantityPerOrder`, minQuantityPerOrder, 99, 1);
    if (maxQuantityPerOrder > quotaTotal) throw new AdminApiError(400, 'BAD_REQUEST', 'Giới hạn mỗi đơn không được vượt quota.', { [`items.${index}.maxQuantityPerOrder`]: 'over_quota' });
    const maxBuyerRaw = item.maxQuantityPerBuyer === '' || item.maxQuantityPerBuyer === null || item.maxQuantityPerBuyer === undefined
      ? null
      : boundedInteger(item.maxQuantityPerBuyer, `items.${index}.maxQuantityPerBuyer`, maxQuantityPerOrder, 999);
    return {
      id: boundedInteger(item.id, `items.${index}.id`, 0, Number.MAX_SAFE_INTEGER, 0),
      productId,
      flashPrice: boundedInteger(item.flashPrice, `items.${index}.flashPrice`, 1, 2_000_000_000),
      quotaTotal,
      minQuantityPerOrder,
      maxQuantityPerOrder,
      maxQuantityPerBuyer: maxBuyerRaw,
      displayOrder: boundedInteger(item.displayOrder, `items.${index}.displayOrder`, 0, 65_535, index),
      featured: toBoolInt(item.featured),
      status: toBoolInt(item.status, 1),
      revision: boundedInteger(item.revision, `items.${index}.revision`, 0, 2_147_483_647, 0),
    };
  });
}

export function parseFlashSalePayload(payload: unknown): ParsedCampaign {
  const source = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  const code = requireText(source.code, 'code', 'Mã chiến dịch', 64).toUpperCase().replace(/\s+/g, '');
  if (!/^[A-Z0-9_-]{3,64}$/.test(code)) throw new AdminApiError(400, 'BAD_REQUEST', 'Mã chiến dịch chỉ gồm chữ in hoa, số, gạch ngang hoặc gạch dưới.', { code: 'invalid' });
  const name = requireText(source.name, 'name', 'Tên chiến dịch', 255);
  const slug = normalizeSlug(source.slug || name);
  if (!slug) throw new AdminApiError(400, 'BAD_REQUEST', 'Slug chiến dịch không hợp lệ.', { slug: 'invalid' });
  const startsAt = parseVietnamDateTime(source.startsAt, 'startsAt');
  const endsAt = parseVietnamDateTime(source.endsAt, 'endsAt');
  const countdownStartsAt = source.countdownStartsAt
    ? parseVietnamDateTime(source.countdownStartsAt, 'countdownStartsAt')
    : startsAt;
  if (endsAt <= startsAt) throw new AdminApiError(400, 'BAD_REQUEST', 'Thời gian kết thúc phải sau thời gian bắt đầu.', { endsAt: 'invalid_range' });
  if (countdownStartsAt > startsAt) throw new AdminApiError(400, 'BAD_REQUEST', 'Thời gian bắt đầu đếm ngược không được sau thời gian bắt đầu bán.', { countdownStartsAt: 'invalid_range' });
  const status = ['draft', 'published', 'paused', 'archived'].includes(String(source.status))
    ? String(source.status) as ParsedCampaign['status']
    : 'draft';
  const stackingMode = source.stackingMode === 'allow_voucher' ? 'allow_voucher' : 'exclusive';
  const audienceMode = source.audienceMode === 'authenticated' ? 'authenticated' : 'all';
  return {
    code,
    slug,
    name,
    description: maybeText(source.description, 10_000),
    internalNote: maybeText(source.internalNote, 10_000),
    status,
    stackingMode,
    audienceMode,
    countdownStartsAt,
    startsAt,
    endsAt,
    bannerDesktopUrl: maybeText(source.bannerDesktopUrl, 512),
    bannerMobileUrl: maybeText(source.bannerMobileUrl, 512),
    displayOrder: boundedInteger(source.displayOrder, 'displayOrder', 0, 65_535, 0),
    revision: boundedInteger(source.revision, 'revision', 0, 2_147_483_647, 0),
    items: parseItems(source.items),
  };
}

export function resolveFlashSaleState(
  status: ParsedCampaign['status'],
  startsAt: string,
  endsAt: string,
  now = new Date(),
): FlashSaleRuntimeState {
  if (status === 'draft') return 'draft';
  if (status === 'paused') return 'paused';
  if (status === 'archived') return 'archived';
  const start = new Date(publicIso(startsAt));
  const end = new Date(publicIso(endsAt));
  if (now < start) return 'scheduled';
  if (now >= end) return 'ended';
  return 'active';
}

export function flashSalesEnabled() {
  return process.env.FLASH_SALES_ENABLED === 'true';
}

export async function ensureFlashSaleTables(db: DbExecutor = pool) {
  await db.query(`CREATE TABLE IF NOT EXISTS web_admin_flash_sale_campaigns (
    id int unsigned NOT NULL AUTO_INCREMENT,
    code varchar(64) CHARACTER SET ascii NOT NULL,
    slug varchar(180) CHARACTER SET ascii NOT NULL,
    name varchar(255) NOT NULL,
    description text NULL,
    internal_note text NULL,
    status enum('draft','published','paused','archived') NOT NULL DEFAULT 'draft',
    stacking_mode enum('exclusive','allow_voucher') NOT NULL DEFAULT 'exclusive',
    audience_mode enum('all','authenticated') NOT NULL DEFAULT 'all',
    countdown_starts_at datetime NOT NULL,
    starts_at datetime NOT NULL,
    ends_at datetime NOT NULL,
    banner_desktop_url varchar(512) NOT NULL DEFAULT '',
    banner_mobile_url varchar(512) NOT NULL DEFAULT '',
    display_order smallint unsigned NOT NULL DEFAULT 0,
    revision int unsigned NOT NULL DEFAULT 1,
    created_by int NULL,
    updated_by int NULL,
    published_at datetime NULL,
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_web_admin_flash_sale_code (code),
    UNIQUE KEY uq_web_admin_flash_sale_slug (slug),
    KEY idx_web_admin_flash_sale_state_time (status,starts_at,ends_at),
    KEY idx_web_admin_flash_sale_display (status,display_order,id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await db.query(`CREATE TABLE IF NOT EXISTS web_admin_flash_sale_items (
    id bigint unsigned NOT NULL AUTO_INCREMENT,
    campaign_id int unsigned NOT NULL,
    product_id int unsigned NOT NULL,
    flash_price int unsigned NOT NULL,
    quota_total int unsigned NOT NULL,
    quota_reserved int unsigned NOT NULL DEFAULT 0,
    quota_sold int unsigned NOT NULL DEFAULT 0,
    min_quantity_per_order smallint unsigned NOT NULL DEFAULT 1,
    max_quantity_per_order smallint unsigned NOT NULL DEFAULT 1,
    max_quantity_per_buyer smallint unsigned NULL,
    display_order smallint unsigned NOT NULL DEFAULT 0,
    is_featured tinyint(1) NOT NULL DEFAULT 0,
    status tinyint(1) NOT NULL DEFAULT 1,
    revision int unsigned NOT NULL DEFAULT 1,
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_web_admin_flash_sale_item_product (campaign_id,product_id),
    KEY idx_web_admin_flash_sale_item_product_lookup (product_id,campaign_id),
    KEY idx_web_admin_flash_sale_item_display (campaign_id,status,display_order,id),
    CONSTRAINT fk_web_admin_flash_sale_item_campaign FOREIGN KEY (campaign_id) REFERENCES web_admin_flash_sale_campaigns(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await db.query(`CREATE TABLE IF NOT EXISTS web_admin_flash_sale_allocations (
    id bigint unsigned NOT NULL AUTO_INCREMENT,
    campaign_id int unsigned NOT NULL,
    item_id bigint unsigned NOT NULL,
    product_id int unsigned NOT NULL,
    order_id int NOT NULL,
    customer_id bigint unsigned NULL,
    buyer_key_hash binary(32) NOT NULL,
    quantity smallint unsigned NOT NULL,
    regular_price_snapshot int unsigned NOT NULL,
    flash_price_snapshot int unsigned NOT NULL,
    discount_snapshot int unsigned NOT NULL,
    status enum('reserved','consumed','released') NOT NULL DEFAULT 'reserved',
    reserved_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    consumed_at datetime NULL,
    released_at datetime NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_web_admin_flash_sale_allocation_order_item (order_id,item_id),
    KEY idx_web_admin_flash_sale_allocation_item_state (item_id,status,id),
    KEY idx_web_admin_flash_sale_allocation_campaign_state (campaign_id,status,id),
    KEY idx_web_admin_flash_sale_allocation_buyer (item_id,buyer_key_hash,status),
    CONSTRAINT fk_web_admin_flash_sale_allocation_campaign FOREIGN KEY (campaign_id) REFERENCES web_admin_flash_sale_campaigns(id),
    CONSTRAINT fk_web_admin_flash_sale_allocation_item FOREIGN KEY (item_id) REFERENCES web_admin_flash_sale_items(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await db.query(`CREATE TABLE IF NOT EXISTS web_admin_flash_sale_buyer_usage (
    item_id bigint unsigned NOT NULL,
    buyer_key_hash binary(32) NOT NULL,
    reserved_quantity int unsigned NOT NULL DEFAULT 0,
    consumed_quantity int unsigned NOT NULL DEFAULT 0,
    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (item_id,buyer_key_hash),
    CONSTRAINT fk_web_admin_flash_sale_usage_item FOREIGN KEY (item_id) REFERENCES web_admin_flash_sale_items(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}

function rowState(row: RowDataPacket) {
  return resolveFlashSaleState(row.status, databaseDateTime(row.starts_at), databaseDateTime(row.ends_at));
}

function campaignProjection(row: RowDataPacket) {
  return {
    id: Number(row.id), code: String(row.code), slug: String(row.slug), name: String(row.name),
    description: String(row.description || ''), internalNote: String(row.internal_note || ''), status: String(row.status),
    state: rowState(row), stackingMode: String(row.stacking_mode), audienceMode: String(row.audience_mode),
    countdownStartsAt: publicIso(row.countdown_starts_at), startsAt: publicIso(row.starts_at), endsAt: publicIso(row.ends_at),
    bannerDesktopUrl: String(row.banner_desktop_url || ''), bannerMobileUrl: String(row.banner_mobile_url || ''),
    displayOrder: Number(row.display_order || 0), revision: Number(row.revision || 0),
    itemCount: Number(row.item_count || 0), quotaTotal: Number(row.quota_total || 0), quotaReserved: Number(row.quota_reserved || 0),
    quotaSold: Number(row.quota_sold || 0), remainingQuantity: Math.max(0, Number(row.quota_total || 0) - Number(row.quota_reserved || 0) - Number(row.quota_sold || 0)),
  };
}

export async function listAdminFlashSales(requestUrl: string) {
  const params = new URL(requestUrl).searchParams;
  const page = Math.min(1_000, Math.max(1, toInt(params.get('page'), 1)));
  const limit = Math.min(100, Math.max(10, toInt(params.get('limit'), 25)));
  const state = String(params.get('state') || 'all');
  const query = String(params.get('q') || '').trim().slice(0, 100);
  const where: string[] = [];
  const bindings: unknown[] = [];
  if (query) { where.push('(c.code LIKE ? OR c.name LIKE ?)'); bindings.push(`%${query}%`, `%${query}%`); }
  if (state === 'draft' || state === 'paused' || state === 'archived') { where.push('c.status=?'); bindings.push(state); }
  if (state === 'active') where.push("c.status='published' AND c.starts_at<=UTC_TIMESTAMP() AND c.ends_at>UTC_TIMESTAMP()");
  if (state === 'scheduled') where.push("c.status='published' AND c.starts_at>UTC_TIMESTAMP()");
  if (state === 'ended') where.push("c.status='published' AND c.ends_at<=UTC_TIMESTAMP()");
  const predicate = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [[countRows], [rows], [summaryRows]] = await Promise.all([
    pool.query<RowDataPacket[]>(`SELECT COUNT(*) total FROM web_admin_flash_sale_campaigns c ${predicate}`, bindings),
    pool.query<RowDataPacket[]>(`SELECT c.*,COUNT(i.id) item_count,COALESCE(SUM(i.quota_total),0) quota_total,COALESCE(SUM(i.quota_reserved),0) quota_reserved,COALESCE(SUM(i.quota_sold),0) quota_sold
      FROM web_admin_flash_sale_campaigns c LEFT JOIN web_admin_flash_sale_items i ON i.campaign_id=c.id ${predicate}
      GROUP BY c.id ORDER BY c.id DESC LIMIT ? OFFSET ?`, [...bindings, limit, (page - 1) * limit]),
    pool.query<RowDataPacket[]>(`SELECT COUNT(*) total,
      SUM(status='published' AND starts_at<=UTC_TIMESTAMP() AND ends_at>UTC_TIMESTAMP()) active,
      SUM(status='published' AND starts_at>UTC_TIMESTAMP()) scheduled,
      SUM(status='draft') drafts FROM web_admin_flash_sale_campaigns`),
  ]);
  const total = Number(countRows[0]?.total || 0);
  return { items: rows.map(campaignProjection), pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }, summary: {
    total: Number(summaryRows[0]?.total || 0), active: Number(summaryRows[0]?.active || 0), scheduled: Number(summaryRows[0]?.scheduled || 0), drafts: Number(summaryRows[0]?.drafts || 0),
  } };
}

export async function getAdminFlashSale(id: number) {
  const [campaignRows] = await pool.query<RowDataPacket[]>('SELECT * FROM web_admin_flash_sale_campaigns WHERE id=? LIMIT 1', [id]);
  const row = campaignRows[0];
  if (!row) throw new AdminApiError(404, 'NOT_FOUND', 'Không tìm thấy chiến dịch Flash Sale.');
  const [items] = await pool.query<RowDataPacket[]>(`SELECT i.*,p.storeSKU,p.proName,p.proThum,pr.price regular_price,pr.market_price,pr.isOn
    FROM web_admin_flash_sale_items i JOIN idv_sell_product_store p ON p.id=i.product_id
    LEFT JOIN idv_sell_product_price pr ON pr.id=p.id WHERE i.campaign_id=? ORDER BY i.display_order,i.id`, [id]);
  return { ...campaignProjection(row), items: items.map((item) => ({
    id: Number(item.id), productId: Number(item.product_id), sku: String(item.storeSKU || ''), name: String(item.proName || ''),
    thumbnail: resolveProductImageUrl(item.proThum, ''), regularPrice: Number(item.regular_price || 0), marketPrice: Number(item.market_price || 0),
    sellable: Number(item.isOn) === 1 && Number(item.regular_price) > 0, flashPrice: Number(item.flash_price), quotaTotal: Number(item.quota_total),
    quotaReserved: Number(item.quota_reserved), quotaSold: Number(item.quota_sold), remainingQuantity: Math.max(0, Number(item.quota_total) - Number(item.quota_reserved) - Number(item.quota_sold)),
    minQuantityPerOrder: Number(item.min_quantity_per_order), maxQuantityPerOrder: Number(item.max_quantity_per_order),
    maxQuantityPerBuyer: item.max_quantity_per_buyer === null ? null : Number(item.max_quantity_per_buyer), displayOrder: Number(item.display_order),
    featured: Boolean(item.is_featured), status: Boolean(item.status), revision: Number(item.revision),
  })) };
}

async function validatePublish(connection: PoolConnection, campaignId: number, value: ParsedCampaign) {
  if (value.items.length === 0) throw new AdminApiError(400, 'BAD_REQUEST', 'Cần ít nhất một SKU trước khi xuất bản.', { items: 'required' });
  const ids = value.items.map((item) => item.productId);
  const [products] = await connection.query<RowDataPacket[]>(`SELECT p.id,p.proName,pr.price,pr.isOn FROM idv_sell_product_store p
    LEFT JOIN idv_sell_product_price pr ON pr.id=p.id WHERE p.id IN (?) FOR UPDATE`, [ids]);
  const byId = new Map(products.map((row) => [Number(row.id), row]));
  for (const [index, item] of value.items.entries()) {
    const product = byId.get(item.productId);
    if (!product || Number(product.isOn) !== 1 || Number(product.price) <= 0) throw new AdminApiError(400, 'BAD_REQUEST', `SKU tại dòng ${index + 1} không còn bán.`, { [`items.${index}.productId`]: 'not_sellable' });
    if (item.flashPrice >= Number(product.price)) throw new AdminApiError(400, 'BAD_REQUEST', `Giá Flash Sale tại dòng ${index + 1} phải thấp hơn giá hiện tại.`, { [`items.${index}.flashPrice`]: 'not_discounted' });
  }
  const [conflicts] = await connection.query<RowDataPacket[]>(`SELECT DISTINCT i.product_id,c.code,c.name FROM web_admin_flash_sale_items i
    JOIN web_admin_flash_sale_campaigns c ON c.id=i.campaign_id
    WHERE i.product_id IN (?) AND i.status=1 AND c.status='published' AND c.id<>?
      AND c.starts_at<? AND c.ends_at>? LIMIT 20 FOR UPDATE`, [ids, campaignId, value.endsAt, value.startsAt]);
  if (conflicts.length) throw new AdminApiError(409, 'CONFLICT', `Có ${conflicts.length} SKU trùng lịch với chiến dịch đã xuất bản.`, { items: 'schedule_conflict' });
}

export async function saveAdminFlashSale(payload: unknown, actorId: number, id = 0) {
  const value = parseFlashSalePayload(payload);
  return withTransaction(async (connection) => {
    let campaignId = id;
    if (campaignId) {
      const [currentRows] = await connection.query<RowDataPacket[]>('SELECT id,revision,status FROM web_admin_flash_sale_campaigns WHERE id=? FOR UPDATE', [campaignId]);
      const current = currentRows[0];
      if (!current) throw new AdminApiError(404, 'NOT_FOUND', 'Không tìm thấy chiến dịch Flash Sale.');
      if (Number(current.revision) !== value.revision) throw new AdminApiError(409, 'CONFLICT', 'Chiến dịch đã được người khác cập nhật. Hãy tải lại dữ liệu.');
      // Status transitions are intentionally kept behind the dedicated publish/pause
      // routes so an update permission cannot be used to bypass publish permission.
      value.status = String(current.status) as ParsedCampaign['status'];
    } else {
      value.status = 'draft';
    }
    if (value.status === 'published') await validatePublish(connection, campaignId, value);
    try {
      if (campaignId) {
        await connection.query(`UPDATE web_admin_flash_sale_campaigns SET code=?,slug=?,name=?,description=?,internal_note=?,status=?,stacking_mode=?,audience_mode=?,countdown_starts_at=?,starts_at=?,ends_at=?,banner_desktop_url=?,banner_mobile_url=?,display_order=?,revision=revision+1,updated_by=?,published_at=IF(?='published',COALESCE(published_at,UTC_TIMESTAMP()),published_at) WHERE id=?`,
          [value.code,value.slug,value.name,value.description||null,value.internalNote||null,value.status,value.stackingMode,value.audienceMode,value.countdownStartsAt,value.startsAt,value.endsAt,value.bannerDesktopUrl,value.bannerMobileUrl,value.displayOrder,actorId,value.status,campaignId]);
      } else {
        const [result] = await connection.query<ResultSetHeader>(`INSERT INTO web_admin_flash_sale_campaigns(code,slug,name,description,internal_note,status,stacking_mode,audience_mode,countdown_starts_at,starts_at,ends_at,banner_desktop_url,banner_mobile_url,display_order,created_by,updated_by,published_at)
          VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,IF(?='published',UTC_TIMESTAMP(),NULL))`, [value.code,value.slug,value.name,value.description||null,value.internalNote||null,value.status,value.stackingMode,value.audienceMode,value.countdownStartsAt,value.startsAt,value.endsAt,value.bannerDesktopUrl,value.bannerMobileUrl,value.displayOrder,actorId,actorId,value.status]);
        campaignId = Number(result.insertId);
      }
    } catch (error: any) {
      if (error?.code === 'ER_DUP_ENTRY') throw new AdminApiError(409, 'CONFLICT', 'Mã hoặc slug chiến dịch đã tồn tại.', { code: 'duplicate' });
      throw error;
    }
    const [existing] = await connection.query<RowDataPacket[]>('SELECT * FROM web_admin_flash_sale_items WHERE campaign_id=? FOR UPDATE', [campaignId]);
    const existingById = new Map(existing.map((row) => [Number(row.id), row]));
    const retained = new Set<number>();
    for (const item of value.items) {
      const current = item.id ? existingById.get(item.id) : undefined;
      if (item.id && !current) throw new AdminApiError(409, 'CONFLICT', 'Danh sách SKU đã thay đổi. Hãy tải lại chiến dịch.');
      if (current) {
        if (Number(current.revision) !== item.revision) throw new AdminApiError(409, 'CONFLICT', `SKU #${item.productId} đã được cập nhật ở nơi khác.`);
        if (item.quotaTotal < Number(current.quota_reserved) + Number(current.quota_sold)) throw new AdminApiError(409, 'CONFLICT', `Quota SKU #${item.productId} thấp hơn số đã giữ/đã bán.`);
        await connection.query(`UPDATE web_admin_flash_sale_items SET product_id=?,flash_price=?,quota_total=?,min_quantity_per_order=?,max_quantity_per_order=?,max_quantity_per_buyer=?,display_order=?,is_featured=?,status=?,revision=revision+1 WHERE id=?`,
          [item.productId,item.flashPrice,item.quotaTotal,item.minQuantityPerOrder,item.maxQuantityPerOrder,item.maxQuantityPerBuyer,item.displayOrder,item.featured,item.status,item.id]);
        retained.add(item.id);
      } else {
        const [result] = await connection.query<ResultSetHeader>(`INSERT INTO web_admin_flash_sale_items(campaign_id,product_id,flash_price,quota_total,min_quantity_per_order,max_quantity_per_order,max_quantity_per_buyer,display_order,is_featured,status) VALUES(?,?,?,?,?,?,?,?,?,?)`,
          [campaignId,item.productId,item.flashPrice,item.quotaTotal,item.minQuantityPerOrder,item.maxQuantityPerOrder,item.maxQuantityPerBuyer,item.displayOrder,item.featured,item.status]);
        retained.add(Number(result.insertId));
      }
    }
    for (const current of existing) {
      if (retained.has(Number(current.id))) continue;
      if (Number(current.quota_reserved) > 0 || Number(current.quota_sold) > 0) throw new AdminApiError(409, 'CONFLICT', `Không thể xóa SKU #${current.product_id} đã phát sinh giao dịch.`);
      await connection.query('DELETE FROM web_admin_flash_sale_items WHERE id=?', [Number(current.id)]);
    }
    return getAdminFlashSaleWithDb(connection, campaignId);
  });
}

async function getAdminFlashSaleWithDb(db: DbExecutor, id: number) {
  const [rows] = await db.query<RowDataPacket[]>('SELECT * FROM web_admin_flash_sale_campaigns WHERE id=? LIMIT 1', [id]);
  const campaign = rows[0];
  if (!campaign) throw new AdminApiError(404, 'NOT_FOUND', 'Không tìm thấy chiến dịch Flash Sale.');
  const [items] = await db.query<RowDataPacket[]>(`SELECT i.*,p.storeSKU,p.proName,pr.price regular_price,pr.market_price,pr.isOn
    FROM web_admin_flash_sale_items i
    LEFT JOIN idv_sell_product_store p ON p.id=i.product_id
    LEFT JOIN idv_sell_product_price pr ON pr.id=i.product_id
    WHERE i.campaign_id=? ORDER BY i.display_order,i.id`, [id]);
  return { ...campaignProjection(campaign), items: items.map((item) => ({ id:Number(item.id),productId:Number(item.product_id),sku:String(item.storeSKU||''),name:String(item.proName||''),regularPrice:Number(item.regular_price||0),marketPrice:Number(item.market_price||0),sellable:Number(item.isOn)===1,flashPrice:Number(item.flash_price),quotaTotal:Number(item.quota_total),quotaReserved:Number(item.quota_reserved),quotaSold:Number(item.quota_sold),remainingQuantity:Math.max(0,Number(item.quota_total)-Number(item.quota_reserved)-Number(item.quota_sold)),minQuantityPerOrder:Number(item.min_quantity_per_order),maxQuantityPerOrder:Number(item.max_quantity_per_order),maxQuantityPerBuyer:item.max_quantity_per_buyer===null?null:Number(item.max_quantity_per_buyer),displayOrder:Number(item.display_order),featured:Boolean(item.is_featured),status:Boolean(item.status),revision:Number(item.revision) })) };
}

export async function setAdminFlashSaleStatus(id: number, next: 'published' | 'paused' | 'archived', actorId: number) {
  return withTransaction(async (connection) => {
    const [rows] = await connection.query<RowDataPacket[]>('SELECT * FROM web_admin_flash_sale_campaigns WHERE id=? FOR UPDATE', [id]);
    const row = rows[0];
    if (!row) throw new AdminApiError(404, 'NOT_FOUND', 'Không tìm thấy chiến dịch Flash Sale.');
    if (next === 'published') {
      const [itemRows] = await connection.query<RowDataPacket[]>(
        'SELECT * FROM web_admin_flash_sale_items WHERE campaign_id=? ORDER BY display_order,id FOR UPDATE',
        [id],
      );
      // These values are already stored as UTC DATETIME. Reusing them directly avoids
      // interpreting them as Vietnam-local form input for a second time when publishing.
      const parsed: ParsedCampaign = {
        code: String(row.code),
        slug: String(row.slug),
        name: String(row.name),
        description: String(row.description || ''),
        internalNote: String(row.internal_note || ''),
        status: 'published',
        stackingMode: row.stacking_mode === 'allow_voucher' ? 'allow_voucher' : 'exclusive',
        audienceMode: row.audience_mode === 'authenticated' ? 'authenticated' : 'all',
        countdownStartsAt: databaseDateTime(row.countdown_starts_at),
        startsAt: databaseDateTime(row.starts_at),
        endsAt: databaseDateTime(row.ends_at),
        bannerDesktopUrl: String(row.banner_desktop_url || ''),
        bannerMobileUrl: String(row.banner_mobile_url || ''),
        displayOrder: Number(row.display_order || 0),
        revision: Number(row.revision || 0),
        items: itemRows.map((item) => ({
          id: Number(item.id),
          productId: Number(item.product_id),
          flashPrice: Number(item.flash_price),
          quotaTotal: Number(item.quota_total),
          minQuantityPerOrder: Number(item.min_quantity_per_order),
          maxQuantityPerOrder: Number(item.max_quantity_per_order),
          maxQuantityPerBuyer: item.max_quantity_per_buyer === null ? null : Number(item.max_quantity_per_buyer),
          displayOrder: Number(item.display_order),
          featured: Number(item.is_featured),
          status: Number(item.status),
          revision: Number(item.revision),
        })),
      };
      await validatePublish(connection, id, parsed);
    }
    await connection.query("UPDATE web_admin_flash_sale_campaigns SET status=?,revision=revision+1,updated_by=?,published_at=IF(?='published',COALESCE(published_at,UTC_TIMESTAMP()),published_at) WHERE id=?", [next,actorId,next,id]);
    return getAdminFlashSaleWithDb(connection,id);
  });
}

export async function resolveActiveFlashSaleOffers(productIds: number[], db: DbExecutor = pool, lock = false) {
  const ids = Array.from(new Set(productIds.filter((id) => Number.isInteger(id) && id > 0))).slice(0, 100);
  const offers = new Map<number, FlashSaleOffer>();
  if (!flashSalesEnabled() || ids.length === 0) return offers;
  const [rows] = await db.query<RowDataPacket[]>(`SELECT i.id item_id,i.product_id,i.flash_price,i.quota_total,i.quota_reserved,i.quota_sold,i.min_quantity_per_order,i.max_quantity_per_order,i.max_quantity_per_buyer,
      c.id campaign_id,c.code campaign_code,c.slug campaign_slug,c.name campaign_name,c.stacking_mode,c.audience_mode,c.starts_at,c.ends_at,pr.price regular_price
    FROM web_admin_flash_sale_items i JOIN web_admin_flash_sale_campaigns c ON c.id=i.campaign_id
    JOIN idv_sell_product_price pr ON pr.id=i.product_id AND pr.isOn=1 AND pr.price>0
    WHERE i.product_id IN (?) AND i.status=1 AND c.status='published' AND c.starts_at<=UTC_TIMESTAMP() AND c.ends_at>UTC_TIMESTAMP()
    ORDER BY i.id ${lock ? 'FOR UPDATE' : ''}`, [ids]);
  for (const row of rows) {
    const productId = Number(row.product_id);
    if (offers.has(productId)) continue;
    const remainingQuantity = Math.max(0, Number(row.quota_total) - Number(row.quota_reserved) - Number(row.quota_sold));
    const regularPrice = Math.round(Number(row.regular_price || 0));
    const flashPrice = Math.round(Number(row.flash_price || 0));
    if (flashPrice <= 0 || flashPrice >= regularPrice) continue;
    offers.set(productId, { campaignId:Number(row.campaign_id),campaignCode:String(row.campaign_code),campaignSlug:String(row.campaign_slug),campaignName:String(row.campaign_name),itemId:Number(row.item_id),productId,flashPrice,regularPrice,quotaTotal:Number(row.quota_total),quotaReserved:Number(row.quota_reserved),quotaSold:Number(row.quota_sold),remainingQuantity,minQuantityPerOrder:Number(row.min_quantity_per_order),maxQuantityPerOrder:Number(row.max_quantity_per_order),maxQuantityPerBuyer:row.max_quantity_per_buyer===null?null:Number(row.max_quantity_per_buyer),stackingMode:row.stacking_mode==='allow_voucher'?'allow_voucher':'exclusive',audienceMode:row.audience_mode==='authenticated'?'authenticated':'all',startsAt:publicIso(row.starts_at),endsAt:publicIso(row.ends_at) });
  }
  return offers;
}

export async function decorateProductCardsWithFlashSales<T extends { id: number; price?: number; marketPrice?: number }>(products: T[]) {
  if (!flashSalesEnabled() || products.length === 0) return products;
  const offers = await resolveActiveFlashSaleOffers(products.map((product) => Number(product.id)));
  return products.map((product) => {
    const offer = offers.get(Number(product.id));
    if (!offer) return product;
    return {
      ...product,
      price: offer.flashPrice,
      marketPrice: Math.max(Number(product.marketPrice || 0), offer.regularPrice),
      flashSale: {
        campaignId: offer.campaignId,
        campaignSlug: offer.campaignSlug,
        endsAt: offer.endsAt,
        quotaTotal: offer.quotaTotal,
        remainingQuantity: offer.remainingQuantity,
        maxQuantityPerOrder: offer.maxQuantityPerOrder,
      },
    };
  });
}

function buyerHash(customerId: number | null, phone: string) {
  const secret = process.env.FLASH_SALE_BUYER_HASH_SECRET || process.env.NEXTAUTH_SECRET || '';
  if (!secret) throw new PublicRequestError(503, 'FLASH_SALE_CONFIGURATION_ERROR', 'Flash Sale tạm thời chưa khả dụng.');
  const phoneDigits = String(phone || '').replace(/\D/g, '');
  if (!customerId && (phoneDigits.length < 9 || phoneDigits.length > 11)) throw new PublicRequestError(400, 'FLASH_SALE_BUYER_REQUIRED', 'Cần số điện thoại hợp lệ để mua Flash Sale.');
  const identity = customerId ? `customer:${customerId}` : `phone:${phoneDigits}`;
  return crypto.createHmac('sha256', secret).update(identity).digest();
}

export async function reserveFlashSalesForOrder(connection: PoolConnection, items: FlashSaleQuotedItem[], orderId: number, customerId: number | null, phone: string) {
  const flashItems = items.filter((item) => item.available && item.flashSale);
  if (!flashItems.length) return [];
  const hash = buyerHash(customerId, phone);
  const allocations: Array<{ itemId: number; quantity: number }> = [];
  for (const quoted of flashItems.sort((a,b) => Number(a.flashSale!.itemId) - Number(b.flashSale!.itemId))) {
    const offer = quoted.flashSale!;
    if (offer.audienceMode === 'authenticated' && !customerId) throw new PublicRequestError(401, 'FLASH_SALE_LOGIN_REQUIRED', 'Vui lòng đăng nhập để mua sản phẩm Flash Sale này.');
    if (quoted.quantity < offer.minQuantityPerOrder || quoted.quantity > offer.maxQuantityPerOrder) throw new PublicRequestError(409, 'FLASH_SALE_LIMIT_EXCEEDED', `Sản phẩm ${quoted.productId} chỉ áp dụng từ ${offer.minQuantityPerOrder} đến ${offer.maxQuantityPerOrder} sản phẩm mỗi đơn.`);
    await connection.query(
      'INSERT IGNORE INTO web_admin_flash_sale_buyer_usage(item_id,buyer_key_hash,reserved_quantity,consumed_quantity) VALUES(?,?,0,0)',
      [offer.itemId, hash],
    );
    const [usageRows] = await connection.query<RowDataPacket[]>('SELECT reserved_quantity,consumed_quantity FROM web_admin_flash_sale_buyer_usage WHERE item_id=? AND buyer_key_hash=? FOR UPDATE', [offer.itemId, hash]);
    const used = Number(usageRows[0]?.reserved_quantity || 0) + Number(usageRows[0]?.consumed_quantity || 0);
    if (offer.maxQuantityPerBuyer !== null && used + quoted.quantity > offer.maxQuantityPerBuyer) throw new PublicRequestError(409, 'FLASH_SALE_BUYER_LIMIT_EXCEEDED', 'Bạn đã đạt giới hạn mua Flash Sale cho sản phẩm này.');
    const [result] = await connection.query<ResultSetHeader>(`UPDATE web_admin_flash_sale_items SET quota_reserved=quota_reserved+? WHERE id=? AND status=1 AND quota_total-quota_reserved-quota_sold>=?`, [quoted.quantity,offer.itemId,quoted.quantity]);
    if (result.affectedRows !== 1) throw new PublicRequestError(409, 'FLASH_SALE_SOLD_OUT', 'Sản phẩm Flash Sale vừa hết suất. Vui lòng cập nhật giỏ hàng.');
    await connection.query('UPDATE web_admin_flash_sale_buyer_usage SET reserved_quantity=reserved_quantity+? WHERE item_id=? AND buyer_key_hash=?', [quoted.quantity,offer.itemId,hash]);
    await connection.query(`INSERT INTO web_admin_flash_sale_allocations(campaign_id,item_id,product_id,order_id,customer_id,buyer_key_hash,quantity,regular_price_snapshot,flash_price_snapshot,discount_snapshot) VALUES(?,?,?,?,?,?,?,?,?,?)`, [offer.campaignId,offer.itemId,offer.productId,orderId,customerId,hash,quoted.quantity,offer.regularPrice,offer.flashPrice,Math.max(0,offer.regularPrice-offer.flashPrice)*quoted.quantity]);
    allocations.push({ itemId: offer.itemId, quantity: quoted.quantity });
  }
  return allocations;
}

export async function transitionFlashSaleAllocations(connection: PoolConnection, orderId: number, next: 'consumed' | 'released') {
  const [rows] = await connection.query<RowDataPacket[]>(`SELECT * FROM web_admin_flash_sale_allocations WHERE order_id=? AND status='reserved' ORDER BY item_id FOR UPDATE`, [orderId]);
  for (const row of rows) {
    const quantity = Number(row.quantity);
    const [itemRows] = await connection.query<RowDataPacket[]>('SELECT id FROM web_admin_flash_sale_items WHERE id=? FOR UPDATE', [Number(row.item_id)]);
    if (!itemRows[0]) throw new PublicRequestError(409, 'FLASH_SALE_ALLOCATION_INVALID', 'Không thể cập nhật phân bổ Flash Sale.');
    if (next === 'consumed') {
      const [itemResult] = await connection.query<ResultSetHeader>('UPDATE web_admin_flash_sale_items SET quota_reserved=quota_reserved-?,quota_sold=quota_sold+? WHERE id=? AND quota_reserved>=?', [quantity,quantity,Number(row.item_id),quantity]);
      const [usageResult] = await connection.query<ResultSetHeader>('UPDATE web_admin_flash_sale_buyer_usage SET reserved_quantity=reserved_quantity-?,consumed_quantity=consumed_quantity+? WHERE item_id=? AND buyer_key_hash=? AND reserved_quantity>=?', [quantity,quantity,Number(row.item_id),row.buyer_key_hash,quantity]);
      if (itemResult.affectedRows !== 1 || usageResult.affectedRows !== 1) throw new PublicRequestError(409, 'FLASH_SALE_ALLOCATION_INVALID', 'Phân bổ Flash Sale không còn nhất quán.');
      await connection.query("UPDATE web_admin_flash_sale_allocations SET status='consumed',consumed_at=UTC_TIMESTAMP() WHERE id=? AND status='reserved'", [Number(row.id)]);
    } else {
      const [itemResult] = await connection.query<ResultSetHeader>('UPDATE web_admin_flash_sale_items SET quota_reserved=quota_reserved-? WHERE id=? AND quota_reserved>=?', [quantity,Number(row.item_id),quantity]);
      const [usageResult] = await connection.query<ResultSetHeader>('UPDATE web_admin_flash_sale_buyer_usage SET reserved_quantity=reserved_quantity-? WHERE item_id=? AND buyer_key_hash=? AND reserved_quantity>=?', [quantity,Number(row.item_id),row.buyer_key_hash,quantity]);
      if (itemResult.affectedRows !== 1 || usageResult.affectedRows !== 1) throw new PublicRequestError(409, 'FLASH_SALE_ALLOCATION_INVALID', 'Phân bổ Flash Sale không còn nhất quán.');
      await connection.query("UPDATE web_admin_flash_sale_allocations SET status='released',released_at=UTC_TIMESTAMP() WHERE id=? AND status='reserved'", [Number(row.id)]);
    }
  }
  return rows.length;
}

export async function getPublicFlashSales() {
  const serverNow = new Date().toISOString();
  if (!flashSalesEnabled()) return { enabled: false, serverNow, campaigns: [] };
  const [campaigns] = await pool.query<RowDataPacket[]>(`SELECT * FROM web_admin_flash_sale_campaigns
    WHERE status='published' AND countdown_starts_at<=UTC_TIMESTAMP() AND ends_at>UTC_TIMESTAMP()
    ORDER BY starts_at<=UTC_TIMESTAMP() DESC,display_order,id LIMIT 12`);
  if (!campaigns.length) return { enabled: true, serverNow, campaigns: [] };
  const ids = campaigns.map((row) => Number(row.id));
  const [items] = await pool.query<RowDataPacket[]>(`SELECT i.*,p.storeSKU,p.proName,p.proThum,pr.price regular_price,pr.market_price,u.request_path slug
    FROM web_admin_flash_sale_items i JOIN idv_sell_product_store p ON p.id=i.product_id
    JOIN idv_sell_product_price pr ON pr.id=p.id AND pr.isOn=1 AND pr.price>0
    LEFT JOIN idv_url u ON u.id_path=CONCAT('module:product/view:product-detail/view_id:',p.id)
    WHERE i.campaign_id IN (?) AND i.status=1 ORDER BY i.is_featured DESC,i.display_order,i.id LIMIT ?`, [ids,PUBLIC_ITEM_LIMIT]);
  const byCampaign = new Map<number, unknown[]>();
  for (const row of items) {
    const regularPrice = Math.round(Number(row.regular_price || 0));
    const flashPrice = Math.round(Number(row.flash_price || 0));
    if (flashPrice <= 0 || flashPrice >= regularPrice) continue;
    const campaignItems = byCampaign.get(Number(row.campaign_id)) || [];
    campaignItems.push({ id:Number(row.id),productId:Number(row.product_id),sku:String(row.storeSKU||''),name:String(row.proName||''),slug:String(row.slug||`product-${row.product_id}`).replace(/^\/+/,''),thumbnail:resolveProductImageUrl(row.proThum,''),regularPrice,marketPrice:Number(row.market_price||0),flashPrice,quotaTotal:Number(row.quota_total),quotaReserved:Number(row.quota_reserved),quotaSold:Number(row.quota_sold),remainingQuantity:Math.max(0,Number(row.quota_total)-Number(row.quota_reserved)-Number(row.quota_sold)),minQuantityPerOrder:Number(row.min_quantity_per_order),maxQuantityPerOrder:Number(row.max_quantity_per_order),featured:Boolean(row.is_featured) });
    byCampaign.set(Number(row.campaign_id),campaignItems);
  }
  return { enabled: true, serverNow, campaigns: campaigns.map((row) => ({ id:Number(row.id),code:String(row.code),slug:String(row.slug),name:String(row.name),description:String(row.description||''),state:rowState(row),stackingMode:String(row.stacking_mode),countdownStartsAt:publicIso(row.countdown_starts_at),startsAt:publicIso(row.starts_at),endsAt:publicIso(row.ends_at),bannerDesktopUrl:String(row.banner_desktop_url||''),bannerMobileUrl:String(row.banner_mobile_url||''),items:byCampaign.get(Number(row.id))||[] })) };
}
