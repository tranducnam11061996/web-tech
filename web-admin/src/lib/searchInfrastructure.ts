import type { RowDataPacket } from 'mysql2/promise';
import pool from './db';

const NORMALIZE_FUNCTION = 'webtech_normalize_product_search';
const INSERT_TRIGGER = 'webtech_product_search_after_insert';
const UPDATE_TRIGGER = 'webtech_product_search_after_update';
const FOREIGN_KEY = 'fk_product_data_search_product';

const normalizeFunctionSql = `
  CREATE FUNCTION ${NORMALIZE_FUNCTION}(input_text TEXT)
  RETURNS TEXT CHARACTER SET utf8mb4
  DETERMINISTIC
  NO SQL
  BEGIN
    DECLARE normalized TEXT DEFAULT LOWER(COALESCE(input_text, ''));

    SET normalized = REGEXP_REPLACE(normalized, '[àáạảãâầấậẩẫăằắặẳẵ]', 'a');
    SET normalized = REGEXP_REPLACE(normalized, '[èéẹẻẽêềếệểễ]', 'e');
    SET normalized = REGEXP_REPLACE(normalized, '[ìíịỉĩ]', 'i');
    SET normalized = REGEXP_REPLACE(normalized, '[òóọỏõôồốộổỗơờớợởỡ]', 'o');
    SET normalized = REGEXP_REPLACE(normalized, '[ùúụủũưừứựửữ]', 'u');
    SET normalized = REGEXP_REPLACE(normalized, '[ỳýỵỷỹ]', 'y');
    SET normalized = REPLACE(normalized, 'đ', 'd');
    SET normalized = REGEXP_REPLACE(normalized, '[^a-z0-9[:space:]]', ' ');
    SET normalized = REGEXP_REPLACE(normalized, '[[:space:]]+', ' ');

    RETURN TRIM(normalized);
  END
`;

async function ensureForeignKey() {
  const [rows] = await pool.query<RowDataPacket[]>(
    `
      SELECT CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'product_data_search'
        AND COLUMN_NAME = 'product_id'
        AND REFERENCED_TABLE_NAME = 'idv_sell_product_store'
        AND REFERENCED_COLUMN_NAME = 'id'
      LIMIT 1
    `,
  );

  if (rows.length > 0) return;

  await pool.query(`
    ALTER TABLE product_data_search
    ADD CONSTRAINT ${FOREIGN_KEY}
      FOREIGN KEY (product_id) REFERENCES idv_sell_product_store(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE
  `);
}

export async function rebuildProductSearchData() {
  await pool.query(`
    INSERT INTO product_data_search (product_id, data_search)
    SELECT
      p.id,
      ${NORMALIZE_FUNCTION}(CONCAT_WS(' ', p.storeSKU, p.proName))
    FROM idv_sell_product_store p
    ON DUPLICATE KEY UPDATE data_search = VALUES(data_search)
  `);

  const [result] = await pool.query<RowDataPacket[]>(`
    SELECT
      (SELECT COUNT(*) FROM idv_sell_product_store) AS product_count,
      (SELECT COUNT(*) FROM product_data_search) AS search_count,
      (
        SELECT COUNT(*)
        FROM idv_sell_product_store p
        LEFT JOIN product_data_search s ON s.product_id = p.id
        WHERE s.product_id IS NULL
      ) AS missing_count
  `);

  return {
    productCount: Number(result[0]?.product_count || 0),
    searchCount: Number(result[0]?.search_count || 0),
    missingCount: Number(result[0]?.missing_count || 0),
  };
}

export async function ensureProductSearchInfrastructure() {
  await pool.query(`DROP TRIGGER IF EXISTS ${INSERT_TRIGGER}`);
  await pool.query(`DROP TRIGGER IF EXISTS ${UPDATE_TRIGGER}`);
  await pool.query(`DROP FUNCTION IF EXISTS ${NORMALIZE_FUNCTION}`);
  await pool.query(normalizeFunctionSql);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_data_search (
      product_id INT UNSIGNED NOT NULL,
      data_search TEXT NULL,
      PRIMARY KEY (product_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Clean legacy orphan rows before adding the foreign key to an existing table.
  await pool.query(`
    DELETE s
    FROM product_data_search s
    LEFT JOIN idv_sell_product_store p ON p.id = s.product_id
    WHERE p.id IS NULL
  `);
  await ensureForeignKey();

  const counts = await rebuildProductSearchData();

  await pool.query(`
    CREATE TRIGGER ${INSERT_TRIGGER}
    AFTER INSERT ON idv_sell_product_store
    FOR EACH ROW
    INSERT INTO product_data_search (product_id, data_search)
    VALUES (
      NEW.id,
      ${NORMALIZE_FUNCTION}(CONCAT_WS(' ', NEW.storeSKU, NEW.proName))
    )
    ON DUPLICATE KEY UPDATE data_search = VALUES(data_search)
  `);

  await pool.query(`
    CREATE TRIGGER ${UPDATE_TRIGGER}
    AFTER UPDATE ON idv_sell_product_store
    FOR EACH ROW
    BEGIN
      IF NOT (OLD.storeSKU <=> NEW.storeSKU)
         OR NOT (OLD.proName <=> NEW.proName)
         OR OLD.id <> NEW.id THEN
        INSERT INTO product_data_search (product_id, data_search)
        VALUES (
          NEW.id,
          ${NORMALIZE_FUNCTION}(CONCAT_WS(' ', NEW.storeSKU, NEW.proName))
        )
        ON DUPLICATE KEY UPDATE data_search = VALUES(data_search);
      END IF;
    END
  `);

  return counts;
}
