import type { Pool, PoolConnection } from 'mysql2/promise';
import pool from '@/lib/db';

type Db = Pool | PoolConnection;

export async function ensureLegacyImportTables(db: Db = pool) {
  await db.query(`CREATE TABLE IF NOT EXISTS web_admin_import_runs (
    id bigint unsigned NOT NULL AUTO_INCREMENT,
    source varchar(64) CHARACTER SET ascii NOT NULL,
    entity varchar(100) CHARACTER SET ascii NOT NULL,
    source_url varchar(1000) NOT NULL,
    snapshot_hash char(64) CHARACTER SET ascii NOT NULL,
    status enum('applying','applied','apply_failed','rolling_back','rolled_back','rollback_failed') NOT NULL,
    item_count int unsigned NOT NULL DEFAULT 0,
    report_json longtext CHARACTER SET utf8mb4 NOT NULL,
    error_message varchar(2000) NOT NULL DEFAULT '',
    started_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at datetime NULL,
    PRIMARY KEY (id),
    KEY idx_web_admin_import_runs_lookup (source, entity, status, id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await db.query(`CREATE TABLE IF NOT EXISTS web_admin_import_records (
    run_id bigint unsigned NOT NULL,
    entity varchar(100) CHARACTER SET ascii NOT NULL,
    source_id varchar(100) CHARACTER SET ascii NOT NULL,
    target_id varchar(100) CHARACTER SET ascii NULL,
    payload_hash char(64) CHARACTER SET ascii NOT NULL,
    normalized_json longtext CHARACTER SET utf8mb4 NOT NULL,
    relation_status enum('none','pending','applied') NOT NULL DEFAULT 'none',
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (run_id, entity, source_id),
    KEY idx_web_admin_import_records_target (entity, target_id),
    CONSTRAINT fk_web_admin_import_records_run FOREIGN KEY (run_id) REFERENCES web_admin_import_runs(id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await db.query(`CREATE TABLE IF NOT EXISTS web_admin_import_entity_map (
    source varchar(64) CHARACTER SET ascii NOT NULL,
    entity varchar(100) CHARACTER SET ascii NOT NULL,
    source_id varchar(100) CHARACTER SET ascii NOT NULL,
    target_id varchar(100) CHARACTER SET ascii NOT NULL,
    source_hash char(64) CHARACTER SET ascii NOT NULL,
    last_run_id bigint unsigned NOT NULL,
    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (source, entity, source_id),
    KEY idx_web_admin_import_entity_map_target (entity, target_id),
    KEY idx_web_admin_import_entity_map_run (last_run_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}
