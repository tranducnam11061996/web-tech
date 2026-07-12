import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import pool from "@/lib/db";

const LOCATION_SOURCE = "provinces-open-api-v2";
const DEFAULT_API_BASE = "https://provinces.open-api.vn/api/v2";
const EXPECTED_PROVINCES = 34;
const EXPECTED_WARDS = 3321;
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 5000;

type Db = typeof pool | PoolConnection;
type UpstreamWard = {
  name?: unknown;
  code?: unknown;
  division_type?: unknown;
  codename?: unknown;
  short_codename?: unknown;
};
type UpstreamProvince = {
  name?: unknown;
  code?: unknown;
  division_type?: unknown;
  codename?: unknown;
  phone_code?: unknown;
  wards?: UpstreamWard[];
};

export type VietnamProvince = {
  code: string;
  name: string;
  divisionType: string;
};
export type VietnamWard = {
  code: string;
  provinceCode: string;
  name: string;
  divisionType: string;
};

let syncPromise: Promise<{ provinces: number; wards: number }> | null = null;

function provinceCode(value: unknown) {
  const code = String(value ?? "")
    .replace(/\D/g, "")
    .padStart(2, "0");
  if (!/^\d{2}$/.test(code))
    throw new Error("Invalid province code from location provider.");
  return code;
}

function wardCode(value: unknown) {
  const code = String(value ?? "")
    .replace(/\D/g, "")
    .padStart(5, "0");
  if (!/^\d{5}$/.test(code))
    throw new Error("Invalid ward code from location provider.");
  return code;
}

function cleanText(value: unknown, maximum = 150) {
  const text = String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
  if (!text || text.length > maximum)
    throw new Error("Invalid location name from provider.");
  return text;
}

async function ensureColumn(db: Db, name: string, definition: string) {
  const [rows] = await db.query<RowDataPacket[]>(
    "SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? AND column_name=? LIMIT 1",
    ["web_admin_customer_addresses", name],
  );
  if (!rows[0])
    await db.query(
      `ALTER TABLE web_admin_customer_addresses ADD COLUMN ${definition}`,
    );
}

export async function ensureVietnamLocationTables(db: Db = pool) {
  await db.query(`CREATE TABLE IF NOT EXISTS web_admin_vn_provinces (
    code char(2) CHARACTER SET ascii NOT NULL, name varchar(150) NOT NULL, division_type varchar(50) NOT NULL,
    codename varchar(150) CHARACTER SET ascii NOT NULL DEFAULT '', phone_code varchar(10) CHARACTER SET ascii NOT NULL DEFAULT '',
    is_active tinyint(1) NOT NULL DEFAULT 1, synced_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (code), KEY idx_web_admin_vn_province_active (is_active, name)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await db.query(`CREATE TABLE IF NOT EXISTS web_admin_vn_wards (
    code char(5) CHARACTER SET ascii NOT NULL, province_code char(2) CHARACTER SET ascii NOT NULL,
    name varchar(150) NOT NULL, division_type varchar(50) NOT NULL, codename varchar(150) CHARACTER SET ascii NOT NULL DEFAULT '',
    is_active tinyint(1) NOT NULL DEFAULT 1, synced_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (code), KEY idx_web_admin_vn_ward_province (province_code, is_active, name),
    CONSTRAINT fk_web_admin_vn_ward_province FOREIGN KEY (province_code) REFERENCES web_admin_vn_provinces(code)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await db.query(`CREATE TABLE IF NOT EXISTS web_admin_location_sync_state (
    source varchar(64) CHARACTER SET ascii NOT NULL, synced_at datetime NULL, status enum('never','success','failed') NOT NULL DEFAULT 'never',
    province_count int unsigned NOT NULL DEFAULT 0, ward_count int unsigned NOT NULL DEFAULT 0,
    last_error varchar(500) NOT NULL DEFAULT '', updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (source)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await db.query(
    `INSERT IGNORE INTO web_admin_location_sync_state(source) VALUES(?)`,
    [LOCATION_SOURCE],
  );

  await ensureColumn(
    db,
    "province_code",
    "province_code char(2) CHARACTER SET ascii NULL AFTER province_id",
  );
  await ensureColumn(
    db,
    "ward_code",
    "ward_code char(5) CHARACTER SET ascii NULL AFTER ward_id",
  );
  await ensureColumn(
    db,
    "province_name_snapshot",
    "province_name_snapshot varchar(150) NOT NULL DEFAULT '' AFTER ward_code",
  );
  await ensureColumn(
    db,
    "ward_name_snapshot",
    "ward_name_snapshot varchar(150) NOT NULL DEFAULT '' AFTER province_name_snapshot",
  );
  await ensureColumn(
    db,
    "province_division_type",
    "province_division_type varchar(50) NOT NULL DEFAULT '' AFTER ward_name_snapshot",
  );
  await ensureColumn(
    db,
    "ward_division_type",
    "ward_division_type varchar(50) NOT NULL DEFAULT '' AFTER province_division_type",
  );
  await ensureColumn(
    db,
    "location_schema_version",
    "location_schema_version varchar(20) NOT NULL DEFAULT 'legacy_3tier' AFTER ward_division_type",
  );
  await db.query(
    "ALTER TABLE web_admin_customer_addresses MODIFY province_id mediumint NULL",
  );
  await db.query(`UPDATE web_admin_customer_addresses a
    LEFT JOIN province_list p ON p.id=a.province_id LEFT JOIN province_ward_list w ON w.id=a.ward_id
    SET a.province_name_snapshot=COALESCE(NULLIF(a.province_name_snapshot,''),CONVERT(CAST(p.name AS BINARY) USING utf8mb4),''),
        a.ward_name_snapshot=COALESCE(NULLIF(a.ward_name_snapshot,''),CONVERT(CAST(w.name AS BINARY) USING utf8mb4),''),
        a.location_schema_version=IF(a.province_code IS NULL,'legacy_3tier',a.location_schema_version)`);
}

function normalizePayload(payload: unknown) {
  if (!Array.isArray(payload))
    throw new Error("Location provider returned an invalid payload.");
  const provinces = new Map<
    string,
    {
      code: string;
      name: string;
      divisionType: string;
      codename: string;
      phoneCode: string;
    }
  >();
  const wards = new Map<
    string,
    {
      code: string;
      provinceCode: string;
      name: string;
      divisionType: string;
      codename: string;
    }
  >();
  for (const raw of payload as UpstreamProvince[]) {
    const code = provinceCode(raw.code);
    if (provinces.has(code))
      throw new Error(`Duplicate province code ${code}.`);
    provinces.set(code, {
      code,
      name: cleanText(raw.name),
      divisionType: cleanText(raw.division_type, 50),
      codename: String(raw.codename || "").slice(0, 150),
      phoneCode: String(raw.phone_code || "").slice(0, 10),
    });
    if (!Array.isArray(raw.wards))
      throw new Error(`Province ${code} has no ward list.`);
    for (const item of raw.wards) {
      const itemCode = wardCode(item.code);
      if (wards.has(itemCode))
        throw new Error(`Duplicate ward code ${itemCode}.`);
      wards.set(itemCode, {
        code: itemCode,
        provinceCode: code,
        name: cleanText(item.name),
        divisionType: cleanText(item.division_type, 50),
        codename: String(item.codename || item.short_codename || "").slice(
          0,
          150,
        ),
      });
    }
  }
  if (provinces.size !== EXPECTED_PROVINCES || wards.size !== EXPECTED_WARDS)
    throw new Error(
      `Unexpected catalog size: ${provinces.size} provinces, ${wards.size} wards.`,
    );
  return { provinces: [...provinces.values()], wards: [...wards.values()] };
}

async function insertChunks(
  connection: PoolConnection,
  rows: unknown[][],
  size: number,
  sql: (count: number) => string,
) {
  for (let index = 0; index < rows.length; index += size) {
    const chunk = rows.slice(index, index + size);
    await connection.query(sql(chunk.length), chunk.flat());
  }
}

async function performSync() {
  const base = String(
    process.env.VIETNAM_LOCATION_API_BASE || DEFAULT_API_BASE,
  ).replace(/\/+$/, "");
  const response = await fetch(`${base}/?depth=2`, {
    cache: "no-store",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { Accept: "application/json" },
  });
  if (!response.ok)
    throw new Error(`Location provider returned HTTP ${response.status}.`);
  const catalog = normalizePayload(await response.json());
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query("UPDATE web_admin_vn_wards SET is_active=0");
    await connection.query("UPDATE web_admin_vn_provinces SET is_active=0");
    await insertChunks(
      connection,
      catalog.provinces.map((x) => [
        x.code,
        x.name,
        x.divisionType,
        x.codename,
        x.phoneCode,
      ]),
      100,
      (count) =>
        `INSERT INTO web_admin_vn_provinces(code,name,division_type,codename,phone_code,is_active,synced_at) VALUES ${Array(count).fill("(?,?,?,?,?,1,NOW())").join(",")} ON DUPLICATE KEY UPDATE name=VALUES(name),division_type=VALUES(division_type),codename=VALUES(codename),phone_code=VALUES(phone_code),is_active=1,synced_at=NOW()`,
    );
    await insertChunks(
      connection,
      catalog.wards.map((x) => [
        x.code,
        x.provinceCode,
        x.name,
        x.divisionType,
        x.codename,
      ]),
      400,
      (count) =>
        `INSERT INTO web_admin_vn_wards(code,province_code,name,division_type,codename,is_active,synced_at) VALUES ${Array(count).fill("(?,?,?,?,?,1,NOW())").join(",")} ON DUPLICATE KEY UPDATE province_code=VALUES(province_code),name=VALUES(name),division_type=VALUES(division_type),codename=VALUES(codename),is_active=1,synced_at=NOW()`,
    );
    await connection.query(
      `UPDATE web_admin_location_sync_state SET synced_at=NOW(),status='success',province_count=?,ward_count=?,last_error='' WHERE source=?`,
      [catalog.provinces.length, catalog.wards.length, LOCATION_SOURCE],
    );
    await connection.commit();
    return { provinces: catalog.provinces.length, wards: catalog.wards.length };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function syncVietnamLocations(force = false) {
  await ensureVietnamLocationTables();
  if (!force) {
    const ttlMs = Math.max(
      60_000,
      Number(process.env.VIETNAM_LOCATION_CACHE_TTL_MS || DEFAULT_TTL_MS),
    );
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT synced_at,updated_at,status,province_count,ward_count FROM web_admin_location_sync_state WHERE source=? LIMIT 1`,
      [LOCATION_SOURCE],
    );
    const syncedAt = rows[0]?.synced_at
      ? new Date(rows[0].synced_at).getTime()
      : 0;
    const hasCompleteCache =
      Number(rows[0]?.province_count) === EXPECTED_PROVINCES &&
      Number(rows[0]?.ward_count) === EXPECTED_WARDS;
    const failedAt = rows[0]?.updated_at
      ? new Date(rows[0].updated_at).getTime()
      : 0;
    if (
      hasCompleteCache &&
      ((syncedAt && Date.now() - syncedAt < ttlMs) ||
        (rows[0]?.status === "failed" &&
          failedAt &&
          Date.now() - failedAt < 5 * 60_000))
    )
      return { provinces: EXPECTED_PROVINCES, wards: EXPECTED_WARDS };
  }
  if (!syncPromise)
    syncPromise = performSync()
      .catch(async (error) => {
        await pool
          .query(
            `UPDATE web_admin_location_sync_state SET status='failed',last_error=? WHERE source=?`,
            [
              String(error instanceof Error ? error.message : error).slice(
                0,
                500,
              ),
              LOCATION_SOURCE,
            ],
          )
          .catch(() => undefined);
        throw error;
      })
      .finally(() => {
        syncPromise = null;
      });
  return syncPromise;
}

async function ensureCatalogAvailable() {
  try {
    await syncVietnamLocations(false);
  } catch (error) {
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT
      (SELECT COUNT(*) FROM web_admin_vn_provinces WHERE is_active=1) provinces,
      (SELECT COUNT(*) FROM web_admin_vn_wards WHERE is_active=1) wards`);
    if (
      Number(rows[0]?.provinces || 0) !== EXPECTED_PROVINCES ||
      Number(rows[0]?.wards || 0) !== EXPECTED_WARDS
    )
      throw error;
  }
}

export async function getVietnamProvinces(): Promise<VietnamProvince[]> {
  await ensureCatalogAvailable();
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT code,name,division_type FROM web_admin_vn_provinces WHERE is_active=1 ORDER BY name",
  );
  return rows.map((row) => ({
    code: String(row.code),
    name: String(row.name),
    divisionType: String(row.division_type),
  }));
}

export async function getVietnamWards(
  codeInput: string,
): Promise<VietnamWard[]> {
  const code = provinceCode(codeInput);
  await ensureCatalogAvailable();
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT code,province_code,name,division_type FROM web_admin_vn_wards WHERE province_code=? AND is_active=1 ORDER BY name",
    [code],
  );
  return rows.map((row) => ({
    code: String(row.code),
    provinceCode: String(row.province_code),
    name: String(row.name),
    divisionType: String(row.division_type),
  }));
}

export async function resolveVietnamLocation(
  provinceInput: unknown,
  wardInput: unknown,
) {
  const province = provinceCode(provinceInput);
  const ward = wardCode(wardInput);
  await ensureCatalogAvailable();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT p.code province_code,p.name province_name,p.division_type province_type,w.code ward_code,w.name ward_name,w.division_type ward_type
    FROM web_admin_vn_provinces p JOIN web_admin_vn_wards w ON w.province_code=p.code
    WHERE p.code=? AND w.code=? AND p.is_active=1 AND w.is_active=1 LIMIT 1`,
    [province, ward],
  );
  if (!rows[0]) return null;
  return {
    provinceCode: String(rows[0].province_code),
    provinceName: String(rows[0].province_name),
    provinceDivisionType: String(rows[0].province_type),
    wardCode: String(rows[0].ward_code),
    wardName: String(rows[0].ward_name),
    wardDivisionType: String(rows[0].ward_type),
  };
}
