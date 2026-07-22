import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import type { RowDataPacket } from "mysql2/promise";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());
const REVISION = "pc-builder-v6-product-prices";
const TABLE = "web_admin_pc_builder_product_prices";

function values() {
  const output = new Map<string, string>();
  for (let index = 2; index < process.argv.length; index += 1) {
    const value = process.argv[index];
    if (!value.startsWith("--")) continue;
    const [key, inline] = value.slice(2).split("=", 2);
    const next = process.argv[index + 1];
    if (inline !== undefined) output.set(key, inline);
    else if (next && !next.startsWith("--")) { output.set(key, next); index += 1; }
    else output.set(key, "true");
  }
  return output;
}

async function verify(db: typeof import("../src/lib/db").default) {
  const [tables] = await db.query<RowDataPacket[]>(`SELECT table_name,engine,table_collation
    FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name=?`, [TABLE]);
  if (tables.length !== 1) throw new Error("PC Builder v6 product-price table is missing.");
  if (String(tables[0].engine ?? tables[0].ENGINE).toLowerCase() !== "innodb" ||
      String(tables[0].table_collation ?? tables[0].TABLE_COLLATION) !== "utf8mb4_unicode_ci")
    throw new Error(`PC Builder v6 table must use InnoDB/utf8mb4_unicode_ci: ${JSON.stringify(tables)}`);
  const [[columns], [indexes], [foreignKeys], [orphans]] = await Promise.all([
    db.query<RowDataPacket[]>(`SELECT COUNT(*) total FROM information_schema.columns
      WHERE table_schema=DATABASE() AND table_name=? AND column_name IN ('product_id','build_price','status','created_at','updated_at')`, [TABLE]),
    db.query<RowDataPacket[]>(`SELECT COUNT(DISTINCT index_name) total FROM information_schema.statistics
      WHERE table_schema=DATABASE() AND table_name=?`, [TABLE]),
    db.query<RowDataPacket[]>(`SELECT COUNT(*) total FROM information_schema.referential_constraints
      WHERE constraint_schema=DATABASE() AND table_name=?`, [TABLE]),
    db.query<RowDataPacket[]>(`SELECT COUNT(*) total FROM web_admin_pc_builder_product_prices bp
      LEFT JOIN idv_sell_product_store product ON product.id=bp.product_id WHERE product.id IS NULL`),
  ]);
  if (Number(columns[0]?.total || 0) !== 5) throw new Error("PC Builder v6 columns are incomplete.");
  if (Number(indexes[0]?.total || 0) !== 1) throw new Error("PC Builder v6 must have only its primary-key index.");
  if (Number(foreignKeys[0]?.total || 0) !== 0) throw new Error("PC Builder v6 must not add a legacy catalog foreign key.");
  if (Number(orphans[0]?.total || 0) !== 0) throw new Error("PC Builder v6 contains orphan product prices.");
  return { tables: 1, columns: 5, indexes: 1, foreignKeys: 0, orphans: 0 };
}

async function main() {
  const input = values();
  const mode = input.get("mode") || "verify";
  if (!["apply", "verify"].includes(mode)) throw new Error("Mode must be apply or verify.");
  const database = String(input.get("database") || "");
  if (!(database === "it_tech_db" || /^it_tech_db_(?:pc_builder_clone_\d{8,14}|backup_test_\d+_[a-f0-9]+)$/.test(database)))
    throw new Error("Database must be it_tech_db or a restore-verified PC Builder clone.");
  const backupSha256 = String(input.get("backup-sha256") || "").toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(backupSha256) || String(process.env.PC_BUILDER_RESTORE_VERIFIED_SHA256 || "").toLowerCase() !== backupSha256)
    throw new Error("A matching restore-verified backup SHA-256 is required.");
  if (mode === "apply") {
    if (process.env.ADMIN_WRITE_ENABLED !== "true") throw new Error("ADMIN_WRITE_ENABLED must be true for apply.");
    if (!process.env.PC_BUILDER_CONFIRMATION_TOKEN || process.env.PC_BUILDER_CONFIRMATION_INPUT !== process.env.PC_BUILDER_CONFIRMATION_TOKEN)
      throw new Error("PC Builder confirmation token mismatch.");
  }
  const databaseUrl = new URL(String(process.env.DATABASE_URL || ""));
  databaseUrl.pathname = `/${database}`;
  process.env.DATABASE_URL = databaseUrl.toString();
  const db = (await import("../src/lib/db")).default;
  const [connected] = await db.query<RowDataPacket[]>("SELECT DATABASE() database_name");
  if (String(connected[0]?.database_name || "") !== database) throw new Error("Connected database mismatch.");
  if (mode === "apply") {
    const { ensurePcBuilderProductPriceTable } = await import("../src/lib/pcBuilder/infrastructure");
    await ensurePcBuilderProductPriceTable();
  }
  const result = await verify(db);
  const artifact = { revision: REVISION, mode, database, backupSha256, result, completedAt: new Date().toISOString(),
    planHash: createHash("sha256").update(JSON.stringify({ revision: REVISION, table: TABLE })).digest("hex") };
  const directory = path.resolve(process.cwd(), "var", "migrations", "pc-builder-v6");
  fs.mkdirSync(directory, { recursive: true });
  const artifactPath = path.join(directory, `${Date.now()}-${mode}.json`);
  fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2), { encoding: "utf8", mode: 0o600 });
  process.stdout.write(JSON.stringify({ success: true, artifactPath, ...artifact }) + "\n");
  await db.end();
}

void main().then(() => process.exit(0)).catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exit(1); });
