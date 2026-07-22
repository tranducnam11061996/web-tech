import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import type { RowDataPacket } from "mysql2/promise";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());
const REVISION = "pc-builder-v5-promotions";
const TABLES = [
  "web_admin_pc_builder_promotions",
  "web_admin_pc_builder_promotion_targets",
  "web_admin_pc_builder_promotion_requirements",
] as const;

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
  const [tables] = await db.query<RowDataPacket[]>(`SELECT table_name,engine,table_collation FROM information_schema.tables
    WHERE table_schema=DATABASE() AND table_name IN (?) ORDER BY table_name`, [TABLES]);
  if (tables.length !== TABLES.length) throw new Error("PC Builder v5 promotion tables are incomplete.");
  if (tables.some((table) =>
    String(table.engine ?? table.ENGINE).toLowerCase() !== "innodb" ||
    String(table.table_collation ?? table.TABLE_COLLATION) !== "utf8mb4_unicode_ci"
  ))
    throw new Error(`PC Builder v5 tables must use InnoDB/utf8mb4_unicode_ci: ${JSON.stringify(tables)}`);
  const [[foreignKeys], [indexes]] = await Promise.all([
    db.query<RowDataPacket[]>(`SELECT COUNT(*) total FROM information_schema.referential_constraints
      WHERE constraint_schema=DATABASE() AND table_name IN ('web_admin_pc_builder_promotion_targets','web_admin_pc_builder_promotion_requirements')`),
    db.query<RowDataPacket[]>(`SELECT COUNT(DISTINCT index_name) total FROM information_schema.statistics
      WHERE table_schema=DATABASE() AND table_name IN (?)`, [TABLES]),
  ]);
  if (Number(foreignKeys[0]?.total || 0) !== 3) throw new Error("PC Builder v5 foreign keys are incomplete.");
  return { tables: tables.length, foreignKeys: Number(foreignKeys[0]?.total || 0), indexes: Number(indexes[0]?.total || 0) };
}

async function main() {
  const input = values();
  const mode = input.get("mode") || "verify";
  if (!['apply', 'verify'].includes(mode)) throw new Error("Mode must be apply or verify.");
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
    const { ensurePcBuilderPromotionTables } = await import("../src/lib/pcBuilder/infrastructure");
    await ensurePcBuilderPromotionTables();
  }
  const result = await verify(db);
  const artifact = { revision: REVISION, mode, database, backupSha256, result, completedAt: new Date().toISOString(),
    planHash: createHash("sha256").update(JSON.stringify({ revision: REVISION, tables: TABLES })).digest("hex") };
  const directory = path.resolve(process.cwd(), "var", "migrations", "pc-builder-v5");
  fs.mkdirSync(directory, { recursive: true });
  const artifactPath = path.join(directory, `${Date.now()}-${mode}.json`);
  fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2), { encoding: "utf8", mode: 0o600 });
  process.stdout.write(JSON.stringify({ success: true, artifactPath, ...artifact }) + "\n");
  await db.end();
}

void main().then(() => process.exit(0)).catch((error) => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exit(1); });
