import { createHash } from 'crypto';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import pool from '@/lib/db';
import { AdminApiError, withTransaction } from '@/lib/admin/common';
import { bumpPcBuilderCacheVersion } from './infrastructure';

const ROOT_COMPONENTS = new Map<number, string>([[47,'cpu'],[91,'mainboard'],[77,'gpu'],[119,'ram'],[127,'case'],[132,'psu'],[139,'storage'],[143,'storage'],[423,'cooler']]);
const PARSER_VERSION = 'v1.0.0';

function plainText(value: unknown) { return String(value || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/\s+/g, ' ').trim(); }
export function pcBuilderSourceHash(row: { proName?: unknown; proSummary?: unknown; spec?: unknown; category_ids?: unknown; attribute_values?: unknown }) {
  return createHash('sha256').update(JSON.stringify({ name: row.proName || '', summary: row.proSummary || '', spec: row.spec || '', categories: row.category_ids || '', attributes: row.attribute_values || '' })).digest('hex');
}
function numberMatch(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) { const match = text.match(pattern); if (match) return Number(String(match[1]).replace(',', '.')); }
  return undefined;
}
function booleanMetric(text: string, yes: RegExp, no?: RegExp) { if (no?.test(text)) return false; return yes.test(text) ? true : undefined; }

export function extractPcBuilderSuggestions(componentCode: string, raw: { name?: unknown; summary?: unknown; spec?: unknown }) {
  const text = plainText(`${raw.name || ''} ${raw.summary || ''} ${raw.spec || ''}`);
  const lower = text.toLowerCase();
  const metrics: Record<string, number | boolean> = {};
  const setNumber = (code: string, patterns: RegExp[], unit = '') => { const value = numberMatch(lower, patterns); if (value !== undefined && Number.isFinite(value)) metrics[code] = value; return unit; };
  if (componentCode === 'psu') setNumber('psu_output_w', [/(?:công suất|cong suat|power)\s*(?:định danh|dinh danh|thực|thuc)?\s*[:\-]?\s*(\d{3,4})\s*w/i, /\b(\d{3,4})\s*w\b/i]);
  if (componentCode === 'gpu') {
    setNumber('gpu_recommended_psu_w', [/(?:nguồn|nguon|psu)[^\d]{0,30}(\d{3,4})\s*w/i]);
    setNumber('gpu_length_mm', [/(?:chiều dài|chieu dai|kích thước|kich thuoc)[^\d]{0,20}(\d{2,3}(?:[.,]\d+)?)\s*mm/i]);
  }
  if (componentCode === 'case') {
    setNumber('case_max_gpu_length_mm', [/(?:vga|gpu|card)[^\d]{0,30}(?:tối đa|toi da|max)?[^\d]{0,10}(\d{2,3})\s*mm/i]);
    setNumber('case_max_cooler_height_mm', [/(?:tản nhiệt cpu|tan nhiet cpu|cpu cooler)[^\d]{0,30}(\d{2,3})\s*mm/i]);
  }
  if (componentCode === 'cooler') setNumber('cooler_height_mm', [/(?:chiều cao|chieu cao|height)[^\d]{0,15}(\d{2,3})\s*mm/i]);
  if (componentCode === 'ram') {
    const total = numberMatch(lower, [/(\d{1,3})\s*gb/i]); if (total) metrics.ram_capacity_gb = total;
    const modules = numberMatch(lower, [/(\d)\s*x\s*\d{1,3}\s*gb/i, /kit\s*(\d)/i]); if (modules) metrics.ram_modules_per_kit = modules;
    else metrics.ram_modules_per_kit = 1;
  }
  if (componentCode === 'storage') {
    const tb = numberMatch(lower, [/(\d+(?:[.,]\d+)?)\s*tb/i]);
    const gb = numberMatch(lower, [/(\d{2,4})\s*gb/i]);
    if (tb) metrics.storage_capacity_gb = tb * 1000; else if (gb) metrics.storage_capacity_gb = gb;
  }
  if (componentCode === 'mainboard') {
    setNumber('main_ram_slot_count', [/(?:khe ram|ram slots?)[^\d]{0,15}(\d)/i]);
    setNumber('main_m2_slot_count', [/(\d)\s*x\s*m\.?2/i, /(?:khe m\.?2)[^\d]{0,15}(\d)/i]);
    setNumber('main_sata_port_count', [/(\d)\s*x\s*sata/i, /(?:cổng sata|cong sata)[^\d]{0,15}(\d)/i]);
    const output = booleanMetric(lower, /\b(hdmi|displayport|dvi|vga)\b/i); if (output !== undefined) metrics.main_has_video_output = output;
  }
  if (componentCode === 'cpu') {
    setNumber('cpu_tdp_w', [/(?:tdp|công suất cơ bản|cong suat co ban)[^\d]{0,15}(\d{2,3})\s*w/i]);
    const igpu = booleanMetric(lower, /(?:đồ họa tích hợp|do hoa tich hop|integrated graphics|uhd graphics|radeon graphics)/i, /(?:không có đồ họa tích hợp|khong co do hoa tich hop|no integrated graphics)/i);
    if (igpu !== undefined) metrics.cpu_has_igpu = igpu;
    const cooler = booleanMetric(lower, /(?:kèm tản|kem tan|boxed cooler|wraith)/i, /(?:không kèm tản|khong kem tan|no cooler)/i); if (cooler !== undefined) metrics.cpu_cooler_included = cooler;
  }
  const attributes: Array<{ attributeApiKey: string; valueApiKey: string; confidence: number }> = [];
  if (['mainboard','ram'].includes(componentCode)) {
    const ddr = lower.match(/\bddr\s*([345])\b/i); if (ddr) attributes.push({ attributeApiKey: 'loai-ram', valueApiKey: `ddr${ddr[1]}`, confidence: 0.98 });
  }
  return { attributes, metrics, confidence: Object.keys(metrics).length || attributes.length ? 0.85 : 0.2 };
}

async function sourceRows(limit: number, offset: number) {
  const [rows] = await pool.query<RowDataPacket[]>(`WITH RECURSIVE tree AS (
      SELECT id,id root_id FROM idv_seller_category WHERE id IN (47,91,77,119,127,132,139,143,423)
      UNION ALL SELECT c.id,t.root_id FROM idv_seller_category c JOIN tree t ON c.parentId=t.id
    )
    SELECT p.id,p.proName,p.proSummary,i.spec,GROUP_CONCAT(DISTINCT pc.category_id ORDER BY pc.category_id) category_ids,
      GROUP_CONCAT(DISTINCT CONCAT(pa.attr_id,':',pa.attr_value_id) ORDER BY pa.attr_id,pa.attr_value_id) attribute_values,
      MIN(t.root_id) root_id
    FROM idv_sell_product_store p JOIN idv_product_category pc ON pc.pro_id=p.id JOIN tree t ON t.id=pc.category_id
    LEFT JOIN idv_sell_product_info i ON i.id=p.id LEFT JOIN idv_product_attribute pa ON pa.pro_id=p.id
    GROUP BY p.id,p.proName,p.proSummary,i.spec ORDER BY p.id LIMIT ? OFFSET ?`, [limit, offset]);
  return rows;
}

export async function extractPcBuilderProfiles(options: { limit?: number; offset?: number; apply?: boolean }) {
  const limit = Math.min(500, Math.max(1, Number(options.limit || 100)));
  const offset = Math.max(0, Number(options.offset || 0));
  const rows = await sourceRows(limit, offset);
  const items = rows.map((row) => {
    const componentCode = ROOT_COMPONENTS.get(Number(row.root_id)) || '';
    const suggestions = extractPcBuilderSuggestions(componentCode, { name: row.proName, summary: row.proSummary, spec: row.spec });
    return { productId: Number(row.id), name: String(row.proName || ''), componentCode, sourceHash: pcBuilderSourceHash({ proName: row.proName, proSummary: row.proSummary, spec: row.spec, category_ids: row.category_ids, attribute_values: row.attribute_values }), ...suggestions };
  }).filter((item) => item.componentCode);
  if (options.apply) {
    await withTransaction(async (connection) => {
      for (const item of items) await connection.query(`INSERT INTO web_admin_pc_builder_product_profiles
        (product_id,component_code,state,source_hash,parser_version,candidate_attributes_json,candidate_metrics_json,confidence)
        VALUES (?,?, 'pending',?,?,?,?,?) ON DUPLICATE KEY UPDATE component_code=VALUES(component_code),
        state=IF(verified_hash=VALUES(source_hash),'verified',IF(state='rejected','rejected','stale')),
        source_hash=VALUES(source_hash),parser_version=VALUES(parser_version),candidate_attributes_json=VALUES(candidate_attributes_json),
        candidate_metrics_json=VALUES(candidate_metrics_json),confidence=VALUES(confidence)`,
      [item.productId, item.componentCode, item.sourceHash, PARSER_VERSION, JSON.stringify(item.attributes), JSON.stringify(item.metrics), item.confidence]);
    });
    await bumpPcBuilderCacheVersion();
  }
  return { dryRun: !options.apply, parserVersion: PARSER_VERSION, count: items.length, items };
}

export async function markPcBuilderProfileStale(productId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(`SELECT p.proName,p.proSummary,i.spec,
    GROUP_CONCAT(DISTINCT pc.category_id ORDER BY pc.category_id) category_ids,
    GROUP_CONCAT(DISTINCT CONCAT(pa.attr_id,':',pa.attr_value_id) ORDER BY pa.attr_id,pa.attr_value_id) attribute_values
    FROM idv_sell_product_store p LEFT JOIN idv_sell_product_info i ON i.id=p.id
    LEFT JOIN idv_product_category pc ON pc.pro_id=p.id LEFT JOIN idv_product_attribute pa ON pa.pro_id=p.id
    WHERE p.id=? GROUP BY p.id,p.proName,p.proSummary,i.spec`, [productId]);
  if (!rows[0]) return;
  const currentHash = pcBuilderSourceHash({ proName: rows[0].proName, proSummary: rows[0].proSummary, spec: rows[0].spec, category_ids: rows[0].category_ids, attribute_values: rows[0].attribute_values });
  const [result] = await pool.query("UPDATE web_admin_pc_builder_product_profiles SET source_hash=?,state=IF(verified_hash=?,'verified','stale') WHERE product_id=? AND source_hash<>?", [currentHash, currentHash, productId, currentHash]);
  if (Number((result as { affectedRows?: number }).affectedRows || 0)) await bumpPcBuilderCacheVersion();
}

export async function getPcBuilderAdminDashboard() {
  const [installed] = await pool.query<RowDataPacket[]>("SELECT 1 FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='web_admin_pc_builder_product_profiles' LIMIT 1");
  if (!installed[0]) return { installed: false, summary: {}, coverage: [], queue: [], ruleSets: [], policies: [], minimumBudget: 0 };
  const [[summary], [coverage], [queue], [ruleSets], [policies], [minimum]] = await Promise.all([
    pool.query<RowDataPacket[]>(`SELECT COUNT(*) total,SUM(state='verified' AND source_hash=verified_hash) verified,SUM(state='pending') pending,
      SUM(state='rejected') rejected,SUM(state='stale' OR (state='verified' AND source_hash<>verified_hash)) stale FROM web_admin_pc_builder_product_profiles`),
    pool.query<RowDataPacket[]>(`SELECT component_code,COUNT(*) total,SUM(state='verified' AND source_hash=verified_hash) verified,SUM(state='pending') pending,
      SUM(state='stale' OR (state='verified' AND source_hash<>verified_hash)) stale FROM web_admin_pc_builder_product_profiles GROUP BY component_code ORDER BY component_code`),
    pool.query<RowDataPacket[]>(`SELECT pf.product_id,pf.component_code,pf.state,pf.parser_version,pf.candidate_attributes_json,pf.candidate_metrics_json,pf.confidence,pf.updated_at,p.proName,p.proSummary,i.spec
      FROM web_admin_pc_builder_product_profiles pf JOIN idv_sell_product_store p ON p.id=pf.product_id LEFT JOIN idv_sell_product_info i ON i.id=p.id
      WHERE pf.state IN ('pending','stale') ORDER BY FIELD(pf.state,'stale','pending'),pf.updated_at DESC LIMIT 100`),
    pool.query<RowDataPacket[]>(`SELECT id,revision,name,status,published_at,updated_at FROM web_admin_pc_builder_rule_sets ORDER BY id DESC LIMIT 20`),
    pool.query<RowDataPacket[]>(`SELECT revision,status,COUNT(*) policy_count,MAX(published_at) published_at FROM web_admin_pc_builder_gaming_policies GROUP BY revision,status ORDER BY MAX(id) DESC`),
    pool.query<RowDataPacket[]>(`SELECT SUM(x.minimum_price) minimum_budget FROM (SELECT pf.component_code,MIN(pr.price) minimum_price
      FROM web_admin_pc_builder_product_profiles pf JOIN idv_sell_product_price pr ON pr.id=pf.product_id AND pr.isOn=1 AND pr.price>0
      WHERE pf.state='verified' AND pf.source_hash=pf.verified_hash AND pf.component_code IN ('cpu','mainboard','ram','storage','case','psu') GROUP BY pf.component_code) x`),
  ]);
  return { installed: true, summary: summary[0] || {}, coverage, queue, ruleSets, policies, minimumBudget: Number(minimum[0]?.minimum_budget || 0) };
}

export async function reviewPcBuilderProfile(productId: number, action: 'approve' | 'reject', actorId: number, note = '') {
  const result = await withTransaction(async (connection: PoolConnection) => {
    const [rows] = await connection.query<RowDataPacket[]>('SELECT * FROM web_admin_pc_builder_product_profiles WHERE product_id=? FOR UPDATE', [productId]);
    const profile = rows[0]; if (!profile) throw new AdminApiError(404, 'NOT_FOUND', 'Không tìm thấy hồ sơ PC Builder.');
    if (action === 'reject') {
      await connection.query("UPDATE web_admin_pc_builder_product_profiles SET state='rejected',reviewed_by=?,reviewed_at=NOW(),review_note=? WHERE product_id=?", [actorId, note.slice(0,1000), productId]);
      return { productId, state: 'rejected' };
    }
    const attributes = Array.isArray(profile.candidate_attributes_json) ? profile.candidate_attributes_json : JSON.parse(String(profile.candidate_attributes_json || '[]'));
    for (const candidate of attributes) {
      const [values] = await connection.query<RowDataPacket[]>(`SELECT v.id,a.id attribute_id FROM idv_attribute a JOIN idv_attribute_value v ON v.attributeId=a.id
        WHERE a.api_key=? AND (v.api_key=? OR LOWER(v.value)=LOWER(?) OR
          LOWER(REPLACE(REPLACE(v.value,' ',''),'-',''))=LOWER(REPLACE(REPLACE(?,' ',''),'-',''))) LIMIT 1`,
      [candidate.attributeApiKey, candidate.valueApiKey, candidate.valueApiKey, candidate.valueApiKey]);
      if (values[0]) await connection.query('INSERT IGNORE INTO idv_product_attribute (pro_id,attr_id,attr_value_id) VALUES (?,?,?)', [productId, values[0].attribute_id, values[0].id]);
    }
    const metrics = profile.candidate_metrics_json && typeof profile.candidate_metrics_json === 'object' ? profile.candidate_metrics_json : JSON.parse(String(profile.candidate_metrics_json || '{}'));
    for (const [code, value] of Object.entries(metrics as Record<string, unknown>)) {
      const numeric = typeof value === 'number' ? value : null; const bool = typeof value === 'boolean' ? Number(value) : null; const text = numeric === null && bool === null ? String(value || '') : null;
      await connection.query(`INSERT INTO web_admin_pc_builder_product_metrics
        (product_id,metric_code,numeric_value,text_value,bool_value,source,confidence,verified_by,verified_at)
        VALUES (?,?,?,?,?,'extractor',?,?,NOW()) ON DUPLICATE KEY UPDATE numeric_value=VALUES(numeric_value),text_value=VALUES(text_value),
        bool_value=VALUES(bool_value),source=VALUES(source),confidence=VALUES(confidence),verified_by=VALUES(verified_by),verified_at=VALUES(verified_at)`,
      [productId, code, numeric, text, bool, profile.confidence, actorId]);
    }
    const requiredAttributes: Record<string, string[]> = {
      cpu: ['socket'], mainboard: ['socket','loai-ram','form-main'], ram: ['loai-ram'], case: ['form-main'], cooler: ['socket'], storage: ['loai-o-cung-m2'],
    };
    const requiredMetrics: Record<string, string[]> = {
      mainboard: ['main_ram_slot_count'], ram: ['ram_capacity_gb','ram_modules_per_kit'], storage: ['storage_capacity_gb'],
      psu: ['psu_output_w'], gpu: ['gpu_recommended_psu_w','gpu_length_mm'], case: ['case_max_gpu_length_mm'], cooler: ['cooler_height_mm'],
    };
    const [factRows] = await connection.query<RowDataPacket[]>(`SELECT DISTINCT a.api_key fact FROM idv_product_attribute pa JOIN idv_attribute a ON a.id=pa.attr_id WHERE pa.pro_id=?`, [productId]);
    const [metricRows] = await connection.query<RowDataPacket[]>('SELECT metric_code FROM web_admin_pc_builder_product_metrics WHERE product_id=?', [productId]);
    const attributeFacts = new Set(factRows.map((row) => String(row.fact)));
    const metricFacts = new Set(metricRows.map((row) => String(row.metric_code)));
    const missing = [...(requiredAttributes[String(profile.component_code)] || []).filter((key) => !attributeFacts.has(key)),
      ...(requiredMetrics[String(profile.component_code)] || []).filter((key) => !metricFacts.has(key))];
    if (missing.length) throw new AdminApiError(409, 'CONFLICT', `Chưa thể xác minh; thiếu dữ liệu bắt buộc: ${missing.join(', ')}`);
    await connection.query("UPDATE web_admin_pc_builder_product_profiles SET state='verified',verified_hash=source_hash,reviewed_by=?,reviewed_at=NOW(),review_note=? WHERE product_id=?", [actorId, note.slice(0,1000), productId]);
    return { productId, state: 'verified' };
  });
  await bumpPcBuilderCacheVersion();
  return result;
}
