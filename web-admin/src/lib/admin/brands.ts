import type { RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { clearPublicProductResponseCache } from '@/lib/publicProductCache';
import {
  AdminApiError,
  requireText,
  toBoolInt,
  withTransaction,
} from './common';
import { normalizeBrandImageValue } from './brand-images';

const MAX_MEDIUM_TEXT_LENGTH = 65_535;
const MIN_MEDIUMINT = -8_388_608;
const MAX_MEDIUMINT = 8_388_607;

export type AdminBrandPayload = {
  name: string;
  image?: string;
  summary: string;
  description: string;
  ordering: number;
  status: number;
  featured: number;
  metaTitle: string;
  metaKeywords: string;
  metaDescription: string;
};

function optionalText(value: unknown, field: string, label: string, maxLength: number) {
  const text = String(value ?? '').trim();
  if (text.length > maxLength) {
    throw new AdminApiError(400, 'BAD_REQUEST', `${label} vuot qua ${maxLength} ky tu`, {
      [field]: 'max_length',
    });
  }
  return text;
}

export function normalizeAdminBrandPayload(payload: Record<string, unknown>): AdminBrandPayload {
  const orderingText = String(payload.ordering ?? '').trim();
  const ordering = Number(orderingText);
  if (!/^-?\d+$/.test(orderingText) || !Number.isSafeInteger(ordering) || ordering < MIN_MEDIUMINT || ordering > MAX_MEDIUMINT) {
    throw new AdminApiError(400, 'BAD_REQUEST', 'Thu tu hien thi khong hop le', {
      ordering: 'invalid_integer',
    });
  }

  return {
    name: requireText(payload.name, 'name', 'Ten thuong hieu', 100),
    image: normalizeBrandImageValue(payload.image),
    summary: optionalText(payload.summary, 'summary', 'Mo ta tom tat', MAX_MEDIUM_TEXT_LENGTH),
    description: optionalText(payload.description, 'description', 'Mo ta', MAX_MEDIUM_TEXT_LENGTH),
    ordering,
    status: toBoolInt(payload.status, 0),
    featured: toBoolInt(payload.featured ?? payload.isFeatured, 0),
    metaTitle: optionalText(payload.metaTitle, 'metaTitle', 'Tieu de SEO', 250),
    metaKeywords: optionalText(payload.metaKeywords, 'metaKeywords', 'Tu khoa SEO', MAX_MEDIUM_TEXT_LENGTH),
    metaDescription: optionalText(payload.metaDescription, 'metaDescription', 'Mo ta SEO', MAX_MEDIUM_TEXT_LENGTH),
  };
}

export function brandDescriptionPreview(value: unknown, maxLength = 180) {
  const plainText = String(value ?? '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
  return plainText.length > maxLength ? `${plainText.slice(0, maxLength - 1).trimEnd()}…` : plainText;
}

export async function getAdminBrand(id: number) {
  if (id <= 0) throw new AdminApiError(404, 'NOT_FOUND', 'Khong tim thay thuong hieu');
  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT b.id, b.name, b.brand_index, b.image, b.summary, b.ordering, b.status, b.is_featured,
             i.description, i.meta_title, i.meta_keywords, i.meta_description
      FROM idv_brand b
      LEFT JOIN idv_brand_info i ON i.id = b.id AND i.sellerId = 0
      WHERE b.id = ?
      ORDER BY i.sellerId ASC
      LIMIT 1
    `,
    [id],
  );
  const row = rows[0];
  if (!row) throw new AdminApiError(404, 'NOT_FOUND', 'Khong tim thay thuong hieu');
  return {
    id: Number(row.id),
    name: String(row.name || ''),
    slug: String(row.brand_index || ''),
    image: String(row.image || ''),
    summary: String(row.summary || ''),
    description: String(row.description || ''),
    ordering: Number(row.ordering || 0),
    status: Number(row.status || 0) === 1,
    featured: Number(row.is_featured || 0) === 1,
    metaTitle: String(row.meta_title || ''),
    metaKeywords: String(row.meta_keywords || ''),
    metaDescription: String(row.meta_description || ''),
  };
}

export async function updateAdminBrand(id: number, payload: Record<string, unknown>) {
  if (id <= 0) throw new AdminApiError(404, 'NOT_FOUND', 'Khong tim thay thuong hieu');
  const input = normalizeAdminBrandPayload(payload);

  await withTransaction(async (connection) => {
    const [existingRows] = await connection.query<RowDataPacket[]>(
      'SELECT id, image FROM idv_brand WHERE id = ? LIMIT 1 FOR UPDATE',
      [id],
    );
    const existing = existingRows[0];
    if (!existing) throw new AdminApiError(404, 'NOT_FOUND', 'Khong tim thay thuong hieu');
    const image = input.image === undefined ? String(existing.image || '') : input.image;

    await connection.query(
      `
        UPDATE idv_brand
        SET name = ?, image = ?, summary = ?, ordering = ?, status = ?, is_featured = ?
        WHERE id = ?
      `,
      [input.name, image, input.summary, input.ordering, input.status, input.featured, id],
    );

    const [infoRows] = await connection.query<RowDataPacket[]>(
      'SELECT id FROM idv_brand_info WHERE id = ? AND sellerId = 0 LIMIT 1 FOR UPDATE',
      [id],
    );
    if (infoRows.length > 0) {
      await connection.query(
        `
          UPDATE idv_brand_info
          SET description = ?, meta_title = ?, meta_keywords = ?, meta_description = ?
          WHERE id = ? AND sellerId = 0
        `,
        [input.description, input.metaTitle, input.metaKeywords, input.metaDescription, id],
      );
    } else {
      await connection.query(
        `
          INSERT INTO idv_brand_info
            (id, sellerId, description, meta_title, meta_keywords, meta_description)
          VALUES (?, 0, ?, ?, ?, ?)
        `,
        [id, input.description, input.metaTitle, input.metaKeywords, input.metaDescription],
      );
    }
  });

  clearPublicProductResponseCache();
  return getAdminBrand(id);
}
