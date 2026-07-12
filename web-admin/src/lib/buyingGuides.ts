import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';
import pool from '@/lib/db';
import { AdminApiError, withTransaction } from '@/lib/admin/common';
import { clearPublicCatalogDetailCache } from '@/lib/publicProductCache';

export type BuyingGuideEntityType = 'product' | 'product_category';

export type BuyingGuideItem = {
  id?: number;
  question: string;
  answer: string;
  isActive: boolean;
  defaultExpanded: boolean;
};

export type AdminBuyingGuide = {
  enabled: boolean;
  heading: string;
  introduction: string;
  items: BuyingGuideItem[];
};

export type PublicBuyingGuide = {
  heading: string;
  introduction: string;
  items: Array<{
    id: number;
    question: string;
    answer: string;
    defaultExpanded: boolean;
  }>;
};

const booleanValue = z.preprocess(
  (value) => value === true || value === 1 || value === '1' || value === 'true' || value === 'on',
  z.boolean(),
);

const itemSchema = z.object({
  question: z.string().max(300, 'Câu hỏi không được vượt quá 300 ký tự').transform((value) => value.trim().replace(/\s+/g, ' ')),
  answer: z.string().max(10_000, 'Câu trả lời không được vượt quá 10.000 ký tự').transform((value) => value.trim().replace(/\r\n?/g, '\n')),
  isActive: booleanValue.default(true),
  defaultExpanded: booleanValue.default(false),
});

const guideSchema = z.object({
  enabled: booleanValue.default(false),
  heading: z.string().max(255, 'Tiêu đề không được vượt quá 255 ký tự').transform((value) => value.trim().replace(/\s+/g, ' ')),
  introduction: z.string().max(2_000, 'Giới thiệu không được vượt quá 2.000 ký tự').transform((value) => value.trim().replace(/\r\n?/g, '\n')),
  items: z.array(itemSchema).max(50, 'Mỗi đối tượng chỉ hỗ trợ tối đa 50 câu hỏi'),
}).superRefine((value, context) => {
  if (!value.enabled) return;
  if (!value.heading) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['heading'], message: 'Cần nhập tiêu đề trước khi bật hiển thị' });
  }
  const activeItems = value.items.filter((item) => item.isActive);
  if (activeItems.length === 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['items'], message: 'Cần ít nhất một câu hỏi đang bật' });
  }
  value.items.forEach((item, index) => {
    if (!item.isActive) return;
    if (!item.question) context.addIssue({ code: z.ZodIssueCode.custom, path: ['items', index, 'question'], message: 'Câu hỏi là bắt buộc' });
    if (!item.answer) context.addIssue({ code: z.ZodIssueCode.custom, path: ['items', index, 'answer'], message: 'Câu trả lời là bắt buộc' });
  });
});

function emptyGuide(): AdminBuyingGuide {
  return { enabled: false, heading: '', introduction: '', items: [] };
}

function isMissingTableError(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'ER_NO_SUCH_TABLE');
}

function validationError(error: z.ZodError) {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) fields[issue.path.join('.')] = issue.message;
  return new AdminApiError(400, 'BAD_REQUEST', error.issues[0]?.message || 'Dữ liệu Lý do nên mua không hợp lệ', fields);
}

export function parseBuyingGuidePayload(payload: unknown) {
  const parsed = guideSchema.safeParse(payload);
  if (!parsed.success) throw validationError(parsed.error);
  return parsed.data;
}

function entityTable(entityType: BuyingGuideEntityType) {
  return entityType === 'product' ? 'idv_sell_product_store' : 'idv_seller_category';
}

export async function ensureBuyingGuideTables(db: PoolConnection | typeof pool = pool) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS web_admin_buying_guides (
      id int unsigned NOT NULL AUTO_INCREMENT,
      entity_type varchar(24) NOT NULL,
      entity_id int unsigned NOT NULL,
      heading varchar(255) NOT NULL DEFAULT '',
      introduction text NOT NULL,
      is_active tinyint(1) NOT NULL DEFAULT 0,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_web_admin_buying_guides_entity (entity_type, entity_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS web_admin_buying_guide_items (
      id int unsigned NOT NULL AUTO_INCREMENT,
      guide_id int unsigned NOT NULL,
      question varchar(300) NOT NULL,
      answer text NOT NULL,
      ordering smallint unsigned NOT NULL DEFAULT 0,
      is_active tinyint(1) NOT NULL DEFAULT 1,
      default_expanded tinyint(1) NOT NULL DEFAULT 0,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_web_admin_buying_guide_items_display (guide_id, is_active, ordering),
      CONSTRAINT fk_web_admin_buying_guide_items_guide
        FOREIGN KEY (guide_id) REFERENCES web_admin_buying_guides(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

export async function getAdminBuyingGuide(entityType: BuyingGuideEntityType, entityId: number): Promise<AdminBuyingGuide> {
  if (!Number.isInteger(entityId) || entityId <= 0) throw new AdminApiError(400, 'BAD_REQUEST', 'ID đối tượng không hợp lệ');
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT g.heading, g.introduction, g.is_active,
             i.id AS item_id, i.question, i.answer, i.is_active AS item_active, i.default_expanded
      FROM web_admin_buying_guides g
      LEFT JOIN web_admin_buying_guide_items i ON i.guide_id = g.id
      WHERE g.entity_type = ? AND g.entity_id = ?
      ORDER BY i.ordering ASC, i.id ASC
    `, [entityType, entityId]);
    if (rows.length === 0) return emptyGuide();
    return {
      enabled: Boolean(rows[0].is_active),
      heading: String(rows[0].heading || ''),
      introduction: String(rows[0].introduction || ''),
      items: rows.filter((row) => row.item_id).map((row) => ({
        id: Number(row.item_id),
        question: String(row.question || ''),
        answer: String(row.answer || ''),
        isActive: Boolean(row.item_active),
        defaultExpanded: Boolean(row.default_expanded),
      })),
    };
  } catch (error) {
    if (isMissingTableError(error)) return emptyGuide();
    throw error;
  }
}

export async function saveAdminBuyingGuide(entityType: BuyingGuideEntityType, entityId: number, payload: unknown) {
  if (!Number.isInteger(entityId) || entityId <= 0) throw new AdminApiError(400, 'BAD_REQUEST', 'ID đối tượng không hợp lệ');
  const parsed = parseBuyingGuidePayload(payload);

  let saved: { id: number };
  try {
    saved = await withTransaction(async (connection) => {
    const [entityRows] = await connection.query<RowDataPacket[]>(
      `SELECT id FROM ${entityTable(entityType)} WHERE id = ? LIMIT 1 FOR UPDATE`,
      [entityId],
    );
    if (entityRows.length === 0) throw new AdminApiError(404, 'NOT_FOUND', 'Không tìm thấy sản phẩm hoặc danh mục');

    const [result] = await connection.query<ResultSetHeader>(`
      INSERT INTO web_admin_buying_guides (entity_type, entity_id, heading, introduction, is_active)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        id = LAST_INSERT_ID(id), heading = VALUES(heading), introduction = VALUES(introduction), is_active = VALUES(is_active)
    `, [entityType, entityId, parsed.heading, parsed.introduction, parsed.enabled ? 1 : 0]);
    const guideId = Number(result.insertId);
    if (!guideId) throw new AdminApiError(500, 'INTERNAL_ERROR', 'Không thể lưu nội dung Lý do nên mua');

    await connection.query('DELETE FROM web_admin_buying_guide_items WHERE guide_id = ?', [guideId]);
    if (parsed.items.length > 0) {
      const values = parsed.items.flatMap((item, ordering) => [
        guideId,
        item.question,
        item.answer,
        ordering,
        item.isActive ? 1 : 0,
        item.defaultExpanded ? 1 : 0,
      ]);
      const placeholders = parsed.items.map(() => '(?, ?, ?, ?, ?, ?)').join(',');
      await connection.query(
        `INSERT INTO web_admin_buying_guide_items
          (guide_id, question, answer, ordering, is_active, default_expanded)
         VALUES ${placeholders}`,
        values,
      );
    }
      return { id: guideId };
    });
  } catch (error) {
    if (isMissingTableError(error)) {
      throw new AdminApiError(503, 'INTERNAL_ERROR', 'Chưa chạy migration cho nội dung Lý do nên mua');
    }
    throw error;
  }

  clearPublicCatalogDetailCache();
  return { ...saved, guide: await getAdminBuyingGuide(entityType, entityId) };
}

export async function getPublicBuyingGuide(entityType: BuyingGuideEntityType, entityId: number): Promise<PublicBuyingGuide | null> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(`
      SELECT g.heading, g.introduction, i.id, i.question, i.answer, i.default_expanded
      FROM web_admin_buying_guides g
      JOIN web_admin_buying_guide_items i ON i.guide_id = g.id AND i.is_active = 1
      WHERE g.entity_type = ? AND g.entity_id = ? AND g.is_active = 1
        AND g.heading <> '' AND i.question <> '' AND i.answer <> ''
      ORDER BY i.ordering ASC, i.id ASC
      LIMIT 50
    `, [entityType, entityId]);
    if (rows.length === 0) return null;
    return {
      heading: String(rows[0].heading),
      introduction: String(rows[0].introduction || ''),
      items: rows.map((row) => ({
        id: Number(row.id),
        question: String(row.question),
        answer: String(row.answer),
        defaultExpanded: Boolean(row.default_expanded),
      })),
    };
  } catch (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }
}

export async function deleteBuyingGuideForEntity(
  connection: PoolConnection,
  entityType: BuyingGuideEntityType,
  entityId: number,
) {
  try {
    await connection.query('DELETE FROM web_admin_buying_guides WHERE entity_type = ? AND entity_id = ?', [entityType, entityId]);
  } catch (error) {
    if (!isMissingTableError(error)) throw error;
  }
}
