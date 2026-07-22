import type { RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import type { Pool, PoolConnection } from 'mysql2/promise';

export const PC_BUILDER_CACHE_KEY = 'pc_builder';

export async function bumpPcBuilderCacheVersion(db: Pool | PoolConnection = pool) {
  await db.query(`INSERT INTO web_admin_cache_versions(cache_key,version) VALUES(?,2)
    ON DUPLICATE KEY UPDATE version=version+1`, [PC_BUILDER_CACHE_KEY]);
}

const COMPONENTS = [
  ['cpu', 'CPU - Bộ vi xử lý', '[47]', 47, 'cpu', 1, 1, 1, 10, 1],
  ['mainboard', 'Mainboard - Bo mạch chủ', '[91]', 91, 'mainboard', 1, 1, 1, 20, 1],
  ['ram', 'RAM - Bộ nhớ trong', '[119]', 119, 'ram', 1, 1, 4, 30, 1],
  ['ssd', 'Ổ cứng SSD', '[139]', 139, 'storage', 1, 1, 4, 40, 1],
  ['hdd', 'Ổ cứng HDD', '[143]', 143, 'storage', 0, 0, 4, 50, 1],
  ['gpu', 'VGA - Card màn hình', '[77]', 77, 'gpu', 0, 0, 1, 60, 1],
  ['psu', 'PSU - Nguồn máy tính', '[132]', 132, 'psu', 1, 1, 1, 70, 1],
  ['cooler', 'Tản nhiệt - Cooling', '[423]', 423, 'cooler', 0, 0, 1, 80, 1],
  ['case', 'Case - Vỏ máy tính', '[127]', 127, 'case', 1, 1, 1, 90, 1],
  ['monitor', 'Màn hình máy tính', '[102]', 102, 'monitor', 0, 0, 1, 100, 1],
  ['keyboard', 'Bàn phím', '[154]', 154, 'keyboard', 0, 0, 1, 110, 1],
  ['mouse', 'Chuột', '[178]', 178, 'mouse', 0, 0, 1, 120, 1],
  ['headset', 'Tai nghe', '[195]', 195, 'headset', 0, 0, 1, 130, 1],
  ['storage', 'SSD / HDD (legacy)', '[139,143]', null, 'storage', 0, 0, 4, 140, 0],
] as const;

const ATTRIBUTE_RELATIONS = [
  ['cpu', 'mainboard', 12, 10],
  ['mainboard', 'ram', 16, 20],
  ['mainboard', 'case', 21, 30],
  ['cpu', 'cooler', 12, 40],
  ['mainboard', 'ssd', 38, 50],
] as const;

async function hasColumn(table: string, column: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT 1 FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? AND column_name=? LIMIT 1',
    [table, column],
  );
  return Boolean(rows[0]);
}

async function columnType(table: string, column: string) {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT column_type FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name=? AND column_name=? LIMIT 1', [table, column],
  );
  return String(rows[0]?.column_type || '').toLowerCase();
}

async function ensureIndex(table: string, name: string, sql: string) {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT 1 FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name=? AND index_name=? LIMIT 1', [table, name]);
  if (!rows[0]) await pool.query(sql);
}

export async function ensurePcBuilderTables() {
  await pool.query(`CREATE TABLE IF NOT EXISTS web_admin_pc_builder_components (
    code varchar(32) NOT NULL PRIMARY KEY,
    name varchar(100) NOT NULL,
    category_root_ids_json json NOT NULL,
    is_required tinyint(1) NOT NULL DEFAULT 0,
    min_selections tinyint unsigned NOT NULL DEFAULT 0,
    max_selections tinyint unsigned NOT NULL DEFAULT 1,
    ordering int NOT NULL DEFAULT 0,
    status tinyint(1) NOT NULL DEFAULT 1,
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_pc_builder_components_status_order (status, ordering)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  if (!await hasColumn('web_admin_pc_builder_components', 'category_id')) {
    await pool.query('ALTER TABLE web_admin_pc_builder_components ADD COLUMN category_id int unsigned NULL AFTER name');
  }
  await ensureIndex('web_admin_pc_builder_components', 'uq_pc_builder_components_category',
    'CREATE UNIQUE INDEX uq_pc_builder_components_category ON web_admin_pc_builder_components(category_id)');

  await pool.query(`CREATE TABLE IF NOT EXISTS web_admin_pc_builder_component_relations (
    id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
    component_code varchar(32) NOT NULL,
    related_component_code varchar(32) NOT NULL,
    attribute_id int unsigned NOT NULL,
    ordering int NOT NULL DEFAULT 0,
    status tinyint(1) NOT NULL DEFAULT 1,
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_pc_builder_relation_component FOREIGN KEY (component_code) REFERENCES web_admin_pc_builder_components(code),
    CONSTRAINT fk_pc_builder_relation_related FOREIGN KEY (related_component_code) REFERENCES web_admin_pc_builder_components(code),
    UNIQUE KEY uq_pc_builder_component_relation (component_code,related_component_code,attribute_id),
    KEY idx_pc_builder_relation_active (status,ordering,id),
    KEY idx_pc_builder_relation_attribute (attribute_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await pool.query(`CREATE TABLE IF NOT EXISTS web_admin_pc_builder_benchmark_snapshots (
    id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
    code varchar(96) NOT NULL,
    component_code enum('cpu','gpu') NOT NULL,
    source_name varchar(150) NOT NULL,
    source_url varchar(2048) NOT NULL,
    cohort varchar(255) NOT NULL,
    raw_unit varchar(32) NOT NULL DEFAULT 'score',
    source_updated_at datetime NULL,
    captured_at datetime NOT NULL,
    content_hash char(64) NOT NULL,
    metadata_json json NOT NULL,
    status enum('draft','verified','archived') NOT NULL DEFAULT 'draft',
    verified_by int NULL,
    verified_at datetime NULL,
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_pc_builder_benchmark_code (code),
    KEY idx_pc_builder_benchmark_lookup (component_code,status,captured_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await pool.query(`CREATE TABLE IF NOT EXISTS web_admin_pc_builder_rule_sets (
    id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
    revision varchar(64) NOT NULL,
    name varchar(150) NOT NULL,
    status enum('draft','published','archived') NOT NULL DEFAULT 'draft',
    created_by int NULL,
    published_by int NULL,
    published_at datetime NULL,
    manual_report_hash char(64) NULL,
    manual_fingerprint char(64) NULL,
    manual_evaluated_by int NULL,
    manual_evaluated_at datetime NULL,
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_pc_builder_rule_revision (revision),
    KEY idx_pc_builder_rule_status (status, id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await pool.query(`CREATE TABLE IF NOT EXISTS web_admin_pc_builder_rules (
    id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
    rule_set_id bigint unsigned NOT NULL,
    code varchar(80) NOT NULL,
    severity enum('error','warning','info') NOT NULL DEFAULT 'error',
    operator enum('equality','set_contains','numeric_lte','headroom','requires') NOT NULL,
    left_component varchar(32) NOT NULL,
    left_fact varchar(80) NOT NULL,
    right_component varchar(32) NOT NULL,
    right_fact varchar(80) NOT NULL,
    config_json json NOT NULL,
    message varchar(500) NOT NULL,
    ordering int NOT NULL DEFAULT 0,
    is_enabled tinyint(1) NOT NULL DEFAULT 1,
    CONSTRAINT fk_pc_builder_rule_set FOREIGN KEY (rule_set_id) REFERENCES web_admin_pc_builder_rule_sets(id) ON DELETE CASCADE,
    UNIQUE KEY uq_pc_builder_rule_code (rule_set_id, code),
    KEY idx_pc_builder_rules_order (rule_set_id, is_enabled, ordering)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await pool.query(`CREATE TABLE IF NOT EXISTS web_admin_pc_builder_gaming_policies (
    id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
    revision varchar(64) NOT NULL,
    resolution enum('1080p','1440p','4k') NOT NULL,
    game_type enum('esports','aaa','mixed') NOT NULL,
    variant enum('value','balanced','performance') NOT NULL,
    status enum('draft','published','archived') NOT NULL DEFAULT 'draft',
    config_json json NOT NULL,
    created_by int NULL,
    published_by int NULL,
    published_at datetime NULL,
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_pc_builder_policy_revision (revision, resolution, game_type, variant),
    KEY idx_pc_builder_policy_lookup (status, resolution, game_type, variant)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  const manualReleaseColumns = [
    ['manual_report_hash', 'char(64) NULL'],
    ['manual_fingerprint', 'char(64) NULL'],
    ['manual_evaluated_by', 'int NULL'],
    ['manual_evaluated_at', 'datetime NULL'],
  ] as const;
  for (const [column, definition] of manualReleaseColumns) {
    if (!await hasColumn('web_admin_pc_builder_rule_sets', column)) {
      await pool.query(`ALTER TABLE web_admin_pc_builder_rule_sets ADD COLUMN ${column} ${definition}`);
    }
  }

  await pool.query(`CREATE TABLE IF NOT EXISTS web_admin_pc_builder_release_gates (
    id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
    revision varchar(64) NOT NULL,
    resolution enum('1080p','1440p','4k') NOT NULL,
    game_type enum('esports','aaa','mixed') NOT NULL,
    status enum('draft','passed','failed','published') NOT NULL DEFAULT 'draft',
    acceptance_budget decimal(18,2) NULL,
    coverage_json json NOT NULL,
    fingerprints_json json NOT NULL,
    report_hash char(64) NOT NULL,
    evaluated_by int NULL,
    evaluated_at datetime NOT NULL,
    published_by int NULL,
    published_at datetime NULL,
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_pc_builder_release_gate (revision,resolution,game_type),
    KEY idx_pc_builder_release_status (status,revision,resolution,game_type)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await pool.query(`CREATE TABLE IF NOT EXISTS web_admin_pc_builds (
    id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
    customer_id bigint unsigned NULL,
    name varchar(150) NOT NULL DEFAULT 'Cấu hình PC',
    mode enum('manual','auto') NOT NULL DEFAULT 'manual',
    input_json json NOT NULL,
    share_token_hash char(64) NULL,
    status enum('active','ordered','deleted') NOT NULL DEFAULT 'active',
    expires_at datetime NULL,
    rule_revision varchar(64) NOT NULL,
    catalog_revision varchar(64) NOT NULL,
    fingerprint char(64) NOT NULL,
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_pc_build_share_token (share_token_hash),
    KEY idx_pc_build_customer (customer_id, status, updated_at),
    KEY idx_pc_build_expiry (status, expires_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  await pool.query(`CREATE TABLE IF NOT EXISTS web_admin_pc_build_items (
    id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
    build_id bigint unsigned NOT NULL,
    component_code varchar(32) NOT NULL,
    product_id int NOT NULL,
    quantity tinyint unsigned NOT NULL DEFAULT 1,
    ordering int NOT NULL DEFAULT 0,
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pc_build_item_build FOREIGN KEY (build_id) REFERENCES web_admin_pc_builds(id) ON DELETE CASCADE,
    CONSTRAINT fk_pc_build_item_component FOREIGN KEY (component_code) REFERENCES web_admin_pc_builder_components(code),
    UNIQUE KEY uq_pc_build_item (build_id, component_code, product_id),
    KEY idx_pc_build_items_product (product_id, build_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

  if (!await hasColumn('web_admin_pc_builds', 'catalog_revision')) {
    await pool.query("ALTER TABLE web_admin_pc_builds ADD COLUMN catalog_revision varchar(64) NOT NULL DEFAULT '' AFTER rule_revision");
  }

  for (const component of COMPONENTS) {
    const [code, name, roots, categoryId, , required, minimum, maximum, ordering, status] = component;
    await pool.query(`INSERT INTO web_admin_pc_builder_components
      (code,name,category_root_ids_json,category_id,is_required,min_selections,max_selections,ordering,status)
      VALUES (?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE code=code`,
    [code, name, roots, categoryId, required, minimum, maximum, ordering, status]);
  }
  for (const relation of ATTRIBUTE_RELATIONS) {
    await pool.query(`INSERT IGNORE INTO web_admin_pc_builder_component_relations
      (component_code,related_component_code,attribute_id,ordering,status) VALUES (?,?,?,?,1)`, [...relation]);
  }

  await pool.query(`INSERT IGNORE INTO web_admin_pc_builder_rule_sets (revision,name,status)
    VALUES ('v1','Quy tắc tương thích PC Builder V1','draft')`);
  const [sets] = await pool.query<RowDataPacket[]>("SELECT id FROM web_admin_pc_builder_rule_sets WHERE revision='v1' LIMIT 1");
  const setId = Number(sets[0]?.id || 0);
  if (setId) {
    const rules = [
      ['cpu_main_socket','error','equality','cpu','attr:socket','mainboard','attr:socket','Socket CPU không tương thích với Mainboard.',10],
      ['main_ram_type','error','equality','mainboard','attr:loai-ram','ram','attr:loai-ram','Chuẩn RAM không tương thích với Mainboard.',20],
      ['main_case_form','error','set_contains','case','attr:form-main','mainboard','attr:form-main','Vỏ máy không hỗ trợ kích thước Mainboard.',30],
      ['cooler_cpu_socket','error','set_contains','cooler','attr:socket','cpu','attr:socket','Tản nhiệt không hỗ trợ socket CPU.',40],
      ['gpu_case_length','error','numeric_lte','gpu','metric:gpu_length_mm','case','metric:case_max_gpu_length_mm','Card đồ họa dài hơn giới hạn của vỏ máy.',50],
      ['cooler_case_height','error','numeric_lte','cooler','metric:cooler_height_mm','case','metric:case_max_cooler_height_mm','Tản nhiệt cao hơn giới hạn của vỏ máy.',60],
      ['gpu_psu_power','error','numeric_lte','gpu','metric:gpu_recommended_psu_w','psu','metric:psu_output_w','Nguồn không đạt công suất khuyến nghị của card đồ họa.',70],
      ['storage_main_interface','error','set_contains','mainboard','attr:loai-o-cung-m2','storage','attr:loai-o-cung-m2','Chuẩn giao tiếp lưu trữ không được Mainboard hỗ trợ.',80],
    ] as const;
    for (const rule of rules) {
      await pool.query(`INSERT IGNORE INTO web_admin_pc_builder_rules
        (rule_set_id,code,severity,operator,left_component,left_fact,right_component,right_fact,config_json,message,ordering)
        VALUES (?,?,?,?,?,?,?,?,JSON_OBJECT(),?,?)`, [setId, ...rule]);
    }
    await pool.query(`UPDATE web_admin_pc_builder_rules SET is_enabled=0
      WHERE rule_set_id=? AND (left_fact LIKE 'metric:%' OR right_fact LIKE 'metric:%')`, [setId]);
  }

  const policyDefaults = [
    ['1080p','esports',16,500], ['1080p','aaa',16,1000], ['1080p','mixed',16,1000],
    ['1440p','esports',32,1000], ['1440p','aaa',32,1000], ['1440p','mixed',32,1000],
    ['4k','esports',32,1000], ['4k','aaa',32,1000], ['4k','mixed',32,1000],
  ] as const;
  for (const [resolution, gameType, ramGb, storageGb] of policyDefaults) {
    for (const variant of ['value','balanced','performance'] as const) {
      await pool.query(`INSERT IGNORE INTO web_admin_pc_builder_gaming_policies
        (revision,resolution,game_type,variant,status,config_json)
        VALUES ('v1',?,?,?,'draft',JSON_OBJECT('minimumRamGb',?,'minimumStorageGb',?,'minimumGamingScore',0,'beamWidth',300))`,
      [resolution, gameType, variant, ramGb, storageGb]);
    }
  }
  await pool.query(`INSERT IGNORE INTO web_admin_cache_versions(cache_key,version) VALUES(?,1)`, [PC_BUILDER_CACHE_KEY]);

  if (!await hasColumn('web_admin_storefront_order_meta', 'pc_build_id')) {
    await pool.query('ALTER TABLE web_admin_storefront_order_meta ADD COLUMN pc_build_id bigint unsigned NULL');
  }
  if (!await hasColumn('web_admin_storefront_order_meta', 'assembly_required')) {
    await pool.query('ALTER TABLE web_admin_storefront_order_meta ADD COLUMN assembly_required tinyint(1) NOT NULL DEFAULT 0');
  }
  if (!await hasColumn('web_admin_storefront_order_meta', 'pc_builder_revision')) {
    await pool.query("ALTER TABLE web_admin_storefront_order_meta ADD COLUMN pc_builder_revision varchar(64) NOT NULL DEFAULT ''");
  }
  if (await columnType('web_admin_storefront_order_meta', 'order_type') !== "enum('standard','combo','pc_builder')") {
    await pool.query("ALTER TABLE web_admin_storefront_order_meta MODIFY COLUMN order_type enum('standard','combo','pc_builder') NOT NULL DEFAULT 'standard'");
  }
  await ensureIndex('web_admin_storefront_order_meta', 'idx_web_admin_order_meta_pc_build', 'CREATE INDEX idx_web_admin_order_meta_pc_build ON web_admin_storefront_order_meta(pc_build_id,order_id)');

  const [pcOrders] = await pool.query<RowDataPacket[]>("SELECT 1 FROM web_admin_storefront_order_meta WHERE order_type='pc_builder' LIMIT 1");
  if (!pcOrders[0]) {
    await pool.query("UPDATE web_admin_pc_builder_rule_sets SET status='draft',published_at=NULL WHERE revision='v1' AND status='published' AND published_by IS NULL");
    await pool.query("UPDATE web_admin_pc_builder_gaming_policies SET status='draft',published_at=NULL WHERE revision='v1' AND status='published' AND published_by IS NULL");
  }
}

export async function ensurePcBuilderPromotionTables() {
  await pool.query(`CREATE TABLE IF NOT EXISTS web_admin_pc_builder_promotions (
    id bigint unsigned NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name varchar(150) NOT NULL,
    discount_type enum('fixed','percent') NOT NULL,
    discount_value int unsigned NOT NULL,
    max_discount int unsigned NULL,
    priority int NOT NULL DEFAULT 0,
    status tinyint(1) NOT NULL DEFAULT 1,
    starts_at datetime NULL,
    ends_at datetime NULL,
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_pc_builder_promotions_active (status,starts_at,ends_at,priority,id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS web_admin_pc_builder_promotion_targets (
    promotion_id bigint unsigned NOT NULL,
    target_type enum('product','category') NOT NULL,
    target_id int unsigned NOT NULL,
    PRIMARY KEY (promotion_id,target_type,target_id),
    KEY idx_pc_builder_promotion_target (target_type,target_id,promotion_id),
    CONSTRAINT fk_pc_builder_promotion_target FOREIGN KEY (promotion_id)
      REFERENCES web_admin_pc_builder_promotions(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  await pool.query(`CREATE TABLE IF NOT EXISTS web_admin_pc_builder_promotion_requirements (
    promotion_id bigint unsigned NOT NULL,
    component_code varchar(32) NOT NULL,
    min_distinct_skus tinyint unsigned NOT NULL DEFAULT 1,
    PRIMARY KEY (promotion_id,component_code),
    CONSTRAINT fk_pc_builder_promotion_requirement FOREIGN KEY (promotion_id)
      REFERENCES web_admin_pc_builder_promotions(id) ON DELETE CASCADE,
    CONSTRAINT fk_pc_builder_promotion_requirement_component FOREIGN KEY (component_code)
      REFERENCES web_admin_pc_builder_components(code)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}

export async function ensurePcBuilderProductPriceTable() {
  await pool.query(`CREATE TABLE IF NOT EXISTS web_admin_pc_builder_product_prices (
    product_id int unsigned NOT NULL PRIMARY KEY,
    build_price int unsigned NOT NULL,
    status tinyint(1) NOT NULL DEFAULT 1,
    created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
}
