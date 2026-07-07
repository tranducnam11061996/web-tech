import { serialize } from 'php-serialize';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { AdminApiError, toBoolInt, toInt, withTransaction } from './common';

export const PRODUCT_IMAGE_TYPES = ['product', 'self', 'customer'] as const;
export type ProductImageType = (typeof PRODUCT_IMAGE_TYPES)[number];

export type AdminImageInput = {
  fileName: string;
  alt?: string;
  ordering?: number;
  isPrimary?: boolean;
};

export type ProductImageRecord = {
  id: number;
  productId: number;
  type: ProductImageType;
  fileName: string;
  folder: string;
  relativePath: string;
  alt: string;
  ordering: number;
  isMain: boolean;
  sizeBytes: number;
  mimeType: string;
  width: number;
  height: number;
  url: string;
};

export type DeleteProductImageResult = {
  images: ProductImageRecord[];
  deletedImage: ProductImageRecord;
};

type ProductImageRow = RowDataPacket & {
  id: number;
  product_id: number;
  type: ProductImageType;
  file_name: string;
  folder: string;
  relative_path: string;
  alt: string;
  ordering: number;
  is_main: number;
  size_bytes: number;
  mime_type: string;
  width: number;
  height: number;
};

export type UploadedImageInput = {
  type: ProductImageType;
  fileName: string;
  folder: string;
  relativePath: string;
  alt?: string;
  ordering?: number;
  sizeBytes: number;
  mimeType: string;
  width?: number;
  height?: number;
};

export type ImagePatchInput = {
  id: number;
  type?: ProductImageType;
  alt?: string;
  ordering?: number;
  isMain?: boolean;
};

export function getMediaBaseUrl() {
  return (process.env.MEDIA_BASE_URL || '/api/media').replace(/\/+$/, '');
}

export function normalizeImageType(value: unknown): ProductImageType {
  const type = String(value || 'product').trim();
  return PRODUCT_IMAGE_TYPES.includes(type as ProductImageType) ? (type as ProductImageType) : 'product';
}

function legacyProductUrl(fileName: string) {
  return `https://hacom.vn/media/product/${fileName.replace(/^\/+/, '')}`;
}

function basenameFromPath(value: string) {
  return value.replace(/\\/g, '/').split('/').filter(Boolean).pop() || value;
}

export function buildMediaUrl(relativePath: string, folder = '') {
  const normalized = String(relativePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!normalized) return '';
  if (folder === 'legacy' && !normalized.includes('/')) return legacyProductUrl(normalized);
  const encoded = normalized.split('/').map(encodeURIComponent).join('/');
  return `${getMediaBaseUrl()}/${encoded}`;
}

function rowToRecord(row: ProductImageRow): ProductImageRecord {
  const relativePath = String(row.relative_path || row.file_name || '').replace(/\\/g, '/');
  return {
    id: Number(row.id),
    productId: Number(row.product_id),
    type: normalizeImageType(row.type),
    fileName: String(row.file_name || ''),
    folder: String(row.folder || ''),
    relativePath,
    alt: String(row.alt || ''),
    ordering: Number(row.ordering || 0),
    isMain: Boolean(row.is_main),
    sizeBytes: Number(row.size_bytes || 0),
    mimeType: String(row.mime_type || ''),
    width: Number(row.width || 0),
    height: Number(row.height || 0),
    url: buildMediaUrl(relativePath, String(row.folder || '')),
  };
}

export async function ensureProductImageTable(connection?: PoolConnection) {
  const db = connection || pool;
  await db.query(`
    CREATE TABLE IF NOT EXISTS web_admin_product_images (
      id int unsigned NOT NULL AUTO_INCREMENT,
      product_id int unsigned NOT NULL,
      type varchar(20) NOT NULL DEFAULT 'product',
      file_name varchar(250) NOT NULL,
      folder varchar(32) NOT NULL DEFAULT '',
      relative_path varchar(512) NOT NULL,
      alt varchar(255) NOT NULL DEFAULT '',
      ordering int NOT NULL DEFAULT 0,
      is_main tinyint(1) NOT NULL DEFAULT 0,
      size_bytes int unsigned NOT NULL DEFAULT 0,
      mime_type varchar(100) NOT NULL DEFAULT '',
      width int unsigned NOT NULL DEFAULT 0,
      height int unsigned NOT NULL DEFAULT 0,
      created_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_product_type (product_id, type),
      KEY idx_product_ordering (product_id, ordering),
      KEY idx_product_main (product_id, is_main)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

export function normalizeImages(input: unknown): AdminImageInput[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((item, index) => {
      const record = item as Partial<AdminImageInput>;
      const fileName = String(record.fileName || '').trim();
      if (!fileName) return null;
      return {
        fileName,
        alt: String(record.alt || '').trim(),
        ordering: Number.isFinite(Number(record.ordering)) ? Number(record.ordering) : index,
        isPrimary: Boolean(record.isPrimary),
      };
    })
    .filter(Boolean)
    .sort((a, b) => Number(Boolean(b!.isPrimary)) - Number(Boolean(a!.isPrimary)) || a!.ordering! - b!.ordering!) as AdminImageInput[];
}

export function serializeProductImages(images: AdminImageInput[]) {
  const rows = images.map((image, index) => ({
    image_name: image.fileName,
    alt: image.alt || '',
    ordering: image.ordering ?? index,
    is_primary: image.isPrimary ? 1 : 0,
  }));

  return {
    serialized: rows.length > 0 ? serialize(rows) : '',
    primary: images[0]?.fileName || '',
    count: images.length,
  };
}

function normalizeLegacyPath(value: unknown) {
  return String(value || '').trim().replace(/\\/g, '/').replace(/^\/+/, '');
}

function legacyImageKey(value: unknown) {
  return normalizeLegacyPath(value).toLocaleLowerCase('en-US');
}

function legacyImageBasenameKey(value: unknown) {
  return basenameFromPath(normalizeLegacyPath(value)).toLocaleLowerCase('en-US');
}

export function parseLegacyProductImages(rawImageCollection: unknown, rawThumbnail?: unknown): AdminImageInput[] {
  const raw = String(rawImageCollection || '');
  const parsed: AdminImageInput[] = [];
  const seen = new Set<string>();
  const blockRegex = /s:10:"image_name";s:\d+:"([^"]+)";s:3:"alt";s:\d+:"([^"]*)"/g;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = blockRegex.exec(raw)) !== null) {
    const fileName = normalizeLegacyPath(match[1]);
    const key = legacyImageKey(fileName);
    if (!fileName || seen.has(key)) continue;
    seen.add(key);
    parsed.push({
      fileName,
      alt: match[2] || '',
      ordering: index,
      isPrimary: false,
    });
    index += 1;
  }

  const thumbnail = normalizeLegacyPath(rawThumbnail);
  if (thumbnail) {
    const thumbnailPathKey = legacyImageKey(thumbnail);
    const thumbnailBasenameKey = legacyImageBasenameKey(thumbnail);
    const matchingImage = parsed.find(
      (image) =>
        legacyImageKey(image.fileName) === thumbnailPathKey ||
        legacyImageBasenameKey(image.fileName) === thumbnailBasenameKey,
    );

    if (matchingImage) {
      matchingImage.isPrimary = true;
    } else {
      parsed.push({
        fileName: thumbnail,
        alt: '',
        ordering: index,
        isPrimary: true,
      });
    }
  } else if (parsed[0]) {
    parsed[0].isPrimary = true;
  }

  return parsed;
}

async function hasProductImages(connection: PoolConnection, productId: number) {
  const [rows] = await connection.query<RowDataPacket[]>(
    'SELECT id FROM web_admin_product_images WHERE product_id = ? LIMIT 1',
    [productId],
  );
  return rows.length > 0;
}

export async function seedLegacyProductImages(
  connection: PoolConnection,
  productId: number,
  rawImageCollection: unknown,
  rawThumbnail?: unknown,
) {
  await ensureProductImageTable(connection);
  const legacyImages = parseLegacyProductImages(rawImageCollection, rawThumbnail);
  const alreadySeeded = await hasProductImages(connection, productId);
  for (const image of legacyImages) {
    const relativePath = normalizeLegacyPath(image.fileName);
    const [existingRows] = await connection.query<RowDataPacket[]>(
      `
        SELECT id FROM web_admin_product_images
        WHERE product_id = ? AND (LOWER(relative_path) = LOWER(?) OR LOWER(file_name) = LOWER(?))
        LIMIT 1
      `,
      [productId, relativePath, basenameFromPath(relativePath)],
    );
    if (existingRows.length > 0) continue;

    await connection.query(
      `
        INSERT INTO web_admin_product_images
          (product_id, type, file_name, folder, relative_path, alt, ordering, is_main)
        VALUES (?, 'product', ?, 'legacy', ?, ?, ?, ?)
      `,
      [
        productId,
        basenameFromPath(relativePath),
        relativePath,
        image.alt || '',
        toInt(image.ordering),
        image.isPrimary ? 1 : 0,
      ],
    );
  }

  const thumbnail = normalizeLegacyPath(rawThumbnail);
  if (thumbnail) {
    const [thumbnailRows] = await connection.query<RowDataPacket[]>(
      `
        SELECT id FROM web_admin_product_images
        WHERE product_id = ? AND (LOWER(relative_path) = LOWER(?) OR LOWER(file_name) = LOWER(?))
        ORDER BY id ASC LIMIT 1
      `,
      [productId, thumbnail, basenameFromPath(thumbnail)],
    );
    if (thumbnailRows[0]?.id) {
      await connection.query('UPDATE web_admin_product_images SET is_main = 0 WHERE product_id = ?', [productId]);
      await connection.query('UPDATE web_admin_product_images SET is_main = 1 WHERE id = ? AND product_id = ?', [thumbnailRows[0].id, productId]);
    }
  } else if (!alreadySeeded && legacyImages.length > 0) {
    await enforceSingleMain(connection, productId);
  }
}

export async function listProductImages(productId: number, rawImageCollection?: unknown, rawThumbnail?: unknown) {
  await ensureProductImageTable();
  if (rawImageCollection !== undefined) {
    await withTransaction(async (connection) => {
      await seedLegacyProductImages(connection, productId, rawImageCollection, rawThumbnail);
    });
  }

  const [rows] = await pool.query<ProductImageRow[]>(
    `
      SELECT *
      FROM web_admin_product_images
      WHERE product_id = ?
      ORDER BY is_main DESC, ordering ASC, id ASC
    `,
    [productId],
  );
  return rows.map(rowToRecord);
}

export function groupProductImages(images: ProductImageRecord[]) {
  return {
    product: images.filter((image) => image.type === 'product' || image.type === 'self'),
    customer: images.filter((image) => image.type === 'customer'),
  };
}

async function enforceSingleMain(connection: PoolConnection, productId: number, requestedMainId?: number) {
  const [rows] = await connection.query<ProductImageRow[]>(
    `
      SELECT *
      FROM web_admin_product_images
      WHERE product_id = ?
      ORDER BY is_main DESC, ordering ASC, id ASC
    `,
    [productId],
  );
  const carouselRows = rows.filter((row) => normalizeImageType(row.type) !== 'customer');
  const selected =
    carouselRows.find((row) => Number(row.id) === requestedMainId) ||
    carouselRows.find((row) => Boolean(row.is_main)) ||
    carouselRows[0];

  await connection.query('UPDATE web_admin_product_images SET is_main = 0 WHERE product_id = ?', [productId]);
  if (selected) {
    await connection.query('UPDATE web_admin_product_images SET is_main = 1 WHERE id = ? AND product_id = ?', [selected.id, productId]);
  }
}

export async function syncLegacyProductImages(connection: PoolConnection, productId: number) {
  await ensureProductImageTable(connection);
  const [rows] = await connection.query<ProductImageRow[]>(
    `
      SELECT *
      FROM web_admin_product_images
      WHERE product_id = ?
      ORDER BY is_main DESC, ordering ASC, id ASC
    `,
    [productId],
  );

  const images = rows.map(rowToRecord);
  const legacyInput = images.map((image) => ({
    fileName: image.relativePath || image.fileName,
    alt: image.alt,
    ordering: image.ordering,
    isPrimary: image.isMain,
  }));
  const legacy = serializeProductImages(normalizeImages(legacyInput));
  await connection.query(
    `
      UPDATE idv_sell_product_store
      SET proThum = ?, image_collection = ?, image_count = ?
      WHERE id = ?
    `,
    [legacy.primary, legacy.serialized, legacy.count, productId],
  );
}

export async function addUploadedProductImages(productId: number, images: UploadedImageInput[]) {
  await withTransaction(async (connection) => {
    await ensureProductImageTable(connection);
    const [countRows] = await connection.query<RowDataPacket[]>(
      'SELECT COALESCE(MAX(ordering), 0) AS max_ordering FROM web_admin_product_images WHERE product_id = ? AND type = ?',
      [productId, images[0]?.type || 'product'],
    );
    let nextOrdering = Number(countRows[0]?.max_ordering || 0) + 1;

    for (const image of images) {
      await connection.query(
        `
          INSERT INTO web_admin_product_images
            (product_id, type, file_name, folder, relative_path, alt, ordering, is_main, size_bytes, mime_type, width, height)
          VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?)
        `,
        [
          productId,
          normalizeImageType(image.type),
          image.fileName,
          image.folder,
          image.relativePath,
          String(image.alt || '').slice(0, 255),
          Number.isFinite(Number(image.ordering)) ? Number(image.ordering) : nextOrdering++,
          image.sizeBytes,
          image.mimeType,
          image.width || 0,
          image.height || 0,
        ],
      );
    }

    await enforceSingleMain(connection, productId);
    await syncLegacyProductImages(connection, productId);
  });
  return listProductImages(productId);
}

export async function patchProductImages(productId: number, patches: ImagePatchInput[]) {
  await withTransaction(async (connection) => {
    await ensureProductImageTable(connection);
    let requestedMainId: number | undefined;

    for (const patch of patches) {
      const id = toInt(patch.id);
      if (!id) continue;
      const type = patch.type ? normalizeImageType(patch.type) : null;
      if (patch.isMain && type !== 'customer') requestedMainId = id;

      await connection.query(
        `
          UPDATE web_admin_product_images
          SET
            type = COALESCE(?, type),
            alt = COALESCE(?, alt),
            ordering = COALESCE(?, ordering),
            is_main = CASE WHEN ? = 1 AND COALESCE(?, type) <> 'customer' THEN 1 ELSE is_main END
          WHERE id = ? AND product_id = ?
        `,
        [
          type,
          patch.alt === undefined ? null : String(patch.alt).slice(0, 255),
          patch.ordering === undefined ? null : toInt(patch.ordering),
          toBoolInt(patch.isMain),
          type,
          id,
          productId,
        ],
      );
    }

    await enforceSingleMain(connection, productId, requestedMainId);
    await syncLegacyProductImages(connection, productId);
  });
  return listProductImages(productId);
}

export async function deleteProductImage(productId: number, imageId: number): Promise<DeleteProductImageResult> {
  let deletedImage: ProductImageRecord | null = null;
  await withTransaction(async (connection) => {
    await ensureProductImageTable(connection);
    const [rows] = await connection.query<ProductImageRow[]>(
      'SELECT * FROM web_admin_product_images WHERE id = ? AND product_id = ? LIMIT 1',
      [imageId, productId],
    );
    deletedImage = rows[0] ? rowToRecord(rows[0]) : null;
    if (!deletedImage) throw new AdminApiError(404, 'NOT_FOUND', 'Khong tim thay anh san pham');

    await connection.query('DELETE FROM web_admin_product_images WHERE id = ? AND product_id = ?', [imageId, productId]);
    await enforceSingleMain(connection, productId);
    await syncLegacyProductImages(connection, productId);
  });
  const finalDeletedImage = deletedImage;
  if (!finalDeletedImage) throw new AdminApiError(404, 'NOT_FOUND', 'Khong tim thay anh san pham');
  return {
    images: await listProductImages(productId),
    deletedImage: finalDeletedImage,
  };
}
