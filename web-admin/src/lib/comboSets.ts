import { createHash } from 'crypto';
import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';
// @ts-ignore php-serialize does not publish TypeScript declarations.
import { serialize, unserialize } from 'php-serialize';
import pool from '@/lib/db';
import { AdminApiError, withTransaction } from '@/lib/admin/common';
import { PublicRequestError } from '@/lib/publicRequest';
import { clearPublicCatalogDetailCache } from '@/lib/publicProductCache';
import { resolveProductImageUrl } from '@/lib/productImageUrl';

type DbExecutor = Pool | PoolConnection;

export type ComboDiscountType = 'fixed' | 'percent';
export type ComboProductConfig = {
  title: string;
  productId: number;
  discount: number;
  discountType: ComboDiscountType;
};
export type ComboGroupConfig = { title: string; products: ComboProductConfig[] };

export type ComboGroupSummary = {
  groupIndex: number;
  title: string;
  productCount: number;
  image: string;
  discountLabel: string;
};

export type PublicComboSetSummary = {
  id: number;
  title: string;
  revision: string;
  ordering: number;
  groups: ComboGroupSummary[];
};

const comboProductInputSchema = z.object({
  title: z.string().trim().max(255).default(''),
  productId: z.coerce.number().int().positive(),
  discount: z.coerce.number().finite().min(0).max(1_000_000_000),
  discountType: z.enum(['fixed', 'percent']),
}).strict().superRefine((value, context) => {
  if (value.discountType === 'percent' && value.discount > 100) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['discount'], message: 'Phần trăm giảm phải từ 0 đến 100.' });
  }
});

const comboGroupInputSchema = z.object({
  title: z.string().trim().max(255).default(''),
  products: z.array(comboProductInputSchema).max(100),
}).strict().superRefine((value, context) => {
  const seen = new Set<number>();
  value.products.forEach((product, index) => {
    if (seen.has(product.productId)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['products', index, 'productId'], message: 'Sản phẩm bị trùng trong nhóm.' });
    }
    seen.add(product.productId);
  });
});

export const adminComboSetSchema = z.object({
  title: z.string().trim().min(1, 'Tên combo không được để trống.').max(255),
  description: z.string().max(20_000).optional().default(''),
  status: z.coerce.number().int().min(0).max(1),
  fromTime: z.coerce.number().int().min(0),
  toTime: z.coerce.number().int().min(0),
  groups: z.array(comboGroupInputSchema).max(20),
}).strict().superRefine((value, context) => {
  const productCount = value.groups.reduce((total, group) => total + group.products.length, 0);
  if (productCount > 250) context.addIssue({ code: z.ZodIssueCode.custom, path: ['groups'], message: 'Combo chỉ được chứa tối đa 250 sản phẩm.' });
  if (value.fromTime > 0 && value.toTime > 0 && value.fromTime >= value.toTime) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['toTime'], message: 'Thời gian kết thúc phải sau thời gian bắt đầu.' });
  }
});

export const comboQuoteSchema = z.object({
  anchorProductId: z.coerce.number().int().positive(),
  comboSetId: z.coerce.number().int().positive(),
  revision: z.string().trim().min(8).max(64),
  items: z.array(z.object({
    groupIndex: z.coerce.number().int().min(0).max(19),
    productId: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().min(1).max(99),
  }).strict()).min(1).max(50),
}).strict();

export type ComboQuoteInput = z.infer<typeof comboQuoteSchema>;

function normalizeDiscountType(value: unknown): ComboDiscountType {
  return value === 'percent' ? 'percent' : 'fixed';
}

export function parseLegacyComboConfig(raw: unknown): ComboGroupConfig[] {
  if (!raw) return [];
  let parsed: unknown;
  try { parsed = unserialize(String(raw)); } catch { return []; }
  return Object.values((parsed || {}) as Record<string, unknown>).slice(0, 20).map((groupValue) => {
    const group = (groupValue || {}) as Record<string, unknown>;
    const products = Object.values((group.suggest_list || {}) as Record<string, unknown>).slice(0, 100).map((productValue) => {
      const product = (productValue || {}) as Record<string, unknown>;
      return {
        title: String(product.title || '').trim().slice(0, 255),
        productId: Number(product.real_id || 0),
        discount: Math.max(0, Number(product.discount || 0)),
        discountType: normalizeDiscountType(product.discount_type),
      };
    }).filter((product) => Number.isInteger(product.productId) && product.productId > 0);
    return { title: String(group.title || '').trim().slice(0, 255), products };
  });
}

export function serializeLegacyComboConfig(groups: ComboGroupConfig[]) {
  return serialize(groups.map((group) => ({
    title: group.title,
    suggest_list: group.products.map((product) => ({
      title: product.title,
      real_id: String(product.productId),
      discount: String(product.discount),
      discount_type: product.discountType === 'percent' ? 'percent' : 'number',
    })),
  })));
}

function comboRevision(config: unknown) {
  return createHash('sha256').update(String(config || '')).digest('hex').slice(0, 20);
}

function isComboActive(row: Record<string, unknown>, now = Math.floor(Date.now() / 1000)) {
  return Number(row.status) === 1 && (Number(row.from_time || 0) === 0 || Number(row.from_time) <= now) &&
    (Number(row.to_time || 0) === 0 || Number(row.to_time) >= now);
}

function productImage(thumbnail: unknown) {
  return resolveProductImageUrl(thumbnail, 'https://placehold.co/300x300/111115/71717a?text=HACOM');
}

function discountLabel(products: ComboProductConfig[]) {
  const positive = products.filter((product) => product.discount > 0);
  if (!positive.length) return 'Giá mua kèm';
  const types = new Set(positive.map((product) => product.discountType));
  if (types.size > 1) return 'Ưu đãi theo sản phẩm';
  const maximum = Math.max(...positive.map((product) => product.discount));
  return positive[0].discountType === 'percent'
    ? `Giảm thêm ${maximum}%`
    : `Giảm tối đa ${new Intl.NumberFormat('vi-VN').format(maximum)}đ`;
}

export function calculateComboUnitDiscount(price: number, config: Pick<ComboProductConfig, 'discount' | 'discountType'>) {
  const safePrice = Math.max(0, Math.round(Number(price) || 0));
  const requested = config.discountType === 'percent'
    ? Math.round(safePrice * Math.max(0, Number(config.discount) || 0) / 100)
    : Math.round(Math.max(0, Number(config.discount) || 0));
  return Math.min(safePrice, requested);
}

export function pickHighestComboProduct<T extends { price: number; configIndex: number }>(items: T[]) {
  return [...items].sort((a, b) => b.price - a.price || a.configIndex - b.configIndex)[0];
}

async function getProductRows(db: DbExecutor, productIds: number[], lock = false) {
  const uniqueIds = Array.from(new Set(productIds.filter((id) => Number.isInteger(id) && id > 0)));
  if (!uniqueIds.length) return new Map<number, RowDataPacket>();
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT p.id,p.proName,p.storeSKU,p.proThum,pr.price,pr.market_price,pr.isOn,b.name AS brandName,u.request_path AS slug
    FROM idv_sell_product_store p
    LEFT JOIN idv_sell_product_price pr ON pr.id=p.id
    LEFT JOIN idv_brand b ON b.id=p.brandId
    LEFT JOIN idv_url u ON u.id_path=CONCAT('module:product/view:product-detail/view_id:',p.id)
    WHERE p.id IN (?) ${lock ? 'FOR UPDATE' : ''}
  `, [uniqueIds]);
  return new Map(rows.map((row) => [Number(row.id), row]));
}

function isSellableProduct(row: RowDataPacket | undefined) {
  return Boolean(row && Number(row.isOn) === 1 && Number(row.price || 0) > 0);
}

export async function getPublicComboSetSummaries(anchorProductId: number): Promise<PublicComboSetSummary[]> {
  const [setRows] = await pool.query<RowDataPacket[]>(`
    SELECT cs.id,cs.title,cs.config,cs.status,cs.from_time,cs.to_time,csp.ordering
    FROM combo_set_product csp JOIN combo_set cs ON cs.id=csp.set_id
    WHERE csp.product_id=?
    ORDER BY csp.ordering ASC,cs.id DESC
  `, [anchorProductId]);
  const active = setRows.filter((row) => isComboActive(row));
  const parsed = active.map((row) => ({ row, groups: parseLegacyComboConfig(row.config) }));
  const productRows = await getProductRows(pool, parsed.flatMap((entry) => entry.groups.flatMap((group) => group.products.map((product) => product.productId))));

  return parsed.map(({ row, groups }) => ({
    id: Number(row.id),
    title: String(row.title || `Combo #${row.id}`),
    revision: comboRevision(row.config),
    ordering: Number(row.ordering || 0),
    groups: groups.map((group, groupIndex) => {
      const validProducts = group.products.filter((product) => isSellableProduct(productRows.get(product.productId)));
      const preview = validProducts.length ? productRows.get(validProducts[0].productId) : undefined;
      return {
        groupIndex,
        title: group.title || `Nhóm sản phẩm ${groupIndex + 1}`,
        productCount: validProducts.length,
        image: productImage(preview?.proThum),
        discountLabel: discountLabel(validProducts),
      };
    }).filter((group) => group.productCount > 0),
  })).filter((set) => set.groups.length > 0);
}

async function getValidatedComboSet(db: DbExecutor, setId: number, anchorProductId: number, revision: string, lock = false) {
  const [rows] = await db.query<RowDataPacket[]>(`
    SELECT cs.id,cs.title,cs.config,cs.status,cs.from_time,cs.to_time
    FROM combo_set cs
    WHERE cs.id=? ${lock ? 'FOR UPDATE' : ''}
  `, [setId]);
  const combo = rows[0];
  if (!combo || !isComboActive(combo)) throw new PublicRequestError(409, 'COMBO_UNAVAILABLE', 'Combo không còn khả dụng.');
  const [relations] = await db.query<RowDataPacket[]>('SELECT id FROM combo_set_product WHERE set_id=? AND product_id=? LIMIT 1', [setId, anchorProductId]);
  if (!relations[0]) throw new PublicRequestError(409, 'COMBO_NOT_APPLICABLE', 'Combo không áp dụng cho sản phẩm này.');
  const currentRevision = comboRevision(combo.config);
  if (currentRevision !== revision) throw new PublicRequestError(409, 'COMBO_CHANGED', 'Combo đã được cập nhật. Vui lòng chọn lại sản phẩm mua kèm.');
  return { combo, groups: parseLegacyComboConfig(combo.config), revision: currentRevision };
}

export async function getPublicComboGroup(input: { setId: number; anchorProductId: number; revision: string; groupIndex: number; query?: string; page?: number; limit?: number }) {
  const validated = await getValidatedComboSet(pool, input.setId, input.anchorProductId, input.revision);
  const group = validated.groups[input.groupIndex];
  if (!group) throw new PublicRequestError(404, 'COMBO_GROUP_NOT_FOUND', 'Không tìm thấy nhóm sản phẩm combo.');
  const rows = await getProductRows(pool, group.products.map((product) => product.productId));
  const query = String(input.query || '').trim().toLocaleLowerCase('vi-VN');
  const available = group.products.flatMap((config, configIndex) => {
    const row = rows.get(config.productId);
    if (!isSellableProduct(row)) return [];
    const name = String(row?.proName || config.title || 'Sản phẩm');
    if (query && !name.toLocaleLowerCase('vi-VN').includes(query) && !String(row?.storeSKU || '').toLocaleLowerCase('vi-VN').includes(query)) return [];
    const price = Number(row?.price || 0);
    const discountAmount = calculateComboUnitDiscount(price, config);
    return [{
      id: config.productId, name, sku: String(row?.storeSKU || ''), slug: String(row?.slug || '').replace(/^\/+/, ''),
      thumbnail: productImage(row?.proThum), brand: String(row?.brandName || ''), price, marketPrice: Number(row?.market_price || 0),
      potentialDiscount: discountAmount, comboUnitPrice: price - discountAmount, discountType: config.discountType,
      discountValue: config.discount, configIndex,
    }];
  });
  const limit = Math.min(48, Math.max(1, Number(input.limit || 24)));
  const page = Math.max(1, Number(input.page || 1));
  const start = (page - 1) * limit;
  return {
    comboSet: { id: input.setId, title: String(validated.combo.title || ''), revision: validated.revision },
    group: { groupIndex: input.groupIndex, title: group.title || `Nhóm sản phẩm ${input.groupIndex + 1}` },
    products: available.slice(start, start + limit),
    pagination: { currentPage: page, pageSize: limit, totalItems: available.length, totalPages: Math.max(1, Math.ceil(available.length / limit)) },
  };
}

export async function buildComboQuote(rawInput: unknown, options?: { db?: DbExecutor; lock?: boolean }) {
  const parsed = comboQuoteSchema.safeParse(rawInput);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[issue.path.join('.') || 'body'] = issue.message;
    throw new PublicRequestError(400, 'VALIDATION_ERROR', 'Dữ liệu giỏ combo không hợp lệ.', fields);
  }
  const input = parsed.data;
  const db = options?.db || pool;
  const validated = await getValidatedComboSet(db, input.comboSetId, input.anchorProductId, input.revision, Boolean(options?.lock));
  const seenProducts = new Set<number>();
  for (const item of input.items) {
    if (seenProducts.has(item.productId)) throw new PublicRequestError(400, 'DUPLICATE_COMBO_PRODUCT', 'Một sản phẩm không thể được chọn trong nhiều nhóm combo.');
    seenProducts.add(item.productId);
    const group = validated.groups[item.groupIndex];
    if (!group || !group.products.some((product) => product.productId === item.productId)) {
      throw new PublicRequestError(409, 'INVALID_COMBO_ITEM', 'Sản phẩm không còn thuộc nhóm combo đã chọn.');
    }
  }
  const productRows = await getProductRows(db, [input.anchorProductId, ...input.items.map((item) => item.productId)], Boolean(options?.lock));
  const anchorRow = productRows.get(input.anchorProductId);
  if (!isSellableProduct(anchorRow)) throw new PublicRequestError(409, 'ANCHOR_UNAVAILABLE', 'Sản phẩm chính không còn khả dụng.');
  for (const item of input.items) if (!isSellableProduct(productRows.get(item.productId))) throw new PublicRequestError(409, 'COMBO_ITEM_UNAVAILABLE', 'Một sản phẩm mua kèm không còn khả dụng.');

  const quotedGroups = Array.from(new Set(input.items.map((item) => item.groupIndex))).sort((a, b) => a - b).map((groupIndex) => {
    const group = validated.groups[groupIndex];
    const selected = input.items.filter((item) => item.groupIndex === groupIndex).map((item) => {
      const configIndex = group.products.findIndex((product) => product.productId === item.productId);
      const config = group.products[configIndex];
      const row = productRows.get(item.productId)!;
      return { item, config, configIndex, row, price: Number(row.price || 0) };
    });
    const winner = pickHighestComboProduct(selected);
    const items = selected.map((entry) => {
      const discountAmount = entry === winner
        ? calculateComboUnitDiscount(entry.price, entry.config)
        : 0;
      const lineSubtotal = entry.price * entry.item.quantity;
      return {
        groupIndex, productId: entry.item.productId, quantity: entry.item.quantity,
        name: String(entry.row.proName || entry.config.title || 'Sản phẩm'), sku: String(entry.row.storeSKU || ''),
        slug: String(entry.row.slug || '').replace(/^\/+/, ''), thumbnail: productImage(entry.row.proThum),
        price: entry.price, marketPrice: Number(entry.row.market_price || 0), lineSubtotal,
        comboDiscount: discountAmount, lineTotal: lineSubtotal - discountAmount, discountedUnit: discountAmount > 0,
        discountType: entry.config.discountType, discountValue: entry.config.discount,
      };
    });
    return {
      groupIndex,
      title: group.title || `Nhóm sản phẩm ${groupIndex + 1}`,
      items,
      discount: items.reduce((total, item) => total + item.comboDiscount, 0),
    };
  });

  const anchorPrice = Number(anchorRow!.price || 0);
  const comboSubtotal = quotedGroups.reduce((total, group) => total + group.items.reduce((sum, item) => sum + item.lineSubtotal, 0), 0);
  const comboDiscount = quotedGroups.reduce((total, group) => total + group.discount, 0);
  return {
    comboSet: { id: Number(validated.combo.id), title: String(validated.combo.title || ''), revision: validated.revision },
    anchor: { productId: input.anchorProductId, quantity: 1, name: String(anchorRow!.proName || 'Sản phẩm'), sku: String(anchorRow!.storeSKU || ''), slug: String(anchorRow!.slug || '').replace(/^\/+/, ''), thumbnail: productImage(anchorRow!.proThum), price: anchorPrice, marketPrice: Number(anchorRow!.market_price || 0), lineSubtotal: anchorPrice, lineTotal: anchorPrice },
    groups: quotedGroups,
    totals: { subtotalBeforeDiscount: anchorPrice + comboSubtotal, comboDiscount, total: Math.max(0, anchorPrice + comboSubtotal - comboDiscount), itemCount: 1 + input.items.reduce((total, item) => total + item.quantity, 0) },
  };
}

export async function getAdminComboSet(id: number) {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM combo_set WHERE id=? LIMIT 1', [id]);
  const row = rows[0];
  if (!row) throw new AdminApiError(404, 'NOT_FOUND', 'Không tìm thấy combo set.');
  return { id: Number(row.id), title: String(row.title || ''), description: String(row.description || ''), status: Number(row.status || 0), fromTime: Number(row.from_time || 0), toTime: Number(row.to_time || 0), productCount: Number(row.product_count || 0), groups: parseLegacyComboConfig(row.config) };
}

export async function saveAdminComboSet(raw: unknown, actorName: string, id?: number) {
  const parsed = adminComboSetSchema.safeParse(raw);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[issue.path.join('.') || 'body'] = issue.message;
    throw new AdminApiError(400, 'BAD_REQUEST', parsed.error.issues[0]?.message || 'Dữ liệu combo không hợp lệ.', fields);
  }
  const value = parsed.data;
  const productIds = Array.from(new Set(value.groups.flatMap((group) => group.products.map((product) => product.productId))));
  let hiddenProductIds: number[] = [];
  if (productIds.length) {
    const [existing] = await pool.query<RowDataPacket[]>('SELECT p.id,pr.isOn FROM idv_sell_product_store p LEFT JOIN idv_sell_product_price pr ON pr.id=p.id WHERE p.id IN (?)', [productIds]);
    const found = new Set(existing.map((row) => Number(row.id)));
    const missing = productIds.filter((productId) => !found.has(productId));
    if (missing.length) throw new AdminApiError(400, 'BAD_REQUEST', `Sản phẩm không tồn tại: ${missing.slice(0, 10).join(', ')}.`, { products: missing.join(',') });
    hiddenProductIds = existing.filter((row) => Number(row.isOn) !== 1).map((row) => Number(row.id));
  }
  const config = serializeLegacyComboConfig(value.groups);
  const unixTime = Math.floor(Date.now() / 1000);
  const comboId = await withTransaction(async (connection) => {
    if (id) {
      const [rows] = await connection.query<RowDataPacket[]>('SELECT id FROM combo_set WHERE id=? LIMIT 1 FOR UPDATE', [id]);
      if (!rows[0]) throw new AdminApiError(404, 'NOT_FOUND', 'Không tìm thấy combo set.');
      await connection.query('UPDATE combo_set SET title=?,description=?,config=?,status=?,from_time=?,to_time=?,last_update=?,last_update_by=? WHERE id=?', [value.title, value.description, config, value.status, value.fromTime, value.toTime, unixTime, actorName.slice(0, 50), id]);
      return id;
    }
    const [result] = await connection.query('INSERT INTO combo_set(title,description,config,product_count,status,from_time,to_time,create_time,create_by,last_update,last_update_by) VALUES(?,?,?,0,?,?,?,?,?,?,?)', [value.title, value.description, config, value.status, value.fromTime, value.toTime, unixTime, actorName.slice(0, 50), unixTime, actorName.slice(0, 50)]);
    return Number((result as { insertId?: number }).insertId || 0);
  });
  clearPublicCatalogDetailCache();
  return { ...(await getAdminComboSet(comboId)), warnings: hiddenProductIds.length ? [`Sản phẩm đang ẩn: ${hiddenProductIds.slice(0, 20).join(', ')}${hiddenProductIds.length > 20 ? '…' : ''}`] : [] };
}

export async function removeProductComboSet(productId: number, setId: number) {
  await withTransaction(async (connection) => {
    await connection.query('DELETE FROM combo_set_product WHERE product_id=? AND set_id=?', [productId, setId]);
    await connection.query('UPDATE combo_set SET product_count=(SELECT COUNT(*) FROM combo_set_product WHERE set_id=?),last_update=? WHERE id=?', [setId, Math.floor(Date.now() / 1000), setId]);
  });
  clearPublicCatalogDetailCache();
}

export async function reorderProductComboSets(productId: number, setIds: number[]) {
  const ids = Array.from(new Set(setIds.filter((id) => Number.isInteger(id) && id > 0)));
  await withTransaction(async (connection) => {
    const [rows] = await connection.query<RowDataPacket[]>('SELECT set_id FROM combo_set_product WHERE product_id=? FOR UPDATE', [productId]);
    const existing = new Set(rows.map((row) => Number(row.set_id)));
    if (ids.length !== existing.size || ids.some((id) => !existing.has(id))) throw new AdminApiError(400, 'BAD_REQUEST', 'Thứ tự combo set không hợp lệ.');
    const updatedAt = Math.floor(Date.now() / 1000);
    for (let index = 0; index < ids.length; index += 1) await connection.query('UPDATE combo_set_product SET ordering=?,last_update=? WHERE product_id=? AND set_id=?', [index, updatedAt, productId, ids[index]]);
    if (ids.length) await connection.query('UPDATE combo_set SET last_update=? WHERE id IN (?)', [updatedAt, ids]);
  });
  clearPublicCatalogDetailCache();
}

export async function ensureComboIndexes() {
  const ensure = async (name: string, sql: string) => {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name=? AND index_name=? LIMIT 1', ['combo_set_product', name]);
    if (!rows[0]) await pool.query(sql);
  };
  const [duplicates] = await pool.query<RowDataPacket[]>('SELECT 1 FROM combo_set_product GROUP BY product_id,set_id HAVING COUNT(*)>1 LIMIT 1');
  if (duplicates[0]) throw new Error('Cannot add combo unique index while duplicate relations exist.');
  await ensure('uq_combo_set_product_product_set', 'CREATE UNIQUE INDEX uq_combo_set_product_product_set ON combo_set_product(product_id,set_id)');
  await ensure('idx_combo_set_product_set_product', 'CREATE INDEX idx_combo_set_product_set_product ON combo_set_product(set_id,product_id)');
}
